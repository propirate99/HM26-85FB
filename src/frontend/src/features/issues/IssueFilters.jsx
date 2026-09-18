export function IssueFilters({ categories = [], zones = [], value, onChange }) {
  return (
    <div className="row">
      <select
        value={value.categoryId || ""}
        onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={value.zoneId || ""}
        onChange={(e) => onChange({ ...value, zoneId: e.target.value })}
        aria-label="Filter by zone"
      >
        <option value="">All demo zones</option>
        {zones.map((z) => (
          <option key={z._id} value={z._id}>
            {z.displayName}
          </option>
        ))}
      </select>
      <select
        value={value.status || ""}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {[
          "ASSIGNED",
          "ACKNOWLEDGED",
          "IN_PROGRESS",
          "NEEDS_REVIEW",
          "ESCALATED",
          "RESOLVED",
        ].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
