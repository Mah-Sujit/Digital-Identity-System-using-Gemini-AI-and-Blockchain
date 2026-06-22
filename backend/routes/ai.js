import express from "express";
import { askGemini } from "../src/gemini.js";

const router = express.Router();

router.post("/gemini", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const result = await askGemini(prompt);

    res.json({ response: result });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gemini API failed" });
  }
});

export default router;