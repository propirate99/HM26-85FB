/* MCC Swachha Grid — ward-level waste operations dashboard */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, d = 1) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const int = n => Math.round(n).toLocaleString('en-IN');
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

let DB = null, MAP = null, layers = {}, charts = {}, sort = { key: 'score', dir: -1 }, drawerChart = null;
const state = { zone: 'all', ward: 'all', q: '', from: null, to: null, status: 'all', minDist: 0, mode: 'deficit', days: 30 };

/* ---------------- boot ---------------- */
(async function init() {
  const res = await fetch('data/swm.json');
  DB = await res.json();
  DB.wardById = Object.fromEntries(DB.wards.map(w => [w.ward, w]));
  DB.facById = Object.fromEntries(DB.facilities.map(f => [f.id, f]));
  DB.dates = [...new Set(DB.daily.map(r => r.date))].sort();

  buildFilters();
  buildMap();
  buildFacilityCards();
  buildSources();
  wire();
  applyPreferredTheme();
  render();
})();

function buildFilters() {
  const zSel = $('#f-zone');
  [...new Set(DB.wards.map(w => w.zone))].sort().forEach(z => {
    const n = DB.wards.filter(w => w.zone === z).length;
    zSel.insertAdjacentHTML('beforeend', `<option value="${z}">Zone ${z} — ${n} wards</option>`);
  });
  fillWardSelect();
  const last = DB.dates.at(-1);
  state.to = last;
  state.from = DB.dates[Math.max(0, DB.dates.length - state.days)];
  $('#f-from').value = state.from; $('#f-from').min = DB.dates[0]; $('#f-from').max = last;
  $('#f-to').value = state.to; $('#f-to').min = DB.dates[0]; $('#f-to').max = last;
}

function fillWardSelect() {
  const sel = $('#f-ward');
  const pool = DB.wards.filter(w => state.zone === 'all' || w.zone === +state.zone);
  sel.innerHTML = `<option value="all">All ${pool.length} wards</option>` +
    pool.slice().sort((a, b) => a.ward - b.ward)
      .map(w => `<option value="${w.ward}">W${w.ward} · ${w.name}</option>`).join('');
  sel.value = state.ward;
  if (sel.value !== String(state.ward)) { state.ward = 'all'; sel.value = 'all'; }
}

/* ---------------- aggregation ---------------- */
function selectedWards() {
  const q = state.q.toLowerCase().trim();
  return DB.wards.filter(w =>
    (state.zone === 'all' || w.zone === +state.zone) &&
    (state.ward === 'all' || w.ward === +state.ward) &&
    (!q || w.name.toLowerCase().includes(q) || String(w.ward) === q) &&
    w.distance_km >= state.minDist);
}

function aggregate() {
  const wardSet = new Set(selectedWards().map(w => w.ward));
  const rows = DB.daily.filter(r => r.date >= state.from && r.date <= state.to && wardSet.has(r.ward));
  const byWard = new Map();
  for (const r of rows) {
    let a = byWard.get(r.ward);
    if (!a) byWard.set(r.ward, a = { gen: 0, coll: 0, unc: 0, n: 0, backlog: 0, peak: 0 });
    a.gen += r.generated; a.coll += r.collected; a.unc += r.uncollected; a.n++;
    a.backlog = r.backlog; a.peak = Math.max(a.peak, r.generated);
  }
  let out = [];
  for (const [id, a] of byWard) {
    const w = DB.wardById[id];
    const gen = a.gen / a.n, coll = a.coll / a.n, unc = a.unc / a.n;
    const rate = gen ? (coll / gen) * 100 : 100;
    const util = gen / w.fleet_capacity_tpd;
    out.push({
      ...w, gen, coll, unc, rate, util, backlog: a.backlog, peak: a.peak, days: a.n,
      tkm: coll * w.distance_km,
      status: util > 1.0 || rate < 92 ? 'critical' : util > 0.93 || rate < 97 ? 'strained' : 'stable'
    });
  }
  // priority score, normalised across the current selection
  const mx = k => Math.max(...out.map(o => o[k]), 1e-9);
  const m = { unc: mx('unc'), backlog: mx('backlog'), distance_km: mx('distance_km'), gen: mx('gen') };
  out.forEach(o => {
    const deficit = o.unc / m.unc, back = o.backlog / m.backlog;
    const dist = o.distance_km / m.distance_km, load = o.gen / m.gen;
    const seg = 1 - Math.min(1, o.segregation_pct / 100);
    o.score = Math.round((0.34 * deficit + 0.24 * back + 0.19 * dist + 0.15 * load + 0.08 * seg) * 100);
  });
  const filtered = state.status === 'all' ? out : out.filter(o => o.status === state.status);
  const tot = k => filtered.reduce((s, o) => s + o[k], 0);
  const city = {
    wards: filtered.length, gen: tot('gen'), coll: tot('coll'), unc: tot('unc'),
    backlog: tot('backlog'), capacity: tot('fleet_capacity_tpd'), tkm: tot('tkm'),
    population: tot('population'), households: tot('households'),
    critical: filtered.filter(o => o.status === 'critical').length,
    strained: filtered.filter(o => o.status === 'strained').length,
    avgDist: filtered.length ? filtered.reduce((s, o) => s + o.distance_km * o.gen, 0) / (tot('gen') || 1) : 0,
    trips: filtered.reduce((s, o) => s + o.autotippers * o.trips_per_vehicle, 0),
    vehicles: filtered.reduce((s, o) => s + o.autotippers, 0)
  };
  city.rate = city.gen ? (city.coll / city.gen) * 100 : 0;
  // city trend series over the range
  const idSet = new Set(filtered.map(o => o.ward));
  const series = new Map();
  for (const r of rows) {
    if (!idSet.has(r.ward)) continue;
    let s = series.get(r.date);
    if (!s) series.set(r.date, s = { generated: 0, collected: 0, backlog: 0 });
    s.generated += r.generated; s.collected += r.collected; s.backlog += r.backlog;
  }
  const trend = [...series.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1)
    .map(([date, v]) => ({ date, ...v }));
  // previous equal-length window for deltas
  const i0 = DB.dates.indexOf(state.from), i1 = DB.dates.indexOf(state.to);
  const len = i1 - i0 + 1, p0 = Math.max(0, i0 - len);
  const pf = DB.dates[p0], pt = DB.dates[Math.max(0, i0 - 1)];
  let pg = 0, pc = 0, pn = 0;
  if (i0 > 0) {
    for (const r of DB.daily) {
      if (r.date >= pf && r.date <= pt && idSet.has(r.ward)) { pg += r.generated; pc += r.collected; pn++; }
    }
  }
  const pdays = new Set(DB.dates.slice(p0, i0)).size || 1;
  const prev = { gen: pg / pdays, rate: pg ? (pc / pg) * 100 : null };
  return { wards: filtered, city, trend, prev };
}

