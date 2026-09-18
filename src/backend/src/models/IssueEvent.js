import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: "CivicIssue", required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    eventType: String,
    fromStatus: String,
    toStatus: String,
    message: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

eventSchema.index({ issueId: 1, createdAt: 1 });

export const IssueEvent = mongoose.model("IssueEvent", eventSchema);
