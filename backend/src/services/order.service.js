import crypto from "node:crypto";
import mongoose from "mongoose";
import Address from "../models/address.model.js";
import Cart from "../models/cart.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import { ERROR_CODES, ORDER_STATUS, PAYMENT_STATUS } from "../config/constants.js";
import { toImageUrl } from "../utils/image.js";
import { normalizeOrderStatus, orderStatusDbValues } from "../utils/orderStatus.js";
import { calculatePricing } from "./pricing.service.js";
import { validateCouponForCart } from "./coupon.service.js";
import { getStoreSettings, assertStoreOpen } from "./settings.service.js";
import { restockOrder } from "./inventory.service.js";
import { refundOrderPayment } from "./payment.service.js";
import { toProductListItem } from "./catalog.service.js";
import { addCartItem, getCart } from "./cart.service.js";
import { createNotification } from "./notification.service.js";

const ADMIN_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
});

const USER_CANCELLABLE = new Set([ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CONFIRMED]);

const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 5);
  return `FD-${date}-${random}`;
};

const legacyPrice = (item) => {
  if (Number.isFinite(item.unitPricePaise)) return item.unitPricePaise;
  if (Number.isFinite(item.price)) return Math.round(item.price * 100);
  return 0;
};

export const toOrderResponse = (order, { admin = false } = {}) => {
  const legacyPaid = order.payment === true;
  const payment = typeof order.payment === "object" && order.payment ? order.payment : {};
  const paymentStatus =
    legacyPaid && order.paymentStatus !== PAYMENT_STATUS.REFUNDED
      ? PAYMENT_STATUS.PAID
      : order.paymentStatus || PAYMENT_STATUS.UNPAID;

  const pricing =
    order.pricing?.totalPaise > 0
      ? {
          subtotalPaise: order.pricing.subtotalPaise,
          discountPaise: order.pricing.discountPaise,
          deliveryFeePaise: order.pricing.deliveryFeePaise,
          taxPaise: order.pricing.taxPaise,
          totalPaise: order.pricing.totalPaise,
          currency: order.pricing.currency || "INR",
          taxRateBps: order.pricing.taxRateBps,
        }
      : {
          subtotalPaise: Math.round((order.amount || 0) * 100),
          discountPaise: 0,
          deliveryFeePaise: 0,
          taxPaise: 0,
          totalPaise: Math.round((order.amount || 0) * 100),
          currency: "INR",
          taxRateBps: 0,
        };

  const items = (order.items || []).map((item) => {
    const unitPricePaise = legacyPrice(item);
    return {
      productId: String(item.productId || item._id || ""),
      name: item.name || "Item",
      imageUrl: item.imageUrl || toImageUrl(item.image),
      unitPricePaise,
      quantity: item.quantity || 1,
      lineTotalPaise:
        item.lineTotalPaise ?? unitPricePaise * (item.quantity || 1),
    };
  });

  return {
    id: String(order._id),
    orderNumber: order.orderNumber || `FD-${String(order._id).slice(-8).toUpperCase()}`,
    userId: String(order.userId?._id || order.userId || ""),
    customer:
      order.userId && typeof order.userId === "object" && order.userId.name
        ? {
            id: String(order.userId._id),
            name: order.userId.name,
            email: order.userId.email,
            phone: order.userId.phone || "",
          }
        : null,
    items,
    pricing,
    couponCode: order.couponCode || "",
    addressSnapshot: order.addressSnapshot || order.address || {},
    status: normalizeOrderStatus(order.status),
    paymentStatus,
    payment: {
      provider: payment.provider || "",
      sessionId: payment.sessionId || null,
      paymentIntentId: payment.paymentIntentId || null,
      method: payment.method || "",
      paidAt: payment.paidAt || null,
    },
    statusHistory: (order.statusHistory || []).map((entry) => ({
      ...entry,
      status: normalizeOrderStatus(entry.status),
    })),
    notes: order.notes || "",
    ...(admin ? { adminNotes: order.adminNotes || "" } : {}),
    placedAt: order.placedAt || order.createdAt || order.date || null,
    cancelledAt: order.cancelledAt || null,
    cancellationReason: order.cancellationReason || "",
  };
};

