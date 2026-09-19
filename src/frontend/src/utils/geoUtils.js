// Mysuru SWM Geospatial Utilities

const EARTH_RADIUS_KM = 6371.0;
export const ROAD_DETOUR_FACTOR = 1.34;

/**
 * Calculate Haversine distance between two [longitude, latitude] or (lat, lng) pairs.
 * @param {Array<number>|number} a - [lng, lat] or lat1
 * @param {Array<number>|number} b - [lng, lat] or lng1
 * @param {number} [c] - lat2 if using scalar coordinates
 * @param {number} [d] - lng2 if using scalar coordinates
 * @returns {number} distance in kilometers
 */
export function haversine(a, b, c, d) {
  let lat1, lon1, lat2, lon2;

  if (Array.isArray(a) && Array.isArray(b)) {
    // Array format: [longitude, latitude]
    lon1 = a[0];
    lat1 = a[1];
    lon2 = b[0];
    lat2 = b[1];
  } else {
    lat1 = a;
    lon1 = b;
    lat2 = c;
    lon2 = d;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Estimate actual city road driving distance in kilometers.
 * Detour factor calibrated for Mysuru's urban road topology.
 */
export function roadKm(crowFlyKm) {
  return Number((crowFlyKm * ROAD_DETOUR_FACTOR + 0.5).toFixed(1));
}

/**
 * Helper to clamp a number between low and high boundaries.
 */
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Format number in Indian numbering format with specified decimal digits.
 */
export function formatInr(n, digits = 1) {
  return Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
