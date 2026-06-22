import { scoreRisk } from "./risk.service.js";

export async function getRiskScore(req, res, next) {
  try {
    const ip = req.ip;
    const userAgent = req.headers["user-agent"] || "";
    const email = req.body?.email || "";

    const risk = await scoreRisk({ ip, userAgent, email });
    res.json({ risk });
  } catch (err) {
    next(err);
  }
}
