import InventoryLog from "../models/inventoryLog.model.js";
import Product from "../models/product.model.js";
import ApiError from "../utils/apiError.js";
import { ERROR_CODES } from "../config/constants.js";
import { formatDateCsv, toCsv } from "../utils/csv.js";

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toInventoryEntry = (log) => {
  const product = log.productId && typeof log.productId === "object" ? log.productId : null;

  return {
    id: String(log._id),
    product: product
      ? { id: String(product._id), name: product.name, slug: product.slug }
      : { id: log.productId ? String(log.productId) : null, name: "Deleted product", slug: null },
    delta: log.delta,
    reason: log.reason,
    orderId: log.orderId ? String(log.orderId) : null,
    actorUserId: log.actorUserId ? String(log.actorUserId) : null,
    createdAt: log.createdAt,
  };
};

export const applyStockForPaidOrder = async (order, session) => {
  for (const item of order.items) {
    const productId = item.productId;

    if (!productId) {
      throw new ApiError(409, ERROR_CODES.OUT_OF_STOCK, `${item.name} is no longer available`);
    }

    const result = await Product.updateOne(
      { _id: productId, deletedAt: null, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { session }
    );

    if (result.matchedCount === 0) {
      throw new ApiError(
        409,
        ERROR_CODES.OUT_OF_STOCK,
        `${item.name} is out of stock or unavailable`
      );
    }
  }

  await InventoryLog.insertMany(
    order.items.map((item) => ({
      productId: item.productId,
      delta: -item.quantity,
      reason: "order",
      orderId: order._id,
      actorUserId: order.userId,
    })),
    { session }
  );
};

export const restockOrder = async (order, { reason = "cancel", actorUserId = null } = {}) => {
  for (const item of order.items) {
    if (!item.productId) continue;

    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantity } }
    );

    await InventoryLog.create({
      productId: item.productId,
      delta: item.quantity,
      reason,
      orderId: order._id,
      actorUserId,
    });
  }
};

const buildInventoryQuery = async ({ productId, reason, q } = {}) => {
  const query = {};

  if (productId) query.productId = productId;
  if (reason) query.reason = reason;

  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    const products = await Product.find({ name: pattern }).select("_id").lean();
    query.productId = { $in: products.map((product) => product._id) };
  }

  return query;
};

export const listInventoryLogs = async ({ productId, reason, q, page = 1, limit = 20 } = {}) => {
  const query = await buildInventoryQuery({ productId, reason, q });
  const skip = (page - 1) * limit;

  const [logs, total, summaryRows] = await Promise.all([
    InventoryLog.find(query)
      .populate("productId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryLog.countDocuments(query),
    InventoryLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalIn: { $sum: { $cond: [{ $gt: ["$delta", 0] }, "$delta", 0] } },
          totalOut: {
            $sum: { $cond: [{ $lt: ["$delta", 0] }, { $abs: "$delta" }, 0] },
          },
        },
      },
    ]),
  ]);

  const summary = summaryRows[0] || { totalIn: 0, totalOut: 0 };

  return {
    items: logs.map(toInventoryEntry),
    summary: {
      totalIn: summary.totalIn || 0,
      totalOut: summary.totalOut || 0,
      netChange: (summary.totalIn || 0) - (summary.totalOut || 0),
    },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const exportInventoryLogsCsv = async ({ productId, reason, q } = {}) => {
  const query = await buildInventoryQuery({ productId, reason, q });

  const logs = await InventoryLog.find(query)
    .populate("productId", "name")
    .populate("actorUserId", "name email")
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const headers = ["Date", "Product", "Change", "Reason", "Order ID", "Actor"];

  const rows = logs.map((log) => {
    const product = log.productId;
    const actor = log.actorUserId;

    return [
      formatDateCsv(log.createdAt),
      product && typeof product === "object" ? product.name : "Deleted product",
      log.delta,
      log.reason,
      log.orderId ? String(log.orderId) : "",
      actor && typeof actor === "object" ? `${actor.name} (${actor.email})` : "",
    ];
  });

  return toCsv(headers, rows);
};