import asyncHandler from "../utils/asyncHandler.js";
import {
  createCoupon,
  deleteCoupon,
  exportCouponRedemptionsCsv,
  listCouponRedemptions,
  listCoupons,
  updateCoupon,
} from "../services/coupon.service.js";

export const adminGetCoupons = asyncHandler(async (req, res) => {
  const result = await listCoupons(req.query);
  res.json({ data: result });
});

export const adminCreateCoupon = asyncHandler(async (req, res) => {
  const coupon = await createCoupon(req.body);
  res.status(201).json({ data: { coupon } });
});

export const adminUpdateCoupon = asyncHandler(async (req, res) => {
  const coupon = await updateCoupon(req.params.id, req.body);
  res.json({ data: { coupon } });
});

export const adminDeleteCoupon = asyncHandler(async (req, res) => {
  const result = await deleteCoupon(req.params.id);
  res.json({ data: result });
});

export const adminGetCouponRedemptions = asyncHandler(async (req, res) => {
  const result = await listCouponRedemptions(req.params.id, req.query);
  res.json({ data: result });
});

export const adminExportCouponRedemptions = asyncHandler(async (req, res) => {
  const { csv, couponCode } = await exportCouponRedemptionsCsv(req.params.id, req.query);
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = couponCode.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="coupon-${slug}-${stamp}.csv"`);
  res.send(csv);
});
