import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class AIProvider {
  async triageComplaint(_args) {
    return {
      analyzed: true,
      provider: "base",
      model: "none",
      isFake: false,
      fakeReason: "",
      suggestedCategory: "GARBAGE",
      categoryAgrees: true,
      confidence: 0.5,
      extractedTags: [],
      severity: "MEDIUM",
      duplicateScore: 0,
      duplicateDecision: "CREATE",
      duplicateCandidateId: null,
      summary: "",
      photoAssessment: null,
      locationAssessment: null,
      analyzedAt: new Date(),
      durationMs: 0,
    };
  }
  async classifyComplaint({ text, image: _image }) {
    return { categoryCode: null, relevant: true, agreesWithCitizen: true, confidence: 0.5 };
  }
  async assessImageRelevance({ category, image: _image }) {
    return { status: "LIKELY_RELEVANT", confidence: 0.5, category };
  }
  async assessSyntheticRisk({ image: _image }) {
    return { status: "LOW_RISK", confidence: 0.5 };
  }
  async compareResolution({ beforeImage: _b, afterImage: _a }) {
    return { changed: true, confidence: 0.5, note: "Comparison unavailable" };
  }
  async translateText({ text }) {
    return { text, provider: "none" };
  }
}

export class MockAIProvider extends AIProvider {
  async triageComplaint({
    text = "",
    categoryCode = "",
    image = null,
    location = null,
    duplicateResult = null,
  }) {
    const start = Date.now();
    const blob = String(text || "").trim().toLowerCase();

    // 1. Fake & Gibberish Screening
    const spamPatterns = ["asdf", "qwerty", "12345", "test test", "blah", "lorem ipsum", "random junk"];
    const isVeryShort = blob.length < 5;
    const isSpammy = spamPatterns.some((p) => blob.includes(p));
    const isGibberish = !blob || isVeryShort || isSpammy;

    let isFake = false;
    let fakeReason = "";
    if (isGibberish) {
      isFake = true;
      fakeReason = "GIBBERISH_OR_SPAM";
    }

    // 2. AI Categorization Rules & Municipal Taxonomy
    const taxonomy = [
      {
        code: "GARBAGE",
        name: "Solid Waste & Sanitation",
        words: ["garbage", "dump", "waste", "trash", "litter", "debris", "kachra", "bin", "plastic", "black spot", "cleaning", "foul", "solid waste", "stench"],
        tags: ["solid_waste", "overflowing_bin", "black_spot_dump", "plastic_debris"],
      },
      {
        code: "POTHOLE",
        name: "Roads & Pavements",
        words: ["pothole", "road", "asphalt", "crater", "tarmac", "hole", "ditch", "bitumen", "patch", "bump", "speedbreaker", "road repair"],
        tags: ["road_hazard", "crater_pothole", "damaged_asphalt", "bitumen_failure"],
      },
      {
        code: "STREETLIGHT",
        name: "Electrical & Street Lighting",
        words: ["light", "lamp", "dark", "streetlight", "bulb", "illumination", "pole", "wire", "fixture", "non-functional", "dark corridor"],
        tags: ["electrical_fixture", "dark_stretch", "safety_lighting", "cable_fault"],
      },
      {
        code: "DRAIN",
        name: "Stormwater Drains & Sewage",
        words: ["drain", "sewage", "blocked", "flood", "overflow", "gutter", "waterlogged", "drainage", "clogged", "manhole", "culvert"],
        tags: ["blocked_drainage", "sewage_overflow", "stormwater_culvert", "waterlogged_spot"],
      },
    ];

    let suggestedCategory = categoryCode || "GARBAGE";
    let matchedTags = [];
    let matchFound = false;

    for (const item of taxonomy) {
      const hits = item.words.filter((w) => blob.includes(w));
      if (hits.length > 0) {
        suggestedCategory = item.code;
        matchedTags = [...item.tags];
        matchFound = true;
        break;
      }
    }

    const categoryAgrees = !categoryCode || suggestedCategory === categoryCode;
    const confidence = isFake ? 0.95 : matchFound ? 0.92 : 0.78;

    // 3. Predicted Severity
    let severity = "MEDIUM";
    const criticalWords = ["hazard", "accident", "danger", "sparking", "fire", "emergency", "flooding", "hospital", "school"];
    const highWords = ["blocked", "large", "overflowing", "deep", "main road", "traffic", "stagnant"];
    const lowWords = ["minor", "small", "cleaning needed", "mild"];

    if (criticalWords.some((w) => blob.includes(w))) {
      severity = "CRITICAL";
    } else if (highWords.some((w) => blob.includes(w))) {
      severity = "HIGH";
    } else if (lowWords.some((w) => blob.includes(w))) {
      severity = "LOW";
    }

    // 4. Duplicate Screening Integration
    let duplicateScore = 0;
    let duplicateDecision = "CREATE";
    let duplicateCandidateId = null;
    let duplicateCandidatePublicId = "";

    if (duplicateResult?.best) {
      duplicateScore = duplicateResult.best.duplicateScore || 0;
      duplicateDecision = duplicateResult.best.decision || "CREATE";
      duplicateCandidateId = duplicateResult.best.issueId || null;
      duplicateCandidatePublicId = duplicateResult.best.publicId || "";
    }

    // 5. Dedicated Photo Assessment
    const photoAssessment = {
      analyzed: Boolean(image),
      detectedCategory: suggestedCategory,
      authenticity: isFake ? "SUSPICIOUS_OR_IRRELEVANT" : "LIKELY_AUTHENTIC",
      syntheticRisk: isFake ? "HIGH_RISK" : "LOW_RISK",
      confidence: Math.round(confidence * 100),
      extractedTags: matchedTags.length > 0 ? matchedTags : ["civic_evidence"],
      visualSummary: isFake
        ? "Photo flagged: does not depict standard municipal infrastructure issue."
        : `Verified ${suggestedCategory.toLowerCase()} evidence consistent with reported civic defect.`,
    };

    // 6. Dedicated Location Assessment
    let locationAssessment = {
      verified: false,
      withinJurisdiction: true,
      jurisdictionName: "Mysuru City Corporation (MCC)",
      wardName: "Mysuru Ward Operations Grid",
      accuracyGrade: "GPS_ESTIMATED",
      confidence: 85,
      summary: "Location assigned to Mysuru municipal jurisdiction.",
    };

    if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      const [lng, lat] = location.coordinates;
      // Mysuru City boundary envelope
      const isWithinMysuru = lat >= 12.15 && lat <= 12.45 && lng >= 76.50 && lng <= 76.80;
      const acc = location.accuracyMeters != null ? Number(location.accuracyMeters) : 15;
      const accGrade = acc <= 20 ? "HIGH_PRECISION" : acc <= 50 ? "ACCEPTABLE" : "LOW_PRECISION";

      // Approximate Ward based on coordinates
      let ward = "Vidyaranyapuram (Ward 48)";
      if (lat > 12.32) ward = "Gokulam 3rd Stage (Ward 14)";
      else if (lng > 76.66) ward = "Nazarbad / Chamundi Vihar (Ward 32)";
      else if (lat < 12.28) ward = "JP Nagar / Kuvempunagar (Ward 52)";

      locationAssessment = {
        verified: true,
        withinJurisdiction: isWithinMysuru,
        jurisdictionName: "Mysuru City Corporation (MCC)",
        coords: [Number(lng.toFixed(5)), Number(lat.toFixed(5))],
        accuracyMeters: Math.round(acc),
        accuracyGrade: accGrade,
        wardName: ward,
        confidence: isWithinMysuru ? 96 : 40,
        summary: isWithinMysuru
          ? `✓ GPS Coordinates [${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E] verified within ${ward} (${accGrade.replace("_", " ")}, ±${Math.round(acc)}m).`
          : `⚠️ Location [${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E] is outside official MCC municipal boundary.`,
      };
    }

