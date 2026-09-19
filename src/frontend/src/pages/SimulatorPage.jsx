import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { swmApi } from "../services/swmApi.js";
import { DEFAULT_CONFIG, runSimulation } from "../services/simulatorEngine.js";
import { SimulatorControls } from "../components/SimulatorControls.jsx";
import { SimulatorMetrics } from "../components/SimulatorMetrics.jsx";
import { SwachhaMap } from "../components/SwachhaMap.jsx";
import { formatInr } from "../utils/geoUtils.js";
import "../styles/swm.css";

const PRESETS = {
  current: { ...DEFAULT_CONFIG },
  stressed: { ...DEFAULT_CONFIG, gen: 760, congestion: 38, tipperTrips: 3, freq: 6 },
  optimised: { ...DEFAULT_CONFIG, tippers: 196, compactors: 58, transfer: true, routeRule: "balanced", segUplift: 12 },
  growth: { ...DEFAULT_CONFIG, gen: 820, tippers: 220, compactors: 70, freq: 8 },
};

export function SimulatorPage() {
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });
  const [baseline, setBaseline] = useState(null);
  const [preset, setPreset] = useState("current");
  const [metric, setMetric] = useState("density");
  const [selectedWard, setSelectedWard] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [query, setQuery] = useState("");

  const staticData = useMemo(() => swmApi.getStaticData(), []);

  const simResult = useMemo(() => {
    return runSimulation(config, staticData.wardsGeoJson, staticData.facilitiesGeoJson);
  }, [config, staticData]);

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

  const filteredWards = simResult.wards.filter((w) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return String(w.name).toLowerCase().includes(q) || String(w.zone).toLowerCase().includes(q) || String(w.ward_no).includes(q);
  });

  return (
    <div className={`sim-app ${sideOpen ? "side-open" : ""}`}>
      <SimulatorControls
        config={config}
        onChangeConfig={setConfig}
        onReset={() => {
          setConfig({ ...DEFAULT_CONFIG });
          setPreset("current");
        }}
        onBaseline={() => setBaseline(simResult.kpi)}
      />

      <header className="topbar">
        <button className="icon-btn btn ghost" type="button" onClick={() => setSideOpen((v) => !v)} aria-label="Toggle inputs">
          ☰
        </button>
        <div className="preset-row row">
          <span className="lbl" style={{ fontSize: "var(--text-xs)", color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
            Scenario
          </span>
          <div className="seg" id="presets">
            {Object.keys(PRESETS).map((key) => (
              <button
                key={key}
                type="button"
                className={preset === key ? "on" : ""}
                onClick={() => {
                  setPreset(key);
                  setConfig({ ...PRESETS[key] });
                }}
              >
                {key === "current"
                  ? "As-is 2026"
                  : key === "stressed"
                    ? "Monsoon stress"
                    : key === "optimised"
                      ? "Optimised network"
                      : "2031 growth"}
              </button>
            ))}
          </div>
        </div>
        <div className="row" style={{ marginLeft: "auto" }}>
          <Link className="btn ghost" to="/operations">
            ← Swachha Grid
          </Link>
          <span className="pill">Solved</span>
          <button className="btn" type="button" onClick={handleExportCsv}>
            Export CSV
          </button>
        </div>
      </header>

      <main className="main">
        <SimulatorMetrics kpi={simResult.kpi} />
        {baseline ? (
          <p className="muted">
            Baseline coverage {(baseline.coverage * 100).toFixed(1)}% · cost ₹{formatInr(baseline.cost, 0)} vs now ₹
            {formatInr(simResult.kpi.cost, 0)}
          </p>
        ) : null}

        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h3>Ward map · collection performance</h3>
              <p className="muted">
                {selectedWard
                  ? `W${selectedWard.ward_no} ${selectedWard.name} · ${(selectedWard.coverage * 100).toFixed(1)}% coverage`
                  : "Waste generated per km² per day — click a ward to inspect."}
              </p>
            </div>
            <div className="seg">
              {[
                { id: "uncollected", label: "Uncollected" },
                { id: "density", label: "Waste density" },
                { id: "coverage", label: "Coverage" },
                { id: "fuel", label: "Fuel/tonne" },
                { id: "gen", label: "Generation" },
              ].map((m) => (
                <button key={m.id} type="button" className={metric === m.id ? "on" : ""} onClick={() => setMetric(m.id)}>
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
        </section>

        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h3>Ward ledger</h3>
              <p className="muted">Sortable operational table from the 65-ward GeoJSON model</p>
            </div>
            <input
              className="search"
              type="search"
              placeholder="Filter ward or zone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 230 }}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ward</th>
                  <th>Zone</th>
                  <th className="num">Gen t/d</th>
                  <th className="num">Coverage</th>
                  <th className="num">Standing</th>
                  <th className="num">Trips</th>
                  <th className="num">Fleet km</th>
                  <th>Facility</th>
                </tr>
              </thead>
              <tbody>
                {filteredWards.map((w) => (
                  <tr
                    key={w.ward_no}
                    className={selectedWard?.ward_no === w.ward_no ? "sel" : ""}
                    onClick={() => setSelectedWard(w)}
                  >
                    <td>
                      <strong>W{w.ward_no}</strong>
                    </td>
                    <td>{w.name}</td>
                    <td>Zone {w.zone}</td>
                    <td className="num">{w.gen.toFixed(1)}</td>
                    <td className={w.coverage >= 0.95 ? "good" : w.coverage < 0.85 ? "bad" : ""}>
                      {(w.coverage * 100).toFixed(1)}%
                    </td>
                    <td className={w.uncollected > 0.5 ? "bad" : ""}>{w.uncollected.toFixed(2)} t</td>
                    <td className="num">{w.trips.toFixed(1)}</td>
                    <td className="num">{formatInr(w.km, 1)}</td>
                    <td>{w.facility?.name || "Processing Plant"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="foot">
          <p>
            <b>Model calibration.</b> Ward count (65), zones, MCC area, 168 auto tippers, and the
            Vidyaranyapuram / Kesare / Rayanakere plants come from published MCC / NITI / CSE sources.
            This model runs the 600 TPD planning case. Ward boundaries and per-ward figures are
            synthesised for scenario testing.
          </p>
        </footer>
      </main>
    </div>
  );
}
