import { Router } from "express";
import { getProfile, patchProfile } from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { assertProfilePatch } from "../validators/user.validator.js";

export const userRoutes = Router();
userRoutes.use(auth);
userRoutes.get("/me", getProfile);
userRoutes.patch("/me", validate(assertProfilePatch), patchProfile);