/* ---------------- render ---------------- */
function render() {
  const A = window.AGG = aggregate();
  $('#scope-line').textContent = [
    state.zone === 'all' ? 'All zones' : `Zone ${state.zone}`,
    `${A.city.wards} ward${A.city.wards === 1 ? '' : 's'}`,
    `${A.trend.length} days · ${niceDate(state.from)} – ${niceDate(state.to)}`
  ].join(' · ');
  renderKPIs(A); renderCapacityStrip(A); renderMap(A);
  renderTrend(A); renderScatter(A); renderZone(A); renderTkm(A);
  renderTable(A); renderPriority(A);
}

function delta(cur, prev, invert) {
  if (prev == null || !isFinite(prev) || prev === 0) return '<span class="delta flat">— no prior window</span>';
  const d = ((cur - prev) / prev) * 100;
  const cls = Math.abs(d) < 0.5 ? 'flat' : (d > 0 ? (invert ? 'down' : 'up') : (invert ? 'up' : 'down'));
  return `<span class="delta ${cls}">${d > 0 ? '▲' : d < 0 ? '▼' : '■'} ${fmt(Math.abs(d), 1)}%</span> vs prior period`;
}

function renderKPIs(A) {
  const c = A.city;
  const procCap = DB.meta.total_processing_capacity_tpd;
  const k = [
    { label: 'Waste generated', val: fmt(c.gen, 1), unit: 't/day', meta: delta(c.gen, A.prev.gen), cls: '' },
    { label: 'Collection completion', val: fmt(c.rate, 1), unit: '%', meta: delta(c.rate, A.prev.rate, true), cls: c.rate < 93 ? 'bad' : c.rate < 97 ? 'warn' : '' },
    { label: 'Uncollected daily surplus', val: fmt(c.unc, 1), unit: 't/day', meta: `${fmt(c.gen ? c.unc / c.gen * 100 : 0, 1)}% of generation`, cls: 'bad' },
    { label: 'Standing backlog', val: fmt(c.backlog, 1), unit: 't', meta: 'accumulated at street bins', cls: 'warn' },
    { label: 'Wards over capacity', val: int(c.critical), unit: `/ ${c.wards}`, meta: `${int(c.strained)} more strained`, cls: c.critical ? 'bad' : '' },
    { label: 'Mean haul distance', val: fmt(c.avgDist, 1), unit: 'km', meta: `${int(c.tkm)} tonne-km/day`, cls: 'info' },
    { label: 'Fleet capacity assigned', val: fmt(c.capacity, 0), unit: 't/day', meta: `${int(c.vehicles)} autotippers · ${int(c.trips)} trips`, cls: 'info' },
    { label: 'Plant capacity utilised', val: fmt(Math.min(999, c.coll / procCap * 100), 0), unit: '%', meta: `${int(procCap)} t/day nameplate citywide`, cls: c.coll / procCap > 0.9 ? 'warn' : '' }
  ];
  $('#kpis').innerHTML = k.map(x => `<div class="kpi ${x.cls}">
    <div class="k-label">${x.label}</div>
    <div class="k-val">${x.val}<small>${x.unit}</small></div>
    <div class="k-meta">${x.meta}</div></div>`).join('');
}

function renderCapacityStrip(A) {
  const c = A.city;
  const collected = c.coll, surplus = c.unc;
  const total = collected + surplus || 1;
  const segs = [
    { label: 'Collected & hauled', v: collected, color: cssv('--ok') },
    { label: 'Uncollected surplus', v: surplus, color: cssv('--bad') }
  ];
  $('#capacity-strip').innerHTML = `
    <div class="cap-head">
      <div><h3>Service capacity balance</h3>
      <p class="sub">${int(c.households)} households · ${int(c.population)} residents in scope. Fleet capacity ${fmt(c.capacity, 0)} t/day against ${fmt(c.gen, 1)} t/day generated.</p></div>
      <div class="num" style="font-family:var(--font-display);font-weight:700;font-size:var(--text-lg)">${fmt(c.gen ? collected / c.gen * 100 : 0, 1)}% serviced</div>
    </div>
    <div class="cap-bar">${segs.map(s => `<div class="cap-seg" style="flex:${Math.max(s.v, 0.001)};background:${s.color}" title="${s.label}">${s.v / total > 0.07 ? fmt(s.v, 1) + ' t' : ''}</div>`).join('')}</div>
    <div class="cap-key">${segs.map(s => `<span><i class="dot" style="background:${s.color}"></i>${s.label} — ${fmt(s.v, 1)} t/day</span>`).join('')}
      <span><i class="dot" style="background:${cssv('--info')}"></i>Installed processing capacity (nameplate) — ${int(DB.meta.total_processing_capacity_tpd)} t/day</span></div>`;
}

/* ---------------- map ---------------- */
function buildMap() {
  MAP = L.map('map', { center: [12.3045, 76.6465], zoom: 12.4, zoomControl: true, scrollWheelZoom: false });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors', maxZoom: 18
  }).addTo(MAP);
  MAP.on('click', () => MAP.scrollWheelZoom.enable());
  layers.heat = L.layerGroup().addTo(MAP);
  layers.haul = L.layerGroup().addTo(MAP);
  layers.wards = L.layerGroup().addTo(MAP);
  layers.fac = L.layerGroup().addTo(MAP);
}

const SCALES = {
  deficit: { title: 'Uncollected surplus vs capacity', stops: [[0, '--ok', 'Within capacity'], [0.35, '--warn', 'Marginal'], [0.9, '--bad', 'Over capacity']], val: w => w.util, dom: [0.8, 1.12] },
  tonnes: { title: 'Daily tonnes generated', stops: [[0, '--info', 'Low'], [0.5, '--violet', 'Medium'], [1, '--bad', 'High']], val: w => w.gen, dom: null },
  backlog: { title: 'Standing backlog (tonnes)', stops: [[0, '--ok', 'Cleared'], [0.5, '--warn', 'Building'], [1, '--bad', 'Accumulating']], val: w => w.backlog, dom: null },
  distance: { title: 'Haul distance to plant (km)', stops: [[0, '--ok', 'Near'], [0.5, '--warn', 'Moderate'], [1, '--bad', 'Far']], val: w => w.distance_km, dom: null }
};

