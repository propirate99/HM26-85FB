import { useState, useEffect, useMemo } from "react";
import { swmApi } from "../services/swmApi.js";
import { SwachhaMap } from "../components/SwachhaMap.jsx";
import { WardTable } from "../components/WardTable.jsx";
import { BottlenecksCard } from "../components/BottlenecksCard.jsx";
import { PriorityList } from "../components/PriorityList.jsx";
import { formatInr } from "../utils/geoUtils.js";
import "../styles/swm.css";

export function SwachhaGridPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState(null);
  const [daysWindow, setDaysWindow] = useState(30);

  useEffect(() => {
    async function load() {
      try {
        const staticData = swmApi.getStaticData();
        setData(staticData.swmData);
      } catch (err) {
        console.error("Failed to load SWM data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute aggregated 30-day (or chosen window) metrics per ward
  const enrichedWards = useMemo(() => {
    if (!data || !data.wards || !data.daily) return [];

    const dates = [...new Set(data.daily.map((r) => r.date))].sort();
    const cutoffDate = dates[Math.max(0, dates.length - daysWindow)];
    const activeDaily = data.daily.filter((r) => r.date >= cutoffDate);

    const byWard = new Map();
    for (const r of activeDaily) {
      let a = byWard.get(r.ward);
      if (!a) {
        a = { gen: 0, coll: 0, unc: 0, n: 0, backlog: 0, peak: 0 };
        byWard.set(r.ward, a);
      }
      a.gen += r.generated;
      a.coll += r.collected;
      a.unc += r.uncollected;
      a.n++;
      a.backlog = r.backlog;
      a.peak = Math.max(a.peak, r.generated);
    }

    return data.wards.map((w) => {
      const a = byWard.get(w.ward) || {
        gen: w.population * 0.00036,
        coll: w.population * 0.00036 * 0.9,
        unc: 0.1,
        n: 1,
        backlog: 0.5,
        peak: w.population * 0.00036,
      };
      const gen = a.gen / a.n;
      const coll = a.coll / a.n;
      const unc = a.unc / a.n;
      const rate = gen > 0 ? (coll / gen) * 100 : 100;
      const util = gen / Math.max(1, w.fleet_capacity_tpd);
      let status = "stable";
      if (util > 1.05 || a.backlog > 4) status = "critical";
      else if (util > 0.95 || a.backlog > 1.5) status = "strained";

      const priority_score = Math.round(
        (1 - Math.min(rate, 100) / 100) * 40 +
          Math.min(a.backlog, 15) * 3 +
          (util > 1 ? 25 : 0)
      );

      return {
        ...w,
        gen,
        coll,
        unc,
        rate,
        util,
        backlog: a.backlog,
        peak: a.peak,
        status,
        priority_score,
      };
    });
  }, [data, daysWindow]);

  // City-wide aggregate KPIs
  const citySummary = useMemo(() => {
    if (!enrichedWards.length) return null;
    const totalGen = enrichedWards.reduce((acc, w) => acc + w.gen, 0);
    const totalColl = enrichedWards.reduce((acc, w) => acc + w.coll, 0);
    const totalBacklog = enrichedWards.reduce((acc, w) => acc + w.backlog, 0);
    const totalTkm = enrichedWards.reduce(
      (acc, w) => acc + w.coll * (w.distance_km || 4.5),
      0
    );
    const criticalCount = enrichedWards.filter((w) => w.status === "critical").length;

    return {
      totalGen,
      totalColl,
      totalBacklog,
      totalTkm,
      criticalCount,
      coverageRate: (totalColl / totalGen) * 100,
    };
  }, [enrichedWards]);

  if (loading) {
    return <div className="swm-container"><p className="muted">Loading SWM Grid...</p></div>;
  }

  return (
    <div className="swm-container">
      <div className="swm-header">
        <div>
          <h1>MCC Swachha Grid · Ward Waste Operations</h1>
          <p className="swm-subtitle">
            Mysuru City Corporation · 65 Wards · 7 Zonal Offices · Calibrated ~500 TPD baseline
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Window:</span>
          {[7, 30, 90, 120].map((d) => (
            <button
              key={d}
              className={`swm-tab-btn ${daysWindow === d ? "active" : ""}`}
              onClick={() => setDaysWindow(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {citySummary && (
        <div className="kpi-grid">
          <div className="kpi-box highlight">
            <span className="kpi-label">City Generation</span>
            <span className="kpi-val">{citySummary.totalGen.toFixed(1)} TPD</span>
            <span className="kpi-sub">Across 65 municipal wards</span>
          </div>
          <div className="kpi-box">
            <span className="kpi-label">Collection Rate</span>
            <span
              className="kpi-val"
              style={{ color: citySummary.coverageRate >= 92 ? "#34d399" : "#f87171" }}
            >
              {citySummary.coverageRate.toFixed(1)}%
            </span>
            <span className="kpi-sub">
              {citySummary.totalColl.toFixed(1)} TPD lifted daily
            </span>
          </div>
          <div className="kpi-box">
            <span className="kpi-label">Standing Backlog</span>
            <span
              className="kpi-val"
              style={{ color: citySummary.totalBacklog > 50 ? "#f87171" : "#fbbf24" }}
            >
              {citySummary.totalBacklog.toFixed(1)} Tonnes
            </span>
            <span className="kpi-sub">
              {citySummary.criticalCount} wards in critical backlog state
            </span>
          </div>
          <div className="kpi-box">
            <span className="kpi-label">Logistics Haulage</span>
            <span className="kpi-val">{formatInr(citySummary.totalTkm, 0)}</span>
            <span className="kpi-sub">Tonne-km hauled per day</span>
          </div>
          <div className="kpi-box">
            <span className="kpi-label">Processing Infrastructure</span>
            <span className="kpi-val">{data?.facilities?.length || 5} Plants</span>
            <span className="kpi-sub">Kesare, Rayanakere, Vidyaranyapuram, ZWMs</span>
          </div>
        </div>
      )}

      <div className="swm-grid-2">
        <div className="swm-card">
          <div className="swm-card-header">
            <h3>📍 Ward Accumulation &amp; Haulage Map</h3>
            <span className="swm-subtitle">
              {selectedWard
                ? `Selected: Ward ${selectedWard.ward || selectedWard.ward_no} (${selectedWard.name})`
                : "Click any ward circle to trace haul vector"}
            </span>
          </div>
          <SwachhaMap
            mode="centroid"
            wards={enrichedWards}
            facilities={data?.facilities || []}
            selectedWardId={selectedWard?.ward || selectedWard?.ward_no}
            onSelectWard={setSelectedWard}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <PriorityList wards={enrichedWards} />
          <BottlenecksCard wards={enrichedWards} />
        </div>
      </div>

      <WardTable
        wards={enrichedWards}
        selectedWardId={selectedWard?.ward || selectedWard?.ward_no}
        onSelectWard={setSelectedWard}
      />
    </div>
  );
}
