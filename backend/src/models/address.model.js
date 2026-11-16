import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    label: { type: String, trim: true, default: "Home", maxlength: 40 },
    recipientName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true, maxlength: 160 },
    line2: { type: String, trim: true, default: "", maxlength: 160 },
    landmark: { type: String, trim: true, default: "", maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
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

addressSchema.index({ userId: 1, isDefault: -1 });
addressSchema.index({ userId: 1, deletedAt: 1 });

const Address = mongoose.models.address || mongoose.model("address", addressSchema);

export default Address;
