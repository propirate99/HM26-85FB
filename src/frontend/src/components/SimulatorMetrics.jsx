import { formatInr } from "../utils/geoUtils.js";

export function SimulatorMetrics({ kpi }) {
  if (!kpi) return null;

  return (
    <div className="kpis">
      <div className="kpi">
        <span>Efficiency</span>
        <b>{kpi.effScore.toFixed(0)} / 100</b>
      </div>
      <div className={`kpi ${kpi.coverage >= 0.95 ? "good" : "bad"}`}>
        <span>Collection coverage</span>
        <b>{(kpi.coverage * 100).toFixed(1)}%</b>
      </div>
      <div className={`kpi ${kpi.uncollected > 10 ? "bad" : ""}`}>
        <span>Standing backlog</span>
        <b>{kpi.uncollected.toFixed(1)} t/day</b>
      </div>
      <div className="kpi">
        <span>Fleet km</span>
        <b>{formatInr(kpi.km, 0)}</b>
      </div>
      <div className="kpi">
        <span>Daily cost</span>
        <b>₹{formatInr(kpi.cost, 0)}</b>
      </div>
      <div className="kpi">
        <span>CO₂</span>
        <b>{kpi.co2.toFixed(1)} t/day</b>
      </div>
    </div>
  );
}
