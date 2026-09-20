import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { QuickUserSwitcher } from "../auth/QuickUserSwitcher.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { NotificationCenter } from "./NotificationCenter.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function Navbar() {
  const { user, logout, isAdmin, isOfficer, isCitizen } = useAuth();
  return (
    <header className="main-header">
      <QuickUserSwitcher />
      <nav className="nav" style={{ paddingLeft: "clamp(1rem,3vw,2rem)", paddingRight: "clamp(1rem,3vw,2rem)" }}>
        <Link to={user ? (isAdmin ? "/admin" : isOfficer ? "/officer" : "/app") : "/"} className="brand">
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
          {isCitizen && (
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
          {isOfficer && (
            <NavLink to="/officer" className={({ isActive }) => (isActive ? "on" : "nav-highlight")}>
              Complaint queue
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "on" : "nav-highlight")}>
              Operations console
            </NavLink>
          )}
          <ThemeToggle />
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <NotificationCenter />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link
                  to={isAdmin ? "/admin" : isOfficer ? "/officer" : "/app/profile"}
                  className="who"
                  title="View Profile"
                  style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
                >
                  <div className="avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
                    ) : (
                      (user.name || user.email || "U").slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <b>{user.name || user.email}</b>
                    <span style={{ textTransform: "uppercase" }}>{user.role}</span>
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
