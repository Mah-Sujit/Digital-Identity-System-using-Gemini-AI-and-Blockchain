import { Router } from "express";
import { getRiskScore } from "./risk.controller.js";

const router = Router();
router.post("/score", getRiskScore);
export default router;
