import { env } from "../config/env.js";
import { createAIProvider } from "../integrations/ai.provider.js";
import { IssueCategory } from "../models/IssueCategory.js";
import { Evidence } from "../models/Evidence.js";
import { hamming } from "./priority.service.js";

const ai = createAIProvider(env);

function band(score) {
  if (score >= 80) return "VERIFIED_WITH_LOW_RISK";
  if (score >= 60) return "VERIFIED_BUT_REVIEWABLE";
  if (score >= 40) return "NEEDS_REVIEW";
  return "INSUFFICIENT_OR_SUSPICIOUS";
}

export async function verifyReport({ report, evidence, duplicateResult }) {
  let score = 0;
  const flags = [];
  const category = await IssueCategory.findById(report.citizenSelectedCategoryId);

  if (evidence?.capturedThroughApp) score += 15;
  else flags.push("NOT_APP_CAPTURED");

  const hasLoc = Boolean(evidence?.location?.coordinates?.length === 2);
  if (hasLoc) score += 10;
  else flags.push("MISSING_GPS");

  if (hasLoc && (evidence.locationAccuracyMeters ?? 999) <= env.gpsAccuracyLimitMeters) {
    score += 5;
  } else if (hasLoc) {
    flags.push("LOW_LOCATION_ACCURACY");
  }

  if (report.zoneMatchStatus === "MATCH") score += 10;
  else if (report.zoneMatchStatus === "MISMATCH") flags.push("ZONE_MISMATCH");
  else flags.push("ZONE_UNAVAILABLE");

  if (evidence?.capturedAt) {
    const ageMs = Math.abs(Date.now() - new Date(evidence.capturedAt).getTime());
    if (ageMs <= 30 * 60 * 1000) score += 10;
    else {
      score += 5;
      flags.push("STALE_TIMESTAMP");
    }
  } else flags.push("MISSING_TIMESTAMP");

  let categoryResult;
  let syntheticResult;
  let relevance;
  let triageResult;
  try {
    triageResult = await ai.triageComplaint({
      text: report.description,
      categoryCode: category?.code,
      image: evidence?.publicUrl,
      duplicateResult,
    });
    categoryResult = await ai.classifyComplaint({
      text: report.description,
      categoryCode: category?.code,
    });
    relevance = await ai.assessImageRelevance({ category, image: evidence?.publicUrl });
    syntheticResult = await ai.assessSyntheticRisk({ image: evidence?.publicUrl });
  } catch {
    triageResult = {
      analyzed: false,
      isFake: false,
      fakeReason: "",
      suggestedCategory: category?.code || "GARBAGE",
      confidence: 0.5,
    };
    categoryResult = { relevant: true, agreesWithCitizen: true, provider: "UNAVAILABLE" };
    relevance = { status: "UNAVAILABLE", confidence: 0 };
    syntheticResult = { status: "UNAVAILABLE", confidence: 0 };
    flags.push("AI_UNAVAILABLE");
  }

  if (categoryResult.relevant !== false && relevance?.status !== "UNLIKELY" && !triageResult.isFake) {
    score += 25;
  } else {
    flags.push("LOW_IMAGE_RELEVANCE");
  }

  if (categoryResult.agreesWithCitizen && triageResult.categoryAgrees) {
    score += 10;
  } else {
    flags.push("CATEGORY_TEXT_MISMATCH");
    if (!triageResult.categoryAgrees && triageResult.suggestedCategory) {
      flags.push(`AI_SUGGESTED_${triageResult.suggestedCategory}`);
    }
  }

  const strongDup =
    duplicateResult?.best &&
    duplicateResult.best.decision === "STRONG" &&
    report.duplicateDecision !== "ATTACHED";
  if (!strongDup) score += 15;
  else flags.push("POSSIBLE_DUPLICATE");

  if (evidence?.perceptualHash) {
    const others = await Evidence.find({
      perceptualHash: { $exists: true },
      _id: { $ne: evidence._id },
    }).limit(40);
    const close = others.find((e) => hamming(e.perceptualHash, evidence.perceptualHash) <= 6);
    if (close && String(close.issueId) !== String(report.issueId)) {
      flags.push("POSSIBLE_DUPLICATE");
    }
  }

  let requiresManualReview = Boolean(
    flags.includes("ZONE_MISMATCH") ||
      flags.includes("AI_UNAVAILABLE") ||
      flags.includes("NOT_APP_CAPTURED") ||
      flags.includes("MISSING_GPS")
  );

  if (syntheticResult?.status === "HIGH_RISK") {
    flags.push("HIGH_SYNTHETIC_RISK");
    requiresManualReview = true;
  }

  if (triageResult.isFake) {
    flags.push("AI_FLAGGED_FAKE");
    if (triageResult.fakeReason) {
      flags.push(`FAKE_REASON_${triageResult.fakeReason}`);
    }
    score = Math.max(0, score - 25);
    requiresManualReview = true;
  }

  const overallStatus = band(score);
  if (overallStatus === "NEEDS_REVIEW" || overallStatus === "INSUFFICIENT_OR_SUSPICIOUS") {
    requiresManualReview = true;
  }

  return {
    imageRelevance: {
      status: relevance?.status || "LIKELY_RELEVANT",
      confidence: relevance?.confidence ?? 0.5,
    },
    syntheticRisk: {
      status: syntheticResult?.status || "LOW_RISK",
      confidence: syntheticResult?.confidence ?? 0.5,
    },
    captureProvenance: evidence?.capturedThroughApp ? "APP_CAPTURE" : "UNKNOWN",
    locationConsistency: hasLoc ? "MATCH" : "UNAVAILABLE",
    timestampPresent: Boolean(evidence?.capturedAt),
    duplicateEvidence: strongDup ? "STRONG_MATCH" : "NO_STRONG_MATCH",
    zoneConsistency: report.zoneMatchStatus,
    overallStatus,
    score,
    requiresManualReview,
    flags,
    aiTriage: triageResult,
    provider: categoryResult.provider || "RULES_AND_AI",
    analyzedAt: new Date(),
  };
}
