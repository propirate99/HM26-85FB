import mongoose from "mongoose";
import { CivicIssue } from "../models/CivicIssue.js";
import { User } from "../models/User.js";
import { Zone } from "../models/Zone.js";
import { Report } from "../models/Report.js";
import { IssueEvent } from "../models/IssueEvent.js";
import { SystemConfig } from "../models/SystemConfig.js";
import { Complaint } from "../models/Complaint.js";
import { Media } from "../models/Media.js";
import { Logistics } from "../models/Logistics.js";
import { Simulation } from "../models/Simulation.js";
import { AuditLog } from "../models/AuditLog.js";
import { Evidence } from "../models/Evidence.js";
import * as issues from "../services/issue.service.js";
import { recordEvent } from "../services/audit.service.js";
import { env, updateAiConfig } from "../config/env.js";


export async function analytics(_req, res, next) {
  try {
    const [byStatus, open, escalated, resolved, pendingReviews] = await Promise.all([
      CivicIssue.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      CivicIssue.countDocuments({ status: { $nin: ["RESOLVED", "REJECTED"] } }),
      CivicIssue.countDocuments({ escalated: true, status: { $ne: "RESOLVED" } }),
      CivicIssue.countDocuments({ status: "RESOLVED" }),
      Report.find({ reportStatus: "PENDING_REVIEW" })
        .sort({ createdAt: -1 })
        .limit(40)
        .populate("issueId", "publicId status"),
    ]);
    res.json({ byStatus, open, escalated, resolved, pendingReviews });
  } catch (err) {
    next(err);
  }
}

export async function adminIssues(req, res, next) {
  try {
    const rows = await CivicIssue.find(req.query.status ? { status: req.query.status } : {})
      .sort({ updatedAt: -1 })
      .populate("categoryId")
      .populate("zoneId")
      .limit(200);
    res.json({ issues: rows.map((i) => issues.sanitizeIssue(i)) });
  } catch (err) {
    next(err);
  }
}

export async function escalated(_req, res, next) {
  try {
    const rows = await CivicIssue.find({ escalated: true, status: { $ne: "RESOLVED" } })
      .populate("categoryId")
      .populate("zoneId");
    res.json({ issues: rows.map((i) => issues.sanitizeIssue(i)) });
  } catch (err) {
    next(err);
  }
}

export async function officers(_req, res, next) {
  try {
    const rows = await User.find({ role: { $in: ["ZONE_OFFICER", "MAIN_AUTHORITY"] } }).populate(
      "assignedZoneId"
    );
    res.json({ officers: rows });
  } catch (err) {
    next(err);
  }
}

