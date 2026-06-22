import { pool } from "../../config/database.js";

export async function writeAudit({ userId, action, riskScore, ip, userAgent }) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, risk_score, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, riskScore, ip || null, userAgent || null]
  );
}

export async function getMyAuditLogs(userId) {
  const result = await pool.query(
    `SELECT id, action, risk_score, ip, user_agent, created_at
     FROM audit_logs
     WHERE user_id=$1
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId]
  );
  return result.rows;
}
