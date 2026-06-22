import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Otp from "./pages/Otp";
import IdentitySubmit from "./pages/IdentitySubmit";

import Requirements from "./pages/Requirements";        
import BiometricEnroll from "./pages/BiometricEnroll";  
import WalletLogin from "./pages/WalletLogin";          

import { api, getToken, setAuthToken, clearToken } from "./api/client";
import "./App.css";

export default function App() {
  const [token, setTokenState] = useState(getToken());
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!token) {
      setMe(null);
      setAuthToken(null);
      setLoadingMe(false);
      return;
    }

    setAuthToken(token);
    setLoadingMe(true);

    (async () => {
      try {
        const res = await api.get("/me", { auth: true });
        setMe(res.data.user);
      } catch {
        clearToken();
        setTokenState("");
        setMe(null);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, [token]);

  function onLogin() {
    setTokenState(getToken());
  }

  function onLogout() {
    clearToken();
    setAuthToken(null);
    setTokenState("");
    setMe(null);
  }

  // Prevent flicker while loading /me
  if (token && loadingMe) {
    return (
      <div className="app-shell">
        <Nav token={token} me={me} onLogout={onLogout} />
        <div className="page">
          <div className="glass-card">Loading profile…</div>
        </div>
      </div>
    );
  }

  const isAdmin = !!token && me?.role === "admin";

  return (
    <div className="app-shell">
      <Nav token={token} me={me} onLogout={onLogout} />
      <div className="page">
        <Routes>
          <Route path="/home" element={<Home />} />

          {/*  NEW: requirements proof page */}
          <Route path="/requirements" element={<Requirements />} />

          <Route path="/" element={<Login onLogin={onLogin} />} />
          <Route path="/login" element={<Login onLogin={onLogin} />} />
          <Route path="/register" element={<Register />} />

          <Route path="/otp" element={<Otp onLogin={onLogin} />} />

          {/*  NEW: biometric enroll (requires login token) */}
          <Route
            path="/biometric/enroll"
            element={token ? <BiometricEnroll /> : <Navigate to="/login" replace />}
          />

          {/*  NEW: wallet login page (no token needed; it creates token) */}
          <Route path="/wallet-login" element={<WalletLogin onLogin={onLogin} />} />

          <Route
            path="/dashboard"
            element={token ? <Dashboard me={me} /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/admin"
            element={isAdmin ? <Admin me={me} /> : <Navigate to="/dashboard" replace />}
          />

          <Route
            path="/identity/submit"
            element={token ? <IdentitySubmit /> : <Navigate to="/login" replace />}
          />

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </div>
  );
}