import { useId } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { deliveryWindow, formatINR } from "../../lib/format";
import { useCart } from "../../hooks/useCart";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import Icon from "../ui/Icon";
import SmartImage from "../ui/SmartImage";
import ProductCard from "../product/ProductCard";
import { ProductCardSkeleton } from "../loading";
import SectionHeading from "./SectionHeading";
import styles from "./ProductRail.module.css";

const RailSkeleton = ({ count = 4 }) => (
  <div className={styles.skeletonGrid} aria-busy="true">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

const ListSkeleton = ({ count = 4 }) => (
  <div className={styles.skeletonList} aria-busy="true">
    {Array.from({ length: count }).map((_, index) => (
      <div className={styles.skeletonRow} key={index} aria-hidden="true">
        <span className="skeleton" style={{ width: "96px", height: "96px" }} />
        <div className={styles.skeletonBody}>
          <span className="skeleton" style={{ width: "28%", height: "0.625rem" }} />
          <span className="skeleton" style={{ width: "70%", height: "1.125rem" }} />
          <span className="skeleton" style={{ width: "54%", height: "0.75rem" }} />
        </div>
        <span className="skeleton" style={{ width: "5rem", height: "1.75rem" }} />
      </div>
    ))}
  </div>
);

const EditorialRow = ({ product, index = 0 }) => {
  const { addItem, isAdding } = useCart();
  const reduceMotion = useReducedMotion();
  const soldOut = !product.isAvailable || product.stock <= 0;

  return (
    <motion.article
      className={styles.row}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.22, delay: Math.min(index, 5) * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link
        to={`/product/${product.slug}`}
        className={styles.rowMedia}
        aria-label={`View ${product.name}`}
      >
        <SmartImage
          src={product.image?.url}
          alt={product.name}
          ratio="1 / 1"
          className={styles.rowFrame}
          imageClassName={styles.rowImage}
        />
      </Link>

      <div className={styles.rowBody}>
        <span className={styles.rowCategory}>
          {product.category?.name || "Kitchen fresh"}
        </span>
        <h3 className={styles.rowTitle}>
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.shortDescription ? (
          <p className={styles.rowDescription}>{product.shortDescription}</p>
        ) : null}
        <span className={styles.rowMeta}>
          <Icon name="clock" size={13} />
          {deliveryWindow(product.prepTimeMinutes)}
          {product.ratingCount > 0 ? (
            <>
              <span className={styles.rowDot} aria-hidden="true" />
              {product.ratingAvg.toFixed(1)} ★
            </>
          ) : null}
        </span>
      </div>

      <div className={styles.rowAside}>
        <span className={styles.rowPrice}>{formatINR(product.pricePaise)}</span>
        <button
          type="button"
          className={styles.rowAdd}
          onClick={() => addItem(product.id, 1)}
          disabled={soldOut || isAdding}
          aria-label={
            soldOut ? "Sold out" : `Add ${product.name} to cart`
          }
          aria-busy={isAdding || undefined}
        >
          {isAdding ? (
            <Icon name="spinner" size={16} className="spinner-animate" />
          ) : (
            <Icon name="plus" size={16} />
          )}
          <span>{isAdding ? "Adding" : "Add"}</span>
        </button>
      </div>
    </motion.article>
  );
};

/**
 * A product rail. Two compositions are available so a page never repeats
 * itself: `grid` (cards) and `list` (an editorial, price-forward list).
 *
 * The component owns its loading, error and empty states so a page can drop
 * it in without re-implementing the same three branches.
 */
const ProductRail = ({
  eyebrow,
  title,
  description,
  products = [],
  loading = false,
  error = null,
  onRetry,
  action,
  variant = "grid",
  skeletonCount = 4,
  emptyTitle = "Nothing on the rail yet",
  emptyDescription = "The kitchen is still plating. Check back in a moment.",
  emptyActions = null,
}) => {
  const headingId = useId();

  return (
    <section className={`container ${styles.section}`} aria-labelledby={headingId}>
      <SectionHeading
        id={headingId}
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          action || (
            <Link to="/menu" className="eyebrow">
              View full menu
              <Icon name="arrow-right" size={16} />
            </Link>
          )
        }
      />

      {loading ? (
        variant === "list" ? (
          <ListSkeleton count={skeletonCount} />
        ) : (
          <RailSkeleton count={skeletonCount} />
        )
      ) : error ? (
        <ErrorState
          title="This section could not load"
          description={error.message || "Please try again in a moment."}
          onRetry={onRetry}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="package"
          title={emptyTitle}
          description={emptyDescription}
          actions={emptyActions}
        />
      ) : variant === "list" ? (
        <ul className={styles.list}>
          {products.map((product, index) => (
            <li key={product.id}>
              <EditorialRow product={product} index={index} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductRail;
