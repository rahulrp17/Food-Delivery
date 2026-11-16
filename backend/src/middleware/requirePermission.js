import ApiError from "../utils/apiError.js";
import { resolvePermissions } from "../config/permissions.js";

export const requirePermission =
  (...required) =>
  (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    const granted = resolvePermissions(req.user);
    const allowed = required.some((permission) => granted.includes(permission));

    if (!allowed) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }

    next();
  };

export default requirePermission;
