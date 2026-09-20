import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { CivicIssue } from "../models/CivicIssue.js";
import { Complaint } from "../models/Complaint.js";
import { findIssueByParam } from "../services/issue.service.js";

function normalizeRole(role) {
  if (!role) return "";
  const r = String(role).toLowerCase();
  if (r === "main_authority" || r === "admin") return "admin";
  if (r === "zone_officer" || r === "officer") return "officer";
  if (r === "citizen") return "citizen";
  return r;
}

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.cv_session;
    if (!token && req.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7);
    }
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

// Backwards-compatible alias
export const auth = requireAuth;

export function requireRole(allowedRoles) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const normalizedAllowed = rolesArray.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions for this action" });
    }
    next();
  };
}

export async function requireZoneOfficer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const userRole = normalizeRole(req.user.role);
  if (userRole === "admin") {
    return next(); // Main authority / Admin has global override access
  }
  if (userRole !== "officer") {
    return res.status(403).json({ error: "Officer role required" });
  }

  // If request contains an issue/complaint parameter, verify zone boundary
  const targetId = req.params.issueId || req.params.complaintId || req.params.id;
  if (targetId) {
    try {
      const issue = (await findIssueByParam(targetId)) || (await Complaint.findById(targetId));
      if (issue) {
        const issueZone = String(issue.zoneId || issue.location?.zone || "");
        const userZone = String(req.user.assignedZoneId || req.user.jurisdiction?.zone || "");
        if (issueZone && userZone && issueZone !== userZone) {
          return res.status(403).json({ error: "Forbidden: complaint is outside your assigned zone jurisdiction" });
        }
      }
    } catch (err) {
      return next(err);
    }
  }

  next();
}

export async function optionalAuth(req, _res, next) {
  try {
    let token = req.cookies?.cv_session;
    if (!token && req.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7);
    }
    if (token) {
      const payload = jwt.verify(token, env.jwtSecret);
      req.user = await User.findById(payload.sub);
    }
  } catch {
    req.user = null;
  }
  next();
}
