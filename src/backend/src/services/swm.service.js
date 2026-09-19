import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

let swmCache = null;
let wardsGeoCache = null;
let facilitiesGeoCache = null;

function loadJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  }
  return null;
}

export const swmService = {
  getSwmData() {
    if (!swmCache) {
      swmCache = loadJson("swm.json") || { wards: [], facilities: [], daily: [] };
    }
    return swmCache;
  },

  getWardsGeoJson() {
    if (!wardsGeoCache) {
      wardsGeoCache = loadJson("wards.geojson") || { type: "FeatureCollection", features: [] };
    }
    return wardsGeoCache;
  },

  getFacilitiesGeoJson() {
    if (!facilitiesGeoCache) {
      facilitiesGeoCache = loadJson("facilities.geojson") || { type: "FeatureCollection", features: [] };
    }
    return facilitiesGeoCache;
  },

  getWardsSummary(zoneFilter = null) {
    const data = this.getSwmData();
    let wards = data.wards || [];
    if (zoneFilter && zoneFilter !== "all") {
      wards = wards.filter((w) => String(w.zone) === String(zoneFilter));
    }
    return {
      totalWards: wards.length,
      facilities: data.facilities || [],
      wards,
    };
  },
};
