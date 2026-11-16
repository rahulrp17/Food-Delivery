import { COOKIES } from "../config/constants.js";
import env from "../config/env.js";
import asyncHandler from "../utils/asyncHandler.js";
import { clearAuthCookies, ensureCsrfToken, setAuthCookies } from "../utils/cookies.js";
import {
  bumpTokenVersion,
  changePassword,
  createEmailVerificationToken,
  createPasswordResetToken,
  createSession,
  createUser,
  listSessions,
  resetPasswordWithToken,
  revokeAllSessions,
  revokeSessionById,
  revokeSessionByToken,
  rotateSession,
  toPublicUser,
  verifyCredentials,
  verifyEmailToken,
} from "../services/auth.service.js";
import { updateProfile } from "../services/user.service.js";
import ApiError from "../utils/apiError.js";

export const getCsrfToken = (req, res) => {
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ data: { csrfToken } });
};

export const register = asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  const { accessToken, refreshToken } = await createSession({ user, req });

  setAuthCookies(res, { accessToken, refreshToken, csrfToken: ensureCsrfToken(req, res) });

  res.status(201).json({ data: { user: toPublicUser(user) } });
});

export const login = asyncHandler(async (req, res) => {
  const user = await verifyCredentials(req.body.email, req.body.password);
  const { accessToken, refreshToken } = await createSession({ user, req });

  setAuthCookies(res, { accessToken, refreshToken, csrfToken: ensureCsrfToken(req, res) });

  res.json({ data: { user: toPublicUser(user) } });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.[COOKIES.REFRESH];

  if (!rawRefreshToken) {
    throw ApiError.unauthorized("Session expired", "SESSION_EXPIRED");
  }

  const { user, accessToken, refreshToken } = await rotateSession({ rawRefreshToken, req });

  setAuthCookies(res, { accessToken, refreshToken, csrfToken: ensureCsrfToken(req, res) });

  res.json({ data: { user: toPublicUser(user) } });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeSessionByToken(req.cookies?.[COOKIES.REFRESH]);
  clearAuthCookies(res);
  res.status(204).end();
});

export const logoutAll = asyncHandler(async (req, res) => {
  await revokeAllSessions(req.user._id);
  await bumpTokenVersion(req.user._id);
  clearAuthCookies(res);
  res.status(204).end();
});

export const me = (req, res) => {
  res.json({ data: { user: toPublicUser(req.user) } });
};

export const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await updateProfile(req.user._id, req.body);
  res.json({ data: { user } });
});

export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await listSessions(req.user._id, req.cookies?.[COOKIES.REFRESH]);
  res.json({ data: { sessions } });
});

export const deleteSession = asyncHandler(async (req, res) => {
  const result = await revokeSessionById(req.user._id, req.params.id);
  res.json({ data: result });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const user = await changePassword({
    user: req.user,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });

  const { accessToken, refreshToken } = await createSession({ user, req });

  setAuthCookies(res, { accessToken, refreshToken, csrfToken: ensureCsrfToken(req, res) });

  res.json({ data: { user: toPublicUser(user) } });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await createPasswordResetToken(req.body.email);
  const data = {};

  if (!env.isProduction && result) {
    data.devResetToken = result.token;
  }

  res.status(202).json({ data });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await resetPasswordWithToken(req.body.token, req.body.password);
  clearAuthCookies(res);
  res.json({ data: { reset: true } });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const token = await createEmailVerificationToken(req.user._id);
  const data = {};

  if (!env.isProduction) {
    data.devVerificationToken = token;
  }

  res.status(202).json({ data });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await verifyEmailToken(req.body.token);
  res.json({ data: { user: toPublicUser(user) } });
});
