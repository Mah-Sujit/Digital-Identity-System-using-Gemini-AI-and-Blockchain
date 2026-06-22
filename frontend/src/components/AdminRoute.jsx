import { Navigate } from "react-router-dom";

export default function AdminRoute({ token, me, loading, children }) {
  if (!token) return <Navigate to="/login" replace />;
  if (loading) return <div className="app-card">Loading...</div>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== "admin") return <div className="app-card">❌ Admin access only</div>;
  return children;
}