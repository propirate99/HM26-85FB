import test from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../src/config/database.js";
import { verifyReport } from "../src/services/verification.service.js";
import { IssueCategory } from "../src/models/IssueCategory.js";

test("7-Signal Verification Scoring Engine", async (t) => {
  await connectDatabase();

  const category = await IssueCategory.findOne({ code: "POTHOLE" }) || await IssueCategory.create({
    code: "POTHOLE",
    name: "Pothole",
    duplicateRadiusMeters: 75,
    defaultPriority: "HIGH",
    keywords: ["pothole", "road"],
  });

  await t.test("High-confidence valid complaint earns VERIFIED_WITH_LOW_RISK (80-100)", async () => {
    const report = {
      citizenSelectedCategoryId: category._id,
      zoneMatchStatus: "MATCH",
      description: "Large dangerous pothole with sharp asphalt edges on Sayyaji Rao Road",
      duplicateDecision: "NEW_ISSUE",
    };

    const evidence = {
      capturedThroughApp: true,
      capturedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
      location: { coordinates: [76.64, 12.32] },
      locationAccuracyMeters: 14,
    };

    const duplicateResult = { best: { decision: "CREATE" } };

    const result = await verifyReport({ report, evidence, duplicateResult });

    assert.ok(result.score >= 80, `Expected score >= 80, got ${result.score}`);
    assert.equal(result.overallStatus, "VERIFIED_WITH_LOW_RISK");
    assert.equal(result.requiresManualReview, false);
    assert.equal(result.captureProvenance, "APP_CAPTURE");
    assert.equal(result.locationConsistency, "MATCH");
  });

  await t.test("Missing app-provenance and stale timestamp penalizes score", async () => {
    const report = {
      citizenSelectedCategoryId: category._id,
      zoneMatchStatus: "MATCH",
      description: "Pothole on main road",
      duplicateDecision: "NEW_ISSUE",
    };

    const evidence = {
      capturedThroughApp: false, // -15 pts
      capturedAt: new Date(Date.now() - 48 * 3600 * 1000), // -5 pts (stale)
      location: { coordinates: [76.64, 12.32] },
      locationAccuracyMeters: 15,
    };

    const duplicateResult = { best: { decision: "CREATE" } };

    const result = await verifyReport({ report, evidence, duplicateResult });

    assert.ok(result.flags.includes("NOT_APP_CAPTURED"), "Should flag NOT_APP_CAPTURED");
    assert.ok(result.flags.includes("STALE_TIMESTAMP"), "Should flag STALE_TIMESTAMP");
    assert.ok(result.score < 85, `Score should be docked, got ${result.score}`);
  });

  await t.test("Low location accuracy and zone mismatch flags for manual review", async () => {
    const report = {
      citizenSelectedCategoryId: category._id,
      zoneMatchStatus: "MISMATCH", // -10 pts + flag
      description: "Waterlogged pothole",
      duplicateDecision: "NEW_ISSUE",
    };

    const evidence = {
      capturedThroughApp: true,
      capturedAt: new Date(),
      location: { coordinates: [76.64, 12.32] },
      locationAccuracyMeters: 350, // exceeds 80m limit (-5 pts + flag)
    };

    const result = await verifyReport({ report, evidence, duplicateResult: null });

    assert.ok(result.flags.includes("ZONE_MISMATCH"));
    assert.ok(result.flags.includes("LOW_LOCATION_ACCURACY"));
    assert.equal(result.requiresManualReview, true);
  });
});
