export function PriorityList({ wards = [] }) {
  const priorityWards = [...wards]
    .filter((w) => w.priority_score || w.backlog > 2 || w.standing_backlog_t > 2)
    .sort((a, b) => (b.priority_score || b.backlog || 0) - (a.priority_score || a.backlog || 0))
    .slice(0, 6);

  return (
    <div className="swm-card">
      <div className="swm-card-header">
        <h3>⚡ Priority Compactor & Fleet Deployment</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {priorityWards.map((w, i) => (
          <div
            key={w.ward || w.ward_no}
            style={{
              padding: "0.6rem 0.8rem",
              background: "rgba(255, 255, 255, 0.03)",
              borderLeft: "3px solid var(--palace-gold, #c9a227)",
              borderRadius: "0 4px 4px 0",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
              <strong>
                #{i + 1} Ward {w.ward || w.ward_no} · {w.name}
              </strong>
              <span style={{ color: "var(--palace-gold, #c9a227)", fontWeight: "bold" }}>
                Score: {w.priority_score || Math.round((w.backlog || 0) * 8)}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
              {w.recommended_action ||
                `Clear ${(w.backlog || w.standing_backlog_t || 0).toFixed(1)} t standing backlog with a weekend compactor drive. Source segregation is ${w.segregation_pct || 55}%.`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
