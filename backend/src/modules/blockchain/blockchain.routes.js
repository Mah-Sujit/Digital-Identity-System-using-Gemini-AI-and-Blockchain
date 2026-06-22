import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { anchor } from "./blockchain.controller.js";

const router = Router();
router.post("/anchor", requireAuth, anchor);
export default router;
