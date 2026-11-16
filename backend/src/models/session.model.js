import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    replacedByTokenHash: { type: String, default: null },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, revokedAt: 1 });

const Session = mongoose.models.session || mongoose.model("session", sessionSchema);

export default Session;
