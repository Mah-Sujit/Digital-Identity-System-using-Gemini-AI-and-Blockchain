import { geminiRiskAssessment } from "./gemini.client.js";

export async function scoreRisk({ ip, userAgent, email }) {
  // Try Gemini first (if configured)
  const gemini = await geminiRiskAssessment({ ip, userAgent, email });
  if (gemini) return gemini;

  // MVP heuristic scoring
  let score = 10;
  const reasons = [];

  if (!ip) { score += 10; reasons.push("Missing IP"); }
  if (!userAgent) { score += 10; reasons.push("Missing User-Agent"); }

  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("bot") || ua.includes("crawler")) { score += 50; reasons.push("Bot-like user agent"); }
  if (ua.includes("curl") || ua.includes("postman")) { score += 20; reasons.push("Automation tool detected"); }

  if (score >= 70) reasons.push("High risk threshold exceeded");

  score = Math.max(0, Math.min(100, score));
  return { score, reasons, model: "heuristic-v1" };
}
