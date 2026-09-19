export function PriorityList({ wards = [] }) {
  const priorityWards = [...wards]
    .filter((w) => w.priority_score || w.backlog > 2 || w.standing_backlog_t > 2)
    .sort((a, b) => (b.priority_score || b.backlog || 0) - (a.priority_score || a.backlog || 0))
    .slice(0, 6);

  return (
    <section className="card">
      <header>
        <h3>Priority fleet deployment</h3>
        <p>Wards where added collection points or a weekend compactor drive pay off first.</p>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {priorityWards.map((w, i) => (
          <div key={w.ward || w.ward_no} className="priority-row">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>
                #{i + 1} Ward {w.ward || w.ward_no} · {w.name}
              </b>
              <span className="score">Score {w.priority_score || Math.round((w.backlog || 0) * 8)}</span>
            </div>
            <p>
              {w.recommended_action ||
                `Clear ${(w.backlog || w.standing_backlog_t || 0).toFixed(1)} t standing backlog. Source segregation is ${w.segregation_pct || 55}%.`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
