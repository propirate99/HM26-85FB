import { DEFAULT_CONFIG } from "../services/simulatorEngine.js";

export function SimulatorControls({ config, onChangeConfig, onReset }) {
  const update = (key, value) => {
    onChangeConfig({ ...config, [key]: value });
  };

  return (
    <div className="swm-card">
      <div className="swm-card-header">
        <h3>⚙️ Scenario Parameters</h3>
        <button
          className="swm-tab-btn"
          style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}
          onClick={onReset}
        >
          Reset Defaults
        </button>
      </div>

      <div className="slider-group">
        {/* Waste Generation & Segregation */}
        <div className="slider-field">
          <div className="slider-label">
            <span>City Generation</span>
            <b>{config.gen} t/day</b>
          </div>
          <input
            type="range"
            min="380"
            max="900"
            step="10"
            value={config.gen}
            onChange={(e) => update("gen", Number(e.target.value))}
          />
        </div>

        <div className="slider-field">
          <div className="slider-label">
            <span>Source Segregation Uplift</span>
            <b>+{config.segUplift} pts</b>
          </div>
          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={config.segUplift}
            onChange={(e) => update("segUplift", Number(e.target.value))}
          />
        </div>

        <div className="slider-field">
          <div className="slider-label">
            <span>Bin Overflow Tolerance</span>
            <b>{config.tolerance}×</b>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.1"
            value={config.tolerance}
            onChange={(e) => update("tolerance", Number(e.target.value))}
          />
        </div>

        <hr style={{ borderColor: "rgba(255, 255, 255, 0.08)", margin: "0.25rem 0" }} />

        {/* Primary Fleet */}
        <div className="slider-field">
          <div className="slider-label">
            <span>Primary Auto-Tippers</span>
            <b>{config.tippers} vehicles</b>
          </div>
          <input
            type="range"
            min="80"
            max="320"
            step="2"
            value={config.tippers}
            onChange={(e) => update("tippers", Number(e.target.value))}
          />
        </div>

        <div className="slider-field">
          <div className="slider-label">
            <span>Tipper Max Trips/Day</span>
            <b>{config.tipperTrips} trips</b>
          </div>
          <input
            type="range"
            min="2"
            max="8"
            step="1"
            value={config.tipperTrips}
            onChange={(e) => update("tipperTrips", Number(e.target.value))}
          />
        </div>

        <hr style={{ borderColor: "rgba(255, 255, 255, 0.08)", margin: "0.25rem 0" }} />

        {/* Secondary Fleet */}
        <div className="slider-field">
          <div className="slider-label">
            <span>Secondary Compactors</span>
            <b>{config.compactors} vehicles</b>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="2"
            value={config.compactors}
            onChange={(e) => update("compactors", Number(e.target.value))}
          />
        </div>

        <div className="slider-field">
          <div className="slider-label">
            <span>Compactor Max Trips/Day</span>
            <b>{config.compactorTrips} trips</b>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={config.compactorTrips}
            onChange={(e) => update("compactorTrips", Number(e.target.value))}
          />
        </div>

        <hr style={{ borderColor: "rgba(255, 255, 255, 0.08)", margin: "0.25rem 0" }} />

        {/* Operational Policies */}
        <div className="slider-field">
          <div className="slider-label">
            <span>Routing Policy</span>
            <b style={{ textTransform: "capitalize" }}>{config.routeRule}</b>
          </div>
          <select
            value={config.routeRule}
            onChange={(e) => update("routeRule", e.target.value)}
            style={{
              background: "#110e0f",
              color: "#fff",
              border: "1px solid rgba(201, 162, 39, 0.3)",
              padding: "0.4rem",
              borderRadius: "4px",
            }}
          >
            <option value="nearest">Nearest Processing Facility</option>
            <option value="balanced">Capacity Balanced Routing</option>
            <option value="zone">Fixed Zonal Assignment</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.night}
              onChange={(e) => update("night", e.target.checked)}
            />
            <span>Night Compactor Shift (+35% speed)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
