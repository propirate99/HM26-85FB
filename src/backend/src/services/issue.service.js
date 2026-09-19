import mongoose from "mongoose";
import { CivicIssue } from "../models/CivicIssue.js";
import { Report } from "../models/Report.js";
import { User } from "../models/User.js";
import { Evidence } from "../models/Evidence.js";
import { recordEvent } from "./audit.service.js";
import { assignOfficer } from "./routing.service.js";
import { applySla } from "./sla.service.js";
import { notify, notifyAdmins } from "./notification.service.js";
import { nextId } from "./priority.service.js";
import { mapsProvider } from "../integrations/maps.provider.js";
import { createAIProvider } from "../integrations/ai.provider.js";
import { env } from "../config/env.js";

const ai = createAIProvider(env);

const ALLOWED = {
  ZONE_OFFICER: {
    VERIFIED: ["ASSIGNED", "ACKNOWLEDGED"],
    ASSIGNED: ["ACKNOWLEDGED"],
    ACKNOWLEDGED: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLUTION_REVIEW"],
    RESOLUTION_REVIEW: ["IN_PROGRESS"],
    ESCALATED: ["ACKNOWLEDGED", "IN_PROGRESS"],
    NEEDS_REVIEW: ["ACKNOWLEDGED", "IN_PROGRESS"],
  },
  MAIN_AUTHORITY: {
    "*": [
      "ASSIGNED",
      "ACKNOWLEDGED",
      "IN_PROGRESS",
      "RESOLUTION_REVIEW",
      "RESOLVED",
      "REJECTED",
      "NEEDS_REVIEW",
      "ESCALATED",
    ],
  },
};

export function canTransition(role, from, to) {
  if (role === "MAIN_AUTHORITY") return true;
  return Boolean(ALLOWED.ZONE_OFFICER[from]?.includes(to));
}