/* resolve any CSS color (incl. oklch) to [r,g,b] so SVG attributes stay valid */
const _cv = Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
const _ctx = _cv.getContext('2d', { willReadFrequently: true });
const _cache = new Map();
function rgbOf(color) {
  if (_cache.has(color)) return _cache.get(color);
  let v = [128, 128, 128];
  try {
    _ctx.clearRect(0, 0, 1, 1);
    _ctx.fillStyle = color;
    _ctx.fillRect(0, 0, 1, 1);
    v = [..._ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
  } catch (e) { /* keep neutral fallback */ }
  _cache.set(color, v);
  return v;
}
const hexOf = c => '#' + rgbOf(c).map(v => v.toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => {
  const A = rgbOf(a), B = rgbOf(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, k)))).join(',')})`;
};
function colorFor(t) {
  const stops = SCALES[state.mode].stops.map(s => [s[0], cssv(s[1])]);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0] || i === stops.length - 1) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i];
      return mix(ca, cb, (t - a) / (b - a || 1));
    }
  }
  return stops[0][1];
}
const alpha = (color, a) => { const c = rgbOf(color); return `rgba(${c.join(',')},${a})`; };

function renderMap(A) {
  ['heat', 'haul', 'wards', 'fac'].forEach(k => layers[k].clearLayers());
  const sc = SCALES[state.mode];
  const vals = A.wards.map(sc.val);
  const lo = sc.dom ? sc.dom[0] : Math.min(...vals, 0), hi = sc.dom ? sc.dom[1] : Math.max(...vals, 1e-6);
  const norm = v => Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
  const maxGen = Math.max(...A.wards.map(w => w.gen), 1);

  A.wards.forEach(w => {
    const t = norm(sc.val(w)), col = colorFor(t);
    const radius = 8 + 21 * Math.sqrt(w.gen / maxGen);
    if (w.status !== 'stable') {
      layers.heat.addLayer(L.circleMarker([w.lat, w.lng], {
        radius: radius * (w.status === 'critical' ? 2.5 : 1.9), stroke: false,
        fillColor: cssv(w.status === 'critical' ? '--bad' : '--warn'),
        fillOpacity: w.status === 'critical' ? 0.17 : 0.1, interactive: false
      }));
    }
    const f = DB.facById[w.nearest_facility];
    layers.haul.addLayer(L.polyline([[w.lat, w.lng], [f.lat, f.lng]], {
      color: cssv(w.distance_km > 7 ? '--bad' : '--ink-3'),
      weight: w.distance_km > 7 ? 1.6 : 0.8, opacity: w.distance_km > 7 ? 0.55 : 0.22,
      dashArray: w.distance_km > 7 ? null : '3 4', interactive: false
    }));
    const m = L.circleMarker([w.lat, w.lng], {
      radius, color: cssv('--surface'), weight: 1.5, fillColor: col, fillOpacity: 0.86
    }).bindPopup(popupHTML(w), { closeButton: false });
    m.on('popupopen', () => { const b = $('.pop-btn'); if (b) b.onclick = () => { MAP.closePopup(); openDrawer(w.ward); }; });
    layers.wards.addLayer(m);
  });

  DB.facilities.forEach(f => {
    const load = facLoad(A, f);
    const util = load / f.capacity_tpd;
    const major = f.capacity_tpd >= 150;
    layers.fac.addLayer(L.marker([f.lat, f.lng], {
      icon: L.divIcon({
        className: '', iconSize: [major ? 30 : 22, major ? 30 : 22], iconAnchor: [major ? 15 : 11, major ? 15 : 11],
        html: `<div style="width:100%;height:100%;border-radius:6px;display:grid;place-items:center;
          background:${cssv(util > 1 ? '--bad' : '--accent')};color:${cssv('--accent-ink')};
          border:2px solid ${cssv('--surface')};box-shadow:0 2px 8px rgba(0,0,0,.45);
          font:700 ${major ? 11 : 9}px/1 var(--font-display)">${major ? f.id : '·'}</div>`
      })
    }).bindPopup(`<div class="pop-title">${f.name}</div>
      <div class="pop-sub">${f.kind} · serves ${f.serves}</div>
      <div class="pop-grid"><span>Installed capacity</span><span>${int(f.capacity_tpd)} t/day</span>
      <span>Inbound (scope)</span><span>${fmt(load, 1)} t/day</span>
      <span>Utilisation</span><span>${fmt(util * 100, 0)}%</span></div>`, { closeButton: false }));
  });

  $('#map-legend').innerHTML = `<b>${sc.title}</b>
    ${sc.stops.map(s => `<div class="row"><i class="dot" style="background:${cssv(s[1])}"></i>${s[2]}</div>`).join('')}
    <div class="row" style="margin-top:7px;color:var(--ink-3)">Circle area ∝ tonnes/day · glow marks wards past service capacity</div>`;
  syncLayerToggles();
}

function popupHTML(w) {
  return `<div class="pop-title">Ward ${w.ward} · ${w.name}</div>
  <div class="pop-sub">Zone ${w.zone} · ${int(w.population)} residents</div>
  <div class="pop-grid">
    <span>Generated</span><span>${fmt(w.gen, 2)} t/day</span>
    <span>Collected</span><span>${fmt(w.coll, 2)} t/day (${fmt(w.rate, 1)}%)</span>
    <span>Uncollected</span><span>${fmt(w.unc, 2)} t/day</span>
    <span>Backlog</span><span>${fmt(w.backlog, 2)} t</span>
    <span>Nearest plant</span><span>${w.nearest_facility} · ${fmt(w.distance_km, 1)} km</span>
    <span>Status</span><span>${w.status}</span>
  </div><button class="pop-btn">Open ward detail</button>`;
}

function syncLayerToggles() {
  const set = (id, layer) => { $(id).checked ? MAP.addLayer(layer) : MAP.removeLayer(layer); };
  set('#t-heat', layers.heat); set('#t-haul', layers.haul); set('#t-fac', layers.fac);
  if (MAP.hasLayer(layers.wards)) layers.wards.eachLayer(l => l.bringToFront());
}

