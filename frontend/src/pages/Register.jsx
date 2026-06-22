import { useState } from "react";
import { api } from "../api/client";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "user",
    admin_code: "",
  });

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
      };

      if (form.role === "admin") {
        payload.admin_code = form.admin_code;
      }

      const res = await api.post("/register", payload);

      setMsg("Account created successfully. Redirecting...");
      setTimeout(() => nav("/"), 1200);
    } catch (error) {
      setErr(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 450, margin: "0 auto" }}>
      <div className="app-card">
        <h2 style={{ marginBottom: 16 }}>Register</h2>

        <form onSubmit={onSubmit}>
          <label style={label}>Full Name</label>
          <input
            className="app-input"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />

          <div style={{ height: 12 }} />

          <label style={label}>Email</label>
          <input
            className="app-input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <div style={{ height: 12 }} />

          <label style={label}>Password</label>
          <input
            className="app-input"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <div style={{ height: 12 }} />

          <label style={label}>Role</label>
          <select
            className="app-input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          {form.role === "admin" && (
            <>
              <div style={{ height: 12 }} />
              <label style={label}>Admin Code</label>
              <input
                className="app-input"
                value={form.admin_code}
                onChange={(e) =>
                  setForm({ ...form, admin_code: e.target.value })
                }
                required
              />
            </>
          )}

          <div style={{ height: 18 }} />

          <button className="app-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        {err && (
          <div className="app-card" style={{ marginTop: 14, borderColor: "rgba(239,68,68,0.5)" }}>
            {err}
          </div>
        )}

        {msg && (
          <div className="app-card" style={{ marginTop: 14, borderColor: "rgba(34,197,94,0.5)" }}>
            {msg}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 14 }}>
          Already have an account? <Link to="/">Login</Link>
        </div>
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