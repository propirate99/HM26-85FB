import {
  loginWithGoogle,
  loginDemo,
  setSession,
  clearSession,
  publicUser,
} from "../services/auth.service.js";
import { Report } from "../models/Report.js";
import { Evidence } from "../models/Evidence.js";
import { CivicIssue } from "../models/CivicIssue.js";

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

export async function getMyGallery(req, res, next) {
  try {
    const reports = await Report.find({ citizenId: req.user._id });
    const reportIds = reports.map((r) => r._id);
    const reportMap = new Map();
    for (const r of reports) {
      reportMap.set(String(r._id), r);
    }

    const evidenceDocs = await Evidence.find({ reportId: { $in: reportIds } })
      .sort({ createdAt: -1 })
      .populate("issueId");

    const gallery = evidenceDocs.map((e) => {
      const parentReport = reportMap.get(String(e.reportId));
      const issue = e.issueId;
      const coords = e.location?.coordinates || issue?.location?.coordinates || parentReport?.capturedLocation?.coordinates || [];
      const locationLabel = issue?.approximateLocationLabel || (coords.length >= 2 ? `${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E` : "Mysuru");

      return {
        _id: e._id,
        evidenceId: e.evidenceId,
        publicUrl: e.publicUrl,
        type: e.type,
        capturedAt: e.capturedAt || e.createdAt,
        capturedThroughApp: e.capturedThroughApp !== false,
        coordinates: coords,
        locationLabel,
        issue: issue
          ? {
              _id: issue._id,
              publicId: issue.publicId,
              title: issue.title,
              status: issue.status,
              verificationScore: issue.verificationScore,
              verificationStatus: issue.verificationStatus,
            }
          : null,
        reportId: parentReport?.reportId || null,
        aiAssessment: e.aiAssessment,
      };
    });

    res.json({ gallery, total: gallery.length });
  } catch (err) {
    next(err);
  }
}
