import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleSubjectId: { type: String, index: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, default: "" },
    name: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    role: {
      type: String,
      enum: ["citizen", "officer", "admin", "CITIZEN", "ZONE_OFFICER", "MAIN_AUTHORITY"],
      default: "citizen",
    },
    jurisdiction: {
      zone: { type: String, default: "" },
      department: { type: String, default: "Sanitation" },
    },
    reputationScore: { type: Number, default: 100 },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    assignedZoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", default: null },
    isActive: { type: Boolean, default: true },
    isDemoData: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
