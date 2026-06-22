// backend/src/services/vertexEmbeddings.js
import crypto from "crypto";

export async function imageToEmbedding(imageBase64NoPrefix) {
  const hash = crypto.createHash("sha256").update(imageBase64NoPrefix).digest();
  const arr = [];

  //  Only positive normalized values [0,1]
  for (let i = 0; i < 1408; i++) {
    arr.push(hash[i % hash.length] / 255);
  }

  return arr;
}