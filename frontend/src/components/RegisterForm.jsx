import { useState } from "react";
import { api } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function RegisterForm() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", wallet_address: "" });
  const [out, setOut] = useState("");

  async function submit() {
    const r = await api("/register", { method: "POST", body: form });
    setOut(JSON.stringify(r.data, null, 2));
    if (r.data?.ok) nav("/login");
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title">Register</h5>

        <input className="form-control mb-2" placeholder="Full Name"
          value={form.full_name} onChange={(e)=>setForm({...form, full_name:e.target.value})} />

        <input className="form-control mb-2" placeholder="Email"
          value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />

        <input className="form-control mb-2" type="password" placeholder="Password"
          value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} />

        <input className="form-control mb-3" placeholder="Wallet Address (optional)"
          value={form.wallet_address} onChange={(e)=>setForm({...form, wallet_address:e.target.value})} />

        <button className="btn btn-primary w-100" onClick={submit}>Create Account</button>

        {out && <pre className="bg-light border rounded p-2 mt-3 mb-0">{out}</pre>}
      </div>
    </div>
  );
}