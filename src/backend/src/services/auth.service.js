import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { verifyGoogleCredential } from "../integrations/google.service.js";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.nodeEnv === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export function setSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: "7d",
  });
  res.cookie("cv_session", token, cookieOpts);
}

export function clearSession(res) {
  res.clearCookie("cv_session", { path: "/" });
}

export function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    phone: user.phone,
    address: user.address,
    assignedZoneId: user.assignedZoneId,
  };
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

export async function loginDemo(email) {
  if (!env.demoAuth) {
    const err = new Error("Demo login is disabled");
    err.status = 403;
    throw err;
  }
  const user = await User.findOne({ email: String(email).toLowerCase(), isActive: true });
  if (!user) {
    const err = new Error("Unknown demo account");
    err.status = 401;
    throw err;
  }
  return user;
}
