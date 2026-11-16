import Notification from "../models/notification.model.js";
import logger from "../utils/logger.js";
import { areNotificationsEnabled } from "./settings.service.js";

const toNotification = (doc) => ({
  id: String(doc._id),
  type: doc.type,
  title: doc.title,
  body: doc.body || "",
  severity: doc.severity || "info",
  link: doc.link || "",
  readAt: doc.readAt || null,
  metadata: doc.metadata || {},
  createdAt: doc.createdAt,
});

export const createNotification = async ({
  type,
  title,
  body = "",
  severity = "info",
  link = "",
  metadata = {},
  dedupeKey = null,
}) => {
  try {
    if (!(await areNotificationsEnabled(type))) return null;

    if (dedupeKey) {
      const existing = await Notification.exists({ dedupeKey });
      if (existing) return null;
    }

    const notification = await Notification.create({
      type,
      title,
      body,
      severity,
      link,
      metadata,
      dedupeKey,
    });

    return toNotification(notification);
  } catch (error) {
    if (error?.code === 11000) return null;
    logger.warn({ err: error, type }, "Failed to create notification");
    return null;
  }
};

export const listNotifications = async ({ page = 1, limit = 20, unreadOnly = false } = {}) => {
  const query = unreadOnly ? { readAt: null } : {};
  const skip = (page - 1) * limit;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ readAt: null }),
  ]);

  return {
    items: items.map(toNotification),
    summary: { unreadCount },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const markNotificationRead = async (notificationId) => {
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { $set: { readAt: new Date() } },
    { new: true }
  );

  return notification ? toNotification(notification) : null;
};

export const markAllNotificationsRead = async () => {
  const result = await Notification.updateMany(
    { readAt: null },
    { $set: { readAt: new Date() } }
  );

  return { updatedCount: result.modifiedCount || 0 };
};

export const deleteNotification = async (notificationId) => {
  const result = await Notification.findByIdAndDelete(notificationId);
  return { id: notificationId, deleted: Boolean(result) };
};
