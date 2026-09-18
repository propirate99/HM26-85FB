import { verificationLabels } from "../utils/statusLabels.js";

const tone = {
  VERIFIED_WITH_LOW_RISK: "badge-verified",
  VERIFIED_BUT_REVIEWABLE: "badge-review",
  NEEDS_REVIEW: "badge-review",
  INSUFFICIENT_OR_SUSPICIOUS: "badge-risk",
  PENDING: "badge-status",
};

export function VerificationBadge({ status, score }) {
  return (
    <span className={`badge ${tone[status] || "badge-status"}`}>
      {verificationLabels[status] || status}
      {score != null ? ` · ${score}` : ""}
    </span>
  );
}
