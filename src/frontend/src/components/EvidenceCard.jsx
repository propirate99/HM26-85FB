import { mediaUrl } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";

export function EvidenceCard({ evidence }) {
  if (!evidence) return null;
  return (
    <article className="card">
      <img src={mediaUrl(evidence.publicUrl)} alt={`${evidence.type} evidence`} />
      <p>
        <strong>{evidence.evidenceId}</strong> · {evidence.type}
      </p>
      <p className="muted">
        {evidence.capturedThroughApp ? "Captured in app" : "Not app-captured"} ·{" "}
        {formatDate(evidence.capturedAt)}
      </p>
    </article>
  );
}