function buildFacilityCards() {
  $('#fac-cards').innerHTML = DB.facilities.map(f => `<div class="fac">
    <div class="fac-name">${f.name}</div>
    <div class="fac-kind">${f.kind} · ${int(f.capacity_tpd)} t/day · ${f.serves}</div>
    <div class="meter"><i id="fm-${f.id}"></i></div>
    <div class="fac-num"><span id="fl-${f.id}">—</span><span>cap ${int(f.capacity_tpd)} t</span></div></div>`).join('');
}
function facLoad(A, f) {
  if (f.capacity_tpd >= 150) return A.wards.filter(w => w.nearest_facility === f.id).reduce((s, w) => s + w.coll, 0);
  // decentralised units take the wet fraction of their nearby catchment
  return A.wards.filter(w => w.zwm_facility === f.id && w.zwm_distance_km <= 5)
    .reduce((s, w) => s + w.coll * 0.14, 0);
}
function updateFacilityCards(A) {
  DB.facilities.forEach(f => {
    const load = facLoad(A, f);
    const u = Math.min(1.35, load / f.capacity_tpd);
    const bar = $('#fm-' + f.id); if (!bar) return;
    bar.style.width = Math.min(100, u * 100) + '%';
    bar.style.background = cssv(u > 1 ? '--bad' : u > 0.85 ? '--warn' : '--ok');
    const n = f.capacity_tpd >= 150 ? A.wards.filter(w => w.nearest_facility === f.id).length
      : A.wards.filter(w => w.zwm_facility === f.id && w.zwm_distance_km <= 5).length;
    $('#fl-' + f.id).textContent = `${fmt(load, 1)} t/day from ${n} ward${n === 1 ? '' : 's'} · ${fmt(u * 100, 0)}%`;
  });
}

/* ---------------- charts ---------------- */
const gridColor = () => cssv('--line');
const baseOpts = () => ({
  responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: cssv('--ink-2'), boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { family: 'General Sans', size: 11 } } },
    tooltip: {
      backgroundColor: cssv('--surface'), titleColor: cssv('--ink'), bodyColor: cssv('--ink-2'),
      borderColor: cssv('--line'), borderWidth: 1, padding: 10, cornerRadius: 8, displayColors: true,
      titleFont: { family: 'Satoshi', size: 12 }, bodyFont: { family: 'General Sans', size: 11 }
    }
  },
  scales: {
    x: { grid: { color: gridColor(), drawTicks: false }, border: { display: false }, ticks: { color: cssv('--ink-3'), font: { size: 10, family: 'General Sans' }, maxRotation: 0, autoSkipPadding: 18 } },
    y: { grid: { color: gridColor(), drawTicks: false }, border: { display: false }, ticks: { color: cssv('--ink-3'), font: { size: 10, family: 'General Sans' } } }
  }
});
function chart(id, cfg) { charts[id]?.destroy(); charts[id] = new Chart($('#' + id), cfg); }
const shortDate = d => new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const niceDate = d => new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function renderTrend(A) {
  const L1 = A.trend.map(t => t.date);
  const o = baseOpts();
  o.scales.y.title = { display: true, text: 'tonnes / day', color: cssv('--ink-3'), font: { size: 10 } };
  o.scales.y1 = { position: 'right', grid: { display: false }, border: { display: false }, ticks: { color: cssv('--ink-3'), font: { size: 10 } }, title: { display: true, text: 'backlog (t)', color: cssv('--ink-3'), font: { size: 10 } } };
  o.plugins.tooltip.callbacks = { label: c => `${c.dataset.label}: ${fmt(c.parsed.y, 1)} t` };
  chart('c-trend', {
    type: 'line',
    data: {
      labels: L1.map(shortDate),
      datasets: [
        { label: 'Generated', data: A.trend.map(t => t.generated), borderColor: cssv('--info'), backgroundColor: 'transparent', borderWidth: 2, tension: .35, pointRadius: 0 },
        { label: 'Collected', data: A.trend.map(t => t.collected), borderColor: cssv('--ok'), backgroundColor: 'transparent', borderWidth: 2, tension: .35, pointRadius: 0 },
        { label: 'Backlog at bins', data: A.trend.map(t => t.backlog), borderColor: cssv('--bad'), backgroundColor: 'transparent', borderWidth: 1.6, borderDash: [4, 3], tension: .3, pointRadius: 0, yAxisID: 'y1' }
      ]
    }, options: o
  });
}

function renderScatter(A) {
  const o = baseOpts();
  o.interaction = { mode: 'nearest', intersect: true };
  o.scales.x.title = { display: true, text: 'haul distance to nearest plant (km)', color: cssv('--ink-3'), font: { size: 10 } };
  o.scales.y.title = { display: true, text: 'uncollected surplus (t/day)', color: cssv('--ink-3'), font: { size: 10 } };
  o.plugins.legend.display = true;
  o.plugins.tooltip.callbacks = {
    title: c => `Ward ${c[0].raw.w.ward} · ${c[0].raw.w.name}`,
    label: c => [`Haul ${fmt(c.raw.x, 1)} km`, `Surplus ${fmt(c.raw.y, 2)} t/day`, `Generated ${fmt(c.raw.w.gen, 2)} t/day`, `Priority ${c.raw.w.score}`]
  };
  const groups = [['critical', '--bad'], ['strained', '--warn'], ['stable', '--ok']];
  chart('c-scatter', {
    type: 'scatter',
    data: {
      datasets: groups.map(([g, c]) => ({
        label: g[0].toUpperCase() + g.slice(1),
        data: A.wards.filter(w => w.status === g).map(w => ({ x: w.distance_km, y: w.unc, w })),
        backgroundColor: alpha(cssv(c), .72),
        borderColor: cssv(c), borderWidth: 1,
        pointRadius: ctx => 4 + 9 * Math.sqrt((ctx.raw?.w.gen || 1) / Math.max(...A.wards.map(x => x.gen), 1)),
        pointHoverRadius: 12
      }))
    }, options: o
  });
}

