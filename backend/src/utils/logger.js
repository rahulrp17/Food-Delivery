import pino from "pino";
import env from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "food-delivery-api",
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "password",
      "newPassword",
      "currentPassword",
      "passwordHash",
      "token",
      "refreshToken",
      "csrfToken",
      "*.password",
      "*.token",
    ],
    censor: "[redacted]",
  },
});

export default logger;
