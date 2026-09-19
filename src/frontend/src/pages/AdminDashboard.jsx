import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/adminApi.js";
import { IssueCard } from "../components/IssueCard.jsx";
import { formatDate } from "../utils/formatDate.js";

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [issues, setIssues] = useState([]);
  const [escalated, setEscalated] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    adminApi.analytics().then(setAnalytics);
    adminApi.issues().then((d) => setIssues(d.issues || []));
    adminApi.escalated().then((d) => setEscalated(d.issues || []));
    adminApi.officers().then((d) => setOfficers(d.officers || []));
    adminApi.audit().then((d) => setAudit(d.events || []));
  }, []);

  async function review(reportId, decision) {
    await adminApi.review(reportId, { decision, message: `Authority ${decision}` });
    const a = await adminApi.analytics();
    setAnalytics(a);
  }

  return (
    <main className="shell">
      <h1>Main authority</h1>
      {analytics ? (
        <div className="grid">
          <div className="card">
            <h3>{analytics.open}</h3>
            <p>Open issues</p>
          </div>
          <div className="card">
            <h3>{analytics.escalated}</h3>
            <p>Escalated</p>
          </div>
          <div className="card">
            <h3>{analytics.resolved}</h3>
            <p>Resolved</p>
          </div>
          <div className="card" style={{ borderLeft: "3px solid var(--palace-gold, #c9a227)" }}>
            <h3>65 Wards</h3>
            <Link to="/operations" style={{ color: "var(--palace-gold, #c9a227)", fontWeight: 600 }}>
              Launch Operations Grid →
            </Link>
          </div>
          <div className="card" style={{ borderLeft: "3px solid #10b981" }}>
            <h3>600 TPD</h3>
            <Link to="/simulator" style={{ color: "#34d399", fontWeight: 600 }}>
              Launch SWM Simulator →
            </Link>
          </div>
        </div>
      ) : null}

      <h2>Needs review</h2>
      {(analytics?.pendingReviews || []).map((r) => (
        <article key={r._id} className="card">
          <strong>{r.reportId}</strong> · {r.issueId?.publicId}
          <div className="row">
            <button className="btn btn-primary" type="button" onClick={() => review(r.reportId, "approve")}>
              Approve
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => review(r.reportId, "reject")}>
              Reject
            </button>
          </div>
        </article>
      ))}

      <h2>Escalated</h2>
      <div className="grid">
        {escalated.map((i) => (
          <IssueCard key={i.id} issue={i} to={`/officer/issues/${i.id}`} />
        ))}
      </div>

      <h2>All issues</h2>
      <div className="grid">
        {issues.slice(0, 12).map((i) => (
          <IssueCard key={i.id} issue={i} to={`/officer/issues/${i.id}`} />
        ))}
      </div>

      <h2>Officers</h2>
      {officers.map((o) => (
        <p key={o._id}>
          {o.name} · {o.role} · {o.assignedZoneId?.displayName || "all zones"}
        </p>
      ))}

      <h2>Audit</h2>
      <ul>
        {audit.slice(0, 20).map((e) => (
          <li key={e._id}>
            {formatDate(e.createdAt)} · {e.eventType} · {e.issueId?.publicId} · {e.message}
          </li>
        ))}
      </ul>
      <p>
        <Link to="/officer">Open officer queue</Link>
      </p>
    </main>
  );
}