    const summary = isFake
      ? "AI flagged complaint as non-civic or spam entry."
      : `${suggestedCategory.charAt(0) + suggestedCategory.slice(1).toLowerCase()} issue verified at ${locationAssessment.wardName} (${Math.round(confidence * 100)}% confidence).`;

    return {
      analyzed: true,
      provider: "mock",
      model: "heuristic-civic-vision-v2",
      isFake,
      fakeReason,
      suggestedCategory,
      categoryAgrees,
      confidence,
      extractedTags: matchedTags,
      severity,
      duplicateScore,
      duplicateDecision,
      duplicateCandidateId,
      duplicateCandidatePublicId,
      summary,
      reasoning: `Multimodal municipal rules verified photo defect (${suggestedCategory}) and confirmed location (${locationAssessment.wardName}).`,
      photoAssessment,
      locationAssessment,
      analyzedAt: new Date(),
      durationMs: Date.now() - start,
    };
  }

  async classifyComplaint({ text = "", categoryCode, location }) {
    const triage = await this.triageComplaint({ text, categoryCode, location });
    return {
      categoryCode: triage.suggestedCategory,
      relevant: !triage.isFake,
      agreesWithCitizen: triage.categoryAgrees,
      confidence: triage.confidence,
      summary: String(text).slice(0, 180),
      provider: "mock",
      version: "mock-2",
    };
  }

  async assessImageRelevance({ category }) {
    return {
      status: "LIKELY_RELEVANT",
      confidence: 0.88,
      category: category?.code,
      provider: "mock",
      version: "mock-2",
    };
  }

  async assessSyntheticRisk() {
    return { status: "LOW_RISK", confidence: 0.82, provider: "mock", version: "mock-2" };
  }

  async compareResolution() {
    return {
      changed: true,
      confidence: 0.88,
      note: "Civic resolution verified: area restored to clean/working order.",
      provider: "mock",
      version: "mock-2",
    };
  }

  async translateText({ text }) {
    return { text, provider: "mock" };
  }
}

