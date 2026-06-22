// backend/src/geminiRisk.js
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  console.error(" GEMINI_API_KEY is missing. Add it to backend/.env");
}

// Create client once (server-side only)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function clampScore(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 50;
  return Math.max(0, Math.min(100, x));
}

function extractText(resp) {
  // SDKs can differ; this covers common response shapes
  if (typeof resp?.text === "string") return resp.text;
  const parts = resp?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p) => p?.text || "").join("");
  return "";
}

function fallbackRisk(signals) {
  const recentFailures = Number(signals?.history?.recentFailures || 0);
  const isNewDevice = !!signals?.context?.isNewDevice;
  const livenessPassed =
    signals?.biometric?.livenessPassed === undefined
      ? true
      : !!signals?.biometric?.livenessPassed;

  // Hard deny cases
  if (!livenessPassed) {
    return {
      riskScore: 95,
      riskLevel: "high",
      action: "deny",
      stepUpMethods: [],
      reasons: ["Liveness check failed (fallback)"],
      source: "fallback",
    };
  }

  if (recentFailures >= 5) {
    return {
      riskScore: 90,
      riskLevel: "high",
      action: "deny",
      stepUpMethods: [],
      reasons: [`Too many recent failures (${recentFailures}) (fallback)`],
      source: "fallback",
    };
  }

  // Step-up cases
  if (isNewDevice || recentFailures >= 2) {
    const score = isNewDevice ? 60 : 55;
    const why = [];
    if (isNewDevice) why.push("New device detected (fallback)");
    if (recentFailures >= 2)
      why.push(`Recent failures (${recentFailures}) (fallback)`);

    return {
      riskScore: score,
      riskLevel: "medium",
      action: "step_up",
      stepUpMethods: ["otp"],
      reasons: why,
      source: "fallback",
    };
  }

  // Allow
  return {
    riskScore: 20,
    riskLevel: "low",
    action: "allow",
    stepUpMethods: [],
    reasons: ["Normal login (fallback)"],
    source: "fallback",
  };
}

/**
 * Main function used by your server.js:
 *  - Try Gemini
 *  - Parse into {riskScore,riskLevel,action,stepUpMethods,reasons,source}
 *  - If Gemini fails (quota/429/etc) => use fallbackRisk(signals)
 */
export async function evaluateRiskWithGemini(signals) {
  try {
    // Keep prompt small to reduce quota usage
    const prompt = `
You are a security risk engine for authentication.
Return ONLY valid JSON (no markdown).
Schema:
{
  "riskScore": number 0-100,
  "riskLevel": "low"|"medium"|"high",
  "action": "allow"|"step_up"|"deny",
  "stepUpMethods": string[],
  "reasons": string[]
}

Input signals:
${JSON.stringify(signals)}
`;

  
    const resp = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = extractText(resp).trim();

    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
     
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("Gemini returned non-JSON output");
      }
    }

    const riskScore = clampScore(parsed?.riskScore);
    const riskLevel =
      riskScore >= 80 ? "high" : riskScore >= 40 ? "medium" : "low";

    
    const action =
      parsed?.action ||
      (riskLevel === "high" ? "deny" : riskLevel === "medium" ? "step_up" : "allow");

    const stepUpMethods =
      Array.isArray(parsed?.stepUpMethods) ? parsed.stepUpMethods : action === "step_up" ? ["otp"] : [];

    const reasons = Array.isArray(parsed?.reasons) ? parsed.reasons : ["Gemini risk evaluation"];

    return {
      riskScore,
      riskLevel: parsed?.riskLevel || riskLevel,
      action,
      stepUpMethods,
      reasons,
      source: "gemini",
    };
  } catch (err) {
    
    const status = err?.status || err?.code;
    const msg = String(err?.message || "");
    const isQuota =
      status === 429 ||
      msg.toLowerCase().includes("quota") ||
      msg.toLowerCase().includes("429");

    const fb = fallbackRisk(signals);

    const reason = isQuota
      ? "Gemini quota exceeded (fallback used)"
      : "Gemini error (fallback used)";

    fb.reasons = [reason, ...(fb.reasons || [])];

    return fb;
  }
}