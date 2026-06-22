import bcrypt from "bcrypt";
import { pool } from "../../config/database.js";
import { generateDID } from "../../utils/did.utils.js";

export async function createUser({ email, biometricTemplateHash }) {
  const salt = await bcrypt.genSalt(12);
  const biometric_hash = await bcrypt.hash(biometricTemplateHash, salt);
  const did = generateDID(email);

  const result = await pool.query(
    `INSERT INTO users (email, did, biometric_hash, salt)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, did, created_at`,
    [email, did, biometric_hash, salt]
  );

  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, did, biometric_hash FROM users WHERE email=$1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function verifyBiometric(user, biometricTemplateHash) {
  return bcrypt.compare(biometricTemplateHash, user.biometric_hash);
}
