import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/civicverify",
  jwtSecret: process.env.JWT_SECRET || "dev-only-jwt",
  cookieSecret: process.env.COOKIE_SECRET || "dev-only-cookie",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  demoAuth: process.env.DEMO_AUTH === "true",
  storageProvider: process.env.STORAGE_PROVIDER || "local",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  aiProvider: process.env.AI_PROVIDER || "mock",
  aiApiKey: process.env.AI_API_KEY || "",
  aiApiKeyBackup: process.env.AI_API_KEY_BACKUP || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  standaloneDemo: process.env.STANDALONE_DEMO || "auto",
  maxUploadMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 8),
  rateLimitReportsPerHour: Number(process.env.RATE_LIMIT_REPORTS_PER_HOUR || 5),
  sla: {
    CRITICAL: Number(process.env.DEFAULT_SLA_CRITICAL_HOURS || 12),
    HIGH: Number(process.env.DEFAULT_SLA_HIGH_HOURS || 24),
    MEDIUM: Number(process.env.DEFAULT_SLA_MEDIUM_HOURS || 48),
    LOW: Number(process.env.DEFAULT_SLA_LOW_HOURS || 72),
  },
  gpsAccuracyLimitMeters: Number(process.env.GPS_ACCURACY_LIMIT_METERS || 80),
};
