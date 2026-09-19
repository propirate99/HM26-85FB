import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { issueApi } from "../api/issueApi.js";
import { adminApi } from "../api/adminApi.js";
import { StatusBadge } from "../components/StatusBadge.jsx";
import { VerificationBadge } from "../components/VerificationBadge.jsx";
import { EvidenceCard } from "../components/EvidenceCard.jsx";
import { Timeline } from "../components/Timeline.jsx";
import { MapPreview } from "../components/MapPreview.jsx";
import { BeforeAfterSlider } from "../components/BeforeAfterSlider.jsx";
import { formatDate } from "../utils/formatDate.js";
import { useAuth } from "../auth/AuthProvider.jsx";

export function IssueDetailsPage({ publicView, officer }) {
  const { publicId, issueId } = useParams();
  const id = publicId || issueId;
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    try {
      const payload = publicView
        ? await issueApi.publicOne(id)
        : officer
          ? await adminApi.officerIssue(id)
          : await issueApi.getIssue(id);
      setData(payload);
      setStatus(payload.issue.status);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id, publicView, officer]);

  if (error) return <main className="wrap"><p className="badge badge-risk">{error}</p></main>;
  if (!data) return <main className="wrap"><p className="muted">Loading…</p></main>;

  const { issue, evidence = [], events = [] } = data;
  const loc = issue.location?.coordinates;
  const before = evidence.filter((e) => e.type === "BEFORE");
  const after = evidence.filter((e) => e.type === "AFTER");

  async function toggleSupport() {
    if (data.supported) await issueApi.unsupport(issue.id);
    else await issueApi.support(issue.id);
    load();
  }

  async function accept() {
    await adminApi.accept(issue.id);
    load();
  }

  async function saveStatus() {
    await adminApi.status(issue.id, { status, message: note });
    setNote("");
    load();
  }

  async function saveNote() {
    await adminApi.note(issue.id, note);
    setNote("");
    load();
  }

  async function onAfter(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("message", "Resolution after-photo");
    await adminApi.resolution(issue.id, fd);
    load();
  }

  async function resolve() {
    await adminApi.resolve(issue.id, note || "Marked resolved with evidence");
    load();
  }

  return (
    <main className="wrap">
      <div className="page-h">
        <h2>{issue.title || issue.publicId}</h2>
        <p>
          {issue.publicId} · {issue.category?.name} · {issue.zone?.displayName}
          {issue.zone?.isDemoData ? " (demo zone)" : ""} · SLA {formatDate(issue.deadline)}
        </p>
      </div>

      <section className="card">
      <div className="row">
        <StatusBadge status={issue.status} />
        <VerificationBadge status={issue.verificationStatus} score={issue.verificationScore} />
        {issue.escalated ? <span className="badge badge-risk">SLA / escalated</span> : null}
      </div>
      <p>{issue.description}</p>
      <p className="muted">{issue.approximateLocationLabel}</p>
      <MapPreview lng={loc?.[0]} lat={loc?.[1]} label={publicView ? "Approximate public location" : ""} />

      {!publicView && user?.role === "CITIZEN" ? (
        <button className="btn btn-gold" type="button" onClick={toggleSupport}>
          {data.supported ? "You face this too" : "I face this too"} · {issue.supportCount}
        </button>
      ) : (
        <p className="muted">{issue.supportCount} people face this too</p>
      )}

      {before.length > 0 && after.length > 0 && (
        <section style={{ marginTop: 24, marginBottom: 24 }}>
          <BeforeAfterSlider
            beforeUrl={before[0].publicUrl}
            afterUrl={after[0].publicUrl}
            beforeTitle={`${issue.publicId} Complaint Evidence`}
            afterTitle="Officer Resolution Evidence"
            comparisonNote={after[0].aiAssessment?.comparison?.note}
          />
        </section>
      )}

      </section>

      <section className="card">
        <header>
          <h3>Evidence</h3>
        </header>
      <div className="grid">
        {before.map((e) => (
          <EvidenceCard key={e.evidenceId} evidence={e} />
        ))}
        {after.map((e) => (
          <EvidenceCard key={e.evidenceId} evidence={e} />
        ))}
      </div>
      </section>

      <section className="card">
        <header>
          <h3>Status trail</h3>
        </header>
      <Timeline events={events} />
      </section>

      {officer ? (
        <section className="card" style={{ marginTop: 24 }}>
          <header>
            <h3>Dispatch &amp; status update</h3>
            <p>Every update emails the complainant automatically.</p>
          </header>
          <div className="row">
            <button className="btn btn-primary" type="button" onClick={accept}>
              Accept Issue
            </button>
          </div>
          <label>Update Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {[
              "ACKNOWLEDGED",
              "IN_PROGRESS",
              "RESOLUTION_REVIEW",
              "RESOLVED",
              "NEEDS_REVIEW",
              "ESCALATED",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label>Work Note / Action Taken</label>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-ghost" type="button" onClick={saveNote}>
              Add note
            </button>
            <button className="btn btn-gold" type="button" onClick={saveStatus}>
              Update status
            </button>
          </div>
          <label style={{ marginTop: 16 }}>Upload Resolution After-Photo</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAfter} />
          <button className="btn btn-primary" type="button" style={{ marginTop: 12 }} onClick={resolve}>
            Verify &amp; Mark Resolved
          </button>
        </section>
      ) : null}
    </main>
  );
}
