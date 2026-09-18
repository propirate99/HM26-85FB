import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";
import { VerificationBadge } from "./VerificationBadge.jsx";
import { formatDate } from "../utils/formatDate.js";

export function IssueCard({ issue, to }) {
  const href = to || `/public/${issue.publicId}`;
  return (
    <Link to={href} className="card issue-card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="muted">{issue.publicId}</span>
        <StatusBadge status={issue.status} />
      </div>
      <h3>{issue.title}</h3>
      <p className="muted">{issue.description}</p>
      <div className="row">
        <VerificationBadge status={issue.verificationStatus} score={issue.verificationScore} />
        <span className="badge badge-status">{issue.category?.name || issue.category?.code}</span>
      </div>
      <p className="muted">
        {issue.zone?.displayName}
        {issue.zone?.isDemoData ? " (demo zone)" : ""} · {issue.supportCount} face this too ·{" "}
        {formatDate(issue.createdAt)}
      </p>
      {issue.approximateLocationLabel ? (
        <p className="muted">{issue.approximateLocationLabel}</p>
      ) : null}
    </Link>
  );
}