export const attachMissingItemImages = async (orders) => {
  const missingIds = new Set();

  for (const order of orders) {
    for (const item of order.items || []) {
      if (!item.imageUrl && item.productId) missingIds.add(String(item.productId));
    }
  }

  if (missingIds.size === 0) return orders;

  const products = await Product.find({ _id: { $in: [...missingIds] } }).select("image");
  const imageById = new Map(
    products.map((product) => [String(product._id), toImageUrl(product.image)])
  );

  for (const order of orders) {
    for (const item of order.items || []) {
      if (!item.imageUrl && item.productId) {
        item.imageUrl = imageById.get(String(item.productId)) || "";
      }
    }
  }

  return orders;
};

const resolveAddress = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, userId, deletedAt: null });

  if (!address) {
    throw ApiError.notFound("Delivery address not found");
  }

  return address;
};

const buildOrderItems = async (cart) => {
  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.productId) },
    deletedAt: null,
  });

  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const items = [];

  for (const entry of cart.items) {
    const product = productMap.get(String(entry.productId));

    if (!product) {
      throw new ApiError(
        409,
        ERROR_CODES.PRODUCT_UNAVAILABLE,
        "One or more items are no longer available"
      );
    }

    const item = toProductListItem(product);

    if (!item.isAvailable || item.stock <= 0) {
      throw new ApiError(
        409,
        ERROR_CODES.PRODUCT_UNAVAILABLE,
        `${item.name} is not available`
      );
    }

    if (item.stock < entry.quantity) {
      throw new ApiError(
        409,
        ERROR_CODES.OUT_OF_STOCK,
        `Only ${item.stock} unit${item.stock === 1 ? "" : "s"} of ${item.name} available`
      );
    }

    items.push({
      productId: product._id,
      name: product.name,
      imageUrl: item.image?.url || "",
      unitPricePaise: item.pricePaise,
      quantity: entry.quantity,
      lineTotalPaise: item.pricePaise * entry.quantity,
      categoryId: product.categoryId || null,
      price: item.pricePaise / 100,
      image: product.image,
    });
  }

  if (items.length === 0) {
    throw ApiError.badRequest("Your cart is empty");
  }

  return items;
};

