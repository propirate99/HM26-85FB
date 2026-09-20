import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: {
      type: String,
      enum: [
        "STATUS_CHANGED",
        "SCORE_OVERRIDDEN",
        "ASSIGNMENT_UPDATED",
        "MEDIA_MASK_TOGGLED",
        "DISPATCH_TRIGGERED",
        "SIMULATION_EXECUTED",
      ],
      required: true,
    },
    diff: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ before: {}, after: {} }),
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
