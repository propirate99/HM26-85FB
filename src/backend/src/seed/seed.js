import fs from "fs";
import path from "path";
import sharp from "sharp";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { Zone } from "../models/Zone.js";
import { IssueCategory } from "../models/IssueCategory.js";
import { CivicIssue } from "../models/CivicIssue.js";
import { Report } from "../models/Report.js";
import { Evidence } from "../models/Evidence.js";
import { IssueEvent } from "../models/IssueEvent.js";
import { SystemConfig } from "../models/SystemConfig.js";
import { env } from "../config/env.js";
import { demoZones } from "./demoZones.js";
import { demoAccounts } from "./demoUsers.js";
import { demoIssueBlueprints } from "./demoIssues.js";
import { mapsProvider } from "../integrations/maps.provider.js";
import { applySla } from "../services/sla.service.js";
import { recordEvent } from "../services/audit.service.js";
import { uploadsDir } from "../integrations/storage.provider.js";

const categories = [
  {
    code: "GARBAGE",
    name: "Garbage / illegal dumping",
    duplicateRadiusMeters: 100,
    defaultPriority: "HIGH",
    keywords: ["garbage", "dump", "waste", "trash", "litter"],
  },
  {
    code: "STREETLIGHT",
    name: "Streetlight",
    duplicateRadiusMeters: 50,
    defaultPriority: "MEDIUM",
    keywords: ["light", "lamp", "dark", "streetlight"],
  },
  {
    code: "POTHOLE",
    name: "Pothole",
    duplicateRadiusMeters: 75,
    defaultPriority: "HIGH",
    keywords: ["pothole", "road", "asphalt", "crater"],
  },
  {
    code: "DRAIN",
    name: "Blocked drain",
    duplicateRadiusMeters: 75,
    defaultPriority: "CRITICAL",
    keywords: ["drain", "sewage", "flood", "blocked"],
  },
];

async function createSampleImage(filename, title, colorHex, subtitle = "") {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const destPath = path.join(uploadsDir, filename);

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) || 40;
    const g = parseInt(hex.slice(3, 5), 16) || 40;
    const b = parseInt(hex.slice(5, 7), 16) || 40;
    return { r, g, b };
  };

  const bg = hexToRgb(colorHex);
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: bg,
    },
  })
    .jpeg({ quality: 90 })
    .toFile(destPath);

  return `/uploads/${filename}`;
}

