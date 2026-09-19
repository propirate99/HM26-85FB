import crypto from "crypto";
import sharp from "sharp";

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function perceptualHash(buffer) {
  try {
    const { data } = await sharp(buffer).greyscale().resize(8, 8, { fit: "fill" }).raw().toBuffer({
      resolveWithObject: true,
    });
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    return Array.from(data)
      .map((v) => (v >= avg ? "1" : "0"))
      .join("");
  } catch {
    return sha256(buffer).slice(0, 64);
  }
}

export function hamming(a = "", b = "") {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) d += 1;
  return d;
}

export function haversineMeters(lng1, lat1, lng2, lat2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function tokenize(text = "") {
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

export function jaccard(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.size && !B.size) return 0.5;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

export async function nextId(Model, field, prefix) {
  try {
    const q = Model.findOne({ [field]: new RegExp(`^${prefix}-`) }).sort({ createdAt: -1 });
    const last = typeof q.lean === "function" ? await q.lean() : await q;
    const val = last?.[field] ? String(last[field]) : "";
    const parts = val.split("-");
    const parsed = Number(parts[parts.length - 1]);
    const n = Number.isFinite(parsed) ? parsed + 1 : 1001;
    return `${prefix}-${n}`;
  } catch {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
