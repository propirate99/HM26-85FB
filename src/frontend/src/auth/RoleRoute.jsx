import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export function RoleRoute({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="shell muted">Loading session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
