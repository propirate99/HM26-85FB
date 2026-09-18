import {
  loginWithGoogle,
  loginDemo,
  setSession,
  clearSession,
  publicUser,
} from "../services/auth.service.js";

export async function googleAuth(req, res, next) {
  try {
    const user = await loginWithGoogle(req.body?.credential);
    setSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function demoAuth(req, res, next) {
  try {
    const user = await loginDemo(req.body?.email);
    setSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function logout(_req, res) {
  clearSession(res);
  res.json({ ok: true });
}

export async function getProfile(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function patchProfile(req, res, next) {
  try {
    const { name, phone, address } = req.body;
    if (name != null) req.user.name = name;
    if (phone != null) req.user.phone = phone;
    if (address != null) req.user.address = address;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (err) {
    next(err);
  }
}
