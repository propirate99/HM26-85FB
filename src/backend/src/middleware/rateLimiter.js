import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.rateLimitReportsPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Report rate limit reached. Try again later." },
  keyGenerator: (req) => String(req.user?._id || req.ip),
});
