import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

const WebhookEvent =
  mongoose.models.webhookEvent || mongoose.model("webhookEvent", webhookEventSchema);

export default WebhookEvent;
