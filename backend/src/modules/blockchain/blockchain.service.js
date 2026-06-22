import { pool } from "../../config/database.js";
import { anchorOnChain } from "./ethereum.client.js";

export async function anchorEvent({ userId, did, eventType, eventHash }) {
  // 1) anchor on chain first
  const onChain = await anchorOnChain({
    did,
    eventHashHex: eventHash,
    eventType
  });

  // 2) store in DB
  const db = await pool.query(
    `INSERT INTO anchors (user_id, did, event_type, event_hash, chain_tx)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, did, event_type, event_hash, chain_tx, created_at`,
    [userId, did, eventType, eventHash, onChain.txHash]
  );

  return db.rows[0];
}
