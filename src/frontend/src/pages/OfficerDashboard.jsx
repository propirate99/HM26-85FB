import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/adminApi.js";
import { IssueCard } from "../components/IssueCard.jsx";
import { IssueFilters } from "../features/issues/IssueFilters.jsx";
import { issueApi } from "../api/issueApi.js";
import { NotificationPanel } from "../features/notifications/NotificationPanel.jsx";

export function OfficerDashboard() {
  const [issues, setIssues] = useState([]);
  const [config, setConfig] = useState({ categories: [], zones: [] });
  const [filters, setFilters] = useState({});

  useEffect(() => {
    adminApi.queue().then((d) => setIssues(d.issues || []));
    issueApi.config().then(setConfig);
  }, []);

  const shown = useMemo(() => {
    return issues.filter((i) => {
      if (filters.categoryId && i.category?._id !== filters.categoryId) return false;
      if (filters.zoneId && i.zone?.id !== filters.zoneId && i.zone?._id !== filters.zoneId) return false;
      if (filters.status && i.status !== filters.status) return false;
      return true;
    });
  }, [issues, filters]);

  return (
    <main className="shell">
      <h1>Officer queue</h1>
      <p className="muted">Only issues in your assigned demo zone. URL tricks cannot expand access.</p>
      <IssueFilters categories={config.categories} zones={config.zones} value={filters} onChange={setFilters} />
      <div className="grid" style={{ marginTop: 16 }}>
        {shown.map((i) => (
          <IssueCard key={i.id} issue={i} to={`/officer/issues/${i.id}`} />
        ))}
      </div>
      <section>
        <h2>Alerts</h2>
        <NotificationPanel />
      </section>
    </main>
  );
}
