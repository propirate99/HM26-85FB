import { IssueEvent } from "../models/IssueEvent.js";

export async function recordEvent({
  issueId,
  actorId,
  actorRole,
  eventType,
  fromStatus,
  toStatus,
  message,
  metadata,
}) {
  return IssueEvent.create({
    issueId,
    actorId,
    actorRole,
    eventType,
    fromStatus,
    toStatus,
    message,
    metadata,
  });
}

export async function listEvents(issueId) {
  return IssueEvent.find({ issueId }).sort({ createdAt: 1 }).populate("actorId", "name role");
}
