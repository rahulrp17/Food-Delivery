export const ORDER_STATUS_LABELS = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};

export const ORDER_STATUS_VARIANTS = {
  pending_payment: "warning",
  confirmed: "info",
  preparing: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "neutral",
  payment_failed: "danger",
  refunded: "neutral",
};

export const ORDER_STATUS_OPTIONS = [
  { value: "", label: "All orders" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "payment_failed", label: "Payment failed" },
  { value: "refunded", label: "Refunded" },
];

export const ACTIVE_ORDER_STATUSES = new Set([
  "pending_payment",
  "confirmed",
  "preparing",
  "out_for_delivery",
]);

export const ORDER_PROGRESS_STEPS = [
  { key: "pending_payment", label: "Order placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export const isActiveOrder = (status) => ACTIVE_ORDER_STATUSES.has(status);

export const isCancellableOrder = (status) =>
  status === "pending_payment" || status === "confirmed";

export const ADMIN_ORDER_TRANSITIONS = {
  pending_payment: ["cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["refunded"],
};

export const ADMIN_NEXT_STATUS = {
  confirmed: { status: "preparing", label: "Start preparing" },
  preparing: { status: "out_for_delivery", label: "Send out" },
  out_for_delivery: { status: "delivered", label: "Mark delivered" },
};

export const ORDER_BOARD_COLUMNS = [
  { key: "pending_payment", label: "Pending payment", statuses: ["pending_payment"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "preparing", label: "Preparing", statuses: ["preparing"] },
  { key: "out_for_delivery", label: "Out for delivery", statuses: ["out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  {
    key: "exceptions",
    label: "Cancelled & exceptions",
    statuses: ["cancelled", "payment_failed", "refunded"],
  },
];

export const formatOrderStatus = (status) =>
  String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
