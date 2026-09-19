import test from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../src/config/database.js";
import { MockAIProvider, GeminiAIProvider } from "../src/integrations/ai.provider.js";
import { verifyReport } from "../src/services/verification.service.js";
import { createIssueFromReport } from "../src/services/issue.service.js";
import { IssueCategory } from "../src/models/IssueCategory.js";
import { User } from "../src/models/User.js";
import { Report } from "../src/models/Report.js";

test("AI Complaint Management & Triage Suite", async (t) => {
  await connectDatabase();

  const provider = new MockAIProvider();

  await t.test("AI accurately auto-categorizes garbage complaints and extracts tags", async () => {
    const result = await provider.triageComplaint({
      text: "Massive open garbage dump and overflowing waste bin near Vidyaranyapuram circle with foul smell",
      categoryCode: "GARBAGE",
    });

    assert.equal(result.isFake, false);
    assert.equal(result.suggestedCategory, "GARBAGE");
    assert.equal(result.categoryAgrees, true);
    assert.ok(result.confidence >= 0.8);
    assert.ok(result.extractedTags.includes("solid_waste") || result.extractedTags.includes("overflowing_bin"));
  });

  await t.test("AI flags fake/gibberish complaints and marks them with fakeReason", async () => {
    const result = await provider.triageComplaint({
      text: "asdf qwerty 12345",
      categoryCode: "GARBAGE",
    });

    assert.equal(result.isFake, true);
    assert.equal(result.fakeReason, "GIBBERISH_OR_SPAM");
    assert.ok(result.confidence >= 0.9);
  });

  await t.test("AI identifies critical public hazard severity", async () => {
    const result = await provider.triageComplaint({
      text: "High voltage sparking electrical wire hanging near hospital entrance dangerous hazard",
      categoryCode: "STREETLIGHT",
    });

    assert.equal(result.isFake, false);
    assert.equal(result.suggestedCategory, "STREETLIGHT");
    assert.equal(result.severity, "CRITICAL");
  });

  await t.test("GeminiAIProvider graceful circuit breaker with missing key", async () => {
    const gemini = new GeminiAIProvider({ apiKey: "", model: "gemini-2.5-flash" });
    const check = await gemini.testConnection();
    assert.equal(check.ok, false);

    // Should fall back to heuristic response seamlessly without throwing
    const fallback = await gemini.triageComplaint({
      text: "Deep pothole filled with rainwater on KRS road causing bike skids",
      categoryCode: "POTHOLE",
    });

    assert.equal(fallback.isFake, false);
    assert.equal(fallback.suggestedCategory, "POTHOLE");
    assert.ok(fallback.provider.includes("mock"));
  });

  await t.test("verifyReport attaches aiTriage and penalizes fake entries", async () => {
    const category = await IssueCategory.findOne({ code: "GARBAGE" }) || await IssueCategory.create({
      code: "GARBAGE",
      name: "Garbage",
      duplicateRadiusMeters: 50,
      defaultPriority: "MEDIUM",
      keywords: ["waste", "garbage"],
    });

    const fakeReport = {
      citizenSelectedCategoryId: category._id,
      zoneMatchStatus: "MATCH",
      description: "qwerty asdf", // gibberish
      duplicateDecision: "NEW_ISSUE",
    };

    const evidence = {
      capturedThroughApp: true,
      capturedAt: new Date(),
      location: { coordinates: [76.64, 12.30] },
      locationAccuracyMeters: 10,
    };

    const verification = await verifyReport({ report: fakeReport, evidence, duplicateResult: null });

    assert.ok(verification.aiTriage, "aiTriage should be present in verification");
    assert.equal(verification.aiTriage.isFake, true);
    assert.ok(verification.flags.includes("AI_FLAGGED_FAKE"));
    assert.equal(verification.requiresManualReview, true);
  });

  await t.test("createIssueFromReport preserves aiTriage and routes fake to NEEDS_REVIEW", async () => {
    const category = await IssueCategory.findOne({ code: "GARBAGE" });
    const user = await User.findOne({ role: "CITIZEN" }) || await User.create({
      name: "Test Citizen",
      email: "citizen.test@mysuru.local",
      role: "CITIZEN",
    });

    const report = await Report.create({
      reportId: `R-TEST-${Date.now()}`,
      citizenId: user._id,
      citizenSelectedCategoryId: category._id,
      description: "Severe blocked drainage overflow flooding street",
      capturedLocation: { type: "Point", coordinates: [76.6394, 12.2958] },
      zoneMatchStatus: "MATCH",
      aiTriage: {
        analyzed: true,
        provider: "mock",
        isFake: false,
        suggestedCategory: "DRAIN",
        confidence: 0.92,
        severity: "HIGH",
        duplicateScore: 0,
      },
    });

    const issue = await createIssueFromReport(report, { actor: user });
    assert.ok(issue.aiTriage, "CivicIssue must retain aiTriage metadata");
    assert.equal(issue.aiTriage.suggestedCategory, "DRAIN");
  });
});
