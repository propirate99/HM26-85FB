import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    actionUrl: { type: String, default: "" },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: "CivicIssue" },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    issuePublicId: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [76.65, 12.31] },
    },
    locationLabel: { type: String, default: "" },
    category: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "STATUS_UPDATE",
        "TASK_DISPATCH",
        "CRITICAL_ALERT",
        "ADMIN_NEW_COMPLAINT",
        "COMPLAINT_REGISTERED",
        "EVIDENCE_ATTACHED",
        "ALERT",
      ],
      default: "STATUS_UPDATE",
    },
    read: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
