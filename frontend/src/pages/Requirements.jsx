import { Link } from "react-router-dom";

export default function Requirements() {
  return (
    <div className="page-wrap">
      <div className="app-card">
        <h2 style={{ marginBottom: 6 }}>Requirements Demo</h2>
        <div style={{ color: "var(--muted)" }}>
          Use these pages to show each requirement working on the frontend.
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        <div className="app-card">
          <h4> Step 1 — Biometric Layer</h4>
          <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Capture selfie → store embedding + template_hash in DB.
          </div>
          <div style={{ height: 12 }} />
          <Link className="app-btn" to="/biometric/enroll">Open Biometric Enroll</Link>
        </div>

        <div className="app-card">
          <h4> Step 2 — Gemini Active Risk Login</h4>
          <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Password + selfie → similarity + context + history → Gemini risk → allow/OTP/deny.
          </div>
          <div style={{ height: 12 }} />
          <Link className="app-btn" to="/login">Open Login</Link>
          <div style={{ height: 10 }} />
          <Link className="app-btn" to="/otp">Open OTP Verify</Link>
        </div>

        <div className="app-card">
          <h4> Step 3 — Blockchain Component</h4>
          <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Identity hash submit + admin verify stores salted hash on-chain.
            MetaMask signs login (wallet signature verified).
          </div>
          <div style={{ height: 12 }} />
          <Link className="app-btn" to="/dashboard">Identity Dashboard</Link>
          <div style={{ height: 10 }} />
          <Link className="app-btn" to="/wallet-login">MetaMask Wallet Login</Link>
        </div>
      </div>
    </div>
  );
}