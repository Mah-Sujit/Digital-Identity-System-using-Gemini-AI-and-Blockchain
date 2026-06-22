import crypto from "crypto";

export function generateDID(email) {
  const rand = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(email + rand).digest("hex");
  return `did:gbdif:${hash}`;
}
