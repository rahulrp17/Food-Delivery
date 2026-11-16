import env from "../config/env.js";
import { COOKIES } from "../config/constants.js";
import {
  accessTokenMaxAgeMs,
  generateCsrfToken,
  refreshTokenMaxAgeMs,
} from "../services/token.service.js";

export const REFRESH_COOKIE_PATH = "/api/v1/auth";

const baseCookieOptions = () => ({
  secure: env.isProduction,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

const accessCookieOptions = () => ({
  ...baseCookieOptions(),
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: accessTokenMaxAgeMs(),
});

const refreshCookieOptions = () => ({
  ...baseCookieOptions(),
  httpOnly: true,
  sameSite: "strict",
  path: REFRESH_COOKIE_PATH,
  maxAge: refreshTokenMaxAgeMs(),
});

const csrfCookieOptions = () => ({
  ...baseCookieOptions(),
  httpOnly: false,
  sameSite: "lax",
  path: "/",
  maxAge: refreshTokenMaxAgeMs(),
});

const guestCookieOptions = () => ({
  ...baseCookieOptions(),
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 30,
});

export const setGuestCookie = (res, token) => {
  res.cookie(COOKIES.GUEST, token, guestCookieOptions());
};

export const clearGuestCookie = (res) => {
  res.clearCookie(COOKIES.GUEST, {
    ...baseCookieOptions(),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
};

export const setCsrfCookie = (res, token) => {
  res.cookie(COOKIES.CSRF, token, csrfCookieOptions());
};

export const ensureCsrfToken = (req, res) => {
  const existing = req.cookies?.[COOKIES.CSRF];
  if (typeof existing === "string" && existing.length >= 32) {
    return existing;
  }

  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  return token;
};

export const setAuthCookies = (res, { accessToken, refreshToken, csrfToken }) => {
  res.cookie(COOKIES.ACCESS, accessToken, accessCookieOptions());
  res.cookie(COOKIES.REFRESH, refreshToken, refreshCookieOptions());
  setCsrfCookie(res, csrfToken || generateCsrfToken());
};

export const clearAuthCookies = (res) => {
  const base = baseCookieOptions();
  res.clearCookie(COOKIES.ACCESS, { ...base, httpOnly: true, sameSite: "lax", path: "/" });
  res.clearCookie(COOKIES.REFRESH, {
    ...base,
    httpOnly: true,
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
  });
  res.clearCookie(COOKIES.CSRF, { ...base, sameSite: "lax", path: "/" });
};
