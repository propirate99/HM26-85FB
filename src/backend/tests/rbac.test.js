import test from "node:test";
import assert from "node:assert/strict";
import { assertOfficerZone, canTransition } from "../src/services/issue.service.js";

test("Role-Based Access Control (RBAC) & Zonal Boundaries", async (t) => {
  const northOfficer = {
    _id: "user-north-1",
    role: "ZONE_OFFICER",
    assignedZoneId: "zone-north-100",
  };

  const southOfficer = {
    _id: "user-south-2",
    role: "ZONE_OFFICER",
    assignedZoneId: "zone-south-200",
  };

  const commissioner = {
    _id: "user-admin-999",
    role: "MAIN_AUTHORITY",
  };

  const northIssue = {
    _id: "issue-1024",
    publicId: "CV-1024",
    zoneId: "zone-north-100",
    status: "ASSIGNED",
  };

  await t.test("North officer is authorized to act on North Zone issue", async () => {
    await assert.doesNotReject(async () => {
      await assertOfficerZone(northOfficer, northIssue);
    });
  });

  await t.test("South officer is FORBIDDEN (403) from modifying North Zone issue", async () => {
    await assert.rejects(
      async () => {
        await assertOfficerZone(southOfficer, northIssue);
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /outside your assigned zone/i);
        return true;
      }
    );
  });

  await t.test("Main Authority (Commissioner) has global override access to all zones", async () => {
    await assert.doesNotReject(async () => {
      await assertOfficerZone(commissioner, northIssue);
    });
  });

  await t.test("Status transition state machine validation", () => {
    // Valid transitions for Zone Officer
    assert.equal(canTransition("ZONE_OFFICER", "VERIFIED", "ASSIGNED"), true);
    assert.equal(canTransition("ZONE_OFFICER", "ASSIGNED", "ACKNOWLEDGED"), true);
    assert.equal(canTransition("ZONE_OFFICER", "ACKNOWLEDGED", "IN_PROGRESS"), true);
    assert.equal(canTransition("ZONE_OFFICER", "IN_PROGRESS", "RESOLUTION_REVIEW"), true);

    // Invalid skip for Zone Officer (cannot resolve without review progression)
    assert.equal(canTransition("ZONE_OFFICER", "SUBMITTED", "RESOLVED"), false);
    assert.equal(canTransition("ZONE_OFFICER", "ACKNOWLEDGED", "RESOLVED"), false);

    // Main Authority can override to any status
    assert.equal(canTransition("MAIN_AUTHORITY", "ESCALATED", "RESOLVED"), true);
    assert.equal(canTransition("MAIN_AUTHORITY", "NEEDS_REVIEW", "REJECTED"), true);
  });
});
