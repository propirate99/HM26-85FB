import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { QuickUserSwitcher } from "../auth/QuickUserSwitcher.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { NotificationCenter } from "./NotificationCenter.jsx";

export function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="main-header">
      <QuickUserSwitcher />
      <nav className="nav" style={{ paddingLeft: "clamp(1rem,3vw,2rem)", paddingRight: "clamp(1rem,3vw,2rem)" }}>
        <Link to={user ? "/app" : "/"} className="brand">
          <BrandMark />
          <span>
            Mysuru Swachha Portal
            <small>MCC · 65 wards · 600 TPD logistics</small>
          </span>
        </Link>
        <div className="nav-links">
          <NavLink to="/operations" className={({ isActive }) => (isActive ? "on" : undefined)}>
            Operations Grid
          </NavLink>
          <NavLink to="/simulator" className={({ isActive }) => (isActive ? "on" : undefined)}>
            Logistics simulator
          </NavLink>
          <NavLink to="/public" className={({ isActive }) => (isActive ? "on" : undefined)}>
            Public tracker
          </NavLink>
          {user?.role === "CITIZEN" && (
            <>
              <NavLink to="/app" className={({ isActive }) => (isActive ? "on" : undefined)}>
                Citizen desk
              </NavLink>
              <NavLink to="/app/profile" className={({ isActive }) => (isActive ? "on" : undefined)}>
                📸 Profile & Gallery
              </NavLink>
              <NavLink to="/app/report" className={({ isActive }) => (isActive ? "on" : "nav-highlight")}>
                Report an issue
              </NavLink>
            </>
          )}
          {user?.role === "ZONE_OFFICER" && (
            <NavLink to="/officer" className={({ isActive }) => (isActive ? "on" : "nav-highlight")}>
              Complaint queue
            </NavLink>
          )}
          {user?.role === "MAIN_AUTHORITY" && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "on" : "nav-highlight")}>
              Operations console
            </NavLink>
          )}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <NotificationCenter />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link
                  to="/app/profile"
                  className="who"
                  title="View Profile & Evidence Gallery"
                  style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
                >
                  <div className="avatar">{(user.name || "U").slice(0, 1)}</div>
                  <div>
                    <b>{user.name || user.email}</b>
                    <span>{user.role}</span>
                  </div>
                </Link>
                <button className="btn ghost" type="button" onClick={logout} style={{ flex: "none", padding: "4px 8px", fontSize: 11 }}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <Link className="btn" to="/login">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
