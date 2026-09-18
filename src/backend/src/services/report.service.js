import { Report } from "../models/Report.js";
import { Evidence } from "../models/Evidence.js";
import { IssueCategory } from "../models/IssueCategory.js";
import { getStorageProvider } from "../integrations/storage.provider.js";
import { zoneForPoint, zoneMatchStatus } from "./routing.service.js";
import { sha256, perceptualHash, nextId } from "./priority.service.js";
import { scoreDuplicates } from "./duplicate.service.js";
import { verifyReport } from "./verification.service.js";

const storage = getStorageProvider();

export async function createReport(user, body) {
  const category = await IssueCategory.findById(body.categoryId);
  if (!category) {
    const err = new Error("Unknown category");
    err.status = 400;
    throw err;
  }
  const lng = body.lng != null ? Number(body.lng) : null;
  const lat = body.lat != null ? Number(body.lat) : null;
  const accuracyMeters = body.accuracyMeters != null ? Number(body.accuracyMeters) : null;
  const gpsZone = lng != null ? await zoneForPoint(lng, lat) : null;
  const selectedZoneId = body.zoneId || null;
  const match = zoneMatchStatus(selectedZoneId, gpsZone);

  const report = await Report.create({
    reportId: await nextId(Report, "reportId", "R"),
    citizenId: user._id,
    citizenSelectedCategoryId: category._id,
    citizenSelectedZoneId: selectedZoneId,
    description: body.description || "",
    capturedLocation:
      lng != null && lat != null
        ? { type: "Point", coordinates: [lng, lat], accuracyMeters }
        : undefined,
    gpsDerivedZoneId: gpsZone?._id || null,
    zoneMatchStatus: match,
    submittedAt: new Date(),
    reportStatus: "OPEN",
    duplicateDecision: "PENDING",
  });
  return report;
}

export async function addEvidence(user, report, file, meta) {
  if (String(report.citizenId) !== String(user._id) && user.role === "CITIZEN") {
    const err = new Error("Not your report");
    err.status = 403;
    throw err;
  }
  if (!file) {
    const err = new Error("Image file is required");
    err.status = 400;
    throw err;
  }
  const evidenceId = await nextId(Evidence, "evidenceId", "E");
  const hash = sha256(file.buffer);
  const pHash = await perceptualHash(file.buffer);
  const stored = await storage.save({
    buffer: file.buffer,
    mimeType: file.mimetype,
    key: evidenceId,
  });
  const lng = meta.lng != null ? Number(meta.lng) : report.capturedLocation?.coordinates?.[0];
  const lat = meta.lat != null ? Number(meta.lat) : report.capturedLocation?.coordinates?.[1];

  const evidence = await Evidence.create({
    evidenceId,
    reportId: report._id,
    issueId: report.issueId,
    type: meta.type || "BEFORE",
    storageKey: stored.storageKey,
    publicUrl: stored.publicUrl,
    mimeType: file.mimetype,
    fileSize: file.size,
    sha256: hash,
    perceptualHash: pHash,
    capturedThroughApp: meta.capturedThroughApp !== "false",
    capturedAt: meta.capturedAt ? new Date(meta.capturedAt) : new Date(),
    location:
      lng != null && lat != null ? { type: "Point", coordinates: [lng, lat] } : undefined,
    locationAccuracyMeters: meta.accuracyMeters != null ? Number(meta.accuracyMeters) : undefined,
  });

  const category = await IssueCategory.findById(report.citizenSelectedCategoryId);
  const duplicateResult = await scoreDuplicates({ report, evidence, category });
  const verification = await verifyReport({ report, evidence, duplicateResult });
  report.verification = verification;
  await report.save();
  evidence.aiAssessment = {
    relevance: verification.imageRelevance,
    syntheticRisk: verification.syntheticRisk,
    provider: verification.provider,
  };
  await evidence.save();
  return { evidence, duplicateResult, verification };
}

export async function myReports(user) {
  return Report.find({ citizenId: user._id })
    .sort({ createdAt: -1 })
    .populate("citizenSelectedCategoryId")
    .populate("issueId");
}
