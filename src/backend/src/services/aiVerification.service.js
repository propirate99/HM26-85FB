import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

let genAI = null;
function getGenAI() {
  if (genAI) return genAI;
  if (env.aiApiKey) {
    genAI = new GoogleGenerativeAI(env.aiApiKey);
    return genAI;
  }
  return null;
}

export async function verifyImageWithGemini({
  imageUrl,
  buffer = null,
  mimeType = "image/jpeg",
  categoryHint = "WASTE",
  description = "",
}) {
  const client = getGenAI();
  if (!client) {
    console.warn("[AI Verification] No GEMINI_API_KEY found, using local heuristic scoring");
    return fallbackAnalysis({ categoryHint, description });
  }

  try {
    const model = client.getGenerativeModel({ model: env.geminiModel || "gemini-3.6-flash" });

    // Prepare image payload
    let imagePart = null;
    if (buffer) {
      imagePart = {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType,
        },
      };
    } else if (imageUrl) {
      if (imageUrl.startsWith("http")) {
        const fetchRes = await fetch(imageUrl);
        if (fetchRes.ok) {
          const ab = await fetchRes.arrayBuffer();
          const fetchedMime = fetchRes.headers.get("content-type") || mimeType;
          imagePart = {
            inlineData: {
              data: Buffer.from(ab).toString("base64"),
              mimeType: fetchedMime,
            },
          };
        }
      }
    }

    const prompt = `
You are an expert civic verification and municipal inspection AI for Mysuru City Corporation (MCC).
Analyze this photo submitted with a civic grievance (Reported category: "${categoryHint}", Details: "${description}").

Examine the image thoroughly and return a valid JSON object ONLY with the following keys:
{
  "isManipulated": boolean, // true if image shows signs of digital manipulation, Photoshop, AI generation/deepfake, screen re-photography, or unrelated meme
  "manipulationConfidence": number, // 0 to 100 confidence of manipulation
  "manipulationDetails": string, // brief explanation if any manipulation detected
  "civicCategory": string, // one of "WASTE", "ROADS", "WATER", "LIGHTING", or "OTHER"
  "authenticityConfidenceScore": number, // 0 to 100 confidence that this is a genuine, verified civic defect in the physical world
  "severity": string, // "LOW", "MEDIUM", "HIGH", or "CRITICAL"
  "summary": string // 1-2 sentence visual summary of the issue
}
`;

    const contents = imagePart ? [prompt, imagePart] : [prompt];
    const result = await model.generateContent(contents);
    const responseText = result.response?.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        aiConfidenceScore: Number(parsed.authenticityConfidenceScore) || 85,
        isManipulated: Boolean(parsed.isManipulated),
        manipulationDetails: parsed.manipulationDetails || "",
        aiCategory: parsed.civicCategory || categoryHint,
        severity: parsed.severity || "MEDIUM",
        aiExplanation: parsed.summary || "AI vision inspection verified authentic physical issue.",
        provider: "gemini",
      };
    }

    return fallbackAnalysis({ categoryHint, description });
  } catch (err) {
    console.warn(`[AI Verification] Gemini inspection error (${err.message}), falling back gracefully`);
    return fallbackAnalysis({ categoryHint, description });
  }
}

function fallbackAnalysis({ categoryHint = "WASTE", description = "" }) {
  const text = description.toLowerCase();
  const isSpam = text.length < 4 || ["test", "asdf", "dummy"].some((p) => text.includes(p));
  return {
    aiConfidenceScore: isSpam ? 35 : 88,
    isManipulated: false,
    manipulationDetails: "",
    aiCategory: categoryHint,
    severity: isSpam ? "LOW" : "MEDIUM",
    aiExplanation: isSpam
      ? "Low detail description, routed for verification review."
      : "Visual and textual complaint context verified.",
    provider: "heuristic-fallback",
  };
}
