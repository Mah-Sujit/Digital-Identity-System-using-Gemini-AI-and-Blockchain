// backend/src/routes/biometric.routes.js
import express from "express";
import pool from "../../db.js";
import crypto from "crypto";
import { imageToEmbedding } from "../services/vertexEmbeddings.js";

const router = express.Router();

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// POST /biometric/enroll  (protected by auth middleware in server.js)
router.post("/enroll", async (req, res) => {
    console.log("ENROLL HIT req.user:", req.user);


  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: "Auth required (req.user missing). Check Authorization Bearer token and route mounting.",
      });
    }

    const { image_base64 } = req.body;
    if (!image_base64 || !image_base64.includes("base64,")) {
      return res.status(400).json({ ok: false, error: "image_base64 required" });
    }

    const b64 = image_base64.split("base64,")[1];
    const embedding = await imageToEmbedding(b64);

    const templateHash = sha256Hex(JSON.stringify(embedding) + `|user:${userId}:v1`);

    await pool.query(
      `
      INSERT INTO user_biometrics (user_id, face_embedding, template_hash)
      VALUES ($1, $2::float8[], $3)
      ON CONFLICT (user_id)
      DO UPDATE SET face_embedding=EXCLUDED.face_embedding,
                    template_hash=EXCLUDED.template_hash,
                    enrolled_at=now()
      `,
      [userId, embedding, templateHash]
    );

    return res.json({ ok: true, template_hash: templateHash });
  } catch (e) {
    console.error("biometric enroll error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


export default router;