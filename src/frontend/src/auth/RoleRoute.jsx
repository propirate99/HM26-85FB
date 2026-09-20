import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

function normalizeRole(role) {
  if (!role) return "";
  const r = String(role).toLowerCase();
  if (r === "main_authority" || r === "admin") return "admin";
  if (r === "zone_officer" || r === "officer") return "officer";
  if (r === "citizen") return "citizen";
  return r;
}

export function RoleRoute({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="shell muted">Loading session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  
  const userNorm = normalizeRole(user.role);
  const allowed = roles.map(normalizeRole);
  if (!allowed.includes(userNorm) && !roles.includes(user.role)) {
    return <Navigate to={userNorm === "admin" ? "/admin" : "/dashboard"} replace />;
  }
  return children;
}

