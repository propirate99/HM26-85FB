/* ==========================================================================
   Dashboard controller: inputs -> model -> map, charts, table
   ========================================================================== */
'use strict';

const S = {
  wards: null, facs: null, result: null, baseline: null,
  selected: new Set(), focus: null,
  layer: 'density', sort: { k: 'uncollected', dir: -1 }, query: ''
};

const DEFAULTS = {
  gen: 600, segUplift: 0, tolerance: 1.6,
  tippers: 168, tipperCap: 1.1, tipperTrips: 4, tipperFuel: 9.5,
  compactors: 46, compactorCap: 7.5, compactorTrips: 3, compactorFuel: 32,
  shift: 7.5, serviceMin: 3.5, vLocal: 11, vHaul: 26, tipMin: 14, congestion: 18,
  freq: 7, freqMode: 'uniform', newPoints: 0, ptMode: 'deficit',
  routeRule: 'nearest', transfer: false, night: false, diesel: 91
};

const PRESETS = {
  current: {},
  stressed: { gen: 720, congestion: 42, vLocal: 8, vHaul: 18, tipMin: 22, shift: 7, tippers: 150 },
  optimised: { newPoints: 55, ptMode: 'deficit', routeRule: 'balanced', transfer: true, night: true,
               freqMode: 'density', segUplift: 22, tippers: 152, compactors: 40, compactorCap: 9,
               shift: 8, serviceMin: 3, congestion: 12 },
  growth: { gen: 790, tippers: 205, compactors: 62, freqMode: 'core', newPoints: 35, transfer: true, diesel: 104 }
};

const RANGE_IDS = ['gen','seg','tol','tip','tipcap','tiptrips','tipfuel','com','comcap','comtrips','comfuel',
  'shift','serv','vlocal','vhaul','tipt','cong','freq','pts','diesel'];
const MAP_RANGE = { gen:'gen', seg:'segUplift', tol:'tolerance', tip:'tippers', tipcap:'tipperCap',
  tiptrips:'tipperTrips', tipfuel:'tipperFuel', com:'compactors', comcap:'compactorCap',
  comtrips:'compactorTrips', comfuel:'compactorFuel', shift:'shift', serv:'serviceMin',
  vlocal:'vLocal', vhaul:'vHaul', tipt:'tipMin', cong:'congestion', freq:'freq',
  pts:'newPoints', diesel:'diesel' };

