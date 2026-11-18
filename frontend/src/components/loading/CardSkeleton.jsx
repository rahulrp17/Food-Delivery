import { Skeleton, TextSkeleton } from "./Skeleton";
import "./loading.css";

/** A product card placeholder that mirrors the real card's geometry. */
export function ProductCardSkeleton() {
  return (
    <div className="ld-product-card" aria-hidden="true">
      <span className="skeleton ld-product-media" />
      <div className="ld-product-body">
        <span className="skeleton ld-line-sm" style={{ width: "36%" }} />
        <TextSkeleton lines={2} lastLineWidth="58%" />
        <span className="skeleton ld-line-sm" style={{ width: "86%" }} />
        <span className="skeleton ld-line-sm" style={{ width: "62%" }} />
        <span className="skeleton ld-line-sm" style={{ width: "34%" }} />
        <div className="ld-product-foot">
          <span className="skeleton ld-price" />
          <span className="skeleton ld-btn" />
        </div>
      </div>
    </div>
  );
}

/** A grid of product card placeholders. */
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div
      className="ld-grid-4"
      aria-busy="true"
      aria-hidden="true"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(15rem, 1fr))" }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** A category card placeholder: image, name, product count. */
export function CategorySkeleton() {
  return (
    <div className="ld-category-card" aria-hidden="true">
      <span className="skeleton ld-category-media" />
      <div className="ld-category-body">
        <span className="skeleton ld-line" style={{ width: "60%" }} />
        <span className="skeleton ld-line-sm" style={{ width: "35%" }} />
      </div>
    </div>
  );
}

/** A grid of category card placeholders. */
export function CategoryGridSkeleton({ count = 6 }) {
  return (
    <div
      className="ld-grid-3"
      aria-busy="true"
      aria-hidden="true"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))" }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <CategorySkeleton key={index} />
      ))}
    </div>
  );
}

/** An order card placeholder: id, date, status, thumbnails and total. */
export function OrderCardSkeleton() {
  return (
    <div className="ld-order-card" aria-hidden="true">
      <div className="ld-order-top">
        <div className="ld-text" style={{ flex: 1, maxWidth: "18rem" }}>
          <span className="skeleton ld-line" style={{ width: "45%" }} />
          <span className="skeleton ld-line-sm" style={{ width: "60%" }} />
        </div>
        <span className="skeleton ld-pill" style={{ width: "6rem" }} />
      </div>
      <div className="ld-order-thumbs">
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={index} className="skeleton ld-order-thumb" />
        ))}
      </div>
      <div className="ld-order-foot">
        <span className="skeleton ld-line" style={{ width: "8rem" }} />
        <span className="skeleton ld-price" />
      </div>
    </div>
  );
}

/** A list of order card placeholders. */
export function OrderListSkeleton({ count = 4 }) {
  return (
    <div className="ld-page-body" aria-busy="true" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <OrderCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** A customer card placeholder: avatar, name, email and status. */
export function CustomerCardSkeleton() {
  return (
    <div className="ld-customer-card" aria-hidden="true">
      <span className="skeleton ld-avatar" />
      <div className="ld-text" style={{ flex: 1 }}>
        <span className="skeleton ld-line" style={{ width: "45%" }} />
        <span className="skeleton ld-line-sm" style={{ width: "65%" }} />
      </div>
      <span className="skeleton ld-pill" style={{ width: "5rem" }} />
    </div>
  );
}

/** A list of customer card placeholders. */
export function CustomerListSkeleton({ count = 5 }) {
  return (
    <div className="ld-page-body" aria-busy="true" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <CustomerCardSkeleton key={index} />
      ))}
    </div>
  );
}
