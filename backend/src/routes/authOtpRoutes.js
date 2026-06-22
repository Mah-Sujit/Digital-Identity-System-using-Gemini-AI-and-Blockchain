// backend/src/routes/authOtpRoutes.js
import { Router } from "express";
import pool from "../../db.js";

import { createOtp, getLatestValidOtp, markOtpUsed } from "../db/otpRepo.js";
import { generateOtp6, hashOtp, verifyOtpHash, otpExpiryDate } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";

import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/**
 * POST /auth/send-otp
 */
router.post("/send-otp", async (req, res) => {
  try {
    const { email, purpose = "login" } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required" });
    }

    const u = await pool.query(
      "SELECT id, email FROM users WHERE email=$1",
      [email]
    );
    const user = u.rows[0];
    if (!user) {
      return res.status(404).json({ ok: false, error: "user not found" });
    }

    const otp = generateOtp6();
    const codeHash = await hashOtp(otp);
    const expiresAt = otpExpiryDate(5);

    await createOtp({
      userId: user.id,
      purpose,
      codeHash,
      expiresAt,
    });

    const delivery = await sendOtpEmail({ to: user.email, otp });

    return res.json({
      ok: true,
      message: "OTP generated",
      delivery: delivery.mode,
      expiresInSeconds: 300,
    });
  } catch (err) {
    console.error("send-otp error:", err);
    return res.status(500).json({ ok: false, error: "server error" });
  }
});

/**
 * POST /auth/verify-otp
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, purpose = "login" } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({
        ok: false,
        error: "email and otp are required",
      });
    }

    const u = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE email=$1",
      [email]
    );

    const user = u.rows[0];
    if (!user) {
      return res.status(404).json({ ok: false, error: "user not found" });
    }

    const latest = await getLatestValidOtp({
      userId: user.id,
      purpose,
    });

    if (!latest) {
      return res.status(400).json({
        ok: false,
        error: "No valid OTP found (expired/used)",
      });
    }

    const okOtp = await verifyOtpHash(String(otp), latest.code_hash);
    if (!okOtp) {
      return res.status(401).json({ ok: false, error: "Invalid OTP" });
    }

    await markOtpUsed(latest.id);

    // ✅ Issue JWT after OTP success
    const token = jwt.sign(
      { user_id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return res.status(500).json({ ok: false, error: "server error" });
  }
});

export default router;