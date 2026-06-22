import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { myLogs } from "./audit.controller.js";

const router = Router();
router.get("/me", requireAuth, myLogs);
export default router;
