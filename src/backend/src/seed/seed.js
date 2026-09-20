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
import { Complaint } from "../models/Complaint.js";
import { Media } from "../models/Media.js";
import { Logistics } from "../models/Logistics.js";
import { Simulation } from "../models/Simulation.js";
import { AuditLog } from "../models/AuditLog.js";
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
    Complaint.deleteMany({}),
    Media.deleteMany({}),
    Logistics.deleteMany({}),
    Simulation.deleteMany({}),
    AuditLog.deleteMany({}),
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
        jurisdiction: {
          zone: a.zoneCode === "NORTH" ? "North Zone" : a.zoneCode === "SOUTH" ? "South Zone" : "All Zones",
          department:
            a.role === "MAIN_AUTHORITY" || a.role === "admin"
              ? "City Administration"
              : a.role === "ZONE_OFFICER" || a.role === "officer"
              ? "Sanitation & Civil"
              : "Citizen Desk",
        },
        reputationScore: a.role === "CITIZEN" || a.role === "citizen" ? 95 : 100,
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

  // -------------------------------------------------------------
  // Seed Standard Complaint, Media, Logistics, Simulation & AuditLog
  // -------------------------------------------------------------
  console.log("[Seed] Seeding standard Complaint & Media pipeline...");
  const citizenUser = users["ravi.citizen@mysuru.demo"] || users["anitha.r@example.in"];
  const anithaUser = users["anitha.r@example.in"] || citizenUser;
  const northOfficer = users["ananya.officer@mysuru.gov.in"];
  const southOfficer = users["karthik.officer@mysuru.gov.in"];
  const adminUser = users["commissioner@mysuru.gov.in"];

  const demoComplaints = [
    {
      title: "Severe deep crater pothole near Sayyaji Rao Road junction",
      description: "Hazardous pothole causing two-wheeler skidding during peak traffic hours.",
      category: "ROADS",
      location: {
        type: "Point",
        coordinates: [76.6531, 12.3168],
        address: "Sayyaji Rao Road, Near Bamboo Bazar, Bannimantap, Mysuru",
        zone: "North Zone",
      },
      citizenId: citizenUser._id,
      assignedOfficerId: northOfficer?._id || null,
      status: "TRIAGED",
      verificationMetrics: {
        gpsConfidence: 0.94,
        duplicateConfidence: 0.08,
        aiVisualScore: 88,
        compositeScore: 91,
      },
      slaDeadline: new Date(Date.now() + 24 * 3600 * 1000),
      imageKey: "CV-1024-BEFORE",
    },
    {
      title: "Overflowing commercial garbage dump blocking storm drain",
      description: "Excess organic waste dumped overnight overflowing into pedestrian footpath.",
      category: "WASTE",
      location: {
        type: "Point",
        coordinates: [76.6515, 12.3082],
        address: "Devaraja Market Western Entrance, Mysuru",
        zone: "Central Zone",
      },
      citizenId: anithaUser._id,
      assignedOfficerId: northOfficer?._id || null,
      status: "ASSIGNED",
      verificationMetrics: {
        gpsConfidence: 0.92,
        duplicateConfidence: 0.12,
        aiVisualScore: 85,
        compositeScore: 89,
      },
      slaDeadline: new Date(Date.now() + 12 * 3600 * 1000),
      imageKey: "CV-1025-BEFORE",
    },
    {
      title: "High-pressure municipal water main leakage flooding Saraswathipuram 8th Main",
      description: "Clean potable water gushing from cracked underground joint onto roadway.",
      category: "WATER",
      location: {
        type: "Point",
        coordinates: [76.6342, 12.3051],
        address: "8th Main, Saraswathipuram, Mysuru",
        zone: "South Zone",
      },
      citizenId: citizenUser._id,
      assignedOfficerId: southOfficer?._id || null,
      status: "IN_PROGRESS",
      verificationMetrics: {
        gpsConfidence: 0.96,
        duplicateConfidence: 0.05,
        aiVisualScore: 92,
        compositeScore: 94,
      },
      slaDeadline: new Date(Date.now() + 8 * 3600 * 1000),
      imageKey: "CV-1027-BEFORE",
    },
    {
      title: "Sodium vapor luminaire breakdown on Kuvempunagar 5th Cross",
      description: "Complete dark stretch posing security hazard for pedestrians after 7 PM.",
      category: "LIGHTING",
      location: {
        type: "Point",
        coordinates: [76.6265, 12.2894],
        address: "5th Cross, M-Block, Kuvempunagar, Mysuru",
        zone: "South Zone",
      },
      citizenId: anithaUser._id,
      assignedOfficerId: southOfficer?._id || null,
      status: "RESOLVED",
      verificationMetrics: {
        gpsConfidence: 0.95,
        duplicateConfidence: 0.02,
        aiVisualScore: 96,
        compositeScore: 95,
      },
      slaDeadline: new Date(Date.now() - 4 * 3600 * 1000),
      imageKey: "CV-1026-BEFORE",
      afterImageKey: "CV-1026-AFTER",
    },
  ];

  const createdComplaints = [];
  for (const c of demoComplaints) {
    const comp = await Complaint.create({
      citizenId: c.citizenId,
      title: c.title,
      description: c.description,
      category: c.category,
      location: c.location,
      status: c.status,
      verificationMetrics: c.verificationMetrics,
      assignedOfficerId: c.assignedOfficerId,
      slaDeadline: c.slaDeadline,
    });
    createdComplaints.push(comp);

    // Media
    if (images[c.imageKey]) {
      await Media.create({
        complaintId: comp._id,
        stage: "BEFORE_INCIDENT",
        fileUrl: images[c.imageKey],
        thumbnailUrl: images[c.imageKey],
        metadata: {
          captureTimestamp: new Date(Date.now() - 36 * 3600 * 1000),
          exifGps: c.location.coordinates,
          deviceType: "mobile-pwa",
        },
        isPublicMasked: false,
      });
    }

    if (c.afterImageKey && images[c.afterImageKey]) {
      await Media.create({
        complaintId: comp._id,
        stage: "AFTER_RESOLUTION",
        fileUrl: images[c.afterImageKey],
        thumbnailUrl: images[c.afterImageKey],
        metadata: {
          captureTimestamp: new Date(Date.now() - 2 * 3600 * 1000),
          exifGps: c.location.coordinates,
          deviceType: "field-officer-cam",
        },
        isPublicMasked: false,
      });
    }
  }

  // Logistics
  console.log("[Seed] Seeding Logistics units and dispatches...");
  await Logistics.create({
    complaintId: createdComplaints[0]._id,
    assignedUnit: {
      teamLeadId: northOfficer?._id || adminUser?._id,
      vehicleId: "KA-09-ENG-02",
      crewCount: 4,
    },
    dispatchStatus: "ON_SITE",
    materialAllocations: [
      { item: "Cold Mix Asphalt (50kg bags)", quantity: 6, unit: "bags" },
      { item: "Bitumen Emulsion Tack Coat", quantity: 20, unit: "litres" },
    ],
    eta: new Date(Date.now() + 45 * 60 * 1000),
  });

  await Logistics.create({
    complaintId: createdComplaints[1]._id,
    assignedUnit: {
      teamLeadId: northOfficer?._id || adminUser?._id,
      vehicleId: "KA-09-SWM-01",
      crewCount: 4,
    },
    dispatchStatus: "EN_ROUTE",
    materialAllocations: [
      { item: "Bleaching Powder & Lime (25kg bags)", quantity: 2, unit: "bags" },
      { item: "Bio-Inoculant Waste Sprayer Liquid", quantity: 15, unit: "litres" },
    ],
    eta: new Date(Date.now() + 25 * 60 * 1000),
  });

  // Simulations
  console.log("[Seed] Seeding Scenario Simulations...");
  await Simulation.create({
    scenarioName: "Dasara Tourist Surge & Traffic Spike",
    category: "TRAFFIC_SPIKE",
    parameters: {
      intensityFactor: 2.0,
      affectedZones: ["Central Zone", "North Zone"],
      durationHours: 8,
    },
    projectedImpact: {
      incidentVolumeEstimate: 130,
      crewShortageEstimate: 38,
    },
    executedBy: adminUser?._id,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000),
  });

  await Simulation.create({
    scenarioName: "Chamundi Foothills Monsoon Storm & Drain Inundation",
    category: "FLOOD_PREDICTION",
    parameters: {
      intensityFactor: 2.4,
      affectedZones: ["South Zone", "Central Zone"],
      durationHours: 12,
    },
    projectedImpact: {
      incidentVolumeEstimate: 162,
      crewShortageEstimate: 49,
    },
    executedBy: adminUser?._id,
    createdAt: new Date(Date.now() - 6 * 3600 * 1000),
  });

  // Audit Logs
  console.log("[Seed] Seeding Audit Logs...");
  await AuditLog.create({
    entityId: createdComplaints[0]._id,
    actorId: adminUser?._id,
    action: "SCORE_OVERRIDDEN",
    diff: {
      before: { compositeScore: 78, status: "SUBMITTED" },
      after: { compositeScore: 91, status: "TRIAGED" },
      reason: "Verified by MCC Commissioner with high-resolution image analysis.",
    },
    createdAt: new Date(Date.now() - 10 * 3600 * 1000),
  });

  await AuditLog.create({
    entityId: createdComplaints[1]._id,
    actorId: adminUser?._id,
    action: "DISPATCH_TRIGGERED",
    diff: {
      vehicleId: "KA-09-SWM-01",
      crewCount: 4,
      materialAllocations: "Bleaching powder & Bio-inoculant sprayer",
    },
    createdAt: new Date(Date.now() - 2 * 3600 * 1000),
  });

  console.log("✅ Seeded Mysuru CivicVerify demo data successfully!");
  process.exit(0);
}


run().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