export async function createIssueFromReport(report, { actor }) {
  const category = await report.populate("citizenSelectedCategoryId");
  const cat = report.citizenSelectedCategoryId;
  const coords = report.capturedLocation?.coordinates || [76.6394, 12.2958];
  const classified = await ai.classifyComplaint({
    text: report.description,
    categoryCode: cat.code,
  });
  const title =
    classified.summary ||
    report.description?.slice(0, 80) ||
    `${cat.name} report`;

  const priority = report.aiTriage?.severity === "CRITICAL" ? "CRITICAL" : cat.defaultPriority;

  const issue = await CivicIssue.create({
    publicId: await nextId(CivicIssue, "publicId", "CV"),
    categoryId: cat._id,
    title,
    normalizedTitle: title.toLowerCase(),
    description: report.description,
    location: { type: "Point", coordinates: coords },
    approximateLocationLabel: mapsProvider.approximateLabel(coords[0], coords[1]),
    zoneId: report.gpsDerivedZoneId || report.citizenSelectedZoneId,
    priority,
    status: "VERIFYING",
    verificationStatus: report.verification?.overallStatus || "PENDING",
    verificationScore: report.verification?.score || 0,
    aiTriage: report.aiTriage || undefined,
    supporters: report.citizenId ? [report.citizenId] : [],
    supportCount: report.citizenId ? 1 : 0,
  });

  await applySla(issue);
  const officer = issue.zoneId ? await assignOfficer(issue.zoneId) : null;
  if (officer) issue.assignedOfficerId = officer._id;

  if (report.verification?.requiresManualReview || report.aiTriage?.isFake) {
    issue.status = "NEEDS_REVIEW";
  } else if ((report.verification?.score || 0) >= 60) {
    issue.status = officer ? "ASSIGNED" : "VERIFIED";
  } else {
    issue.status = "NEEDS_REVIEW";
  }
  await issue.save();

  report.issueId = issue._id;
  report.duplicateDecision = "NEW_ISSUE";
  report.reportStatus = report.verification?.requiresManualReview ? "PENDING_REVIEW" : "ATTACHED";
  await report.save();

  await recordEvent({
    issueId: issue._id,
    actorId: actor._id,
    actorRole: actor.role,
    eventType: "ISSUE_CREATED",
    toStatus: issue.status,
    message: "Civic issue opened from citizen report",
    metadata: { reportId: report.reportId },
  });

  await issue.populate("categoryId");
  await issue.populate("zoneId");

  // Fetch latest evidence photo & location for rich dispatch notifications
  let photoUrl = "";
  try {
    const latestEvidence = await Evidence.findOne({ reportId: report._id }).sort({ createdAt: -1 });
    if (latestEvidence) {
      photoUrl = latestEvidence.publicUrl || "";
      if (latestEvidence._id) {
        await Evidence.updateOne({ _id: latestEvidence._id }, { $set: { issueId: issue._id } });
      }
    }
  } catch (_e) {}

  const wardName = issue.zoneId?.displayName || issue.zoneId?.name || "Mysuru Urban";
  const locLabel = `${wardName} · ${coords[1]?.toFixed(4)}°N, ${coords[0]?.toFixed(4)}°E`;

  // 1. Notify Assigned Zone Officer
  if (officer) {
    await notify({
      userId: officer._id,
      title: `📋 Complaint Assigned: ${issue.publicId}`,
      body: `${issue.title} in ${locLabel}. Target SLA: ${issue.deadline ? new Date(issue.deadline).toLocaleDateString() : "Active"}.`,
      issueId: issue._id,
      issuePublicId: issue.publicId,
      photoUrl,
      location: issue.location,
      locationLabel: locLabel,
      category: cat.name,
      type: "OFFICER_ASSIGNED",
    });
  }

  // 2. Notify Admin (MAIN_AUTHORITY) with Captured Photo and Audited Location
  await notifyAdmins({
    title: `🚨 New Civic Complaint: ${issue.publicId}`,
    body: `Citizen logged "${issue.title}" at ${locLabel}. Photo evidence & GPS coordinates received. AI Verification: ${issue.verificationScore}/100.`,
    issueId: issue._id,
    issuePublicId: issue.publicId,
    photoUrl,
    location: issue.location,
    locationLabel: locLabel,
    category: cat.name,
    type: "ADMIN_NEW_COMPLAINT",
  });

  // 3. Notify Citizen (User)
  if (report.citizenId) {
    await notify({
      userId: report.citizenId,
      title: `✅ Complaint Registered: ${issue.publicId}`,
      body: `Your complaint "${issue.title}" has been registered at ${locLabel} and sent to MCC. Evidence photo and GPS verification recorded.`,
      issueId: issue._id,
      issuePublicId: issue.publicId,
      photoUrl,
      location: issue.location,
      locationLabel: locLabel,
      category: cat.name,
      type: "COMPLAINT_REGISTERED",
    });
  }

  return issue;
}

export async function attachReportToIssue(report, issue, { actor }) {
  report.issueId = issue._id;
  report.duplicateDecision = "ATTACHED";
  report.reportStatus = "ATTACHED";
  await report.save();

  issue.reportCount = (issue.reportCount || 0) + 1;
  if (!Array.isArray(issue.supporters)) {
    issue.supporters = [];
  }
  if (!issue.supporters.some((id) => String(id) === String(report.citizenId))) {
    issue.supporters.push(report.citizenId);
    issue.supportCount = (issue.supportCount || 0) + 1;
  }
  await issue.save();
  await recordEvent({
    issueId: issue._id,
    actorId: actor._id,
    actorRole: actor.role,
    eventType: "REPORT_ATTACHED",
    message: `Report ${report.reportId} attached — additional citizen evidence linked`,
  });

  let photoUrl = "";
  try {
    const latestEvidence = await Evidence.findOne({ reportId: report._id }).sort({ createdAt: -1 });
    if (latestEvidence) {
      photoUrl = latestEvidence.publicUrl || "";
      if (latestEvidence._id) {
        await Evidence.updateOne({ _id: latestEvidence._id }, { $set: { issueId: issue._id } });
      }
    }
  } catch (_e) {}

  const locCoords = issue.location?.coordinates || [];
  const locLabel = locCoords.length >= 2 ? `${locCoords[1]?.toFixed(4)}°N, ${locCoords[0]?.toFixed(4)}°E` : "Mysuru";

  // Notify Citizen
  if (report.citizenId) {
    await notify({
      userId: report.citizenId,
      title: `📎 Evidence Attached to ${issue.publicId}`,
      body: `Your captured photo and location were successfully attached to existing work order ${issue.publicId}. Community support increased!`,
      issueId: issue._id,
      issuePublicId: issue.publicId,
      photoUrl,
      location: issue.location,
      locationLabel: locLabel,
      type: "EVIDENCE_ATTACHED",
    });
  }

  // Notify Admin
  await notifyAdmins({
    title: `📸 Additional Evidence on ${issue.publicId}`,
    body: `Citizen attached new evidence photo and location data for work order ${issue.publicId} (${issue.title}). Priority escalated.`,
    issueId: issue._id,
    issuePublicId: issue.publicId,
    photoUrl,
    location: issue.location,
    locationLabel: locLabel,
    type: "ADMIN_EVIDENCE_ATTACHED",
  });

  return issue;
}

