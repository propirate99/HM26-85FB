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
    <section className="card">
      <header>
        <h3>Operational bottlenecks</h3>
        <p>Standing backlog and haul distances that break the 600 TPD plan.</p>
      </header>
      <div>
        <h3 style={{ color: "var(--bad)" }}>High standing backlog (&gt; 4 t)</h3>
        <ul>
          {highBacklog.length ? (
            highBacklog.map((w) => (
              <li key={w.ward || w.ward_no}>
                <b>
                  Ward {w.ward || w.ward_no} ({w.name}):
                </b>{" "}
                {(w.backlog || w.standing_backlog_t || 0).toFixed(1)} t backlog (
                {((w.util || 1.1) * 100).toFixed(0)}% fleet strain)
              </li>
            ))
          ) : (
            <li className="muted">No ward above 4 t in this window.</li>
          )}
        </ul>
      </div>
      <div>
        <h3 style={{ color: "var(--warn)" }}>Excess haul (&gt; 8 km)</h3>
        <ul>
          {highHaul.length ? (
            highHaul.map((w) => (
              <li key={w.ward || w.ward_no}>
                <b>
                  Ward {w.ward || w.ward_no} ({w.name}):
                </b>{" "}
                {(w.distance_km || w.haulKm || 0).toFixed(1)} km to{" "}
                {w.nearest_facility || w.facility?.name || "processing plant"}
              </li>
            ))
          ) : (
            <li className="muted">All wards haul under 8 km in this window.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
