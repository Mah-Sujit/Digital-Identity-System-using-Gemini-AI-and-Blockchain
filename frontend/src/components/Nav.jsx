import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Nav({ token, me, onLogout }) {
  const nav = useNavigate();
  const loc = useLocation();
  const isAdmin = !!token && me?.role === "admin";

  function logout() {
    onLogout();
    nav("/login");
  }

  const active = (path) => (loc.pathname === path ? "nav-link active" : "nav-link");

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-dot" />
          <span>Digital Identity</span>
        </div>

        <nav className="nav-links">
          <Link className={active("/home")} to="/home">Home</Link>

          {!token ? (
            <>
              <Link className={active("/login")} to="/login">Login</Link>
              <Link className={active("/register")} to="/register">Register</Link>
            </>
          ) : (
            <>
              <Link className={active("/dashboard")} to="/dashboard">Dashboard</Link>
              {isAdmin && <Link className={active("/admin")} to="/admin">Admin</Link>}
            </>
          )}
        </nav>

        <div className="nav-right">
          {token && me?.email ? (
            <div className="user-pill">
              <span className="user-email">{me.email}</span>
              <span className={`role-badge ${isAdmin ? "admin" : "user"}`}>
                {isAdmin ? "admin" : "user"}
              </span>
            </div>
          ) : (
            <div className="user-pill muted">Not logged in</div>
          )}

          {token ? (
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          ) : null}
        </div>
      </div>
    </header>
  );
}