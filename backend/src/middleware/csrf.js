import crypto from "node:crypto";
import ApiError from "../utils/apiError.js";
import env from "../config/env.js";
import { COOKIES, ERROR_CODES } from "../config/constants.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const safeEqual = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const isAllowedOrigin = (value) => {
  try {
    return env.allowedOrigins.includes(new URL(value).origin);
  } catch {
    return false;
  }
};

export const csrfProtection = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const referer = req.get("referer");

  if (origin && !isAllowedOrigin(origin)) {
    return next(ApiError.forbidden("Origin is not allowed to access this API"));
  }

  if (!origin && referer && !isAllowedOrigin(referer)) {
    return next(ApiError.forbidden("Origin is not allowed to access this API"));
  }

  const cookieToken = req.cookies?.[COOKIES.CSRF];
  const headerToken = req.get("x-csrf-token");

  if (!safeEqual(cookieToken, headerToken)) {
    return next(
      new ApiError(403, ERROR_CODES.INVALID_CSRF, "Invalid or missing CSRF token")
    );
  }

  next();
};

export default csrfProtection;
