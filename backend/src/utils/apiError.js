import { ERROR_CODES } from "../config/constants.js";

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = "Invalid request", details) {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = "Authentication required", code = ERROR_CODES.UNAUTHENTICATED) {
    return new ApiError(401, code, message);
  }

  static forbidden(message = "Access denied") {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message = "Request conflicts with the current state", code = ERROR_CODES.CONFLICT) {
    return new ApiError(409, code, message);
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, ERROR_CODES.RATE_LIMITED, message);
  }

  static internal(message = "Something went wrong") {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}

export default ApiError;
