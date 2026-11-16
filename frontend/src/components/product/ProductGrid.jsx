import { ProductCardSkeleton } from "../loading";
import ProductCard from "./ProductCard";
import styles from "./ProductGrid.module.css";

/**
 * Responsive product grid.
 *
 * The column count changes with the viewport (1 → 2 → 3 → 4) rather than
 * simply shrinking, so the cards stay readable and tappable on a phone.
 *
 * `dense` trades card padding and the gap for one more column on wide
 * screens. The menu uses it because it lists the whole catalogue; the search
 * and home rails keep the roomier default.
 */
export const ProductGrid = ({
  products = [],
  className = "",
  busy = false,
  dense = false,
  headingLevel = "h3",
}) => (
  <div
    className={`${styles.grid} ${dense ? styles.dense : ""} stagger ${className}`.trim()}
    aria-busy={busy || undefined}
  >
    {products.map((product) => (
      <ProductCard
        key={product.id}
        product={product}
        dense={dense}
        headingLevel={headingLevel}
      />
    ))}
  </div>
);

/**
 * Page-appropriate skeleton for the product grid: the same column structure
 * as the real grid so nothing reflows when the data lands.
 */
export const ProductGridSkeleton = ({ count = 8, dense = false }) => (
  <div className={`${styles.grid} ${dense ? styles.dense : ""}`.trim()} aria-busy="true">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

export default ProductGrid;
