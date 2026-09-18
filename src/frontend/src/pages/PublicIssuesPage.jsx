import { useEffect, useState } from "react";
import { issueApi } from "../api/issueApi.js";
import { IssueCard } from "../components/IssueCard.jsx";
import { IssueFilters } from "../features/issues/IssueFilters.jsx";
import { EmptyState } from "../components/EmptyState.jsx";

export function PublicIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [config, setConfig] = useState({ categories: [], zones: [] });
  const [filters, setFilters] = useState({});

  useEffect(() => {
    issueApi.config().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    const q = {};
    if (filters.categoryId) q.categoryId = filters.categoryId;
    if (filters.zoneId) q.zoneId = filters.zoneId;
    if (filters.status) q.status = filters.status;
    issueApi.publicList(q).then((d) => setIssues(d.issues || []));
  }, [filters]);

  return (
    <main className="shell">
      <h1>Public issues</h1>
      <p className="muted">
        Sanitized feed: no personal data, approximate location only. Sorted by recency, not
        popularity.
      </p>
      <IssueFilters categories={config.categories} zones={config.zones} value={filters} onChange={setFilters} />
      {issues.length ? (
        <div className="grid" style={{ marginTop: 16 }}>
          {issues.map((i) => (
            <IssueCard key={i.publicId} issue={i} />
          ))}
        </div>
      ) : (
        <EmptyState title="No public issues" body="Seed demo data or submit a verified report." />
      )}
    </main>
  );
}
