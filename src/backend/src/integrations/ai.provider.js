import fs from "fs";
import path from "path";

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
  async triageComplaint({ text = "", categoryCode = "", image: _image = null, duplicateResult = null }) {
    const start = Date.now();
    const blob = String(text || "").trim().toLowerCase();

    // 1. Fake & Gibberish Screening
    const spamPatterns = ["asdf", "qwerty", "12345", "test test", "blah", "lorem ipsum"];
    const isVeryShort = blob.length < 5;
    const isSpammy = spamPatterns.some((p) => blob.includes(p));
    const isGibberish = !blob || isVeryShort || isSpammy;

    let isFake = false;
    let fakeReason = "";
    if (isGibberish) {
      isFake = true;
      fakeReason = "GIBBERISH_OR_SPAM";
    }

    // 2. AI Categorization Rules & Keywords
    const taxonomy = [
      {
        code: "GARBAGE",
        words: ["garbage", "dump", "waste", "trash", "litter", "debris", "kachra", "bin", "plastic", "black spot", "cleaning", "foul", "solid waste", "stench"],
        tags: ["solid_waste", "overflowing_bin", "black_spot_dump"],
      },
      {
        code: "POTHOLE",
        words: ["pothole", "road", "asphalt", "crater", "tarmac", "hole", "ditch", "bitumen", "patch", "bump", "speedbreaker", "road repair"],
        tags: ["road_hazard", "crater_pothole", "damaged_asphalt"],
      },
      {
        code: "STREETLIGHT",
        words: ["light", "lamp", "dark", "streetlight", "bulb", "illumination", "pole", "wire", "fixture", "non-functional", "dark corridor"],
        tags: ["electrical_fixture", "dark_stretch", "safety_lighting"],
      },
      {
        code: "DRAIN",
        words: ["drain", "sewage", "blocked", "flood", "overflow", "gutter", "waterlogged", "drainage", "clogged", "manhole", "culvert"],
        tags: ["blocked_drainage", "sewage_overflow", "stormwater_culvert"],
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
    const confidence = isFake ? 0.95 : matchFound ? 0.89 : 0.72;

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

    const summary = isFake
      ? "AI flagged complaint as non-civic or spam entry."
      : `${suggestedCategory.charAt(0) + suggestedCategory.slice(1).toLowerCase()} issue identified with ${Math.round(confidence * 100)}% confidence.`;

    return {
      analyzed: true,
      provider: "mock",
      model: "heuristic-triage-v1",
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
      reasoning: `Heuristic rule match based on municipal taxonomy keywords (${suggestedCategory}).`,
      analyzedAt: new Date(),
      durationMs: Date.now() - start,
    };
  }

  async classifyComplaint({ text = "", categoryCode }) {
    const triage = await this.triageComplaint({ text, categoryCode });
    return {
      categoryCode: triage.suggestedCategory,
      relevant: !triage.isFake,
      agreesWithCitizen: triage.categoryAgrees,
      confidence: triage.confidence,
      summary: String(text).slice(0, 180),
      provider: "mock",
      version: "mock-1",
    };
  }

  async assessImageRelevance({ category }) {
    return {
      status: "LIKELY_RELEVANT",
      confidence: 0.85,
      category: category?.code,
      provider: "mock",
      version: "mock-1",
    };
  }

  async assessSyntheticRisk() {
    return { status: "LOW_RISK", confidence: 0.75, provider: "mock", version: "mock-1" };
  }

  async compareResolution() {
    return {
      changed: true,
      confidence: 0.82,
      note: "Civic resolution verified: area restored to clean/working order.",
      provider: "mock",
      version: "mock-1",
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

    // 3. Local filesystem path
    if (typeof imagePathOrUrl === "string" && (imagePathOrUrl.startsWith("/uploads/") || imagePathOrUrl.startsWith("./uploads/"))) {
      const relPath = imagePathOrUrl.startsWith(".") ? imagePathOrUrl : "." + imagePathOrUrl;
      const fullPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase().replace(".", "");
        const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        return { mimeType: mime, data: buf.toString("base64") };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export class GeminiAIProvider extends MockAIProvider {
  constructor({ apiKey, apiKeyBackup, model = "gemini-2.5-flash" }) {
    super();
    this.keys = [apiKey, apiKeyBackup].filter(Boolean);
    this.model = model || "gemini-2.5-flash";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
  }

  async testConnection() {
    if (!this.keys.length) {
      return { ok: false, error: "No API key configured" };
    }
    try {
      const res = await this.generateJson({
        prompt: "Respond with JSON: {\"status\": \"ok\", \"message\": \"Mysuru Swachha Grid AI connected\"}",
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

    const candidateModels = [this.model, "gemini-2.5-flash", "gemini-1.5-flash"].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    let lastError = null;
    for (const key of this.keys) {
      for (const model of candidateModels) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);

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
      const prompt = `You are the Lead Municipal Complaint AI Triage Inspector for Mysuru City Corporation (MCC) Swachha Grid.
Analyze this incoming civic complaint (description text and optional attached field evidence photo).

Citizen Selected Category: "${args.categoryCode || "unknown"}"
Citizen Complaint Description: "${args.text || ""}"

Perform automated complaint triage and return ONLY a valid JSON object matching this schema:
{
  "isFake": false,
  "fakeReason": "",
  "suggestedCategory": "GARBAGE",
  "categoryAgrees": true,
  "confidence": 0.94,
  "extractedTags": ["solid_waste", "overflowing_bin"],
  "severity": "MEDIUM",
  "summary": "Overflowing waste bin requiring immediate clearance",
  "reasoning": "Clear municipal waste visible requiring Zonal Sanitary Inspector intervention."
}

Rules:
1. "isFake": set to true if the evidence or text is a selfie, animal, meme, indoor furniture, test gibberish, spam, or completely unrelated to city infrastructure.
2. "fakeReason": if fake, choose from: "NOT_CIVIC_RELATED", "SYNTHETIC_GENERATED", "INDOOR_OR_IRRELEVANT", "GIBBERISH_OR_SPAM", "STOCK_OR_DUPLICATE". If legitimate, use "".
3. "suggestedCategory": must be one of "GARBAGE", "POTHOLE", "STREETLIGHT", "DRAIN".
4. "severity": must be one of "LOW", "MEDIUM", "HIGH", "CRITICAL".`;

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
          confidence: Number(json.confidence) || 0.88,
          extractedTags: Array.isArray(json.extractedTags) ? json.extractedTags : [],
          severity: json.severity || "MEDIUM",
          duplicateScore,
          duplicateDecision,
          duplicateCandidateId,
          duplicateCandidatePublicId,
          summary: json.summary || String(args.text || "").slice(0, 80),
          reasoning: json.reasoning || "Analyzed by Google Gemini Vision multimodal engine.",
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

  async classifyComplaint(args) {
    const triage = await this.triageComplaint(args);
    return {
      categoryCode: triage.suggestedCategory,
      relevant: !triage.isFake,
      agreesWithCitizen: triage.categoryAgrees,
      confidence: triage.confidence,
      summary: triage.summary,
      provider: triage.provider,
      version: this.model,
    };
  }

  async assessImageRelevance(args) {
    try {
      const prompt = `You are the civic evidence verifier for Mysuru City Corporation.
Assess whether the attached evidence photo is likely relevant to the civic category "${args.category?.code || "unknown"}".
Do not claim the image is authentic or human-captured.
Respond ONLY with this JSON schema:
{"status":"LIKELY_RELEVANT"|"UNLIKELY","confidence":0.85,"reason":"short explanation"}`;

      const json = await this.generateJson({ prompt, image: args.image });
      if (json?.status) {
        return {
          status: json.status,
          confidence: Number(json.confidence) || 0.8,
          provider: "gemini",
          version: this.model,
        };
      }
      return super.assessImageRelevance(args);
    } catch {
      return super.assessImageRelevance(args);
    }
  }

  async assessSyntheticRisk(args) {
    try {
      const prompt = `Give a probabilistic assessment of synthetic/manipulated risk for this civic photo.
Never use absolute labels like "fake" or "real".
Respond ONLY with this JSON schema:
{"status":"LOW_RISK"|"MEDIUM_RISK"|"HIGH_RISK","confidence":0.75}`;

      const json = await this.generateJson({ prompt, image: args.image });
      if (json?.status) {
        return {
          status: json.status,
          confidence: Number(json.confidence) || 0.7,
          provider: "gemini",
          version: this.model,
        };
      }
      return super.assessSyntheticRisk(args);
    } catch {
      return super.assessSyntheticRisk(args);
    }
  }

  async compareResolution(args) {
    try {
      const prompt = `Compare the BEFORE complaint evidence with the AFTER resolution evidence for Mysuru City Corporation.
Determine if the civic issue (e.g. pothole filled, garbage cleared, light replaced, drain unblocked) has been resolved.
Respond ONLY with this JSON schema:
{"changed":true,"confidence":0.85,"note":"Specific verification remark"}`;

      const json = await this.generateJson({ prompt, image: args.afterImage });
      if (json && typeof json.changed === "boolean") {
        return {
          changed: json.changed,
          confidence: Number(json.confidence) || 0.8,
          note: json.note || "Resolution verified by Gemini comparison",
          provider: "gemini",
          version: this.model,
        };
      }
      return super.compareResolution(args);
    } catch {
      return super.compareResolution(args);
    }
  }

  async translateText({ text, targetLanguage = "en" }) {
    try {
      const prompt = `Translate this Mysuru civic text to ${targetLanguage === "kn" ? "Kannada" : "English"}.
Text: "${text}"
Respond ONLY with this JSON schema:
{"text":"translated text"}`;

      const json = await this.generateJson({ prompt });
      return { text: json?.text || text, provider: "gemini" };
    } catch {
      return { text, provider: "mock" };
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
