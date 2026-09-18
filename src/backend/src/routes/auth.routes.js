import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { auth as requireAuth } from "../middleware/auth.js";

export const authRoutes = Router();
authRoutes.post("/google", auth.googleAuth);
authRoutes.post("/demo", auth.demoAuth);
authRoutes.get("/me", requireAuth, auth.me);
authRoutes.post("/logout", auth.logout);