const fmt = (n, d = 0) => (n == null || !isFinite(n) ? '—' :
  n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = n => `${(n * 100).toFixed(1)}%`;
const inr = n => n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${fmt(n)}`;

/* ── inputs ─────────────────────────────────────────────────── */
function cfgFromUI() {
  const cfg = { ...DEFAULTS, selected: S.selected };
  RANGE_IDS.forEach(id => { cfg[MAP_RANGE[id]] = parseFloat(document.getElementById('i-' + id).value); });
  cfg.freqMode = document.querySelector('#freq-mode button.on').dataset.mode;
  cfg.ptMode = document.getElementById('i-ptmode').value;
  cfg.routeRule = document.getElementById('i-route').value;
  cfg.transfer = document.getElementById('i-transfer').checked;
  cfg.night = document.getElementById('i-night').checked;
  return cfg;
}

function paintRange(el) {
  const p = (el.value - el.min) / (el.max - el.min) * 100;
  el.style.setProperty('--p', p + '%');
}

function syncLabels() {
  const dec = { tipcap: 2, comcap: 1, shift: 1, serv: 2, tol: 1, tipfuel: 1 };
  RANGE_IDS.forEach(id => {
    const el = document.getElementById('i-' + id);
    const v = document.getElementById('v-' + id);
    if (v) v.textContent = parseFloat(el.value).toFixed(dec[id] ?? 0);
    paintRange(el);
  });
}

function applyCfg(obj) {
  Object.entries(MAP_RANGE).forEach(([id, key]) => {
    if (obj[key] !== undefined) document.getElementById('i-' + id).value = obj[key];
  });
  if (obj.freqMode) setSeg('#freq-mode', 'mode', obj.freqMode);
  if (obj.ptMode) document.getElementById('i-ptmode').value = obj.ptMode;
  if (obj.routeRule) document.getElementById('i-route').value = obj.routeRule;
  document.getElementById('i-transfer').checked = !!obj.transfer;
  document.getElementById('i-night').checked = !!obj.night;
  syncLabels();
}

function setSeg(sel, key, val) {
  document.querySelectorAll(`${sel} button`).forEach(b =>
    b.classList.toggle('on', b.dataset[key] === val));
}

/* ── map ────────────────────────────────────────────────────── */
let map, wardLayer, haulLayer, facLayer;
const SCALES = {
  uncollected: { title: 'Standing waste t/day', stops: [0, 0.5, 1.5, 3, 6],
    colors: ['#1f6f5c', '#4f9a63', '#c9b458', '#df8a4a', '#d2513f'] },
  density: { title: 'Waste density t/km²/day', stops: [0, 6, 12, 20, 32],
    colors: ['#173f52', '#1d6b78', '#34a08b', '#9dc46a', '#f1d06b'] },
  frequency: { title: 'Pickups per week', stops: [0, 4, 7, 10, 13],
    colors: ['#5a2f45', '#8a4a58', '#b4785e', '#8fae6c', '#54b98c'] },
  coverage: { title: 'Collection coverage', stops: [0, .8, .92, .98, 1],
    colors: ['#d2513f', '#df8a4a', '#c9b458', '#6fae6d', '#3fae8c'] },
  fuel: { title: 'Diesel L per tonne', stops: [0, 1.5, 3, 4.5, 6.5],
    colors: ['#2b6f5e', '#5d9c64', '#c3b25a', '#dd8949', '#cf4b3d'] }
};
const metric = (w, layer) => ({
  uncollected: w.uncollected, density: w.density, frequency: w.freq,
  coverage: w.coverage, fuel: w.collected > 0 ? w.fuel / w.collected : 0
}[layer]);

function colorFor(v, layer) {
  const s = SCALES[layer];
  let i = 0;
  for (let k = 0; k < s.stops.length; k++) if (v >= s.stops[k]) i = k;
  return s.colors[i];
}

function initMap() {
  map = L.map('map', { zoomControl: true, attributionControl: true, minZoom: 10 })
        .setView([12.2985, 76.6394], 12);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Esri, HERE, Garmin, OpenStreetMap contributors', maxZoom: 16
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    attribution: '', maxZoom: 16, opacity: .85, pane: 'shadowPane'
  }).addTo(map);
  haulLayer = L.layerGroup().addTo(map);
  facLayer = L.layerGroup().addTo(map);
}

function drawFacilities(res) {
  facLayer.clearLayers();
  res.facs.forEach(f => {
    const load = f.inbound / Math.max(1, f.cap);
    const color = load > 1 ? '#d2513f' : load > 0.85 ? '#e7b55c' : '#7ad6b4';
    const m = L.circleMarker([f.pos[1], f.pos[0]], {
      radius: 7 + Math.min(9, f.inbound / 28), color, weight: 2,
      fillColor: color, fillOpacity: .35
    }).addTo(facLayer);
    m.bindTooltip(`<b>${f.name}</b><br>${f.kind} · capacity ${fmt(f.cap)} t/d<br>` +
      `inbound ${fmt(f.inbound, 1)} t/d (${pct(load)})` +
      (f.diverted > 0.1 ? `<br><b style="color:#e78">over by ${fmt(f.diverted, 1)} t</b>` : ''),
      { sticky: true });
  });
}

function drawHauls(res) {
  haulLayer.clearLayers();
  res.wards.forEach(w => {
    L.polyline([[w.centroid[1], w.centroid[0]], [w.facility.pos[1], w.facility.pos[0]]], {
      color: '#8fd9c2', weight: Math.max(0.5, Math.min(3, w.collected / 5)),
      opacity: .16, interactive: false
    }).addTo(haulLayer);
  });
}

function drawWards(res) {
  if (wardLayer) map.removeLayer(wardLayer);
  const byNo = new Map(res.wards.map(w => [w.ward_no, w]));
  wardLayer = L.geoJSON(S.wards, {
    style: f => {
      const w = byNo.get(f.properties.ward_no);
      return {
        fillColor: colorFor(metric(w, S.layer), S.layer),
        fillOpacity: S.focus === w.ward_no ? .92 : .68,
        color: S.selected.has(w.ward_no) ? '#7ff0c8' : '#0d1a20',
        weight: S.selected.has(w.ward_no) ? 2.4 : (S.focus === w.ward_no ? 2.4 : .7)
      };
    },
    onEachFeature: (f, lyr) => {
      const w = byNo.get(f.properties.ward_no);
      lyr.bindTooltip(
        `<b>W${w.ward_no} ${w.name}</b><br>${w.zone_name}<br>` +
        `gen ${fmt(w.gen, 1)} t/d · ${fmt(w.density, 1)} t/km²<br>` +
        `pickups ${w.freq}/wk · coverage ${pct(w.coverage)}<br>` +
        `standing ${fmt(w.uncollected, 2)} t · → ${w.facility.name}`,
        { sticky: true, className: 'ward-pop' });
      lyr.on('click', () => selectWard(w.ward_no));
    }
  }).addTo(map);
  wardLayer.bringToBack();
  drawLegend();
}

function drawLegend() {
  const s = SCALES[S.layer];
  const rows = s.colors.map((c, i) => {
    const lo = s.stops[i], hi = s.stops[i + 1];
    const f = v => S.layer === 'coverage' ? `${Math.round(v * 100)}%` : fmt(v, v < 10 ? 1 : 0);
    return `<div class="row"><span class="sw" style="background:${c}"></span>${
      hi === undefined ? `${f(lo)}+` : `${f(lo)} – ${f(hi)}`}</div>`;
  }).join('');
  document.getElementById('legend').innerHTML = `<h4>${s.title}</h4>${rows}`;
}

/* ── ward strip ─────────────────────────────────────────────── */
function selectWard(no) {
  S.focus = no;
  renderWardStrip();
  drawWards(S.result);
  renderTable();
  const w = S.result.wards.find(x => x.ward_no === no);
  if (w) map.panTo([w.centroid[1], w.centroid[0]], { animate: true });
}

function renderWardStrip() {
  const el = document.getElementById('ward-strip');
  const w = S.result.wards.find(x => x.ward_no === S.focus);
  if (!w) { el.innerHTML = '<p class="empty">No ward selected. Click a polygon to see its load, trips and haul distance.</p>'; return; }
  const flagged = S.selected.has(w.ward_no);
  const item = (k, v) => `<div class="ws-item"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  el.innerHTML =
    `<div class="ws-title">W${w.ward_no} · ${w.name}<small>${w.zone_name} · ${fmt(w.area, 2)} km² · ${fmt(w.pop)} people</small></div>` +
    item('Generation', `${fmt(w.gen, 1)} t/d`) +
    item('Density', `${fmt(w.density, 1)} t/km²`) +
    item('Pickups', `${w.freq}/wk`) +
    item('Collection points', fmt(w.points)) +
    item('Coverage', pct(w.coverage)) +
    item('Standing', `${fmt(w.uncollected, 2)} t`) +
    item('Trips/day', fmt(w.trips, 1)) +
    item('Fleet km', fmt(w.km, 1)) +
    item('Diesel', `${fmt(w.fuel, 1)} L`) +
    item('Haul one-way', `${fmt(w.haulKm, 1)} km · ${fmt(w.haulMin / 2, 0)} min`) +
    item('Destination', w.facility.name) +
    `<div class="ws-actions"><button class="btn ghost" id="btn-flag">${flagged ? 'Unflag ward' : 'Flag for new points'}</button></div>`;
  document.getElementById('btn-flag').onclick = () => {
    flagged ? S.selected.delete(w.ward_no) : S.selected.add(w.ward_no);
    if (!flagged) document.getElementById('i-ptmode').value = 'selected';
    recompute();
  };
}

