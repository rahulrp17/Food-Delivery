import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, default: "", trim: true, maxlength: 500 },
    severity: {
      type: String,
      enum: ["info", "success", "warning", "danger"],
      default: "info",
    },
    link: { type: String, default: "" },
    readAt: { type: Date, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.__v;
        delete ret.dedupeKey;
        return ret;
      },
    },
  }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ readAt: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

const Notification =
  mongoose.models.notification || mongoose.model("notification", notificationSchema);

export default Notification;
