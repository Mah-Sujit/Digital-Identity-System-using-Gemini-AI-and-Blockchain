// backend/src/server.js
import "dotenv/config";
import cors from "cors";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import { assessIdentityRisk } from "./gemini.js";
import { evaluateRiskWithGemini } from "./geminiRisk.js";
import authOtpRoutes from "./routes/authOtpRoutes.js";
import { imageToEmbedding } from "./services/vertexEmbeddings.js";

// Biometric routes
import biometricEnrollRoutes from "./routes/biometric.routes.js";
import biometricPublicRoutes from "./routes/biometricVerify.routes.js";

//  Load ABI
const ABI_PATH = path.join(process.cwd(), "contractABI.json");
const contractAbi = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/* =========================
   SALTED HASH HELPERS
========================= */
function normalizeBytes32(hex) {
  if (typeof hex !== "string") throw new Error("Hash must be a string");
  if (!hex.startsWith("0x")) throw new Error("Hash must start with 0x");
  if (hex.length !== 66) throw new Error(`Hash must be bytes32 (66 chars). Got ${hex.length}`);
  return hex.toLowerCase();
}

function randomSalt32() {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

function saltedOnChainHash(documentHashBytes32, saltBytes32) {
  const doc = normalizeBytes32(documentHashBytes32);
  const salt = normalizeBytes32(saltBytes32);
  return ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [doc, salt]));
}

/* =========================
   CORS + MIDDLEWARE
========================= */
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// IMPORTANT: allow large base64 payloads
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  console.log("HIT:", req.method, req.url);
  next();
});

// OTP routes
app.use("/auth", authOtpRoutes);

/* =========================
   AUTH MIDDLEWARE
========================= */
function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* =========================
    BIOMETRIC ROUTES
========================= */
// Public: /biometric/ping , /biometric/verify
app.use("/biometric", biometricPublicRoutes);

// Protected: /biometric/enroll
app.use("/biometric", auth, biometricEnrollRoutes);

/* =========================
   ADMIN MIDDLEWARE
========================= */
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
}

/* =========================
   BASIC ROUTES
========================= */
app.get("/", (req, res) => res.send("Backend is working"));

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

/* =========================
   GEMINI RISK EVALUATE (Protected)
========================= */
app.post("/auth/risk-evaluate", auth, async (req, res) => {
  try {
    const signals = { userId: req.user.user_id, ...req.body };
    const risk = await evaluateRiskWithGemini(signals);
    return res.json({ ok: true, risk });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Gemini risk evaluation failed" });
  }
});

/* =========================
   REGISTER
========================= */
app.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, wallet_address, role, admin_code } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "full_name, email, password are required" });
    }

    let finalRole = "user";
    if (role === "admin") {
      if (!admin_code || admin_code !== process.env.ADMIN_REGISTER_CODE) {
        return res.status(403).json({ error: "Invalid admin register code" });
      }
      finalRole = "admin";
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, wallet_address, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, wallet_address, role, created_at`,
      [full_name, email, password_hash, wallet_address || null, finalRole]
    );

    return res.status(201).json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    return res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   LOGIN HELPERS
========================= */
async function getRecentFailureCount(email) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM login_events
     WHERE email=$1
       AND result='fail'
       AND created_at > now() - interval '30 minutes'`,
    [email]
  );
  return r.rows[0]?.c ?? 0;
}

