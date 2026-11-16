import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import ApiError from "../utils/apiError.js";
import { ERROR_CODES } from "../config/constants.js";

const authMiddleware = async (req, res, next) => {
  const { token } = req.headers;

  if (!token) {
    return next(ApiError.unauthorized("Authentication required"));
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decodedToken.id).select("role");

    if (!user) {
      return next(ApiError.unauthorized("Session is invalid or expired", ERROR_CODES.SESSION_EXPIRED));
    }

    req.user = { id: String(user._id), role: user.role };
    req.body.userId = String(user._id);
    next();
  } catch {
    return next(
      ApiError.unauthorized("Session is invalid or expired", ERROR_CODES.SESSION_EXPIRED)
    );
  }
};

export const adminMiddleware =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }

    next();
  };

export default authMiddleware;
