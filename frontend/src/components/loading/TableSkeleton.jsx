import { TableSkeleton } from "./PageSkeleton";
import "./loading.css";

/** A products table placeholder (image column + rows). */
export function ProductTableSkeleton({ rows = 8 }) {
  return <TableSkeleton rows={rows} columns={5} thumb />;
}

/** An orders table placeholder. */
export function OrderTableSkeleton({ rows = 8 }) {
  return <TableSkeleton rows={rows} columns={5} />;
}

/** A customers table placeholder. */
export function CustomerTableSkeleton({ rows = 8 }) {
  return <TableSkeleton rows={rows} columns={5} thumb />;
}

/** A coupons table placeholder. */
export function CouponTableSkeleton({ rows = 6 }) {
  return <TableSkeleton rows={rows} columns={4} />;
}

/** A reviews table placeholder. */
export function ReviewTableSkeleton({ rows = 6 }) {
  return <TableSkeleton rows={rows} columns={4} />;
}