async function logLoginEvent({ user_id, email, ip, user_agent, result, reason }) {
  await pool.query(
    `INSERT INTO login_events (user_id, email, ip, user_agent, result, reason)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [user_id || null, email || null, ip || null, user_agent || null, result, reason || null]
  );
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }

  if (normA === 0 || normB === 0) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* =========================
   LOGIN (Gemini + Biometric + Risk Engine)
========================= */
app.post("/login", async (req, res) => {
  try {
    const { email, password, image_base64, context } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const userResult = await pool.query(
      `SELECT id, full_name, email, password_hash, wallet_address, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      await logLoginEvent({
        user_id: null,
        email,
        ip: req.ip,
        user_agent: req.headers["user-agent"],
        result: "fail",
        reason: "Unknown email",
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userResult.rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await logLoginEvent({
        user_id: user.id,
        email: user.email,
        ip: req.ip,
        user_agent: req.headers["user-agent"],
        result: "fail",
        reason: "Wrong password",
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!image_base64 || !String(image_base64).includes("base64,")) {
      return res.status(400).json({
        error: "image_base64 required (data:image/...;base64,...)",
      });
    }

    const bRes = await pool.query(`SELECT face_embedding FROM user_biometrics WHERE user_id=$1`, [
      user.id,
    ]);

    if (bRes.rowCount === 0) {
      return res.status(400).json({
        error: "No biometric enrolled for this user. Enroll first.",
      });
    }

    const stored = bRes.rows[0].face_embedding.map(Number);
    const b64 = String(image_base64).split("base64,")[1];
    const live = await imageToEmbedding(b64);
    const similarity = cosineSimilarity(stored, live);

    const recentFailures = await getRecentFailureCount(user.email);

    const signals = {
      userId: user.id,
      email: user.email,
      biometric: { similarity },
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        country: context?.country,
        isNewDevice: !!context?.isNewDevice,
        loginHour: new Date().getHours(),
      },
      history: { recentFailures },
    };

    const risk = await evaluateRiskWithGemini(signals);

    await logLoginEvent({
      user_id: user.id,
      email: user.email,
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      result: risk.action,
      reason: (risk.reasons || []).join(" | "),
    });

    if (risk.action === "deny") {
      return res.status(403).json({ ok: false, risk, error: "Login denied by risk engine" });
    }

    if (risk.action === "allow") {
      const token = jwt.sign(
        { user_id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "2h" }
      );

      return res.json({
        ok: true,
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
        risk,
      });
    }

    return res.json({
      ok: true,
      risk,
      stepUpRequired: true,
      message: "OTP verification required",
      next: { endpoint: "/auth/send-otp", method: "POST", body: { email: user.email } },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

/* =========================
   ME (Protected)
========================= */
app.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, wallet_address, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   IDENTITY SUBMIT (Protected)
========================= */
app.post("/identity/submit", auth, async (req, res) => {
  try {
    const { document_type, document_hash } = req.body || {};

    if (!document_type || !document_hash) {
      return res.status(400).json({ error: "document_type and document_hash are required" });
    }

    const salt = randomSalt32();
    const docHash32 = normalizeBytes32(document_hash);

    const uRes = await pool.query(
      `SELECT full_name, email, wallet_address FROM users WHERE id = $1`,
      [req.user.user_id]
    );
    const user = uRes.rows[0] || {};

    const ai = await assessIdentityRisk({
      full_name: user.full_name,
      email: user.email,
      wallet_address: user.wallet_address,
      document_type,
      document_hash: docHash32,
    });

    const result = await pool.query(
      `INSERT INTO identity_records
        (user_id, document_type, document_hash, salt, verification_status, ai_decision, ai_score, ai_reasons)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
       RETURNING *`,
      [
        req.user.user_id,
        document_type,
        docHash32,
        salt,
        ai.decision || "review",
        Number.isFinite(ai.score) ? ai.score : 50,
        Array.isArray(ai.reasons) ? ai.reasons.join(" | ") : "no reasons",
      ]
    );

    return res.status(201).json({ ok: true, record: result.rows[0], ai });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/identity/status", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, document_type, document_hash, salt, verification_status, created_at
       FROM identity_records
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "No identity record found" });
    return res.json({ ok: true, record: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/* =========================
   ADMIN: LIST PENDING
========================= */
app.get("/admin/identity/pending", auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ir.id, ir.user_id, u.email, ir.document_type, ir.document_hash,
              ir.verification_status, ir.created_at
       FROM identity_records ir
       JOIN users u ON u.id = ir.user_id
       WHERE ir.verification_status = 'pending'
       ORDER BY ir.created_at ASC`
    );
    return res.json({ ok: true, pending: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   ADMIN: VERIFY RECORD (stores SALTED hash on-chain)
========================= */
app.post("/admin/identity/verify/:recordId", auth, adminOnly, async (req, res) => {
  try {
    const recordId = Number(req.params.recordId);

    const recRes = await pool.query(
      `SELECT id, user_id, document_hash, salt, verification_status
       FROM identity_records
       WHERE id = $1`,
      [recordId]
    );

    if (recRes.rows.length === 0) return res.status(404).json({ error: "Identity record not found" });

    const record = recRes.rows[0];
    if (record.verification_status === "verified") return res.status(400).json({ error: "Already verified" });

    const rpc = process.env.CHAIN_RPC || "http://127.0.0.1:8545";
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) return res.status(500).json({ error: "Missing CONTRACT_ADDRESS in .env" });

    const PRIVATE_KEY =
      process.env.ADMIN_PRIVATE_KEY ||
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddress, contractAbi, wallet);

    const docHash32 = normalizeBytes32(record.document_hash);
    const salt32 = normalizeBytes32(record.salt);
    const onChainHash = saltedOnChainHash(docHash32, salt32);

    const t0 = Date.now();
    const tx = await contract.storeIdentity(onChainHash);
    const receipt = await tx.wait();
    const confirmMs = Date.now() - t0;

    const gasUsed = receipt.gasUsed?.toString?.() ?? null;
    const effGasPrice = receipt.effectiveGasPrice?.toString?.() ?? null;
    const txFeeWei =
      receipt.gasUsed && receipt.effectiveGasPrice
        ? (receipt.gasUsed * receipt.effectiveGasPrice).toString()
        : null;

    await pool.query(
      `INSERT INTO blockchain_logs
        (user_id, identity_record_id, transaction_hash, contract_address, network,
         gas_used, effective_gas_price, tx_fee_wei, confirm_ms, stored_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        record.user_id,
        record.id,
        receipt.hash,
        contractAddress,
        "localhost",
        gasUsed,
        effGasPrice,
        txFeeWei,
        confirmMs,
        onChainHash,
      ]
    );

    await pool.query(`UPDATE identity_records SET verification_status = 'verified' WHERE id = $1`, [
      record.id,
    ]);

    return res.json({
      ok: true,
      message: "Verified by admin + stored SALTED hash on blockchain",
      recordId: record.id,
      storedHash: onChainHash,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      confirmMs,
      gasUsed,
      effectiveGasPrice: effGasPrice,
      txFeeWei,
      contractAddress,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   WALLET NONCE + VERIFY (MetaMask)
========================= */
app.get("/auth/wallet/nonce", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ ok: false, error: "email required" });

    const uRes = await pool.query(
      `SELECT id, email, wallet_address, role FROM users WHERE email=$1`,
      [email]
    );
    if (uRes.rowCount === 0) return res.status(404).json({ ok: false, error: "User not found" });

    const user = uRes.rows[0];
    if (!user.wallet_address) {
      return res.status(400).json({ ok: false, error: "No wallet_address saved for this user" });
    }

    const nonce = `Login nonce: ${crypto.randomBytes(16).toString("hex")}`;

    await pool.query(
      `
      INSERT INTO wallet_nonces (user_id, nonce)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET nonce=EXCLUDED.nonce, created_at=now()
      `,
      [user.id, nonce]
    );

    return res.json({ ok: true, email: user.email, wallet_address: user.wallet_address, nonce });
  } catch (err) {
    console.error("wallet nonce error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/auth/wallet/verify", async (req, res) => {
  try {
    const { email, signature } = req.body || {};
    if (!email || !signature) {
      return res.status(400).json({ ok: false, error: "email + signature required" });
    }

    const uRes = await pool.query(
      `SELECT id, email, role, wallet_address FROM users WHERE email=$1`,
      [email]
    );
    if (uRes.rowCount === 0) return res.status(404).json({ ok: false, error: "User not found" });

    const user = uRes.rows[0];
    if (!user.wallet_address) {
      return res.status(400).json({ ok: false, error: "No wallet_address saved for this user" });
    }

    const nRes = await pool.query(`SELECT nonce FROM wallet_nonces WHERE user_id=$1`, [user.id]);
    if (nRes.rowCount === 0) {
      return res.status(400).json({ ok: false, error: "No nonce found. Call /auth/wallet/nonce first." });
    }

    const nonce = nRes.rows[0].nonce;

    const recovered = ethers.verifyMessage(nonce, signature);

    if (recovered.toLowerCase() !== String(user.wallet_address).toLowerCase()) {
      return res.status(401).json({ ok: false, error: "Invalid signature (wallet does not match)", recovered });
    }

    await pool.query(`DELETE FROM wallet_nonces WHERE user_id=$1`, [user.id]);

    const token = jwt.sign(
      { user_id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      ok: true,
      walletVerified: true,
      recovered,
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("wallet verify error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/* =========================
    CHAIN: IDENTITY COUNT (for Home page)
   Frontend calls: GET /chain/identity-count
========================= */
app.get("/chain/identity-count", async (req, res) => {
  try {
    const rpc = process.env.CHAIN_RPC || "http://127.0.0.1:8545";
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
      return res.status(500).json({ ok: false, error: "Missing CONTRACT_ADDRESS in backend/.env" });
    }

    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(contractAddress, contractAbi, provider);

    // Contract must have getTotalIdentities()
    if (typeof contract.getTotalIdentities !== "function") {
      return res.status(500).json({
        ok: false,
        error: "ABI mismatch: getTotalIdentities() not found in contractABI.json",
      });
    }

    const count = await contract.getTotalIdentities();
    return res.json({ ok: true, count: Number(count) });
  } catch (err) {
    console.error("chain identity-count error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

/* =========================
   SYSTEM METRICS (for Home page)
========================= */
app.get("/system/metrics", async (req, res) => {
  try {
    const usersQ = await pool.query(`SELECT COUNT(*)::int AS c FROM users`);
    const biometricsQ = await pool.query(`SELECT COUNT(*)::int AS c FROM user_biometrics`);
    const pendingQ = await pool.query(`SELECT COUNT(*)::int AS c FROM identity_records WHERE verification_status='pending'`);
    const verifiedQ = await pool.query(`SELECT COUNT(*)::int AS c FROM identity_records WHERE verification_status='verified'`);

    let walletLogins = 0;
    let otpIssued = 0;
    let otpVerified = 0;
    let allows = 0;
    let stepUps = 0;
    let denies = 0;
    let lastTxHash = null;

    try {
      const w = await pool.query(`SELECT COUNT(*)::int AS c FROM wallet_nonces`);
      walletLogins = w.rows[0].c;
    } catch {}

    try {
      const o1 = await pool.query(`SELECT COUNT(*)::int AS c FROM otps`);
      otpIssued = o1.rows[0].c;
      const o2 = await pool.query(`SELECT COUNT(*)::int AS c FROM otps WHERE used_at IS NOT NULL`);
      otpVerified = o2.rows[0].c;
    } catch {}

    try {
      const a = await pool.query(`SELECT COUNT(*)::int AS c FROM login_events WHERE result='allow'`);
      const s = await pool.query(`SELECT COUNT(*)::int AS c FROM login_events WHERE result='step_up'`);
      const d = await pool.query(`SELECT COUNT(*)::int AS c FROM login_events WHERE result='deny'`);
      allows = a.rows[0].c;
      stepUps = s.rows[0].c;
      denies = d.rows[0].c;
    } catch {}

    try {
      const last = await pool.query(`SELECT transaction_hash FROM blockchain_logs ORDER BY created_at DESC NULLS LAST LIMIT 1`);
      lastTxHash = last.rows[0]?.transaction_hash || null;
    } catch {}

    return res.json({
      ok: true,
      metrics: {
        users: usersQ.rows[0].c,
        biometrics: biometricsQ.rows[0].c,
        pendingIdentity: pendingQ.rows[0].c,
        verifiedIdentity: verifiedQ.rows[0].c,
        walletLogins,
        otpIssued,
        otpVerified,
        allows,
        stepUps,
        denies,
        lastTxHash,
        network: process.env.CHAIN_RPC ? "Hardhat / RPC" : "unknown",
      },
    });
  } catch (err) {
    console.error("system metrics error:", err);
    return res.status(500).json({ ok: false, error: "metrics failed" });
  }
});

app.get("/system/gemini-status", (req, res) => {
  return res.json({ ok: !!process.env.GEMINI_API_KEY });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});