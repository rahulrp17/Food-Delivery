import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";
import env from "../config/env.js";
import ApiError from "../utils/apiError.js";

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

const placeOrder = async (req, res, next) => {
  try {
    if (!stripe) {
      throw new ApiError(503, "PAYMENT_UNAVAILABLE", "Payments are not configured");
    }

    const { items, amount, orderAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest("Order items are required");
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw ApiError.badRequest("Order amount is invalid");
    }
    if (!orderAddress || typeof orderAddress !== "object") {
      throw ApiError.badRequest("Delivery address is required");
    }

    const newOrder = new orderModel({
      userId: req.body.userId,
      items,
      amount: Number(amount),
      address: orderAddress,
    });
    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    lineItems.push({
      price_data: {
        currency: "inr",
        product_data: { name: "Delivery charge" },
        unit_amount: 200,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${env.CLIENT_URL}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${env.CLIENT_URL}/verify?success=false&orderId=${newOrder._id}`,
    });

    return res.json({ session_url: session.url, success: true });
  } catch (error) {
    next(error);
  }
};

const verifyOrder = async (req, res, next) => {
  try {
    const { orderId, success } = req.body;

    if (!orderId) {
      throw ApiError.badRequest("Order id is required");
    }

    if (success === "true" || success === true) {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      return res.status(200).json({ message: "Paid", success: true });
    }

    await orderModel.findByIdAndDelete(orderId);
    return res.status(200).json({ message: "Order failed", success: false });
  } catch (error) {
    next(error);
  }
};

const userOrders = async (req, res, next) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId }).lean();
    res.json({ message: "Orders fetched successfully", success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

const listOrders = async (req, res, next) => {
  try {
    const orders = await orderModel.find({}).lean();
    res.json({ message: "Orders fetched successfully", success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      throw ApiError.badRequest("Order id and status are required");
    }

    const order = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) {
      throw ApiError.notFound("Order not found");
    }

    res.json({ message: "Status updated successfully", success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
