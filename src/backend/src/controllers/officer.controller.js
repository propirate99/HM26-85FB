import { CivicIssue } from "../models/CivicIssue.js";
import { Evidence } from "../models/Evidence.js";
import * as issues from "../services/issue.service.js";
import { listEvents, recordEvent } from "../services/audit.service.js";
import { addResolutionEvidence } from "../services/resolution.service.js";

export async function queue(req, res, next) {
  try {
    const q = { status: { $nin: ["RESOLVED", "REJECTED"] } };
    if (req.user.role === "ZONE_OFFICER") q.zoneId = req.user.assignedZoneId;
    const rows = await CivicIssue.find(q)
      .sort({ priority: 1, deadline: 1 })
      .populate("categoryId")
      .populate("zoneId");
    res.json({ issues: rows.map((i) => issues.sanitizeIssue(i)) });
  } catch (err) {
    next(err);
  }
}

export async function getOfficerIssue(req, res, next) {
  try {
    const issue = await CivicIssue.findById(req.params.issueId)
      .populate("categoryId")
      .populate("zoneId")
      .populate("assignedOfficerId", "name email");
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.assertOfficerZone(req.user, issue);
    const evidence = await Evidence.find({ issueId: issue._id });
    const events = await listEvents(issue._id);
    res.json({ issue: issues.sanitizeIssue(issue), evidence, events });
  } catch (err) {
    next(err);
  }
}

export async function accept(req, res, next) {
  try {
    const issue = await CivicIssue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.assertOfficerZone(req.user, issue);
    issue.assignedOfficerId = req.user._id;
    if (["VERIFIED", "ASSIGNED", "NEEDS_REVIEW", "ESCALATED"].includes(issue.status)) {
      await issues.changeStatus(issue, {
        user: req.user,
        status: "ACKNOWLEDGED",
        message: "Officer accepted the issue",
      });
    } else {
      await issue.save();
    }
    res.json({ issue: issues.sanitizeIssue(issue) });
  } catch (err) {
    next(err);
  }
}

export async function status(req, res, next) {
  try {
    const issue = await CivicIssue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.changeStatus(issue, {
      user: req.user,
      status: req.body.status,
      message: req.body.message,
    });
    res.json({ issue: issues.sanitizeIssue(issue) });
  } catch (err) {
    next(err);
  }
}

export async function note(req, res, next) {
  try {
    const issue = await CivicIssue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.assertOfficerZone(req.user, issue);
    await recordEvent({
      issueId: issue._id,
      actorId: req.user._id,
      actorRole: req.user.role,
      eventType: "NOTE",
      message: req.body.message,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function resolutionEvidence(req, res, next) {
  try {
    const issue = await CivicIssue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.assertOfficerZone(req.user, issue);
    const result = await addResolutionEvidence(issue, req.user, req.file, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function resolve(req, res, next) {
  try {
    const issue = await CivicIssue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    await issues.changeStatus(issue, {
      user: req.user,
      status: "RESOLVED",
      message: req.body.message || "Marked resolved with evidence",
    });
    res.json({ issue: issues.sanitizeIssue(issue) });
  } catch (err) {
    next(err);
  }
}
