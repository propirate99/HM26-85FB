import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/authApi.js";
import { issueApi } from "../api/issueApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { IssueCard } from "../components/IssueCard.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { NotificationPanel } from "../features/notifications/NotificationPanel.jsx";
import { VerificationBadge } from "../components/VerificationBadge.jsx";
import { formatDate } from "../utils/formatDate.js";

export function CitizenDashboard() {
  const { user, setUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [issues, setIssues] = useState([]);
  const [profile, setProfile] = useState({ name: user?.name || "", phone: "", address: "" });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    issueApi.myReports().then((d) => setReports(d.reports || []));
    issueApi.listMine().then((d) => setIssues(d.issues || []));
    authApi.profile().then((d) =>
      setProfile({
        name: d.user.name || "",
        phone: d.user.phone || "",
        address: d.user.address || "",
      })
    );
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    const data = await authApi.updateProfile(profile);
    setUser(data.user);
    setSaved("Profile saved. Email stays bound to Google identity.");
  }

  const attention = reports.filter(
    (r) => r.verification?.requiresManualReview || r.reportStatus === "PENDING_REVIEW"
  );
  const resolved = issues.filter((i) => i.status === "RESOLVED");
  const active = issues.filter((i) => i.status !== "RESOLVED" && i.status !== "REJECTED");

  return (
    <main className="shell">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>My desk</h1>
        <Link className="btn btn-primary" to="/app/report">
          New report
        </Link>
      </div>
      <p className="muted">Cards for reports and civic issues — not an engagement feed.</p>

      <section>
        <h2>Verification requiring attention</h2>
        {attention.length ? (
          <div className="grid">
            {attention.map((r) => (
              <article key={r._id} className="card">
                <strong>{r.reportId}</strong>
                <VerificationBadge status={r.verification?.overallStatus} score={r.verification?.score} />
                <p>{r.description}</p>
                <p className="muted">{formatDate(r.submittedAt)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Nothing waiting on you.</p>
        )}
      </section>

      <section>
        <h2>My reports</h2>
        {reports.length ? (
          <div className="grid">
            {reports.map((r) => (
              <article key={r._id} className="card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span>{r.reportId}</span>
                  <span className="muted">{r.reportStatus}</span>
                </div>
                <p>{r.description}</p>
                {r.issueId?.publicId ? (
                  <Link to={`/app/issues/${r.issueId.publicId}`}>Open {r.issueId.publicId}</Link>
                ) : (
                  <span className="muted">Not yet an operational issue</span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reports yet"
            body="Capture location-bound evidence to open a civic issue."
            action={
              <Link className="btn btn-primary" to="/app/report">
                Report a civic issue
              </Link>
            }
          />
        )}
      </section>

      <section>
        <h2>Active civic issues</h2>
        <div className="grid">
          {active.map((i) => (
            <IssueCard key={i.id} issue={i} to={`/app/issues/${i.publicId}`} />
          ))}
        </div>
      </section>

      <section>
        <h2>Resolved</h2>
        <div className="grid">
          {resolved.map((i) => (
            <IssueCard key={i.id} issue={i} to={`/app/issues/${i.publicId}`} />
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Profile</h2>
        <form onSubmit={saveProfile}>
          <label>Name</label>
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          <label>Phone</label>
          <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <label>Address</label>
          <input
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
          <p className="muted">Email: {user?.email}</p>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          {saved ? <p className="muted">{saved}</p> : null}
        </form>
      </section>

      <section>
        <h2>Alerts</h2>
        <NotificationPanel />
      </section>
    </main>
  );
}
