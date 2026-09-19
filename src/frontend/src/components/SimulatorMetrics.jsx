import { formatInr } from "../utils/geoUtils.js";

export function SimulatorMetrics({ kpi }) {
  if (!kpi) return null;

  return (
    <div className="kpi-grid">
      <div className="kpi-box highlight">
        <span className="kpi-label">Efficiency Score</span>
        <span className="kpi-val" style={{ color: "var(--palace-gold, #c9a227)" }}>
          {kpi.effScore.toFixed(0)} / 100
        </span>
        <span className="kpi-sub">
          {kpi.effScore >= 80 ? "Optimal City Operation" : "Fleet/Routing Strain"}
        </span>
      </div>

      <div className="kpi-box">
        <span className="kpi-label">Collection Coverage</span>
        <span
          className="kpi-val"
          style={{ color: kpi.coverage >= 0.95 ? "#34d399" : "#f87171" }}
        >
          {(kpi.coverage * 100).toFixed(1)}%
        </span>
        <span className="kpi-sub">
          {kpi.collected.toFixed(1)} of {kpi.gen.toFixed(1)} TPD
        </span>
      </div>

      <div className="kpi-box">
        <span className="kpi-label">Standing Backlog</span>
        <span
          className="kpi-val"
          style={{ color: kpi.uncollected > 10 ? "#f87171" : "#cbd5e1" }}
        >
          {kpi.uncollected.toFixed(1)} t/day
        </span>
        <span className="kpi-sub">
          {kpi.overflowWards} wards exceeding bin tolerance
        </span>
      </div>

      <div className="kpi-box">
        <span className="kpi-label">Fleet Fuel & Distance</span>
        <span className="kpi-val">{formatInr(kpi.km, 0)} km</span>
        <span className="kpi-sub">
          {formatInr(kpi.fuel, 0)} L diesel ({kpi.fuelPerT.toFixed(2)} L/t)
        </span>
      </div>

      <div className="kpi-box">
        <span className="kpi-label">Daily Operational Cost</span>
        <span className="kpi-val">₹{formatInr(kpi.cost, 0)}</span>
        <span className="kpi-sub">₹{formatInr(kpi.costPerT, 0)} per tonne</span>
      </div>

      <div className="kpi-box">
        <span className="kpi-label">CO2 Emissions</span>
        <span className="kpi-val">{kpi.co2.toFixed(1)} t/day</span>
        <span className="kpi-sub">
          {((1 - kpi.toLandfill / Math.max(1, kpi.collected)) * 100).toFixed(0)}% landfill diversion
        </span>
      </div>
    </div>
  );
}
