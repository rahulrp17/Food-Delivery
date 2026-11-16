import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A small data cache with stale-while-revalidate semantics.
 *
 * The customer pages used to refetch everything on every mount, so moving
 * between the home page, the menu and a product always paid for a fresh
 * round trip. Now a cached value is served immediately and revalidated in the
 * background once it goes stale. Concurrent requests for the same key are
 * de-duplicated into one network call.
 *
 * The cache is also mirrored into `sessionStorage`, so a hard reload of the
 * page is instant as well. It is deliberately per-tab and short-lived: a
 * shared, long-lived cache would need an invalidation strategy that the app
 * does not have yet.
 */
const DEFAULT_TTL = 30_000;

/** How long a persisted entry may survive a reload. */
const PERSIST_MAX_AGE = 5 * 60_000;

/** Refuse to persist anything larger than this. */
const MAX_PERSIST_BYTES = 250_000;

const STORAGE_KEY = "foodie.api-cache.v1";

/** key -> { data, error, at } */
const cache = new Map();

/** key -> { promise, controller } */
const inFlight = new Map();

const isAbort = (error) =>
  error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";

const readStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeStorage = () => {
  if (typeof window === "undefined") return;

  try {
    const entries = {};
    for (const [key, entry] of cache) {
      entries[key] = entry;
    }

    const raw = JSON.stringify(entries);
    if (raw.length > MAX_PERSIST_BYTES) return;

    window.sessionStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Storage may be unavailable or full — the in-memory cache still works.
  }
};

let hydrated = false;

/** Loads persisted entries once, so a reload starts warm. */
const hydrate = () => {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  const stored = readStorage();
  if (!stored) return;

  const now = Date.now();
  for (const [key, entry] of Object.entries(stored)) {
    if (!entry || typeof entry.at !== "number") continue;
    if (now - entry.at > PERSIST_MAX_AGE) continue;
    cache.set(key, entry);
  }
};

/**
 * Runs the loader for a key, sharing one request between every caller.
 * Returns the shared promise.
 */
const fetchOnce = (key, loader) => {
  const existing = inFlight.get(key);
  if (existing) return existing.promise;

  const controller = new AbortController();

  const promise = Promise.resolve()
    .then(() => loader(controller.signal))
    .then((data) => {
      cache.set(key, { data, error: null, at: Date.now() });
      writeStorage();
      return data;
    })
    .catch((error) => {
      if (isAbort(error)) return undefined;
      cache.set(key, { data: null, error, at: Date.now() });
      writeStorage();
      return undefined;
    })
    .finally(() => {
      if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
    });

  inFlight.set(key, { promise, controller });
  return promise;
};

/** Drops a cached entry (or the whole cache) so the next read refetches. */
export const invalidateApiCache = (key) => {
  if (key) {
    cache.delete(key);
    inFlight.delete(key);
    writeStorage();
    return;
  }

  cache.clear();
  inFlight.clear();

  try {
    window?.sessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable.
  }
};

export const useApiQuery = (loader, key, { enabled = true, ttl = DEFAULT_TTL } = {}) => {
  const loaderRef = useRef(loader);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: enabled,
  });

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }

    hydrate();

    const entry = cache.get(key);
    const isFresh = entry && Date.now() - entry.at < ttl;

    // Serve whatever we already have straight away so the page never shows
    // a loading state for data that is already in memory.
    if (entry) {
      setState({ data: entry.data, error: entry.error, loading: false });
    } else {
      setState((previous) => ({ data: previous.data, error: null, loading: true }));
    }

    // A fresh entry needs no network call at all.
    if (isFresh) return undefined;

    let cancelled = false;

    const promise = fetchOnce(key, (signal) => loaderRef.current(signal));

    promise.then(() => {
      if (cancelled) return;
      const latest = cache.get(key);
      if (!latest) return;
      setState({ data: latest.data, error: latest.error, loading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [key, version, enabled, ttl]);

  const reload = useCallback(() => {
    cache.delete(key);
    inFlight.delete(key);
    writeStorage();
    setVersion((value) => value + 1);
  }, [key]);

  return { ...state, reload };
};
