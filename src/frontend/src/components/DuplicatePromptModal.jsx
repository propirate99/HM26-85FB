export function DuplicatePromptModal({ candidate, onAttach, onCreateSeparate, onReview, busy }) {
  if (!candidate) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dup-title">
      <div className="modal-dialog card">
        <div className="modal-badge-row">
          <span className="badge badge-review">Nearby Match Detected</span>
          <span className="badge badge-status">{candidate.distanceMeters}m away</span>
        </div>

        <h2 id="dup-title" className="modal-title">
          Possible Duplicate Issue Found
        </h2>

        <p className="modal-desc">
          We found an existing active issue <strong>{candidate.distanceMeters} metres</strong> away on{" "}
          <em>{candidate.title}</em> (<strong>{candidate.publicId}</strong>).
        </p>

        <div className="dup-callout">
          <p>
            Attaching your evidence will increase public support, escalate priority to the zone officer,
            and avoid duplicate municipal work orders.
          </p>
          <div className="dup-meta">
            <span>Duplicate Confidence: <strong>{candidate.duplicateScore}%</strong></span>
            <span>Status: <strong>{candidate.status}</strong></span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => onAttach(candidate.issueId)}
          >
            Attach to Existing Issue ({candidate.publicId})
          </button>
          <button
            type="button"
            className="btn btn-gold"
            disabled={busy}
            onClick={onCreateSeparate}
          >
            Create Separate Work Order
          </button>
          {onReview && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={onReview}
            >
              Request Manual Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