function renderZone(A) {
  const zones = [...new Set(A.wards.map(w => w.zone))].sort();
  const o = baseOpts();
  o.scales.x.stacked = false;
  o.plugins.tooltip.callbacks = { label: c => `${c.dataset.label}: ${fmt(c.parsed.y, 1)} t/day` };
  chart('c-zone', {
    type: 'bar',
    data: {
      labels: zones.map(z => 'Zone ' + z),
      datasets: [
        { label: 'Generated', data: zones.map(z => A.wards.filter(w => w.zone === z).reduce((s, w) => s + w.gen, 0)), backgroundColor: alpha(cssv('--info'), .8), borderRadius: 4, barPercentage: .7 },
        { label: 'Collected', data: zones.map(z => A.wards.filter(w => w.zone === z).reduce((s, w) => s + w.coll, 0)), backgroundColor: cssv('--ok'), borderRadius: 4, barPercentage: .7 },
        { label: 'Fleet capacity', type: 'line', data: zones.map(z => A.wards.filter(w => w.zone === z).reduce((s, w) => s + w.fleet_capacity_tpd, 0)), borderColor: cssv('--warn'), backgroundColor: cssv('--warn'), borderWidth: 0, pointStyle: 'line', pointRadius: 12, pointBorderWidth: 2.5, pointBorderColor: cssv('--warn'), showLine: false }
      ]
    }, options: o
  });
}

function renderTkm(A) {
  const zones = [...new Set(A.wards.map(w => w.zone))].sort();
  const o = baseOpts();
  o.indexAxis = 'y';
  o.plugins.legend.display = false;
  o.plugins.tooltip.callbacks = { label: c => `${fmt(c.parsed.x, 0)} tonne-km/day` };
  o.scales.x.title = { display: true, text: 'tonne-kilometres hauled per day', color: cssv('--ink-3'), font: { size: 10 } };
  const data = zones.map(z => A.wards.filter(w => w.zone === z).reduce((s, w) => s + w.tkm, 0));
  const mx = Math.max(...data, 1);
  chart('c-tkm', {
    type: 'bar',
    data: {
      labels: zones.map(z => 'Zone ' + z),
      datasets: [{ data, borderRadius: 4, barPercentage: .68, backgroundColor: data.map(v => alpha(cssv('--bad'), 0.32 + 0.6 * v / mx)) }]
    }, options: o
  });
}

/* ---------------- table ---------------- */
function renderTable(A) {
  const key = sort.key, dir = sort.dir;
  const rows = A.wards.slice().sort((a, b) => {
    const va = a[key] ?? 0, vb = b[key] ?? 0;
    return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * dir;
  });
  $('#table-count').textContent = `${rows.length} wards in scope · averages over ${A.trend.length} days · click a row for ward detail`;
  $$('#wtable th').forEach(th => th.classList.toggle('sorted', th.dataset.sort === key) || th.classList.toggle('asc', th.dataset.sort === key && dir === 1));
  $('#wtbody').innerHTML = rows.length ? rows.map(w => `<tr data-w="${w.ward}">
    <td>W${w.ward}</td>
    <td class="wname">${w.name}</td>
    <td>Z${w.zone}</td>
    <td class="num">${int(w.population)}</td>
    <td class="num">${fmt(w.gen, 2)}</td>
    <td class="num">${fmt(w.coll, 2)}</td>
    <td class="num" style="color:${w.rate < 92 ? cssv('--bad') : w.rate < 97 ? cssv('--warn') : cssv('--ink')}">${fmt(w.rate, 1)}%</td>
    <td class="num">${fmt(w.backlog, 2)}</td>
    <td class="num">${w.nearest_facility} · ${fmt(w.distance_km, 1)} km</td>
    <td><span class="badge ${w.status}"><i></i>${w.status}</span></td>
    <td class="num"><span class="bar"><i style="width:${w.score}%;background:${colorScore(w.score)}"></i><b>${w.score}</b></span></td>
  </tr>`).join('') : `<tr><td colspan="11" class="empty">No wards match these filters. Widen the date range or reset filters.</td></tr>`;
  updateFacilityCards(A);
}
const colorScore = s => alpha(cssv(s > 66 ? '--bad' : s > 40 ? '--warn' : '--ok'), 0.45 + s / 200);

/* ---------------- priority ---------------- */
function recommend(w) {
  const r = [];
  if (w.util > 1.0) {const n=Math.max(1, Math.ceil((w.gen - w.fleet_capacity_tpd) / 1.15 / w.trips_per_vehicle));
    r.push(`Add <strong>${n} autotipper${n===1?'':'s'}</strong> or an extra daily trip — load exceeds assigned capacity by ${fmt((w.util - 1) * 100, 0)}%.`);}
  if (w.distance_km > 7) r.push(`Haul is <strong>${fmt(w.distance_km, 1)} km</strong> to ${w.nearest_facility}. Site a <strong>transfer station or decentralised ZWM unit</strong> — a nearby unit already sits ${fmt(w.zwm_distance_km, 1)} km away.`);
  else if (w.distance_km > 5 && w.second_distance_km <= w.distance_km + 1.5) r.push(`Split peak-day loads to <strong>${w.second_facility}</strong> (${fmt(w.second_distance_km, 1)} km) to relieve ${w.nearest_facility}; primary haul is ${fmt(w.distance_km, 1)} km.`);
  else if (w.distance_km > 5) r.push(`Primary haul is <strong>${fmt(w.distance_km, 1)} km</strong> to ${w.nearest_facility} with no closer alternative — a secondary transfer point would cut round-trip time.`);
  if (w.backlog > 2) r.push(`Clear <strong>${fmt(w.backlog, 1)} t</strong> standing backlog with a weekend compactor drive.`);
  if (w.segregation_pct < 62) r.push(`Segregation at source is <strong>${fmt(w.segregation_pct, 0)}%</strong> — deploy marshals and dry-waste collection centre outreach.`);
  if (w.gen / w.population * 1000 > 0.75) r.push(`High load density (<strong>${fmt(w.gen / w.population * 1000, 2)} kg/person/day</strong>) indicates commercial/market inflow — meter bulk generators separately.`);
  if (!r.length) r.push('Service is within capacity. Hold current deployment and monitor weekly.');
  return r;
}

