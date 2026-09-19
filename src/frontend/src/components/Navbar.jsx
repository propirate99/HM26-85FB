import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { QuickUserSwitcher } from "../auth/QuickUserSwitcher.jsx";

export function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="main-header">
      <QuickUserSwitcher />
      <div className="shell">
        <nav className="nav">
          <Link to="/" className="brand">
            <div className="brand-crest">
              <span className="crest-symbol">🏛️</span>
            </div>
            <span>
              Mysuru CivicVerify
              <small>Mysuru City Corporation · Evidence-First Platform</small>
            </span>
          </Link>
          <div className="nav-links">
            <Link to="/public">Public Issues</Link>
            <Link to="/operations">Operations Grid</Link>
            <Link to="/simulator">SWM Simulator</Link>
            {user?.role === "CITIZEN" && (
              <>
                <Link to="/app">Citizen Desk</Link>
                <Link to="/app/report" className="nav-highlight">
                  + Submit Report
                </Link>
              </>
            )}
            {user?.role === "ZONE_OFFICER" && (
              <Link to="/officer" className="nav-highlight">
                Officer Queue
              </Link>
            )}
            {user?.role === "MAIN_AUTHORITY" && (
              <Link to="/admin" className="nav-highlight">
                MCC Authority Console
              </Link>
            )}

            {user ? (
              <div className="user-nav-chip">
                <span className="user-greeting">
                  <strong>{user.name || user.email}</strong>
                  <small>{user.role}</small>
                </span>
                <button className="btn btn-ghost btn-sm" type="button" onClick={logout}>
                  Sign out
                </button>
              </div>
            ) : (
              <Link className="btn btn-primary" to="/login">
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
