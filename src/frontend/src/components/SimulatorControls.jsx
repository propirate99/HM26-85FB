import { BrandMark } from "./BrandMark.jsx";

export function SimulatorControls({ config, onChangeConfig, onReset, onBaseline }) {
  const update = (key, value) => onChangeConfig({ ...config, [key]: value });

  return (
    <aside className="sidebar">
      <div className="brand" style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--line-soft)" }}>
        <BrandMark />
        <div>
          <h1>Mysuru SWM Simulator</h1>
          <p className="brand-sub">MCC · 65 wards · 9 zones · 600 TPD</p>
        </div>
      </div>
      <div className="panel-scroll">
        <section className="group">
          <header className="group-h">
            <h2>Generation</h2>
          </header>
          <label className="fld">
            <span>
              City generation <b>{config.gen}</b> t/day
            </span>
            <input type="range" min="380" max="900" step="10" value={config.gen} onChange={(e) => update("gen", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Source segregation uplift <b>{config.segUplift}</b> pts
            </span>
            <input type="range" min="0" max="35" step="1" value={config.segUplift} onChange={(e) => update("segUplift", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Bin overflow tolerance <b>{config.tolerance}</b>× day load
            </span>
            <input type="range" min="1" max="3" step="0.1" value={config.tolerance} onChange={(e) => update("tolerance", Number(e.target.value))} />
          </label>
        </section>

        <section className="group">
          <header className="group-h">
            <h2>Primary fleet · auto tippers</h2>
          </header>
          <label className="fld">
            <span>
              Vehicles in service <b>{config.tippers}</b>
            </span>
            <input type="range" min="80" max="320" step="2" value={config.tippers} onChange={(e) => update("tippers", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Payload <b>{config.tipperCap.toFixed(2)}</b> t
            </span>
            <input type="range" min="0.5" max="2.5" step="0.05" value={config.tipperCap} onChange={(e) => update("tipperCap", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Max trips / vehicle / day <b>{config.tipperTrips}</b>
            </span>
            <input type="range" min="2" max="8" step="1" value={config.tipperTrips} onChange={(e) => update("tipperTrips", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Fuel use <b>{config.tipperFuel}</b> L/100 km
            </span>
            <input type="range" min="5" max="20" step="0.5" value={config.tipperFuel} onChange={(e) => update("tipperFuel", Number(e.target.value))} />
          </label>
        </section>

        <section className="group">
          <header className="group-h">
            <h2>Secondary fleet · compactors &amp; lorries</h2>
          </header>
          <label className="fld">
            <span>
              Vehicles in service <b>{config.compactors}</b>
            </span>
            <input type="range" min="10" max="120" step="1" value={config.compactors} onChange={(e) => update("compactors", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Payload <b>{config.compactorCap}</b> t
            </span>
            <input type="range" min="3" max="16" step="0.5" value={config.compactorCap} onChange={(e) => update("compactorCap", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Max trips / vehicle / day <b>{config.compactorTrips}</b>
            </span>
            <input type="range" min="1" max="6" step="1" value={config.compactorTrips} onChange={(e) => update("compactorTrips", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Fuel use <b>{config.compactorFuel}</b> L/100 km
            </span>
            <input type="range" min="15" max="60" step="1" value={config.compactorFuel} onChange={(e) => update("compactorFuel", Number(e.target.value))} />
          </label>
        </section>

        <section className="group">
          <header className="group-h">
            <h2>Route &amp; duration</h2>
          </header>
          <label className="fld">
            <span>
              Shift length <b>{config.shift}</b> h
            </span>
            <input type="range" min="4" max="12" step="0.5" value={config.shift} onChange={(e) => update("shift", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Service time / collection point <b>{config.serviceMin}</b> min
            </span>
            <input type="range" min="1" max="10" step="0.25" value={config.serviceMin} onChange={(e) => update("serviceMin", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              In-ward speed <b>{config.vLocal}</b> km/h
            </span>
            <input type="range" min="5" max="25" step="1" value={config.vLocal} onChange={(e) => update("vLocal", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Haul speed to facility <b>{config.vHaul}</b> km/h
            </span>
            <input type="range" min="12" max="50" step="1" value={config.vHaul} onChange={(e) => update("vHaul", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Tipping + queue at facility <b>{config.tipMin}</b> min
            </span>
            <input type="range" min="4" max="45" step="1" value={config.tipMin} onChange={(e) => update("tipMin", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>
              Peak-hour congestion drag <b>{config.congestion}</b>%
            </span>
            <input type="range" min="0" max="60" step="1" value={config.congestion} onChange={(e) => update("congestion", Number(e.target.value))} />
          </label>
        </section>

        <section className="group">
          <header className="group-h">
            <h2>Collection frequency</h2>
          </header>
          <div className="seg" role="group">
            {["uniform", "core", "density"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={config.freqMode === mode ? "on" : ""}
                onClick={() => update("freqMode", mode)}
              >
                {mode === "uniform" ? "Uniform" : mode === "core" ? "Core-priority" : "Density-tiered"}
              </button>
            ))}
          </div>
          <label className="fld">
            <span>
              Base pickups / week <b>{config.freq}</b>
            </span>
            <input type="range" min="2" max="14" step="1" value={config.freq} onChange={(e) => update("freq", Number(e.target.value))} />
          </label>
        </section>

        <section className="group">
          <header className="group-h">
            <h2>Network scenario</h2>
          </header>
          <label className="fld">
            <span>
              New collection points <b>{config.newPoints}</b>%
            </span>
            <input type="range" min="-30" max="120" step="5" value={config.newPoints} onChange={(e) => update("newPoints", Number(e.target.value))} />
          </label>
          <label className="fld">
            <span>Routing rule</span>
            <select value={config.routeRule} onChange={(e) => update("routeRule", e.target.value)}>
              <option value="nearest">Reroute to nearest facility</option>
              <option value="zone">Legacy zone assignment</option>
              <option value="balanced">Capacity-balanced routing</option>
            </select>
          </label>
          <label className="chk">
            <input type="checkbox" checked={config.transfer} onChange={(e) => update("transfer", e.target.checked)} />
            <span>Open transfer station (Bannimantap)</span>
          </label>
          <label className="chk">
            <input type="checkbox" checked={config.night} onChange={(e) => update("night", e.target.checked)} />
            <span>Night shift for trunk hauling</span>
          </label>
          <label className="fld">
            <span>
              Diesel price ₹<b>{config.diesel}</b>/L
            </span>
            <input type="range" min="70" max="130" step="1" value={config.diesel} onChange={(e) => update("diesel", Number(e.target.value))} />
          </label>
        </section>

        <div className="row">
          <button type="button" className="btn ghost" onClick={onBaseline}>
            Set as baseline
          </button>
          <button type="button" className="btn ghost" onClick={onReset}>
            Reset inputs
          </button>
        </div>
        <p className="foot">
          Ward polygons are indicative Voronoi partitions of the MCC limit; fleet and facility figures
          are calibrated to published MCC data, not live SCADA feeds.
        </p>
      </div>
    </aside>
  );
}
