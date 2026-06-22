import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../api/client";

function useCountUp(target, durationMs = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const to = Number(target || 0);

    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }

    setValue(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function Pill({ tone = "neutral", children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function KpiCard({ title, value, helper, icon }) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <div className="kpi-title">
          <div className="kpi-icon">{icon}</div>
          <div>{title}</div>
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-helper">{helper}</div>
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);

  const token = getToken();
  const isLoggedIn = !!token;

  const [health, setHealth] = useState({
    backend: "unknown",
    db: "unknown",
    chain: "unknown",
    gemini: "unknown",
  });

  const [metrics, setMetrics] = useState({
    users: 0,
    biometrics: 0,
    pendingIdentity: 0,
    verifiedIdentity: 0,
    onChainCount: 0,
    walletLogins: 0,
    otpIssued: 0,
    otpVerified: 0,
    allows: 0,
    stepUps: 0,
    denies: 0,
    lastTxHash: null,
    network: "unknown",
  });

  const [sampleRisk, setSampleRisk] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);

      // Backend health
      try {
        await api.get("/");
        if (!ignore) setHealth((h) => ({ ...h, backend: "ok" }));
      } catch {
        if (!ignore) setHealth((h) => ({ ...h, backend: "down" }));
      }

      // DB health
      try {
        await api.get("/test-db");
        if (!ignore) setHealth((h) => ({ ...h, db: "ok" }));
      } catch {
        if (!ignore) setHealth((h) => ({ ...h, db: "down" }));
      }

      // Chain count endpoint (if exists)
      let onChainCount = 0;
      try {
        const res = await api.get("/chain/identity-count");
        onChainCount = Number(res.data.count || 0);
        if (!ignore) setHealth((h) => ({ ...h, chain: "ok" }));
      } catch {
        if (!ignore) setHealth((h) => ({ ...h, chain: "down" }));
      }

      // Metrics endpoint (you already added /system/metrics)
      try {
        const res = await api.get("/system/metrics");
        if (!ignore) {
          setMetrics({ ...res.data.metrics, onChainCount });
        }
      } catch {
        if (!ignore) setMetrics((m) => ({ ...m, onChainCount }));
      }

      // Gemini status endpoint
      try {
        const res = await api.get("/system/gemini-status");
        if (!ignore) setHealth((h) => ({ ...h, gemini: res.data.ok ? "ok" : "down" }));
      } catch {
        if (!ignore) setHealth((h) => ({ ...h, gemini: "unknown" }));
      }

      // Sample risk (only if logged in)
      if (isLoggedIn) {
        try {
          const res = await api.post(
            "/auth/risk-evaluate",
            {
              biometric: { similarity: 0.86 },
              context: { isNewDevice: false, country: "UK" },
              history: { recentFailures: 0 },
            },
            { auth: true }
          );
          if (!ignore) setSampleRisk(res.data.risk);
        } catch {
          if (!ignore) setSampleRisk(null);
        }
      } else {
        if (!ignore) setSampleRisk(null);
      }

      if (!ignore) setLoading(false);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [isLoggedIn]);

  const animUsers = useCountUp(metrics.users);
  const animBio = useCountUp(metrics.biometrics);
  const animPending = useCountUp(metrics.pendingIdentity);
  const animVerified = useCountUp(metrics.verifiedIdentity);
  const animOnChain = useCountUp(metrics.onChainCount);
  const animWallet = useCountUp(metrics.walletLogins);
  const animOtpIssued = useCountUp(metrics.otpIssued);
  const animOtpVerified = useCountUp(metrics.otpVerified);

  const statusTone = (x) => (x === "ok" ? "good" : x === "down" ? "bad" : "neutral");

  const quick = useMemo(
    () => [
      { to: "/register", label: "Create account", tone: "ghost" },
      { to: "/login", label: "Login with Selfie", tone: "primary" },
      { to: "/biometric/enroll", label: "Biometric enroll", tone: "ghost" },
      { to: "/wallet-login", label: "MetaMask login", tone: "ghost" },
      { to: "/dashboard", label: "Dashboard", tone: "ghost" },
      { to: "/admin", label: "Admin panel", tone: "ghost" },
    ],
    []
  );

  return (
    <div className="dash">
      {/* HEADER */}
      <div className="dash-header">
        <div className="dash-hero">
          <div className="dash-badge">Dissertation demo — System overview</div>
          <h1 className="dash-title">Digital Identity System</h1>
          <p className="dash-sub">
            Password + Biometric + Gemini Risk + OTP step-up + Wallet Signature + Blockchain hash proof.
            Documents are never stored — only hashes and audit logs.
          </p>

          <div className="dash-actions">
            {quick.map((q) => (
              <Link key={q.to} to={q.to} className={`dash-btn ${q.tone}`}>
                {q.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="dash-side">
          <div className="dash-panel">
            <div className="dash-panel-title">System health</div>
            <div className="dash-health">
              <Pill tone={statusTone(health.backend)}>Backend: {health.backend}</Pill>
              <Pill tone={statusTone(health.db)}>DB: {health.db}</Pill>
              <Pill tone={statusTone(health.chain)}>Chain: {health.chain}</Pill>
              <Pill tone={statusTone(health.gemini)}>Gemini: {health.gemini}</Pill>
              <Pill tone="info">Network: {metrics.network || "unknown"}</Pill>
              {metrics.lastTxHash ? (
                <Pill tone="neutral">Last Tx: {String(metrics.lastTxHash).slice(0, 10)}…</Pill>
              ) : (
                <Pill tone="neutral">Last Tx: —</Pill>
              )}
            </div>
          </div>

          <div className="dash-panel" style={{ marginTop: 12 }}>
            <div className="dash-panel-title">Risk engine sample</div>
            {loading ? (
              <div className="dash-muted">Loading…</div>
            ) : isLoggedIn && sampleRisk ? (
              <pre className="dash-pre">{JSON.stringify(sampleRisk, null, 2)}</pre>
            ) : (
              <div className="dash-muted">
                Login to show a live Gemini risk evaluation sample.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="dash-grid">
        <KpiCard
          title="Users"
          icon="👤"
          value={loading ? "…" : animUsers}
          helper="Registered accounts in PostgreSQL"
        />
        <KpiCard
          title="Biometric enrollments"
          icon="🧬"
          value={loading ? "…" : animBio}
          helper="Embeddings stored in DB (template hash)"
        />
        <KpiCard
          title="Pending identities"
          icon="⏳"
          value={loading ? "…" : animPending}
          helper="Waiting for admin verification"
        />
        <KpiCard
          title="Verified identities"
          icon="✅"
          value={loading ? "…" : animVerified}
          helper="Verified and stored as salted hash"
        />
        <KpiCard
          title="On-chain identities"
          icon="⛓"
          value={loading ? "…" : animOnChain}
          helper="Count read from chain endpoint"
        />
        <KpiCard
          title="Wallet logins"
          icon="🦊"
          value={loading ? "…" : animWallet}
          helper="MetaMask signature flow usage"
        />
        <KpiCard
          title="OTP issued"
          icon="🔐"
          value={loading ? "…" : animOtpIssued}
          helper="OTP codes generated"
        />
        <KpiCard
          title="OTP verified"
          icon="📩"
          value={loading ? "…" : animOtpVerified}
          helper="Successful OTP step-up completions"
        />
      </div>

      {/* STEPS */}
      <div className="dash-steps">
        <div className="step-card">
          <div className="step-title">Step 1 — Biometric layer</div>
          <div className="step-text">
            Capture selfie → embedding → store in DB + template hash.
          </div>
          <div className="step-actions">
            <Link className="dash-btn ghost" to="/biometric/enroll">Enroll biometric</Link>
          </div>
        </div>

        <div className="step-card">
          <div className="step-title">Step 2 — Gemini active risk engine</div>
          <div className="step-text">
            Uses similarity + device + failure history to decide allow / OTP / deny.
          </div>
          <div className="step-actions">
            <Link className="dash-btn ghost" to="/login">Try login risk</Link>
          </div>
        </div>

        <div className="step-card">
          <div className="step-title">Step 3 — Blockchain + wallet</div>
          <div className="step-text">
            Admin verification stores salted hash on-chain. Wallet signs nonce for login.
          </div>
          <div className="step-actions">
            <Link className="dash-btn ghost" to="/wallet-login">MetaMask login</Link>
            <Link className="dash-btn ghost" to="/admin">Admin verify</Link>
          </div>
        </div>
      </div>

      {/* REQUIREMENTS */}
      <div className="dash-panel" style={{ marginTop: 12 }}>
        <div className="dash-panel-title">Requirements checklist (proof)</div>
        <div className="dash-check">
          <div>✅ Biometric enrollment stored in DB (template hash + embedding)</div>
          <div>✅ Biometric verification during password login (selfie required)</div>
          <div>✅ Gemini risk decision on login (allow / OTP / deny)</div>
          <div>✅ OTP step-up flow (send OTP → verify OTP → issue JWT)</div>
          <div>✅ Wallet signature login (nonce → sign → verify → issue JWT)</div>
          <div>✅ Blockchain hash storage on admin verification (salted hash)</div>
        </div>
      </div>
    </div>
  );
}