export async function assertOfficerZone(user, issue) {
  if (user.role === "MAIN_AUTHORITY") return;
  if (user.role !== "ZONE_OFFICER") {
    const err = new Error("Officer role required");
    err.status = 403;
    throw err;
  }
  if (!user.assignedZoneId || String(user.assignedZoneId) !== String(issue.zoneId)) {
    const err = new Error("This issue is outside your assigned zone");
    err.status = 403;
    throw err;
  }
}

export async function changeStatus(issue, { user, status, message }) {
  await assertOfficerZone(user, issue);
  if (!canTransition(user.role, issue.status, status)) {
    const err = new Error(`Cannot move from ${issue.status} to ${status}`);
    err.status = 400;
    throw err;
  }
  const from = issue.status;
  issue.status = status;
  if (status === "RESOLVED") issue.resolvedAt = new Date();
  await issue.save();
  await recordEvent({
    issueId: issue._id,
    actorId: user._id,
    actorRole: user.role,
    eventType: "STATUS",
    fromStatus: from,
    toStatus: status,
    message,
  });

  // Notify citizen supporters
  const supporters = Array.isArray(issue.supporters) ? issue.supporters : [];
  for (const sId of supporters) {
    await notify({
      userId: sId,
      title: `Complaint ${issue.publicId}: ${status}`,
      body: `MCC status changed from ${from} to ${status}${message ? ` — ${message}` : ""}.`,
      issueId: issue._id,
      issuePublicId: issue.publicId,
      type: "STATUS_UPDATE",
    });
  }

  return issue;
}

export function sanitizeIssue(issue, { publicView = false } = {}) {
  const base = {
    id: issue._id,
    publicId: issue.publicId,
    title: issue.title,
    description: issue.description,
    category: issue.categoryId,
    zone: issue.zoneId
      ? {
          id: issue.zoneId._id || issue.zoneId,
          code: issue.zoneId.code,
          displayName: issue.zoneId.displayName,
          isDemoData: issue.zoneId.isDemoData,
        }
      : null,
    status: issue.status,
    priority: issue.priority,
    verificationStatus: issue.verificationStatus,
    verificationScore: issue.verificationScore,
    reportCount: issue.reportCount,
    supportCount: issue.supportCount || 0,
    deadline: issue.deadline,
    escalated: issue.escalated,
    approximateLocationLabel: issue.approximateLocationLabel,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    resolvedAt: issue.resolvedAt,
    aiTriage: issue.aiTriage || null,
  };
  if (publicView) return base;
  return {
    ...base,
    location: issue.location,
    assignedOfficerId: issue.assignedOfficerId,
  };
}

export async function setSupport(issue, user, on) {
  if (!Array.isArray(issue.supporters)) {
    issue.supporters = [];
  }
  const has = issue.supporters.some((id) => String(id) === String(user?._id));
  if (on && !has) {
    issue.supporters.push(user._id);
    issue.supportCount = (issue.supportCount || 0) + 1;
  }
  if (!on && has) {
    issue.supporters = issue.supporters.filter((id) => String(id) !== String(user._id));
    issue.supportCount = Math.max(0, (issue.supportCount || 1) - 1);
  }
  await issue.save();
  return issue;
}

export async function findIssueByParam(param) {
  if (!param) return null;
  const or = [{ publicId: String(param) }];
  if (mongoose.isValidObjectId(param)) {
    or.push({ _id: param });
  }
  return CivicIssue.findOne({ $or: or })
    .populate("categoryId")
    .populate("zoneId")
    .populate("assignedOfficerId", "name email role");
}

export { User };
