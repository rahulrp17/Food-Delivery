import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, default: "" },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    percentBps: { type: Number, default: 0, min: 0, max: 10000 },
    amountPaise: { type: Number, default: 0, min: 0 },
    maxDiscountPaise: { type: Number, default: null, min: 0 },
    minSubtotalPaise: { type: Number, default: 0, min: 0 },
    firstOrderOnly: { type: Boolean, default: false },
    usageLimit: { type: Number, default: null, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: null, min: 0 },
    applicableCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "category" }],
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
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

couponSchema.index({ isActive: 1, expiresAt: 1 });

const Coupon = mongoose.models.coupon || mongoose.model("coupon", couponSchema);

export default Coupon;
