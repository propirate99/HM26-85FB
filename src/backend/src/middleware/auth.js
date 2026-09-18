import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export async function auth(req, res, next) {
  try {
    const token = req.cookies?.cv_session;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid session" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies?.cv_session;
    if (token) {
      const payload = jwt.verify(token, env.jwtSecret);
      req.user = await User.findById(payload.sub);
    }
  } catch {
    req.user = null;
  }
  next();
}
