import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="muted">
            Mysuru City Corporation · Clean Mysuru Operational Suite
          </p>
          <h1 className="display">See it. Verify it. Resolve it.</h1>
          <p className="lede">
            A unified municipal civic governance and solid waste management platform for Mysuru.
            Combining evidence-first complaint verification, 65-ward real-time operations tracking,
            and dynamic 600 TPD waste logistics simulation.
          </p>
          <div className="row" style={{ marginTop: 20, flexWrap: "wrap", gap: "0.75rem" }}>
            <Link className="btn btn-primary" to="/app/report">
              + Report Civic Issue
            </Link>
            <Link className="btn btn-gold" to="/operations">
              🗺️ Ward Operations Grid
            </Link>
            <Link className="btn btn-primary" to="/simulator" style={{ background: "#1e704e" }}>
              🚚 Logistics Simulator
            </Link>
            <Link className="btn btn-ghost" to="/public">
              Public Tracker
            </Link>
          </div>
          <div className="privacy-note" style={{ marginTop: "1.5rem" }}>
            CivicVerify respects citizen privacy: precise residential coordinates are anonymized,
            and personal details are kept strictly within MCC officer records.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card">
            <h3>🛡️ Evidence-First CivicVerify</h3>
            <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0", fontSize: "0.9rem" }}>
              <li>In-app camera &amp; browser GPS verification</li>
              <li>Google Gemini 3.6 Flash vision validation</li>
              <li>Two-stage duplicate detection (spatial + semantic)</li>
              <li>Zonal officer SLA tracking &amp; automated escalation</li>
            </ul>
          </div>

          <div className="card" style={{ borderLeft: "3px solid #34d399" }}>
            <h3>📊 Swachha Grid &amp; SWM Simulator</h3>
            <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0", fontSize: "0.9rem" }}>
              <li>65 wards mapped across 7 zonal offices</li>
              <li>Daily waste accumulation &amp; standing backlog metrics</li>
              <li>Real-time 600 TPD fleet, fuel, &amp; cost scenario simulation</li>
              <li>Landfill diversion &amp; processing plant route optimization</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
