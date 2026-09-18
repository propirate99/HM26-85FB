import mongoose from "mongoose";
import { env } from "./env.js";
import { EmbeddedStorageEngine, patchMongooseForEmbedded } from "./embeddedStorage.js";

// Ensure all models are registered in mongoose.models
import "../models/User.js";
import "../models/Zone.js";
import "../models/IssueCategory.js";
import "../models/CivicIssue.js";
import "../models/Report.js";
import "../models/Evidence.js";
import "../models/IssueEvent.js";
import "../models/Notification.js";
import "../models/SystemConfig.js";

let activeEngine = null;

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  if (env.standaloneDemo === "true") {
    console.log("[Database] Standalone demo forced. Initializing Embedded JSON Storage Engine...");
    activeEngine = new EmbeddedStorageEngine();
    patchMongooseForEmbedded(mongoose, activeEngine);
    return { isEmbedded: true, engine: activeEngine };
  }

  try {
    console.log(`[Database] Attempting connection to MongoDB (${env.mongodbUri})...`);
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 2000,
    });
    console.log("[Database] Connected successfully to native MongoDB.");
    return mongoose.connection;
  } catch (err) {
    console.warn(`[Database] MongoDB connection failed (${err.message}).`);
    console.log("[Database] Activating Zero-Config Embedded JSON Storage Engine (with GeoJSON $nearSphere)...");
    activeEngine = new EmbeddedStorageEngine();
    patchMongooseForEmbedded(mongoose, activeEngine);
    return { isEmbedded: true, engine: activeEngine };
  }
}

export function getEmbeddedEngine() {
  return activeEngine;
}
