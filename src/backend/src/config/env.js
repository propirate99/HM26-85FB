import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function clean(val) {
  if (!val) return "";
  return String(val).trim().replace(/^<|>$/g, "").trim();
}

function parseCloudinaryUrl(urlStr) {
  const cleaned = clean(urlStr);
  if (!cleaned) return { cloudName: "", apiKey: "", apiSecret: "", url: "" };
  // Format: cloudinary://apiKey:apiSecret@cloudName
  const match = cleaned.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    return {
      apiKey: clean(match[1]),
      apiSecret: clean(match[2]),
      cloudName: clean(match[3]),
      url: `cloudinary://${clean(match[1])}:${clean(match[2])}@${clean(match[3])}`,
    };
  }
  return {
    cloudName: clean(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: clean(process.env.CLOUDINARY_API_KEY),
    apiSecret: clean(process.env.CLOUDINARY_API_SECRET),
    url: cleaned,
  };
}

const cld = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

const resolvedApiKey = clean(process.env.GEMINI_API_KEY) || clean(process.env.AI_API_KEY) || "";
const resolvedProvider = process.env.AI_PROVIDER || (resolvedApiKey ? "gemini" : "mock");

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5050),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongodbUri: clean(process.env.MONGODB_URI) || "mongodb://127.0.0.1:27017/civicverify",
  jwtSecret: clean(process.env.JWT_SECRET) || "dev-only-jwt",
  cookieSecret: clean(process.env.COOKIE_SECRET) || "dev-only-cookie",
  googleClientId: clean(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: clean(process.env.GOOGLE_CLIENT_SECRET),
  demoAuth: process.env.DEMO_AUTH === "true",
  storageProvider: process.env.STORAGE_PROVIDER || (cld.cloudName ? "cloudinary" : "local"),
  cloudinaryUrl: cld.url,
  cloudinary: {
    cloudName: cld.cloudName,
    apiKey: cld.apiKey,
    apiSecret: cld.apiSecret,
  },
  resendApiKey: clean(process.env.RESEND_API_KEY),
  googleMapsApiKey: clean(process.env.GOOGLE_MAPS_API_KEY),
  aiProvider: resolvedProvider,
  aiApiKey: resolvedApiKey,
  aiApiKeyBackup: clean(process.env.AI_API_KEY_BACKUP),
  geminiModel: clean(process.env.GEMINI_MODEL) || "gemini-3.6-flash",
  standaloneDemo: process.env.STANDALONE_DEMO || "auto",
  maxUploadMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 10),
  rateLimitReportsPerHour: Number(process.env.RATE_LIMIT_REPORTS_PER_HOUR || 60),
  sla: {
    CRITICAL: Number(process.env.DEFAULT_SLA_CRITICAL_HOURS || 12),
    HIGH: Number(process.env.DEFAULT_SLA_HIGH_HOURS || 24),
    MEDIUM: Number(process.env.DEFAULT_SLA_MEDIUM_HOURS || 48),
    LOW: Number(process.env.DEFAULT_SLA_LOW_HOURS || 72),
  },
  gpsAccuracyLimitMeters: Number(process.env.GPS_ACCURACY_LIMIT_METERS || 100),
};

export function updateAiConfig({ apiKey, provider, model }) {
  if (apiKey !== undefined) env.aiApiKey = clean(apiKey);
  if (provider !== undefined) env.aiProvider = provider;
  if (model !== undefined) env.geminiModel = clean(model);
  return {
    provider: env.aiProvider,
    model: env.geminiModel,
    hasKey: Boolean(env.aiApiKey),
  };
}
