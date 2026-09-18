import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    imageRelevance: {
      status: String,
      confidence: Number,
    },
    syntheticRisk: {
      status: String,
      confidence: Number,
    },
    captureProvenance: String,
    locationConsistency: String,
    timestampPresent: Boolean,
    duplicateEvidence: String,
    zoneConsistency: String,
    overallStatus: String,
    score: Number,
    requiresManualReview: Boolean,
    flags: [String],
    provider: String,
    analyzedAt: Date,
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: "CivicIssue", default: null },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    citizenSelectedCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IssueCategory",
      required: true,
    },
    citizenSelectedZoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", default: null },
    description: { type: String, default: "" },
    capturedLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
      accuracyMeters: Number,
    },
    gpsDerivedZoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", default: null },
    zoneMatchStatus: {
      type: String,
      enum: ["MATCH", "MISMATCH", "UNAVAILABLE"],
      default: "UNAVAILABLE",
    },
    submittedAt: { type: Date, default: Date.now },
    reportStatus: {
      type: String,
      enum: ["ATTACHED", "PENDING_REVIEW", "REJECTED", "OPEN"],
      default: "OPEN",
    },
    duplicateDecision: {
      type: String,
      enum: ["NEW_ISSUE", "ATTACHED", "PENDING"],
      default: "PENDING",
    },
    verification: { type: verificationSchema, default: undefined },
  },
  { timestamps: true }
);

reportSchema.index(
  { citizenId: 1, issueId: 1 },
  { unique: true, partialFilterExpression: { issueId: { $type: "objectId" } } }
);
reportSchema.index({ "capturedLocation.coordinates": "2dsphere" });

export const Report = mongoose.model("Report", reportSchema);
