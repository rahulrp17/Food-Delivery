import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "food",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: "", maxlength: 120 },
    body: { type: String, trim: true, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "reported"],
      default: "pending",
      index: true,
    },
    adminReply: {
      text: { type: String, trim: true, default: "" },
      repliedAt: { type: Date, default: null },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    },
    reportedAt: { type: Date, default: null },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.__v;
        delete ret.deletedAt;
        return ret;
      },
    },
  }
);

reviewSchema.index({ productId: 1, userId: 1, orderId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, deletedAt: 1 });

const Review = mongoose.models.review || mongoose.model("review", reviewSchema);

export default Review;