export const createOrder = async (
  userId,
  { addressId, couponCode, idempotencyKey, notes }
) => {
  if (!idempotencyKey) {
    throw ApiError.badRequest("An idempotency key is required");
  }

  const existing = await Order.findOne({ userId, idempotencyKey });
  if (existing) {
    return { order: toOrderResponse(existing), reused: true };
  }

  const settings = await getStoreSettings();
  assertStoreOpen(settings);

  const address = await resolveAddress(userId, addressId);

  if (
    settings.serviceablePincodes.length > 0 &&
    !settings.serviceablePincodes.includes(address.pincode)
  ) {
    throw ApiError.badRequest("We do not deliver to this pincode yet");
  }

  const cart = await Cart.findOne({ userId });

  if (!cart || cart.items.length === 0) {
    throw ApiError.badRequest("Your cart is empty");
  }

  const items = await buildOrderItems(cart);
  const subtotalPaise = items.reduce((total, item) => total + item.lineTotalPaise, 0);
  const code = couponCode || cart.couponCode || "";

  const coupon = code
    ? await validateCouponForCart({ code, subtotalPaise, userId })
    : null;

  const pricing = calculatePricing({ items, coupon, settings });
  const taxableBasePaise = pricing.subtotalPaise - pricing.discountPaise;

  if (coupon && pricing.discountPaise <= 0) {
    throw new ApiError(400, ERROR_CODES.COUPON_INVALID, "This coupon does not apply to your cart");
  }

  if (taxableBasePaise < settings.minOrderPaise) {
    throw ApiError.badRequest(
      `Minimum order value is INR ${(settings.minOrderPaise / 100).toFixed(2)}`
    );
  }

  const now = new Date();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await Order.create({
        orderNumber: generateOrderNumber(),
        userId,
        items,
        pricing,
        couponCode: coupon?.code || "",
        addressSnapshot: address.toJSON(),
        status: ORDER_STATUS.PENDING_PAYMENT,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        payment: { provider: "stripe" },
        statusHistory: [
          { status: ORDER_STATUS.PENDING_PAYMENT, at: now, byUserId: userId, note: "Order placed" },
        ],
        idempotencyKey,
        notes: notes || "",
        placedAt: now,
      });

      await Cart.updateOne(
        { userId, "items.0": { $exists: true } },
        { $set: { items: [], couponCode: "" } }
      );

      await createNotification({
        type: "order.new",
        title: `New order ${order.orderNumber}`,
        body: `${order.items.length} item(s) • INR ${((order.pricing?.totalPaise || 0) / 100).toFixed(2)}`,
        severity: "info",
        link: `/admin/orders/${order._id}`,
        metadata: { orderId: String(order._id) },
      });

      return { order: toOrderResponse(order), reused: false };
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
        const duplicate = await Order.findOne({ userId, idempotencyKey });
        if (duplicate) return { order: toOrderResponse(duplicate), reused: true };
      }
      if (error?.code !== 11000 || attempt === 2) throw error;
    }
  }

  throw ApiError.internal("Could not create the order");
};

export const listUserOrders = async (userId, { status, page = 1, limit = 20 }) => {
  const query = { userId };
  if (status) query.status = status;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1, date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(query),
  ]);

  return {
    items: await attachMissingItemImages(orders.map(toOrderResponse)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getUserOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw ApiError.notFound("Order not found");
  const [response] = await attachMissingItemImages([toOrderResponse(order)]);
  return response;
};

const cancelOrder = async (order, { reason, actorUserId, restock = true }) => {
  const wasPaid = order.paymentStatus === PAYMENT_STATUS.PAID || order.payment === true;

  if (wasPaid) {
    await refundOrderPayment(order);
    if (restock) await restockOrder(order, { reason: "cancel", actorUserId });
  }

  const now = new Date();
  order.status = ORDER_STATUS.CANCELLED;
  order.paymentStatus = wasPaid ? PAYMENT_STATUS.REFUNDED : order.paymentStatus;
  order.cancelledAt = now;
  order.cancellationReason = reason;
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    at: now,
    byUserId: actorUserId || null,
    note: reason,
  });
  await order.save();

  return toOrderResponse(order);
};

export const cancelUserOrder = async (userId, orderId, reason) => {
  const order = await Order.findOne({ _id: orderId, userId });

  if (!order) throw ApiError.notFound("Order not found");

  if (!USER_CANCELLABLE.has(normalizeOrderStatus(order.status))) {
    throw ApiError.conflict("This order can no longer be cancelled", "INVALID_TRANSITION");
  }

  return cancelOrder(order, { reason, actorUserId: userId, restock: true });
};

export const reorder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) throw ApiError.notFound("Order not found");

  for (const item of order.items) {
    const productId = item.productId || item._id;
    if (!productId) continue;

    const product = await Product.findOne({ _id: productId, deletedAt: null });
    if (!product) continue;

    const resolved = toProductListItem(product);
    if (!resolved.isAvailable || resolved.stock <= 0) continue;

    try {
      await addCartItem({ userId }, { productId, quantity: item.quantity });
    } catch {
      continue;
    }
  }

  return getCart({ userId });
};

const OVERVIEW_SERIES_DAYS = 30;

