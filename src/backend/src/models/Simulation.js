import mongoose from "mongoose";

const simulationParametersSchema = new mongoose.Schema(
  {
    intensityFactor: { type: Number, default: 1 },
    affectedZones: { type: [String], default: [] },
    durationHours: { type: Number, default: 4 },
  },
  { _id: false }
);

const projectedImpactSchema = new mongoose.Schema(
  {
    incidentVolumeEstimate: { type: Number, default: 0 },
    crewShortageEstimate: { type: Number, default: 0 },
  },
  { _id: false }
);

const simulationSchema = new mongoose.Schema(
  {
    scenarioName: { type: String, required: true },
    category: {
      type: String,
      enum: ["FLOOD_PREDICTION", "TRAFFIC_SPIKE", "RESOURCE_DEFICIT"],
      default: "FLOOD_PREDICTION",
    },
    parameters: {
      type: simulationParametersSchema,
      default: () => ({}),
    },
    projectedImpact: {
      type: projectedImpactSchema,
      default: () => ({}),
    },
    executedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Simulation = mongoose.model("Simulation", simulationSchema);
