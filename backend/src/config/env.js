import "dotenv/config";
import { z } from "zod";

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

const isTest = process.env.NODE_ENV === "test";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  MONGO_URI: isTest
    ? z.string().default("mongodb://127.0.0.1:27017/food-delivery-test")
    : z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: isTest
    ? z.string().min(32).default("test-only-jwt-secret-not-for-production-use")
    : z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  CLIENT_URL: z.url().default("http://localhost:5173"),
  ADDITIONAL_ORIGINS: z.string().optional().default(""),
  COOKIE_DOMAIN: z.string().optional().default(""),
  /* Set when the frontend and API live on different registrable domains
     (e.g. two *.onrender.com services). Uses SameSite=None cookies so the
     browser accepts and sends the session across sites. */
  CROSS_SITE_COOKIES: booleanish.default(false),
  TRUST_PROXY: booleanish.default(false),

  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),

  STORAGE_DRIVER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_URL: z.string().optional().default(""),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default(isTest ? "silent" : "info"),

  ADMIN_EMAIL: z.string().optional().default(""),
  ADMIN_PASSWORD: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n  ");
  throw new Error(`Invalid environment configuration:\n  ${issues}`);
}

const raw = parsed.data;

if (raw.NODE_ENV === "production") {
  if (!raw.STRIPE_SECRET_KEY) {
    throw new Error("Invalid environment configuration: STRIPE_SECRET_KEY is required in production");
  }
  if (!raw.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      "Invalid environment configuration: STRIPE_WEBHOOK_SECRET is required in production"
    );
  }
  if (raw.STORAGE_DRIVER === "cloudinary" && !raw.CLOUDINARY_URL) {
    throw new Error(
      "Invalid environment configuration: CLOUDINARY_URL is required when STORAGE_DRIVER=cloudinary"
    );
  }
}

const additionalOrigins = raw.ADDITIONAL_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");

export const env = Object.freeze({
  ...raw,
  ADDITIONAL_ORIGINS: additionalOrigins,
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  allowedOrigins: Array.from(
    new Set([raw.CLIENT_URL, ...additionalOrigins].map(normalizeOrigin))
  ),
});

export default env;
