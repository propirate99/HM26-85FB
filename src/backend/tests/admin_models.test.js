import test from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../src/config/database.js";
import { Complaint } from "../src/models/Complaint.js";
import { Media } from "../src/models/Media.js";
import { Logistics } from "../src/models/Logistics.js";
import { Simulation } from "../src/models/Simulation.js";
import { AuditLog } from "../src/models/AuditLog.js";
import { requireRole } from "../src/middleware/requireRole.js";

test("Enterprise Data Models & Admin Access Control Suite", async (t) => {
  await connectDatabase();

  await t.test("Complaint model validation & metrics scoring", async () => {
    const comp = await Complaint.create({
      citizenId: "650000000000000000000001",
      title: "Broken water main valve",
      category: "WATER",
      location: {
        type: "Point",
        coordinates: [76.65, 12.31],
        address: "K.R. Circle, Mysuru",
        zone: "Central Zone",
      },
      verificationMetrics: {
        gpsConfidence: 0.95,
        duplicateConfidence: 0.05,
        aiVisualScore: 90,
        compositeScore: 92,
      },
      status: "TRIAGED",
    });

    assert.equal(comp.title, "Broken water main valve");
    assert.equal(comp.category, "WATER");
    assert.equal(comp.verificationMetrics.compositeScore, 92);
    assert.equal(comp.location.zone, "Central Zone");
  });

  await t.test("Media model supports stage lifecycle and privacy masking", async () => {
    const media = await Media.create({
      complaintId: "650000000000000000000002",
      stage: "BEFORE_INCIDENT",
      fileUrl: "/uploads/evidence_sample.jpg",
      isPublicMasked: false,
      metadata: {
        deviceType: "mobile-pwa",
        exifGps: [76.65, 12.31],
      },
    });

    assert.equal(media.stage, "BEFORE_INCIDENT");
    assert.equal(media.isPublicMasked, false);

    // Toggle masking
    media.isPublicMasked = true;
    await media.save();
    assert.equal(media.isPublicMasked, true);
  });

  await t.test("Logistics model tracking fleet dispatches and material allocations", async () => {
    const dispatch = await Logistics.create({
      complaintId: "650000000000000000000003",
      assignedUnit: {
        vehicleId: "KA-09-SWM-01",
        crewCount: 4,
      },
      dispatchStatus: "EN_ROUTE",
      materialAllocations: [
        { item: "Cold Mix Asphalt (50kg bags)", quantity: 5, unit: "bags" },
      ],
      eta: new Date(Date.now() + 30 * 60 * 1000),
    });

    assert.equal(dispatch.assignedUnit.vehicleId, "KA-09-SWM-01");
    assert.equal(dispatch.dispatchStatus, "EN_ROUTE");
    assert.equal(dispatch.materialAllocations.length, 1);
    assert.equal(dispatch.materialAllocations[0].quantity, 5);
  });

  await t.test("Simulation model persists scenario stress-test projections", async () => {
    const sim = await Simulation.create({
      scenarioName: "Dasara Monsoon Test",
      category: "FLOOD_PREDICTION",
      parameters: {
        intensityFactor: 2.5,
        affectedZones: ["Central Zone", "South Zone"],
        durationHours: 6,
      },
      projectedImpact: {
        incidentVolumeEstimate: 145,
        crewShortageEstimate: 35,
      },
    });

    assert.equal(sim.category, "FLOOD_PREDICTION");
    assert.equal(sim.projectedImpact.incidentVolumeEstimate, 145);
    assert.equal(sim.parameters.affectedZones.includes("Central Zone"), true);
  });

  await t.test("AuditLog enforces state diffing and immutable telemetry", async () => {
    const audit = await AuditLog.create({
      entityId: "650000000000000000000004",
      actorId: "650000000000000000000005",
      action: "SCORE_OVERRIDDEN",
      diff: {
        before: { compositeScore: 75 },
        after: { compositeScore: 92 },
        reason: "Commissioner verified street camera",
      },
    });

    assert.equal(audit.action, "SCORE_OVERRIDDEN");
    assert.equal(audit.diff.after.compositeScore, 92);
  });

  await t.test("requireRole middleware handles case-insensitive and normalized admin roles", () => {
    const mwAdmin = requireRole("admin");
    const mwAuth = requireRole("MAIN_AUTHORITY");

    let called = false;
    const next = () => { called = true; };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
      },
    };

    // Admin user should pass both
    called = false;
    mwAdmin({ user: { role: "admin" } }, res, next);
    assert.equal(called, true);

    called = false;
    mwAdmin({ user: { role: "MAIN_AUTHORITY" } }, res, next);
    assert.equal(called, true);

    called = false;
    mwAuth({ user: { role: "admin" } }, res, next);
    assert.equal(called, true);

    // Citizen should fail with 403
    called = false;
    const mockRes = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json() {},
    };
    mwAdmin({ user: { role: "citizen" } }, mockRes, next);
    assert.equal(called, false);
    assert.equal(mockRes.statusCode, 403);
  });
});
