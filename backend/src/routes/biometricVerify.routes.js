// backend/src/routes/biometricVerify.routes.js
import express from "express";
import pool from "../../db.js";
import { imageToEmbedding } from "../services/vertexEmbeddings.js";

const router = express.Router();

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return null;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// GET /biometric/ping
router.get("/ping", (req, res) => res.json({ ok: true, msg: "biometric routes mounted" }));

// POST /biometric/verify (public)
router.post("/verify", async (req, res) => {
  try {
    const { email, image_base64 } = req.body;

    if (!email || !image_base64 || !image_base64.includes("base64,")) {
      return res.status(400).json({ ok: false, error: "email + image_base64 required" });
    }

    const uRes = await pool.query(`SELECT id, role FROM users WHERE email=$1`, [email]);
    if (uRes.rowCount === 0) return res.status(401).json({ ok: false, error: "Invalid user" });

    const userId = uRes.rows[0].id;

    const bRes = await pool.query(`SELECT face_embedding FROM user_biometrics WHERE user_id=$1`, [userId]);
    if (bRes.rowCount === 0) {
      return res.status(400).json({ ok: false, error: "No biometric enrolled for this user" });
    }

    const stored = bRes.rows[0].face_embedding.map(Number); // float8[] comes back as JS array (usually)
    const b64 = image_base64.split("base64,")[1];
    const live = await imageToEmbedding(b64);

    const similarity = cosineSimilarity(stored, live);

    // simple rule-based decision (replace with Gemini later if you want)
    let action = "allow";
    if (similarity == null) action = "step_up";
    else if (similarity < 0.75) action = "deny";
    else if (similarity < 0.85) action = "step_up";

    return res.json({
      ok: true,
      similarity,
      risk: {
        riskScore: action === "allow" ? 20 : action === "step_up" ? 60 : 95,
        riskLevel: action === "allow" ? "low" : action === "step_up" ? "medium" : "high",
        action,
        reasons: ["Rule-based biometric check (temporary)"],
        source: "rule",
      },
    });
  } catch (e) {
    console.error("biometric verify error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;