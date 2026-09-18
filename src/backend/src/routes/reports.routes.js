import { Router } from "express";
import * as c from "../controllers/report.controller.js";
import { auth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { assertIssueBody } from "../validators/issue.validator.js";
import { reportLimiter } from "../middleware/rateLimiter.js";

export const reportRoutes = Router();
reportRoutes.use(auth);
reportRoutes.post("/", reportLimiter, validate(assertIssueBody), c.createReport);
reportRoutes.get("/mine", c.listMine);
reportRoutes.get("/:reportId", c.getReport);
reportRoutes.post("/:reportId/attach", c.attach);
reportRoutes.post("/:reportId/create-issue", c.createIssue);
