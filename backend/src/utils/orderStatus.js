import { ORDER_STATUS } from "../config/constants.js";

const STATUS_ALIASES = Object.freeze({
  food_processing: ORDER_STATUS.PREPARING,
});

const normalizeKey = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const normalizeOrderStatus = (status) => {
  const key = normalizeKey(status);
  if (!key) return ORDER_STATUS.PENDING_PAYMENT;
  if (Object.values(ORDER_STATUS).includes(key)) return key;
  return STATUS_ALIASES[key] || key;
};

export const ORDER_STATUS_DB_VALUES = Object.freeze({
  [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PENDING_PAYMENT, "Pending Payment"],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.CONFIRMED, "Confirmed"],
  [ORDER_STATUS.PREPARING]: [
    ORDER_STATUS.PREPARING,
    "Preparing",
    "Food Processing",
    "food_processing",
  ],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [
    ORDER_STATUS.OUT_FOR_DELIVERY,
    "Out for Delivery",
    "Out for delivery",
  ],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.DELIVERED, "Delivered"],
  [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.CANCELLED, "Cancelled"],
  [ORDER_STATUS.PAYMENT_FAILED]: [ORDER_STATUS.PAYMENT_FAILED, "Payment Failed"],
  [ORDER_STATUS.REFUNDED]: [ORDER_STATUS.REFUNDED, "Refunded"],
});

export const orderStatusDbValues = (status) =>
  ORDER_STATUS_DB_VALUES[normalizeOrderStatus(status)] || [status];
