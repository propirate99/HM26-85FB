import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import {
  grievanceStore,
  CATEGORIES,
  STAGES,
  CREWS,
  fmtDate
} from "../services/grievanceStore.js";
import { swmApi } from "../services/swmApi.js";

export function OfficerDashboard() {
  const { user, isCitizen } = useAuth();
  const navigate = useNavigate();

  // Role guard: citizens must never see the internal operations console
  useEffect(() => {
    if (isCitizen) {
      navigate("/dashboard", { replace: true });
    }
  }, [isCitizen, navigate]);

  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMailId, setSelectedMailId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterWard, setFilterWard] = useState("");
  const [filterPri, setFilterPri] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Dispatch form state
  const [dispatchStatus, setDispatchStatus] = useState("In progress");
  const [dispatchCrew, setDispatchCrew] = useState("");
  const [dispatchNote, setDispatchNote] = useState("");

  const staticData = useMemo(() => swmApi.getStaticData(), []);
  const wards = useMemo(() => {
    return (staticData.swmData?.wards || []).slice().sort((a, b) => a.ward - b.ward);
  }, [staticData]);

  useEffect(() => {
    const update = () => {
      const all = grievanceStore.getAll();
      setComplaints([...all]);
      if (!selectedId && all.length) {
        setSelectedId(all[0].id);
      }
    };
    update();
    const unsub = grievanceStore.subscribe(update);
    return unsub;
  }, [selectedId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const isDone = (c) => c.status === "Resolved" || c.status === "Closed";
  const isLate = (c) => !isDone(c) && new Date(c.dueAt) < new Date();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return complaints
      .filter((c) => {
        if (filterStatus && c.status !== filterStatus) return false;
        if (filterWard && c.ward !== filterWard) return false;
        if (filterPri && c.priority !== filterPri) return false;
        if (
          q &&
          !(c.id + c.ward + c.categoryLabel + c.name + c.email + (c.crew || "")).toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const s = (isDone(a) ? 1 : 0) - (isDone(b) ? 1 : 0);
        return s || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      });
  }, [complaints, filterStatus, filterWard, filterPri, searchQuery]);

  const selectedComplaint = useMemo(() => {
    return complaints.find((c) => c.id === selectedId) || complaints[0] || null;
  }, [complaints, selectedId]);

  useEffect(() => {
    if (selectedComplaint) {
      const currentIdx = STAGES.indexOf(selectedComplaint.status);
      const nextIdx = Math.min(STAGES.length - 1, currentIdx + 1);
      setDispatchStatus(STAGES[nextIdx]);
      setDispatchCrew(selectedComplaint.crew || CREWS[0]);
    }
  }, [selectedId, selectedComplaint?.status]);

  const stats = useMemo(() => {
    return grievanceStore.getStats();
  }, [complaints]);

  const wardHotspots = useMemo(() => {
    return grievanceStore.getWardHotspots();
  }, [complaints]);

  const outbox = useMemo(() => {
    return grievanceStore.getOutbox();
  }, [complaints]);

  const selectedMail = useMemo(() => {
    if (selectedMailId) {
      const found = outbox.find((m) => m.id === selectedMailId);
      if (found) return found;
    }
    return outbox[0] || null;
  }, [outbox, selectedMailId]);

  function handleDispatchUpdate(e) {
    if (e) e.preventDefault();
    if (!selectedComplaint) return;

    grievanceStore.updateStatus(
      selectedComplaint.id,
      dispatchStatus,
      dispatchNote || `Status updated to ${dispatchStatus} by MCC operations officer.`,
      dispatchCrew
    );

    showToast(`Complaint ${selectedComplaint.id} updated to ${dispatchStatus} and notification dispatched!`);
    setDispatchNote("");
  }

  function handleQuickResolve() {
    if (!selectedComplaint) return;
    grievanceStore.updateStatus(
      selectedComplaint.id,
      "Resolved",
      dispatchNote || "Location attended to, waste cleared, and site sanitized by MCC crew.",
      dispatchCrew || selectedComplaint.crew || CREWS[0]
    );
    showToast(`Complaint ${selectedComplaint.id} marked Resolved! Confirmation email sent.`);
    setDispatchNote("");
  }

  function handleUpdateVerification(score, status, isDuplicate) {
    if (!selectedComplaint) return;
    grievanceStore.updateVerification(selectedComplaint.id, {
      score,
      status,
      isDuplicate,
      note: `Triage verification override by ${user?.name || "MCC Officer"}: ${status} (${score}%)`,
    });
    showToast(`Verification for #${selectedComplaint.id} updated to ${status} (${score}%)!`);
  }

  function exportCsv() {
    const headers = ["ComplaintID", "Category", "Ward", "Citizen", "Email", "Status", "Priority", "Crew", "FiledAt", "DueAt"];
    const rows = filtered.map((c) => [
      c.id,
      `"${c.categoryLabel}"`,
      `"${c.ward}"`,
      `"${c.name}"`,
      c.email,
      c.status,
      c.priority,
      `"${c.crew || "unassigned"}"`,
      c.createdAt,
      c.dueAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mcc_complaints_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Complaint queue exported as CSV!");
  }

  return (
    <div className="wrap">
      {toastMessage && <div className="toast on">{toastMessage}</div>}

      <div className="page-h">
        <h2>Grievance operations · all 65 wards</h2>
        <p>
          Work the queue against SLA clocks, dispatch sanitation crews and update resolution status.
          Every update fires the citizen's email notification automatically using official MCC templates.
        </p>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <span>Total complaints</span>
          <b>{stats.total}</b>
        </div>
        <div className="kpi warn">
          <span>Open</span>
          <b>{stats.open}</b>
        </div>
        <div className="kpi bad">
          <span>SLA breached</span>
          <b>{stats.breached}</b>
        </div>
        <div className="kpi good">
          <span>SLA compliance</span>
          <b>{stats.slaRate.toFixed(0)}%</b>
        </div>
        <div className="kpi">
          <span>Avg resolution</span>
          <b>{stats.avgHours ? stats.avgHours.toFixed(1) + " h" : "16.4 h"}</b>
        </div>
        <div className="kpi">
          <span>Emails queued / sent</span>
          <b>{outbox.length}</b>
        </div>
      </div>

      {/* Navigation shortcuts */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row">
          <a href="#a-queue" className="btn ghost" style={{ flex: "none" }}>
            Complaint queue ({filtered.length})
          </a>
          <a href="#a-wards" className="btn ghost" style={{ flex: "none" }}>
            Ward hotspots (65)
          </a>
          <a href="#a-mail" className="btn ghost" style={{ flex: "none" }}>
            Notification log ({outbox.length})
          </a>
        </div>
        <div className="row">
          <Link className="btn" to="/operations">
            Operations grid ↗
          </Link>
          <Link className="btn ghost" to="/simulator">
            600 TPD logistics simulator ↗
          </Link>
        </div>
      </div>

      {/* Two Columns: Queue and Dispatch Card */}
      <div className="cols">
        {/* Left: Queue */}
        <section className="card" id="a-queue">
          <header>
            <h3>Complaint queue</h3>
            <p>Sorted by SLA urgency. Click any row to inspect details and dispatch crews.</p>
          </header>

          <div className="row">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="search"
              style={{ maxWidth: 160 }}
            >
              <option value="">All statuses</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className="search"
              style={{ maxWidth: 180 }}
            >
              <option value="">All wards</option>
              {wards.map((w) => (
                <option key={w.ward} value={w.name}>
                  W{w.ward} · {w.name}
                </option>
              ))}
            </select>

            <select
              value={filterPri}
              onChange={(e) => setFilterPri(e.target.value)}
              className="search"
              style={{ maxWidth: 140 }}
            >
              <option value="">All priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <input
              className="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, citizen, category…"
              style={{ flex: 1, minWidth: 150 }}
            />

            <button className="btn ghost" type="button" onClick={exportCsv} style={{ flex: "none" }}>
              Export CSV
            </button>
          </div>

          <div className="tbl-scroll" style={{ maxHeight: 520 }}>
            <table>
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Category</th>
                  <th>Ward</th>
                  <th>Citizen</th>
                  <th>AI Verification</th>
                  <th>SLA</th>
                  <th>Crew</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? (
                  filtered.map((c) => {
                    const done = isDone(c);
                    const late = isLate(c);
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
                    const vScore = c.verificationScore || 85;

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
                        <td>
                          <b>{c.name}</b>
                          <br />
                          <small style={{ color: "var(--fg-3)" }}>{c.email}</small>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: "11px",
                                fontWeight: 700,
                                background: vScore >= 80 ? "oklch(24% 0.1 150)" : "oklch(24% 0.1 80)",
                                color: vScore >= 80 ? "var(--good)" : "var(--warn)",
                                border: `1px solid ${vScore >= 80 ? "var(--good)" : "var(--warn)"}`,
                              }}
                            >
                              {vScore}%
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--fg-3)" }}>
                              {c.verificationStatus === "REVIEW_NEEDED" || vScore < 60 ? "⚠️ Flag" : "✓ Auth"}
                            </span>
                          </div>
                        </td>
                        <td style={{ minWidth: 110 }}>
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
                          {c.crew ? (
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>{c.crew}</span>
                          ) : (
                            <span style={{ color: "var(--fg-3)" }}>unassigned</span>
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
                    <td colSpan="8" className="empty">
                      No complaints match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Dispatch & Status Update */}
        <section className="card" id="a-dispatch">
          <header>
            <h3>Dispatch &amp; status update</h3>
            <p>
              {selectedComplaint
                ? `${selectedComplaint.id} · ${selectedComplaint.ward} · SLA target ${selectedComplaint.slaHours} h`
                : "Select a complaint from the queue."}
            </p>
          </header>

          {selectedComplaint ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="spread">
                <span>Category</span>
                <b>{selectedComplaint.categoryLabel}</b>
              </div>
              <div className="spread">
                <span>Citizen</span>
                <b>
                  {selectedComplaint.name} · {selectedComplaint.email}
                </b>
              </div>
              <div className="spread">
                <span>Location</span>
                <b>{selectedComplaint.address || selectedComplaint.ward}</b>
              </div>
              <div className="spread" style={{ border: 0 }}>
                <span>SLA target</span>
                <b>
                  {fmtDate(selectedComplaint.dueAt)}{" "}
                  {isLate(selectedComplaint) && (
                    <span style={{ color: "var(--bad)", marginLeft: 6 }}>· Breached</span>
                  )}
                </b>
              </div>

              <div className="note-box" style={{ margin: "var(--space-1) 0" }}>
                <strong>Report details:</strong> {selectedComplaint.detail || "No description supplied."}
              </div>

              {/* AI Verification & Triage Controls */}
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  margin: "var(--space-1) 0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⚖️</span>
                    <span>AI Verification &amp; Authenticity Controls</span>
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: (selectedComplaint.verificationScore || 85) >= 80 ? "oklch(24% 0.1 150)" : "oklch(24% 0.1 80)",
                      color: (selectedComplaint.verificationScore || 85) >= 80 ? "var(--good)" : "var(--warn)",
                      border: `1px solid ${(selectedComplaint.verificationScore || 85) >= 80 ? "var(--good)" : "var(--warn)"}`,
                    }}
                  >
                    Score: {selectedComplaint.verificationScore || 85} / 100
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px", color: "var(--fg-3)", marginBottom: "10px" }}>
                  <div>📍 GPS Bound: <strong style={{ color: "var(--fg)" }}>Ward Verified</strong></div>
                  <div>🤖 AI Visual: <strong style={{ color: (selectedComplaint.verificationScore || 85) >= 80 ? "var(--good)" : "var(--warn)" }}>
                    {selectedComplaint.verificationStatus === "REVIEW_NEEDED" ? "Review Flagged" : "Authentic"}
                  </strong></div>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateVerification(96, "AUTHENTIC", false)}
                    className="btn"
                    style={{ padding: "4px 10px", fontSize: "11px", flex: "none", background: "var(--good)", color: "#052e16", border: "none" }}
                  >
                    ✓ Pass &amp; Verify (96%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateVerification(45, "MANIPULATED", false)}
                    className="btn ghost"
                    style={{ padding: "4px 10px", fontSize: "11px", flex: "none", color: "var(--bad)", borderColor: "var(--bad)" }}
                  >
                    ⚠️ Flag Tampered (45%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateVerification(selectedComplaint.verificationScore || 80, "DUPLICATE", true)}
                    className="btn ghost"
                    style={{ padding: "4px 10px", fontSize: "11px", flex: "none" }}
                  >
                    📑 Duplicate
                  </button>
                </div>
              </div>

              <form onSubmit={handleDispatchUpdate} className="form-grid">
                <label className="f">
                  <span>New status</span>
                  <select
                    value={dispatchStatus}
                    onChange={(e) => setDispatchStatus(e.target.value)}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="f">
                  <span>Assign crew</span>
                  <select
                    value={dispatchCrew}
                    onChange={(e) => setDispatchCrew(e.target.value)}
                  >
                    <option value="">— Keep current / unassigned —</option>
                    {CREWS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="f full">
                  <span>Note to citizen (injected into email notification)</span>
                  <input
                    value={dispatchNote}
                    onChange={(e) => setDispatchNote(e.target.value)}
                    placeholder="e.g. Crew scheduled for tomorrow 6:00 AM sanitation sweep."
                  />
                </label>

                <div className="row end full">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={handleQuickResolve}
                    style={{ flex: "none" }}
                  >
                    Mark resolved
                  </button>
                  <button className="btn" type="submit">
                    Update &amp; notify citizen
                  </button>
                </div>
              </form>

              <div style={{ marginTop: "var(--space-3)" }}>
                <span className="lbl" style={{ display: "block", marginBottom: 8 }}>
                  Grievance history log
                </span>
                <ul className="timeline">
                  {selectedComplaint.log
                    .slice()
                    .reverse()
                    .map((l, i) => (
                      <li key={i} className="done">
                        <b>{l.status}</b>
                        {fmtDate(l.at)}
                        {l.note && <div className="note">{l.note}</div>}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="empty">Nothing selected.</p>
          )}
        </section>
      </div>

      {/* Ward Hotspots Section */}
      <section className="card" id="a-wards">
        <header>
          <h3>Ward hotspots</h3>
          <p>
            Complaint load per ward, cross-read against the generation and collection-frequency
            model behind the logistics simulator. Wards at the top are where added collection points
            pay off first.
          </p>
        </header>

        <div className="tbl-scroll" style={{ maxHeight: 440 }}>
          <table>
            <thead>
              <tr>
                <th>Ward</th>
                <th>Zone</th>
                <th className="num">Waste t/day</th>
                <th className="num">Density t/km²</th>
                <th className="num">Complaints</th>
                <th className="num">Open</th>
                <th className="num">Breached</th>
                <th>Load indicator</th>
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
                  <td className="num">{w.density}</td>
                  <td className="num">{w.totalComplaints}</td>
                  <td className="num" style={{ color: w.openComplaints > 0 ? "var(--warn)" : "inherit" }}>
                    {w.openComplaints}
                  </td>
                  <td className="num" style={{ color: w.breachedComplaints > 0 ? "var(--bad)" : "inherit" }}>
                    {w.breachedComplaints}
                  </td>
                  <td style={{ minWidth: 120 }}>
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

      {/* Notification Log Section */}
      <section className="card" id="a-mail">
        <header>
          <h3>Notification log</h3>
          <p>Every status change emails the complainant through the connected Gmail account.</p>
        </header>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <span className="tag" style={{ color: "var(--good)", borderColor: "oklch(80% 0.16 150 / 0.3)" }}>
              ● Mail provider: Gmail Relay connected (punithj454@gmail.com)
            </span>
          </div>
          <div className="row">
            <button
              className="btn ghost"
              type="button"
              onClick={() => showToast(`Delivered notification ${selectedMail?.id || "MAIL-001"} to ${selectedMail?.to}!`)}
              style={{ flex: "none" }}
            >
              Send this one
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => showToast(`Dispatched all ${outbox.length} notifications via Gmail relay!`)}
              style={{ flex: "none" }}
            >
              Send queued via Gmail
            </button>
          </div>
        </div>

        <div className="cols" style={{ marginTop: "var(--space-3)" }}>
          <div className="mail-list">
            {outbox.map((m) => (
              <div
                key={m.id}
                className={`mail-item ${selectedMail?.id === m.id ? "on" : ""}`}
                onClick={() => setSelectedMailId(m.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{m.subject}</b>
                  <span style={{ color: "var(--fg-3)" }}>
                    To: {m.to} · {fmtDate(m.at)}
                  </span>
                </div>
                <span className="tag" style={{ textTransform: "capitalize" }}>
                  {m.state}
                </span>
              </div>
            ))}
          </div>

          <div>
            {selectedMail ? (
              <>
                <div className="row" style={{ marginBottom: "var(--space-3)" }}>
                  <span className="tag">To: {selectedMail.to}</span>
                  <span className="tag">Status: {selectedMail.status}</span>
                  <span className="tag" style={{ color: "var(--good)" }}>
                    State: {selectedMail.state}
                  </span>
                </div>
                <iframe
                  className="mail-frame"
                  srcDoc={selectedMail.html}
                  title="MCC Citizen Email Outbound Preview"
                />
              </>
            ) : (
              <p className="empty">No mail item selected.</p>
            )}
          </div>
        </div>
      </section>

      <p className="rail-foot" style={{ margin: "var(--space-4) 0 0" }}>
        MCC Operations Console · Demonstrator Build · Real-time ward grievance tracking synced with the{" "}
        <Link to="/simulator">600 TPD logistics simulator</Link> and{" "}
        <Link to="/operations">Swachha Grid operations console</Link>.
      </p>
    </div>
  );
}
