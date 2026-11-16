import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null, index: true },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    statusCode: { type: Number, required: true },
    requestId: { type: String, default: "" },
    ip: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.models.auditLog || mongoose.model("auditLog", auditLogSchema);

export default AuditLog;
