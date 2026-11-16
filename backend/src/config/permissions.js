import { ROLES } from "./constants.js";

export const PERMISSIONS = Object.freeze({
  OVERVIEW_READ: "overview:read",
  CATALOG_READ: "catalog:read",
  CATALOG_WRITE: "catalog:write",
  ORDERS_READ: "orders:read",
  ORDERS_WRITE: "orders:write",
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_WRITE: "customers:write",
  COUPONS_READ: "coupons:read",
  COUPONS_WRITE: "coupons:write",
  REVIEWS_READ: "reviews:read",
  REVIEWS_WRITE: "reviews:write",
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",
  STAFF_READ: "staff:read",
  STAFF_WRITE: "staff:write",
  INVENTORY_READ: "inventory:read",
  INVENTORY_WRITE: "inventory:write",
  AUDIT_READ: "audit:read",
  NOTIFICATIONS_READ: "notifications:read",
  NOTIFICATIONS_WRITE: "notifications:write",
});

export const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

export const STAFF_ROLES = Object.freeze({
  OWNER: "owner",
  MANAGER: "manager",
  SUPPORT: "support",
});

export const STAFF_ROLE_OPTIONS = Object.freeze(Object.values(STAFF_ROLES));

const {
  OVERVIEW_READ,
  CATALOG_READ,
  CATALOG_WRITE,
  ORDERS_READ,
  ORDERS_WRITE,
  CUSTOMERS_READ,
  CUSTOMERS_WRITE,
  COUPONS_READ,
  COUPONS_WRITE,
  REVIEWS_READ,
  REVIEWS_WRITE,
  SETTINGS_READ,
  SETTINGS_WRITE,
  STAFF_READ,
  INVENTORY_READ,
  INVENTORY_WRITE,
  AUDIT_READ,
  NOTIFICATIONS_READ,
  NOTIFICATIONS_WRITE,
} = PERMISSIONS;

export const ROLE_PERMISSIONS = Object.freeze({
  [STAFF_ROLES.OWNER]: ALL_PERMISSIONS,
  [STAFF_ROLES.MANAGER]: Object.freeze([
    OVERVIEW_READ,
    CATALOG_READ,
    CATALOG_WRITE,
    ORDERS_READ,
    ORDERS_WRITE,
    CUSTOMERS_READ,
    CUSTOMERS_WRITE,
    COUPONS_READ,
    COUPONS_WRITE,
    REVIEWS_READ,
    REVIEWS_WRITE,
    SETTINGS_READ,
    INVENTORY_READ,
    INVENTORY_WRITE,
    STAFF_READ,
    AUDIT_READ,
    NOTIFICATIONS_READ,
    NOTIFICATIONS_WRITE,
  ]),
  [STAFF_ROLES.SUPPORT]: Object.freeze([
    OVERVIEW_READ,
    ORDERS_READ,
    ORDERS_WRITE,
    CUSTOMERS_READ,
    CUSTOMERS_WRITE,
    REVIEWS_READ,
    REVIEWS_WRITE,
    CATALOG_READ,
    INVENTORY_READ,
    NOTIFICATIONS_READ,
    NOTIFICATIONS_WRITE,
  ]),
});

export const resolvePermissions = (user) => {
  if (!user || user.role !== ROLES.ADMIN) return [];

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.filter((permission) => ALL_PERMISSIONS.includes(permission));
  }

  if (user.staffRole && ROLE_PERMISSIONS[user.staffRole]) {
    return [...ROLE_PERMISSIONS[user.staffRole]];
  }

  return [...ALL_PERMISSIONS];
};

export const hasPermission = (user, permission) =>
  resolvePermissions(user).includes(permission);
