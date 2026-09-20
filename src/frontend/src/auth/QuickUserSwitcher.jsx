import { useState } from "react";
import { useAuth } from "./AuthProvider.jsx";
import { authApi } from "../api/authApi.js";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle.jsx";

const DEMO_PERSONAS = [
  {
    id: "citizen",
    email: "ravi.citizen@mysuru.demo",
    name: "Ravi Kumar",
    roleLabel: "Citizen",
    badgeClass: "badge-verified",
    zone: "Saraswathipuram",
    targetRoute: "/dashboard",
  },
  {
    id: "swm-officer",
    email: "swm.officer@mysuru.gov.in",
    name: "SWM Control",
    roleLabel: "MCC Officer",
    badgeClass: "badge-status",
    zone: "Central SWM",
    targetRoute: "/officer",
  },
  {
    id: "north-officer",
    email: "ananya.officer@mysuru.gov.in",
    name: "Ananya Rao",
    roleLabel: "North Zone Officer",
    badgeClass: "badge-status",
    zone: "North Zone",
    targetRoute: "/officer",
  },
  {
    id: "south-officer",
    email: "karthik.officer@mysuru.gov.in",
    name: "Karthik Swamy",
    roleLabel: "South Zone Officer",
    badgeClass: "badge-status",
    zone: "South Zone",
    targetRoute: "/officer",
  },
  {
    id: "commissioner",
    email: "commissioner@mysuru.gov.in",
    name: "MCC Commissioner",
    roleLabel: "Main Authority",
    badgeClass: "badge-risk",
    zone: "All Zones (HQ)",
    targetRoute: "/admin",
  },
];

function getRouteForUser(u) {
  if (!u) return "/login";
  const r = String(u.role || "").toLowerCase();
  if (r === "main_authority" || r === "admin") return "/admin";
  if (r === "zone_officer" || r === "officer") return "/officer";
  return "/dashboard";
}

export function QuickUserSwitcher() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function switchUser(persona) {
    setBusy(true);
    try {
      const data = await authApi.demo(persona.email);
      setUser(data.user);
      const dest = getRouteForUser(data.user) || persona.targetRoute || "/dashboard";
      navigate(dest, { replace: true, state: { user: data.user, profile: data.user } });
    } catch (err) {
      console.error("Failed to switch demo persona:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="quick-switcher-bar" aria-label="Quick Demo User Switcher">
      <div className="quick-switcher-content" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="quick-switcher-label">
            <span className="pulse-dot" /> Switch Demo Role:
          </span>
          <div className="quick-switcher-buttons">
            {DEMO_PERSONAS.map((p) => {
              const isActive = user?.email === p.email;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => switchUser(p)}
                  className={`quick-switcher-btn ${isActive ? "active" : ""}`}
                  title={`Switch to ${p.name} (${p.roleLabel} - ${p.zone})`}
                >
                  <span className="persona-name">{p.name}</span>
                  <span className="persona-role">{p.roleLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
