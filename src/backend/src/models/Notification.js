import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: "CivicIssue" },
    issuePublicId: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [76.65, 12.31] },
    },
    locationLabel: { type: String, default: "" },
    category: { type: String, default: "" },
    type: { type: String, default: "ALERT" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
