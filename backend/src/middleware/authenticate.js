import { COOKIES, ERROR_CODES } from "../config/constants.js";
import { verifyAccessToken } from "../services/token.service.js";
import User from "../models/user.model.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const resolveUser = async (token) => {
  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }

  const user = await User.findById(payload.sub);
  if (!user || (user.status && user.status !== "active")) return null;
  if ((user.tokenVersion ?? 0) !== payload.ver) return null;

  return user;
};

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIES.ACCESS];

  if (!token) {
    throw ApiError.unauthorized("Authentication required");
  }

  const user = await resolveUser(token);
  if (!user) {
    throw ApiError.unauthorized("Session is invalid or expired", ERROR_CODES.SESSION_EXPIRED);
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIES.ACCESS];

  if (token) {
    const user = await resolveUser(token);
    if (user) req.user = user;
  }

  next();
});

export default authenticate;
