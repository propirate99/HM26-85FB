import test from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../src/config/database.js";
import { scoreDuplicates, findNearbyIssues } from "../src/services/duplicate.service.js";
import { IssueCategory } from "../src/models/IssueCategory.js";
import { CivicIssue } from "../src/models/CivicIssue.js";

test("Two-Stage Duplicate Detection Engine", async (t) => {
  await connectDatabase();

  const category = await IssueCategory.findOne({ code: "GARBAGE" });
  assert.ok(category, "GARBAGE category should exist");

  await t.test("Nearby query identifies issues within category radius", async () => {
    // Sayyaji Rao Road coordinates near North Zone
    const results = await findNearbyIssues({
      lng: 76.6412,
      lat: 12.3245,
      categoryId: category._id,
    });

    assert.ok(Array.isArray(results), "findNearbyIssues should return an array");
  });

  await t.test("High spatial & semantic overlap produces STRONG or POSSIBLE duplicate decision", async () => {
    // Existing issue CV-1025 at Devaraja Market: [76.6508, 12.3116]
    const report = {
      capturedLocation: {
        coordinates: [76.6510, 12.3118], // ~28 meters away
      },
      description: "Huge overflow of organic vegetable waste and rotten cabbage near Devaraja Market North entrance",
    };

    const evidence = {
      perceptualHash: "a1b2c3d4e5f67890",
    };

    const duplicateResult = await scoreDuplicates({ report, evidence, category });

    assert.ok(duplicateResult.candidates.length > 0, "Should identify nearby candidates");
    const best = duplicateResult.best;
    assert.ok(best, "Should have a best duplicate candidate");
    assert.ok(best.distanceMeters < 100, `Distance should be close, got ${best.distanceMeters}m`);
    assert.ok(best.duplicateScore >= 50, `Duplicate score should be high, got ${best.duplicateScore}`);
    assert.ok(["STRONG", "POSSIBLE"].includes(best.decision));
  });
});
