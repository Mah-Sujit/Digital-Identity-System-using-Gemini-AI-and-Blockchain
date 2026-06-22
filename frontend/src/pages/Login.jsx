import { useEffect, useRef, useState } from "react";
import { api, setToken } from "../api/client";
import { startCamera, stopCamera, captureToBase64 } from "../utils/faceCapture";
import { useNavigate, Link } from "react-router-dom";

export default function Login({ onLogin }) {
  const nav = useNavigate();
  const videoRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [email, setEmail] = useState("sujit1@test.com");
  const [password, setPassword] = useState("");
  const [risk, setRisk] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await startCamera(videoRef.current);
        setStream(s);
      } catch {
        setErr("Camera not available. Allow camera permissions and refresh.");
      }
    })();

    return () => stopCamera(stream);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setRisk(null);

    try {
      const image_base64 = captureToBase64(videoRef.current);

      const res = await api.post("/login", {
        email,
        password,
        image_base64,
        context: { isNewDevice: true }, // demo signal
      });

      //  allow => token
      if (res.data.token) {
        setToken(res.data.token);
        onLogin?.(); 
        setRisk(res.data.risk || null);
        setMsg("Login success  Token saved.");
        nav("/dashboard");
        return;
      }

      //  step_up => OTP
      if (res.data.stepUpRequired) {
        setRisk(res.data.risk || null);
        setMsg("OTP required. Sending OTP…");
        await api.post("/auth/send-otp", { email });
        localStorage.setItem("pendingOtpEmail", email);
        nav("/otp");
        return;
      }

      setMsg("Login response received.");
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    }
  }

  return (
    <div className="page-wrap">
      <div className="app-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Login (Step 2: Gemini risk)</h2>
          <div style={{ color: "var(--muted)" }}>
            Password + selfie → biometric similarity → Gemini risk → allow / OTP / deny.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link className="app-btn" to="/requirements">Requirements</Link>
          <Link className="app-btn" to="/wallet-login">MetaMask Login</Link>
          <Link className="app-btn" to="/biometric/enroll">Biometric Enroll</Link>
        </div>
      </div>

      {(err || msg) && (
        <div className="app-card" style={{ marginTop: 12, borderColor: err ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.5)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{err ? "Error" : "Info"}</div>
          <div style={{ color: "var(--muted)" }}>{err || msg}</div>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* Form */}
        <div className="app-card">
          <h4 style={{ marginBottom: 10 }}>Login form</h4>

          <form onSubmit={onSubmit}>
            <label style={label}>Email</label>
            <input className="app-input" value={email} onChange={(e) => setEmail(e.target.value)} />

            <div style={{ height: 12 }} />

            <label style={label}>Password</label>
            <input className="app-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <div style={{ height: 14 }} />

            <button className="app-btn" type="submit">Login with Selfie</button>

            <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
              If risk = <b>step_up</b>, you’ll be sent to OTP. If risk = <b>deny</b>, login is blocked.
            </div>
          </form>
        </div>

        {/* Camera */}
        <div className="app-card">
          <h4 style={{ marginBottom: 10 }}>Camera preview</h4>
          <video
            ref={videoRef}
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "black",
            }}
          />
          <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
            This captures a selfie and sends <code>image_base64</code> to the backend.
          </div>
        </div>
      </div>

      {/* Risk output */}
      {risk && (
        <div className="app-card" style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 10 }}>Risk decision</h4>
          <pre style={pre}>{JSON.stringify(risk, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

const label = {
  fontSize: 13,
  fontWeight: 800,
  color: "var(--muted)",
  marginBottom: 6,
  display: "block",
};

const pre = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border)",
  padding: 12,
  borderRadius: 14,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
};