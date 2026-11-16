import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import ApiError from "../utils/apiError.js";

const sendRateLimitError = (req, res, next) => {
  next(ApiError.tooManyRequests("Too many requests. Please slow down and try again."));
};

const baseOptions = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: sendRateLimitError,
};

export const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 300,
  skip: (req) => req.path === "/healthz" || req.path === "/readyz",
});

export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
});

export const writeLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 60,
});

export const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 10,
});

export default globalLimiter;
