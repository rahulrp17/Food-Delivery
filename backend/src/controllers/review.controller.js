import asyncHandler from "../utils/asyncHandler.js";
import {
  createReview,
  deleteReview,
  listMyReviews,
  listProductReviews,
  listReviewsForAdmin,
  moderateReview,
  replyReview,
  reportReview,
  updateReview,
} from "../services/review.service.js";

export const getProductReviews = asyncHandler(async (req, res) => {
  const result = await listProductReviews(req.query.productId, req.query);
  res.json({ data: result });
});

export const getMyReviews = asyncHandler(async (req, res) => {
  const result = await listMyReviews(req.user._id, req.query);
  res.json({ data: result });
});

export const postReview = asyncHandler(async (req, res) => {
  const review = await createReview(req.user._id, req.body);
  res.status(201).json({ data: { review } });
});

export const patchReview = asyncHandler(async (req, res) => {
  const review = await updateReview(req.params.id, req.user._id, req.body);
  res.json({ data: { review } });
});

export const removeReview = asyncHandler(async (req, res) => {
  const result = await deleteReview(req.params.id, req.user._id);
  res.json({ data: result });
});

export const adminGetReviews = asyncHandler(async (req, res) => {
  const result = await listReviewsForAdmin(req.query);
  res.json({ data: result });
});

export const adminModerateReview = asyncHandler(async (req, res) => {
  const review = await moderateReview(req.params.id, req.body.status);
  res.json({ data: { review } });
});

export const adminReplyReview = asyncHandler(async (req, res) => {
  const review = await replyReview(req.params.id, req.body.reply, req.user._id);
  res.json({ data: { review } });
});

export const adminReportReview = asyncHandler(async (req, res) => {
  const review = await reportReview(req.params.id, req.user._id);
  res.json({ data: { review } });
});
