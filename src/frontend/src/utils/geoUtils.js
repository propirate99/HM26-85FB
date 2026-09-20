// Mysuru SWM Geospatial Utilities

const EARTH_RADIUS_KM = 6371.0;
export const ROAD_DETOUR_FACTOR = 1.34;

function extractLatLon(val) {
  if (!val) return [0, 0];
  if (Array.isArray(val)) {
    // If first element is > 40 and second is <= 40, it is GeoJSON format [longitude, latitude]
    if (Math.abs(val[0]) > 40 && Math.abs(val[1]) <= 40) {
      return [Number(val[1]), Number(val[0])];
    }
    // Otherwise Leaflet format [latitude, longitude]
    return [Number(val[0]), Number(val[1])];
  }
  if (typeof val === "object") {
    const lat = val.lat ?? val.latitude ?? 0;
    const lon = val.lng ?? val.lon ?? val.longitude ?? 0;
    return [Number(lat), Number(lon)];
  }
  return [Number(val) || 0, 0];
}

/**
 * Calculate Haversine distance between two coordinates.
 * Accepts:
 * - (a, b) where a, b are [lng, lat], [lat, lng], or { lat, lng } / { latitude, longitude } objects
 * - (lat1, lon1, lat2, lon2) scalar numbers
 * @returns {number} distance in kilometers
 */
export function haversine(a, b, c, d) {
  let lat1, lon1, lat2, lon2;

  if (c !== undefined && d !== undefined) {
    lat1 = Number(a) || 0;
    lon1 = Number(b) || 0;
    lat2 = Number(c) || 0;
    lon2 = Number(d) || 0;
  } else {
    [lat1, lon1] = extractLatLon(a);
    [lat2, lon2] = extractLatLon(b);
  }

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;

  // Clamp h between 0 and 1 to prevent floating-point precision NaN in Math.asin
  const safeH = Math.min(1, Math.max(0, h));
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(safeH));
}

/**
 * Estimate actual city road driving distance in kilometers.
 * Detour factor calibrated for Mysuru's urban road topology.
 */
export function roadKm(crowFlyKm) {
  const km = Number(crowFlyKm);
  if (!km || isNaN(km) || km <= 0) return 0;
  return Number((km * ROAD_DETOUR_FACTOR + 0.5).toFixed(1));
}

/**
 * Helper to clamp a number between low and high boundaries.
 */
export function clamp(v, lo, hi) {
  const num = Number(v) || 0;
  return Math.max(lo, Math.min(hi, num));
}

/**
 * Format number in Indian numbering format with specified decimal digits.
 */
export function formatInr(n, digits = 1) {
  const num = Number(n);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

