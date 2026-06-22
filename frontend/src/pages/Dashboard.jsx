import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

function shortHash(h = "") {
  if (!h) return "—";
  if (h.length <= 16) return h;
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Creates a random bytes32 hex string (0x + 64 hex chars)
function randomBytes32() {
  const chars = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 64; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

export default function Dashboard({ me }) {
  const [docType, setDocType] = useState("passport");
  const [docHash, setDocHash] = useState(randomBytes32());

  const [record, setRecord] = useState(null);
  const [chainCount, setChainCount] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);

  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const [output, setOutput] = useState("");

  const badge = useMemo(() => {
    const s = record?.verification_status;
    if (s === "verified") return { text: "VERIFIED", color: "var(--success)" };
    if (s === "pending") return { text: "PENDING", color: "var(--accent)" };
    return { text: "NONE", color: "var(--muted)" };
  }, [record]);

  async function loadStatus() {
    setErr("");
    setLoadingStatus(true);
    try {
      const res = await api.get("/identity/status", { auth: true });
      setRecord(res.data.record);
      setOutput(JSON.stringify(res.data, null, 2));
    } catch (e) {
      setRecord(null);
      setOutput(JSON.stringify(e?.response?.data || { error: "No identity record found" }, null, 2));
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadChainCount() {
    setLoadingCount(true);
    try {
      const res = await api.get("/chain/identity-count");
      setChainCount(res.data.count);
    } catch {
      setChainCount(null);
    } finally {
      setLoadingCount(false);
    }
  }

  async function submit() {
    setErr("");
    setToast("");
    setLoading(true);

    try {
      // simple validation for bytes32
      if (!docHash.startsWith("0x") || docHash.length !== 66) {
        throw new Error("Document hash must be bytes32 (0x + 64 hex chars). Click Generate.");
      }

      const res = await api.post(
        "/identity/submit",
        { document_type: docType, document_hash: docHash },
        { auth: true }
      );

      setToast("Identity submitted successfully (pending).");
      setOutput(JSON.stringify(res.data, null, 2));

      await loadStatus();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Submit failed");
      setOutput(JSON.stringify(e?.response?.data || { error: e.message || "Submit failed" }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    loadChainCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="app-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Dashboard</h2>
          <div style={{ color: "var(--muted)" }}>
            Welcome{me?.full_name ? `, ${me.full_name}` : ""}. Submit your identity proof (hash only).
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>On-chain Identities</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>
            {loadingCount ? "…" : (chainCount ?? "—")}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {err && (
        <div className="app-card" style={{ marginTop: 12, borderColor: "rgba(239,68,68,0.5)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div style={{ color: "var(--muted)" }}>{err}</div>
        </div>
      )}

      {toast && (
        <div className="app-card" style={{ marginTop: 12, borderColor: "rgba(34,197,94,0.5)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Success</div>
          <div style={{ color: "var(--muted)" }}>{toast}</div>
        </div>
      )}

      {/* Main grid */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 14,
        }}
      >
        {/* Submit */}
        <div className="app-card">
          <h4 style={{ marginBottom: 10 }}>Submit Identity</h4>

          <label style={label}>Document type</label>
          <input
            className="app-input"
            placeholder="e.g., passport"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          />

          <div style={{ height: 12 }} />

          <label style={label}>Document hash (bytes32)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              className="app-input"
              placeholder="0x + 64 hex chars"
              value={docHash}
              onChange={(e) => setDocHash(e.target.value.trim())}
              style={{ flex: 1, fontFamily: "monospace" }}
            />
            <button
              className="app-btn"
              type="button"
              onClick={() => setDocHash(randomBytes32())}
            >
              Generate
            </button>
          </div>

          <div style={{ height: 14 }} />

          <button className="app-btn" onClick={submit} disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>

          <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
            Only a hash is stored. Status starts as <b>pending</b>. Admin verifies and stores the salted hash on-chain.
          </div>
        </div>

        {/* Status */}
        <div className="app-card">
          <h4 style={{ marginBottom: 10 }}>Latest Status</h4>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "var(--muted)" }}>Verification</div>
            <div style={{ fontWeight: 900, color: badge.color }}>{badge.text}</div>
          </div>

          <div style={{ height: 12 }} />

          {record ? (
            <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8 }}>
              <div><b>Type:</b> {record.document_type}</div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <b>Hash:</b>
                <span style={{ fontFamily: "monospace" }}>{shortHash(record.document_hash)}</span>
                <button
                  className="app-btn"
                  type="button"
                  onClick={async () => {
                    const ok = await copyToClipboard(record.document_hash);
                    setToast(ok ? "Copied hash to clipboard." : "Copy failed.");
                    setTimeout(() => setToast(""), 1500);
                  }}
                >
                  Copy
                </button>
              </div>

              {record.salt && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <b>Salt:</b>
                  <span style={{ fontFamily: "monospace" }}>{shortHash(record.salt)}</span>
                  <button
                    className="app-btn"
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard(record.salt);
                      setToast(ok ? "Copied salt to clipboard." : "Copy failed.");
                      setTimeout(() => setToast(""), 1500);
                    }}
                  >
                    Copy
                  </button>
                </div>
              )}

              <div><b>Created:</b> {record.created_at ? new Date(record.created_at).toLocaleString() : "—"}</div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)" }}>No identity record found yet.</div>
          )}

          <div style={{ height: 14 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="app-btn" onClick={loadStatus} disabled={loadingStatus}>
              {loadingStatus ? "Refreshing..." : "Refresh Status"}
            </button>

            <button className="app-btn" onClick={loadChainCount} disabled={loadingCount}>
              {loadingCount ? "Loading..." : "Refresh Chain Count"}
            </button>
          </div>

          <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
            Verification happens in the <b>Admin</b> panel.
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="app-card" style={{ marginTop: 16 }}>
        <h4 style={{ marginBottom: 10 }}>Output</h4>
        <pre style={pre}>
          {output}
        </pre>
      </div>
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
};