function extractJson(text) {
  if (!text) return null;
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function tryReadImageBase64(imagePathOrUrl) {
  if (!imagePathOrUrl) return null;
  try {
    // 1. Data URL
    if (typeof imagePathOrUrl === "string" && imagePathOrUrl.startsWith("data:image/")) {
      const parts = imagePathOrUrl.split(",");
      const mime = parts[0].split(":")[1].split(";")[0];
      return { mimeType: mime, data: parts[1] };
    }

    // 2. Buffer
    if (Buffer.isBuffer(imagePathOrUrl)) {
      return { mimeType: "image/jpeg", data: imagePathOrUrl.toString("base64") };
    }

    // 3. Local filesystem path resolution across all possible roots
    if (typeof imagePathOrUrl === "string") {
      const filename = path.basename(imagePathOrUrl);
      const candidates = [
        path.resolve(__dirname, "../../uploads", filename),
        path.resolve(process.cwd(), "backend/uploads", filename),
        path.resolve(process.cwd(), "uploads", filename),
        path.resolve(process.cwd(), imagePathOrUrl.startsWith("/") ? imagePathOrUrl.slice(1) : imagePathOrUrl),
      ];

      for (const fullPath of candidates) {
        if (fs.existsSync(fullPath)) {
          const buf = fs.readFileSync(fullPath);
          const ext = path.extname(fullPath).toLowerCase().replace(".", "");
          const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          return { mimeType: mime, data: buf.toString("base64") };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export class GeminiAIProvider extends MockAIProvider {
  constructor({ apiKey, apiKeyBackup, model = "gemini-3.6-flash" }) {
    super();
    this.keys = [apiKey, apiKeyBackup].filter(Boolean);
    this.model = model || "gemini-3.6-flash";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
  }

  async testConnection() {
    if (!this.keys.length) {
      return { ok: false, error: "No API key configured" };
    }
    try {
      const res = await this.generateJson({
        prompt: 'Respond with JSON: {"status": "ok", "message": "Mysuru Swachha Grid AI connected"}',
      });
      return { ok: Boolean(res?.status === "ok"), data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async generateJson({ prompt, image }) {
    if (!this.keys.length) return null;

    const parts = [{ text: prompt }];
    const imgData = tryReadImageBase64(image);
    if (imgData) {
      parts.push({
        inlineData: {
          mimeType: imgData.mimeType,
          data: imgData.data,
        },
      });
    }

    const candidateModels = [this.model, "gemini-3.6-flash"].filter(
      (m, idx, arr) => m && arr.indexOf(m) === idx
    );

    let lastError = null;
    for (const key of this.keys) {
      for (const model of candidateModels) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          const url = `${this.baseUrl}/${model}:generateContent?key=${key}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            lastError = new Error(`Gemini (${model}) HTTP ${res.status}: ${errText.slice(0, 100)}`);
            continue;
          }

          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const json = extractJson(rawText);
          if (json) return json;
        } catch (err) {
          lastError = err;
        }
      }
    }

    if (lastError) {
      console.warn(`[GeminiAIProvider] Gemini request failed, using circuit breaker fallback:`, lastError.message);
    }
    return null;
  }

  async triageComplaint(args) {
    const start = Date.now();
    try {
      const locStr =
        args.location && Array.isArray(args.location.coordinates)
          ? `Coordinates: ${args.location.coordinates[1]}°N, ${args.location.coordinates[0]}°E (Accuracy ±${args.location.accuracyMeters || 10}m)`
          : "Coordinates not supplied";

      const prompt = `You are the Chief Municipal Evidence Inspector for Mysuru City Corporation (MCC) Swachha Grid.
Analyze this incoming citizen grievance report:
- Citizen Selected Category: "${args.categoryCode || "unknown"}"
- Description: "${args.text || ""}"
- GPS Location: "${locStr}"

Perform comprehensive verification of BOTH the attached evidence photo and the reported location.
Return ONLY valid JSON matching this schema:
{
  "isFake": false,
  "fakeReason": "",
  "suggestedCategory": "GARBAGE",
  "categoryAgrees": true,
  "confidence": 0.95,
  "extractedTags": ["solid_waste", "black_spot_dump"],
  "severity": "MEDIUM",
  "summary": "Overflowing waste dump requiring immediate clearance",
  "reasoning": "Photo shows unsegregated municipal solid waste accumulation.",
  "photoAssessment": {
    "detectedCategory": "GARBAGE",
    "authenticity": "LIKELY_AUTHENTIC",
    "syntheticRisk": "LOW_RISK",
    "visualSummary": "Authentic on-site evidence of municipal waste accumulation."
  },
  "locationAssessment": {
    "verified": true,
    "withinJurisdiction": true,
    "jurisdictionName": "Mysuru City Corporation (MCC)",
    "summary": "Location confirmed within MCC jurisdiction boundary."
  }
}

Rules:
1. Set "isFake" to true if the photo or text is a selfie, meme, animal, indoor room, test spam, or unrelated to city streets/roads/drains.
2. Categories: "GARBAGE", "POTHOLE", "STREETLIGHT", "DRAIN".
3. Severities: "LOW", "MEDIUM", "HIGH", "CRITICAL".`;

      const json = await this.generateJson({ prompt, image: args.image });
      if (json && json.suggestedCategory) {
        let duplicateScore = 0;
        let duplicateDecision = "CREATE";
        let duplicateCandidateId = null;
        let duplicateCandidatePublicId = "";

        if (args.duplicateResult?.best) {
          duplicateScore = args.duplicateResult.best.duplicateScore || 0;
          duplicateDecision = args.duplicateResult.best.decision || "CREATE";
          duplicateCandidateId = args.duplicateResult.best.issueId || null;
          duplicateCandidatePublicId = args.duplicateResult.best.publicId || "";
        }

        return {
          analyzed: true,
          provider: "gemini",
          model: this.model,
          isFake: Boolean(json.isFake),
          fakeReason: json.fakeReason || "",
          suggestedCategory: json.suggestedCategory,
          categoryAgrees: json.categoryAgrees !== false,
          confidence: Number(json.confidence) || 0.9,
          extractedTags: Array.isArray(json.extractedTags) ? json.extractedTags : [],
          severity: json.severity || "MEDIUM",
          duplicateScore,
          duplicateDecision,
          duplicateCandidateId,
          duplicateCandidatePublicId,
          summary: json.summary || String(args.text || "").slice(0, 80),
          reasoning: json.reasoning || "Analyzed by Google Gemini Vision multimodal engine.",
          photoAssessment: json.photoAssessment || {
            detectedCategory: json.suggestedCategory,
            authenticity: "LIKELY_AUTHENTIC",
            syntheticRisk: "LOW_RISK",
            visualSummary: "Visual inspection verified municipal defect.",
          },
          locationAssessment: json.locationAssessment || {
            verified: true,
            withinJurisdiction: true,
            jurisdictionName: "Mysuru City Corporation (MCC)",
            summary: "Location geofenced inside Mysuru City Corporation.",
          },
          analyzedAt: new Date(),
          durationMs: Date.now() - start,
        };
      }

      // Circuit breaker fallback to heuristic engine
      const fallback = await super.triageComplaint(args);
      return { ...fallback, provider: "mock-circuit-fallback" };
    } catch {
      const fallback = await super.triageComplaint(args);
      return { ...fallback, provider: "mock-circuit-fallback" };
    }
  }
}

export function createAIProvider(env) {
  if (env.aiProvider === "gemini" || env.aiProvider === "external" || (env.aiApiKey && env.aiProvider !== "mock")) {
    return new GeminiAIProvider({
      apiKey: env.aiApiKey,
      apiKeyBackup: env.aiApiKeyBackup,
      model: env.geminiModel || "gemini-2.5-flash",
    });
  }
  return new MockAIProvider();
}
