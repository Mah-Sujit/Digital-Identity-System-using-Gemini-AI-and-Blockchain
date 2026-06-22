import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Admin({ me }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [output, setOutput] = useState("");

  async function loadPending() {
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const res = await api.get("/admin/identity/pending", { auth: true });
      setPending(res.data.pending || []);
      setOutput(JSON.stringify(res.data, null, 2));
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load pending identities");
      setPending([]);
      setOutput(JSON.stringify(e?.response?.data || { error: "Request failed" }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function verifyRecord(recordId) {
    setErr("");
    setMsg("");
    setBusyId(recordId);

    try {
      const res = await api.post(`/admin/identity/verify/${recordId}`, null, { auth: true });

      setMsg(
        `Verified record #${recordId}. Tx: ${res.data.txHash || "N/A"}`
      );
      setOutput(JSON.stringify(res.data, null, 2));

      // refresh list
      await loadPending();
    } catch (e) {
      setErr(e?.response?.data?.error || "Verification failed");
      setOutput(JSON.stringify(e?.response?.data || { error: "Request failed" }, null, 2));
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: "100%" }}>
      {/* Header */}
      <div className="app-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Admin Panel</h2>
          <div style={{ color: "var(--muted)" }}>
            Welcome{me?.full_name ? `, ${me.full_name}` : ""}. Review and verify pending identity submissions.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>Pending Records</div>
          <div style={{ fontSize: 26, fontWeight: 900 }}>{pending.length}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="app-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="app-btn" onClick={loadPending} disabled={loading}>
            {loading ? "Loading..." : "Refresh Pending"}
          </button>
        </div>

        {err && (
          <div className="app-card" style={{ marginTop: 12, borderColor: "rgba(239,68,68,0.5)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
            <div style={{ color: "var(--muted)" }}>{err}</div>
          </div>
        )}

        {msg && (
          <div className="app-card" style={{ marginTop: 12, borderColor: "rgba(34,197,94,0.5)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Success</div>
            <div style={{ color: "var(--muted)" }}>{msg}</div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="app-card" style={{ marginTop: 14 }}>
        <h4 style={{ marginBottom: 10 }}>Pending Identity Submissions</h4>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>Loading pending records...</div>
        ) : pending.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No pending records 🎉</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={th}>ID</th>
                  <th style={th}>User</th>
                  <th style={th}>Doc Type</th>
                  <th style={th}>Doc Hash</th>
                  <th style={th}>Created</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {pending.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={td}>{r.id}</td>
                    <td style={td}>{r.email || r.user_id}</td>
                    <td style={td}>{r.document_type}</td>
                    <td style={{ ...td, fontFamily: "monospace", wordBreak: "break-all" }}>
                      {r.document_hash}
                    </td>
                    <td style={td}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td style={td}>
                      <button
                        className="app-btn"
                        disabled={busyId === r.id}
                        onClick={() => verifyRecord(r.id)}
                        style={{
                          background: "linear-gradient(135deg, #f59e0b, #f97316)",
                        }}
                      >
                        {busyId === r.id ? "Verifying..." : "Verify"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Debug Output */}
      <div className="app-card" style={{ marginTop: 14 }}>
        <h4 style={{ marginBottom: 10 }}>Output</h4>
        <pre
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            padding: 12,
            borderRadius: 14,
            overflowX: "auto",
          }}
        >
          {output}
        </pre>
      </div>
    </div>
  );
}

const th = {
  padding: "10px 8px",
  color: "var(--muted)",
  fontSize: 13,
  fontWeight: 800,
};

const td = {
  padding: "10px 8px",
  fontSize: 14,
  verticalAlign: "top",
};