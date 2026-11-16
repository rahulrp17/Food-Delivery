import crypto from "node:crypto";
import { COOKIES } from "../config/constants.js";
import { setGuestCookie } from "../utils/cookies.js";

const isGuestToken = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{20,100}$/.test(value);

export const identifyCartOwner = (req, res, next) => {
  if (req.user) {
    req.cartOwner = { userId: req.user._id };
    return next();
  }

  let token = req.cookies?.[COOKIES.GUEST];

  if (!isGuestToken(token)) {
    token = crypto.randomBytes(32).toString("base64url");
    setGuestCookie(res, token);
  }

  req.cartOwner = { guestToken: token };
  next();
};

export default identifyCartOwner;
