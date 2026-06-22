// backend/src/gemini.js
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Pick a default model that is commonly available.
// If your ListModels showed a different name, replace it here.
const MODEL = process.env.GEMINI_MODEL_IDENTITY || "gemini-2.0-flash";

function fallbackIdentityDecision(input) {
  // Very simple fallback logic for dissertation prototype
  // You can improve later
  return {
    decision: "review",
    score: 50,
    reasons: ["Gemini unavailable (fallback used)"],
    source: "fallback",
    inputSummary: {
      document_type: input?.document_type,
      has_document_hash: !!input?.document_hash,
    },
  };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function assessIdentityRisk(input) {
  try {
    if (!ai) return fallbackIdentityDecision(input);

    const prompt = `
You are a KYC risk scoring engine.
Return ONLY JSON with keys: decision (approve|review|reject), score (0-100), reasons (array of strings).

User:
- full_name: ${input.full_name || ""}
- email: ${input.email || ""}
- wallet_address: ${input.wallet_address || ""}
Document:
- document_type: ${input.document_type || ""}
- document_hash: ${input.document_hash || ""}
`;

    //  New SDK style
    const resp = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text =
      resp?.text ||
      resp?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("") ||
      "";

    const parsed = safeJsonParse(text);

    if (!parsed) {
      // If Gemini returns non-JSON, fallback
      return {
        decision: "review",
        score: 50,
        reasons: ["Gemini response not JSON (fallback used)"],
        source: "fallback",
      };
    }

    return {
      decision: parsed.decision || "review",
      score: Number.isFinite(Number(parsed.score)) ? Number(parsed.score) : 50,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ["No reasons returned"],
      source: "gemini",
    };
  } catch (err) {
    console.error("assessIdentityRisk error:", err?.message || err);
    return fallbackIdentityDecision(input);
  }
}