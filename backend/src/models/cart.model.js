import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "food", required: true },
    quantity: { type: Number, required: true, min: 1, max: 10 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    guestToken: { type: String, default: null },
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, trim: true, uppercase: true, default: "" },
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

cartSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } }
);
cartSchema.index(
  { guestToken: 1 },
  { unique: true, partialFilterExpression: { guestToken: { $type: "string" } } }
);
cartSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 30,
    partialFilterExpression: { guestToken: { $type: "string" } },
  }
);

const Cart = mongoose.models.cart || mongoose.model("cart", cartSchema);

export default Cart;
