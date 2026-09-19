import { haversine, clamp, ROAD_DETOUR_FACTOR } from "../utils/geoUtils.js";

export const DEFAULT_CONFIG = {
  gen: 600, // city generation tonnes/day
  segUplift: 0, // source segregation uplift pts
  tolerance: 1.6, // bin overflow tolerance factor (x day load)

  // Primary fleet (auto tippers, door-to-door)
  tippers: 168,
  tipperCap: 1.1, // payload tonnes
  tipperTrips: 4, // max trips/vehicle/day
  tipperFuel: 9.5, // L/100 km

  // Secondary fleet (compactors & dumper placers)
  compactors: 46,
  compactorCap: 7.5, // payload tonnes (Simulator 2)
  compactorTrips: 3, // max trips/vehicle/day
  compactorFuel: 32.0, // L/100 km

  // Operational policies & costs
  shift: 7.5, // shift hours
  night: false, // night secondary haulage bonus
  congestion: 18, // city traffic delay %
  diesel: 91, // diesel price in INR/L
  freq: 7, // base pickups per week
  freqMode: "uniform", // uniform | core | density
  routeRule: "nearest", // nearest | balanced | zone
  newPoints: 0, // collection point expansion %
  ptMode: "uniform",
  serviceMin: 3.5, // minutes per collection point
  tipMin: 14, // unload/tip minutes at facility
  vLocal: 11, // in-ward speed km/h
  vHaul: 26, // haul speed km/h
  transfer: false, // Bannimantap transfer station
  selected: new Set(),
};

const PRIMARY_SPLIT = 0.7; // 70% door-to-door tipper, 30% secondary

function getPickups(w, cfg) {
  const base = cfg.freq;
  if (cfg.freqMode === "core") {
    const boost = 1 + clamp(w.density_t_km2 / 28, 0, 1);
    return clamp(Math.round(base * boost), 1, 14);
  }
  if (cfg.freqMode === "density") {
    const q = clamp(w.density_t_km2 / 34, 0, 1.6);
    return clamp(Math.round(base * (0.62 + q)), 1, 14);
  }
  return base;
}

function getFacilities(cfg, facGeoJson) {
  const list = facGeoJson.features.map((f) => ({
    name: f.properties.name,
    kind: f.properties.kind,
    cap: f.properties.capacity_tpd,
    pos: f.geometry.coordinates,
    inbound: 0,
  }));
  if (cfg.transfer) {
    list.push({
      name: "Bannimantap Transfer Station",
      kind: "transfer",
      cap: 180,
      pos: [76.6605, 12.3268],
      inbound: 0,
      transfer: true,
    });
  }
  return list;
}

/**
 * Execute 1-day deterministic logistics simulation across 65 MCC wards.
 * @param {object} customCfg - Scenario simulation options
 * @param {object} wardsGeoJson - FeatureCollection of 65 wards
 * @param {object} facGeoJson - FeatureCollection of processing facilities
 */
