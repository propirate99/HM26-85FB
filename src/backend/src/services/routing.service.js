import { Zone } from "../models/Zone.js";

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function zoneForPoint(lng, lat) {
  if (lng == null || lat == null || Number.isNaN(lng) || Number.isNaN(lat)) return null;
  const zones = await Zone.find({ isActive: true });
  return (
    zones.find((z) => {
      const ring = z.geometry?.coordinates?.[0];
      return ring && pointInRing(lng, lat, ring);
    }) || null
  );
}

export function zoneMatchStatus(selectedZoneId, gpsZone) {
  if (!gpsZone) return "UNAVAILABLE";
  if (!selectedZoneId) return "MATCH";
  return String(selectedZoneId) === String(gpsZone._id) ? "MATCH" : "MISMATCH";
}

export async function assignOfficer(zoneId) {
  const { User } = await import("../models/User.js");
  return User.findOne({
    role: "ZONE_OFFICER",
    assignedZoneId: zoneId,
    isActive: true,
  });
}
