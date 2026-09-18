import { Evidence } from "../models/Evidence.js";
import { getStorageProvider } from "../integrations/storage.provider.js";
import { createAIProvider } from "../integrations/ai.provider.js";
import { env } from "../config/env.js";
import { nextId, sha256, perceptualHash } from "./priority.service.js";
import { recordEvent } from "./audit.service.js";
import { changeStatus } from "./issue.service.js";

const storage = getStorageProvider();
const ai = createAIProvider(env);

export async function addResolutionEvidence(issue, user, file, meta) {
  if (!file) {
    const err = new Error("After-photo is required");
    err.status = 400;
    throw err;
  }
  const evidenceId = await nextId(Evidence, "evidenceId", "E");
  const stored = await storage.save({
    buffer: file.buffer,
    mimeType: file.mimetype,
    key: evidenceId,
  });
  const evidence = await Evidence.create({
    evidenceId,
    issueId: issue._id,
    type: "AFTER",
    storageKey: stored.storageKey,
    publicUrl: stored.publicUrl,
    mimeType: file.mimetype,
    fileSize: file.size,
    sha256: sha256(file.buffer),
    perceptualHash: await perceptualHash(file.buffer),
    capturedThroughApp: true,
    capturedAt: new Date(),
  });
  const before = await Evidence.findOne({ issueId: issue._id, type: "BEFORE" });
  let comparison = { note: "No before photo" };
  try {
    comparison = await ai.compareResolution({
      beforeImage: before?.publicUrl,
      afterImage: evidence.publicUrl,
    });
  } catch {
    comparison = { provider: "UNAVAILABLE", note: "AI comparison unavailable" };
  }
  evidence.aiAssessment = comparison;
  await evidence.save();
  await recordEvent({
    issueId: issue._id,
    actorId: user._id,
    actorRole: user.role,
    eventType: "RESOLUTION_EVIDENCE",
    message: meta?.message || "After-photo uploaded",
    metadata: comparison,
  });
  if (issue.status === "IN_PROGRESS") {
    await changeStatus(issue, { user, status: "RESOLUTION_REVIEW", message: "After-photo submitted" });
  }
  return { evidence, comparison };
}