const paidRevenueExpression = {
  $cond: [
    { $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] },
    {
      $cond: [
        { $gt: ["$pricing.totalPaise", 0] },
        "$pricing.totalPaise",
        { $round: [{ $multiply: [{ $ifNull: ["$amount", 0] }, 100] }, 0] },
      ],
    },
    0,
  ],
};

const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.OUT_FOR_DELIVERY,
];

export const getAdminOverview = async ({ from: fromRaw, to: toRaw } = {}) => {
  const startOfDay = (date) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  };

  const baseMatch = {};
  if (fromRaw) baseMatch.createdAt = { ...(baseMatch.createdAt || {}), $gte: startOfDay(fromRaw) };
  if (toRaw) baseMatch.createdAt = { ...(baseMatch.createdAt || {}), $lte: endOfDay(toRaw) };

  const seriesStart = fromRaw ? startOfDay(fromRaw) : startOfDay(Date.now() - (OVERVIEW_SERIES_DAYS - 1) * 86400000);
  const seriesEnd = toRaw ? endOfDay(toRaw) : endOfDay(Date.now());

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const todayMatch = { ...baseMatch };
  todayMatch.createdAt = { $gte: todayStart };
  if (baseMatch.createdAt) {
    todayMatch.createdAt = { ...baseMatch.createdAt, $gte: todayStart };
  }

  const [totalsRow] = await Order.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        paidOrderCount: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", PAYMENT_STATUS.PAID] }, 1, 0] },
        },
        activeOrderCount: {
          $sum: { $cond: [{ $in: ["$status", ACTIVE_ORDER_STATUSES] }, 1, 0] },
        },
        revenuePaise: { $sum: paidRevenueExpression },
      },
    },
  ]);

  const [
    seriesRows,
    statusRows,
    todayRows,
    topProductRows,
    paymentRows,
    categoryRows,
    lowStockProducts,
    recentOrders,
    recentCustomers,
    customerCount,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: seriesStart, $lte: seriesEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orderCount: { $sum: 1 },
          revenuePaise: { $sum: paidRevenueExpression },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([{ $match: baseMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Order.aggregate([
      { $match: todayMatch },
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          revenuePaise: { $sum: paidRevenueExpression },
        },
      },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: PAYMENT_STATUS.PAID, ...baseMatch } },
      { $unwind: "$items" },
      {
        $group: {
          _id: { productId: "$items.productId", name: "$items.name" },
          quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
          revenuePaise: {
            $sum: {
              $ifNull: [
                "$items.lineTotalPaise",
                {
                  $multiply: [
                    { $ifNull: ["$items.unitPricePaise", 0] },
                    { $ifNull: ["$items.quantity", 1] },
                  ],
                },
              ],
            },
          },
          imageUrl: { $first: { $ifNull: ["$items.imageUrl", ""] } },
        },
      },
      { $sort: { quantity: -1, revenuePaise: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$paymentStatus", count: { $sum: 1 }, revenuePaise: { $sum: paidRevenueExpression } } },
      { $sort: { count: -1 } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: PAYMENT_STATUS.PAID, ...baseMatch } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.categoryId",
          quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
          revenuePaise: {
            $sum: {
              $ifNull: [
                "$items.lineTotalPaise",
                {
                  $multiply: [
                    { $ifNull: ["$items.unitPricePaise", 0] },
                    { $ifNull: ["$items.quantity", 1] },
                  ],
                },
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $sort: { revenuePaise: -1, quantity: -1 } },
      { $limit: 6 },
    ]),
    Product.find({
      deletedAt: null,
      isAvailable: true,
      stock: { $lte: 10 },
    })
      .select("name image stock pricePaise")
      .sort({ stock: 1, name: 1 })
      .limit(5),
    Order.find(baseMatch)
      .populate("userId", "name email phone")
      .sort({ createdAt: -1, date: -1 })
      .limit(8),
    User.find({ role: "user" })
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .limit(5),
    User.countDocuments({ role: "user" }),
  ]);

  const byDay = new Map(seriesRows.map((row) => [row._id, row]));
  const series = [];
  let day = new Date(seriesStart);
  while (day <= seriesEnd) {
    const key = day.toISOString().slice(0, 10);
    const row = byDay.get(key);
    series.push({
      date: key,
      orderCount: row?.orderCount || 0,
      revenuePaise: row?.revenuePaise || 0,
    });
    day.setUTCDate(day.getUTCDate() + 1);
  }

  const revenuePaise = totalsRow?.revenuePaise || 0;
  const paidOrderCount = totalsRow?.paidOrderCount || 0;
  const normalizedStatusCounts = new Map();

  for (const row of statusRows) {
    const status = normalizeOrderStatus(row._id);
    normalizedStatusCounts.set(status, (normalizedStatusCounts.get(status) || 0) + row.count);
  }

  const statusBreakdown = [...normalizedStatusCounts]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
  const activeOrderCount = statusBreakdown
    .filter((entry) => ACTIVE_ORDER_STATUSES.includes(entry.status))
    .reduce((total, entry) => total + entry.count, 0);
  const pendingOrderCount = normalizedStatusCounts.get(ORDER_STATUS.PENDING_PAYMENT) || 0;

  return {
    revenuePaise,
    orderCount: totalsRow?.orderCount || 0,
    paidOrderCount,
    activeOrderCount,
    pendingOrderCount,
    customerCount,
    aovPaise: paidOrderCount > 0 ? Math.round(revenuePaise / paidOrderCount) : 0,
    today: {
      revenuePaise: todayRows[0]?.revenuePaise || 0,
      orderCount: todayRows[0]?.orderCount || 0,
    },
    statusBreakdown,
    paymentBreakdown: paymentRows.map((row) => ({
      status: row._id || "unknown",
      count: row.count || 0,
      revenuePaise: row.revenuePaise || 0,
    })),
    categoryBreakdown: categoryRows.map((row) => ({
      categoryId: row._id ? String(row._id) : null,
      name: row.category?.[0]?.name || "Uncategorized",
      quantity: row.quantity || 0,
      revenuePaise: row.revenuePaise || 0,
    })),
    lowStockProducts: lowStockProducts.map((product) => ({
      id: String(product._id),
      name: product.name,
      imageUrl: toImageUrl(product.image),
      stock: product.stock || 0,
    })),
    topProducts: topProductRows.map((row) => ({
      productId: row._id.productId ? String(row._id.productId) : null,
      name: row._id.name || "Item",
      imageUrl: toImageUrl(row.imageUrl),
      quantity: row.quantity || 0,
      revenuePaise: row.revenuePaise || 0,
    })),
    recentCustomers: recentCustomers.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })),
    series,
    recentOrders: await attachMissingItemImages(recentOrders.map(toOrderResponse)),
  };
};

