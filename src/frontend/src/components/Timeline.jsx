import { formatDate } from "../utils/formatDate.js";
import { statusLabels } from "../utils/statusLabels.js";

export function Timeline({ events = [] }) {
  if (!events.length) return <p className="muted">No audit events yet.</p>;
  return (
    <ol className="timeline">
      {events.map((ev) => (
        <li key={ev._id || `${ev.createdAt}-${ev.eventType}`}>
          <strong>{ev.eventType}</strong>
          {ev.toStatus ? ` → ${statusLabels[ev.toStatus] || ev.toStatus}` : ""}
          <div className="muted">
            {ev.actorRole} · {formatDate(ev.createdAt)}
          </div>
          {ev.message ? <p>{ev.message}</p> : null}
        </li>
      ))}
    </ol>
  );
}
