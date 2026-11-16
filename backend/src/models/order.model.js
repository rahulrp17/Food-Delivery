import mongoose from "mongoose";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
} from "../config/constants.js";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "food", default: null },
    name: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    unitPricePaise: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "category", default: null },
    price: { type: Number, default: null },
    image: { type: String, default: "" },
  },
  { _id: true }
);

const pricingSchema = new mongoose.Schema(
  {
    subtotalPaise: { type: Number, default: 0, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    deliveryFeePaise: { type: Number, default: 0, min: 0 },
    taxPaise: { type: Number, default: 0, min: 0 },
    totalPaise: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },
    taxRateBps: { type: Number, default: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    byUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    pricing: { type: pricingSchema, default: () => ({}) },
    couponCode: { type: String, trim: true, uppercase: true, default: "" },
    addressSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING_PAYMENT,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID,
      index: true,
    },
    payment: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    statusHistory: { type: [statusHistorySchema], default: [] },
    idempotencyKey: { type: String, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    adminNotes: { type: String, trim: true, maxlength: 1000, default: "" },
    placedAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "" },

    amount: { type: Number, default: null },
    address: { type: mongoose.Schema.Types.Mixed, default: null },
    date: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);
orderSchema.index({ "payment.sessionId": 1 }, { unique: true, sparse: true });
orderSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });
orderSchema.index({ "payment.paymentIntentId": 1 }, { sparse: true });

const Order = mongoose.models.order || mongoose.model("order", orderSchema);

export default Order;
