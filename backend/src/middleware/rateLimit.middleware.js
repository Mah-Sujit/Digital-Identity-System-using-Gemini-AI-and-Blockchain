// Simple in-memory limiter (good for MVP). For production use redis-based limiter.
const hits = new Map();

export function rateLimit({ windowMs = 60_000, max = 60 } = {}) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const record = hits.get(key) || { count: 0, start: now };

    if (now - record.start > windowMs) {
      hits.set(key, { count: 1, start: now });
      return next();
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > max) {
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
}
