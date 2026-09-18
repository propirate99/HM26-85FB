import { env } from "../config/env.js";
import { SystemConfig } from "../models/SystemConfig.js";

export async function getSlaHours() {
  const row = await SystemConfig.findOne({ key: "slas" });
  return row?.value || env.sla;
}

export function deadlineFrom(priority, slaHours, now = new Date()) {
  const hours = slaHours[priority] || slaHours.MEDIUM || 48;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export async function applySla(issue) {
  const sla = await getSlaHours();
  issue.deadline = deadlineFrom(issue.priority, sla);
  issue.escalationAt = issue.deadline;
  return issue;
}
