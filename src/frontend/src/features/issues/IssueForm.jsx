export function IssueForm({ categories, zones, value, onChange }) {
  return (
    <div className="form-grid">
      <label className="f">
        <span>Category</span>
        <select
          value={value.categoryId}
          onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="f">
        <span>Ward / zone</span>
        <select
          value={value.zoneId}
          onChange={(e) => onChange({ ...value, zoneId: e.target.value })}
        >
          <option value="">Let GPS derive the zone</option>
          {zones.map((z) => (
            <option key={z._id} value={z._id}>
              {z.displayName}
              {z.isDemoData ? " (demo)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="f full">
        <span>What is the problem?</span>
        <textarea
          rows={4}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Bin has not been cleared for three days and is spilling onto the footpath."
        />
      </label>
    </div>
  );
}
