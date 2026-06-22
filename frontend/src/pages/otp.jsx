import { useState } from "react";
import { api, setToken } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Otp() {
  const nav = useNavigate();
  const [email, setEmail] = useState(localStorage.getItem("pendingOtpEmail") || "sujit1@test.com");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function verify(e) {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      const res = await api.post("/auth/verify-otp", { email, otp, purpose: "login" });
      setToken(res.data.token);
      setMsg("OTP verified  token saved.");
      nav("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <h2>OTP Verify</h2>
      <form onSubmit={verify}>
        <label>Email</label><br />
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
        <br /><br />
        <label>OTP</label><br />
        <input value={otp} onChange={(e) => setOtp(e.target.value)} style={{ width: 200 }} />
        <br /><br />
        <button type="submit">Verify OTP</button>
      </form>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </div>
  );
}