export async function createOfficer(req, res, next) {
  try {
    const user = await User.create({
      email: req.body.email,
      name: req.body.name,
      role: req.body.role || "ZONE_OFFICER",
      assignedZoneId: req.body.assignedZoneId,
      isActive: true,
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function patchOfficer(req, res, next) {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (req.body.role) user.role = req.body.role;
    if (req.body.assignedZoneId !== undefined) user.assignedZoneId = req.body.assignedZoneId;
    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function createZone(req, res, next) {
  try {
    const zone = await Zone.create({ ...req.body, isDemoData: true });
    res.status(201).json({ zone });
  } catch (err) {
    next(err);
  }
}

export async function patchZone(req, res, next) {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.zoneId, req.body, { new: true });
    res.json({ zone });
  } catch (err) {
    next(err);
  }
}

export async function patchSlas(req, res, next) {
  try {
    const row = await SystemConfig.findOneAndUpdate(
      { key: "slas" },
      { value: req.body },
      { upsert: true, new: true }
    );
    res.json({ slas: row.value });
  } catch (err) {
    next(err);
  }
}

export async function audit(req, res, next) {
  try {
    const events = await IssueEvent.find().sort({ createdAt: -1 }).limit(200).populate("issueId", "publicId");
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

export async function reviewDecision(req, res, next) {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: "Report not found" });
    const decision = req.body.decision;
    report.reportStatus = decision === "reject" ? "REJECTED" : "ATTACHED";
    await report.save();
    if (report.issueId) {
      const issue = await CivicIssue.findById(report.issueId);
      if (issue && decision === "approve") {
        issue.status = "ASSIGNED";
        issue.verificationStatus = "VERIFIED_BUT_REVIEWABLE";
        await issue.save();
      }
      await recordEvent({
        issueId: report.issueId,
        actorId: req.user._id,
        actorRole: req.user.role,
        eventType: "REVIEW_DECISION",
        message: req.body.message || decision,
      });
    }
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function getAiStatus(_req, res, next) {
  try {
    const hasKey = Boolean(env.aiApiKey);
    const keyMasked = hasKey
      ? `${env.aiApiKey.slice(0, 6)}...${env.aiApiKey.slice(-4)}`
      : "None configured (Zero-downtime heuristic engine active)";
    res.json({
      provider: env.aiProvider,
      model: env.geminiModel,
      hasKey,
      keyMasked,
      features: [
        "Automated Fake & Gibberish Screening",
        "Multimodal Civic Taxonomy Auto-Categorization",
        "Probabilistic Synthetic / Manipulation Risk Scoring",
        "Two-Stage Spatial & Semantic Duplicate Screening",
        "Severity & SLA Urgency Estimation",
        "Before/After Resolution Verification",
      ],
      quotaStatus: hasKey ? "Active External API Key" : "Heuristic Standalone Engine",
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAiConfiguration(req, res, next) {
  try {
    const { apiKey, provider, model } = req.body || {};
    const updated = updateAiConfig({ apiKey, provider, model });
    res.json({ success: true, config: updated });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Phase 2: Administrative RBAC Controllers
// -------------------------------------------------------------

export async function getTriage(_req, res, next) {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .populate("citizenId", "name email phone")
      .populate("assignedOfficerId", "name email role");

    // Also get CivicIssues for comprehensive monitoring
    const pendingIssues = await CivicIssue.find({
      status: { $in: ["SUBMITTED", "VERIFYING", "NEEDS_REVIEW", "ASSIGNED"] },
    })
      .sort({ createdAt: -1 })
      .populate("categoryId")
      .populate("zoneId")
      .populate("assignedOfficerId", "name email");

    res.json({
      complaints,
      pendingIssues: pendingIssues.map((i) => issues.sanitizeIssue(i)),
      totalPending: complaints.length + pendingIssues.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function patchTriage(req, res, next) {
  try {
    const { id } = req.params;
    const { status, scoreOverride, isDuplicate, duplicateReferenceId, assignedOfficerId, reason } =
      req.body;

    let target = await Complaint.findById(id);
    let entityType = "Complaint";

    if (!target) {
      target = await issues.findIssueByParam(id);
      entityType = "CivicIssue";
    }

    if (!target) {
      return res.status(404).json({ error: "Complaint or issue not found" });
    }

    const beforeState = {
      status: target.status,
      verificationScore: target.verificationMetrics?.compositeScore || target.verificationScore,
      assignedOfficerId: target.assignedOfficerId,
    };

    if (status) target.status = status;
    if (assignedOfficerId) target.assignedOfficerId = assignedOfficerId;

    if (scoreOverride != null) {
      if (target.verificationMetrics) {
        target.verificationMetrics.compositeScore = Number(scoreOverride);
        target.verificationMetrics.aiVisualScore = Number(scoreOverride);
      }
      target.verificationScore = Number(scoreOverride);
      if (Number(scoreOverride) >= 80) {
        target.verificationStatus = "VERIFIED_WITH_LOW_RISK";
      }
    }

    if (isDuplicate) {
      if (duplicateReferenceId) target.duplicateReferenceId = duplicateReferenceId;
      target.status = "REJECTED";
      if (target.verificationMetrics) target.verificationMetrics.duplicateConfidence = 0.95;
    }

    await target.save();

    const afterState = {
      status: target.status,
      verificationScore: target.verificationMetrics?.compositeScore || target.verificationScore,
      assignedOfficerId: target.assignedOfficerId,
    };

    // Log to immutable AuditLog
    await AuditLog.create({
      entityId: target._id,
      actorId: req.user._id,
      action: scoreOverride != null ? "SCORE_OVERRIDDEN" : "STATUS_CHANGED",
      diff: { before: beforeState, after: afterState, reason: reason || "Admin triage review" },
      createdAt: new Date(),
    });

    res.json({ success: true, target, entityType });
  } catch (err) {
    next(err);
  }
}

export async function getLogistics(_req, res, next) {
  try {
    const dispatches = await Logistics.find()
      .sort({ createdAt: -1 })
      .populate("complaintId")
      .populate("assignedUnit.teamLeadId", "name email phone role");

    // Standard pre-configured Mysore City Corporation field units
    const units = [
      { vehicleId: "KA-09-SWM-01", type: "Compactor Truck (12 TPD)", zone: "North Zone", crewCount: 4, status: "AVAILABLE" },
      { vehicleId: "KA-09-SWM-04", type: "Tipper Auto (3 TPD)", zone: "Central Zone", crewCount: 2, status: "ON_SITE" },
      { vehicleId: "KA-09-SWM-08", type: "Dumper Placer (8 TPD)", zone: "South Zone", crewCount: 3, status: "EN_ROUTE" },
      { vehicleId: "KA-09-ENG-02", type: "Road Cold-Mix Asphalt Patch Unit", zone: "Central Zone", crewCount: 5, status: "AVAILABLE" },
      { vehicleId: "KA-09-ENG-05", type: "Drain Jetting & Sludge Suction Unit", zone: "North Zone", crewCount: 3, status: "AVAILABLE" },
    ];

    const inventory = [
      { item: "Cold Mix Asphalt (50kg bags)", available: 140, unit: "bags" },
      { item: "Bleaching Powder & Lime (25kg bags)", available: 85, unit: "bags" },
      { item: "Replacement Sodium Vapor / LED Luminaires", available: 42, unit: "units" },
      { item: "Heavy Duty SWM Bins (1100 Litres)", available: 18, unit: "units" },
      { item: "Bio-Inoculant Waste Sprayer Liquid", available: 320, unit: "litres" },
    ];

    res.json({ dispatches, units, inventory });
  } catch (err) {
    next(err);
  }
}

export async function dispatchLogistics(req, res, next) {
  try {
    const { complaintId, teamLeadId, vehicleId, crewCount, materialAllocations, etaMinutes } =
      req.body;

    let targetComplaintId = complaintId;
    if (!targetComplaintId) {
      const existingComplaint = await Complaint.findOne();
      targetComplaintId = existingComplaint ? existingComplaint._id : new mongoose.Types.ObjectId();
    }

    const eta = new Date(Date.now() + (Number(etaMinutes) || 45) * 60 * 1000);

    const logisticsRecord = await Logistics.create({
      complaintId: targetComplaintId,


      assignedUnit: {
        teamLeadId: teamLeadId || req.user._id,
        vehicleId: vehicleId || "KA-09-SWM-01",
        crewCount: Number(crewCount) || 2,
      },
      dispatchStatus: "EN_ROUTE",
      materialAllocations: Array.isArray(materialAllocations) ? materialAllocations : [],
      eta,
    });

    await AuditLog.create({
      entityId: logisticsRecord._id,
      actorId: req.user._id,
      action: "DISPATCH_TRIGGERED",
      diff: {
        vehicleId,
        crewCount,
        eta,
        materialAllocations,
      },
      createdAt: new Date(),
    });

    res.json({ success: true, dispatch: logisticsRecord });
  } catch (err) {
    next(err);
  }
}

export async function getSimulators(_req, res, next) {
  try {
    const runs = await Simulation.find()
      .sort({ createdAt: -1 })
      .populate("executedBy", "name email");

    res.json({ simulations: runs });
  } catch (err) {
    next(err);
  }
}

export async function runSimulator(req, res, next) {
  try {
    const { scenarioName, category, intensityFactor, affectedZones, durationHours } = req.body;

    const intensity = Number(intensityFactor) || 1.5;
    const duration = Number(durationHours) || 6;
    const zones = Array.isArray(affectedZones) && affectedZones.length ? affectedZones : ["Central Zone", "North Zone"];

    // Realistic Mysore City Corporation emergency projection formula
    const baseIncidents = category === "FLOOD_PREDICTION" ? 45 : category === "TRAFFIC_SPIKE" ? 65 : 30;
    const incidentVolumeEstimate = Math.round(baseIncidents * intensity * (duration / 4));
    const crewShortageEstimate = Math.max(0, Math.round(incidentVolumeEstimate * 0.35 - 8));

    const sim = await Simulation.create({
      scenarioName: scenarioName || `${category} - MCC Stress Test`,
      category: category || "FLOOD_PREDICTION",
      parameters: {
        intensityFactor: intensity,
        affectedZones: zones,
        durationHours: duration,
      },
      projectedImpact: {
        incidentVolumeEstimate,
        crewShortageEstimate,
      },
      executedBy: req.user._id,
      createdAt: new Date(),
    });

    await AuditLog.create({
      entityId: sim._id,
      actorId: req.user._id,
      action: "SIMULATION_EXECUTED",
      diff: { scenarioName: sim.scenarioName, projectedImpact: sim.projectedImpact },
      createdAt: new Date(),
    });

    res.json({ success: true, simulation: sim });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(_req, res, next) {
  try {
    const [auditLogs, events] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).limit(100).populate("actorId", "name email role"),
      IssueEvent.find().sort({ createdAt: -1 }).limit(100).populate("actorId", "name email role"),
    ]);

    res.json({ auditLogs, events });
  } catch (err) {
    next(err);
  }
}

export async function getAdminMedia(_req, res, next) {
  try {
    const [mediaItems, evidenceItems] = await Promise.all([
      Media.find().sort({ createdAt: -1 }).limit(80).populate("complaintId"),
      Evidence.find().sort({ createdAt: -1 }).limit(80).populate("issueId"),
    ]);

    const combined = [
      ...mediaItems.map((m) => ({
        _id: m._id,
        complaintId: m.complaintId,
        stage: m.stage,
        fileUrl: m.fileUrl,
        isPublicMasked: Boolean(m.isPublicMasked),
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
      ...evidenceItems.map((e) => ({
        _id: e._id,
        complaintId: e.issueId,
        stage: e.type === "AFTER" ? "AFTER_RESOLUTION" : "BEFORE_INCIDENT",
        fileUrl: e.publicUrl,
        isPublicMasked: Boolean(e.isPublicMasked),
        metadata: {
          captureTimestamp: e.capturedAt,
          exifGps: e.location?.coordinates || [],
          deviceType: e.capturedThroughApp ? "verified-camera-pwa" : "external",
        },
        createdAt: e.createdAt,
      })),
    ];

    res.json({ media: combined });
  } catch (err) {
    next(err);
  }
}

export async function toggleMediaMask(req, res, next) {
  try {
    const { id } = req.params;
    let target = await Media.findById(id);
    if (!target) {
      target = await Evidence.findById(id);
    }
    if (!target) {
      return res.status(404).json({ error: "Media item not found" });
    }

    const beforeMask = Boolean(target.isPublicMasked);
    target.isPublicMasked = !beforeMask;
    await target.save();

    await AuditLog.create({
      entityId: target._id,
      actorId: req.user._id,
      action: "MEDIA_MASK_TOGGLED",
      diff: { before: { isPublicMasked: beforeMask }, after: { isPublicMasked: target.isPublicMasked } },
      createdAt: new Date(),
    });

    res.json({ success: true, isPublicMasked: target.isPublicMasked });
  } catch (err) {
    next(err);
  }
}

