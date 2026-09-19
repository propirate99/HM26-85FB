window.CIVILIAN = (function () {
  const S = window.STORE;
  let me = null, root = null, selected = null, selMail = null;
  const $ = s => root.querySelector(s);

  function header() {
  $('#whoName').textContent = me.name;
  $('#whoMeta').textContent = (me.ward ? me.ward + ' · ' : '') + me.email;
  $('#av').textContent = (me.name || 'C').trim()[0].toUpperCase();
  $('#out').onclick = () => window.ROUTER.signOut();
  }

  function options() {
  $('#fCat').length = 0; $('#fWard').length = 0; $('#fStatus').length = 1;
  S.CATEGORIES.forEach(c => $('#fCat').add(new Option(c.label, c.id)));
  S.WARD_NAMES.forEach(w => $('#fWard').add(new Option(w, w)));
  if (me.ward) $('#fWard').value = me.ward;
  $('#fEmail').value = me.email;
  $('#fNotify').checked = me.notify !== false;
  S.STAGES.forEach(s => $('#fStatus').add(new Option(s, s)));
  $('#fCat').onchange = sla; sla();
  $('#q').oninput = table; $('#fStatus').onchange = table;
  $('#cForm').onsubmit = submit;
  }

  const sla = () => {
    const c = S.CATEGORIES.find(x => x.id === $('#fCat').value);
    $('#slaNote').textContent = `SLA for “${c.label}”: ${c.sla} hours from registration. ` +
      (c.sla <= 12 ? 'High priority — routed to the zonal rapid squad.'
        : c.sla <= 24 ? 'Medium priority — handled by the ward auto tipper crew.'
        : 'Low priority — scheduled into the ward work plan.');
  };

  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2600); };

  /* ── render ── */
  function mine() { return S.byEmail(me.email); }

  function kpis() {
    const l = mine(), s = S.stats(l);
    $('#kTotal').textContent = s.total;
    $('#kOpen').textContent = s.open;
    $('#kDone').textContent = s.resolved;
    $('#kAvg').textContent = s.avgHours ? s.avgHours.toFixed(1) + ' h' : '—';
  }

  function table() {
    const q = $('#q').value.trim().toLowerCase(), st = $('#fStatus').value;
    const list = mine().filter(c =>
      (!st || c.status === st) &&
      (!q || (c.id + c.ward + c.categoryLabel).toLowerCase().includes(q)));
    const tb = $('#rows');
    if (!list.length) { tb.innerHTML = '<tr><td colspan="6" class="empty">No complaints yet — file one above.</td></tr>'; return; }
    tb.innerHTML = list.map(c => {
      const done = c.status === 'Resolved' || c.status === 'Closed';
      const late = !done && new Date(c.dueAt) < new Date();
      const pct = Math.min(100, (Date.now() - new Date(c.createdAt)) / (new Date(c.dueAt) - new Date(c.createdAt)) * 100);
      return `<tr data-id="${c.id}" class="${selected === c.id ? 'sel' : ''}">
        <td><b>${c.id}</b><br><span class="pill ${c.priority}">${c.priority}</span></td>
        <td>${c.categoryLabel}</td><td>${c.ward}</td>
        <td>${S.fmt(c.createdAt)}</td>
        <td style="min-width:110px">${done ? 'met' : `<div class="bar ${late ? 'late' : ''}"><i style="width:${pct}%"></i></div>
          <small>${late ? 'overdue' : Math.max(0, (new Date(c.dueAt) - Date.now()) / 3600e3).toFixed(1) + ' h left'}</small>`}</td>
        <td><span class="pill ${c.status.replace(/\s/g, '-')}">${c.status}</span></td></tr>`;
    }).join('');
    tb.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => select(tr.dataset.id));
  }

  function detail() {
    const c = mine().find(x => x.id === selected);
    if (!c) { $('#detailBody').innerHTML = '<p class="empty">No complaint selected.</p>'; $('#detailSub').textContent = 'Select a complaint to see its full trail.'; return; }
    $('#detailSub').textContent = `${c.id} · ${c.categoryLabel} · ${c.ward}`;
    const idx = S.STAGES.indexOf(c.status);
    const logByStage = {}; c.log.forEach(l => logByStage[l.status] = l);
    $('#detailBody').innerHTML = `
      <div class="spread"><span>Status</span><b><span class="pill ${c.status.replace(/\s/g, '-')}">${c.status}</span></b></div>
      <div class="spread"><span>Crew assigned</span><b>${c.crew || 'pending allocation'}</b></div>
      <div class="spread"><span>SLA target</span><b>${S.fmt(c.dueAt)}</b></div>
      <div class="spread" style="border:0"><span>Email alerts</span><b>${c.notifyEmail ? 'on · ' + c.email : 'off'}</b></div>
      <ul class="timeline">${S.STAGES.map((s, i) => {
        const l = logByStage[s];
        return `<li class="${i <= idx ? 'done' : ''}"><b>${s}</b>${l ? S.fmt(l.at) : 'pending'}
          ${l && l.note ? `<div class="note">${l.note}</div>` : ''}</li>`;
      }).join('')}</ul>`;
  }

  function mails() {
    const box = S.outbox().filter(m => m.to.toLowerCase() === me.email.toLowerCase());
    const list = $('#mailList');
    if (!box.length) { list.innerHTML = '<p class="empty">No emails yet. File a complaint to trigger the first one.</p>'; return; }
    if (!selMail || !box.find(m => m.id === selMail)) selMail = box[0].id;
    list.innerHTML = box.slice(0, 40).map(m => `<div class="mail-item ${m.id === selMail ? 'on' : ''}" data-m="${m.id}">
      <div style="flex:1;min-width:0"><b>${m.subject}</b>${S.fmt(m.at)} · ${m.complaintId}</div>
      <span class="tag">${m.state}</span></div>`).join('');
    list.querySelectorAll('[data-m]').forEach(el => el.onclick = () => { selMail = el.dataset.m; mails(); });
    const m = box.find(x => x.id === selMail);
    $('#mailTo').textContent = 'To: ' + m.to;
    const st = $('#mailState');
    st.textContent = STATE_LABEL[m.state] || m.state;
    st.style.color = m.state === 'failed' ? 'var(--bad)' : m.state === 'delivered' ? 'var(--accent)' : '';
    st.title = m.error || (m.relayed ? 'Relayed to ' + m.deliveredTo : '');
    $('#mailFrame').srcdoc = m.html;
  }

  const STATE_LABEL = { queued: 'queued for delivery', sending: 'sending\u2026', delivered: 'delivered via Gmail',
    failed: 'send failed', logged: 'logged (historic)', sent: 'logged (historic)' };

  async function sendOne() {
    if (!selMail) return;
    const btn = $('#cSendOne');
    if (!S.MAIL.ok) return toast('Email service is not reachable right now.');
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sending\u2026';
    const r = await S.deliver(selMail);
    btn.disabled = false; btn.textContent = label;
    mails();
    toast(r.ok ? 'Sent to ' + r.delivered_to + '.' : 'Send failed: ' + (r.error || 'unknown error'));
  }

  function select(id) { selected = id; table(); detail(); }
  function refresh() { kpis(); table(); detail(); mails(); }

  function submit(e) {
    e.preventDefault();
    const detailTxt = $('#fDetail').value.trim();
    if (!detailTxt) { toast('Describe the problem before submitting.'); return; }
    const c = S.file({
      email: $('#fEmail').value.trim() || me.email, name: me.name, ward: $('#fWard').value,
      category: $('#fCat').value, detail: detailTxt, address: $('#fAddr').value.trim(),
      channel: $('#fNotify').checked
    });
    $('#fDetail').value = ''; $('#fAddr').value = '';
    selected = c.id; selMail = null;
    refresh();
    toast(S.MAIL.ok ? `Complaint ${c.id} registered — confirmation email sending via Gmail.`
      : `Complaint ${c.id} registered — confirmation email queued.`);
    $('#detail').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  let bound = false;
  function mount(el, user) {
    if (!bound) { bound = true; document.addEventListener('mcc:mail', () => { try { mails(); } catch (e) {} }); }
    root = el; me = user; selected = null; selMail = null;
    header(); options();
    $('#cSendOne').onclick = sendOne;
    const first = mine()[0]; if (first) selected = first.id;
    refresh();
    S.health().then(() => mails());
  }
  return { mount };
})();
