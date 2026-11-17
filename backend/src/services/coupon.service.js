import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import ApiError from "../utils/apiError.js";
import { ERROR_CODES, ORDER_STATUS } from "../config/constants.js";
import { formatDateCsv, formatInrCsv, toCsv } from "../utils/csv.js";

const invalidCoupon = (message = "Coupon code is invalid") =>
  new ApiError(400, ERROR_CODES.COUPON_INVALID, message);

export const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();

export const findCouponByCode = async (code) => {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  return Coupon.findOne({ code: normalized, deletedAt: null });
};

const ignoredStatuses = [ORDER_STATUS.CANCELLED, ORDER_STATUS.PAYMENT_FAILED];

export const assertCouponUsable = async (coupon, { subtotalPaise, userId }) => {
  if (!coupon || !coupon.isActive) {
    throw invalidCoupon();
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    throw invalidCoupon("This coupon is not active yet");
  }

  if (coupon.expiresAt && coupon.expiresAt <= now) {
    throw new ApiError(400, ERROR_CODES.COUPON_EXPIRED, "This coupon has expired");
  }

  if (subtotalPaise < coupon.minSubtotalPaise) {
    throw invalidCoupon(
      `A minimum subtotal of INR ${(coupon.minSubtotalPaise / 100).toFixed(
        2
      )} is required for this coupon`
    );
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
    if (coupon.usedCount >= coupon.usageLimit) {
      throw invalidCoupon("This coupon has reached its usage limit");
    }
  }

  if (userId) {
    if (coupon.firstOrderOnly) {
      const orderCount = await Order.countDocuments({
        userId,
        status: { $nin: ignoredStatuses },
      });
      if (orderCount > 0) {
        throw invalidCoupon("This coupon is only valid on your first order");
      }
    }

    if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined) {
      const used = await Order.countDocuments({
        userId,
        couponCode: coupon.code,
        status: { $nin: ignoredStatuses },
      });
      if (used >= coupon.perUserLimit) {
        throw invalidCoupon("You have already used this coupon the maximum number of times");
      }
    }
  }

  return coupon;
};

export const validateCouponForCart = async ({ code, subtotalPaise, userId }) => {
  if (!code) return null;

  const coupon = await findCouponByCode(code);
  await assertCouponUsable(coupon, { subtotalPaise, userId });

  return coupon;
};

export const createCoupon = async (data) => {
  try {
    const coupon = await Coupon.create({
      ...data,
      code: normalizeCouponCode(data.code),
    });

    return coupon.toJSON();
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict("A coupon with this code already exists", "COUPON_EXISTS");
    }
    throw error;
  }
};

export const updateCoupon = async (couponId, data) => {
  const coupon = await Coupon.findOne({ _id: couponId, deletedAt: null });

  if (!coupon) {
    throw ApiError.notFound("Coupon not found");
  }

  const { code, ...rest } = data;
  if (code) coupon.code = normalizeCouponCode(code);
  Object.assign(coupon, rest);

  try {
    await coupon.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict("A coupon with this code already exists", "COUPON_EXISTS");
    }
    throw error;
  }

  return coupon.toJSON();
};

export const deleteCoupon = async (couponId) => {
  const coupon = await Coupon.findOneAndUpdate(
    { _id: couponId, deletedAt: null },
    { $set: { deletedAt: new Date(), isActive: false } },
    { new: true }
  );

  if (!coupon) {
    throw ApiError.notFound("Coupon not found");
  }

  return { id: String(coupon._id) };
};

export const listCoupons = async ({ page = 1, limit = 20, status }) => {
  const now = new Date();
  // The status filter must agree with the badge the page renders (which is
  // date based), not with the stored isActive flag: a coupon that has not
  // started yet is "Scheduled" and one past its expiry is "Expired" even
  // while they remain enabled.
  let statusFilter = {};
  if (status === "active") {
    statusFilter = {
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    };
  } else if (status === "expired") {
    statusFilter = { expiresAt: { $ne: null, $lte: now } };
  } else if (status === "scheduled") {
    statusFilter = { startsAt: { $ne: null, $gt: now } };
  }

  const query = { deletedAt: null, ...statusFilter };
  const [items, total] = await Promise.all([
    Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Coupon.countDocuments(query),
  ]);

  // Redeemed money mirrors `usedCount`: cancelled and failed orders are not
  // redemptions, so their discount must not inflate the analytics. The amount
  // lives under `pricing`, not at the root of the order.
  const discountByCode = await Order.aggregate([
    {
      $match: {
        couponCode: { $nin: ["", null] },
        status: { $nin: ignoredStatuses },
      },
    },
    { $group: { _id: "$couponCode", totalDiscount: { $sum: "$pricing.discountPaise" } } },
  ]);
  const discountMap = new Map(discountByCode.map((row) => [row._id, row]));

  return {
    items: items.map((coupon) => {
      const d = discountMap.get(coupon.code) || {};
      return {
        ...coupon.toJSON(),
        discountRedeemedPaise: d.totalDiscount || 0,
      };
    }),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const buildRedemptionFilter = (couponCode, { startDate, endDate } = {}) => {
  // Only live redemptions count: a cancelled or failed order gave the slot
  // back, so it must not appear in the coupon's history or its CSV.
  const filter = { couponCode, status: { $nin: ignoredStatuses } };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  return filter;
};

export const listCouponRedemptions = async (couponId, query = {}) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) throw ApiError.notFound("Coupon not found");

  const orders = await Order.find(buildRedemptionFilter(coupon.code, query))
    .select("orderNumber userId createdAt pricing.totalPaise couponCode")
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  const items = orders.map((order) => ({
    orderNumber: order.orderNumber,
    userName: order.userId ? order.userId.name : "",
    userEmail: order.userId ? order.userId.email : "",
    createdAt: order.createdAt,
    totalPaise: order.pricing?.totalPaise || 0,
  }));

  return { items, couponCode: coupon.code, total: items.length };
};

export const exportCouponRedemptionsCsv = async (couponId, query = {}) => {
  const { items, couponCode } = await listCouponRedemptions(couponId, query);

  const csv = toCsv(
    ["Date", "Order", "Customer", "Email", "Order total (INR)"],
    items.map((item) => [
      formatDateCsv(item.createdAt),
      item.orderNumber || "",
      item.userName,
      item.userEmail,
      formatInrCsv(item.totalPaise),
    ])
  );

  return { csv, couponCode };
};
