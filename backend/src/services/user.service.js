import User from "../models/user.model.js";
import Address from "../models/address.model.js";
import Order from "../models/order.model.js";
import foodModel from "../models/product.model.js";
import ApiError from "../utils/apiError.js";
import { toPublicUser, createUser } from "./auth.service.js";
import { attachMissingItemImages, toOrderResponse } from "./order.service.js";
import { resolvePermissions } from "../config/permissions.js";
import { formatDateCsv, formatInrCsv, toCsv } from "../utils/csv.js";

const MAX_ADDRESSES = 10;

export const updateProfile = async (userId, patch) => {
  const user = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true, runValidators: true });
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return toPublicUser(user);
};

export const listAddresses = async (userId) =>
  Address.find({ userId, deletedAt: null }).sort({ isDefault: -1, createdAt: -1 });

export const createAddress = async (userId, data) => {
  const count = await Address.countDocuments({ userId, deletedAt: null });

  if (count >= MAX_ADDRESSES) {
    throw ApiError.conflict(`You can save up to ${MAX_ADDRESSES} addresses`);
  }

  const isDefault = data.isDefault === true || count === 0;

  if (isDefault) {
    await Address.updateMany({ userId, deletedAt: null }, { $set: { isDefault: false } });
  }

  return Address.create({ ...data, userId, isDefault });
};

export const updateAddress = async (userId, addressId, data) => {
  const address = await Address.findOne({ _id: addressId, userId, deletedAt: null });

  if (!address) {
    throw ApiError.notFound("Address not found");
  }

  if (data.isDefault === true) {
    await Address.updateMany(
      { userId, deletedAt: null, _id: { $ne: address._id } },
      { $set: { isDefault: false } }
    );
  }

  Object.assign(address, data);
  await address.save();
  return address;
};

export const deleteAddress = async (userId, addressId) => {
  const address = await Address.findOneAndUpdate(
    { _id: addressId, userId, deletedAt: null },
    { $set: { deletedAt: new Date(), isDefault: false } },
    { new: true }
  );

  if (!address) {
    throw ApiError.notFound("Address not found");
  }

  const remainingDefault = await Address.exists({
    userId,
    deletedAt: null,
    isDefault: true,
  });

  if (!remainingDefault) {
    const nextAddress = await Address.findOne({ userId, deletedAt: null }).sort({ createdAt: -1 });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  return { id: String(address._id) };
};

export const getWishlist = async (userId) => {
  const user = await User.findById(userId).populate({
    path: "wishlist",
    select: "name description price image category",
  });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return user.wishlist;
};

export const addToWishlist = async (userId, productId) => {
  const product = await foodModel.exists({ _id: productId });
  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { wishlist: productId } },
    { new: true }
  );

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return { productIds: user.wishlist.map(String) };
};

export const removeFromWishlist = async (userId, productId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: productId } },
    { new: true }
  );

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return { productIds: user.wishlist.map(String) };
};

const CUSTOMER_SORTS = Object.freeze({
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  last_login: { lastLoginAt: -1, createdAt: -1 },
});

const toCustomerListItem = (user, stats) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  status: user.status || "active",
  orderCount: stats?.count || 0,
  spentPaise: stats?.spentPaise || 0,
  avgOrderPaise: stats?.count ? Math.round((stats.spentPaise || 0) / stats.count) : 0,
  isReturning: (stats?.count || 0) >= 2,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt || null,
  lastOrderAt: stats?.lastOrderAt || null,
  firstOrderAt: stats?.firstOrderAt || null,
});

const customerStatsFor = async (userIds) => {
  if (userIds.length === 0) return new Map();

  const rows = await Order.aggregate([
    { $match: { userId: { $in: userIds } } },
    {
      $group: {
        _id: "$userId",
        count: { $sum: 1 },
        spentPaise: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ["$paymentStatus", "paid"] },
                  { $eq: ["$payment", true] },
                ],
              },
              {
                $ifNull: [
                  "$pricing.totalPaise",
                  { $multiply: [{ $ifNull: ["$amount", 0] }, 100] },
                ],
              },
              0,
            ],
          },
        },
        lastOrderAt: { $max: "$createdAt" },
        firstOrderAt: { $min: "$createdAt" },
      },
    },
  ]);

  return new Map(rows.map((row) => [String(row._id), row]));
};

const emptyCustomerSummary = () => ({
  total: 0,
  active: 0,
  admins: 0,
  newThisMonth: 0,
  lifetimeRevenuePaise: 0,
  returningCustomers: 0,
  returningRatePct: 0,
  avgOrderValuePaise: 0,
  paidOrders: 0,
});

