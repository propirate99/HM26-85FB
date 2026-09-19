import { useState, useMemo } from "react";
import { swmApi } from "../services/swmApi.js";
import { DEFAULT_CONFIG, runSimulation } from "../services/simulatorEngine.js";
import { SimulatorControls } from "../components/SimulatorControls.jsx";
import { SimulatorMetrics } from "../components/SimulatorMetrics.jsx";
import { SwachhaMap } from "../components/SwachhaMap.jsx";
import { formatInr } from "../utils/geoUtils.js";
import "../styles/swm.css";

export function SimulatorPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [metric, setMetric] = useState("coverage");
  const [selectedWard, setSelectedWard] = useState(null);

  const staticData = useMemo(() => swmApi.getStaticData(), []);

  // Run simulation reactively whenever config changes
  const simResult = useMemo(() => {
    return runSimulation(
      config,
      staticData.wardsGeoJson,
      staticData.facilitiesGeoJson
    );
  }, [config, staticData]);

  // Export scenario to CSV
  const handleExportCsv = () => {
    const header = [
      "ward_no",
      "ward_name",
      "zone",
      "population",
      "generation_tpd",
      "coverage_pct",
      "uncollected_tpd",
      "trips_per_day",
      "fleet_km",
      "diesel_l",
      "destination_plant",
      "haul_km",
    ];
    const rows = simResult.wards.map((w) => [
      w.ward_no,
      `"${w.name}"`,
      w.zone,
      w.pop,
      w.gen.toFixed(2),
      (w.coverage * 100).toFixed(1),
      w.uncollected.toFixed(2),
      w.trips.toFixed(2),
      w.km.toFixed(1),
      w.fuel.toFixed(1),
      `"${w.facility?.name || "Processing Facility"}"`,
      w.haulKm.toFixed(1),
    ]);
    const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mysuru-swm-scenario-${config.gen}tpd.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="swm-container">
      <div className="swm-header">
        <div>
          <h1>Mysuru Waste Logistics Simulator</h1>
          <p className="swm-subtitle">
            Dynamic municipal solid waste operations model across 65 MCC wards: fleet sizing, fuel burn, routing &amp; landfill transit.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            className="btn primary"
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
            onClick={handleExportCsv}
          >
            📥 Export Scenario CSV
          </button>
        </div>
      </div>

      <SimulatorMetrics kpi={simResult.kpi} />

      <div className="swm-grid-2">
        <SimulatorControls
          config={config}
          onChangeConfig={setConfig}
          onReset={() => setConfig(DEFAULT_CONFIG)}
        />

        <div className="swm-card">
          <div className="swm-card-header">
            <h3>🗺️ City Choropleth Simulation Map</h3>
            <div className="swm-tab-nav" style={{ margin: 0 }}>
              {[
                { id: "coverage", label: "Coverage %" },
                { id: "backlog", label: "Backlog" },
                { id: "gen", label: "Generation" },
                { id: "density", label: "Density" },
                { id: "fuel", label: "Fuel Burn" },
              ].map((m) => (
                <button
                  key={m.id}
                  className={`swm-tab-btn ${metric === m.id ? "active" : ""}`}
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                  onClick={() => setMetric(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <SwachhaMap
            mode="choropleth"
            wards={simResult.wards}
            facilities={staticData.facilitiesGeoJson?.features?.map((f) => ({
              name: f.properties.name,
              cap: f.properties.capacity_tpd,
              pos: f.geometry.coordinates,
              kind: f.properties.kind,
            }))}
            wardsGeoJson={staticData.wardsGeoJson}
            metric={metric}
            selectedWardId={selectedWard?.ward_no}
            onSelectWard={setSelectedWard}
          />
        </div>
      </div>

      {/* Simulated Wards Table */}
      <div className="swm-card">
        <div className="swm-card-header">
          <h3>Simulated Ward Fleet &amp; Logistics Breakdown</h3>
          <span className="swm-subtitle">
            65 Wards · Total Fleet: {config.tippers} Auto-Tippers + {config.compactors} Compactors
          </span>
        </div>
        <div className="swm-table-wrapper">
          <table className="swm-table">
            <thead>
              <tr>
                <th>Ward #</th>
                <th>Locality</th>
                <th>Zone</th>
                <th>Gen (TPD)</th>
                <th>Coverage %</th>
                <th>Uncollected (t)</th>
                <th>Daily Trips</th>
                <th>Fleet km</th>
                <th>Diesel (L)</th>
                <th>Destination Plant</th>
                <th>Haul (km)</th>
              </tr>
            </thead>
            <tbody>
              {simResult.wards.map((w) => (
                <tr key={w.ward_no}>
                  <td>
                    <strong>W{w.ward_no}</strong>
                  </td>
                  <td>{w.name}</td>
                  <td>Zone {w.zone}</td>
                  <td>{w.gen.toFixed(1)}</td>
                  <td>
                    <span
                      style={{
                        color:
                          w.coverage >= 0.95
                            ? "#34d399"
                            : w.coverage >= 0.85
                            ? "#fbbf24"
                            : "#f87171",
                        fontWeight: 600,
                      }}
                    >
                      {(w.coverage * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span style={{ color: w.uncollected > 0.5 ? "#f87171" : "inherit" }}>
                      {w.uncollected.toFixed(2)} t
                    </span>
                  </td>
                  <td>{w.trips.toFixed(1)}</td>
                  <td>{formatInr(w.km, 1)}</td>
                  <td>{formatInr(w.fuel, 1)}</td>
                  <td>{w.facility?.name || "Processing Plant"}</td>
                  <td>{w.haulKm.toFixed(1)} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
