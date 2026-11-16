import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import ApiError from "../utils/apiError.js";
import { ERROR_CODES, ROLES } from "../config/constants.js";
import { resolvePermissions } from "../config/permissions.js";
import {
  generateRefreshToken,
  hashToken,
  refreshExpiryDate,
  signAccessToken,
} from "./token.service.js";

const BCRYPT_COST = 12;
const DUMMY_HASH = "$2b$12$T1L3A8pNqqbWtxVZyGXXxu3u4CwpXsXh498t368b2FRntW3lT/We.";

const normalizeEmail = (email) => String(email).trim().toLowerCase();

export const toPublicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  staffRole: user.staffRole || null,
  permissions: resolvePermissions(user),
  status: user.status || "active",
  emailVerified: Boolean(user.emailVerifiedAt),
  createdAt: user.createdAt,
});

const sessionMetadata = (req) => ({
  userAgent: String(req.get("user-agent") || "").slice(0, 300),
  ip: String(req.ip || "").slice(0, 64),
});

export const createUser = async ({ name, email, password, role = ROLES.USER }) => {
  const normalizedEmail = normalizeEmail(email);

  const existing = await User.exists({ email: normalizedEmail });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  return User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role,
  });
};

export const verifyCredentials = async (email, password) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordHash +password"
  );

  const storedHash = user?.passwordHash || user?.password;
  const passwordMatches = await bcrypt.compare(password, storedHash || DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password", ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (user.status && user.status !== "active") {
    throw ApiError.forbidden("This account has been suspended");
  }

  if (!user.passwordHash && user.password) {
    user.passwordHash = user.password;
    user.password = undefined;
  }

  user.lastLoginAt = new Date();
  await user.save();

  return user;
};

export const createSession = async ({ user, req, familyId }) => {
  const refreshToken = generateRefreshToken();

  await Session.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    familyId: familyId || generateRefreshToken(),
    expiresAt: refreshExpiryDate(),
    ...sessionMetadata(req),
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    user,
  };
};

export const revokeFamily = async (familyId) => {
  await Session.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

export const rotateSession = async ({ rawRefreshToken, req }) => {
  if (!rawRefreshToken) {
    throw ApiError.unauthorized("Session expired", ERROR_CODES.SESSION_EXPIRED);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ tokenHash });

  if (!session) {
    throw ApiError.unauthorized("Session expired", ERROR_CODES.SESSION_EXPIRED);
  }

  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    await revokeFamily(session.familyId);
    throw ApiError.unauthorized("Session expired", ERROR_CODES.SESSION_EXPIRED);
  }

  const nextRefreshToken = generateRefreshToken();
  const nextTokenHash = hashToken(nextRefreshToken);
  const now = new Date();

  const claimed = await Session.findOneAndUpdate(
    { _id: session._id, revokedAt: null, replacedByTokenHash: null },
    {
      $set: {
        revokedAt: now,
        replacedByTokenHash: nextTokenHash,
        lastUsedAt: now,
      },
    },
    { new: true }
  );

  if (!claimed) {
    await revokeFamily(session.familyId);
    throw ApiError.unauthorized("Session reuse detected", ERROR_CODES.SESSION_EXPIRED);
  }

  const user = await User.findById(session.userId);
  if (!user || (user.status && user.status !== "active")) {
    await revokeFamily(session.familyId);
    throw ApiError.unauthorized("Session expired", ERROR_CODES.SESSION_EXPIRED);
  }

  await Session.create({
    userId: user._id,
    tokenHash: nextTokenHash,
    familyId: session.familyId,
    expiresAt: refreshExpiryDate(),
    ...sessionMetadata(req),
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: nextRefreshToken,
    user,
  };
};

export const revokeSessionByToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) return;
  await Session.updateOne(
    { tokenHash: hashToken(rawRefreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

export const revokeAllSessions = async (userId) => {
  await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
};

export const listSessions = async (userId, currentRawToken) => {
  const currentHash = currentRawToken ? hashToken(currentRawToken) : null;
  const sessions = await Session.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1 })
    .lean();

  return sessions.map((session) => ({
    id: String(session._id),
    userAgent: session.userAgent || "",
    ip: session.ip || "",
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    current: Boolean(currentHash && session.tokenHash === currentHash),
  }));
};

export const revokeSessionById = async (userId, sessionId) => {
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );

  if (!session) {
    throw ApiError.notFound("Session not found");
  }

  return { id: String(session._id), revoked: true };
};

export const bumpTokenVersion = async (userId) => {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
};

export const changePassword = async ({ user, currentPassword, newPassword }) => {
  const freshUser = await User.findById(user.id || user._id).select("+passwordHash +password");

  if (!freshUser) {
    throw ApiError.notFound("User not found");
  }

  const storedHash = freshUser.passwordHash || freshUser.password;
  const matches = await bcrypt.compare(currentPassword, storedHash || DUMMY_HASH);

  if (!matches) {
    throw ApiError.badRequest("Current password is incorrect");
  }

  freshUser.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  freshUser.password = undefined;
  freshUser.tokenVersion = (freshUser.tokenVersion ?? 0) + 1;
  await freshUser.save();

  await revokeAllSessions(freshUser._id);

  return freshUser;
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export const createEmailVerificationToken = async (userId) => {
  const token = generateRefreshToken();

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    }
  );

  return token;
};

export const verifyEmailToken = async (rawToken) => {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(rawToken),
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select("+emailVerificationTokenHash");

  if (!user) {
    throw ApiError.badRequest("Verification link is invalid or expired");
  }

  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return user;
};

export const createPasswordResetToken = async (email) => {
  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) return null;

  const token = generateRefreshToken();

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetTokenHash: hashToken(token),
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    }
  );

  return { user, token };
};

export const resetPasswordWithToken = async (rawToken, newPassword) => {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordResetTokenHash");

  if (!user) {
    throw ApiError.badRequest("Reset link is invalid or expired");
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  user.password = undefined;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = null;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  await revokeAllSessions(user._id);

  return user;
};
