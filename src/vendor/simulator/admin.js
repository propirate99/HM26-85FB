window.ADMIN = (function () {
  const S = window.STORE;
  let me = null, root = null, selected = null, selMail = null, WARDS = [];
  const $ = s => root.querySelector(s);

  const CREWS = ['Tipper crew MYS-041', 'Tipper crew MYS-017', 'Tipper crew MYS-128', 'Compactor unit C-09',
    'Compactor unit C-22', 'Zonal rapid squad 1', 'Zonal rapid squad 3', 'JCB + tractor team T-6'];

  function header() {
  $('#a-whoName').textContent = me.name;
  $('#a-whoMeta').textContent = (me.code || 'MCC') + ' · ' + me.email;
  $('#a-av').textContent = (me.name || 'O').trim()[0].toUpperCase();
  $('#a-out').onclick = () => window.ROUTER.signOut();
  $('#a-fStatus').length = 1; $('#a-fWard').length = 1;
  S.STAGES.forEach(s => $('#a-fStatus').add(new Option(s, s)));
  S.WARD_NAMES.forEach(w => $('#a-fWard').add(new Option(w, w)));
  $('#a-sendAll').onclick = flush;
  $('#a-sendOne').onclick = sendOne;
  S.health().then(() => { provider(); mails(); });
  $('#a-csv').onclick = exportCsv;
  ['#a-q', '#a-fStatus', '#a-fWard', '#a-fPri'].forEach(sel => {
    const el = $(sel); el.addEventListener(sel === '#a-q' ? 'input' : 'change', table);
  });
  }

  const toast = m => { const t = $('#a-toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2600); };
  const isDone = c => c.status === 'Resolved' || c.status === 'Closed';
  const isLate = c => !isDone(c) && new Date(c.dueAt) < new Date();

  function filtered() {
    const q = $('#a-q').value.trim().toLowerCase();
    return S.all()
      .filter(c => (!$('#a-fStatus').value || c.status === $('#a-fStatus').value)
        && (!$('#a-fWard').value || c.ward === $('#a-fWard').value)
        && (!$('#a-fPri').value || c.priority === $('#a-fPri').value)
        && (!q || (c.id + c.ward + c.categoryLabel + c.name + c.email).toLowerCase().includes(q)))
      .sort((a, b) => {
        const s = (isDone(a) ? 1 : 0) - (isDone(b) ? 1 : 0);
        return s || new Date(a.dueAt) - new Date(b.dueAt);
      });
  }

  function kpis() {
    const s = S.stats();
    $('#a-kTotal').textContent = s.total; $('#a-kOpen').textContent = s.open;
    $('#a-kLate').textContent = s.breached;
    $('#a-kSla').textContent = s.slaRate.toFixed(0) + '%';
    $('#a-kAvg').textContent = s.avgHours ? s.avgHours.toFixed(1) + ' h' : '—';
    const today = new Date().toDateString();
    $('#a-kMail').textContent = S.outbox().filter(m => new Date(m.at).toDateString() === today).length;
  }

  function table() {
    const list = filtered();
    const tb = $('#a-rows');
    if (!list.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">No complaints match these filters.</td></tr>'; return; }
    tb.innerHTML = list.slice(0, 200).map(c => {
      const late = isLate(c);
      const pct = Math.min(100, (Date.now() - new Date(c.createdAt)) / (new Date(c.dueAt) - new Date(c.createdAt)) * 100);
      return `<tr data-id="${c.id}" class="${selected === c.id ? 'sel' : ''}">
        <td><b>${c.id}</b><br><span class="pill ${c.priority}">${c.priority}</span></td>
        <td>${c.categoryLabel}</td><td>${c.ward}</td>
        <td><b>${c.name}</b><br>${c.email}</td>
        <td style="min-width:110px">${isDone(c) ? '<span class="pill Resolved">met</span>'
          : `<div class="bar ${late ? 'late' : ''}"><i style="width:${pct}%"></i></div>
             <small>${late ? 'overdue' : ((new Date(c.dueAt) - Date.now()) / 3600e3).toFixed(1) + ' h left'}</small>`}</td>
        <td>${c.crew || '<span style="color:var(--fg-3)">unassigned</span>'}</td>
        <td><span class="pill ${c.status.replace(/\s/g, '-')}">${c.status}</span></td></tr>`;
    }).join('');
    tb.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => { selected = tr.dataset.id; table(); dispatch(); });
  }

  function dispatch() {
    const c = S.all().find(x => x.id === selected);
    if (!c) { $('#a-dBody').innerHTML = '<p class="empty">Nothing selected.</p>'; return; }
    $('#a-dSub').textContent = `${c.id} · ${c.ward} · SLA ${c.slaHours} h`;
    const next = S.STAGES[Math.min(S.STAGES.length - 1, S.STAGES.indexOf(c.status) + 1)];
    $('#a-dBody').innerHTML = `
      <div class="spread"><span>Category</span><b>${c.categoryLabel}</b></div>
      <div class="spread"><span>Citizen</span><b>${c.name} · ${c.email}</b></div>
      <div class="spread"><span>Location</span><b>${c.address || c.ward}</b></div>
      <div class="spread" style="border:0"><span>SLA target</span><b>${S.fmt(c.dueAt)} ${isLate(c) ? '· <span style="color:var(--bad)">breached</span>' : ''}</b></div>
      <p class="note-box">${c.detail || 'No description supplied.'}</p>
      <div class="form-grid">
        <label class="f"><span>New status</span><select id="a-uStatus">
          ${S.STAGES.map(s => `<option ${s === next ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="f"><span>Assign crew</span><select id="a-uCrew">
          <option value="">— keep current —</option>
          ${CREWS.map(x => `<option ${x === c.crew ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="f full"><span>Note to citizen (goes into the email)</span>
          <input id="a-uNote" placeholder="e.g. Crew scheduled for tomorrow's 6 a.m. round." /></label>
      </div>
      <div class="row end">
        <button class="btn ghost" id="a-uResolve" style="flex:none">Mark resolved</button>
        <button class="btn" id="a-uGo">Update &amp; notify citizen</button>
      </div>
      <ul class="timeline">${c.log.slice().reverse().map(l =>
        `<li class="done"><b>${l.status}</b>${S.fmt(l.at)}${l.note ? `<div class="note">${l.note}</div>` : ''}</li>`).join('')}</ul>`;

    const apply = status => {
      S.update(c.id, status, $('#a-uNote').value.trim(), $('#a-uCrew').value);
      selMail = null; refresh();
      toast(S.MAIL.ok ? `${c.id} → ${status}. Notifying ${c.email} by email now.`
        : `${c.id} → ${status}. Email queued to ${c.email}.`);
    };
    $('#a-uGo').onclick = () => apply($('#a-uStatus').value);
    $('#a-uResolve').onclick = () => apply('Resolved');
  }

  function wardTable() {
    const all = S.all();
    const rows = WARDS.map(w => {
      const l = all.filter(c => c.ward === w.name);
      return { ...w, n: l.length, open: l.filter(c => !isDone(c)).length, late: l.filter(isLate).length };
    }).sort((a, b) => (b.late * 3 + b.open) - (a.late * 3 + a.open) || b.n - a.n);
    const max = Math.max(1, ...rows.map(r => r.n));
    $('#a-wardRows').innerHTML = rows.map(r => `<tr style="cursor:default">
      <td><b>${r.name}</b></td><td>${r.zone_name || 'Zone ' + r.zone}</td>
      <td class="num">${r.waste_tpd.toFixed(1)}</td><td class="num">${Math.round(r.density_t_km2)}</td>
      <td class="num">${r.n}</td><td class="num">${r.open}</td>
      <td class="num" style="color:${r.late ? 'var(--bad)' : 'inherit'}">${r.late}</td>
      <td style="min-width:90px"><div class="bar"><i style="width:${r.n / max * 100}%"></i></div></td></tr>`).join('');
  }

  function mails() {
    const box = S.outbox();
    const list = $('#a-mailList');
    if (!box.length) { list.innerHTML = '<p class="empty">No notifications queued yet.</p>'; return; }
    if (!selMail || !box.find(m => m.id === selMail)) selMail = box[0].id;
    list.innerHTML = box.slice(0, 50).map(m => `<div class="mail-item ${m.id === selMail ? 'on' : ''}" data-m="${m.id}">
      <div style="flex:1;min-width:0"><b>${m.subject}</b>${m.to} · ${S.fmt(m.at)}</div>
      <span class="tag">${m.state}</span></div>`).join('');
    list.querySelectorAll('[data-m]').forEach(el => el.onclick = () => { selMail = el.dataset.m; mails(); });
    const m = box.find(x => x.id === selMail);
    $('#a-mailTo').textContent = 'To: ' + m.to;
    const st = $('#a-mailState');
    st.textContent = STATE_LABEL[m.state] || m.state;
    st.style.color = m.state === 'failed' ? 'var(--bad)' : m.state === 'delivered' ? 'var(--accent)' : '';
    st.title = m.error || (m.relayed ? 'Relayed to ' + m.deliveredTo : '');
    $('#a-mailFrame').srcdoc = m.html;
    const nq = box.filter(x => x.state === 'queued').length;
    const nd = box.filter(x => x.state === 'delivered').length;
    $('#a-mailSub').textContent =
      `${nq} queued · ${nd} delivered via Gmail · ${box.length} total notifications generated.`;
    provider();
  }

  const STATE_LABEL = { queued: 'queued for delivery', sending: 'sending…', delivered: 'delivered via Gmail',
    failed: 'send failed', logged: 'logged (historic)', sent: 'logged (historic)' };

  function provider() {
    const el = $('#a-provider');
    const M = S.MAIL;
    if (!M.checked) { el.textContent = 'Mail provider: checking…'; return; }
    if (M.ok) {
      el.textContent = `Gmail connected · live`;
      el.style.color = 'var(--accent)';
      el.title = M.relayInbox ? 'Demo relay: all sends are delivered to ' + M.relayInbox : '';
    } else {
      el.textContent = 'Gmail unavailable';
      el.style.color = 'var(--warn)';
      el.title = M.error || '';
    }
  }

  async function flush() {
    const btn = $('#a-sendAll');
    if (btn.disabled) return;
    const q = S.outbox().filter(m => m.state === 'queued');
    if (!q.length) return toast('Queue is already empty.');
    if (!S.MAIL.ok) return toast('Gmail is not reachable right now — nothing was sent.');
    btn.disabled = true;
    const label = btn.textContent;
    const res = await S.deliverQueued((sent, total, failed) => {
      btn.textContent = `Sending ${sent + failed}/${total}…`;
      mails();
    });
    btn.disabled = false; btn.textContent = label;
    mails();
    toast(res.failed
      ? `${res.sent} sent via Gmail, ${res.failed} failed.`
      : `${res.sent} notification${res.sent === 1 ? '' : 's'} sent via Gmail to ${S.MAIL.relayInbox}.`);
  }

  async function sendOne() {
    const m = S.outbox().find(x => x.id === selMail);
    if (!m) return;
    if (!S.MAIL.ok) return toast('Gmail is not reachable right now.');
    if (m.state === 'delivered') return toast('That notification was already delivered.');
    const btn = $('#a-sendOne'); btn.disabled = true; btn.textContent = 'Sending…';
    const r = await S.deliver(m.id);
    btn.disabled = false; btn.textContent = 'Send this one';
    mails();
    toast(r.ok ? `Sent to ${r.delivered_to}${r.relayed ? ' (relayed for ' + r.intended + ')' : ''}.`
      : 'Send failed: ' + (r.error || 'unknown error'));
  }

  function exportCsv() {
    const rows = [['id', 'status', 'priority', 'category', 'ward', 'citizen', 'email', 'crew', 'filed', 'sla_due', 'resolved']];
    filtered().forEach(c => rows.push([c.id, c.status, c.priority, c.categoryLabel, c.ward, c.name, c.email,
      c.crew || '', c.createdAt, c.dueAt, c.resolvedAt || '']));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'mcc-complaints.csv'; a.click();
    toast('Complaint register exported.');
  }

  function refresh() { kpis(); table(); dispatch(); wardTable(); mails(); }

  let bound = false;
  function mount(el, user) {
    if (!bound) { bound = true; document.addEventListener('mcc:mail', () => { try { mails(); } catch (e) {} }); }
    root = el; me = user; selMail = null;
    header();
    const f = filtered()[0]; selected = f ? f.id : null;
    refresh();
    if (WARDS.length) { wardTable(); return; }
    fetch('data/wards.geojson').then(r => r.json()).then(g => {
      WARDS = g.features.map(f2 => f2.properties);
      wardTable();
    }).catch(() => { $('#a-wardRows').innerHTML = '<tr><td colspan="8" class="empty">Ward model unavailable.</td></tr>'; });
  }
  return { mount };
})();
