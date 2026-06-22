import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { pool } from "./config/database.js";
import { errorHandler } from "./middleware/error.middleware.js";

import authRoutes from "./modules/auth/auth.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import riskRoutes from "./modules/risk/risk.routes.js";
import blockchainRoutes from "./modules/blockchain/blockchain.routes.js";

import authOtpRoutes from "./routes/authOtpRoutes.js";

export const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" })); //  REQUIRED
app.use("/auth", authOtpRoutes);
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Digital Identity Backend API" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "digital-identity-backend" });
});

//  DB test (this tells us if Postgres is the problem)
app.get("/db-test", async (req, res, next) => {
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    next(e);
  }
});

//  Route mounts (must exist)
app.use("/api/auth", authRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/blockchain", blockchainRoutes);

app.use(errorHandler);
