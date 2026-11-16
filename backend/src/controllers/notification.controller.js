import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import {
  deleteNotification as deleteNotificationService,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service.js";

export const adminGetNotifications = asyncHandler(async (req, res) => {
  const result = await listNotifications(req.query);
  res.json({ data: result });
});

export const adminMarkNotificationRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.params.id);

  if (!notification) {
    throw ApiError.notFound("Notification not found");
  }

  res.json({ data: { notification } });
});

export const adminMarkAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsRead();
  res.json({ data: result });
});

export const adminDeleteNotification = asyncHandler(async (req, res) => {
  const result = await deleteNotificationService(req.params.id);
  res.json({ data: result });
});
