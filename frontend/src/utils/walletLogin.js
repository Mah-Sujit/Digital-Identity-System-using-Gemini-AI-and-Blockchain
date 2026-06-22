import { ethers } from "ethers";
import { api } from "../api/client";

export async function walletSignIn(email) {
  // 1) get nonce
  const { data } = await api.get("/auth/wallet/nonce", { params: { email } });
  const nonce = data.nonce;

  // 2) connect metamask
  if (!window.ethereum) throw new Error("MetaMask not detected");
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  // 3) sign exact nonce string
  const signature = await signer.signMessage(nonce);

  // 4) verify signature -> JWT
  const verify = await api.post("/auth/wallet/verify", { email, signature });
  return verify.data; // { ok, token, user, recovered }
}