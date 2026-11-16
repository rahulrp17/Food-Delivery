import mongoose from "mongoose";
// The real Order model — NOT the legacy `orderModel.js`. The legacy schema
// types `userId` as a String while the collection stores ObjectIds, so
// querying it never matches a customer's order and every review submission
// was rejected with "Only customers who have received this item can review
// it".
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Review from "../models/review.model.js";
import ApiError from "../utils/apiError.js";
import { imagePayload } from "../utils/image.js";
import { createNotification } from "./notification.service.js";

const paginate = ({ page = 1, limit = 20 }) => ({
  skip: (page - 1) * limit,
  limit,
});

export const recalculateProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: "approved", deletedAt: null } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const ratingAvg = stats ? Math.round(stats.avg * 10) / 10 : 0;
  const ratingCount = stats?.count || 0;

  await Product.updateOne({ _id: productId }, { $set: { ratingAvg, ratingCount } });

  return { ratingAvg, ratingCount };
};

const toReview = (review) => {
  const user = review.userId && typeof review.userId === "object" ? review.userId : null;

  return {
    id: String(review._id),
    productId: String(review.productId),
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    author: user ? { id: String(user._id), name: user.name } : null,
    adminReply: review.adminReply
      ? {
          text: review.adminReply.text || "",
          repliedAt: review.adminReply.repliedAt,
          repliedBy: review.adminReply.repliedBy
            ? String(review.adminReply.repliedBy)
            : null,
        }
      : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    reportedAt: review.reportedAt || null,
  };
};

export const listMyReviews = async (userId, { page = 1, limit = 20 } = {}) => {
  const { skip, limit: take } = paginate({ page, limit });
  const query = { userId: new mongoose.Types.ObjectId(userId), deletedAt: null };

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate("productId", "name slug image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take),
    Review.countDocuments(query),
  ]);

  return {
    items: reviews.map((review) => {
      const product = review.productId && typeof review.productId === "object" ? review.productId : null;

      return {
        ...toReview(review),
        product: product
          ? {
              id: String(product._id),
              name: product.name,
              slug: product.slug,
              image: imagePayload(product.image),
            }
          : null,
      };
    }),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const listProductReviews = async (productId, { page, limit }) => {  const product = await Product.findOne({ _id: productId, deletedAt: null }).select("_id");

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const query = { productId, status: "approved", deletedAt: null };
  const aggregateMatch = {
    productId: new mongoose.Types.ObjectId(productId),
    status: "approved",
    deletedAt: null,
  };
  const { skip, limit: take } = paginate({ page, limit });

  const [reviews, total, summary] = await Promise.all([
    Review.find(query)
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take),
    Review.countDocuments(query),
    Review.aggregate([
      { $match: aggregateMatch },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
  ]);

  const stats = summary[0];

  return {
    items: reviews.map(toReview),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0,
      ratingCount: stats?.count || 0,
    },
  };
};

const findVerifiedOrder = async (userId, productId) =>
  Order.findOne({
    userId: String(userId),
    status: /delivered/i,
    $or: [
      { "items.productId": new mongoose.Types.ObjectId(productId) },
      { "items._id": new mongoose.Types.ObjectId(productId) },
      { "items.id": new mongoose.Types.ObjectId(productId) },
    ],
  });

export const createReview = async (userId, data) => {
  const product = await Product.findOne({ _id: data.productId, deletedAt: null }).select("_id");

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  const order = await findVerifiedOrder(userId, data.productId);

  if (!order) {
    throw ApiError.forbidden("Only customers who have received this item can review it");
  }

  const existing = await Review.findOne({
    productId: data.productId,
    userId,
    orderId: order._id,
    deletedAt: null,
  });

  if (existing) {
    throw ApiError.conflict("You have already reviewed this item for this order", "REVIEW_EXISTS");
  }

  const review = await Review.create({
    productId: data.productId,
    userId,
    orderId: order._id,
    rating: data.rating,
    title: data.title || "",
    body: data.body || "",
    status: "pending",
  });

  await review.populate("userId", "name");

  await createNotification({
    type: "review.new",
    title: `New ${data.rating}-star review`,
    body: data.title || String(data.body || "").slice(0, 120) || "Awaiting moderation",
    severity: "info",
    link: "/admin/reviews",
    metadata: { reviewId: String(review._id), productId: String(review.productId) },
  });

  return toReview(review);
};

const findOwnReview = async (reviewId, userId) => {
  const review = await Review.findOne({ _id: reviewId, userId, deletedAt: null });

  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  return review;
};

export const updateReview = async (reviewId, userId, data) => {
  const review = await findOwnReview(reviewId, userId);
  const wasApproved = review.status === "approved";

  if (data.rating !== undefined) review.rating = data.rating;
  if (data.title !== undefined) review.title = data.title;
  if (data.body !== undefined) review.body = data.body;

  review.status = "pending";
  await review.save();

  if (wasApproved) {
    await recalculateProductRating(review.productId);
  }

  await review.populate("userId", "name");

  return toReview(review);
};

export const deleteReview = async (reviewId, userId) => {
  const review = await findOwnReview(reviewId, userId);
  const wasApproved = review.status === "approved";

  review.deletedAt = new Date();
  review.status = "rejected";
  await review.save();

  if (wasApproved) {
    await recalculateProductRating(review.productId);
  }

  return { id: String(review._id) };
};

export const listReviewsForAdmin = async ({ status, productId, page, limit }) => {
  const query = { deletedAt: null };

  if (status) query.status = status;
  if (productId) query.productId = productId;

  const { skip, limit: take } = paginate({ page, limit });

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate("userId", "name email")
      .populate("productId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take),
    Review.countDocuments(query),
  ]);

  const items = reviews.map((review) => ({
    ...toReview(review),
    product: review.productId
      ? { id: String(review.productId._id), name: review.productId.name, slug: review.productId.slug }
      : null,
    author: review.userId
      ? {
          id: String(review.userId._id),
          name: review.userId.name,
          email: review.userId.email,
        }
      : null,
  }));

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const moderateReview = async (reviewId, status) => {
  const review = await Review.findOneAndUpdate(
    { _id: reviewId, deletedAt: null },
    { $set: { status } },
    { new: true }
  ).populate("userId", "name");

  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  await recalculateProductRating(review.productId);

  return toReview(review);
};

export const reportReview = async (reviewId, reporterUserId) => {
  const review = await Review.findOneAndUpdate(
    { _id: reviewId, deletedAt: null },
    {
      $set: { status: "reported", reportedAt: new Date(), reportedBy: reporterUserId },
    },
    { new: true }
  ).populate("userId", "name");

  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  await recalculateProductRating(review.productId);

  return toReview(review);
};

export const replyReview = async (reviewId, replyText, actorUserId) => {
  const text = String(replyText || "").trim();
  if (!text) {
    throw ApiError.badRequest("Reply text is required");
  }

  const review = await Review.findOne({ _id: reviewId, deletedAt: null });
  if (!review) {
    throw ApiError.notFound("Review not found");
  }

  review.adminReply = { text, repliedAt: new Date(), repliedBy: actorUserId };
  await review.save();
  await review.populate("userId", "name");

  return toReview(review);
};
