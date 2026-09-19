import swmData from "../assets/data/swm.json";
import wardsGeoJson from "../assets/data/wards.geojson";
import facilitiesGeoJson from "../assets/data/facilities.geojson";
import { api } from "../api/client.js";

/**
 * Service to retrieve SWM ward operational data, facilities, and geojson boundaries.
 */
export const swmApi = {
  /**
   * Get raw or enriched wards data with current operational metrics.
   */
  async getWards(params = {}) {
    try {
      const data = await api.get("/swm/wards");
      return data;
    } catch {
      // Offline/Static fallback directly from bundled dataset
      return {
        wards: swmData.wards,
        facilities: swmData.facilities,
        daily: swmData.daily,
      };
    }
  },

  /**
   * Get 65 wards polygon GeoJSON.
   */
  async getWardsGeoJson() {
    try {
      const data = await api.get("/swm/geojson/wards");
      return data;
    } catch {
      return wardsGeoJson;
    }
  },

  /**
   * Get processing facilities GeoJSON.
   */
  async getFacilitiesGeoJson() {
    try {
      const data = await api.get("/swm/geojson/facilities");
      return data;
    } catch {
      return facilitiesGeoJson;
    }
  },

  /**
   * Get full bundled data synchronously.
   */
  getStaticData() {
    return {
      swmData,
      wardsGeoJson,
      facilitiesGeoJson,
    };
  },
};
