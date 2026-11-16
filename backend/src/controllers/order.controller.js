import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import {
  cancelOrderAdmin,
  cancelUserOrder,
  createOrder,
  getAdminOverview,
  getOrderAdmin,
  getUserOrder,
  listOrdersAdmin,
  listUserOrders,
  reorder,
  updateOrderAdminNotes,
  updateOrderStatus,
} from "../services/order.service.js";
import { listAuditLogs } from "../services/audit.service.js";

export const placeOrder = asyncHandler(async (req, res) => {
  const idempotencyKey = req.body.idempotencyKey || req.get("Idempotency-Key");

  if (!idempotencyKey) {
    throw ApiError.badRequest("An idempotency key is required");
  }

  const { order, reused } = await createOrder(req.user._id, {
    ...req.body,
    idempotencyKey,
  });

  res.status(reused ? 200 : 201).json({ data: { order, reused } });
});

export const adminGetOverview = asyncHandler(async (req, res) => {
  const overview = await getAdminOverview({ from: req.query.from, to: req.query.to });
  res.json({ data: overview });
});

export const adminGetAuditLogs = asyncHandler(async (req, res) => {
  const result = await listAuditLogs(req.query);
  res.json({ data: result });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const result = await listUserOrders(req.user._id, req.query);
  res.json({ data: result });
});

export const getMyOrder = asyncHandler(async (req, res) => {
  const order = await getUserOrder(req.user._id, req.params.id);
  res.json({ data: { order } });
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await cancelUserOrder(req.user._id, req.params.id, req.body.reason);
  res.json({ data: { order } });
});

export const reorderMyOrder = asyncHandler(async (req, res) => {
  const cart = await reorder(req.user._id, req.params.id);
  res.json({ data: { cart } });
});

export const adminGetOrders = asyncHandler(async (req, res) => {
  const result = await listOrdersAdmin(req.query);
  res.json({ data: result });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await getOrderAdmin(req.params.id);
  res.json({ data: { order } });
});

export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(
    req.params.id,
    req.body.status,
    req.user._id,
    req.body.note
  );
  res.json({ data: { order } });
});

export const adminCancelOrder = asyncHandler(async (req, res) => {
  const order = await cancelOrderAdmin(req.params.id, req.body.reason, req.user._id);
  res.json({ data: { order } });
});

export const adminUpdateOrderNotes = asyncHandler(async (req, res) => {
  const order = await updateOrderAdminNotes(req.params.id, req.body.adminNotes);
  res.json({ data: { order } });
});
