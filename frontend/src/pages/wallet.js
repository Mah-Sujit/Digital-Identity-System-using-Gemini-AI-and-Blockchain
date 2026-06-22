import { api } from "../api/client";

export async function walletLogin(email) {
  // 1) nonce
  const nonceRes = await api.get(`/auth/wallet/nonce?email=${encodeURIComponent(email)}`);
  const nonce = nonceRes.data.nonce;

  if (!window.ethereum) throw new Error("MetaMask not detected");

  // 2) connect
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const account = accounts[0];

  // 3) sign exact nonce
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [nonce, account],
  });

  // 4) verify -> JWT
  const verifyRes = await api.post("/auth/wallet/verify", { email, signature });
  return verifyRes.data; // { ok, token, recovered, user }
}