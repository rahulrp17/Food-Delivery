import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { auditAdminMutations } from "../../services/audit.service.js";
import { writeLimiter, uploadLimiter } from "../../middleware/rateLimit.js";
import { upload } from "../../middleware/upload.js";
import { validate } from "../../middleware/validate.js";
import {
  adminCreateCategory,
  adminCreateProduct,
  adminDeleteCategory,
  adminDeleteProduct,
  adminRestoreProduct,
  adminGetCategories,
  adminUpdateCategory,
  adminUpdateProduct,
  adminUpdateStock,
  adminUploadImage,
} from "../../controllers/catalog.controller.js";
import {
  adminGetReviews,
  adminModerateReview,
  adminReplyReview,
  adminReportReview,
} from "../../controllers/review.controller.js";
import {
  adminCreateCoupon,
  adminDeleteCoupon,
  adminExportCouponRedemptions,
  adminGetCouponRedemptions,
  adminGetCoupons,
  adminUpdateCoupon,
} from "../../controllers/coupon.controller.js";
import {
  adminGetSettings,
  adminUpdateSettings,
} from "../../controllers/settings.controller.js";
import {
  adminCancelOrder,
  adminGetOrder,
  adminGetOrders,
  adminGetOverview,
  adminUpdateOrderNotes,
  adminUpdateOrderStatus,
  adminGetAuditLogs,
} from "../../controllers/order.controller.js";
import {
  adminOrderListQuerySchema,
  adminOrderNotesSchema,
  adminOrderStatusSchema,
  adminOverviewQuerySchema,
  cancelOrderSchema,
  orderIdParamsSchema,
} from "../../validators/order.schema.js";
import {
  adminListCustomers,
  adminCreateStaff,
  adminExportCustomers,
  adminGetCustomer,
  adminListStaff,
  adminUpdateCustomerRole,
  adminUpdateCustomerStatus,
  adminUpdateStaff,
} from "../../controllers/user.controller.js";
import {
  adminCustomerListQuerySchema,
  customerIdParamsSchema,
  customerRoleUpdateSchema,
  customerStatusUpdateSchema,
  staffCreateSchema,
  staffIdParamsSchema,
  staffListQuerySchema,
  staffUpdateSchema,
} from "../../validators/user.schema.js";
import { adminBulkUpdateProducts, adminDuplicateProduct, adminGetProduct, adminGetProducts, adminReorderCategories, adminReorderCategory } from "../../controllers/catalog.controller.js";
import { adminProductListQuerySchema, productIdParamsSchema, bulkUpdateProductSchema, reorderCategoriesSchema, reorderCategorySchema, auditLogQuerySchema, notificationListQuerySchema, notificationIdParamsSchema, inventoryLogQuerySchema } from "../../validators/catalog.schema.js";
import {
  adminGetNotifications,
  adminMarkNotificationRead,
  adminMarkAllNotificationsRead,
  adminDeleteNotification,
} from "../../controllers/notification.controller.js";
import {
  adminExportInventoryLogs,
  adminGetInventoryLogs,
} from "../../controllers/inventory.controller.js";
import {
  adminReviewListQuerySchema,
  categoryCreateSchema,
  categoryIdParamsSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productStockSchema,
  productUpdateSchema,
  reviewIdParamsSchema,
  reviewModerateSchema,
  replyReviewSchema,
} from "../../validators/catalog.schema.js";
import {
  couponCreateSchema,
  couponIdParamsSchema,
  couponListQuerySchema,
  couponRedemptionsQuerySchema,
  couponUpdateSchema,
} from "../../validators/coupon.schema.js";
import { storeSettingsUpdateSchema } from "../../validators/settings.schema.js";

const adminRouter = Router();

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
  STAFF_WRITE,
  INVENTORY_READ,
  AUDIT_READ,
  NOTIFICATIONS_READ,
  NOTIFICATIONS_WRITE,
} = PERMISSIONS;

adminRouter.use(authenticate, requireRole("admin"), auditAdminMutations);

