import AuditLog from "../models/auditLog.model.js";
import logger from "../utils/logger.js";

const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "csrftoken",
  "authorization",
  "cookie",
  "secret",
  "card",
  "cardnumber",
  "cvc",
]);

const MAX_STRING_LENGTH = 500;
const MAX_METADATA_DEPTH = 4;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const redactValue = (value, depth = 0) => {
  if (depth > MAX_METADATA_DEPTH) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => redactValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : redactValue(item, depth + 1),
      ])
    );
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }
  return value;
};

export const sanitizeAuditMetadata = (value) => redactValue(value);

const entityFromPath = (path) => {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
};

export const recordAuditLog = async (entry) => {
  try {
    await AuditLog.create({
      ...entry,
      metadata: sanitizeAuditMetadata(entry.metadata || {}),
    });
  } catch (error) {
    logger.warn({ err: error, action: entry.action }, "Failed to write audit log");
  }
};

export const listAuditLogs = async ({ page = 1, limit = 20, actor, action, path, q } = {}) => {
  const query = {};

  if (actor) {
    const actorPattern = new RegExp(escapeRegex(actor), "i");
    query.$or = [
      { actorEmail: actorPattern },
      { actorId: actorPattern },
    ];
  }

  if (action) query.action = new RegExp(escapeRegex(action), "i");
  if (path) query.path = new RegExp(escapeRegex(path), "i");

  if (q) {
    const qPattern = new RegExp(escapeRegex(q), "i");
    const orClauses = [
      { action: qPattern },
      { path: qPattern },
      { actorEmail: qPattern },
    ];
    query.$or = [...(query.$or || []), ...orClauses];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    items: items.map((log) => ({
      id: String(log._id),
      actorId: String(log.actorId || ""),
      actorEmail: log.actorEmail || "",
      actorRole: log.actorRole || "",
      action: log.action || "",
      method: log.method || "",
      path: log.path || "",
      entityType: log.entityType || "",
      entityId: log.entityId || "",
      statusCode: log.statusCode || 0,
      requestId: log.requestId || "",
      ip: log.ip || "",
      metadata: log.metadata || {},
      createdAt: log.createdAt,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const auditAdminMutations = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const startedAt = Date.now();
  res.on("finish", () => {
    if (res.statusCode >= 400) return;

    const path = req.originalUrl.split("?")[0];
    const entityType = req.baseUrl.split("/").filter(Boolean).pop() || "admin";
    const entityId = String(req.params?.id || req.params?.productId || req.params?.orderId || "");

    recordAuditLog({
      actorId: req.user?._id || null,
      actorEmail: req.user?.email || "",
      actorRole: req.user?.role || "",
      action: `${req.method} ${path}`,
      method: req.method,
      path,
      entityType,
      entityId,
      statusCode: res.statusCode,
      requestId: req.id || "",
      ip: req.ip || "",
      metadata: {
        body: req.body || {},
        params: req.params || {},
        query: req.query || {},
        durationMs: Date.now() - startedAt,
        entityHint: entityFromPath(req.path),
      },
    });
  });

  next();
};

export default auditAdminMutations;
