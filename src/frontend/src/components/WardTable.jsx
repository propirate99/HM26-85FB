import { useState, useMemo } from "react";

export function WardTable({ wards = [], onSelectWard, selectedWardId }) {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("ward");
  const [sortDir, setSortDir] = useState(1);

  const filtered = useMemo(() => {
    return wards.filter((w) => {
      const wId = w.ward || w.ward_no;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (w.name && w.name.toLowerCase().includes(q)) ||
        String(wId) === q;
      const matchesZone =
        zoneFilter === "all" || String(w.zone) === String(zoneFilter);
      const status = w.status || (w.util > 1 ? "critical" : "stable");
      const matchesStatus =
        statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesZone && matchesStatus;
    });
  }, [wards, search, zoneFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === "string") {
        return sortDir * aVal.localeCompare(bVal);
      }
      return sortDir * (aVal - bVal);
    });
  }, [filtered, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => -d);
    } else {
      setSortField(field);
      setSortDir(1);
    }
  };

  return (
    <div className="swm-card">
      <div className="swm-card-header">
        <div>
          <h3>MCC Ward Register (65 Wards)</h3>
          <span className="swm-subtitle">
            Showing {sorted.length} of {wards.length} wards
          </span>
        </div>
        <div className="swm-filters" style={{ padding: "0.4rem 0.6rem" }}>
          <input
            type="search"
            placeholder="Search ward or #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "160px" }}
          />
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="all">All Zones</option>
            {[1, 2, 3, 4, 5, 6, 7].map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="critical">Critical</option>
            <option value="strained">Strained</option>
            <option value="stable">Stable</option>
          </select>
        </div>
      </div>

      <div className="swm-table-wrapper">
        <table className="swm-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("ward")}>Ward #</th>
              <th onClick={() => handleSort("name")}>Locality</th>
              <th onClick={() => handleSort("zone")}>Zone</th>
              <th onClick={() => handleSort("population")}>Population</th>
              <th onClick={() => handleSort("gen")}>Gen (TPD)</th>
              <th onClick={() => handleSort("rate")}>Collection %</th>
              <th onClick={() => handleSort("backlog")}>Backlog (t)</th>
              <th onClick={() => handleSort("distance_km")}>Nearest Plant</th>
              <th onClick={() => handleSort("status")}>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((w) => {
              const wId = w.ward || w.ward_no;
              const status = w.status || (w.util > 1 ? "critical" : "stable");
              const isSelected = selectedWardId === wId;
              return (
                <tr
                  key={wId}
                  style={isSelected ? { background: "rgba(201, 162, 39, 0.15)" } : {}}
                >
                  <td>
                    <strong>W{wId}</strong>
                  </td>
                  <td>{w.name}</td>
                  <td>Zone {w.zone}</td>
                  <td>{Number(w.population || 0).toLocaleString("en-IN")}</td>
                  <td>{(w.gen || w.avg_generated_tpd || 0).toFixed(1)}</td>
                  <td>
                    {(w.rate || w.collection_pct || 100).toFixed(1)}%
                  </td>
                  <td>
                    <span
                      style={{
                        color:
                          (w.backlog || w.standing_backlog_t || 0) > 3
                            ? "#ef4444"
                            : "inherit",
                        fontWeight:
                          (w.backlog || w.standing_backlog_t || 0) > 3 ? "bold" : "normal",
                      }}
                    >
                      {(w.backlog || w.standing_backlog_t || 0).toFixed(1)} t
                    </span>
                  </td>
                  <td>
                    {w.nearest_facility || w.facility?.name || "VID"} (
                    {(w.distance_km || w.haulKm || 0).toFixed(1)} km)
                  </td>
                  <td>
                    <span className={`status-pill ${status.toLowerCase()}`}>
                      {status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="swm-tab-btn"
                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => onSelectWard && onSelectWard(w)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
