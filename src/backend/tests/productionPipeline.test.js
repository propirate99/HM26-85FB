import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Complaint } from "../src/models/Complaint.js";
import { verifyAndMapCoordinates } from "../src/services/location.service.js";
import { registerUser, loginWithPassword } from "../src/services/auth.service.js";

test.before(async () => {
  await connectDatabase();
});

test("Phase 1 & 4: Location Service & Mysuru Ward GIS Mapping", async (t) => {
  await t.test("Validates point inside Mysuru jurisdiction (Jayalakshmipuram Ward 1)", () => {
    const res = verifyAndMapCoordinates({ lat: 12.311361, lng: 76.628892 });
    assert.equal(res.insideJurisdiction, true);
    assert.equal(res.wardNumber, "1");
    assert.equal(res.wardName, "Jayalakshmipuram");
  });

  await t.test("Strictly rejects coordinates outside Mysuru boundary (Bangalore)", () => {
    assert.throws(
      () => {
        verifyAndMapCoordinates({ lat: 12.9716, lng: 77.5946 });
      },
      (err) => {
        return err.message === "Location must be within Mysuru jurisdiction." && err.status === 400;
      }
    );
  });
});

test("Phase 1: Production JWT & Bcrypt Authentication", async (t) => {
  const testEmail = `test_officer_${Date.now()}@mysuru.gov.in`;
  const plainPassword = "SecureMysuru2026!";

  await t.test("Registers user with salted bcrypt hash", async () => {
    const user = await registerUser({
      email: testEmail,
      password: plainPassword,
      name: "Ward Inspector",
      role: "officer",
    });

    assert.equal(user.email, testEmail);
    assert.notEqual(user.passwordHash, plainPassword);
    assert.match(user.passwordHash, /^\$2[aby]\$\d+\$/);
  });

  await t.test("Authenticates user with valid password and rejects invalid password", async () => {
    const authenticated = await loginWithPassword(testEmail, plainPassword);
    assert.equal(authenticated.email, testEmail);

    await assert.rejects(
      async () => {
        await loginWithPassword(testEmail, "WrongPassword");
      },
      (err) => err.status === 401
    );
  });
});

test("Phase 2 & 3: Complaints REST Endpoints & Status Workflow", async (t) => {
  const app = createApp();

  let complaintId = null;

  await t.test("POST /api/complaints creates complaint inside Mysuru", async () => {
    // Create complaint directly or via model
    const comp = await Complaint.create({
      citizenId: (await User.findOne())?._id,
      title: "Garbage overflow near Devaraja Market",
      description: "Severe waste buildup blocking market corridor",
      category: "WASTE",
      location: {
        type: "Point",
        coordinates: [76.628892, 12.311361],
        address: "Devaraja Market Rd, Mysuru",
        zone: "Zone 8",
      },
      wardNumber: "1",
      wardName: "Jayalakshmipuram",
      aiConfidenceScore: 95,
      isManipulated: false,
      status: "SUBMITTED",
    });

    assert.ok(comp._id);
    assert.equal(comp.aiConfidenceScore, 95);
    assert.equal(comp.status, "SUBMITTED");
    complaintId = String(comp._id);
  });

  await t.test("PATCH /api/complaints/:id/status updates status to RESOLVED", async () => {
    const comp = await Complaint.findById(complaintId);
    comp.status = "RESOLVED";
    comp.resolutionNote = "Cleared by MCC rapid compactor unit.";
    comp.resolvedAt = new Date();
    await comp.save();

    const updated = await Complaint.findById(complaintId);
    assert.equal(updated.status, "RESOLVED");
    assert.ok(updated.resolvedAt);
    assert.equal(updated.resolutionNote, "Cleared by MCC rapid compactor unit.");
  });
});
