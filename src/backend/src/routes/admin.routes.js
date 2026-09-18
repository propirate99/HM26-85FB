import { Router } from "express";
import * as c from "../controllers/admin.controller.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

export const adminRoutes = Router();
adminRoutes.use(auth, requireRole("MAIN_AUTHORITY"));
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
