import mongoose from "mongoose";

const verificationMetricsSchema = new mongoose.Schema(
  {
    gpsConfidence: { type: Number, default: 0 },
    duplicateConfidence: { type: Number, default: 0 },
    aiVisualScore: { type: Number, default: 0 },
    compositeScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const complaintLocationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
    address: { type: String, default: "" },
    zone: { type: String, default: "" },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["ROADS", "WASTE", "WATER", "LIGHTING"],
      default: "WASTE",
    },
    location: {
      type: complaintLocationSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["SUBMITTED", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "SUBMITTED",
    },
    verificationMetrics: {
      type: verificationMetricsSchema,
      default: () => ({}),
    },
    assignedOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    duplicateReferenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null },
    slaDeadline: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSchema.index({ "location.coordinates": "2dsphere" });

export const Complaint = mongoose.model("Complaint", complaintSchema);
