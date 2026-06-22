// src/utils/mailer.js
import nodemailer from "nodemailer";

const ENABLE_EMAIL = process.env.ENABLE_EMAIL === "true";

let transporter = null;
if (ENABLE_EMAIL) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendOtpEmail({ to, otp }) {
  // Demo-safe: if email not enabled, log OTP
  if (!ENABLE_EMAIL) {
    console.log(`[OTP DEMO] OTP for ${to}: ${otp}`);
    return { sent: false, mode: "console" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Your login OTP code",
    text: `Your OTP code is: ${otp}\nIt expires in 5 minutes.`,
  });

  return { sent: true, mode: "email" };
}