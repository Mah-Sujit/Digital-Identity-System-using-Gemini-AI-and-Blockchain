import { useState } from "react";
import { api, setToken } from "../api/client";

export default function WalletLogin({ onLogin }) {
  const [email, setEmail] = useState("sujit1@test.com");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function login() {
    setMsg(""); setErr("");
    try {
      // 1) get nonce
      const nonceRes = await api.get(`/auth/wallet/nonce?email=${encodeURIComponent(email)}`);
      const nonce = nonceRes.data.nonce;

      if (!window.ethereum) throw new Error("MetaMask not detected");

      // 2) connect + get account
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const account = accounts[0];

      // 3) sign exact nonce
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [nonce, account],
      });

      // 4) verify -> token
      const verifyRes = await api.post("/auth/wallet/verify", { email, signature });

      setToken(verifyRes.data.token); // saves to localStorage
      onLogin?.();

      setMsg(` Wallet verified. recovered: ${verifyRes.data.recovered}`);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div className="page-wrap">
      <div className="app-card">
        <h2 style={{ marginBottom: 6 }}>MetaMask Wallet Login (Step 3)</h2>
        <div style={{ color: "var(--muted)" }}>
          Nonce → MetaMask sign → backend verifies → JWT issued.
        </div>
      </div>

      <div className="app-card" style={{ marginTop: 14, maxWidth: 560 }}>
        <label style={{ fontWeight: 800, color: "var(--muted)" }}>Email</label>
        <input className="app-input" value={email} onChange={(e) => setEmail(e.target.value)} />

        <div style={{ height: 12 }} />
        <button className="app-btn" onClick={login}>Login with MetaMask</button>

        {msg && <div style={{ marginTop: 12, color: "var(--success)", fontWeight: 800 }}>{msg}</div>}
        {err && <div style={{ marginTop: 12, color: "tomato", fontWeight: 800 }}>{err}</div>}
      </div>
    </div>
  );
}