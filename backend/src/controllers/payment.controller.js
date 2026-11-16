import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import Order from "../models/order.model.js";
import {
  createCheckoutSession,
  getCheckoutSessionStatus,
  processWebhook,
} from "../services/payment.service.js";

export const createCheckout = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, userId: req.user._id });

  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  const result = await createCheckoutSession(order, req.user);
  res.json({ data: result });
});

export const getSessionStatus = asyncHandler(async (req, res) => {
  const result = await getCheckoutSessionStatus(req.params.sessionId, req.user._id);
  res.json({ data: result });
});

export const paymentWebhook = asyncHandler(async (req, res) => {
  const signature = req.get("stripe-signature");
  const result = await processWebhook(req.body, signature);
  res.json(result);
});
