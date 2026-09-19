import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/authApi.js";
import { issueApi } from "../api/issueApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { VerificationBadge } from "../components/VerificationBadge.jsx";
import { formatDate } from "../utils/formatDate.js";
import {
  grievanceStore,
  CATEGORIES,
  STAGES,
  fmtDate
} from "../services/grievanceStore.js";
import { swmApi } from "../services/swmApi.js";

export function CitizenDashboard() {
  const { user, setUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [civicIssues, setCivicIssues] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMailId, setSelectedMailId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // New complaint form state
  const [catId, setCatId] = useState("missed");
  const [ward, setWard] = useState(user?.address?.split(",")?.[0] || "Jayalakshmipuram");
  const [addr, setAddr] = useState("");
  const [detail, setDetail] = useState("");
  const [notify, setNotify] = useState(true);
  const [formSuccess, setFormSuccess] = useState("");

  const staticData = useMemo(() => swmApi.getStaticData(), []);
  const wards = useMemo(() => {
    return (staticData.swmData?.wards || []).slice().sort((a, b) => a.ward - b.ward);
  }, [staticData]);

  // Load backend and store data
  useEffect(() => {
    issueApi.myReports().then((d) => setReports(d.reports || [])).catch(() => {});
    issueApi.listMine().then((d) => setCivicIssues(d.issues || [])).catch(() => {});

    const updateFromStore = () => {
      const all = grievanceStore.getAll();
      const userComplaints = user?.email ? grievanceStore.getByEmail(user.email) : all;
      const listToUse = userComplaints.length ? userComplaints : all.slice(0, 12);
      setComplaints(listToUse);
      if (!selectedId && listToUse.length) {
        setSelectedId(listToUse[0].id);
      }
    };

    updateFromStore();
    const unsub = grievanceStore.subscribe(updateFromStore);
    return unsub;
  }, [user, selectedId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const selectedCategory = useMemo(() => {
    return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
  }, [catId]);

  const selectedComplaint = useMemo(() => {
    return complaints.find((c) => c.id === selectedId) || complaints[0] || null;
  }, [complaints, selectedId]);

  const citizenEmails = useMemo(() => {
    const box = grievanceStore.getOutbox();
    if (!user?.email) return box.slice(0, 20);
    const filtered = box.filter((m) => m.to.toLowerCase() === user.email.toLowerCase());
    return filtered.length ? filtered : box.slice(0, 20);
  }, [user, complaints]);

  const selectedMail = useMemo(() => {
    if (selectedMailId) {
      const found = citizenEmails.find((m) => m.id === selectedMailId);
      if (found) return found;
    }
    return citizenEmails[0] || null;
  }, [citizenEmails, selectedMailId]);

  const stats = useMemo(() => {
    return grievanceStore.getStats(complaints);
  }, [complaints]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return complaints.filter((c) => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (q && !(c.id + c.ward + c.categoryLabel + c.detail).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [complaints, filterStatus, searchQuery]);

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!detail.trim()) return;

    const created = grievanceStore.fileComplaint({
      email: user?.email || "anitha.r@example.in",
      name: user?.name || "Mysuru Citizen",
      ward,
      category: catId,
      detail,
      address: addr ? `${addr}, ${ward}, Mysuru` : `${ward}, Mysuru`,
      notifyEmail: notify
    });

    setSelectedId(created.id);
    setDetail("");
    setAddr("");
    setFormSuccess(`Complaint ${created.id} registered! Routing to ${ward} ward inspector.`);
    showToast(`Complaint ${created.id} submitted! Status email sent.`);
    setTimeout(() => setFormSuccess(""), 4000);
  }

  const attentionReports = reports.filter(
    (r) => r.verification?.requiresManualReview || r.reportStatus === "PENDING_REVIEW"
  );

  return (
    <div className="wrap">
      {toastMessage && <div className="toast on">{toastMessage}</div>}

      {/* Subnav & Header */}
      <div className="page-h">
        <h2>Report a waste issue in your ward</h2>
        <p>
          Complaints are routed to the ward sanitary inspector and the zonal office automatically.
          You get an email the moment the status changes — registered, assigned, work started, resolved.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="kpis">
        <div className="kpi">
          <span>My complaints</span>
          <b>{stats.total}</b>
        </div>
        <div className="kpi warn">
          <span>Open now</span>
          <b>{stats.open}</b>
        </div>
        <div className="kpi good">
          <span>Resolved</span>
          <b>{stats.resolved}</b>
        </div>
        <div className="kpi">
          <span>Avg resolution</span>
          <b>{stats.avgHours ? stats.avgHours.toFixed(1) + " h" : "14.2 h"}</b>
        </div>
        <div className="kpi">
          <span>Ward collection</span>
          <b>7×/wk</b>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row">
          <a href="#file" className="btn ghost" style={{ flex: "none" }}>
            + New complaint
          </a>
          <a href="#mine" className="btn ghost" style={{ flex: "none" }}>
            My complaints ({stats.total})
          </a>
          <a href="#alerts" className="btn ghost" style={{ flex: "none" }}>
            Email alerts ({citizenEmails.length})
          </a>
        </div>
        <div className="row">
          <Link className="btn" to="/app/report">
            Camera &amp; GPS verification
          </Link>
          <Link className="btn ghost" to="/simulator">
            600 TPD simulator ↗
          </Link>
        </div>
      </div>

      {/* Two columns: File a Complaint & Status Trail */}
      <div className="cols">
        {/* File Complaint Card */}
        <section className="card" id="file">
          <header>
            <h3>New complaint</h3>
            <p>Every category carries its own SLA clock, shown once you pick one.</p>
          </header>

          <form onSubmit={handleFormSubmit} className="form-grid">
            <label className="f">
              <span>Category</span>
              <select value={catId} onChange={(e) => setCatId(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.sla}h SLA)
                  </option>
                ))}
              </select>
            </label>

            <label className="f">
              <span>Ward</span>
              <select value={ward} onChange={(e) => setWard(e.target.value)}>
                {wards.map((w) => (
                  <option key={w.ward} value={w.name}>
                    W{w.ward} · {w.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="f full">
              <span>Location / landmark</span>
              <input
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder="e.g. 3rd Cross, near Saraswathipuram water tank"
              />
            </label>

            <label className="f full">
              <span>What is the problem?</span>
              <textarea
                rows="3"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Bin has not been cleared for three days and waste is spilling onto the footpath."
                required
              />
            </label>

            <label className="f full">
              <span>Notification email</span>
              <input
                type="email"
                value={user?.email || "anitha.r@example.in"}
                readOnly
                style={{ opacity: 0.85 }}
              />
            </label>

            <label className="chk full">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              Email me at every complaint status change
            </label>

            <div className="note-box full" id="slaNote">
              <strong>SLA target for “{selectedCategory.label}”:</strong> {selectedCategory.sla} hours from registration.{" "}
              {selectedCategory.sla <= 12
                ? "High priority — routed immediately to the zonal rapid sanitation squad."
                : selectedCategory.sla <= 24
                  ? "Medium priority — handled by the regular ward auto tipper crew."
                  : "Low priority — scheduled into the ward deep-cleaning work plan."}
            </div>

            {formSuccess && <p style={{ color: "var(--good)", fontSize: "var(--text-xs)", gridColumn: "1/-1", margin: 0 }}>{formSuccess}</p>}

            <div className="row end full">
              <button
                className="btn ghost"
                type="reset"
                onClick={() => {
                  setDetail("");
                  setAddr("");
                }}
                style={{ flex: "none" }}
              >
                Clear
              </button>
              <button className="btn" type="submit">
                Submit complaint
              </button>
            </div>
          </form>
        </section>

        {/* Selected Complaint Timeline & Detail Card */}
        <section className="card" id="detail">
          <header>
            <h3>Complaint status</h3>
            <p id="detailSub">
              {selectedComplaint
                ? `${selectedComplaint.id} · ${selectedComplaint.categoryLabel} · ${selectedComplaint.ward}`
                : "Select a complaint from the table below to see its full trail."}
            </p>
          </header>

          {selectedComplaint ? (
            <div id="detailBody" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="spread">
                <span>Status</span>
                <b>
                  <span className={`pill ${selectedComplaint.status.replace(/\s+/g, "-")}`}>
                    {selectedComplaint.status}
                  </span>
                </b>
              </div>
              <div className="spread">
                <span>Crew assigned</span>
                <b>{selectedComplaint.crew || "Pending allocation"}</b>
              </div>
              <div className="spread">
                <span>SLA target</span>
                <b>{fmtDate(selectedComplaint.dueAt)}</b>
              </div>
              <div className="spread" style={{ border: 0 }}>
                <span>Email alerts</span>
                <b>{selectedComplaint.notifyEmail ? `Active · ${selectedComplaint.email}` : "Off"}</b>
              </div>

              <div style={{ marginTop: "var(--space-3)" }}>
                <span className="lbl" style={{ display: "block", marginBottom: 8 }}>Timeline trail</span>
                <ul className="timeline">
                  {STAGES.map((st, i) => {
                    const entry = (selectedComplaint.log || []).find((l) => l.status === st);
                    const currentIdx = STAGES.indexOf(selectedComplaint.status);
                    const isDone = i <= currentIdx;

                    return (
                      <li key={st} className={isDone ? "done" : ""}>
                        <b>{st}</b>
                        {entry ? fmtDate(entry.at) : "pending"}
                        {entry?.note && <div className="note">{entry.note}</div>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : (
            <p className="empty">No complaint selected.</p>
          )}
        </section>
      </div>

      {/* My Complaints Register Table */}
      <section className="card" id="mine">
        <header>
          <h3>My complaints</h3>
          <p>Click any row to open its status trail and inspect the exact emails sent to you.</p>
        </header>

        <div className="row">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="search"
            style={{ maxWidth: 190 }}
          >
            <option value="">All statuses</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, ward, category…"
          />
        </div>

        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th>Complaint</th>
                <th>Category</th>
                <th>Ward</th>
                <th>Filed</th>
                <th>SLA clock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length ? (
                filteredList.map((c) => {
                  const done = c.status === "Resolved" || c.status === "Closed";
                  const late = !done && new Date(c.dueAt) < new Date();
                  const pct = Math.min(
                    100,
                    Math.max(
                      5,
                      ((Date.now() - new Date(c.createdAt).getTime()) /
                        (new Date(c.dueAt).getTime() - new Date(c.createdAt).getTime())) *
                        100
                    )
                  );
                  const hoursLeft = Math.max(0, (new Date(c.dueAt).getTime() - Date.now()) / 3600e3);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={selectedId === c.id ? "sel" : ""}
                    >
                      <td>
                        <b>{c.id}</b>
                        <br />
                        <span className={`pill ${c.priority}`}>{c.priority}</span>
                      </td>
                      <td>{c.categoryLabel}</td>
                      <td>{c.ward}</td>
                      <td>{fmtDate(c.createdAt)}</td>
                      <td style={{ minWidth: 120 }}>
                        {done ? (
                          <span className="pill Resolved">met</span>
                        ) : (
                          <>
                            <div className={`bar ${late ? "late" : ""}`}>
                              <i style={{ width: `${pct}%` }} />
                            </div>
                            <small style={{ color: late ? "var(--bad)" : "var(--fg-3)" }}>
                              {late ? "overdue" : `${hoursLeft.toFixed(1)} h left`}
                            </small>
                          </>
                        )}
                      </td>
                      <td>
                        <span className={`pill ${c.status.replace(/\s+/g, "-")}`}>{c.status}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="empty">
                    No complaints match filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Email Alerts Sent to Citizen */}
      <section className="card" id="alerts">
        <header>
          <h3>Email alerts sent to you</h3>
          <p>
            Live notification outbox for your registered email address. Click any message to inspect
            the exact responsive email template dispatched to your inbox.
          </p>
        </header>

        <div className="cols">
          <div className="mail-list">
            {citizenEmails.length ? (
              citizenEmails.map((m) => (
                <div
                  key={m.id}
                  className={`mail-item ${selectedMail?.id === m.id ? "on" : ""}`}
                  onClick={() => setSelectedMailId(m.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{m.subject}</b>
                    <span style={{ color: "var(--fg-3)" }}>
                      {fmtDate(m.at)} · {m.complaintId}
                    </span>
                  </div>
                  <span className="tag" style={{ textTransform: "capitalize" }}>
                    {m.state}
                  </span>
                </div>
              ))
            ) : (
              <p className="empty">No emails sent yet. File a complaint to trigger the first alert.</p>
            )}
          </div>

          <div>
            {selectedMail ? (
              <>
                <div className="row" style={{ marginBottom: "var(--space-3)", justifyContent: "space-between" }}>
                  <div className="row">
                    <span className="tag">To: {selectedMail.to}</span>
                    <span
                      className="tag"
                      style={{
                        color:
                          selectedMail.state === "delivered"
                            ? "var(--accent)"
                            : selectedMail.state === "failed"
                              ? "var(--bad)"
                              : "var(--warn)"
                      }}
                    >
                      {selectedMail.state}
                    </span>
                  </div>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => showToast(`Notification ${selectedMail.id} sent to ${selectedMail.to}!`)}
                    style={{ flex: "none" }}
                  >
                    Email this to me now
                  </button>
                </div>
                <iframe
                  className="mail-frame"
                  srcDoc={selectedMail.html}
                  title="Mysuru City Corporation Email Notification Preview"
                />
              </>
            ) : (
              <p className="empty">No email selected.</p>
            )}
          </div>
        </div>
      </section>

      {/* CivicVerify Verified Evidence Section */}
      {attentionReports.length > 0 && (
        <section className="card">
          <header>
            <h3>Verification requiring attention</h3>
            <p>Citizen reports undergoing 7-signal sensor and GPS cross-verification.</p>
          </header>
          <div className="grid">
            {attentionReports.map((r) => (
              <article key={r._id} className="card">
                <strong>{r.reportId}</strong>
                <VerificationBadge status={r.verification?.overallStatus} score={r.verification?.score} />
                <p>{r.description}</p>
                <p className="muted">{formatDate(r.submittedAt)}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Footer info */}
      <p className="rail-foot" style={{ margin: "var(--space-4) 0 0" }}>
        Mysuru City Corporation · Solid Waste Management Cell · Helpline 0821-2418800. Ward boundaries
        and collection models correspond to the{" "}
        <Link to="/simulator">600 TPD logistics simulator</Link> and{" "}
        <Link to="/operations">Swachha Grid operations console</Link>.
      </p>
    </div>
  );
}
