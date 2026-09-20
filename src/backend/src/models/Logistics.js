import mongoose from "mongoose";

const materialAllocationSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: "units" },
  },
  { _id: false }
);

const assignedUnitSchema = new mongoose.Schema(
  {
    teamLeadId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    vehicleId: { type: String, default: "" },
    crewCount: { type: Number, default: 2 },
  },
  { _id: false }
);

const logisticsSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true },
    assignedUnit: {
      type: assignedUnitSchema,
      default: () => ({}),
    },
    dispatchStatus: {
      type: String,
      enum: ["IDLE", "EN_ROUTE", "ON_SITE", "COMPLETED"],
      default: "IDLE",
    },
    materialAllocations: {
      type: [materialAllocationSchema],
      default: [],
    },
    eta: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Logistics = mongoose.model("Logistics", logisticsSchema);
