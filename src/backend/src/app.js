import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/users.routes.js";
import { issueRoutes } from "./routes/issues.routes.js";
import { reportRoutes } from "./routes/reports.routes.js";
import { evidenceRoutes } from "./routes/evidence.routes.js";
import { officerRoutes } from "./routes/officer.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { publicRoutes } from "./routes/public.routes.js";
import { notifications, markRead, markAllRead } from "./controllers/report.controller.js";
import { auth } from "./middleware/auth.js";
import { uploadsDir } from "./integrations/storage.provider.js";
import { configRoutes } from "./routes/config.routes.js";
import swmRoutes from "./routes/swm.routes.js";
import { complaintsRoutes } from "./routes/complaints.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.cookieSecret));
  app.use("/uploads", express.static(uploadsDir));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "civicverify", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/config", configRoutes);
  app.get("/api/notifications", auth, notifications);
  app.patch("/api/notifications/:id/read", auth, markRead);
  app.post("/api/notifications/mark-all-read", auth, markAllRead);
  app.use("/api/reports", reportRoutes);
  app.use("/api/reports", evidenceRoutes);
  app.use("/api/issues", issueRoutes);
  app.use("/api/officer", officerRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/swm", swmRoutes);
  app.use("/api/complaints", complaintsRoutes);

  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));

  app.use("/api", notFound);
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(frontendDist, "index.html"), (err) => {
      if (err) next();
    });
  });
  app.use(errorHandler);
  return app;
}
