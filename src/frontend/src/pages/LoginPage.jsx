import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";

const DEMO_USERS = [
  {
    label: "Ravi Kumar",
    role: "Citizen",
    email: "ravi.citizen@mysuru.demo",
    desc: "Saraswathipuram Resident · Submits reports & tracks progress",
    badge: "badge-verified",
  },
  {
    label: "Ananya Rao",
    role: "North Zone Officer",
    email: "ananya.officer@mysuru.gov.in",
    desc: "Assigned to North Zone · Reviews & accepts Sayyaji Rao Rd issues",
    badge: "badge-status",
  },
  {
    label: "Karthik Swamy",
    role: "South Zone Officer",
    email: "karthik.officer@mysuru.gov.in",
    desc: "Assigned to South Zone · Manages Kuvempunagar/Vidyaranyapuram",
    badge: "badge-status",
  },
  {
    label: "MCC Commissioner",
    role: "Main Authority",
    email: "commissioner@mysuru.gov.in",
    desc: "City-wide SLA oversight · Handles escalations & audit trail",
    badge: "badge-risk",
  },
];

function homeFor(user) {
  if (user?.role === "ZONE_OFFICER") return "/officer";
  if (user?.role === "MAIN_AUTHORITY") return "/admin";
  return "/app";
}

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return undefined;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const data = await authApi.google(response.credential);
            setUser(data.user);
            navigate(homeFor(data.user));
          } catch (err) {
            setError(err.message);
          }
        },
      });
      const el = document.getElementById("google-btn");
      if (el) {
        window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 280 });
      }
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, [clientId, navigate, setUser]);

  async function demo(email) {
    setError("");
    try {
      const data = await authApi.demo(email);
      setUser(data.user);
      navigate(homeFor(data.user));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="shell">
      <div className="card login-card" style={{ maxWidth: 540, margin: "32px auto" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ fontSize: "2.5rem" }}>🏛️</span>
          <h1 style={{ margin: "8px 0 4px" }}>Sign In to CivicVerify</h1>
          <p className="muted" style={{ margin: 0 }}>
            Mysuru City Corporation · Evidence-Bound Complaint Verification &amp; Routing
          </p>
        </div>

        <div id="google-btn" style={{ margin: "16px auto", display: "flex", justifyContent: "center" }} />
        {!clientId ? (
          <p className="privacy-note" style={{ fontSize: 13, marginTop: 0 }}>
            ℹ️ Production Google OAuth requires client ID. For the 72-hour hackathon demo, choose any pre-seeded persona below:
          </p>
        ) : null}

        <h3 style={{ marginTop: 24, marginBottom: 12 }}>Select Demo Persona</h3>
        <div className="demo-users-grid">
          {DEMO_USERS.map((u) => (
            <div
              key={u.email}
              className="demo-user-card card"
              onClick={() => demo(u.email)}
              role="button"
              tabIndex={0}
            >
              <div className="demo-user-header">
                <strong>{u.label}</strong>
                <span className={`badge ${u.badge}`}>{u.role}</span>
              </div>
              <p className="demo-user-desc muted">{u.desc}</p>
              <span className="demo-user-action">Log in as {u.role} →</span>
            </div>
          ))}
        </div>

        {error ? <p className="badge badge-risk" style={{ marginTop: 16, width: "100%", textAlign: "center" }}>{error}</p> : null}
      </div>
    </main>
  );
}
