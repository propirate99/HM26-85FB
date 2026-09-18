import mongoose from "mongoose";
import { Report } from "../models/Report.js";
import { Evidence } from "../models/Evidence.js";
import { CivicIssue } from "../models/CivicIssue.js";
import * as reports from "../services/report.service.js";
import * as issues from "../services/issue.service.js";
import { findNearbyIssues } from "../services/duplicate.service.js";
import { listEvents } from "../services/audit.service.js";
import { listNotifications } from "../services/notification.service.js";
import { IssueCategory } from "../models/IssueCategory.js";
import { Zone } from "../models/Zone.js";
import { getSlaHours } from "../services/sla.service.js";

export async function createReport(req, res, next) {
  try {
    const report = await reports.createReport(req.user, req.body);
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req, res, next) {
  try {
    const mine = await reports.myReports(req.user);
    res.json({ reports: mine });
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId })
      .populate("citizenSelectedCategoryId")
      .populate("issueId");
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (String(report.citizenId) !== String(req.user._id) && req.user.role === "CITIZEN") {
      return res.status(403).json({ error: "Not your report" });
    }
    const evidence = await Evidence.find({ reportId: report._id });
    res.json({ report, evidence });
  } catch (err) {
    next(err);
  }
}

export async function uploadEvidence(req, res, next) {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: "Report not found" });
    const result = await reports.addEvidence(req.user, report, req.file, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function nearby(req, res, next) {
  try {
    const lng = Number(req.query.lng);
    const lat = Number(req.query.lat);
    const rows = await findNearbyIssues({
      lng,
      lat,
      categoryId: req.query.categoryId,
    });
    res.json({
      issues: rows.map((r) => ({
        ...issues.sanitizeIssue(r.issue, { publicView: true }),
        distanceMeters: r.distanceMeters,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function attach(req, res, next) {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    const issue = await CivicIssue.findById(req.body.issueId);
    if (!report || !issue) return res.status(404).json({ error: "Not found" });
    if (String(report.citizenId) !== String(req.user._id)) {
      return res.status(403).json({ error: "Not your report" });
    }
    const updated = await issues.attachReportToIssue(report, issue, { actor: req.user });
    await Evidence.updateMany({ reportId: report._id }, { issueId: issue._id });
    res.json({ issue: issues.sanitizeIssue(updated) });
  } catch (err) {
    next(err);
  }
}

export async function createIssue(req, res, next) {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId });
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (String(report.citizenId) !== String(req.user._id)) {
      return res.status(403).json({ error: "Not your report" });
    }
    const issue = await issues.createIssueFromReport(report, { actor: req.user });
    await Evidence.updateMany({ reportId: report._id }, { issueId: issue._id });
    res.status(201).json({ issue: issues.sanitizeIssue(issue) });
  } catch (err) {
    next(err);
  }
}

async function findIssueByParam(id) {
  const or = [{ publicId: id }];
  if (mongoose.isValidObjectId(id)) or.push({ _id: id });
  return CivicIssue.findOne({ $or: or })
    .populate("categoryId")
    .populate("zoneId")
    .populate("assignedOfficerId", "name role");
}

export async function listIssues(req, res, next) {
  try {
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.zoneId) q.zoneId = req.query.zoneId;
    if (req.user.role === "ZONE_OFFICER") q.zoneId = req.user.assignedZoneId;
    if (req.user.role === "CITIZEN") {
      const mine = await Report.find({
        citizenId: req.user._id,
        issueId: { $ne: null },
      }).select("issueId");
      q.$or = [{ _id: { $in: mine.map((r) => r.issueId) } }, { supporters: req.user._id }];
    }
    const rows = await CivicIssue.find(q)
      .sort({ createdAt: -1 })
      .populate("categoryId")
      .populate("zoneId")
      .limit(100);
    res.json({ issues: rows.map((i) => issues.sanitizeIssue(i)) });
  } catch (err) {
    next(err);
  }
}

export async function getIssue(req, res, next) {
  try {
    const issue = await findIssueByParam(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    const evidence = await Evidence.find({ issueId: issue._id });
    const events = await listEvents(issue._id);
    res.json({
      issue: issues.sanitizeIssue(issue),
      evidence,
      events,
      supported: issue.supporters.some((id) => String(id) === String(req.user._id)),
    });
  } catch (err) {
    next(err);
  }
}

export async function supportOn(req, res, next) {
  try {
    const issue = await findIssueByParam(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.setSupport(issue, req.user, true);
    res.json({ supportCount: issue.supportCount });
  } catch (err) {
    next(err);
  }
}

export async function supportOff(req, res, next) {
  try {
    const issue = await findIssueByParam(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.setSupport(issue, req.user, false);
    res.json({ supportCount: issue.supportCount });
  } catch (err) {
    next(err);
  }
}

export async function configAll(_req, res, next) {
  try {
    const [categories, zones, slas] = await Promise.all([
      IssueCategory.find(),
      Zone.find({ isActive: true }),
      getSlaHours(),
    ]);
    res.json({ categories, zones, slas });
  } catch (err) {
    next(err);
  }
}

export async function notifications(req, res, next) {
  try {
    res.json({ notifications: await listNotifications(req.user._id) });
  } catch (err) {
    next(err);
  }
}
