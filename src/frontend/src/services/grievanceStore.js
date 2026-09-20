import { swmApi } from "./swmApi.js";

const WARD_NAMES = [
  "Jayalakshmipuram", "Vijayanagar 1st Stage", "Vijayanagar 2nd Stage", "Hebbal", 
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
  "Vijayashreepura"
];

export const CATEGORIES = [
  { id: "missed", label: "Missed collection", sla: 24, priority: "Medium" },
  { id: "overflow", label: "Overflowing bin / black spot", sla: 24, priority: "Medium" },
  { id: "burning", label: "Open waste burning", sla: 12, priority: "High" },
  { id: "dead", label: "Dead animal removal", sla: 6, priority: "High" },
  { id: "debris", label: "Construction debris dumping", sla: 72, priority: "Low" },
  { id: "drain", label: "Drain / storm water choke", sla: 48, priority: "Medium" },
  { id: "segregation", label: "Segregation not followed", sla: 96, priority: "Low" },
  { id: "vehicle", label: "Auto tipper did not arrive", sla: 24, priority: "Medium" }
];

export const STAGES = ["Registered", "Assigned", "In progress", "Resolved", "Closed"];

export const CREWS = [
  "Tipper crew MYS-041",
  "Tipper crew MYS-017",
  "Tipper crew MYS-128",
  "Compactor unit C-09",
  "Compactor unit C-22",
  "Zonal rapid squad 1",
  "Zonal rapid squad 3",
  "JCB + tractor team T-6"
];

const uid = (p) => p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
const now = () => new Date().toISOString();

export const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(d);
  }
};

const COPY = {
  Registered: {
    s: "Complaint {id} registered — {cat}",
    h: "We have your complaint",
    b: "Your complaint has been registered and routed to the {ward} ward sanitary inspector. You will get an email at every status change."
  },
  Assigned: {
    s: "Complaint {id} assigned to a field crew",
    h: "A crew is on it",
    b: "Your complaint has been assigned to {crew}. Work is scheduled within the service window below."
  },
  "In progress": {
    s: "Complaint {id} — work started",
    h: "Work has started",
    b: "{crew} has started work at the reported location. We will confirm as soon as the site is cleared."
  },
  Resolved: {
    s: "Complaint {id} resolved",
    h: "Resolved",
    b: "The reported issue has been attended to and the location cleared. If the problem persists, reopen the complaint within 7 days from your dashboard."
  },
  Closed: {
    s: "Complaint {id} closed",
    h: "Closed",
    b: "This complaint is now closed. Thank you for helping keep Mysuru clean."
  }
};

