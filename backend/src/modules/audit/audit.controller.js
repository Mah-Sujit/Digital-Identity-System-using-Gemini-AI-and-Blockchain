import { getMyAuditLogs } from "./audit.service.js";

export async function myLogs(req, res, next) {
  try {
    const userId = req.user.sub;
    const logs = await getMyAuditLogs(userId);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}
