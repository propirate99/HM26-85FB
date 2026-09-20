import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";
import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wardsPath = path.resolve(__dirname, "../utils/mysuru_wards.geojson");

let wardsGeoJson = null;
function loadWards() {
  if (wardsGeoJson) return wardsGeoJson;
  try {
    if (fs.existsSync(wardsPath)) {
      wardsGeoJson = JSON.parse(fs.readFileSync(wardsPath, "utf-8"));
      return wardsGeoJson;
    }
  } catch (err) {
    console.warn(`[Location] Failed to load mysuru_wards.geojson (${err.message})`);
  }
  return null;
}

// Bounding box for Greater Mysuru Municipal Jurisdiction & Peri-Urban Panchayats
const MYSURU_BOUNDS = {
  minLat: 12.15,
  maxLat: 12.45,
  minLng: 76.50,
  maxLng: 76.80,
};

const googleMapsClient = new Client({});

export function verifyAndMapCoordinates({ lat, lng }) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    const err = new Error("Invalid GPS coordinates provided.");
    err.status = 400;
    throw err;
  }

  // 1. Broad bounding box check
  const inBounds =
    latitude >= MYSURU_BOUNDS.minLat &&
    latitude <= MYSURU_BOUNDS.maxLat &&
    longitude >= MYSURU_BOUNDS.minLng &&
    longitude <= MYSURU_BOUNDS.maxLng;

  if (!inBounds) {
    const err = new Error("Location must be within Mysuru jurisdiction.");
    err.status = 400;
    throw err;
  }

  // 2. Strict Point-in-Polygon Check over 65 MCC Ward Boundaries
  const geojson = loadWards();
  const pt = turf.point([longitude, latitude]);

  let matchedWard = null;
  if (geojson?.features) {
    for (const f of geojson.features) {
      try {
        if (turf.booleanPointInPolygon(pt, f)) {
          matchedWard = f.properties;
          break;
        }
      } catch {
        // continue
      }
    }
  }

  if (matchedWard) {
    return {
      insideJurisdiction: true,
      wardNumber: String(matchedWard.ward_no),
      wardName: matchedWard.name,
      zone: matchedWard.zone_name || `Zone ${matchedWard.zone}`,
      coordinates: [longitude, latitude],
    };
  }

  // If in bounding box but on edge/corridor road, find nearest centroid
  let nearestWard = null;
  let minDist = Infinity;
  if (geojson?.features) {
    for (const f of geojson.features) {
      if (f.properties?.centroid) {
        const cPt = turf.point(f.properties.centroid);
        const d = turf.distance(pt, cPt);
        if (d < minDist) {
          minDist = d;
          nearestWard = f.properties;
        }
      }
    }
  }

  return {
    insideJurisdiction: true,
    wardNumber: nearestWard ? String(nearestWard.ward_no) : "42",
    wardName: nearestWard ? `${nearestWard.name} (Peripheral)` : "Mysuru Urban Peripheral",
    zone: nearestWard?.zone_name || "Mysuru Urban Jurisdiction",
    coordinates: [longitude, latitude],
  };
}

export async function reverseGeocodeGoogle({ lat, lng, fallbackWardName = "Mysuru" }) {
  if (env.googleMapsApiKey) {
    try {
      const res = await googleMapsClient.reverseGeocode({
        params: {
          latlng: { lat: Number(lat), lng: Number(lng) },
          key: env.googleMapsApiKey,
        },
        timeout: 4000,
      });

      if (res.data?.results && res.data.results.length > 0) {
        return res.data.results[0].formatted_address;
      }
    } catch (err) {
      console.warn(`[Geocoding] Google Maps Reverse Geocode API notice: ${err.message}. Using localized ward fallback.`);
    }
  }

  return `${fallbackWardName}, Mysuru, Karnataka (${Number(lat).toFixed(4)}°N, ${Number(lng).toFixed(4)}°E)`;
}
