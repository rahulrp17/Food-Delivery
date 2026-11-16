import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../api/catalog";
import { ProductGrid, ProductGridSkeleton } from "../components/product/ProductGrid";
import DeliveryStrip from "../components/product/DeliveryStrip";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Icon from "../components/ui/Icon";
import Skeleton from "../components/ui/Skeleton";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { formatINR, pluralize } from "../lib/format";
import styles from "./MenuPage.module.css";

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];
const PRICE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1500", label: "≤ ₹15" },
  { value: "2000", label: "≤ ₹20" },
  { value: "2500", label: "≤ ₹25" },
];
const CATEGORY_ICONS = {
  cake: "sparkles",
  chicken: "chef-hat",
  deserts: "star-filled",
  noodles: "chef-hat",
  pasta: "leaf",
  "pure-veg": "leaf",
  rolls: "rotate-ccw",
  salad: "leaf",
  sandwich: "chef-hat",
};

const parseFilters = (key) => {
  const params = new URLSearchParams(key);
  const filters = {
    category: params.get("category") || "",
    veg: params.get("veg") === "true" ? true : undefined,
    sort: params.get("sort") || "newest",
    maxPricePaise: params.get("maxPricePaise") || "",
  };

  return filters;
};

const CategoryChips = ({
  categories,
  loading,
  category,
  totalDishes,
  onCategory,
  compact = false,
}) => (
  <div className={`${styles.categoryChips} ${compact ? styles.categoryChipsCompact : ""}`.trim()}>
    <button
      type="button"
      className={`${styles.categoryChip} ${!category ? styles.categoryChipActive : ""}`.trim()}
      onClick={() => onCategory("")}
      aria-pressed={!category}
    >
      <Icon name="layout" size={16} />
      <span>All dishes</span>
      {totalDishes > 0 ? <span className={styles.chipCount}>{totalDishes}</span> : null}
    </button>

    {loading
      ? Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} width="112px" height="40px" radius="999px" />
        ))
      : categories.map((item) => (
          <button
            key={item.slug}
            type="button"
            className={`${styles.categoryChip} ${category === item.slug ? styles.categoryChipActive : ""}`.trim()}
            onClick={() => onCategory(item.slug)}
            aria-pressed={category === item.slug}
          >
            <Icon name={CATEGORY_ICONS[item.slug] || "tag"} size={16} />
            <span>{item.name}</span>
            {item.productCount > 0 ? (
              <span className={styles.chipCount}>{item.productCount}</span>
            ) : null}
          </button>
        ))}
  </div>
);