export function renderMail(c, status, note) {
  const t = COPY[status] || COPY.Registered;
  const fill = (s) =>
    s
      .replace(/\{id\}/g, c.id)
      .replace(/\{cat\}/g, c.categoryLabel || c.category)
      .replace(/\{ward\}/g, c.ward)
      .replace(/\{crew\}/g, c.crew || "the ward sanitation crew");

  const rows = [
    ["Complaint ID", c.id],
    ["Category", c.categoryLabel || c.category],
    ["Ward", c.ward],
    ["Priority", c.priority],
    ["Filed", fmtDate(c.createdAt)],
    ["SLA target", fmtDate(c.dueAt)],
    ["Current status", status]
  ];

  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:24px">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e7e5;box-shadow:0 8px 24px rgba(0,0,0,0.06)">
<tr><td style="background:#0f1a17;padding:20px 24px;color:#fff">
  <div style="font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:#37d39b;font-weight:700">Mysuru City Corporation</div>
  <div style="font-size:19px;font-weight:700;margin-top:4px;color:#f0fdf4">${fill(t.h)}</div></td></tr>
<tr><td style="padding:22px 24px;color:#1d2a26;font-size:15px;line-height:1.55">
  <p style="margin:0 0 14px">Namaskara <strong>${c.name || "citizen"}</strong>,</p>
  <p style="margin:0 0 16px">${fill(t.b)}</p>
  ${note ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f1f7f4;border-left:3px solid #37d39b;border-radius:6px;font-size:14px;color:#1d2a26"><strong>Update note:</strong> ${note}</p>` : ""}
  <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;margin-top:14px">
    ${rows.map((r) => `<tr><td style="padding:7px 0;color:#65726d;width:44%;border-bottom:1px solid #f0f2f1">${r[0]}</td><td style="padding:7px 0;font-weight:600;text-align:right;color:#111827;border-bottom:1px solid #f0f2f1">${r[1]}</td></tr>`).join("")}
  </table>
  <p style="margin:22px 0 0"><span style="display:inline-block;background:#12836a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">✓ Track Complaint ${c.id}</span></p>
</td></tr>
<tr><td style="padding:16px 24px;background:#f7faf9;color:#77837e;font-size:12px;line-height:1.5;border-top:1px solid #eef2f0">
  Mysuru City Corporation · Solid Waste Management Cell · Helpline 0821-2418800<br/>
  You receive these updates because email alerts are active for complaint ${c.id}.</td></tr>
</table></body></html>`;

  const text = `${fill(t.h)}\n\n${fill(t.b)}${note ? "\n\nNote: " + note : ""}\n\n` +
    rows.map((r) => r[0] + ": " + r[1]).join("\n") + "\n\nMysuru City Corporation · SWM Cell";

  return { to: c.email, subject: fill(t.s), html, text };
}

// In-memory + localStorage store
class GrievanceStore {
  constructor() {
    this.complaints = [];
    this.outbox = [];
    this.subscribers = new Set();
    this.init();
  }

  init() {
    try {
      const savedC = localStorage.getItem("mcc_complaints");
      const savedM = localStorage.getItem("mcc_outbox");
      if (savedC && savedM) {
        this.complaints = JSON.parse(savedC);
        this.outbox = JSON.parse(savedM);
        return;
      }
    } catch {
      // fallback
    }
    this.seed();
  }

  save() {
    try {
      localStorage.setItem("mcc_complaints", JSON.stringify(this.complaints));
      localStorage.setItem("mcc_outbox", JSON.stringify(this.outbox));
    } catch {}
    this.notify();
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify() {
    this.subscribers.forEach((fn) => {
      try { fn(); } catch {}
    });
  }

  seed() {
    const people = [
      ["Ravi Kumar", "ravi.citizen@mysuru.demo", "Saraswathipuram"],
      ["Ananya Rao", "ananya.r@example.in", "Jayalakshmipuram"],
      ["Kiran Gowda", "kiran.g@example.in", "Hebbal"],

      ["Shabana M", "shabana.m@example.in", "Bannimantap A"],
      ["Prakash N", "prakash.n@example.in", "Kuvempunagar East"],
      ["Deepa S", "deepa.s@example.in", "Gokulam"],
      ["Imran Khan", "imran.k@example.in", "Udayagiri"],
      ["Lakshmi Bai", "lakshmi.b@example.in", "Chamundipuram"],
      ["Venkatesh H", "venkatesh.h@example.in", "Vidyaranyapuram"]
    ];

    const list = [];
    let r = 20260918;
    const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;

    for (let i = 0; i < 48; i++) {
      const p = people[Math.floor(rnd() * people.length)];
      const cat = CATEGORIES[Math.floor(rnd() * CATEGORIES.length)];
      const ward = p[2] && i < 15 ? p[2] : WARD_NAMES[Math.floor(rnd() * WARD_NAMES.length)];
      const roll = rnd();
      const steps = roll < 0.52 ? 4 : roll < 0.68 ? 3 : roll < 0.86 ? 2 : 1;
      const closed = steps >= 4;
      const ageH = closed
        ? cat.sla * (0.25 + rnd() * (rnd() < 0.78 ? 0.6 : 1.9))
        : cat.sla * (0.1 + rnd() * (rnd() < 0.75 ? 0.8 : 1.5));
      const created = new Date(Date.now() - ageH * 3600e3);

      const c = {
        id: uid("MCC"),
        email: p[1],
        name: p[0],
        ward,
        category: cat.id,
        categoryLabel: cat.label,
        detail: "Reported via citizen portal. Regular collection check required.",
        address: `${ward}, Mysuru`,
        createdAt: created.toISOString(),
        slaHours: cat.sla,
        dueAt: new Date(created.getTime() + cat.sla * 3600e3).toISOString(),
        priority: cat.priority,
        notifyEmail: true,
        crew: null,
        status: "Registered",
        log: [
          {
            at: created.toISOString(),
            status: "Registered",
            note: "Complaint received and ward-routed automatically."
          }
        ]
      };

      for (let s = 1; s < steps; s++) {
        const st = STAGES[s];
        if (s === 1) c.crew = CREWS[Math.floor(rnd() * CREWS.length)];
        const at = new Date(created.getTime() + ageH * (s / steps) * 3600e3).toISOString();
        c.status = st;
        const note =
          st === "Assigned"
            ? `Assigned to ${c.crew} for priority dispatch.`
            : st === "In progress"
              ? "Crew on-site clearing waste accumulation."
              : st === "Resolved"
                ? "Location cleared and sanitized with lime powder."
                : "";
        c.log.push({ at, status: st, note });
        if (st === "Resolved" || st === "Closed") c.resolvedAt = at;
      }
      list.push(c);
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    this.complaints = list;

    // Backfill outbox
    const box = [];
    list.forEach((c) =>
      c.log.forEach((l) => {
        const m = renderMail(c, l.status, l.note);
        box.push({
          id: uid("MAIL"),
          at: l.at,
          complaintId: c.id,
          status: l.status,
          ...m,
          state: Date.now() - new Date(l.at) > 36e5 ? "delivered" : "queued"
        });
      })
    );
    box.sort((a, b) => new Date(b.at) - new Date(a.at));
    this.outbox = box.slice(0, 150);
    this.save();
  }

  getAll() {
    return this.complaints;
  }

  getByEmail(email) {
    if (!email) return [];
    const norm = String(email).trim().toLowerCase();
    return this.complaints.filter((c) => c.email && c.email.toLowerCase() === norm);
  }

  getOutbox() {
    return this.outbox;
  }

  fileComplaint({ email, name, ward, category, detail, address, notifyEmail = true }) {
    const cat = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const t = now();
    const c = {
      id: uid("MCC"),
      email: email || "citizen@mysuru.demo",
      name: name || "Mysuru Resident",
      ward: ward || "Jayalakshmipuram",
      category: cat.id,
      categoryLabel: cat.label,
      detail: detail || "Waste collection issue reported.",
      address: address || `${ward || "Mysuru"}, Karnataka`,
      createdAt: t,
      slaHours: cat.sla,
      dueAt: new Date(Date.now() + cat.sla * 3600e3).toISOString(),
      status: "Registered",
      crew: null,
      priority: cat.priority,
      notifyEmail,
      log: [{ at: t, status: "Registered", note: "Complaint received and ward-routed automatically." }]
    };

    this.complaints.unshift(c);
    this.queueMail(c, "Registered", c.log[0].note);
    this.save();
    return c;
  }

  updateStatus(id, status, note, crew) {
    const c = this.complaints.find((x) => x.id === id);
    if (!c) return null;
    c.status = status;
    if (crew !== undefined && crew !== null && crew !== "") c.crew = crew;
    if (status === "Resolved" || status === "Closed") c.resolvedAt = now();
    c.log.push({ at: now(), status, note: note || "" });
    this.queueMail(c, status, note);
    this.save();
    return c;
  }

  queueMail(c, status, note) {
    if (!c.notifyEmail) return null;
    const m = renderMail(c, status, note);
    const mailId = uid("MAIL");
    this.outbox.unshift({
      id: mailId,
      at: now(),
      complaintId: c.id,
      status,
      ...m,
      state: "delivered"
    });
    this.outbox = this.outbox.slice(0, 200);
    return m;
  }

  getStats(list = null) {
    const l = list || this.complaints;
    const open = l.filter((c) => c.status !== "Resolved" && c.status !== "Closed");
    const done = l.filter((c) => c.status === "Resolved" || c.status === "Closed");
    const breached = open.filter((c) => new Date(c.dueAt) < new Date());
    const durations = done
      .filter((c) => c.resolvedAt)
      .map((c) => (new Date(c.resolvedAt) - new Date(c.createdAt)) / 3600e3);
    const onTime = done.filter((c) => c.resolvedAt && new Date(c.resolvedAt) <= new Date(c.dueAt)).length;

    return {
      total: l.length,
      open: open.length,
      resolved: done.length,
      breached: breached.length,
      avgHours: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      slaRate: done.length ? (onTime / done.length) * 100 : 92
    };
  }

  getWardHotspots() {
    const staticData = swmApi.getStaticData();
    const wards = staticData.swmData?.wards || [];
    const countMap = {};

    this.complaints.forEach((c) => {
      const w = c.ward;
      if (!countMap[w]) countMap[w] = { total: 0, open: 0, breached: 0 };
      countMap[w].total += 1;
      const isDone = c.status === "Resolved" || c.status === "Closed";
      if (!isDone) {
        countMap[w].open += 1;
        if (new Date(c.dueAt) < new Date()) countMap[w].breached += 1;
      }
    });

    return wards.map((w) => {
      const stats = countMap[w.name] || countMap[`Ward ${w.ward}`] || { total: 0, open: 0, breached: 0 };
      const waste = Number(w.daily_waste_tons || (w.population * 0.00036).toFixed(1));
      const density = w.area_sqkm > 0 ? (waste / w.area_sqkm).toFixed(1) : "—";
      const load = Math.min(100, Math.round((stats.open / 6) * 100 + (waste / 14) * 30));

      return {
        ward: w.ward,
        name: w.name,
        zone: w.zone || "Zone Central",
        waste,
        density,
        totalComplaints: stats.total,
        openComplaints: stats.open,
        breachedComplaints: stats.breached,
        load
      };
    }).sort((a, b) => b.openComplaints - a.openComplaints || b.waste - a.waste);
  }
}

export const grievanceStore = new GrievanceStore();
