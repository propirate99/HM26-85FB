import { Router } from "express";
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
} from "../controllers/complaints.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { singleImageUpload } from "../middleware/upload.js";

export const complaintsRoutes = Router();

// Create complaint with optional auth (citizen, guest or demo) + image upload
complaintsRoutes.post("/", optionalAuth, singleImageUpload, createComplaint);

// List complaints (filtered, paginated, citizen-scoped if citizen)
complaintsRoutes.get("/", optionalAuth, getComplaints);

// Get single complaint details
complaintsRoutes.get("/:id", optionalAuth, getComplaintById);

// Update complaint status (e.g. RESOLVED) with real email notification
complaintsRoutes.patch("/:id/status", optionalAuth, updateComplaintStatus);