/* ── KPIs ───────────────────────────────────────────────────── */
function renderKPIs(res) {
  const k = res.kpi, b = S.baseline && S.baseline.kpi;
  const delta = (cur, key, invert = false, d = 1, suffix = '') => {
    if (!b) return '';
    const diff = cur - b[key];
    if (Math.abs(diff) < 1e-6) return '<span class="d">= baseline</span>';
    const better = invert ? diff < 0 : diff > 0;
    return `<span class="d ${better ? 'up' : 'down'}">${diff > 0 ? '▲' : '▼'} ${fmt(Math.abs(diff), d)}${suffix} vs base</span>`;
  };
  const cards = [
    ['Processing efficiency', `${fmt(k.effScore, 1)}/100`, delta(k.effScore, 'effScore', false, 1), k.effScore < 65],
    ['Coverage', pct(k.coverage), delta(k.coverage * 100, 'coverage', false, 1, ' pts'), k.coverage < 0.95],
    ['Standing waste', `${fmt(k.uncollected, 1)} t/d`, delta(k.uncollected, 'uncollected', true, 1, ' t'), k.uncollected > 5],
    ['Plant diversion', pct(k.diversion), delta(k.diversion * 100, 'diversion', false, 1, ' pts'), false],
    ['Cost per tonne', `₹${fmt(k.costPerT, 0)}`, delta(k.costPerT, 'costPerT', true, 0), false],
    ['Diesel per tonne', `${fmt(k.fuelPerT, 2)} L`, delta(k.fuelPerT, 'fuelPerT', true, 2, ' L'), false],
    ['Tipper fleet load', pct(k.tipperUtil), delta(k.tipperUtil * 100, 'tipperUtil', false, 1, ' pts'), k.tipperUtil > 0.995],
    ['Wards under stress', fmt(k.overflowWards), delta(k.overflowWards, 'overflowWards', true, 0), k.overflowWards > 10]
  ];
  document.getElementById('kpi-strip').innerHTML = [
    ['Generated', `${fmt(k.gen, 0)} t/d`], ['Collected', `${fmt(k.collected, 0)} t/d`],
    ['Processed at plants', `${fmt(k.processed, 0)} t/d`], ['To landfill', `${fmt(k.toLandfill, 0)} t/d`],
    ['Unmanaged backlog', `${fmt(k.unmanaged, 1)} t/d`], ['Vehicle trips', fmt(k.trips, 0)],
    ['Fleet km', `${fmt(k.km, 0)} km`], ['Diesel', `${fmt(k.fuel, 0)} L/d`],
    ['CO₂e', `${fmt(k.co2 / 1000, 2)} t/d`], ['Secondary fleet load', pct(k.compUtil)],
    ['Collection points', fmt(k.points)], ['Daily op cost', inr(k.cost)]
  ].map(([a, b2]) => `<div class="sitem"><span class="k">${a}</span><span class="v">${b2}</span></div>`).join('');
  document.getElementById('kpis').innerHTML = cards.map(([kk, v, d, alert]) =>
    `<div class="kpi${alert ? ' alert' : ''}"><span class="k">${kk}</span><span class="v">${v}</span>${d || '<span class="d">&nbsp;</span>'}</div>`).join('');

  const pill = document.getElementById('pill-status');
  if (k.coverage >= 0.99 && k.unmanaged < 1) { pill.className = 'pill'; pill.textContent = 'Balanced network'; }
  else if (k.coverage >= 0.93) { pill.className = 'pill warn'; pill.textContent = 'Tight capacity'; }
  else { pill.className = 'pill bad'; pill.textContent = 'Service deficit'; }
}

