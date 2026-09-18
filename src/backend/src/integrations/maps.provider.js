export function approximateLabel(lng, lat) {
  if (lng == null || lat == null) return "Location unavailable";
  const rLng = Math.round(lng * 200) / 200;
  const rLat = Math.round(lat * 200) / 200;
  return `Near ${rLat.toFixed(3)}°N, ${rLng.toFixed(3)}°E (approximate)`;
}

export const mapsProvider = { approximateLabel };
