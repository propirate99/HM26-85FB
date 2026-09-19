import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

export async function notify(payload) {
  if (!payload?.userId) return null;
  return Notification.create({
    userId: payload.userId,
    title: payload.title,
    body: payload.body || "",
    issueId: payload.issueId || null,
    issuePublicId: payload.issuePublicId || "",
    photoUrl: payload.photoUrl || "",
    location: payload.location || undefined,
    locationLabel: payload.locationLabel || "",
    category: payload.category || "",
    type: payload.type || "ALERT",
    read: false,
  });
}

export async function notifyAdmins(payload) {
  try {
    const admins = await User.find({ role: "MAIN_AUTHORITY" });
    const notifications = [];
    for (const admin of admins) {
      const n = await notify({ ...payload, userId: admin._id });
      if (n) notifications.push(n);
    }
    return notifications;
  } catch (err) {
    console.error("[Notification] notifyAdmins error:", err);
    return [];
  }
}

export async function listNotifications(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 }).limit(40);
}

export async function markNotificationRead(id, userId) {
  return Notification.updateOne({ _id: id, userId }, { $set: { read: true } });
}

export async function markAllNotificationsRead(userId) {
  return Notification.updateMany({ userId }, { $set: { read: true } });
}