/* ── charts ─────────────────────────────────────────────────── */
const CH = {};
const CHART_FONT = { family: 'Satoshi, system-ui, sans-serif' };
Chart.defaults.color = '#9aa8b5';
Chart.defaults.font = { ...CHART_FONT, size: 11 };
Chart.defaults.borderColor = 'rgba(255,255,255,.07)';
Chart.defaults.animation = { duration: 320 };

function renderCharts(res) {
  const grid = { color: 'rgba(255,255,255,.06)' };

  // scatter: frequency vs density
  const pts = res.wards.map(w => ({
    x: w.freq, y: w.density, r: 3 + Math.sqrt(w.gen) * 1.5, w
  }));
  const colors = res.wards.map(w => w.coverage < 0.9 ? 'rgba(210,81,63,.72)'
    : w.coverage < 0.99 ? 'rgba(231,181,92,.7)' : 'rgba(122,214,180,.6)');
  if (!CH.scatter) {
    CH.scatter = new Chart(document.getElementById('ch-scatter'), {
      type: 'bubble',
      data: { datasets: [{ data: pts, backgroundColor: colors, borderColor: 'rgba(255,255,255,.25)', borderWidth: 1 }] },
      options: {
        maintainAspectRatio: false, responsive: true,
        scales: {
          x: { title: { display: true, text: 'Pickups per week' }, grid, min: 0, suggestedMax: 15 },
          y: { title: { display: true, text: 't/km²/day' }, grid, beginAtZero: true }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => {
            const w = c.raw.w;
            return [`W${w.ward_no} ${w.name}`, `${w.freq} pickups/wk · ${fmt(w.density, 1)} t/km²`,
                    `gen ${fmt(w.gen, 1)} t/d · coverage ${pct(w.coverage)}`];
          } } }
        },
        onClick: (e, els) => { if (els.length) selectWard(pts[els[0].index].w.ward_no); }
      }
    });
  } else {
    CH.scatter.data.datasets[0].data = pts;
    CH.scatter.data.datasets[0].backgroundColor = colors;
    CH.scatter.update();
  }

  // zone stacked bars
  const zones = [...new Set(res.wards.map(w => w.zone))].sort((a, b) => a - b);
  const zCol = zones.map(z => res.wards.filter(w => w.zone === z).reduce((t, w) => t + w.collected, 0));
  const zUn = zones.map(z => res.wards.filter(w => w.zone === z).reduce((t, w) => t + w.uncollected, 0));
  const zLbl = zones.map(z => 'Z' + z);
  if (!CH.zone) {
    CH.zone = new Chart(document.getElementById('ch-zone'), {
      type: 'bar',
      data: { labels: zLbl, datasets: [
        { label: 'Collected', data: zCol, backgroundColor: 'rgba(122,214,180,.8)', borderRadius: 3 },
        { label: 'Standing', data: zUn, backgroundColor: 'rgba(210,81,63,.85)', borderRadius: 3 }] },
      options: { maintainAspectRatio: false, responsive: true,
        scales: { x: { stacked: true, grid: { display: false } },
                  y: { stacked: true, grid, title: { display: true, text: 't/day' } } },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } } }
    });
  } else {
    CH.zone.data.datasets[0].data = zCol; CH.zone.data.datasets[1].data = zUn; CH.zone.update();
  }

  // facility load
  const fl = res.facs;
  const fLbl = fl.map(f => f.name.replace(/ (Processing Plant|Compost Plant|Transfer Station|ZWM Unit)/, ''));
  if (!CH.fac) {
    CH.fac = new Chart(document.getElementById('ch-fac'), {
      type: 'bar',
      data: { labels: fLbl, datasets: [
        { label: 'Inbound', data: fl.map(f => f.inbound), backgroundColor: 'rgba(122,214,180,.8)', borderRadius: 3 },
        { label: 'Capacity', data: fl.map(f => f.cap), backgroundColor: 'rgba(255,255,255,.14)',
          borderColor: 'rgba(255,255,255,.4)', borderWidth: 1, borderRadius: 3 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, responsive: true,
        scales: { x: { grid, title: { display: true, text: 't/day' } }, y: { grid: { display: false } } },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } } }
    });
  } else {
    CH.fac.data.labels = fLbl;
    CH.fac.data.datasets[0].data = fl.map(f => f.inbound);
    CH.fac.data.datasets[1].data = fl.map(f => f.cap);
    CH.fac.update();
  }

  // comparison
  const keys = [['coverage', 'Coverage %', k => k.coverage * 100],
                ['effScore', 'Efficiency', k => k.effScore],
                ['util', 'Fleet util %', k => k.util * 100],
                ['diversion', 'Diversion %', k => k.diversion * 100],
                ['fuelIdx', 'Diesel index', k => k.fuel / Math.max(1, k.collected) * 100],
                ['costIdx', 'Cost index', k => k.costPerT / 100]];
  const cur = keys.map(([, , f]) => f(res.kpi));
  const base = S.baseline ? keys.map(([, , f]) => f(S.baseline.kpi)) : keys.map(() => null);
  const labels = keys.map(([, l]) => l);
  if (!CH.cmp) {
    CH.cmp = new Chart(document.getElementById('ch-cmp'), {
      type: 'radar',
      data: { labels, datasets: [
        { label: 'Baseline', data: base, borderColor: 'rgba(255,255,255,.45)',
          backgroundColor: 'rgba(255,255,255,.07)', pointRadius: 2 },
        { label: 'Scenario', data: cur, borderColor: 'rgba(122,214,180,.95)',
          backgroundColor: 'rgba(122,214,180,.16)', pointRadius: 3 }] },
      options: { maintainAspectRatio: false, responsive: true,
        scales: { r: { beginAtZero: true, grid, angleLines: { color: 'rgba(255,255,255,.08)' },
          pointLabels: { font: { size: 10 } }, ticks: { backdropColor: 'transparent', font: { size: 9 } } } },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } } }
    });
  } else {
    CH.cmp.data.datasets[0].data = base; CH.cmp.data.datasets[1].data = cur; CH.cmp.update();
  }
  document.getElementById('base-sub').textContent = S.baseline
    ? 'Normalised indices · baseline captured from a previous run'
    : 'Set a baseline in the inputs panel to compare scenarios';
}

