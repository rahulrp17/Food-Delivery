export const ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
});

export const ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: "pending_payment",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  PAYMENT_FAILED: "payment_failed",
  REFUNDED: "refunded",
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: "unpaid",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
});

export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_CSRF: "INVALID_CSRF",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE",
  COUPON_INVALID: "COUPON_INVALID",
  COUPON_EXPIRED: "COUPON_EXPIRED",
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
});

export const COOKIES = Object.freeze({
  ACCESS: "fd_at",
  REFRESH: "fd_rt",
  CSRF: "fd_csrf",
  GUEST: "fd_guest",
});

export const LIMITS = Object.freeze({
  JSON_BODY: "100kb",
  UPLOAD_BYTES: 5 * 1024 * 1024,
  PAGE_SIZE: 20,
  PAGE_SIZE_MAX: 100,
});
