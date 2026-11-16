import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";
import { getCategories, getProducts, getSearchResults } from "../api/catalog";
import { ProductGrid, ProductGridSkeleton } from "../components/product/ProductGrid";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { pluralize } from "../lib/format";
import styles from "./SearchPage.module.css";

const RECENT_KEY = "foodie.recentSearches";

const readRecent = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string").slice(0, 5)
      : [];
  } catch {
    return [];
  }
};

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const veg = searchParams.get("veg") === "true";
  const sort = searchParams.get("sort") || "newest";

  const [inputValue, setInputValue] = useState(q);
  const [recent, setRecent] = useState(readRecent);
  const reduceMotion = useReducedMotion();

  useDocumentTitle(q ? `Search: ${q}` : "Search");

  const categoriesQuery = useApiQuery(
    (signal) => getCategories({ signal }),
    "search-categories"
  );

  const results = useApiQuery(
    (signal) =>
      getSearchResults({ q, veg: veg || undefined, sort, limit: 16 }, { signal }),
    `search|${q}|${veg}|${sort}`,
    { enabled: Boolean(q) }
  );

  const popular = useApiQuery(
    (signal) => getProducts({ sort: "popular", limit: 8 }, { signal }),
    "search-popular",
    { enabled: !q }
  );

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    if (inputValue.trim() === q) return undefined;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const value = inputValue.trim();

      if (value) next.set("q", value);
      else next.delete("q");

      setSearchParams(next, { replace: true });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [inputValue, q, searchParams, setSearchParams]);

  const remember = (value) => {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 5);
    setRecent(next);

    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Recent searches are a convenience; storage can be unavailable.
    }
  };

  const commitQuery = (value) => {
    const trimmed = value.trim();
    const next = new URLSearchParams(searchParams);

    if (trimmed) next.set("q", trimmed);
    else next.delete("q");

    setSearchParams(next, { replace: true });

    if (trimmed) remember(trimmed);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    commitQuery(inputValue);
  };

  const handleRecent = (value) => {
    setInputValue(value);
    commitQuery(value);
  };

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) next.set(key, value);
    else next.delete(key);

    setSearchParams(next, { replace: true });
  };

  const clearInput = () => {
    setInputValue("");
    commitQuery("");
  };

  const categoryChips = (categoriesQuery.data || []).map((category) => (
    <Link
      key={category.slug}
      to={`/menu?category=${encodeURIComponent(category.slug)}`}
      className={styles.chip}
    >
      {category.name}
    </Link>
  ));

  const resultMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <div>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerInner}>
            <div className={styles.headerCopy}>
              <span className="eyebrow">Search</span>
              <h1 className={styles.title}>What sounds good right now?</h1>
              <p className={styles.lede}>
                Search the whole menu by name, or browse a category and pick from there.
              </p>
            </div>

            <form className={styles.searchForm} onSubmit={handleSubmit} role="search">
              <Input
                label="Search the menu"
                type="search"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Try biryani, salad, cake…"
                leadingIcon={<Icon name="search" size={21} />}
                trailing={
                  inputValue ? (
                    <button
                      type="button"
                      className={styles.clearButton}
                      onClick={clearInput}
                      aria-label="Clear search"
                    >
                      <Icon name="x" size={17} />
                    </button>
                  ) : null
                }
                className={styles.searchInput}
                autoComplete="off"
              />
              <Button type="submit" size="lg" iconLeft={<Icon name="search" size={18} />}>
                Search
              </Button>
            </form>
          </div>

          {recent.length > 0 ? (
            <div className={styles.suggestions}>
              <span className={styles.suggestionLabel}>Recent searches</span>
              <div className={styles.chips}>
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={styles.recentChip}
                    onClick={() => handleRecent(item)}
                  >
                    <Icon name="rotate-ccw" size={14} />
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!q ? (
            <div className={styles.suggestions}>
              <span className={styles.suggestionLabel}>Try a category</span>
              <div className={styles.chips}>
                {categoriesQuery.loading
                  ? null
                  : categoryChips.length > 0
                    ? categoryChips
                    : ["Cake", "Salad", "Pasta", "Rolls"].map((name) => (
                        <Link key={name} to="/menu" className={styles.chip}>
                          {name}
                        </Link>
                      ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {q ? (
        <div className={`container ${styles.content}`}>
          <div className={styles.resultHeader}>
            <div className={styles.resultTitle}>
              <p className={styles.resultCount} aria-live="polite">
                {results.loading
                  ? `Searching for “${q}”…`
                  : `${results.data?.meta?.total || 0} ${pluralize(
                      results.data?.meta?.total,
                      "dish",
                      "dishes"
                    )} for “${q}”`}
              </p>
              <h2 className={styles.resultHeading}>Matches for {q}</h2>
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={`${styles.toggle} ${veg ? styles.toggleActive : ""}`.trim()}
                onClick={() => updateParam("veg", veg ? "" : "true")}
                aria-pressed={veg}
              >
                <Icon name="leaf" size={17} />
                Vegetarian
              </button>

              <label className={styles.selectField}>
                <span className={styles.selectLabel}>Sort by</span>
                <select
                  className={styles.select}
                  value={sort}
                  onChange={(event) => updateParam("sort", event.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="popular">Most popular</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="rating">Top rated</option>
                </select>
              </label>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={results.loading ? "loading" : results.error ? "error" : "results"}
              initial={resultMotion.initial}
              animate={resultMotion.animate}
              exit={resultMotion.exit}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {results.error ? (
                <ErrorState
                  title="Search is taking a moment"
                  description={results.error.message}
                  onRetry={results.reload}
                />
              ) : results.loading ? (
                <ProductGridSkeleton count={8} />
              ) : (results.data?.items || []).length === 0 ? (
                <div className={styles.empty}>
                  <EmptyState
                    icon="search"
                    title={`No dishes found for “${q}”`}
                    description="Check the spelling, try a broader word, or browse a category below."
                    actions={
                      <Button to="/menu" variant="secondary">
                        Browse the full menu
                      </Button>
                    }
                  />
                  <div className={styles.emptySuggestions}>
                    <span className={styles.suggestionLabel}>Popular categories</span>
                    <div className={styles.chips}>{categoryChips}</div>
                  </div>
                </div>
              ) : (
                <ProductGrid products={results.data.items} headingLevel="h2" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className={`container ${styles.content}`}>
          <div className={styles.resultHeader}>
            <div className={styles.resultTitle}>
              <p className={styles.resultCount}>Popular right now</p>
              <h2 className={styles.resultHeading}>What everyone is ordering</h2>
            </div>
            <Button
              to="/menu"
              variant="ghost"
              size="sm"
              iconRight={<Icon name="arrow-right" size={16} />}
            >
              Browse the full menu
            </Button>
          </div>

          {popular.error ? (
            <ErrorState
              title="We could not load popular dishes"
              description={popular.error.message}
              onRetry={popular.reload}
            />
          ) : popular.loading ? (
            <ProductGridSkeleton count={8} />
          ) : (popular.data?.items || []).length === 0 ? (
            <EmptyState
              icon="search"
              title="Nothing on the menu yet"
              description="Browse the menu to see what is cooking."
              actions={
                <Button to="/menu" variant="secondary">
                  Browse the full menu
                </Button>
              }
            />
          ) : (
            <ProductGrid products={popular.data.items} headingLevel="h2" />
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
