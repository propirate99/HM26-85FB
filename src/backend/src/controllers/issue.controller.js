import { CivicIssue } from "../models/CivicIssue.js";
import { Evidence } from "../models/Evidence.js";
import { listEvents } from "../services/audit.service.js";
import { sanitizeIssue } from "../services/issue.service.js";

export async function publicIssues(req, res, next) {
  try {
    const q = { status: { $nin: ["REJECTED"] } };
    if (req.query.categoryId) q.categoryId = req.query.categoryId;
    if (req.query.zoneId) q.zoneId = req.query.zoneId;
    if (req.query.status) q.status = req.query.status;
    const rows = await CivicIssue.find(q)
      .sort({ createdAt: -1 })
      .populate("categoryId")
      .populate("zoneId")
      .limit(80);
    res.json({ issues: rows.map((i) => sanitizeIssue(i, { publicView: true })) });
  } catch (err) {
    next(err);
  }
}

export async function publicIssue(req, res, next) {
  try {
    const issue = await CivicIssue.findOne({ publicId: req.params.publicId })
      .populate("categoryId")
      .populate("zoneId");
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    const evidence = (await Evidence.find({ issueId: issue._id })).map((e) => ({
      evidenceId: e.evidenceId,
      type: e.type,
      publicUrl: e.publicUrl,
      capturedAt: e.capturedAt,
    }));
    const events = (await listEvents(issue._id)).map((ev) => ({
      eventType: ev.eventType,
      fromStatus: ev.fromStatus,
      toStatus: ev.toStatus,
      message: ev.message,
      createdAt: ev.createdAt,
      actorRole: ev.actorRole,
    }));
    res.json({ issue: sanitizeIssue(issue, { publicView: true }), evidence, events });
  } catch (err) {
    next(err);
  }
}
