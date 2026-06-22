// backend/src/db/otpRepo.js
import pool from "../../db.js";

export async function createOtp({ userId, purpose = "login", codeHash, expiresAt }) {
  const q = `
    INSERT INTO otps (user_id, purpose, code_hash, expires_at)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, purpose, expires_at, used, created_at
  `;
  const { rows } = await pool.query(q, [userId, purpose, codeHash, expiresAt]);
  return rows[0];
}

export async function getLatestValidOtp({ userId, purpose = "login" }) {
  const q = `
    SELECT *
    FROM otps
    WHERE user_id = $1
      AND purpose = $2
      AND used = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await pool.query(q, [userId, purpose]);
  return rows[0] || null;
}

export async function markOtpUsed(id) {
  const q = `
    UPDATE otps
    SET used = TRUE
    WHERE id = $1
    RETURNING id, used
  `;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
}