export function runSimulation(customCfg, wardsGeoJson, facGeoJson) {
  const cfg = { ...DEFAULT_CONFIG, ...customCfg };
  const totalBaseTpd = wardsGeoJson.meta?.total_waste_tpd || 600.0;
  const genScale = cfg.gen / totalBaseTpd;
  const facs = getFacilities(cfg, facGeoJson);
  const landfill = facs.find((f) => f.kind === "landfill");
  const congestion = 1 + cfg.congestion / 100;

  // Fleet time budgets in minutes/day
  const nightBonus = cfg.night ? 1.35 : 1;
  const tipperMin = cfg.tippers * cfg.shift * 60;
  const compMin = cfg.compactors * cfg.shift * 60 * nightBonus;

  // Pass 1: per-ward demand, time cost, and facility routing
  const wards = wardsGeoJson.features.map((f) => {
    const p = f.properties;
    const freq = getPickups(p, cfg);
    const dayFactor = clamp(7 / freq, 1, 3.5);
    const gen = p.waste_tpd * genScale;

    let ptGrowth = 0;
    if (cfg.ptMode === "uniform") ptGrowth = cfg.newPoints / 100;
    else if (cfg.ptMode === "deficit") {
      ptGrowth = (cfg.newPoints / 100) * clamp(p.density_t_km2 / 26, 0.25, 2.1);
    } else if (cfg.selected?.has?.(p.ward_no)) {
      ptGrowth = (cfg.newPoints / 100) * 1.6;
    }
    const points = Math.max(1, Math.round(p.collection_points * (1 + ptGrowth)));

    const seg = clamp(p.segregation_rate + cfg.segUplift / 100, 0.2, 0.98);
    const handlingGain = 1 - (0.16 * (seg - p.segregation_rate)) / 0.35;

    // Primary door-to-door leg
    const genPrimary = gen * PRIMARY_SPLIT;
    const genSecondary = gen - genPrimary;
    const tonnesPerVisit = gen * dayFactor;
    const loadsPerVisit = (genPrimary * dayFactor) / (cfg.tipperCap * 0.92);
    const serviceMin =
      points * cfg.serviceMin * p.narrow_lane_factor * congestion * handlingGain;
    const inWardKm = p.road_km * 0.55 * clamp(1 - 0.18 * ptGrowth, 0.65, 1.1);
    const inWardMin = (inWardKm / cfg.vLocal) * 60 * congestion;

    // Facility choice
    let fac;
    if (cfg.routeRule === "zone") {
      fac = facs[(p.zone - 1) % facs.length];
    } else {
      const scored = facs
        .map((fc) => {
          const d = haversine(p.centroid, fc.pos) * ROAD_DETOUR_FACTOR;
          const pen =
            cfg.routeRule === "balanced"
              ? (fc.inbound / Math.max(1, fc.cap)) * 6
              : 0;
          return { fc, d, s: d + pen };
        })
        .sort((a, b) => a.s - b.s);
      fac = scored[0].fc;
    }

    const haulKm = haversine(p.centroid, fac.pos) * ROAD_DETOUR_FACTOR;
    const haulMin = (haulKm / cfg.vHaul) * 60 * 2 + cfg.tipMin;

    const primaryMinPerVisit = serviceMin + inWardMin + loadsPerVisit * haulMin;
    const primaryVisitsPerDay = freq / 7;
    const primaryMinPerDay = primaryMinPerVisit * primaryVisitsPerDay;
    const primaryTripsPerDay = loadsPerVisit * primaryVisitsPerDay;
    const primaryKmPerDay =
      (inWardKm + loadsPerVisit * haulKm * 2) * primaryVisitsPerDay;

    // Secondary fleet haulage
    const secondaryLoads = genSecondary / (cfg.compactorCap * 0.9);
    const bulkStops = Math.max(2, Math.round(points * 0.12));
    const secondaryMinPerDay =
      secondaryLoads * haulMin + bulkStops * 6 * congestion;

    fac.inbound += gen;

    return {
      ward_no: p.ward_no,
      name: p.name,
      zone: p.zone,
      zone_name: p.zone_name,
      area: p.area_km2,
      pop: p.population,
      gen,
      freq,
      dayFactor,
      points,
      seg,
      density: gen / Math.max(p.area_km2, 0.05),
      accum: tonnesPerVisit,
      overflow: tonnesPerVisit > gen * cfg.tolerance,
      centroid: p.centroid,
      facility: fac,
      haulKm,
      haulMin,
      primaryMinPerDay,
      primaryTripsPerDay,
      secondaryMinPerDay,
      secondaryLoads,
      inWardKm: inWardKm * primaryVisitsPerDay,
      primaryKmPerDay,
      genPrimary,
      genSecondary,
      maxTrips: cfg.tipperTrips,
      secondaryTripCap: cfg.compactorTrips,
      lane: p.narrow_lane_factor,
    };
  });

  // Pass 2: allocate scarce fleet capacity (priority: overflow risk, then density)
  const order = [...wards].sort(
    (a, b) => b.overflow - a.overflow || b.density - a.density
  );

  let tipperLeft = tipperMin,
    compLeft = compMin;
  let tipTripsLeft = cfg.tippers * cfg.tipperTrips;
  let compTripsLeft = cfg.compactors * cfg.compactorTrips * nightBonus;

  for (const w of order) {
    const pTime =
      w.primaryMinPerDay > 0
        ? clamp(tipperLeft / w.primaryMinPerDay, 0, 1)
        : 1;
    const pTrip =
      w.primaryTripsPerDay > 0
        ? clamp(tipTripsLeft / w.primaryTripsPerDay, 0, 1)
        : 1;
    const pShare = Math.min(pTime, pTrip);

    const sTime =
      w.secondaryMinPerDay > 0
        ? clamp(compLeft / w.secondaryMinPerDay, 0, 1)
        : 1;
    const sTrip =
      w.secondaryLoads > 0 ? clamp(compTripsLeft / w.secondaryLoads, 0, 1) : 1;
    const sShare = Math.min(sTime, sTrip);

    w.primaryShare = pShare;
    w.secondaryShare = sShare;
    w.share = PRIMARY_SPLIT * pShare + (1 - PRIMARY_SPLIT) * sShare;

    tipperLeft -= w.primaryMinPerDay * pShare;
    tipTripsLeft -= w.primaryTripsPerDay * pShare;
    compLeft -= w.secondaryMinPerDay * sShare;
    compTripsLeft -= w.secondaryLoads * sShare;

    w.collected = w.gen * w.share;
    w.uncollected = w.gen - w.collected;
    w.coverage = w.gen > 0 ? w.share : 1;
    w.trips = w.primaryTripsPerDay * pShare + w.secondaryLoads * sShare;

    const pKm = w.primaryKmPerDay * pShare;
    const sKm = w.haulKm * 2 * w.secondaryLoads * sShare;
    w.km = pKm + sKm;
    w.fuel = (pKm * cfg.tipperFuel) / 100 + (sKm * cfg.compactorFuel) / 100;
    w.minutes = w.primaryMinPerDay * pShare + w.secondaryMinPerDay * sShare;
  }

  // Pass 3: facility capacity and diversion to landfill
  facs.forEach((f) => {
    f.inbound = 0;
    f.processed = 0;
    f.diverted = 0;
  });
  wards.forEach((w) => {
    w.facility.inbound += w.collected;
  });
  let diverted = 0;
  facs.forEach((f) => {
    f.processed = Math.min(f.inbound, f.cap);
    f.diverted = Math.max(0, f.inbound - f.cap);
    if (f !== landfill) diverted += f.diverted;
  });
  if (landfill) {
    landfill.inbound += diverted;
    landfill.processed = Math.min(landfill.inbound, landfill.cap);
    landfill.diverted = Math.max(0, landfill.inbound - landfill.cap);
  }

  // Aggregate KPIs
  const sum = (k) => wards.reduce((t, w) => t + (w[k] || 0), 0);
  const gen = sum("gen");
  const collected = sum("collected");
  const uncollected = sum("uncollected");
  const km = sum("km");
  const fuel = sum("fuel");
  const trips = sum("trips");
  const processed = facs
    .filter((f) => f.kind !== "landfill")
    .reduce((t, f) => t + f.processed, 0);
  const toLandfill = landfill ? landfill.processed : 0;
  const unmanaged = landfill ? landfill.diverted : 0;

  const usedTipperMin = wards.reduce(
    (t, w) => t + w.primaryMinPerDay * w.primaryShare,
    0
  );
  const usedCompMin = wards.reduce(
    (t, w) => t + w.secondaryMinPerDay * w.secondaryShare,
    0
  );

  const fuelCost = fuel * cfg.diesel;
  const labourCost = (cfg.tippers * 2 + cfg.compactors * 2) * 780;
  const tipFee = collected * 310;
  const cost = fuelCost + labourCost + tipFee;

  const coverage = gen > 0 ? collected / gen : 0;
  const diversion = collected > 0 ? processed / collected : 0;
  const util = Math.max(usedTipperMin / tipperMin, usedCompMin / compMin);
  const fuelPerT = collected > 0 ? fuel / collected : 0;
  const costPerT = collected > 0 ? cost / collected : 0;

  // Composite processing-efficiency score (0-100)
  const utilSweet = clamp(
    1 - Math.abs(clamp(util, 0, 1.2) - 0.85) / 0.75,
    0,
    1
  );
  const fuelIdx = clamp(1 - (fuelPerT - 0.45) / 0.85, 0, 1);
  const costIdx = clamp(1 - (costPerT - 620) / 700, 0, 1);
  const standPenalty = clamp(
    ((uncollected + unmanaged) / Math.max(1, gen)) * 60,
    0,
    22
  );
  const effScore = clamp(
    100 *
      (0.4 * coverage +
        0.18 * diversion +
        0.12 * utilSweet +
        0.15 * fuelIdx +
        0.15 * costIdx) -
      standPenalty,
    0,
    100
  );

  return {
    cfg,
    wards,
    facs,
    kpi: {
      gen,
      collected,
      uncollected,
      coverage,
      processed,
      toLandfill,
      unmanaged,
      diversion,
      trips,
      km,
      fuel,
      fuelPerT,
      cost,
      costPerT,
      co2: fuel * 2.68,
      tipperUtil: usedTipperMin / tipperMin,
      compUtil: usedCompMin / compMin,
      util,
      effScore,
      overflowWards: wards.filter((w) => w.overflow || w.coverage < 0.97).length,
      avgFreq: wards.reduce((t, w) => t + w.freq, 0) / wards.length,
      points: wards.reduce((t, w) => t + w.points, 0),
    },
  };
}
