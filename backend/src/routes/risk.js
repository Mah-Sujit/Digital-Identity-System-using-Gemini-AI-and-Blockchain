import express from "express";
import { evaluateRiskWithGemini } from "../geminiRisk.js";

const router = express.Router();

router.post("/evaluate", async (req, res) => {
  try {
    const authSignals = req.body;
    const result = await evaluateRiskWithGemini(authSignals);
    return res.json(result);
  } catch (e) {
    console.error("Gemini risk error:", e);
    return res.status(500).json({ error: "Gemini risk evaluation failed" });
  }
});

export default router;