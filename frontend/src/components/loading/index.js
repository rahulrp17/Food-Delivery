/**
 * Foodie — Loading / Skeleton system
 *
 * Every data-driven route in the application renders one of these while its
 * initial request is in flight. They mirror the geometry of the real
 * components so the page does not reflow when data arrives.
 */
export { Skeleton, TextSkeleton, default as SkeletonPrimitive } from "./Skeleton";
export {
  KpiSkeleton,
  KpiGridSkeleton,
  PageSkeleton,
  DashboardSkeleton,
  ChartSkeleton,
  TableSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  SettingsSkeleton,
  SidebarSkeleton,
} from "./PageSkeleton";
export {
  ProductCardSkeleton,
  ProductGridSkeleton,
  CategorySkeleton,
  CategoryGridSkeleton,
  OrderCardSkeleton,
  OrderListSkeleton,
  CustomerCardSkeleton,
  CustomerListSkeleton,
} from "./CardSkeleton";
export {
  ProductTableSkeleton,
  OrderTableSkeleton,
  CustomerTableSkeleton,
  CouponTableSkeleton,
  ReviewTableSkeleton,
} from "./TableSkeleton";
