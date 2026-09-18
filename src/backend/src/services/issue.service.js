import { CivicIssue } from "../models/CivicIssue.js";
import { Report } from "../models/Report.js";
import { User } from "../models/User.js";
import { recordEvent } from "./audit.service.js";
import { assignOfficer } from "./routing.service.js";
import { applySla } from "./sla.service.js";
import { notify } from "./notification.service.js";
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

  const issue = await CivicIssue.create({
    publicId: await nextId(CivicIssue, "publicId", "CV"),
    categoryId: cat._id,
    title,
    normalizedTitle: title.toLowerCase(),
    description: report.description,
    location: { type: "Point", coordinates: coords },
    approximateLocationLabel: mapsProvider.approximateLabel(coords[0], coords[1]),
    zoneId: report.gpsDerivedZoneId || report.citizenSelectedZoneId,
    priority: cat.defaultPriority,
    status: "VERIFYING",
    verificationStatus: report.verification?.overallStatus || "PENDING",
    verificationScore: report.verification?.score || 0,
  });

  await applySla(issue);
  const officer = issue.zoneId ? await assignOfficer(issue.zoneId) : null;
  if (officer) issue.assignedOfficerId = officer._id;

  if (report.verification?.requiresManualReview) {
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

  if (officer) {
    await notify({
      userId: officer._id,
      title: `New issue ${issue.publicId}`,
      body: issue.title,
      issueId: issue._id,
    });
  }
  await issue.populate("categoryId");
  await issue.populate("zoneId");
  return issue;
}

export async function attachReportToIssue(report, issue, { actor }) {
  if (String(report.citizenId) && issue._id) {
    const existing = await Report.findOne({ citizenId: report.citizenId, issueId: issue._id });
    if (existing && String(existing._id) !== String(report._id)) {
      const err = new Error("You already supported this issue");
      err.status = 409;
      throw err;
    }
  }
  report.issueId = issue._id;
  report.duplicateDecision = "ATTACHED";
  report.reportStatus = "ATTACHED";
  await report.save();
  issue.reportCount += 1;
  issue.supportCount += 1;
  if (!issue.supporters.some((id) => String(id) === String(report.citizenId))) {
    issue.supporters.push(report.citizenId);
  }
  await issue.save();
  await recordEvent({
    issueId: issue._id,
    actorId: actor._id,
    actorRole: actor.role,
    eventType: "REPORT_ATTACHED",
    message: `Report ${report.reportId} attached — support increased`,
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
    supportCount: issue.supportCount,
    deadline: issue.deadline,
    escalated: issue.escalated,
    approximateLocationLabel: issue.approximateLocationLabel,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    resolvedAt: issue.resolvedAt,
  };
  if (publicView) return base;
  return {
    ...base,
    location: issue.location,
    assignedOfficerId: issue.assignedOfficerId,
  };
}

export async function setSupport(issue, user, on) {
  const has = issue.supporters.some((id) => String(id) === String(user._id));
  if (on && !has) {
    issue.supporters.push(user._id);
    issue.supportCount += 1;
  }
  if (!on && has) {
    issue.supporters = issue.supporters.filter((id) => String(id) !== String(user._id));
    issue.supportCount = Math.max(0, issue.supportCount - 1);
  }
  await issue.save();
  return issue;
}

export { User };
