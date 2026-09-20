import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export function ProtectedRoute({ children, allowAdmin = false }) {
  const { user, ready, isAdmin } = useAuth();
  if (!ready) return <p className="shell muted">Loading session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowAdmin && isAdmin) return <Navigate to="/admin" replace />;
  return children;
}