const MenuFilters = ({
  categories,
  loading,
  category,
  totalDishes,
  veg,
  maxPricePaise,
  onCategory,
  onVeg,
  onPrice,
}) => (
  <div className={styles.filterContent}>
    <section className={styles.filterSection} aria-label="Categories">
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Categories</h3>
        {totalDishes > 0 ? (
          <span className={styles.sectionMeta}>{totalDishes} dishes</span>
        ) : null}
      </div>

      <CategoryChips
        categories={categories}
        loading={loading}
        category={category}
        totalDishes={totalDishes}
        onCategory={onCategory}
      />
    </section>

    <div className={styles.filterSide}>
      <section className={styles.filterSection} aria-label="Preferences">
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Preferences</h3>
        </div>
        <button
          type="button"
          className={`${styles.switchRow} ${veg ? styles.switchRowActive : ""}`.trim()}
          onClick={onVeg}
          aria-pressed={veg}
        >
          <span className={styles.switchIcon}>
            <Icon name="leaf" size={17} />
          </span>
          <span className={styles.switchText}>
            <strong>Vegetarian</strong>
            <small>Plant-based dishes only</small>
          </span>
          <span className={styles.switchTrack} aria-hidden="true">
            <span className={styles.switchThumb} />
          </span>
        </button>
      </section>

      <section className={styles.filterSection} aria-label="Maximum price">
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Max price</h3>
          <span className={styles.sectionMeta}>Per dish</span>
        </div>
        <div className={styles.priceRow}>
          {PRICE_OPTIONS.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              className={`${styles.priceOption} ${maxPricePaise === option.value ? styles.priceActive : ""}`.trim()}
              onClick={() => onPrice(option.value)}
              aria-pressed={maxPricePaise === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  </div>
);

const MenuPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const requestRef = useRef(0);
  const filterToggleRef = useRef(null);
  const filterCloseRef = useRef(null);

  const category = searchParams.get("category") || "";
  const veg = searchParams.get("veg") === "true";
  const sort = searchParams.get("sort") || "newest";
  const maxPricePaise = searchParams.get("maxPricePaise") || "";
  const requestKey = searchParams.toString();

  const categoriesQuery = useApiQuery(
    (signal) => getCategories({ signal }),
    "menu-categories"
  );

  const categories = categoriesQuery.data || [];
  const totalDishes = categories.reduce(
    (total, item) => total + (item.productCount || 0),
    0
  );

  const activeCategory = categories.find((item) => item.slug === category);

  useDocumentTitle(activeCategory?.name || "Menu");

  useEffect(() => {
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    const filters = parseFilters(requestKey);

    setItems([]);
    setMeta(null);
    setPage(1);
    setLoading(true);
    setError(null);
    setLoadMoreError(null);

    getProducts(
      {
        page: 1,
        limit: PAGE_SIZE,
        category: filters.category,
        veg: filters.veg,
        sort: filters.sort,
        maxPricePaise: filters.maxPricePaise,
        inStock: true,
      },
      { signal: controller.signal }
    )
      .then((data) => {
        if (requestId !== requestRef.current) return;
        setItems(data.items || []);
        setMeta(data.meta || null);
      })
      .catch((requestError) => {
        if (
          controller.signal.aborted ||
          requestError?.code === "ERR_CANCELED" ||
          requestId !== requestRef.current
        ) {
          return;
        }
        setError(requestError);
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });

    return () => controller.abort();
  }, [requestKey, retry]);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const previousOverflow = document.body.style.overflow;

    if (isMobile) {
      document.body.style.overflow = "hidden";
      filterCloseRef.current?.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        filterToggleRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (isMobile) document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) next.set(key, value);
    else next.delete(key);

    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => setSearchParams({}, { replace: true });

  const closeFilters = () => {
    setFiltersOpen(false);
    filterToggleRef.current?.focus();
  };

  const hasFilters = Boolean(category || veg || maxPricePaise || sort !== "newest");
  const activeFilterCount = [category, veg, maxPricePaise, sort !== "newest"].filter(
    Boolean
  ).length;

  const filterProps = {
    categories,
    loading: categoriesQuery.loading,
    category,
    totalDishes,
    veg,
    maxPricePaise,
    onCategory: (value) => updateParam("category", value),
    onVeg: () => updateParam("veg", veg ? "" : "true"),
    onPrice: (value) => updateParam("maxPricePaise", value),
  };

  const loadMore = async () => {
    if (loadingMore || !meta || page >= meta.totalPages) return;

    const nextPage = page + 1;
    const filters = parseFilters(requestKey);
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const data = await getProducts({
        page: nextPage,
        limit: PAGE_SIZE,
        category: filters.category,
        veg: filters.veg,
        sort: filters.sort,
        maxPricePaise: filters.maxPricePaise,
        inStock: true,
      });

      setItems((previous) => [...previous, ...(data.items || [])]);
      setMeta(data.meta || null);
      setPage(nextPage);
    } catch (requestError) {
      setLoadMoreError(requestError);
    } finally {
      setLoadingMore(false);
    }
  };

  const title = activeCategory?.name || "Everything on the menu";

  return (
    <div>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerInner}>
            <div className={styles.headerCopy}>
              <span className={`eyebrow ${styles.eyebrow}`}>The menu</span>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.description}>
                {category
                  ? `Everything we are cooking in ${activeCategory?.name || "this category"} right now.`
                  : "A focused list of dishes we cook well. Filter it down, then let the kitchen do the rest."}
              </p>
            </div>

            <dl className={styles.statCard}>
              <div className={styles.stat}>
                <dt>On the menu</dt>
                <dd>{meta?.total || 0}</dd>
              </div>
              <div className={styles.stat}>
                <dt>Categories</dt>
                <dd>{categories.length || 0}</dd>
              </div>
              <div className={styles.stat}>
                <dt>Cooked to order</dt>
                <dd>25 min</dd>
              </div>
            </dl>
          </div>

          <p className={styles.count}>
            <span className={styles.liveDot} aria-hidden="true" />
            {loading
              ? "Loading dishes…"
              : `${meta?.total || 0} ${pluralize(meta?.total, "dish", "dishes")} ready to order`}
          </p>

          <DeliveryStrip className={styles.promiseStrip} />
        </div>
      </header>

      <div className={`container ${styles.layout}`}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLead}>
            <button
              ref={filterToggleRef}
              type="button"
              className={`${styles.filterButton} ${filtersOpen ? styles.filterButtonActive : ""}`.trim()}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <Icon name="filter" size={17} />
              Filters
              {activeFilterCount > 0 ? (
                <span className={styles.filterBadge}>{activeFilterCount}</span>
              ) : null}
              <Icon
                name={filtersOpen ? "chevron-up" : "chevron-down"}
                size={15}
                className={styles.filterChevron}
              />
            </button>

            <p className={styles.resultCount} aria-live="polite">
              {loading ? (
                "Loading dishes…"
              ) : (
                <>
                  <strong>{meta?.total || 0}</strong>{" "}
                  {pluralize(meta?.total, "dish", "dishes")}
                </>
              )}
            </p>
          </div>

          <label className={styles.sortField}>
            <span className={styles.sortLabel}>Sort by</span>
            <span className={styles.selectWrap}>
              <select
                className={styles.select}
                value={sort}
                onChange={(event) => updateParam("sort", event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={15} className={styles.selectIcon} />
            </span>
          </label>
        </div>

        {/* Category rail — always reachable, scrollable on narrow screens. */}
        <div className={styles.railBar}>
          <span className={styles.railLabel}>Categories</span>
          <CategoryChips
            categories={categories}
            loading={categoriesQuery.loading}
            category={category}
            totalDishes={totalDishes}
            onCategory={filterProps.onCategory}
            compact
          />
        </div>

        {filtersOpen ? (
          <section className={styles.dashboard} aria-label="Menu filters">
            <div className={styles.dashboardHead}>
              <div>
                <span className={styles.dashboardEyebrow}>Dashboard</span>
                <h2 className={styles.dashboardTitle}>Refine your order</h2>
              </div>
              <div className={styles.dashboardActions}>
                {hasFilters ? (
                  <button type="button" className={styles.resetButton} onClick={clearFilters}>
                    Reset all
                  </button>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={closeFilters}
                  iconRight={<Icon name="chevron-up" size={15} />}
                >
                  Done
                </Button>
              </div>
            </div>
            <div className={styles.dashboardBody}>
              <MenuFilters {...filterProps} />
            </div>
          </section>
        ) : null}

        {hasFilters ? (
          <div className={styles.activeFilters}>
            <span className={styles.activeLabel}>Active</span>
            {category ? (
              <span className={styles.filterPill}>
                {activeCategory?.name || category}
                <button
                  type="button"
                  onClick={() => updateParam("category", "")}
                  aria-label="Remove category filter"
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ) : null}
            {veg ? (
              <span className={styles.filterPill}>
                Vegetarian
                <button
                  type="button"
                  onClick={() => updateParam("veg", "")}
                  aria-label="Remove vegetarian filter"
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ) : null}
            {maxPricePaise ? (
              <span className={styles.filterPill}>
                Under {formatINR(maxPricePaise)}
                <button
                  type="button"
                  onClick={() => updateParam("maxPricePaise", "")}
                  aria-label="Remove price filter"
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ) : null}
            {sort !== "newest" ? (
              <span className={styles.filterPill}>
                {SORT_OPTIONS.find((option) => option.value === sort)?.label || sort}
                <button
                  type="button"
                  onClick={() => updateParam("sort", "")}
                  aria-label="Reset sort order"
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            ) : null}
            <button type="button" className={styles.clearInline} onClick={clearFilters}>
              Clear all
            </button>
          </div>
        ) : null}

        {error ? (
          <ErrorState
            title="The menu did not load"
            description={error.message}
            onRetry={() => setRetry((value) => value + 1)}
          />
        ) : loading ? (
          <ProductGridSkeleton count={12} dense />
        ) : items.length === 0 ? (
          <EmptyState
            icon="search"
            title="No dishes match those filters"
            description="Try a different category, turn off the vegetarian filter, or clear everything and start again."
            actions={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <ProductGrid products={items} dense headingLevel="h2" />

            <div className={styles.footer}>
              {loadMoreError ? (
                <div className={styles.loadErrorRow} role="alert">
                  <span className={styles.loadError}>{loadMoreError.message}</span>
                  <Button variant="outline" size="sm" onClick={loadMore} loading={loadingMore}>
                    Try again
                  </Button>
                </div>
              ) : null}

              {meta && page < meta.totalPages ? (
                <Button
                  variant="secondary"
                  onClick={loadMore}
                  loading={loadingMore}
                  iconLeft={!loadingMore ? <Icon name="plus" size={17} /> : undefined}
                >
                  Load more dishes
                </Button>
              ) : (
                <p className={styles.end}>That is everything for these filters.</p>
              )}
            </div>
          </>
        )}
      </div>

      {filtersOpen
        ? createPortal(
            <div className={styles.filterLayer}>
              <button
                type="button"
                className={styles.filterOverlay}
                onClick={closeFilters}
                aria-label="Close filters"
              />
              <aside
                className={styles.filterDrawer}
                role="dialog"
                aria-modal="true"
                aria-label="Menu filters"
              >
                <div className={styles.drawerHead}>
                  <div>
                    <span className={styles.drawerEyebrow}>Refine your order</span>
                    <h2 className={styles.drawerTitle}>Filters</h2>
                  </div>
                  <button
                    ref={filterCloseRef}
                    type="button"
                    className={styles.drawerClose}
                    onClick={closeFilters}
                    aria-label="Close filters"
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>

                <div className={styles.drawerBody}>
                  <MenuFilters {...filterProps} />
                </div>

                <div className={styles.drawerFoot}>
                  <Button
                    variant="secondary"
                    onClick={clearFilters}
                    className={styles.drawerAction}
                  >
                    Clear all
                  </Button>
                  <Button onClick={closeFilters} className={styles.drawerAction}>
                    Show {loading ? "dishes" : `${meta?.total || 0} ${pluralize(meta?.total, "dish", "dishes")}`}
                  </Button>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default MenuPage;
