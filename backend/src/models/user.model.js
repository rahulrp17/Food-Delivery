import mongoose from "mongoose";
import { ROLES } from "../config/constants.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    password: { type: String, select: false },
    cartData: { type: Object, default: {} },
    phone: { type: String, default: "" },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    staffRole: {
      type: String,
      enum: ["owner", "manager", "support"],
      default: null,
    },
    permissions: { type: [String], default: undefined },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret.__v;
        delete ret.password;
        delete ret.passwordHash;
        delete ret.tokenVersion;
        delete ret.emailVerificationTokenHash;
        delete ret.emailVerificationExpiresAt;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1 });

const User = mongoose.models.user || mongoose.model("user", userSchema);

export default User;
