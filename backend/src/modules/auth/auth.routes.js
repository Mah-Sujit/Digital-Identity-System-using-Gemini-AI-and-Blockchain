import { Router } from "express";
import { RegisterSchema, VerifySchema } from "./auth.schema.js";
import { register, verify } from "./auth.controller.js";

const router = Router();

router.post("/register", (req, res, next) => {
  try {
    req.body = RegisterSchema.parse(req.body);
    return register(req, res, next);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.post("/verify", (req, res, next) => {
  try {
    req.body = VerifySchema.parse(req.body);
    return verify(req, res, next);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

export default router;
