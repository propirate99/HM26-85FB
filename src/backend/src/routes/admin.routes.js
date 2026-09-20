import { Router } from "express";
import * as c from "../controllers/admin.controller.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const adminRoutes = Router();
adminRoutes.use(auth, requireRole("MAIN_AUTHORITY", "admin"));

// Analytics & Legacy Core
adminRoutes.get("/analytics", c.analytics);
adminRoutes.get("/issues", c.adminIssues);
adminRoutes.get("/escalated", c.escalated);
adminRoutes.get("/officers", c.officers);
adminRoutes.post("/officers", c.createOfficer);
adminRoutes.patch("/officers/:userId", c.patchOfficer);
adminRoutes.post("/zones", c.createZone);
adminRoutes.patch("/zones/:zoneId", c.patchZone);
adminRoutes.patch("/config/slas", c.patchSlas);
adminRoutes.get("/audit", c.audit);
adminRoutes.post("/reviews/:reportId/decision", c.reviewDecision);
adminRoutes.get("/ai/status", c.getAiStatus);
adminRoutes.post("/ai/config", c.updateAiConfiguration);

// Enterprise RBAC Admin Portal Endpoints
adminRoutes.get("/triage", c.getTriage);
adminRoutes.patch("/triage/:id", c.patchTriage);
adminRoutes.get("/logistics", c.getLogistics);
adminRoutes.post("/logistics/dispatch", c.dispatchLogistics);
adminRoutes.get("/simulators", c.getSimulators);
adminRoutes.post("/simulators/run", c.runSimulator);
adminRoutes.get("/audit-trail", c.getAuditLogs);
adminRoutes.get("/audit-logs", c.getAuditLogs);
adminRoutes.get("/media", c.getAdminMedia);
adminRoutes.patch("/media/:id/mask", c.toggleMediaMask);

