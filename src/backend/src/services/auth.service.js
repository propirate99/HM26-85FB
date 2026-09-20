import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { verifyGoogleCredential } from "../integrations/google.service.js";
import { demoAccounts } from "../seed/demoUsers.js";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.nodeEnv === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export function createToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function setSession(res, user) {
  const token = createToken(user);
  res.cookie("cv_session", token, cookieOpts);
  return token;
}

export function clearSession(res) {
  res.clearCookie("cv_session", { path: "/" });
}

export function publicUser(user) {
  const normRole = String(user.role || "").toLowerCase();
  const isAdmin = normRole === "main_authority" || normRole === "admin";
  const defaultZone = isAdmin ? "All Zones (HQ)" : user.assignedZoneId ? "Assigned Zone" : "Mysuru Urban";

  return {
    id: user._id,
    email: user.email,
    name: user.name || (isAdmin ? "MCC Commissioner" : user.email?.split("@")[0] || "User"),
    avatarUrl: user.avatarUrl || "",
    avatar: user.avatarUrl || "",
    role: user.role,
    phone: user.phone || "",
    address: user.address || "",
    assignedZoneId: user.assignedZoneId || null,
    jurisdiction: user.jurisdiction || {
      zone: defaultZone,
      department: isAdmin ? "City Administration" : "Civic Operations",
    },
    reputationScore: user.reputationScore != null ? user.reputationScore : 100,
  };
}

export async function registerUser({ email, password, name, phone, address, role }) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }
  const existing = await User.findOne({ email: normEmail });
  if (existing) {
    const err = new Error("An account with this email already exists");
    err.status = 409;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const r = String(role || "").toLowerCase();
  const assignedRole = r === "admin" || r === "main_authority"
    ? "MAIN_AUTHORITY"
    : r === "officer" || r === "zone_officer"
    ? "ZONE_OFFICER"
    : "CITIZEN";

  const user = await User.create({
    email: normEmail,
    passwordHash,
    name: name || normEmail.split("@")[0],
    phone: phone || "",
    address: address || "",
    role: assignedRole,
    isActive: true,
  });

  return user;
}

export async function loginWithPassword(email, password) {
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail || !password) {
    const err = new Error("Email and password are required");
    err.status = 400;
    throw err;
  }
  let user = await User.findOne({ email: normEmail, isActive: true });
  if (!user) {
    const known = demoAccounts.find((a) => a.email.toLowerCase() === normEmail);
    if (known) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = await User.create({
        email: normEmail,
        passwordHash,
        name: known.name,
        role: known.role,
        address: known.address || "Mysuru",
        isActive: true,
        isDemoData: true,
      });
      return user;
    }
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  if (user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const err = new Error("Invalid email or password");
      err.status = 401;
      throw err;
    }
  } else {
    // If user had no password yet, set it securely
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    await user.save();
  }

  // Ensure role is up to date if it's a known demo officer or authority
  const known = demoAccounts.find((a) => a.email.toLowerCase() === normEmail);
  if (known && user.role !== known.role) {
    user.role = known.role;
    await user.save();
  }

  return user;
}

export async function loginWithGoogle(credential) {
  const identity = await verifyGoogleCredential(credential);
  let user = await User.findOne({ googleSubjectId: identity.googleSubjectId });
  if (!user) {
    user = await User.findOne({ email: identity.email });
  }
  if (!user) {
    user = await User.create({
      ...identity,
      role: "CITIZEN",
    });
  } else {
    user.googleSubjectId = identity.googleSubjectId;
    user.avatarUrl = user.avatarUrl || identity.avatarUrl;
    user.name = user.name || identity.name;
    await user.save();
  }
  return user;
}

export async function loginDemo(email, extraData = {}) {
  if (!env.demoAuth) {
    const err = new Error("Demo login is disabled");
    err.status = 403;
    throw err;
  }
  const normEmail = String(email || "").trim().toLowerCase();
  if (!normEmail) {
    const err = new Error("Email is required for demo login");
    err.status = 400;
    throw err;
  }
  const known = demoAccounts.find((a) => a.email.toLowerCase() === normEmail);
  let user = await User.findOne({ email: normEmail, isActive: true });
  if (!user) {
    const r = String(extraData.role || "").toLowerCase();
    const assignedRole =
      known?.role ||
      (normEmail.includes("commissioner") || normEmail.includes("admin") || r === "admin" || r === "main_authority"
        ? "MAIN_AUTHORITY"
        : normEmail.includes("officer") || normEmail.includes("swm") || r === "officer" || r === "zone_officer"
        ? "ZONE_OFFICER"
        : "CITIZEN");

    user = await User.create({
      email: normEmail,
      name: known?.name || extraData.name || normEmail.split("@")[0],
      role: assignedRole,
      address: known?.address || extraData.address || "Jayalakshmipuram, Ward 42, Mysuru",
      isActive: true,
      isDemoData: true,
    });
  } else if (known && user.role !== known.role) {
    user.role = known.role;
    if (known.name && !user.name) user.name = known.name;
    await user.save();
  } else if ((normEmail.includes("officer") || normEmail.includes("swm")) && user.role === "CITIZEN") {
    user.role = "ZONE_OFFICER";
    await user.save();
  }
  return user;
}
