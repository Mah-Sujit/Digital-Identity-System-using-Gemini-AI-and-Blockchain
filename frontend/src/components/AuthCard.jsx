import { useState } from "react";
import { api, setToken } from "../api/client";

export default function AuthCard({ onLogin }) {
  const [reg, setReg] = useState({ full_name: "", email: "", password: "", wallet_address: "" });
  const [login, setLogin] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");

  async function register() {
    setMsg("");
    const r = await api("/register", { method: "POST", body: reg });
    setMsg(JSON.stringify(r.data, null, 2));
  }

  async function doLogin() {
    setMsg("");
    const r = await api("/login", { method: "POST", body: login });
    if (r.data?.token) {
      setToken(r.data.token);
      onLogin?.();
    }
    setMsg(JSON.stringify(r.data, null, 2));
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title">Auth</h5>

        <div className="row g-3">
          <div className="col-md-6">
            <h6>Register</h6>
            <input className="form-control mb-2" placeholder="Full Name"
              value={reg.full_name}
              onChange={(e)=>setReg({ ...reg, full_name: e.target.value })} />

            <input className="form-control mb-2" placeholder="Email"
              value={reg.email}
              onChange={(e)=>setReg({ ...reg, email: e.target.value })} />

            <input className="form-control mb-2" type="password" placeholder="Password"
              value={reg.password}
              onChange={(e)=>setReg({ ...reg, password: e.target.value })} />

            <input className="form-control mb-2" placeholder="Wallet Address (optional)"
              value={reg.wallet_address}
              onChange={(e)=>setReg({ ...reg, wallet_address: e.target.value })} />

            <button className="btn btn-primary w-100" onClick={register}>Register</button>
          </div>

          <div className="col-md-6">
            <h6>Login</h6>
            <input className="form-control mb-2" placeholder="Email"
              value={login.email}
              onChange={(e)=>setLogin({ ...login, email: e.target.value })} />

            <input className="form-control mb-2" type="password" placeholder="Password"
              value={login.password}
              onChange={(e)=>setLogin({ ...login, password: e.target.value })} />

            <button className="btn btn-success w-100" onClick={doLogin}>Login</button>
          </div>
        </div>

        {msg && (
          <pre className="bg-light border rounded p-2 mt-3 mb-0" style={{ whiteSpace: "pre-wrap" }}>
            {msg}
          </pre>
        )}
      </div>
    </div>
  );
}