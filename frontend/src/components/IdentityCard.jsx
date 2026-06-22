import { useState } from "react";
import { api } from "../api/client";

export default function IdentityCard({ onAction }) {
  const [form, setForm] = useState({ document_type: "", document_hash: "" });
  const [out, setOut] = useState("");

  async function submit() {
    const r = await api("/identity/submit", { method: "POST", body: form, auth: true });
    setOut(JSON.stringify(r.data, null, 2));
    onAction?.();
  }

  async function status() {
    const r = await api("/identity/status", { auth: true });
    setOut(JSON.stringify(r.data, null, 2));
  }

  async function verify() {
    const r = await api("/identity/verify-and-store", { method: "POST", auth: true });
    setOut(JSON.stringify(r.data, null, 2));
    onAction?.();
  }

  const txHash = (() => {
    try {
      const obj = JSON.parse(out);
      return obj.txHash ? obj : null;
    } catch { return null; }
  })();

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title">Identity</h5>

        <input className="form-control mb-2" placeholder="Document Type"
          value={form.document_type}
          onChange={(e)=>setForm({ ...form, document_type: e.target.value })} />

        <input className="form-control mb-3" placeholder="Document Hash"
          value={form.document_hash}
          onChange={(e)=>setForm({ ...form, document_hash: e.target.value })} />

        <div className="d-flex gap-2">
          <button className="btn btn-primary flex-fill" onClick={submit}>Submit</button>
          <button className="btn btn-outline-primary flex-fill" onClick={status}>Status</button>
          <button className="btn btn-warning flex-fill" onClick={verify}>Verify</button>
        </div>

        {txHash?.explorerTxUrl && (
          <div className="alert alert-info mt-3 mb-0">
            Tx: <a href={txHash.explorerTxUrl} target="_blank" rel="noreferrer">{txHash.txHash}</a>
          </div>
        )}

        {out && (
          <pre className="bg-light border rounded p-2 mt-3 mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {out}
          </pre>
        )}
      </div>
    </div>
  );
}