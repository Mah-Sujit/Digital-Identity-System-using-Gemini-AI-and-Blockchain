import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  biometricTemplateHash: z.string().min(16) // produced on frontend
});

export const VerifySchema = z.object({
  email: z.string().email(),
  biometricTemplateHash: z.string().min(16)
});
