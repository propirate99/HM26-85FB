/* Shared client store: session, complaints, email outbox.
   In-memory only (no browser storage) — state lives for the life of the page.
   Swap `read`/`write` for API calls against a real backend in production. */
(function () {
  const K = { session: 'session', users: 'users', comp: 'complaints', mail: 'outbox', seed: 'seeded' };
  const MEM = Object.create(null);
  const read = (k, f) => (k in MEM ? MEM[k] : f);
  const write = (k, v) => { MEM[k] = v; };

  const WARD_NAMES = ["Jayalakshmipuram", "Vijayanagar 1st Stage", "Vijayanagar 2nd Stage", "Hebbal", 
    "Metagalli", "Bogadi North", "Bogadi South", "Srirampura", "Kuvempunagar East", "Kuvempunagar West", 
    "Ramakrishnanagar", "Saraswathipuram", "Yadavagiri", "Gokulam", "Devaraja Mohalla", "Mandi Mohalla", 
    "Ashokapuram", "Chamundipuram", "Vidyaranyapuram", "Rajivnagar", "Kesare", "Bannimantap A", 
    "Bannimantap B", "Udayagiri", "Azeez Sait Nagar", "Rajendranagar", "Vishweshwaranagar", "Nazarbad", 
    "Lakshmipuram", "Chamarajapuram", "Agrahara", "Krishnamurthypuram", "Kalyanagiri", "Alanahalli", 
    "Dattagalli", "Gayathripuram", "J P Nagar", "Kumbarakoppal", "Ittigegud", "Siddhartha Layout", 
    "Vinayakanagar", "Shanthinagar", "Tilaknagar", "Subhashnagar", "Sathagalli", "Hootagalli", "Belavatha", 
    "Kergalli", "N R Mohalla", "Ghousia Nagar", "Tilak Nagar East", "Bamboo Bazaar", "Kyathamaranahalli", 
    "Bharathi Nagar", "Mahadevapura", "Kanakadasa Nagar", "Hinkal", "Manasagangothri", "Kadakola North", 
    "Vasanth Nagar", "Basaveshwara Nagar", "Ashraf Nagar", "Rajiv Gandhi Nagar", "Somanathapura", 
    "Vijayashreepura"];

  const CATEGORIES = [
    { id: 'missed', label: 'Missed collection', sla: 24 },
    { id: 'overflow', label: 'Overflowing bin / black spot', sla: 24 },
    { id: 'burning', label: 'Open waste burning', sla: 12 },
    { id: 'dead', label: 'Dead animal removal', sla: 6 },
    { id: 'debris', label: 'Construction debris dumping', sla: 72 },
    { id: 'drain', label: 'Drain / storm water choke', sla: 48 },
    { id: 'segregation', label: 'Segregation not followed', sla: 96 },
    { id: 'vehicle', label: 'Auto tipper did not arrive', sla: 24 }
  ];

  const STAGES = ['Registered', 'Assigned', 'In progress', 'Resolved', 'Closed'];

  const uid = p => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const now = () => new Date().toISOString();

  /* ── session ─────────────────────────── */
  function session() { return read(K.session, null); }
  function signIn(user) { write(K.session, user); return user; }
  function signOut() { delete MEM[K.session]; }
  function requireRole(role) {
    const s = session();
    return (!s || (role && s.role !== role)) ? null : s;
  }

  /* ── complaints ──────────────────────── */
  function all() { return read(K.comp, []); }
  function saveAll(list) { write(K.comp, list); }

  function file({ email, name, ward, category, detail, address, channel }) {
    const cat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
    const t = now();
    const c = {
      id: uid('MCC'), email, name, ward, category: cat.id, categoryLabel: cat.label,
      detail, address: address || '', createdAt: t, slaHours: cat.sla,
      dueAt: new Date(Date.now() + cat.sla * 3600e3).toISOString(),
      status: 'Registered', crew: null, priority: cat.sla <= 12 ? 'High' : cat.sla <= 24 ? 'Medium' : 'Low',
      notifyEmail: channel !== false,
      log: [{ at: t, status: 'Registered', note: 'Complaint received and ward-routed automatically.' }]
    };
    const list = all(); list.unshift(c); saveAll(list);
    queueMail(c, 'Registered', c.log[0].note);
    return c;
  }

  function update(id, status, note, crew) {
    const list = all(); const c = list.find(x => x.id === id); if (!c) return null;
    c.status = status;
    if (crew !== undefined && crew !== null && crew !== '') c.crew = crew;
    if (status === 'Resolved' || status === 'Closed') c.resolvedAt = now();
    c.log.push({ at: now(), status, note: note || '' });
    saveAll(list);
    queueMail(c, status, note);
    return c;
  }

  const byEmail = e => all().filter(c => c.email.toLowerCase() === String(e).toLowerCase());

  function stats(list) {
    const l = list || all();
    const open = l.filter(c => c.status !== 'Resolved' && c.status !== 'Closed');
    const done = l.filter(c => c.status === 'Resolved' || c.status === 'Closed');
    const breached = open.filter(c => new Date(c.dueAt) < new Date());
    const durations = done.filter(c => c.resolvedAt).map(c => (new Date(c.resolvedAt) - new Date(c.createdAt)) / 3600e3);
    const onTime = done.filter(c => c.resolvedAt && new Date(c.resolvedAt) <= new Date(c.dueAt)).length;
    return {
      total: l.length, open: open.length, resolved: done.length, breached: breached.length,
      avgHours: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      slaRate: done.length ? onTime / done.length * 100 : 100
    };
  }

  /* ── email notifications ─────────────── */
  const COPY = {
    Registered: { s: 'Complaint {id} registered — {cat}', h: 'We have your complaint', b: 'Your complaint has been registered and routed to the {ward} ward sanitary inspector. You will get an email at every status change.' },
    Assigned: { s: 'Complaint {id} assigned to a field crew', h: 'A crew is on it', b: 'Your complaint has been assigned to {crew}. Work is scheduled within the service window below.' },
    'In progress': { s: 'Complaint {id} — work started', h: 'Work has started', b: '{crew} has started work at the reported location. We will confirm as soon as the site is cleared.' },
    Resolved: { s: 'Complaint {id} resolved', h: 'Resolved', b: 'The reported issue has been attended to and the location cleared. If the problem persists, reopen the complaint within 7 days from your dashboard.' },
    Closed: { s: 'Complaint {id} closed', h: 'Closed', b: 'This complaint is now closed. Thank you for helping keep Mysuru clean.' }
  };

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  function renderMail(c, status, note) {
    const t = COPY[status] || COPY.Registered;
    const fill = s => s.replace('{id}', c.id).replace('{cat}', c.categoryLabel)
      .replace('{ward}', c.ward).replace(/\{crew\}/g, c.crew || 'the ward sanitation crew');
    const rows = [['Complaint ID', c.id], ['Category', c.categoryLabel], ['Ward', c.ward],
      ['Priority', c.priority], ['Filed', fmt(c.createdAt)], ['SLA target', fmt(c.dueAt)],
      ['Current status', status]];
    const html = `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e7e5">
<tr><td style="background:#0f1a17;padding:20px 24px;color:#fff">
  <div style="font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:#4fd1a5">Mysuru City Corporation</div>
  <div style="font-size:19px;font-weight:700;margin-top:4px">${fill(t.h)}</div></td></tr>
<tr><td style="padding:22px 24px;color:#1d2a26;font-size:15px;line-height:1.55">
  <p style="margin:0 0 14px">Namaskara ${c.name || 'citizen'},</p>
  <p style="margin:0 0 16px">${fill(t.b)}</p>
  ${note ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f1f7f4;border-left:3px solid #4fd1a5;border-radius:6px;font-size:14px">${note}</p>` : ''}
  <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px">
    ${rows.map(r => `<tr><td style="padding:7px 0;color:#65726d;width:44%">${r[0]}</td><td style="padding:7px 0;font-weight:600;text-align:right">${r[1]}</td></tr>`).join('')}
  </table>
  <p style="margin:20px 0 0"><a href="#" style="display:inline-block;background:#12836a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;font-size:14px">Track this complaint</a></p>
</td></tr>
<tr><td style="padding:16px 24px;background:#f7faf9;color:#77837e;font-size:12px;line-height:1.5">
  Mysuru City Corporation · Solid Waste Management Cell · Helpline 0821-2418800<br/>
  You receive these because email alerts are on for complaint ${c.id}.</td></tr>
</table></body></html>`;
    const text = `${fill(t.h)}\n\n${fill(t.b)}${note ? '\n\nNote: ' + note : ''}\n\n` +
      rows.map(r => r[0] + ': ' + r[1]).join('\n') + '\n\nMysuru City Corporation · SWM Cell';
    return { to: c.email, subject: fill(t.s), html, text };
  }

  function queueMail(c, status, note) {
    if (!c.notifyEmail) return null;
    const m = renderMail(c, status, note);
    const box = read(K.mail, []);
    const mailId = uid('MAIL');
    box.unshift({ id: mailId, at: now(), complaintId: c.id, status, ...m, state: 'queued' });
    write(K.mail, box.slice(0, 200));
    // auto-deliver live notifications the moment a status moves
    if (MAIL.ok) setTimeout(() => deliver(mailId), 0);
    return m;
  }
  const outbox = () => read(K.mail, []);
  function markSent(id) { const b = outbox(); const m = b.find(x => x.id === id); if (m) { m.state = 'sent'; write(K.mail, b); } return m; }

  /* ── live delivery through the connected Gmail account ──────────── */
  const API = 'port/8000'.startsWith('__') ? 'http://localhost:8000' : 'port/8000';
  const MAIL = { provider: null, relayInbox: null, ok: false, checked: false, error: null };

  const ping = () => { try { document.dispatchEvent(new CustomEvent('mcc:mail')); } catch (e) {} };

  async function health() {
    try {
      const r = await fetch(API + '/api/health');
      const j = await r.json();
      MAIL.ok = !!j.ok; MAIL.provider = j.provider || null;
      MAIL.relayInbox = j.relay_inbox || null; MAIL.error = j.error || null;
    } catch (e) { MAIL.ok = false; MAIL.error = 'Mail relay unreachable'; }
    MAIL.checked = true;
    return MAIL;
  }

  // Sends one queued notification for real. Returns {ok, ...} and updates its state.
  async function deliver(mailId) {
    const box = outbox();
    const m = box.find(x => x.id === mailId);
    if (!m) return { ok: false, error: 'Notification not found' };
    m.state = 'sending'; write(K.mail, box); ping();
    let j;
    try {
      const r = await fetch(API + '/api/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: m.to, subject: m.subject, html: m.html, text: m.text,
          complaint_id: m.complaintId, status: m.status, visitor: 'portal' })
      });
      j = await r.json();
    } catch (e) { j = { ok: false, error: 'Mail relay unreachable' }; }
    const b2 = outbox(); const m2 = b2.find(x => x.id === mailId);
    if (m2) {
      m2.state = j.ok ? 'delivered' : 'failed';
      m2.deliveredTo = j.delivered_to || null;
      m2.relayed = !!j.relayed;
      m2.sentAt = j.at || now();
      m2.error = j.ok ? null : (j.error || 'Send failed');
      write(K.mail, b2);
    }
    ping();
    return j;
  }

  // Delivers every queued notification, oldest first. onEach(sent, total) for progress.
  async function deliverQueued(onEach) {
    const ids = outbox().filter(m => m.state === 'queued').map(m => m.id).reverse();
    let sent = 0, failed = 0;
    for (const id of ids) {
      const r = await deliver(id);
      r.ok ? sent++ : failed++;
      if (onEach) onEach(sent, ids.length, failed);
    }
    return { sent, failed, total: ids.length };
  }

  /* ── demo seed ───────────────────────── */
  function seed() {
    if (read(K.seed, false)) return;
    write(K.seed, true);
    const people = [['Anitha R', 'anitha.r@example.in'], ['Kiran Gowda', 'kiran.g@example.in'],
      ['Shabana M', 'shabana.m@example.in'], ['Prakash N', 'prakash.n@example.in'],
      ['Deepa S', 'deepa.s@example.in'], ['Imran Khan', 'imran.k@example.in'],
      ['Lakshmi Bai', 'lakshmi.b@example.in'], ['Venkatesh H', 'venkatesh.h@example.in']];
    const crews = ['Tipper crew MYS-041', 'Tipper crew MYS-017', 'Compactor unit C-09', 'Zonal rapid squad 3', 'Tipper crew MYS-128'];
    const list = [];
    let r = 20260918;
    const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 46; i++) {
      const p = people[Math.floor(rnd() * people.length)];
      const cat = CATEGORIES[Math.floor(rnd() * CATEGORIES.length)];
      const ward = WARD_NAMES[Math.floor(rnd() * WARD_NAMES.length)];
      const roll = rnd();
      const steps = roll < 0.52 ? 4 : roll < 0.68 ? 3 : roll < 0.86 ? 2 : 1;
      const closed = steps >= 4;
      // closed ones mostly land inside SLA; open ones are still inside or slightly past their clock
      const ageH = closed ? cat.sla * (0.25 + rnd() * (rnd() < 0.78 ? 0.6 : 1.9))
        : cat.sla * (0.1 + rnd() * (rnd() < 0.75 ? 0.8 : 1.5));
      const created = new Date(Date.now() - ageH * 3600e3);
      const c = {
        id: uid('MCC'), email: p[1], name: p[0], ward, category: cat.id, categoryLabel: cat.label,
        detail: 'Reported via citizen portal.', address: ward + ', Mysuru',
        createdAt: created.toISOString(), slaHours: cat.sla,
        dueAt: new Date(created.getTime() + cat.sla * 3600e3).toISOString(),
        priority: cat.sla <= 12 ? 'High' : cat.sla <= 24 ? 'Medium' : 'Low',
        notifyEmail: true, crew: null, status: 'Registered',
        log: [{ at: created.toISOString(), status: 'Registered', note: 'Complaint received and ward-routed automatically.' }]
      };
      for (let s = 1; s < steps; s++) {
        const st = STAGES[s];
        if (s === 1) c.crew = crews[Math.floor(rnd() * crews.length)];
        const at = new Date(created.getTime() + (ageH * (s / steps)) * 3600e3).toISOString();
        c.status = st; c.log.push({ at, status: st, note: '' });
        if (st === 'Resolved' || st === 'Closed') c.resolvedAt = at;
      }
      list.push(c);
    }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    saveAll(list);

    // backfill the notification log so the queue reflects the history above
    const box = [];
    list.forEach(c => c.log.forEach(l => {
      const m = renderMail(c, l.status, l.note);
      box.push({ id: uid('MAIL'), at: l.at, complaintId: c.id, status: l.status, ...m,
        state: Date.now() - new Date(l.at) > 36e5 ? 'logged' : 'queued' });
    }));
    box.sort((a, b) => new Date(b.at) - new Date(a.at));
    write(K.mail, box.slice(0, 200));
  }

  window.STORE = { K, CATEGORIES, STAGES, WARD_NAMES, session, signIn, signOut, requireRole,
    all, file, update, byEmail, stats, renderMail, outbox, markSent, seed, fmt, read, write,
    MAIL, health, deliver, deliverQueued };
})();