/* ── table ──────────────────────────────────────────────────── */
function renderTable() {
  const rows = S.result.wards.filter(w => {
    if (!S.query) return true;
    const q = S.query.toLowerCase();
    return w.name.toLowerCase().includes(q) || w.zone_name.toLowerCase().includes(q) ||
           String(w.ward_no) === q;
  }).sort((a, b) => {
    const k = S.sort.k;
    const get = w => k === 'facility' ? w.facility.name : k === 'name' ? w.name : w[k];
    const av = get(a), bv = get(b);
    if (typeof av === 'string') return S.sort.dir * av.localeCompare(bv);
    return S.sort.dir * (av - bv);
  });
  document.querySelector('#tbl tbody').innerHTML = rows.map(w => `
    <tr data-no="${w.ward_no}" class="${S.focus === w.ward_no ? 'sel' : ''}">
      <td>${w.ward_no}</td><td>${w.name}${S.selected.has(w.ward_no) ? ' <span class="flagged">●</span>' : ''}</td>
      <td><span class="tag">Z${w.zone}</span></td>
      <td class="num">${fmt(w.gen, 1)}</td><td class="num">${fmt(w.density, 1)}</td>
      <td class="num">${w.freq}</td><td class="num">${fmt(w.points)}</td>
      <td class="num">${fmt(w.collected, 1)}</td>
      <td class="num ${w.uncollected > 0.5 ? 'bad' : ''}">${fmt(w.uncollected, 2)}</td>
      <td class="num ${w.coverage > 0.995 ? 'good' : w.coverage < 0.9 ? 'bad' : ''}">${pct(w.coverage)}</td>
      <td class="num">${fmt(w.trips, 1)}</td><td class="num">${fmt(w.km, 1)}</td>
      <td>${w.facility.name.replace(/ (Processing Plant|Compost Plant|Transfer Station|ZWM Unit|\(capping site\))/g, '')}</td>
    </tr>`).join('');
  document.querySelectorAll('#tbl tbody tr').forEach(tr =>
    tr.onclick = () => selectWard(+tr.dataset.no));
}