function renderPriority(A) {
  const top = A.wards.slice().sort((a, b) => b.score - a.score).slice(0, 6);
  $('#priority-grid').innerHTML = top.length ? top.map((w, i) => `<div class="pcard ${i < 2 ? '' : i < 4 ? 'p2' : 'p3'}">
    <div class="prank">Priority ${i + 1} · score ${w.score}/100</div>
    <div class="pname">Ward ${w.ward} — ${w.name}</div>
    <div class="pmeta">Zone ${w.zone} · ${int(w.population)} residents · ${int(w.households)} households</div>
    <div class="pstats">
      <span>Generated</span><span>${fmt(w.gen, 2)} t/day</span>
      <span>Uncollected</span><span>${fmt(w.unc, 2)} t/day</span>
      <span>Backlog</span><span>${fmt(w.backlog, 2)} t</span>
      <span>Haul to plant</span><span>${fmt(w.distance_km, 1)} km (${w.nearest_facility})</span>
      <span>Capacity used</span><span>${fmt(w.util * 100, 0)}%</span>
      <span>Segregation</span><span>${fmt(w.segregation_pct, 0)}%</span>
    </div>
    <div class="prec">${recommend(w).map(t => '• ' + t).join('<br>')}</div></div>`).join('')
    : `<div class="card empty">No wards in scope.</div>`;

  const far = A.wards.filter(w => w.distance_km > 7).sort((a, b) => b.gen - a.gen);
  const over = A.wards.filter(w => w.util > 1);
  const farTonnes = far.reduce((s, w) => s + w.gen, 0);
  const tkmSaved = far.reduce((s, w) => s + w.coll * (w.distance_km - 3), 0);
  $('#infra-card').innerHTML = `<h3>Infrastructure &amp; resource allocation call</h3>
  <ul>
    <li><strong>${far.length} wards haul beyond 7 km</strong>${far.length ? ` — led by ${far.slice(0, 4).map(w => `W${w.ward} ${w.name}`).join(', ')} — carrying ${fmt(farTonnes, 1)} t/day. A north-western processing unit near the Hebbal–Vijayanagar belt would cut roughly <strong>${int(tkmSaved)} tonne-km/day</strong> of hauling.` : ' — haul network is compact under the current filter.'}</li>
    <li><strong>${over.length} wards exceed assigned fleet capacity</strong>${over.length ? `, needing about <strong>${int(over.reduce((s, w) => s + Math.ceil((w.gen - w.fleet_capacity_tpd) / 1.15 / w.trips_per_vehicle), 0))} additional autotippers</strong> to close the daily gap of ${fmt(over.reduce((s, w) => s + w.unc, 0), 1)} t/day.` : '.'}</li>
    <li><strong>Processing headroom:</strong> ${fmt(A.city.coll, 1)} t/day collected in scope against ${int(DB.meta.total_processing_capacity_tpd)} t/day installed citywide (${fmt(A.city.coll / DB.meta.total_processing_capacity_tpd * 100, 0)}% utilised). Citywide generation is ~${int(DB.meta.city_baseline_tpd)} t/day, and reported actual throughput at the new plants has been far below nameplate — headroom on paper is not headroom in practice.</li>
    <li><strong>Segregation:</strong> ${A.wards.filter(w => w.segregation_pct < 62).length} wards sit below 62% source segregation, which is what constrains compost quality at the plants.</li>
  </ul>`;
}

/* ---------------- ward drawer ---------------- */
function openDrawer(id) {
  const A = window.AGG;
  const w = A.wards.find(x => x.ward === id) || DB.wardById[id];
  const rows = DB.daily.filter(r => r.ward === id && r.date >= state.from && r.date <= state.to);
  $('#drawer-body').innerHTML = `
    <div class="d-title">Ward ${w.ward} — ${w.name}</div>
    <div class="d-sub">Zone ${w.zone} · ${int(w.population)} residents · ${int(w.households)} households · ${niceDate(state.from)} – ${niceDate(state.to)}</div>
    <div class="d-rows">
      ${[['Average generated', fmt(w.gen ?? 0, 2) + ' t/day'],
      ['Average collected', fmt(w.coll ?? 0, 2) + ' t/day'],
      ['Collection completion', fmt(w.rate ?? 0, 1) + '%'],
      ['Peak day', fmt(w.peak ?? 0, 2) + ' t'],
      ['Standing backlog', fmt(w.backlog ?? 0, 2) + ' t'],
      ['Assigned fleet', `${w.autotippers} autotippers × ${w.trips_per_vehicle} trips`],
      ['Fleet capacity', fmt(w.fleet_capacity_tpd, 2) + ' t/day'],
      ['Capacity utilisation', fmt((w.util ?? 0) * 100, 0) + '%'],
      ['Nearest plant', `${DB.facById[w.nearest_facility].name.split(' ')[0]} · ${fmt(w.distance_km, 1)} km`],
      ['Alternate plant', `${w.second_facility} · ${fmt(w.second_distance_km, 1)} km`],
      ['Nearest ZWM unit', `${w.zwm_facility} · ${fmt(w.zwm_distance_km, 1)} km`],
      ['Source segregation', fmt(w.segregation_pct, 0) + '%'],
      ['Tonne-km/day', int(w.tkm ?? 0)],
      ['Priority score', (w.score ?? 0) + '/100']]
      .map(([k, v]) => `<div class="d-row"><span>${k}</span><span>${v}</span></div>`).join('')}
    </div>
    <h3>Daily generated vs collected</h3>
    <div class="d-chart"><canvas id="c-drawer"></canvas></div>
    <h3>Recommended action</h3>
    <div class="prec" style="margin-top:var(--space-3)">${recommend(w).map(t => '• ' + t).join('<br>')}</div>`;
  $('#drawer').hidden = false;
  const o = baseOpts(); o.plugins.legend.display = true;
  drawerChart?.destroy();
  drawerChart = new Chart($('#c-drawer'), {
    type: 'line',
    data: {
      labels: rows.map(r => shortDate(r.date)),
      datasets: [
        { label: 'Generated', data: rows.map(r => r.generated), borderColor: cssv('--info'), borderWidth: 2, tension: .35, pointRadius: 0, fill: { target: 1, above: alpha(cssv('--bad'), .2) } },
        { label: 'Collected', data: rows.map(r => r.collected), borderColor: cssv('--ok'), borderWidth: 2, tension: .35, pointRadius: 0 }
      ]
    }, options: o
  });
}

/* ---------------- exports ---------------- */
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const stamp = () => `${state.from}_to_${state.to}`;
const csvEsc = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
function toCSV(head, rows) { return [head.join(','), ...rows.map(r => r.map(csvEsc).join(','))].join('\n'); }