async function run() {
  console.log("[Seed] Connecting to database...");
  await connectDatabase();

  console.log("[Seed] Cleaning up prior demo data...");
  await Promise.all([
    User.deleteMany({ isDemoData: true }),
    Zone.deleteMany({ isDemoData: true }),
    CivicIssue.deleteMany({ publicId: /^CV-10/ }),
    Report.deleteMany({ reportId: /^R-10/ }),
    Evidence.deleteMany({}),
  ]);
  await IssueCategory.deleteMany({});
  await Report.syncIndexes();

  console.log("[Seed] Inserting demo zones...");
  const zoneDocs = {};
  for (const z of demoZones) {
    zoneDocs[z.code] = await Zone.findOneAndUpdate({ code: z.code }, z, {
      upsert: true,
      new: true,
    });
  }

  console.log("[Seed] Inserting issue categories...");
  const catDocs = {};
  for (const c of categories) {
    catDocs[c.code] = await IssueCategory.create(c);
  }

  console.log("[Seed] Inserting demo accounts...");
  const users = {};
  for (const a of demoAccounts) {
    users[a.email] = await User.findOneAndUpdate(
      { email: a.email },
      {
        ...a,
        assignedZoneId: a.zoneCode ? zoneDocs[a.zoneCode]?._id : null,
        isDemoData: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );
  }

  await SystemConfig.findOneAndUpdate({ key: "slas" }, { value: env.sla }, { upsert: true });

  console.log("[Seed] Generating demo evidence images...");
  const images = {
    "CV-1024-BEFORE": await createSampleImage(
      "cv1024_pothole_before.jpg",
      "Sayyaji Rao Road Pothole",
      "#7f1d1d",
      "North Carriageway Hazard"
    ),
    "CV-1025-BEFORE": await createSampleImage(
      "cv1025_garbage_before.jpg",
      "Devaraja Market Waste Pile",
      "#78350f",
      "Organic Market Waste Blocking Drain"
    ),
    "CV-1026-BEFORE": await createSampleImage(
      "cv1026_light_before.jpg",
      "Kuvempunagar Streetlight Dark",
      "#1e3a8a",
      "Pole #KP-42 Out of Order"
    ),
    "CV-1026-AFTER": await createSampleImage(
      "cv1026_light_after.jpg",
      "Streetlight Repaired & Illuminated",
      "#065f46",
      "Replacement LED Unit Verified"
    ),
    "CV-1027-BEFORE": await createSampleImage(
      "cv1027_drain_before.jpg",
      "Reported Drain Obstruction",
      "#4c1d95",
      "Suspected Stock Photo Evidence"
    ),
  };

  const citizen = users["ravi.citizen@mysuru.demo"] || users["citizen@demo.civicverify"];

  console.log("[Seed] Seeding issues and evidence...");
  for (const b of demoIssueBlueprints) {
    const officer = users[b.officerEmail] || users["commissioner@mysuru.gov.in"];
    const zone = zoneDocs[b.zone];
    const cat = catDocs[b.category];

    const payload = {
      publicId: b.publicId,
      categoryId: cat._id,
      title: b.title,
      normalizedTitle: b.title.toLowerCase(),
      description: b.description,
      location: { type: "Point", coordinates: b.coordinates },
      approximateLocationLabel: mapsProvider.approximateLabel(b.coordinates[0], b.coordinates[1]),
      zoneId: zone._id,
      priority: b.priority,
      status: b.status,
      verificationStatus: b.verificationStatus,
      verificationScore: b.verificationScore,
      supportCount: b.supportCount,
      reportCount: 1,
      assignedOfficerId: officer?._id || null,
      escalated: Boolean(b.escalated),
      escalationReason: b.escalationReason || "",
      resolvedAt: b.resolvedAt || null,
      supporters: [citizen._id],
    };

    let issue = await CivicIssue.create(payload);
    await applySla(issue);
    if (b.escalated) {
      issue.deadline = new Date(Date.now() - 3600000);
      issue.escalationAt = issue.deadline;
      await issue.save();
    }

    const reportId = `R-${b.publicId.split("-")[1]}`;
    const report = await Report.create({
      reportId,
      issueId: issue._id,
      citizenId: citizen._id,
      citizenSelectedCategoryId: cat._id,
      citizenSelectedZoneId: zone._id,
      description: b.description,
      capturedLocation: {
        type: "Point",
        coordinates: b.coordinates,
        accuracyMeters: b.verificationScore < 40 ? 350 : 16,
      },
      gpsDerivedZoneId: zone._id,
      zoneMatchStatus: "MATCH",
      reportStatus: "ATTACHED",
      duplicateDecision: "NEW_ISSUE",
      verification: {
        overallStatus: b.verificationStatus,
        score: b.verificationScore,
        requiresManualReview: b.verificationScore < 60,
        flags: b.verificationScore < 40 ? ["NOT_APP_CAPTURED", "HIGH_SYNTHETIC_RISK", "LOW_LOCATION_ACCURACY"] : [],
        provider: "RULES_AND_AI",
        analyzedAt: new Date(),
        captureProvenance: b.verificationScore < 40 ? "UNKNOWN" : "APP_CAPTURE",
        locationConsistency: "MATCH",
        timestampPresent: true,
        duplicateEvidence: "NO_STRONG_MATCH",
        zoneConsistency: "MATCH",
        imageRelevance: { status: "LIKELY_RELEVANT", confidence: 0.92 },
        syntheticRisk: {
          status: b.verificationScore < 40 ? "HIGH_RISK" : "LOW_RISK",
          confidence: 0.72,
        },
      },
    });

    // Create BEFORE Evidence
    const beforeKey = `${b.publicId}-BEFORE`;
    if (images[beforeKey]) {
      await Evidence.create({
        evidenceId: `E-${b.publicId.split("-")[1]}-B`,
        reportId: report._id,
        issueId: issue._id,
        type: "BEFORE",
        storageKey: path.basename(images[beforeKey]),
        publicUrl: images[beforeKey],
        mimeType: "image/jpeg",
        capturedThroughApp: b.verificationScore >= 40,
        capturedAt: new Date(Date.now() - 24 * 3600000),
        location: { type: "Point", coordinates: b.coordinates },
        locationAccuracyMeters: b.verificationScore < 40 ? 350 : 16,
        perceptualHash: "a1b2c3d4e5f67890",
        aiAssessment: {
          imageRelevance: { status: "LIKELY_RELEVANT", confidence: 0.92 },
          syntheticRisk: { status: b.verificationScore < 40 ? "HIGH_RISK" : "LOW_RISK", confidence: 0.8 },
        },
      });
    }

    // Create AFTER Evidence for resolved issues
    if (b.hasResolutionEvidence && images[`${b.publicId}-AFTER`]) {
      const afterUrl = images[`${b.publicId}-AFTER`];
      await Evidence.create({
        evidenceId: `E-${b.publicId.split("-")[1]}-A`,
        issueId: issue._id,
        type: "AFTER",
        storageKey: path.basename(afterUrl),
        publicUrl: afterUrl,
        mimeType: "image/jpeg",
        capturedThroughApp: true,
        capturedAt: new Date(Date.now() - 4 * 3600000),
        location: { type: "Point", coordinates: b.coordinates },
        locationAccuracyMeters: 12,
        perceptualHash: "f6e5d4c3b2a10987",
        aiAssessment: {
          comparison: {
            changed: true,
            confidence: 0.94,
            note: "Streetlight fixture restored, high intensity illumination detected.",
          },
        },
      });
    }

    await IssueEvent.deleteMany({ issueId: issue._id });
    await recordEvent({
      issueId: issue._id,
      actorId: citizen._id,
      actorRole: "CITIZEN",
      eventType: "ISSUE_CREATED",
      toStatus: "SUBMITTED",
      message: "Citizen submitted location-bound evidence",
    });

    await recordEvent({
      issueId: issue._id,
      actorRole: "SYSTEM",
      eventType: "VERIFICATION",
      toStatus: b.status === "RESOLVED" ? "IN_PROGRESS" : b.status,
      message: `Multi-signal verification score: ${b.verificationScore}/100 (${b.verificationStatus})`,
    });

    if (b.status === "RESOLVED") {
      await recordEvent({
        issueId: issue._id,
        actorId: officer?._id,
        actorRole: "ZONE_OFFICER",
        eventType: "RESOLUTION",
        fromStatus: "IN_PROGRESS",
        toStatus: "RESOLVED",
        message: "Repaired sodium lamp & verified with resolution evidence.",
      });
    }
  }

  console.log("✅ Seeded Mysuru CivicVerify demo data successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
