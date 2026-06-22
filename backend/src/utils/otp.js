// src/utils/otp.js
import crypto from "crypto";
import bcrypt from "bcrypt";

export function generateOtp6() {
  // cryptographically stronger than Math.random
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

export async function hashOtp(otp) {
  // bcrypt is fine for OTP hashing
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

export async function verifyOtpHash(otp, hash) {
  return bcrypt.compare(otp, hash);
}

export function otpExpiryDate(minutes = 5) {
  return new Date(Date.now() + minutes * 60 * 1000);
}