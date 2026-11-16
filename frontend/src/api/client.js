import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";
const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const readCookie = (name) => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : "";
};

let csrfRequest = null;

export const fetchCsrfToken = async () => {
  if (!csrfRequest) {
    csrfRequest = axios
      .get(`${BASE_URL}/auth/csrf`, { withCredentials: true })
      .then((response) => response.data?.data?.csrfToken || "")
      .finally(() => {
        csrfRequest = null;
      });
  }

  return csrfRequest;
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
  timeout: 15000,
});

// Both names are used across the API modules.
export const http = apiClient;

http.interceptors.request.use(async (config) => {
  if (!MUTATING_METHODS.has(String(config.method).toLowerCase())) return config;

  let token = readCookie("fd_csrf");
  if (!token) token = await fetchCsrfToken();
  config.headers["x-csrf-token"] = token || "";
  return config;
});

let refreshRequest = null;

/**
 * Called when the session really is over (the refresh token expired too), so
 * the app can clear the signed-in state instead of leaving a stale one.
 */
let onSessionExpired = null;

export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

/**
 * Endpoints that must fail when the visitor is not signed in. They are
 * excluded from the refresh attempt — otherwise a guest would trigger a
 * pointless refresh. `/auth/me` is deliberately NOT in this list: it is the
 * call that detects an expired access token, so it has to be able to refresh.
 */
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/logout-all",
  "/auth/csrf",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/forgot-password",
  "/auth/reset-password",
];

/**
 * Refreshes the access token once, no matter how many requests hit a 401 at
 * the same time.
 *
 * The access token only lives 15 minutes, so without this the user is signed
 * out the moment it expires. The refresh token is a 30-day cookie, so it is
 * used silently here and the original request is replayed.
 */
const attemptRefresh = () => {
  if (!refreshRequest) {
    refreshRequest = apiClient
      .post("/auth/refresh", undefined, { skipAuthRefresh: true })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

http.interceptors.response.use(
  (response) => {
    if (response.config.responseType === "blob") return response;
    return response.data?.data;
  },
  async (error) => {
    if (error.code === "ERR_CANCELED" || axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const status = error.response?.status;
    const url = String(originalRequest?.url || "");

    // A 401 on a protected route means the access token expired, not that the
    // user is signed out. Refresh once and replay the request.
    const isAuthRoute = NO_REFRESH_PATHS.some((path) => url.includes(path));

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest.skipAuthRefresh &&
      !originalRequest._retried &&
      !isAuthRoute
    ) {
      originalRequest._retried = true;

      const refreshed = await attemptRefresh();
      if (refreshed) {
        return http(originalRequest);
      }

      // The refresh token is gone too — the session is genuinely over.
      onSessionExpired?.();
    }

    const payload = error.response?.data?.error;
    const message =
      payload?.message ||
      (error.response
        ? "We could not complete that request. Please try again."
        : "We cannot reach the kitchen right now. Check your connection and try again.");

    return Promise.reject(
      new ApiError(message, {
        status: error.response?.status || 0,
        code: payload?.code || "NETWORK_ERROR",
        details: payload?.details || null,
      })
    );
  }
);

export default http;
