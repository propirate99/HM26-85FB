import { Router } from "express";
import * as c from "../controllers/issue.controller.js";

export const publicRoutes = Router();
publicRoutes.get("/issues", c.publicIssues);
publicRoutes.get("/issues/:publicId", c.publicIssue);
