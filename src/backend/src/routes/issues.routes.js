import { Router } from "express";
import * as c from "../controllers/report.controller.js";
import { auth } from "../middleware/auth.js";

export const issueRoutes = Router();
issueRoutes.use(auth);
issueRoutes.get("/nearby", c.nearby);
issueRoutes.get("/", c.listIssues);
issueRoutes.get("/:issueId", c.getIssue);
issueRoutes.post("/:issueId/support", c.supportOn);
issueRoutes.delete("/:issueId/support", c.supportOff);
