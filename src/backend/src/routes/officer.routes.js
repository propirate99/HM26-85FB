import { Router } from "express";
import * as c from "../controllers/officer.controller.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { upload } from "../middleware/upload.js";

export const officerRoutes = Router();
officerRoutes.use(auth, requireRole("ZONE_OFFICER", "MAIN_AUTHORITY"));
officerRoutes.get("/queue", c.queue);
officerRoutes.get("/issues/:issueId", c.getOfficerIssue);
officerRoutes.post("/issues/:issueId/accept", c.accept);
officerRoutes.post("/issues/:issueId/status", c.status);
officerRoutes.post("/issues/:issueId/note", c.note);
officerRoutes.post(
  "/issues/:issueId/resolution-evidence",
  upload.single("file"),
  c.resolutionEvidence
);
officerRoutes.post("/issues/:issueId/resolve", c.resolve);