function doExport(kind) {
  const A = window.AGG;
  if (kind === 'ward-csv') {
    const head = ['ward_no', 'ward_name', 'zone', 'population', 'households', 'avg_generated_tpd', 'avg_collected_tpd', 'avg_uncollected_tpd', 'collection_pct', 'standing_backlog_t', 'peak_day_t', 'fleet_capacity_tpd', 'capacity_utilisation_pct', 'autotippers', 'trips_per_vehicle', 'nearest_facility', 'distance_km', 'alt_facility', 'alt_distance_km', 'nearest_zwm', 'zwm_distance_km', 'tonne_km_per_day', 'segregation_pct', 'status', 'priority_score', 'recommended_action'];
    const rows = A.wards.slice().sort((a, b) => b.score - a.score).map(w => [w.ward, w.name, w.zone, w.population, w.households, fmt(w.gen, 2), fmt(w.coll, 2), fmt(w.unc, 2), fmt(w.rate, 1), fmt(w.backlog, 2), fmt(w.peak, 2), fmt(w.fleet_capacity_tpd, 2), fmt(w.util * 100, 0), w.autotippers, w.trips_per_vehicle, w.nearest_facility, w.distance_km, w.second_facility, w.second_distance_km, w.zwm_facility, w.zwm_distance_km, Math.round(w.tkm), w.segregation_pct, w.status, w.score, recommend(w).map(t => t.replace(/<[^>]+>/g, '')).join(' ')]);
    download(`MCC_ward_waste_summary_${stamp()}.csv`, toCSV(head, rows), 'text/csv');
  }
  if (kind === 'daily-csv') {
    const set = new Set(A.wards.map(w => w.ward));
    const rows = DB.daily.filter(r => set.has(r.ward) && r.date >= state.from && r.date <= state.to)
      .map(r => [r.date, r.ward, DB.wardById[r.ward].name, DB.wardById[r.ward].zone, r.generated, r.collected, r.uncollected, r.backlog]);
    download(`MCC_ward_day_records_${stamp()}.csv`, toCSV(['date', 'ward_no', 'ward_name', 'zone', 'generated_t', 'collected_t', 'uncollected_t', 'backlog_t'], rows), 'text/csv');
  }
  if (kind === 'json') {
    download(`MCC_swm_filtered_${stamp()}.json`, JSON.stringify({ meta: { ...DB.meta, filters: state }, city: A.city, wards: A.wards, trend: A.trend }, null, 2), 'application/json');
  }
  if (kind === 'priority-md') download(`MCC_priority_deployment_brief_${stamp()}.md`, priorityBrief(A), 'text/markdown');
  if (kind === 'print') window.print();
}

function priorityBrief(A) {
  const c = A.city;
  const top = A.wards.slice().sort((a, b) => b.score - a.score).slice(0, 10);
  const far = A.wards.filter(w => w.distance_km > 7).sort((a, b) => b.gen - a.gen);
  const over = A.wards.filter(w => w.util > 1);
  const L = [];
  L.push(`# Priority Deployment Brief — Ward Waste Management`);
  L.push(`**Mysuru City Corporation · Swachha Grid**`);
  L.push(`Window: ${niceDate(state.from)} – ${niceDate(state.to)} (${A.trend.length} days) · Scope: ${state.zone === 'all' ? 'all 7 zones' : 'Zone ' + state.zone}, ${c.wards} wards · Generated ${new Date().toLocaleString('en-IN')}\n`);
  L.push(`## 1. Position`);
  L.push(`| Indicator | Value |`, `|---|---|`);
  [['Wards in scope', c.wards], ['Residents covered', int(c.population)], ['Households', int(c.households)],
  ['Waste generated', fmt(c.gen, 1) + ' t/day'], ['Waste collected', fmt(c.coll, 1) + ' t/day'],
  ['Collection completion', fmt(c.rate, 1) + '%'], ['Uncollected surplus', fmt(c.unc, 1) + ' t/day'],
  ['Standing backlog', fmt(c.backlog, 1) + ' t'], ['Wards over capacity', `${c.critical} critical, ${c.strained} strained`],
  ['Mean haul distance', fmt(c.avgDist, 1) + ' km'], ['Haulage effort', int(c.tkm) + ' tonne-km/day'],
  ['Fleet deployed', `${int(c.vehicles)} autotippers, ${int(c.trips)} trips/day`],
  ['Installed processing capacity', int(DB.meta.total_processing_capacity_tpd) + ' t/day nameplate, citywide']]
    .forEach(([k, v]) => L.push(`| ${k} | ${v} |`));
  L.push(`\n## 2. Priority wards for deployment`);
  L.push(`Composite score: uncollected surplus (34%), standing backlog (24%), haul distance (19%), absolute load (15%), segregation shortfall (8%).\n`);
  L.push(`| # | Ward | Zone | Score | t/day | Uncollected | Backlog | Haul | Capacity used | Status |`);
  L.push(`|---|---|---|---|---|---|---|---|---|---|`);
  top.forEach((w, i) => L.push(`| ${i + 1} | W${w.ward} ${w.name} | ${w.zone} | ${w.score} | ${fmt(w.gen, 2)} | ${fmt(w.unc, 2)} | ${fmt(w.backlog, 2)} | ${fmt(w.distance_km, 1)} km → ${w.nearest_facility} | ${fmt(w.util * 100, 0)}% | ${w.status} |`));
  L.push(`\n## 3. Ward-level actions`);
  top.slice(0, 6).forEach((w, i) => {
    L.push(`\n**${i + 1}. Ward ${w.ward} — ${w.name}** (Zone ${w.zone}, ${int(w.population)} residents)`);
    recommend(w).forEach(r => L.push(`- ${r.replace(/<[^>]+>/g, '')}`));
  });
  L.push(`\n## 4. Infrastructure and resource allocation`);
  L.push(`- **Long-haul wards (>7 km):** ${far.length}${far.length ? ` — ${far.slice(0, 6).map(w => `W${w.ward} ${w.name} (${fmt(w.distance_km, 1)} km)`).join(', ')}. Combined ${fmt(far.reduce((s, w) => s + w.gen, 0), 1)} t/day. A processing or transfer facility in the north-western belt would remove roughly ${int(far.reduce((s, w) => s + w.coll * (w.distance_km - 3), 0))} tonne-km/day.` : '.'}`);
  L.push(`- **Fleet gap:** ${over.length} wards above assigned capacity; approx. ${int(over.reduce((s, w) => s + Math.ceil((w.gen - w.fleet_capacity_tpd) / 1.15 / w.trips_per_vehicle), 0))} additional autotippers required to absorb ${fmt(over.reduce((s, w) => s + w.unc, 0), 1)} t/day.`);
  L.push(`- **Processing:** ${fmt(c.coll, 1)} t/day inbound in scope vs ${int(DB.meta.total_processing_capacity_tpd)} t/day nameplate capacity (${fmt(c.coll / DB.meta.total_processing_capacity_tpd * 100, 0)}% utilised). Reported actual throughput at Kesare and Rayanakere has run well under nameplate, so effective headroom is smaller than it appears.`);
  L.push(`- **Segregation:** ${A.wards.filter(w => w.segregation_pct < 62).length} wards under 62% at-source segregation, limiting compost yield.`);
  L.push(`\n### Facility loading`);
  L.push(`| Facility | Type | Capacity | Inbound (scope) | Utilisation |`, `|---|---|---|---|---|`);
  DB.facilities.forEach(f => {
    const load = facLoad(A, f);
    L.push(`| ${f.name} | ${f.kind} | ${int(f.capacity_tpd)} t/day | ${fmt(load, 1)} t/day | ${fmt(load / f.capacity_tpd * 100, 0)}% |`);
  });
  L.push(`\n## 5. Data provenance`);
  L.push(`Ward names, the seven-zone structure and ward populations are actual MCC records. Daily tonnage, collection completion, backlog, fleet allocation and haul distances are modelled from a 360 g/capita/day base with zone commercial uplift, calibrated to MCC's reported ~${int(DB.meta.city_baseline_tpd)} t/day. Ward coordinates are approximate locality centroids. This brief is a planning aid, not an official MCC record.\n`);
  DB.meta.sources.forEach(s => L.push(`- ${s.label} — ${s.url}`));
  return L.join('\n');
}

