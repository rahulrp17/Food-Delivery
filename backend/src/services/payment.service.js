import mongoose from "mongoose";
import Stripe from "stripe";
import env from "../config/env.js";
import { PAYMENT_STATUS, ORDER_STATUS } from "../config/constants.js";
import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";
import Cart from "../models/cart.model.js";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import WebhookEvent from "../models/webhookEvent.model.js";
import { applyStockForPaidOrder, restockOrder } from "./inventory.service.js";
import { normalizeOrderStatus } from "../utils/orderStatus.js";

let stripeClient = null;

const getStripe = () => {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
};

const requireStripe = () => {
  const stripe = getStripe();
  if (!stripe) {
    throw new ApiError(503, "PAYMENT_UNAVAILABLE", "Payments are not configured");
  }
  return stripe;
};

const checkoutUrls = (order) => ({
  success_url: `${env.CLIENT_URL}/verify?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
  cancel_url: `${env.CLIENT_URL}/checkout?cancelled=1&orderId=${order._id}`,
});

export const createCheckoutSession = async (order, user) => {
  const stripe = requireStripe();

  if (
    normalizeOrderStatus(order.status) !== ORDER_STATUS.PENDING_PAYMENT ||
    order.paymentStatus !== PAYMENT_STATUS.UNPAID
  ) {
    throw ApiError.conflict("This order is not awaiting payment", "PAYMENT_REQUIRED");
  }

  const totalPaise = order.pricing?.totalPaise || 0;

  if (totalPaise <= 0) {
    throw ApiError.badRequest("Order total is invalid");
  }

  if (order.payment?.sessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.payment.sessionId);
      if (existing.status === "open" && existing.url) {
        return { sessionUrl: existing.url, sessionId: existing.id };
      }
    } catch {
      logger.warn({ orderId: String(order._id) }, "Could not retrieve previous checkout session");
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: { name: `Order ${order.orderNumber}` },
          unit_amount: totalPaise,
        },
        quantity: 1,
      },
    ],
    customer_email: user?.email || undefined,
    metadata: {
      orderId: String(order._id),
      userId: String(order.userId),
    },
    ...checkoutUrls(order),
  });

  order.payment = {
    ...(order.payment || {}),
    provider: "stripe",
    sessionId: session.id,
  };
  await order.save();

  return { sessionUrl: session.url, sessionId: session.id };
};

export const getCheckoutSessionStatus = async (sessionId, userId) => {
  const stripe = requireStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.userId && session.metadata.userId !== String(userId)) {
    throw ApiError.forbidden("This payment session does not belong to you");
  }

  let order = await Order.findOne({
    $or: [{ "payment.sessionId": sessionId }, { _id: session.metadata?.orderId || null }],
    userId,
  });

  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  // Stripe can report a successful payment before the webhook reaches us
  // (especially in local development). Reconcile directly from the verified
  // Stripe session so the confirmation screen does not stay stuck on pending.
  if (session.payment_status === "paid" && order.paymentStatus !== PAYMENT_STATUS.PAID) {
    await confirmPaidOrder(session);
    order = await Order.findById(order._id);
  }

  return {
    orderId: String(order._id),
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    sessionStatus: session.status,
    paymentIntentStatus: session.payment_intent?.status || null,
  };
};

export const refundOrderPayment = async (order) => {
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) return;
  if (!order.payment?.paymentIntentId) return;

  const stripe = getStripe();
  if (!stripe) return;

  try {
    await stripe.refunds.create(
      { payment_intent: order.payment.paymentIntentId },
      { idempotencyKey: `refund-${order._id}` }
    );
  } catch (error) {
    if (
      error?.code === "charge_already_refunded" ||
      error?.code === "resource_missing"
    ) {
      return;
    }
    throw error;
  }
};

const findOrderFromSession = async (session) => {
  const bySession = await Order.findOne({ "payment.sessionId": session.id });
  if (bySession) return bySession;

  if (session.metadata?.orderId && mongoose.Types.ObjectId.isValid(session.metadata.orderId)) {
    return Order.findById(session.metadata.orderId);
  }

  return null;
};

const confirmPaidOrder = async (session) => {
  if (session.payment_status && session.payment_status !== "paid") return;

  const order = await findOrderFromSession(session);

  if (!order) {
    logger.warn({ sessionId: session.id }, "Paid checkout session has no matching order");
    return;
  }

  if (order.paymentStatus === PAYMENT_STATUS.PAID) return;
  if (normalizeOrderStatus(order.status) !== ORDER_STATUS.PENDING_PAYMENT) return;

  const mongoSession = await mongoose.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      const current = await Order.findById(order._id).session(mongoSession);

      if (!current || current.paymentStatus === PAYMENT_STATUS.PAID) return;
      if (normalizeOrderStatus(current.status) !== ORDER_STATUS.PENDING_PAYMENT) return;

      await applyStockForPaidOrder(current, mongoSession);

      const now = new Date();
      current.paymentStatus = PAYMENT_STATUS.PAID;
      current.status = ORDER_STATUS.CONFIRMED;
      current.payment = {
        ...(current.payment || {}),
        provider: "stripe",
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null,
        method: session.payment_method_types?.[0] || "card",
        paidAt: now,
      };
      current.statusHistory.push({
        status: ORDER_STATUS.CONFIRMED,
        at: now,
        note: "Payment confirmed",
      });
      await current.save({ session: mongoSession });

      if (current.couponCode) {
        await Coupon.updateOne(
          { code: current.couponCode, deletedAt: null },
          { $inc: { usedCount: 1 } },
          { session: mongoSession }
        );
      }

      const productIds = current.items
        .map((item) => item.productId)
        .filter(Boolean);

      if (productIds.length > 0) {
        await Cart.updateOne(
          { userId: current.userId },
          { $pull: { items: { productId: { $in: productIds } } } },
          { session: mongoSession }
        );
      }
    });
  } catch (error) {
    logger.error(
      { err: error, orderId: String(order._id) },
      "Paid order could not be confirmed"
    );

    try {
      await refundOrderPayment({
        ...order.toObject(),
        paymentStatus: PAYMENT_STATUS.PAID,
        payment: {
          ...(order.payment || {}),
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null,
        },
      });
    } catch (refundError) {
      logger.error({ err: refundError, orderId: String(order._id) }, "Automatic refund failed");
    }

    await Order.updateOne(
      { _id: order._id, status: ORDER_STATUS.PENDING_PAYMENT },
      {
        $set: {
          status: ORDER_STATUS.PAYMENT_FAILED,
          paymentStatus: PAYMENT_STATUS.FAILED,
        },
        $push: {
          statusHistory: {
            status: ORDER_STATUS.PAYMENT_FAILED,
            at: new Date(),
            note: "Payment succeeded but stock could not be reserved",
          },
        },
      }
    );
  } finally {
    await mongoSession.endSession();
  }
};

const failPendingOrder = async (session) => {
  const order = await findOrderFromSession(session);
  if (!order || normalizeOrderStatus(order.status) !== ORDER_STATUS.PENDING_PAYMENT) return;

  order.status = ORDER_STATUS.PAYMENT_FAILED;
  order.paymentStatus = PAYMENT_STATUS.FAILED;
  order.statusHistory.push({
    status: ORDER_STATUS.PAYMENT_FAILED,
    at: new Date(),
    note: `Checkout session ${session.status}`,
  });
  await order.save();
};

const handleChargeRefunded = async (charge) => {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  const order = await Order.findOne({ "payment.paymentIntentId": paymentIntentId });
  if (!order) return;
  if (order.paymentStatus === PAYMENT_STATUS.REFUNDED) return;

  const alreadyFinal = [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED].includes(order.status);

  if (!alreadyFinal) {
    await restockOrder(order, { reason: "cancel" });
  }

  order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  order.status = ORDER_STATUS.REFUNDED;
  order.statusHistory.push({
    status: ORDER_STATUS.REFUNDED,
    at: new Date(),
    note: "Stripe charge refunded",
  });
  await order.save();
};

export const processWebhook = async (rawBody, signature) => {
  const stripe = requireStripe();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(503, "PAYMENT_UNAVAILABLE", "Webhook secret is not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    throw ApiError.badRequest(`Webhook signature verification failed: ${error.message}`);
  }

  const existing = await WebhookEvent.findOne({ eventId: event.id });
  if (existing) return { received: true, duplicate: true };

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await confirmPaidOrder(event.data.object);
      break;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      await failPendingOrder(event.data.object);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object);
      break;
    default:
      break;
  }

  try {
    await WebhookEvent.create({ eventId: event.id, type: event.type });
  } catch (error) {
    if (error?.code === 11000) {
      return { received: true, duplicate: true };
    }
    throw error;
  }

  return { received: true };
};
