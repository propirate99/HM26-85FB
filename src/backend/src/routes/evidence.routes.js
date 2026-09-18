import { Router } from "express";
import * as c from "../controllers/report.controller.js";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { assertEvidenceMeta } from "../validators/evidence.validator.js";

export const evidenceRoutes = Router();
evidenceRoutes.use(auth);
evidenceRoutes.post(
  "/:reportId/evidence",
  upload.single("file"),
  validate(assertEvidenceMeta),
  c.uploadEvidence
);