const getCustomerSummary = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  try {
    const [total, active, admins, newThisMonth, revenueRows] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", status: "active" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user", createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        {
          $match: {
            $or: [{ paymentStatus: "paid" }, { payment: true }],
          },
        },
        {
          $group: {
            _id: "$userId",
            count: { $sum: 1 },
            revenuePaise: {
              $sum: {
                $ifNull: [
                  "$pricing.totalPaise",
                  { $multiply: [{ $ifNull: ["$amount", 0] }, 100] },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const payingCustomers = revenueRows.length;
    const paidOrders = revenueRows.reduce((sum, row) => sum + row.count, 0);
    const lifetimeRevenuePaise = revenueRows.reduce(
      (sum, row) => sum + (row.revenuePaise || 0),
      0
    );
    const returningCustomers = revenueRows.filter((row) => row.count >= 2).length;

    return {
      total,
      active,
      admins,
      newThisMonth,
      lifetimeRevenuePaise,
      returningCustomers,
      returningRatePct: payingCustomers
        ? Math.round((returningCustomers / payingCustomers) * 100)
        : 0,
      avgOrderValuePaise: paidOrders ? Math.round(lifetimeRevenuePaise / paidOrders) : 0,
      paidOrders,
    };
  } catch {
    return emptyCustomerSummary();
  }
};

export const listCustomers = async ({
  q,
  role,
  status,
  sort = "newest",
  page = 1,
  limit = 20,
}) => {
  const query = {};

  if (role) query.role = role;
  if (status) query.status = status;

  if (q) {
    const pattern = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const [users, total, summary] = await Promise.all([
    User.find(query)
      .select("name email phone role status createdAt lastLoginAt")
      .sort(CUSTOMER_SORTS[sort] || CUSTOMER_SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
    getCustomerSummary(),
  ]);

  const statsMap = await customerStatsFor(users.map((user) => user._id));

  return {
    items: users.map((user) => toCustomerListItem(user, statsMap.get(String(user._id)))),
    summary,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const exportCustomersCsv = async ({ q, role, status, sort = "newest" } = {}) => {
  const query = {};

  if (role) query.role = role;
  if (status) query.status = status;

  if (q) {
    const pattern = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const users = await User.find(query)
    .select("name email phone role status createdAt lastLoginAt")
    .sort(CUSTOMER_SORTS[sort] || CUSTOMER_SORTS.newest)
    .limit(5000);

  const statsMap = await customerStatsFor(users.map((user) => user._id));

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Role",
    "Status",
    "Orders",
    "Spent (INR)",
    "Avg order (INR)",
    "First order",
    "Last order",
    "Joined",
  ];

  const rows = users.map((user) => {
    const item = toCustomerListItem(user, statsMap.get(String(user._id)));
    return [
      item.name,
      item.email,
      item.phone,
      item.role,
      item.status,
      item.orderCount,
      formatInrCsv(item.spentPaise),
      formatInrCsv(item.avgOrderPaise),
      formatDateCsv(item.firstOrderAt),
      formatDateCsv(item.lastOrderAt),
      formatDateCsv(item.createdAt),
    ];
  });

  return toCsv(headers, rows);
};

export const getCustomerAdmin = async (customerId) => {
  const user = await User.findById(customerId).select(
    "name email phone role status createdAt lastLoginAt"
  );

  if (!user) {
    throw ApiError.notFound("Customer not found");
  }

  const [orders, statsMap] = await Promise.all([
    Order.find({ userId: user._id }).sort({ createdAt: -1, date: -1 }).limit(20),
    customerStatsFor([user._id]),
  ]);

  return {
    customer: toCustomerListItem(user, statsMap.get(String(user._id))),
    orders: await attachMissingItemImages(orders.map(toOrderResponse)),
  };
};

export const updateCustomerRole = async (customerId, role) => {
  const user = await User.findByIdAndUpdate(
    customerId,
    { $set: { role } },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw ApiError.notFound("Customer not found");
  }

  return toPublicUser(user);
};

export const updateCustomerStatus = async (customerId, status) => {
  const user = await User.findById(customerId);

  if (!user) {
    throw ApiError.notFound("Customer not found");
  }

  if (user.role === "admin" && status !== "active") {
    throw ApiError.forbidden("Admin accounts cannot be suspended");
  }

  user.status = status;
  if (status !== "active") {
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }
  await user.save();

  return toPublicUser(user);
};

const toStaffItem = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  staffRole: user.staffRole || null,
  permissions: resolvePermissions(user),
  hasExplicitPermissions: Array.isArray(user.permissions) && user.permissions.length > 0,
  status: user.status || "active",
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt || null,
});

export const listStaff = async ({ q, page = 1, limit = 20 } = {}) => {
  const query = { role: "admin" };

  if (q) {
    const pattern = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return {
    items: users.map(toStaffItem),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const createStaff = async ({ name, email, password, staffRole, permissions }) => {
  const user = await createUser({ name, email, password, role: "admin" });

  user.staffRole = staffRole || "manager";
  if (Array.isArray(permissions) && permissions.length > 0) {
    user.permissions = permissions;
  }
  user.emailVerifiedAt = new Date();
  await user.save();

  return toStaffItem(user);
};

export const updateStaff = async (staffId, { staffRole, permissions, status }) => {
  const user = await User.findById(staffId);

  if (!user || user.role !== "admin") {
    throw ApiError.notFound("Staff member not found");
  }

  if (staffRole !== undefined) user.staffRole = staffRole;

  if (permissions !== undefined) {
    user.permissions =
      Array.isArray(permissions) && permissions.length > 0 ? permissions : undefined;
  }

  if (status !== undefined) {
    user.status = status;
    if (status !== "active") {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    }
  }

  await user.save();

  return toStaffItem(user);
};
