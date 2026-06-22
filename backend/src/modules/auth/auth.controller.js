import { createUser, findUserByEmail, verifyBiometric } from "./auth.service.js";
import { signToken } from "../../config/jwt.js";
import { scoreRisk } from "../risk/risk.service.js";
import { writeAudit } from "../audit/audit.service.js";

export async function register(req, res, next) {
  try {
    const user = await createUser(req.body);
    return res.status(201).json({ user });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    next(err);
  }
}

export async function verify(req, res, next) {
  try {
    const { email, biometricTemplateHash } = req.body;

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ip = req.ip;
    const userAgent = req.headers["user-agent"] || "";
    const risk = await scoreRisk({ ip, userAgent, email });

    const ok = await verifyBiometric(user, biometricTemplateHash);

    await writeAudit({
      userId: user.id,
      action: ok ? "AUTH_SUCCESS" : "AUTH_FAIL",
      riskScore: risk.score,
      ip,
      userAgent
    });

    if (!ok) return res.status(401).json({ error: "Biometric verification failed", risk });

    // Step-up logic (MFA can be added later)
    if (risk.score >= 70) {
      return res.status(403).json({
        error: "High risk detected — step-up authentication required",
        risk
      });
    }

    const token = signToken({ sub: user.id, email: user.email, did: user.did });
    return res.json({ token, user: { id: user.id, email: user.email, did: user.did }, risk });
  } catch (err) {
    next(err);
  }
}
