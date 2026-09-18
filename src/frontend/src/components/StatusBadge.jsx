import { statusLabels } from "../utils/statusLabels.js";

export function StatusBadge({ status }) {
  return <span className="badge badge-status">{statusLabels[status] || status}</span>;
}
