import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/adminApi.js";
import { IssueCard } from "../components/IssueCard.jsx";
import { formatDate } from "../utils/formatDate.js";
import { grievanceStore, fmtDate } from "../services/grievanceStore.js";
import { swmApi } from "../services/swmApi.js";

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [issues, setIssues] = useState([]);
  const [escalated, setEscalated] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [aiInfo, setAiInfo] = useState(null);
  const [customKey, setCustomKey] = useState("");
  const [updatingAi, setUpdatingAi] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const staticData = useMemo(() => swmApi.getStaticData(), []);
  const stats = useMemo(() => grievanceStore.getStats(), []);
  const wardHotspots = useMemo(() => grievanceStore.getWardHotspots().slice(0, 10), []);

  useEffect(() => {
    adminApi.analytics().then(setAnalytics).catch(() => {});
    adminApi.issues().then((d) => setIssues(d.issues || [])).catch(() => {});
    adminApi.escalated().then((d) => setEscalated(d.issues || [])).catch(() => {});
    adminApi.officers().then((d) => setOfficers(d.officers || [])).catch(() => {});
    adminApi.audit().then((d) => setAudit(d.events || [])).catch(() => {});
    adminApi.aiStatus().then(setAiInfo).catch(() => {});
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  async function review(reportId, decision) {
    try {
      await adminApi.review(reportId, { decision, message: `Authority decision: ${decision}` });
      const a = await adminApi.analytics();
      setAnalytics(a);
      showToast(`Report ${reportId} marked ${decision}!`);
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleSaveAiKey(e) {
    e.preventDefault();
    if (!customKey.trim()) return;
    setUpdatingAi(true);
    try {
      await adminApi.updateAiConfig({
        apiKey: customKey.trim(),
        provider: "gemini",
        model: "gemini-2.5-flash",
      });
      const updated = await adminApi.aiStatus();
      setAiInfo(updated);
      setShowKeyInput(false);
      setCustomKey("");
      showToast("Gemini API Key activated! Live multimodal vision & triage active.");
    } catch (err) {
      showToast(err.message);
    } finally {
      setUpdatingAi(false);
    }
  }

  return (
    <div className="wrap">
      {toastMessage && <div className="toast on">{toastMessage}</div>}

      <div className="page-h">
        <h2>MCC Operations Console · Executive Authority</h2>
        <p>
          City-wide SLA oversight, evidence verification approvals, and the same 65-ward model used by
          Swachha Grid and the 600 TPD logistics simulator.
        </p>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <span>City open issues</span>
          <b>{analytics ? analytics.open : stats.open}</b>
        </div>
        <div className="kpi bad">
          <span>Escalated / breached</span>
          <b>{analytics ? analytics.escalated : stats.breached}</b>
        </div>
        <div className="kpi good">
          <span>City resolved</span>
          <b>{analytics ? analytics.resolved : stats.resolved}</b>
        </div>
        <div className="kpi">
          <span>SLA compliance</span>
          <b>{stats.slaRate.toFixed(0)}%</b>
        </div>
        <div className="kpi">
          <span>65 wards grid</span>
          <b>
            <Link to="/operations" style={{ color: "var(--accent)" }}>
              Grid ↗
            </Link>
          </b>
        </div>
        <div className="kpi">
          <span>600 TPD simulator</span>
          <b>
            <Link to="/simulator" style={{ color: "var(--accent)" }}>
              Model ↗
            </Link>
          </b>
        </div>
      </div>

      {/* Navigation shortcuts */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row">
          <Link className="btn" to="/operations">
            Ward waste operations grid
          </Link>
          <Link className="btn ghost" to="/simulator">
            600 TPD logistics simulator
          </Link>
          <Link className="btn ghost" to="/officer">
            Field complaint queue
          </Link>
        </div>
      </div>

      {/* AI Complaint Management & System Configuration Console */}
      <section
        className="card"
        style={{
          background: "linear-gradient(180deg, rgba(26, 38, 34, 0.9) 0%, rgba(15, 23, 21, 0.95) 100%)",
          border: "1px solid rgba(55, 211, 155, 0.3)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🤖</span>
              <h3 style={{ margin: 0, fontSize: 18 }}>AI Complaint Management &amp; Triage Engine</h3>
              <span
                className="pill"
                style={{
                  background: aiInfo?.hasKey ? "rgba(55, 211, 155, 0.2)" : "rgba(251, 191, 36, 0.15)",
                  color: aiInfo?.hasKey ? "#37d39b" : "#fbbf24",
                  fontWeight: 700,
                }}
              >
                {aiInfo?.hasKey ? "● Google Gemini Live" : "● Heuristic Zero-Downtime Mode"}
              </span>
            </div>
            <p className="muted" style={{ margin: "8px 0 0", maxWidth: 640 }}>
              Autonomous complaint triage pipeline with multimodal evidence inspection, synthetic/fake
              entry detection, duplicate screening, and civic category auto-classification.
            </p>
          </div>

          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
          >
            ⚙️ {showKeyInput ? "Close Config" : "Configure Gemini API Key"}
          </button>
        </div>

        {showKeyInput && (
          <form
            onSubmit={handleSaveAiKey}
            style={{
              marginTop: 18,
              padding: 16,
              background: "var(--bg-2)",
              borderRadius: 12,
              border: "1px solid var(--line-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <label style={{ margin: 0, fontSize: 13 }}>Google Gemini API Key</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="password"
                placeholder="AIzaSy... (Enter Gemini API Key)"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" type="submit" disabled={updatingAi || !customKey.trim()}>
                {updatingAi ? "Activating…" : "Activate API Key"}
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--fg-3)", margin: 0 }}>
              Key is securely stored in backend environment. You can also configure <code>GEMINI_API_KEY</code> in <code>.env</code>.
            </p>
          </form>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <div>
            <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)" }}>Active Model</span>
            <div style={{ fontWeight: 700, marginTop: 4, color: "#37d39b" }}>
              {aiInfo?.model || "gemini-2.5-flash"}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)" }}>Auth Status</span>
            <div style={{ fontWeight: 600, marginTop: 4 }}>
              {aiInfo?.keyMasked || "Heuristic fallback"}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)" }}>Duplicate Algorithm</span>
            <div style={{ fontWeight: 600, marginTop: 4 }}>Spatial + Jaccard + Perceptual Hash</div>
          </div>
          <div>
            <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)" }}>Integrity Pipeline</span>
            <div style={{ fontWeight: 600, marginTop: 4, color: "#37d39b" }}>7-Signal Score + Fake Detection</div>
          </div>
        </div>
      </section>


      {/* Evidence Verification Reviews */}
      <section className="card">
        <header>
          <h3>Verification requiring authority review</h3>
          <p>Citizen reports with borderline AI confidence or cross-zone discrepancies waiting on commissioner decision.</p>
        </header>
        {analytics?.pendingReviews && analytics.pendingReviews.length > 0 ? (
          <div className="grid">
            {analytics.pendingReviews.map((r) => (
              <article key={r._id} className="card" style={{ background: "var(--bg-2)" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{r.reportId}</strong>
                  <span className="pill warn">Pending Review</span>
                </div>
                <p style={{ margin: "8px 0" }}>{r.description || "Suspected unsegregated / black spot waste accumulation."}</p>
                <div className="row">
                  <button className="btn" type="button" onClick={() => review(r.reportId, "approve")}>
                    Approve
                  </button>
                  <button className="btn ghost" type="button" onClick={() => review(r.reportId, "reject")}>
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty" style={{ padding: "var(--space-4)" }}>
            No reports currently pending authority sign-off. All active items cleared.
          </p>
        )}
      </section>

      {/* Two columns: Escalated Complaints & Top Hotspots */}
      <div className="cols">
        {/* Escalated Issues */}
        <section className="card">
          <header>
            <h3>Escalated grievances</h3>
            <p>Issues exceeding zonal SLA clocks or flagged for urgent attention.</p>
          </header>
          {escalated.length ? (
            <div className="grid">
              {escalated.map((i) => (
                <IssueCard key={i.id} issue={i} to={`/officer/issues/${i.id}`} />
              ))}
            </div>
          ) : (
            <p className="empty">No escalated grievances at this time.</p>
          )}
        </section>

        {/* Top 10 Ward Hotspots */}
        <section className="card">
          <header>
            <h3>Top 10 ward bottlenecks</h3>
            <p>Wards with highest combined waste generation and open complaints.</p>
          </header>
          <div className="tbl-scroll" style={{ maxHeight: 380 }}>
            <table>
              <thead>
                <tr>
                  <th>Ward</th>
                  <th>Zone</th>
                  <th className="num">Waste t/d</th>
                  <th className="num">Open</th>
                  <th>Load</th>
                </tr>
              </thead>
              <tbody>
                {wardHotspots.map((w) => (
                  <tr key={w.ward}>
                    <td>
                      <b>W{w.ward}</b> · {w.name}
                    </td>
                    <td>{w.zone}</td>
                    <td className="num">{w.waste}</td>
                    <td className="num" style={{ color: w.openComplaints > 0 ? "var(--warn)" : "inherit" }}>
                      {w.openComplaints}
                    </td>
                    <td style={{ minWidth: 90 }}>
                      <div className="bar">
                        <i
                          style={{
                            width: `${w.load}%`,
                            background: w.load > 70 ? "var(--bad)" : w.load > 40 ? "var(--warn)" : "var(--accent)"
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Zonal Officers Section */}
      <section className="card">
        <header>
          <h3>Zonal sanitary inspectors &amp; officers</h3>
          <p>MCC officers responsible for field command across Mysuru's 9 administrative zones.</p>
        </header>
        <div className="grid">
          {officers.map((o) => (
            <article key={o._id} className="card" style={{ background: "var(--bg-2)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b>{o.name}</b>
                <span className="pill">{o.role}</span>
              </div>
              <p style={{ margin: "6px 0 0", color: "var(--fg-3)", fontSize: "var(--text-xs)" }}>
                {o.email} · {o.phone || "+91 821 2418800"}
              </p>
              <span className="tag" style={{ marginTop: 6, alignSelf: "flex-start" }}>
                Jurisdiction: {o.assignedZoneId?.displayName || "City-wide Headquarters"}
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* Audit Log */}
      <section className="card">
        <header>
          <h3>Official audit trail</h3>
          <p>Cryptographic tamper-evident operational event log.</p>
        </header>
        <div className="tbl-scroll" style={{ maxHeight: 350 }}>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Issue ID</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 25).map((e) => (
                <tr key={e._id}>
                  <td>{formatDate(e.createdAt)}</td>
                  <td>
                    <span className="tag">{e.eventType}</span>
                  </td>
                  <td>{e.issueId?.publicId || "—"}</td>
                  <td>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="rail-foot" style={{ margin: "var(--space-4) 0 0" }}>
        Mysuru City Corporation · Solid Waste Management Cell · Operations Console connected to{" "}
        <Link to="/simulator">600 TPD logistics simulator</Link> and{" "}
        <Link to="/operations">Swachha Grid operations console</Link>.
      </p>
    </div>
  );
}
