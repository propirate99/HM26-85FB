import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema(
  {
    evidenceId: { type: String, required: true, unique: true },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: "CivicIssue" },
    type: { type: String, enum: ["BEFORE", "AFTER"], default: "BEFORE" },
    storageKey: String,
    publicUrl: String,
    mimeType: String,
    fileSize: Number,
    sha256: String,
    perceptualHash: String,
    capturedThroughApp: { type: Boolean, default: false },
    capturedAt: Date,
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
    },
    locationAccuracyMeters: Number,
    metadataOverlayUrl: String,
    aiAssessment: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Evidence = mongoose.model("Evidence", evidenceSchema);
