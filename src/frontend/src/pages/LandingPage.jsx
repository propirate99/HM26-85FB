import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="muted">Mysuru hackathon MVP · evidence first, not a civic social network</p>
          <h1 className="display">See it. Verify it. Resolve it.</h1>
          <p className="lede">
            A citizen submits location-bound evidence. CivicVerify checks whether it is relevant,
            consistent, duplicate, and trustworthy—then routes one verified civic issue to the
            responsible officer.
          </p>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" to="/app/report">
              Report a civic issue
            </Link>
            <Link className="btn btn-gold" to="/public">
              View public issues
            </Link>
            <Link className="btn btn-ghost" to="/login">
              Officer login
            </Link>
          </div>
          <div className="privacy-note">
            CivicVerify does not publish your personal information. It verifies evidence and tracks
            resolution. We never claim a complaint is “real” or that a photo is definitely
            human-created.
          </div>
        </div>
        <div className="card">
          <h3>Transparent verification</h3>
          <ul>
            <li>In-app camera + browser GPS metadata</li>
            <li>Weighted score, not a black-box fake/real label</li>
            <li>Duplicate check before creating operational work</li>
            <li>Demo zones only — not official MCC boundaries</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
