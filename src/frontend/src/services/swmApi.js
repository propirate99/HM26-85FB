import summaryCsv from "../assets/data/MCC_ward_waste_summary_2026-08-20_to_2026-09-18.csv?raw";
import scenarioCsv from "../assets/data/mysuru-swm-scenario.csv?raw";
import swmData from "../assets/data/swm.json";
import wardsGeoJson from "../assets/data/wards.geojson";
import facilitiesGeoJson from "../assets/data/facilities.geojson";
import { api } from "../api/client.js";

function parseCsv(text) {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i]?.trim() ?? "";
    });
    return row;
  });
}

/**
 * Service to retrieve SWM ward operational data, facilities, geojson, and CSV extracts.
 */
export const swmApi = {
  async getWards() {
    try {
      return await api.get("/swm/wards");
    } catch {
      return {
        wards: swmData.wards,
        facilities: swmData.facilities,
        daily: swmData.daily,
      };
    }
  },

  async getWardsGeoJson() {
    try {
      return await api.get("/swm/geojson/wards");
    } catch {
      return wardsGeoJson;
    }
  },

  async getFacilitiesGeoJson() {
    try {
      return await api.get("/swm/geojson/facilities");
    } catch {
      return facilitiesGeoJson;
    }
  },

  getStaticData() {
    return {
      swmData,
      wardsGeoJson,
      facilitiesGeoJson,
      wardSummary: parseCsv(summaryCsv),
      scenarioRows: parseCsv(scenarioCsv),
    };
  },
};
