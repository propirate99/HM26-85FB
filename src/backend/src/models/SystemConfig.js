import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const SystemConfig = mongoose.model("SystemConfig", configSchema);
