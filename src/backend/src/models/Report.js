import mongoose from "mongoose";

const aiTriageSchema = new mongoose.Schema(
  {
    analyzed: { type: Boolean, default: false },
    provider: { type: String, default: "mock" },
    model: { type: String, default: "" },
    isFake: { type: Boolean, default: false },
    fakeReason: { type: String, default: "" },
    suggestedCategory: { type: String, default: "" },
    categoryAgrees: { type: Boolean, default: true },
    confidence: { type: Number, default: 0 },
    extractedTags: { type: [String], default: [] },
    severity: { type: String, default: "MEDIUM" },
    duplicateScore: { type: Number, default: 0 },
    duplicateDecision: { type: String, default: "CREATE" },
    duplicateCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: "CivicIssue", default: null },
    duplicateCandidatePublicId: { type: String, default: "" },
    summary: { type: String, default: "" },
    reasoning: { type: String, default: "" },
    photoAssessment: { type: mongoose.Schema.Types.Mixed, default: {} },
    locationAssessment: { type: mongoose.Schema.Types.Mixed, default: {} },
    analyzedAt: { type: Date, default: null },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
);

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
    aiTriage: { type: aiTriageSchema, default: undefined },
  },
  { timestamps: true }
);

reportSchema.index(
  { citizenId: 1, issueId: 1 },
  { unique: true, partialFilterExpression: { issueId: { $type: "objectId" } } }
);
reportSchema.index({ "capturedLocation.coordinates": "2dsphere" });

export const Report = mongoose.model("Report", reportSchema);
