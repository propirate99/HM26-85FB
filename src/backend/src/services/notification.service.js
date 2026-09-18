import { Notification } from "../models/Notification.js";

export async function notify({ userId, title, body, issueId }) {
  if (!userId) return null;
  return Notification.create({ userId, title, body, issueId });
}

export async function listNotifications(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 }).limit(30);
}