/* ── recompute ──────────────────────────────────────────────── */
function recompute() {
  syncLabels();
  const cfg = cfgFromUI();
  S.result = SWM.run(cfg, S.wards, S.facs);
  renderKPIs(S.result);
  drawWards(S.result);
  drawHauls(S.result);
  drawFacilities(S.result);
  renderCharts(S.result);
  renderTable();
  renderWardStrip();
}

/* ── export ─────────────────────────────────────────────────── */
function exportCSV() {
  const k = S.result.kpi;
  const head = ['ward_no','ward','zone','area_km2','population','generation_tpd','density_t_km2',
    'pickups_per_week','collection_points','collected_tpd','standing_tpd','coverage','trips_per_day',
    'fleet_km','diesel_l','haul_km_one_way','destination'];
  const lines = S.result.wards.map(w => [w.ward_no, w.name, w.zone, w.area.toFixed(3), w.pop,
    w.gen.toFixed(2), w.density.toFixed(2), w.freq, w.points, w.collected.toFixed(2),
    w.uncollected.toFixed(3), (w.coverage * 100).toFixed(1), w.trips.toFixed(2), w.km.toFixed(1),
    w.fuel.toFixed(2), w.haulKm.toFixed(2), `"${w.facility.name}"`].join(','));
  const meta = [`# Mysuru SWM simulator export`, `# generation_tpd,${k.gen.toFixed(0)}`,
    `# coverage,${(k.coverage * 100).toFixed(2)}%`, `# diesel_l_per_day,${k.fuel.toFixed(1)}`,
    `# cost_per_tonne_inr,${k.costPerT.toFixed(0)}`, `# efficiency_score,${k.effScore.toFixed(1)}`];
  const blob = new Blob([[...meta, head.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mysuru-swm-scenario.csv';
  a.click(); URL.revokeObjectURL(a.href);
}

/* ── wiring ─────────────────────────────────────────────────── */
function wire() {
  RANGE_IDS.forEach(id => {
    const el = document.getElementById('i-' + id);
    el.addEventListener('input', () => { syncLabels(); });
    el.addEventListener('change', recompute);
    el.addEventListener('input', debounce(recompute, 110));
  });
  ['i-ptmode','i-route','i-transfer','i-night'].forEach(id =>
    document.getElementById(id).addEventListener('change', recompute));
  document.querySelectorAll('#freq-mode button').forEach(b => b.onclick = () => {
    setSeg('#freq-mode', 'mode', b.dataset.mode); recompute();
  });
  document.querySelectorAll('#map-mode button').forEach(b => b.onclick = () => {
    S.layer = b.dataset.layer; setSeg('#map-mode', 'layer', S.layer);
    document.getElementById('map-sub').textContent = {
      uncollected: 'Choropleth of uncollected load. Click a ward to inspect or flag it for new collection points.',
      density: 'Waste generated per km² per day — where accumulation pressure is highest.',
      frequency: 'Pickups per week under the active frequency policy.',
      coverage: 'Share of generated waste actually lifted within the day.',
      fuel: 'Diesel litres burned per tonne collected, including trunk haul.'
    }[S.layer];
    drawWards(S.result);
  });
  document.querySelectorAll('#presets button').forEach(b => b.onclick = () => {
    setSeg('#presets', 'preset', b.dataset.preset);
    applyCfg({ ...DEFAULTS, ...PRESETS[b.dataset.preset] });
    recompute();
  });
  document.getElementById('btn-baseline').onclick = () => {
    S.baseline = S.result;
    document.getElementById('btn-baseline').textContent = 'Baseline set ✓';
    setTimeout(() => document.getElementById('btn-baseline').textContent = 'Set as baseline', 1600);
    renderKPIs(S.result); renderCharts(S.result);
  };
  document.getElementById('btn-reset').onclick = () => {
    S.selected.clear(); S.focus = null; applyCfg(DEFAULTS);
    setSeg('#presets', 'preset', 'current'); recompute();
  };
  document.getElementById('btn-export').onclick = exportCSV;
  document.getElementById('btn-side').onclick = () =>
    document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('q-ward').addEventListener('input', e => {
    S.query = e.target.value.trim(); renderTable();
  });
  document.querySelectorAll('#tbl thead th').forEach(th => th.onclick = () => {
    const k = th.dataset.k === 'ward_no' ? 'ward_no' : th.dataset.k;
    S.sort = { k, dir: S.sort.k === k ? -S.sort.dir : -1 };
    renderTable();
  });
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

(async function boot() {
  const [w, f] = await Promise.all([
    fetch('data/wards.geojson').then(r => r.json()),
    fetch('data/facilities.geojson').then(r => r.json())
  ]);
  S.wards = w; S.facs = f;
  initMap(); wire(); syncLabels(); recompute();
  if (wardLayer) map.fitBounds(wardLayer.getBounds(), { padding: [12, 12] });
})();
