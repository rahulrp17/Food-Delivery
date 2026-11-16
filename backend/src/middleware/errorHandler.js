import { ZodError } from "zod";
import ApiError from "../utils/apiError.js";
import { ERROR_CODES } from "../config/constants.js";
import logger from "../utils/logger.js";

const formatZodIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));

const normalizeError = (error) => {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    return ApiError.badRequest("Validation failed", formatZodIssues(error));
  }

  if (error?.name === "ValidationError" && error?.errors) {
    const details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    return ApiError.badRequest("Validation failed", details);
  }

  if (error?.name === "CastError") {
    return ApiError.badRequest("Invalid identifier");
  }

  if (error?.code === 11000) {
    const fields = Object.keys(error.keyPattern || error.keyValue || {});
    return new ApiError(409, ERROR_CODES.CONFLICT, "Resource already exists", {
      fields,
    });
  }

  if (error?.type === "entity.too.large") {
    return new ApiError(413, ERROR_CODES.VALIDATION_ERROR, "Request body is too large");
  }

  if (error?.type === "entity.parse.failed") {
    return ApiError.badRequest("Malformed JSON body");
  }

  if (error?.name === "MulterError") {
    return ApiError.badRequest(error.message);
  }

  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    return ApiError.unauthorized("Session is invalid or expired", ERROR_CODES.SESSION_EXPIRED);
  }

  return null;
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const normalized = normalizeError(error);
  const isOperational = Boolean(normalized);

  if (!isOperational) {
    logger.error({ err: error, requestId: req.id }, "Unhandled error");
  } else if (normalized.status >= 500) {
    logger.error({ err: normalized, requestId: req.id }, "Request failed");
  } else {
    logger.warn(
      {
        code: normalized.code,
        status: normalized.status,
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
      },
      "Request rejected"
    );
  }

  const apiError = normalized ?? ApiError.internal();

  res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
      requestId: req.id,
    },
  });
};

export default errorHandler;