adminRouter.get("/categories", requirePermission(CATALOG_READ), adminGetCategories);
adminRouter.post(
  "/categories",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ body: categoryCreateSchema }),
  adminCreateCategory
);
// Registered before "/categories/:id" so the literal "reorder" segment is not
// swallowed by the parameterised route.
adminRouter.patch(
  "/categories/reorder",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ body: reorderCategoriesSchema }),
  adminReorderCategories
);
adminRouter.patch(
  "/categories/:id",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: categoryIdParamsSchema, body: categoryUpdateSchema }),
  adminUpdateCategory
);
adminRouter.delete(
  "/categories/:id",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: categoryIdParamsSchema }),
  adminDeleteCategory
);

adminRouter.patch(
  "/categories/:id/reorder",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: categoryIdParamsSchema, body: reorderCategorySchema }),
  adminReorderCategory
);

adminRouter.post(
  "/products",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ body: productCreateSchema }),
  adminCreateProduct
);
adminRouter.patch(
  "/products/:id",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: productIdParamsSchema, body: productUpdateSchema }),
  adminUpdateProduct
);
adminRouter.delete(
  "/products/:id",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: productIdParamsSchema }),
  adminDeleteProduct
);
adminRouter.post(
  "/products/:id/restore",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: productIdParamsSchema }),
  adminRestoreProduct
);
adminRouter.patch(
  "/products/:id/stock",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: productIdParamsSchema, body: productStockSchema }),
  adminUpdateStock
);

adminRouter.post(
  "/uploads",
  requirePermission(CATALOG_WRITE),
  uploadLimiter,
  upload.single("image"),
  adminUploadImage
);

adminRouter.get(
  "/orders",
  requirePermission(ORDERS_READ),
  validate({ query: adminOrderListQuerySchema }),
  adminGetOrders
);
adminRouter.get(
  "/orders/:id",
  requirePermission(ORDERS_READ),
  validate({ params: orderIdParamsSchema }),
  adminGetOrder
);
adminRouter.patch(
  "/orders/:id/status",
  requirePermission(ORDERS_WRITE),
  writeLimiter,
  validate({ params: orderIdParamsSchema, body: adminOrderStatusSchema }),
  adminUpdateOrderStatus
);
adminRouter.patch(
  "/orders/:id/notes",
  requirePermission(ORDERS_WRITE),
  writeLimiter,
  validate({ params: orderIdParamsSchema, body: adminOrderNotesSchema }),
  adminUpdateOrderNotes
);
adminRouter.post(
  "/orders/:id/cancel",
  requirePermission(ORDERS_WRITE),
  writeLimiter,
  validate({ params: orderIdParamsSchema, body: cancelOrderSchema }),
  adminCancelOrder
);

adminRouter.get(
  "/reviews",
  requirePermission(REVIEWS_READ),
  validate({ query: adminReviewListQuerySchema }),
  adminGetReviews
);
adminRouter.patch(
  "/reviews/:id",
  requirePermission(REVIEWS_WRITE),
  writeLimiter,
  validate({ params: reviewIdParamsSchema, body: reviewModerateSchema }),
  adminModerateReview
);

adminRouter.patch(
  "/reviews/:id/reply",
  requirePermission(REVIEWS_WRITE),
  writeLimiter,
  validate({ params: reviewIdParamsSchema, body: replyReviewSchema }),
  adminReplyReview
);

adminRouter.patch(
  "/reviews/:id/report",
  requirePermission(REVIEWS_WRITE),
  writeLimiter,
  validate({ params: reviewIdParamsSchema }),
  adminReportReview
);

adminRouter.get(
  "/coupons",
  requirePermission(COUPONS_READ),
  validate({ query: couponListQuerySchema }),
  adminGetCoupons
);
adminRouter.post(
  "/coupons",
  requirePermission(COUPONS_WRITE),
  writeLimiter,
  validate({ body: couponCreateSchema }),
  adminCreateCoupon
);
adminRouter.patch(
  "/coupons/:id",
  requirePermission(COUPONS_WRITE),
  writeLimiter,
  validate({ params: couponIdParamsSchema, body: couponUpdateSchema }),
  adminUpdateCoupon
);
adminRouter.delete(
  "/coupons/:id",
  requirePermission(COUPONS_WRITE),
  writeLimiter,
  validate({ params: couponIdParamsSchema }),
  adminDeleteCoupon
);

adminRouter.get(
  "/coupons/:id/redemptions/export",
  requirePermission(COUPONS_READ),
  validate({ params: couponIdParamsSchema, query: couponRedemptionsQuerySchema }),
  adminExportCouponRedemptions
);

