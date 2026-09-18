import mongoose from "mongoose";

const zoneSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String, default: "" },
    geometry: {
      type: { type: String, enum: ["Polygon"], default: "Polygon" },
      coordinates: { type: [[[Number]]], required: true },
    },
    centroid: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    responsibleAuthority: { type: String, default: "DEMO_MAIN_AUTHORITY" },
    isDemoData: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date, default: null },
  },
  { timestamps: true }
);

zoneSchema.index({ geometry: "2dsphere" });
zoneSchema.index({ centroid: "2dsphere" });

export const Zone = mongoose.model("Zone", zoneSchema);
