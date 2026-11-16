import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export const parseDurationMs = (value, fallbackMs) => {
  const match = /^(\d+)\s*([smhd])$/.exec(String(value).trim());
  if (!match) return fallbackMs;
  return Number(match[1]) * UNIT_MS[match[2]];
};

export const accessTokenMaxAgeMs = () => parseDurationMs(env.ACCESS_TOKEN_TTL, 15 * 60 * 1000);

export const refreshTokenMaxAgeMs = () => env.REFRESH_TOKEN_TTL_DAYS * UNIT_MS.d;

export const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      ver: user.tokenVersion ?? 0,
    },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);

export const generateRefreshToken = () => crypto.randomBytes(32).toString("base64url");

export const generateCsrfToken = () => crypto.randomBytes(32).toString("base64url");

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const refreshExpiryDate = () => new Date(Date.now() + refreshTokenMaxAgeMs());
