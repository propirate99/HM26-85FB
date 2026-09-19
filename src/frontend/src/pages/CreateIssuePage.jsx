import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { issueApi } from "../api/issueApi.js";
import { IssueForm } from "../features/issues/IssueForm.jsx";
import { CameraCapture } from "../features/camera/CameraCapture.jsx";
import { useGeolocation } from "../features/location/useGeolocation.js";
import { MapPreview } from "../components/MapPreview.jsx";
import { VerificationBadge } from "../components/VerificationBadge.jsx";
import { DuplicatePromptModal } from "../components/DuplicatePromptModal.jsx";

const STEPS = ["Problem", "Location", "Camera evidence", "Review", "Submitted"];

export function CreateIssuePage() {
  const navigate = useNavigate();
  const { coords, error: geoError, denied, capture } = useGeolocation();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({ categories: [], zones: [] });
  const [form, setForm] = useState({ categoryId: "", zoneId: "", description: "" });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    issueApi.config().then(setConfig);
  }, []);

  useEffect(() => {
    if (!photo) return undefined;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function verifyEvidence() {
    setBusy(true);
    setError("");
    try {
      const reportRes = await issueApi.createReport({
        ...form,
        lng: coords?.lng,
        lat: coords?.lat,
        accuracyMeters: coords?.accuracyMeters,
      });
      const id = reportRes.report.reportId;
      setReportId(id);
      let verification = null;
      let duplicateResult = null;
      if (photo) {
        const fd = new FormData();
        fd.append("file", photo, "evidence.jpg");
        fd.append("capturedThroughApp", "true");
        fd.append("capturedAt", new Date().toISOString());
        if (coords?.lng != null) fd.append("lng", String(coords.lng));
        if (coords?.lat != null) fd.append("lat", String(coords.lat));
        if (coords?.accuracyMeters != null) {
          fd.append("accuracyMeters", String(coords.accuracyMeters));
        }
        const ev = await issueApi.uploadEvidence(id, fd);
        verification = ev.verification;
        duplicateResult = ev.duplicateResult;
      }
      const possible = duplicateResult?.best && duplicateResult.best.decision !== "CREATE";
      if (possible) {
        setResult({ reportId: id, verification, duplicateResult, awaiting: true });
        return;
      }
      const issue = (await issueApi.createIssue(id)).issue;
      setResult({ reportId: id, verification, duplicateResult, issue });
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function finish(decision, extra = {}) {
    setBusy(true);
    setError("");
    try {
      const issue =
        decision === "attach"
          ? (await issueApi.attach(reportId, extra.issueId)).issue
          : (await issueApi.createIssue(reportId)).issue;
      setResult((prev) => ({ ...prev, awaiting: false, issue }));
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      {result?.awaiting && result.duplicateResult?.best && (
        <DuplicatePromptModal
          candidate={result.duplicateResult.best}
          busy={busy}
          onAttach={(issueId) => finish("attach", { issueId })}
          onCreateSeparate={() => finish("new")}
          onReview={() => finish("new")}
        />
      )}

      <div className="page-h">
        <h2>New complaint</h2>
        <p>
          Every category carries its own SLA clock. Location-bound camera evidence is verified and
          routed to the ward sanitary inspector.
        </p>
      </div>

      <div className="stepper">
        {STEPS.map((label, i) => (
          <div key={label} className={`step ${i === step ? "active" : ""}`}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <IssueForm categories={config.categories} zones={config.zones} value={form} onChange={setForm} />
          <button
            className="btn btn-primary"
            type="button"
            disabled={!form.categoryId}
            onClick={() => setStep(1)}
          >
            Continue to Location
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h3>Location / landmark</h3>
          <p className="muted">
            Complaints are routed to the ward sanitary inspector using live device coordinates.
          </p>
          {geoError ? <p className="badge badge-risk">{geoError}</p> : null}
          {denied ? (
            <button className="btn btn-ghost" type="button" onClick={capture}>
              Retry Geolocation
            </button>
          ) : null}
          <MapPreview
            lng={coords?.lng}
            lat={coords?.lat}
            label={
              coords ? `Accuracy ±${Math.round(coords.accuracyMeters || 0)} m (GPS Verified)` : "Acquiring GPS Signal…"
            }
          />
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setStep(2)}>
              {coords ? "Proceed to Camera" : "Continue Without GPS (Flagged for Review)"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3>Photograph of the issue</h3>
          <p className="muted">
            Live camera capture proves the complaint is current. Gallery uploads are flagged for review.
          </p>
          <CameraCapture onCapture={setPhoto} />
          {preview ? (
            <div style={{ marginTop: 12 }}>
              <p className="badge badge-verified">✓ In-App Evidence Snapshot Captured</p>
              <img src={preview} alt="Captured evidence" style={{ marginTop: 6, borderRadius: 12, maxHeight: 320, objectFit: "cover" }} />
            </div>
          ) : null}
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary" type="button" disabled={!photo} onClick={() => setStep(3)}>
              Review Evidence
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3>Review before submit</h3>
          <p>{form.description}</p>
          {preview ? <img src={preview} alt="Review" style={{ borderRadius: 12, maxWidth: "100%", maxHeight: 320, objectFit: "cover", margin: "12px 0" }} /> : null}
          <MapPreview lng={coords?.lng} lat={coords?.lat} />

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="button" disabled={busy} onClick={verifyEvidence}>
              {busy ? "Submitting complaint…" : "Submit complaint"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && result?.issue && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Complaint registered</h3>
            <span className="pill">{result.issue.publicId}</span>
          </div>
          <p>
            <strong>{result.issue.publicId}</strong> is with the ward sanitary inspector. You will get an email at
            every status change.
          </p>
          <div style={{ margin: "14px 0" }}>
            <VerificationBadge
              status={result.verification?.overallStatus || result.issue.verificationStatus}
              score={result.verification?.score ?? result.issue.verificationScore}
            />
          </div>
          <p className="muted">
            {result.verification?.requiresManualReview
              ? "Flagged for manual review by the Zonal Officer due to borderline evidence score."
              : "Auto-verified with high confidence and routed directly to the assigned Zone Officer."}
          </p>
          <div className="row" style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate(`/app/issues/${result.issue.publicId}`)}
            >
              Open complaint trail
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setStep(0);
                setPhoto(null);
                setPreview("");
                setResult(null);
                setForm({ categoryId: "", zoneId: "", description: "" });
              }}
            >
              Submit Another Report
            </button>
          </div>
        </div>
      )}

      {error ? <p className="badge badge-risk" style={{ marginTop: 16 }}>{error}</p> : null}
    </div>
  );
}
