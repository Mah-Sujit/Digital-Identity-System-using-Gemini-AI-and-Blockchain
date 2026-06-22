import { useState } from "react";
import { api, setToken } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function LoginForm({ onLogin }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [out, setOut] = useState("");

  async function submit() {
    const r = await api("/login", { method: "POST", body: form });
    setOut(JSON.stringify(r.data, null, 2));
    if (r.data?.token) {
      setToken(r.data.token);
      onLogin?.(r.data);
      nav("/dashboard");
    }
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title">Login</h5>

        <input className="form-control mb-2" placeholder="Email"
          value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />

        <input className="form-control mb-3" type="password" placeholder="Password"
          value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} />

        <button className="btn btn-success w-100" onClick={submit}>Login</button>

        {out && <pre className="bg-light border rounded p-2 mt-3 mb-0">{out}</pre>}
      </div>
    </div>
  );
}