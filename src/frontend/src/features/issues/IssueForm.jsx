export function IssueForm({ categories, zones, value, onChange }) {
  return (
    <div>
      <label htmlFor="category">Problem category</label>
      <select
        id="category"
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
      <label htmlFor="zone">Selected demo zone</label>
      <select
        id="zone"
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
      <label htmlFor="desc">What did you see?</label>
      <textarea
        id="desc"
        rows={5}
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder="Short, factual description. Avoid personal names."
      />
    </div>
  );
}
