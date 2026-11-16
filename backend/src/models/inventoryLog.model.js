import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "food", required: true, index: true },
    delta: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["order", "restock", "adjust", "cancel"],
      required: true,
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "order", default: null, index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const InventoryLog =
  mongoose.models.inventoryLog || mongoose.model("inventoryLog", inventoryLogSchema);

export default InventoryLog;
