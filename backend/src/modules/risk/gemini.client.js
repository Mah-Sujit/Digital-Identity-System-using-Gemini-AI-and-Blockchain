import { env } from "../../config/env.js";

/**
 * GEMINI INTEGRATION NOTE:
 * When you’re ready, you can call Gemini API here using fetch().
 * For now, this returns null if no API key is set.
 */
export async function geminiRiskAssessment({ ip, userAgent, email }) {
  if (!env.geminiApiKey) return null;

  // Placeholder - you’ll replace with real Gemini call later.
  // Return format should be:
  // { score: 0..100, reasons: ["..."], model: env.geminiModel }
  return null;
}
