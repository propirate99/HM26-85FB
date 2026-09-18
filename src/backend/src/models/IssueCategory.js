import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    duplicateRadiusMeters: { type: Number, required: true },
    defaultPriority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    keywords: [{ type: String }],
  },
  { timestamps: true }
);

export const IssueCategory = mongoose.model("IssueCategory", categorySchema);
