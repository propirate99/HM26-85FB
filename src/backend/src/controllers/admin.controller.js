import { CivicIssue } from "../models/CivicIssue.js";
import { User } from "../models/User.js";
import { Zone } from "../models/Zone.js";
import { Report } from "../models/Report.js";
import { IssueEvent } from "../models/IssueEvent.js";
import { SystemConfig } from "../models/SystemConfig.js";
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
