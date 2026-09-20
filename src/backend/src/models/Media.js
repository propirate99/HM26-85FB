import mongoose from "mongoose";

const mediaMetadataSchema = new mongoose.Schema(
  {
    captureTimestamp: { type: Date, default: Date.now },
    exifGps: { type: [Number], default: [] },
    deviceType: { type: String, default: "mobile-pwa" },
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true },
    stage: {
      type: String,
      enum: ["BEFORE_INCIDENT", "AFTER_RESOLUTION", "SIMULATION_ASSET"],
      default: "BEFORE_INCIDENT",
    },
    fileUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: "" },
    metadata: {
      type: mediaMetadataSchema,
      default: () => ({}),
    },
    isPublicMasked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Media = mongoose.model("Media", mediaSchema);
