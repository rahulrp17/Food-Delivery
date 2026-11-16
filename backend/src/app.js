import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import pinoHttp from "pino-http";

import env from "./config/env.js";
import { ERROR_CODES, LIMITS } from "./config/constants.js";
import logger from "./utils/logger.js";
import ApiError from "./utils/apiError.js";
import requestId from "./middleware/requestId.js";
import sanitizeInput from "./middleware/sanitize.js";
import { uploadsDir } from "./middleware/upload.js";
import csrfProtection from "./middleware/csrf.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { paymentWebhook } from "./controllers/payment.controller.js";

import v1Router from "./routes/v1/index.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (env.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(
      new ApiError(403, ERROR_CODES.FORBIDDEN, "Origin is not allowed to access this API")
    );
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Guest-Token",
    "X-Request-Id",
    "Idempotency-Key",
  ],
  exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"],
  maxAge: 86400,
};

app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    autoLogging: {
      ignore: (req) => req.url === "/healthz" || req.url === "/readyz",
    },
    customLogLevel: (req, res, error) => {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
    customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "no-referrer" },
    hsts: env.isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
  })
);
app.use(cors(corsOptions));
app.use(compression());
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentWebhook
);
app.use(express.json({ limit: LIMITS.JSON_BODY }));
app.use(express.urlencoded({ extended: false, limit: LIMITS.JSON_BODY }));
app.use(cookieParser());
app.use(sanitizeInput);

app.get("/healthz", (req, res) => {
  res.json({ data: { status: "ok" } });
});

app.get("/readyz", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ data: { status: ready ? "ready" : "not_ready" } });
});

app.use(
  "/images",
  express.static(uploadsDir, {
    index: false,
    dotfiles: "deny",
    fallthrough: true,
    maxAge: env.isProduction ? "30d" : 0,
    immutable: env.isProduction,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

app.use("/api", globalLimiter);

app.use("/api/v1", csrfProtection, v1Router);

// The pre-v1 API is gone. Old clients get an explicit answer instead of a
// generic 404, so integrators know which surface to move to.
app.use(
  ["/api/user", "/api/food", "/api/cart", "/api/orders"],
  (req, res) => {
    res.status(410).json({
      error: {
        code: "LEGACY_API_REMOVED",
        message:
          "This legacy API has been removed. Use the /api/v1 API — see ARCHITECTURE.md.",
        requestId: req.id,
      },
    });
  }
);

app.use(notFound);
app.use(errorHandler);

export default app;
