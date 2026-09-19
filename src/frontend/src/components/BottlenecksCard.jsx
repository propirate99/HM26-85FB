export function BottlenecksCard({ wards = [] }) {
  const highHaul = wards
    .filter((w) => (w.distance_km || w.haulKm || 0) >= 8.0)
    .sort((a, b) => (b.distance_km || b.haulKm || 0) - (a.distance_km || a.haulKm || 0))
    .slice(0, 5);

  const highBacklog = wards
    .filter((w) => (w.backlog || w.standing_backlog_t || 0) > 4.0)
    .sort((a, b) => (b.backlog || b.standing_backlog_t || 0) - (a.backlog || a.standing_backlog_t || 0))
    .slice(0, 5);

  return (
    <div className="swm-card">
      <div className="swm-card-header">
        <h3>🚨 Operational Bottlenecks & Haul Hazards</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "#f87171" }}>
            High Standing Backlog (&gt; 4 Tonnes)
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
            {highBacklog.map((w) => (
              <li key={w.ward || w.ward_no} style={{ marginBottom: "0.3rem" }}>
                <strong>Ward {w.ward || w.ward_no} ({w.name}):</strong>{" "}
                <span style={{ color: "#ef4444" }}>
                  {(w.backlog || w.standing_backlog_t || 0).toFixed(1)} t
                </span>{" "}
                backlog ({((w.util || 1.1) * 100).toFixed(0)}% fleet strain)
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", color: "#fbbf24" }}>
            Excess Haul Distances (&gt; 8 km to Primary Plant)
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
            {highHaul.map((w) => (
              <li key={w.ward || w.ward_no} style={{ marginBottom: "0.3rem" }}>
                <strong>Ward {w.ward || w.ward_no} ({w.name}):</strong>{" "}
                {(w.distance_km || w.haulKm || 0).toFixed(1)} km to{" "}
                {w.nearest_facility || w.facility?.name || "Processing Plant"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