adminRouter.get(
  "/coupons/:id/redemptions",
  requirePermission(COUPONS_READ),
  validate({ params: couponIdParamsSchema, query: couponRedemptionsQuerySchema }),
  adminGetCouponRedemptions
);

adminRouter.get("/settings", requirePermission(SETTINGS_READ), adminGetSettings);

adminRouter.patch(
  "/settings",
  requirePermission(SETTINGS_WRITE),
  writeLimiter,
  validate({ body: storeSettingsUpdateSchema }),
  adminUpdateSettings
);

adminRouter.get(
  "/audit-logs",
  requirePermission(AUDIT_READ),
  validate({ query: auditLogQuerySchema }),
  adminGetAuditLogs
);

adminRouter.get(
  "/overview",
  requirePermission(OVERVIEW_READ),
  validate({ query: adminOverviewQuerySchema }),
  adminGetOverview
);

adminRouter.get(
  "/notifications",
  requirePermission(NOTIFICATIONS_READ),
  validate({ query: notificationListQuerySchema }),
  adminGetNotifications
);
adminRouter.post(
  "/notifications/read-all",
  requirePermission(NOTIFICATIONS_WRITE),
  adminMarkAllNotificationsRead
);
adminRouter.patch(
  "/notifications/:id/read",
  requirePermission(NOTIFICATIONS_WRITE),
  validate({ params: notificationIdParamsSchema }),
  adminMarkNotificationRead
);
adminRouter.delete(
  "/notifications/:id",
  requirePermission(NOTIFICATIONS_WRITE),
  validate({ params: notificationIdParamsSchema }),
  adminDeleteNotification
);

adminRouter.get(
  "/inventory/export",
  requirePermission(INVENTORY_READ),
  validate({ query: inventoryLogQuerySchema }),
  adminExportInventoryLogs
);

adminRouter.get(
  "/inventory/logs",
  requirePermission(INVENTORY_READ),
  validate({ query: inventoryLogQuerySchema }),
  adminGetInventoryLogs
);

adminRouter.post(
  "/products/bulk",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ body: bulkUpdateProductSchema }),
  adminBulkUpdateProducts
);
adminRouter.get(
  "/products",
  requirePermission(CATALOG_READ),
  validate({ query: adminProductListQuerySchema }),
  adminGetProducts
);
adminRouter.post(
  "/products/:id/duplicate",
  requirePermission(CATALOG_WRITE),
  writeLimiter,
  validate({ params: productIdParamsSchema }),
  adminDuplicateProduct
);

adminRouter.get(
  "/products/:id",
  requirePermission(CATALOG_READ),
  validate({ params: productIdParamsSchema }),
  adminGetProduct
);

adminRouter.get(
  "/customers",
  requirePermission(CUSTOMERS_READ),
  validate({ query: adminCustomerListQuerySchema }),
  adminListCustomers
);
adminRouter.get(
  "/customers/export",
  requirePermission(CUSTOMERS_READ),
  validate({ query: adminCustomerListQuerySchema }),
  adminExportCustomers
);
adminRouter.get(
  "/customers/:id",
  requirePermission(CUSTOMERS_READ),
  validate({ params: customerIdParamsSchema }),
  adminGetCustomer
);
adminRouter.patch(
  "/customers/:id/role",
  requirePermission(CUSTOMERS_WRITE),
  writeLimiter,
  validate({ params: customerIdParamsSchema, body: customerRoleUpdateSchema }),
  adminUpdateCustomerRole
);
adminRouter.patch(
  "/customers/:id/status",
  requirePermission(CUSTOMERS_WRITE),
  writeLimiter,
  validate({ params: customerIdParamsSchema, body: customerStatusUpdateSchema }),
  adminUpdateCustomerStatus
);

adminRouter.get(
  "/staff",
  requirePermission(STAFF_READ),
  validate({ query: staffListQuerySchema }),
  adminListStaff
);
adminRouter.post(
  "/staff",
  requirePermission(STAFF_WRITE),
  writeLimiter,
  validate({ body: staffCreateSchema }),
  adminCreateStaff
);
adminRouter.patch(
  "/staff/:id",
  requirePermission(STAFF_WRITE),
  writeLimiter,
  validate({ params: staffIdParamsSchema, body: staffUpdateSchema }),
  adminUpdateStaff
);

export default adminRouter;
