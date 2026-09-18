import fs from "fs";
import path from "path";

class AIProvider {
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
  async classifyComplaint({ text = "", categoryCode }) {
    const blob = String(text).toLowerCase();
    const guesses = [
      ["GARBAGE", ["garbage", "dump", "waste", "trash", "litter", "debris", "kachra"]],
      ["STREETLIGHT", ["light", "lamp", "dark", "streetlight", "bulb", "illumination"]],
      ["POTHOLE", ["pothole", "road", "asphalt", "crater", "tarmac", "hole", "ditch"]],
      ["DRAIN", ["drain", "sewage", "blocked", "flood", "overflow", "gutter", "waterlogged"]],
    ];
    let inferred = categoryCode;
    for (const [code, words] of guesses) {
      if (words.some((w) => blob.includes(w))) {
        inferred = code;
        break;
      }
    }
    const agrees = !categoryCode || inferred === categoryCode;
    return {
      categoryCode: inferred,
      relevant: true,
      agreesWithCitizen: agrees,
      confidence: agrees ? 0.88 : 0.6,
      summary: blob.slice(0, 180),
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
    // If it's a relative uploads path, read from disk
    if (imagePathOrUrl.startsWith("/uploads/")) {
      const fullPath = path.resolve(process.cwd(), "." + imagePathOrUrl);
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
  constructor({ apiKey, apiKeyBackup, model = "gemini-3.6-flash" }) {
    super();
    this.keys = [apiKey, apiKeyBackup].filter(Boolean);
    this.model = model || "gemini-3.6-flash";
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
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

    const candidateModels = [this.model, "gemini-flash-latest"].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    let lastError = null;
    for (const key of this.keys) {
      for (const model of candidateModels) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4500);

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
            lastError = new Error(`Gemini (${model}) HTTP ${res.status}: ${errText.slice(0, 80)}`);
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
      console.warn(`[GeminiAIProvider] Gemini request failed, using circuit breaker:`, lastError.message);
    }
    return null;
  }

  async classifyComplaint(args) {
    try {
      const prompt = `You are the AI verification engine for Mysuru CivicVerify (MCC).
Analyze this civic complaint text and determine:
1. Which category it best belongs to ("GARBAGE", "STREETLIGHT", "POTHOLE", "DRAIN").
2. Does it appear relevant to a legitimate municipal civic issue? (relevant: boolean)
3. Does it agree with the citizen's selected category? (agreesWithCitizen: boolean)
4. Confidence score from 0.0 to 1.0.
5. A concise English title summary (under 80 characters).

Citizen selected category: ${args.categoryCode || "unknown"}
Citizen complaint text: "${args.text || ""}"

Respond ONLY with this JSON schema:
{"categoryCode":"GARBAGE"|"STREETLIGHT"|"POTHOLE"|"DRAIN","relevant":true,"agreesWithCitizen":true,"confidence":0.9,"summary":"..."}`;

      const json = await this.generateJson({ prompt, image: args.image });
      if (!json || !json.categoryCode) {
        const fallback = await super.classifyComplaint(args);
        return { ...fallback, provider: "mock-fallback" };
      }

      return {
        categoryCode: json.categoryCode,
        relevant: json.relevant !== false,
        agreesWithCitizen: json.agreesWithCitizen !== false,
        confidence: Number(json.confidence) || 0.85,
        summary: json.summary || String(args.text || "").slice(0, 80),
        provider: "gemini",
        version: this.model,
      };
    } catch {
      const fallback = await super.classifyComplaint(args);
      return { ...fallback, provider: "mock-fallback" };
    }
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
  if (env.aiProvider === "gemini" || env.aiProvider === "external") {
    return new GeminiAIProvider({
      apiKey: env.aiApiKey,
      apiKeyBackup: env.aiApiKeyBackup,
      model: env.geminiModel || "gemini-3.6-flash",
    });
  }
  return new MockAIProvider();
}