export const listOrdersAdmin = async ({
  status,
  paymentStatus,
  q,
  from,
  to,
  page = 1,
  limit = 20,
}) => {
  const baseQuery = {};

  if (paymentStatus) baseQuery.paymentStatus = paymentStatus;

  if (from || to) {
    baseQuery.createdAt = {};
    if (from) baseQuery.createdAt.$gte = new Date(from);
    if (to) baseQuery.createdAt.$lte = new Date(to);
  }

  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const users = await User.find({ $or: [{ email: pattern }, { name: pattern }] })
      .select("_id")
      .limit(20);

    baseQuery.$or = [
      { orderNumber: pattern },
      { "addressSnapshot.recipientName": pattern },
      { "addressSnapshot.phone": pattern },
      { userId: { $in: users.map((user) => user._id) } },
    ];
  }

  const query = { ...baseQuery };
  if (status) query.status = { $in: orderStatusDbValues(status) };

  const [orders, total, statusRows] = await Promise.all([
    Order.find(query)
      .populate("userId", "name email phone")
      .sort({ createdAt: -1, date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(query),
    Order.aggregate([
      { $match: baseQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = Object.fromEntries(
    Object.values(ORDER_STATUS).map((value) => [value, 0])
  );
  statusCounts.all = 0;

  for (const row of statusRows) {
    const normalized = normalizeOrderStatus(row._id);
    statusCounts.all += row.count;
    statusCounts[normalized] = (statusCounts[normalized] || 0) + row.count;
  }

  return {
    items: await attachMissingItemImages(
      orders.map((order) => toOrderResponse(order, { admin: true }))
    ),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    },
  };
};

export const getOrderAdmin = async (orderId) => {
  const order = await Order.findById(orderId).populate("userId", "name email phone");
  if (!order) throw ApiError.notFound("Order not found");
  const [response] = await attachMissingItemImages([
    toOrderResponse(order, { admin: true }),
  ]);

  const actorIds = [
    ...new Set(
      (response.statusHistory || [])
        .map((entry) => entry.byUserId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  if (actorIds.length > 0) {
    const actors = await User.find({ _id: { $in: actorIds } }).select("name").lean();
    const names = new Map(actors.map((actor) => [String(actor._id), actor.name]));
    response.statusHistory = response.statusHistory.map((entry) => ({
      ...entry,
      byUserName: entry.byUserId ? names.get(String(entry.byUserId)) || null : null,
    }));
  }

  return response;
};

export const updateOrderAdminNotes = async (orderId, adminNotes) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  order.adminNotes = String(adminNotes || "").trim();
  await order.save();

  return getOrderAdmin(orderId);
};

export const updateOrderStatus = async (orderId, status, actorUserId, note = "") => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  const currentStatus = normalizeOrderStatus(order.status);
  const allowed = ADMIN_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(status)) {
    throw ApiError.conflict(
      `Cannot move an order from ${currentStatus} to ${status}`,
      "INVALID_TRANSITION"
    );
  }

  return cancelOrAdvance(order, status, actorUserId, note);
};

const cancelOrAdvance = async (order, status, actorUserId, note = "") => {
  const now = new Date();
  const trimmedNote = String(note || "").trim();

  if (status === ORDER_STATUS.CANCELLED) {
    const response = await cancelOrder(order, {
      reason: trimmedNote || "Cancelled by admin",
      actorUserId,
      restock: true,
    });
    return { ...response, adminNotes: order.adminNotes || "" };
  }

  if (status === ORDER_STATUS.REFUNDED) {
    const wasPaid = order.paymentStatus === PAYMENT_STATUS.PAID;
    if (wasPaid) await refundOrderPayment(order);
    order.paymentStatus = wasPaid ? PAYMENT_STATUS.REFUNDED : order.paymentStatus;
  }

  order.status = status;
  order.statusHistory.push({
    status,
    at: now,
    byUserId: actorUserId || null,
    note: trimmedNote,
  });
  await order.save();

  return toOrderResponse(order, { admin: true });
};

export const cancelOrderAdmin = async (orderId, reason, actorUserId) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  if (
    [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED].includes(
      normalizeOrderStatus(order.status)
    )
  ) {
    throw ApiError.conflict("This order can no longer be cancelled", "INVALID_TRANSITION");
  }

  await cancelOrder(order, { reason, actorUserId, restock: true });
  return getOrderAdmin(orderId);
};

export const markPaymentFailed = async (order) => {
  if (normalizeOrderStatus(order.status) !== ORDER_STATUS.PENDING_PAYMENT) return order;

  order.paymentStatus = PAYMENT_STATUS.FAILED;
  order.status = ORDER_STATUS.PAYMENT_FAILED;
  order.statusHistory.push({
    status: ORDER_STATUS.PAYMENT_FAILED,
    at: new Date(),
    note: "Payment did not complete",
  });
  await order.save();
  return order;
};

export const getOrderDocument = async (orderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null;
  return Order.findById(orderId);
};