function buildSources() {
  $('#src-list').innerHTML = DB.meta.sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`).join('');
}

/* ---------------- wiring ---------------- */
function wire() {
  $('#f-zone').onchange = e => { state.zone = e.target.value; state.ward = 'all'; fillWardSelect(); render(); };
  $('#f-ward').onchange = e => { state.ward = e.target.value; render(); };
  let t; $('#f-search').oninput = e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; render(); }, 180); };
  $('#f-status').onchange = e => { state.status = e.target.value; render(); };
  $('#f-dist').oninput = e => { state.minDist = +e.target.value; $('#f-dist-out').textContent = fmt(state.minDist, 1) + ' km +'; render(); };
  $('#f-from').onchange = e => { state.from = clampDate(e.target.value); e.target.value = state.from; markChip(null); render(); };
  $('#f-to').onchange = e => { state.to = clampDate(e.target.value); e.target.value = state.to; markChip(null); render(); };
  $$('#range-chips button').forEach(b => b.onclick = () => {
    state.days = +b.dataset.days;
    state.to = DB.dates.at(-1);
    state.from = DB.dates[Math.max(0, DB.dates.length - state.days)];
    $('#f-from').value = state.from; $('#f-to').value = state.to;
    markChip(b); render();
  });
  $('#f-reset').onclick = () => {
    Object.assign(state, { zone: 'all', ward: 'all', q: '', status: 'all', minDist: 0, days: 30, to: DB.dates.at(-1), from: DB.dates[DB.dates.length - 30] });
    $('#f-zone').value = 'all'; fillWardSelect(); $('#f-search').value = ''; $('#f-status').value = 'all';
    $('#f-dist').value = 0; $('#f-dist-out').textContent = '0.0 km +';
    $('#f-from').value = state.from; $('#f-to').value = state.to;
    markChip($('#range-chips button[data-days="30"]')); render();
  };
  $$('#map-mode button').forEach(b => b.onclick = () => {
    $$('#map-mode button').forEach(x => x.classList.remove('on')); b.classList.add('on');
    state.mode = b.dataset.mode; renderMap(window.AGG);
  });
  ['#t-heat', '#t-haul', '#t-fac'].forEach(id => $(id).onchange = syncLayerToggles);
  $$('#table-density button').forEach(b => b.onclick = () => {
    $$('#table-density button').forEach(x => x.classList.remove('on')); b.classList.add('on');
    $('#wtable').classList.toggle('compact', b.dataset.d === 'compact');
  });
  $$('#wtable th').forEach(th => th.onclick = () => {
    const k = th.dataset.sort;
    sort = { key: k, dir: sort.key === k ? -sort.dir : (k === 'name' || k === 'status' ? 1 : -1) };
    renderTable(window.AGG);
  });
  $('#wtbody').onclick = e => { const tr = e.target.closest('tr[data-w]'); if (tr) openDrawer(+tr.dataset.w); };
  $('#drawer-close').onclick = () => { $('#drawer').hidden = true; };
  $('#drawer').onclick = e => { if (e.target.id === 'drawer') $('#drawer').hidden = true; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#drawer').hidden = true; $('#export-menu').hidden = true; } });
  $('#export-btn').onclick = e => { e.stopPropagation(); $('#export-menu').hidden = !$('#export-menu').hidden; };
  $('#export-menu').onclick = e => { const b = e.target.closest('button'); if (b) { $('#export-menu').hidden = true; doExport(b.dataset.export); } };
  document.addEventListener('click', () => { $('#export-menu').hidden = true; });
  $('#menu-btn').onclick = () => $('#sidebar').classList.toggle('open');
  $('#theme-btn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  $$('.sidenav a').forEach(a => a.onclick = () => {
    $$('.sidenav a').forEach(x => x.classList.remove('active')); a.classList.add('active');
    $('#sidebar').classList.remove('open');
  });
  $('#main').addEventListener('scroll', () => {
    const y = $('#main').scrollTop + 120;
    const secs = $$('.block');
    let cur = secs[0];
    secs.forEach(s => { if (s.offsetTop <= y) cur = s; });
    $$('.sidenav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur.id));
  }, { passive: true });
}
function markChip(b) { $$('#range-chips button').forEach(x => x.classList.toggle('on', x === b)); }
function clampDate(v) {
  if (!v || v < DB.dates[0]) v = DB.dates[0];
  if (v > DB.dates.at(-1)) v = DB.dates.at(-1);
  if (state.from > state.to) { const a = state.from; state.from = state.to; state.to = a; }
  return v;
}
function applyPreferredTheme() {
  setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}
function setTheme(mode) {
  document.documentElement.dataset.theme = mode;
  $('#theme-icon').innerHTML = mode === 'dark'
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>'
    : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  if (DB) { render(); }
}
