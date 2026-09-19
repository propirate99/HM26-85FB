import { useEffect } from "react";

export function DuplicatePromptModal({
  candidate,
  onAttach,
  onCreateSeparate,
  onReview,
  onCancel,
  busy,
  error,
}) {
  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !busy && onCancel) {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel]);

  if (!candidate) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && onCancel) {
          onCancel();
        }
      }}
    >
      <div
        className="modal-dialog card"
        style={{
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Cancel / Close "✕" Button */}
        {onCancel && (
          <button
            type="button"
            className="modal-close-btn"
            disabled={busy}
            onClick={onCancel}
            aria-label="Cancel and close"
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid var(--line)",
              color: "var(--fg-3)",
              borderRadius: "50%",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: 16,
              fontWeight: 700,
              zIndex: 10,
              transition: "all 0.15s ease",
            }}
          >
            ✕
          </button>
        )}

        <div className="modal-badge-row" style={{ paddingRight: 40 }}>
          <span className="badge badge-review">Nearby Match Detected</span>
          <span className="badge badge-status">{candidate.distanceMeters ?? 0}m away</span>
        </div>

        <h2 id="dup-title" className="modal-title" style={{ marginTop: 10 }}>
          Possible Duplicate Issue Found
        </h2>

        <p className="modal-desc" style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.5 }}>
          We found an existing active issue <strong>{candidate.distanceMeters ?? 0} metres</strong> away on{" "}
          <em>{candidate.title || "Civic Grievance"}</em> (<strong>{candidate.publicId}</strong>).
        </p>

        <div className="dup-callout">
          <p style={{ margin: "0 0 10px", lineHeight: 1.45 }}>
            Attaching your evidence will increase public support, escalate priority to the zone officer,
            and avoid duplicate municipal work orders.
          </p>
          <div className="dup-meta" style={{ display: "flex", gap: 14, fontSize: 12 }}>
            <span>
              Duplicate Confidence: <strong>{candidate.duplicateScore}%</strong>
            </span>
            <span>
              Status: <strong>{candidate.status}</strong>
            </span>
          </div>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.14)",
              border: "1px solid #ef4444",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#fca5a5",
              fontSize: 13,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="modal-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => onAttach(candidate.issueId || candidate.publicId)}
              style={{
                flex: "1 1 200px",
                fontWeight: 700,
                background: "var(--accent)",
                color: "var(--accent-ink)",
              }}
            >
              {busy ? "⏳ Processing…" : `Attach to Existing Issue (${candidate.publicId})`}
            </button>

            <button
              type="button"
              className="btn btn-gold"
              disabled={busy}
              onClick={onCreateSeparate}
              style={{
                flex: "1 1 180px",
                fontWeight: 700,
                background: "#37d39b",
                color: "#0a1712",
              }}
            >
              {busy ? "⏳ Creating…" : "Create Separate Work Order"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 4 }}>
            {onReview && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={onReview}
                style={{ fontSize: 12.5 }}
              >
                Request Manual Review
              </button>
            )}

            {onCancel && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={onCancel}
                style={{
                  fontSize: 12.5,
                  color: "#ef4444",
                  marginLeft: "auto",
                }}
              >
                Cancel / Edit Complaint
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
