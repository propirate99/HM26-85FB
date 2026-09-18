import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "IssueCategory", required: true },
    title: { type: String, required: true },
    normalizedTitle: { type: String, default: "" },
    description: { type: String, default: "" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    approximateLocationLabel: { type: String, default: "" },
    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Zone" },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "VERIFYING",
        "VERIFIED",
        "ASSIGNED",
        "ACKNOWLEDGED",
        "IN_PROGRESS",
        "RESOLUTION_REVIEW",
        "RESOLVED",
        "REJECTED",
        "NEEDS_REVIEW",
        "ESCALATED",
      ],
      default: "SUBMITTED",
    },
    verificationStatus: { type: String, default: "PENDING" },
    verificationScore: { type: Number, default: 0 },
    reportCount: { type: Number, default: 1 },
    supportCount: { type: Number, default: 0 },
    assignedOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deadline: { type: Date, default: null },
    escalationAt: { type: Date, default: null },
    escalated: { type: Boolean, default: false },
    escalationReason: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
    supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

issueSchema.index({ location: "2dsphere" });
issueSchema.index({ zoneId: 1, status: 1 });
issueSchema.index({ categoryId: 1, status: 1 });
issueSchema.index({ deadline: 1, status: 1 });

export const CivicIssue = mongoose.model("CivicIssue", issueSchema);
