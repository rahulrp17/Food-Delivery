import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { toPublicUser } from "../services/auth.service.js";
import {
  addToWishlist,
  createStaff as createStaffService,
  exportCustomersCsv as exportCustomersCsvService,
  getCustomerAdmin as getCustomerAdminService,
  listCustomers as listCustomersService,
  listStaff as listStaffService,
  updateCustomerRole as updateCustomerRoleService,
  updateCustomerStatus as updateCustomerStatusService,
  updateStaff as updateStaffService,
  createAddress,
  deleteAddress,
  getWishlist,
  listAddresses,
  removeFromWishlist,
  updateAddress,
  updateProfile,
} from "../services/user.service.js";

export const getMe = (req, res) => {
  res.json({ data: { user: toPublicUser(req.user) } });
};

export const updateMe = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user._id, req.body);
  res.json({ data: { user } });
});

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await listAddresses(req.user._id);
  res.json({ data: { addresses } });
});

export const addAddress = asyncHandler(async (req, res) => {
  const address = await createAddress(req.user._id, req.body);
  res.status(201).json({ data: { address } });
});

export const editAddress = asyncHandler(async (req, res) => {
  const address = await updateAddress(req.user._id, req.params.id, req.body);
  res.json({ data: { address } });
});

export const removeAddress = asyncHandler(async (req, res) => {
  const result = await deleteAddress(req.user._id, req.params.id);
  res.json({ data: result });
});

export const getWishlistItems = asyncHandler(async (req, res) => {
  const items = await getWishlist(req.user._id);
  res.json({ data: { items } });
});

export const addWishlistItem = asyncHandler(async (req, res) => {
  const result = await addToWishlist(req.user._id, req.params.productId);
  res.status(201).json({ data: result });
});

export const removeWishlistItem = asyncHandler(async (req, res) => {
  const result = await removeFromWishlist(req.user._id, req.params.productId);
  res.json({ data: result });
});

export const adminListCustomers = asyncHandler(async (req, res) => {
  const result = await listCustomersService(req.query);
  res.json({ data: result });
});

export const adminExportCustomers = asyncHandler(async (req, res) => {
  const csv = await exportCustomersCsvService(req.query);
  const stamp = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="customers-${stamp}.csv"`);
  res.send(csv);
});

export const adminGetCustomer = asyncHandler(async (req, res) => {
  const result = await getCustomerAdminService(req.params.id);
  res.json({ data: result });
});

export const adminUpdateCustomerRole = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id && req.body.role !== "admin") {
    throw ApiError.forbidden("You cannot remove your own admin access");
  }
  const user = await updateCustomerRoleService(req.params.id, req.body.role);
  res.json({ data: { user } });
});

export const adminUpdateCustomerStatus = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id && req.body.status !== "active") {
    throw ApiError.forbidden("You cannot suspend your own account");
  }
  const user = await updateCustomerStatusService(req.params.id, req.body.status);
  res.json({ data: { user } });
});

export const adminListStaff = asyncHandler(async (req, res) => {
  const result = await listStaffService(req.query);
  res.json({ data: result });
});

export const adminCreateStaff = asyncHandler(async (req, res) => {
  const staff = await createStaffService(req.body);
  res.status(201).json({ data: { staff } });
});

export const adminUpdateStaff = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id && req.body.status === "suspended") {
    throw ApiError.forbidden("You cannot suspend your own account");
  }

  const staff = await updateStaffService(req.params.id, req.body);
  res.json({ data: { staff } });
});
