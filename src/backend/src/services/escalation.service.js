import { CivicIssue } from "../models/CivicIssue.js";
import { recordEvent } from "./audit.service.js";
import { notify } from "./notification.service.js";

export async function runEscalations() {
  const now = new Date();
  const due = await CivicIssue.find({
    deadline: { $lte: now },
    escalated: false,
    status: { $nin: ["RESOLVED", "REJECTED"] },
  });
  for (const issue of due) {
    const from = issue.status;
    issue.escalated = true;
    issue.escalationReason = "Deadline passed without resolution";
    issue.status = "ESCALATED";
    await issue.save();
    await recordEvent({
      issueId: issue._id,
      actorRole: "SYSTEM",
      eventType: "ESCALATED",
      fromStatus: from,
      toStatus: "ESCALATED",
      message: issue.escalationReason,
    });
    if (issue.assignedOfficerId) {
      await notify({
        userId: issue.assignedOfficerId,
        title: `${issue.publicId} escalated`,
        body: "Deadline passed. Main authority can now see this in the escalation queue.",
        issueId: issue._id,
      });
    }
  }
  return due.length;
}
