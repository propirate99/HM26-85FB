import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";

const client = new OAuth2Client(env.googleClientId);

export async function verifyGoogleCredential(credential) {
  if (!env.googleClientId) {
    const err = new Error("Google login is not configured");
    err.status = 503;
    throw err;
  }
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    const err = new Error("Google credential missing subject or email");
    err.status = 401;
    throw err;
  }
  return {
    googleSubjectId: payload.sub,
    email: payload.email,
    name: payload.name || "",
    avatarUrl: payload.picture || "",
  };
}
