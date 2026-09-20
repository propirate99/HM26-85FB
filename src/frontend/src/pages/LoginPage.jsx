import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { BrandMark } from "../components/BrandMark.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { swmApi } from "../services/swmApi.js";

function homeFor(user) {
  if (!user) return "/dashboard";
  const role = String(user.role || "").toLowerCase();
  if (role === "main_authority" || role === "admin") return "/admin";
  if (role === "zone_officer" || role === "officer") return "/officer";
  return "/dashboard";
}

const DEMO = {
  civilian: { email: "ravi.citizen@mysuru.demo", name: "Ravi Kumar" },
  officer: { email: "swm.officer@mysuru.gov.in", name: "MCC SWM Officer" },
  northOfficer: { email: "ananya.officer@mysuru.gov.in", name: "Ananya Rao" },
  admin: { email: "commissioner@mysuru.gov.in", name: "MCC Commissioner" },
};

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("citizen"); // "citizen" | "officer"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [ward, setWard] = useState("");
  const [code, setCode] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isOfficerTab = activeTab === "officer";

  const wards = useMemo(() => {
    const data = swmApi.getStaticData().swmData;
    return (data?.wards || []).slice().sort((a, b) => a.ward - b.ward);
  }, []);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError("");
    if (tab === "officer") {
      if (!email || email === DEMO.civilian.email) {
        setEmail("swm.officer@mysuru.gov.in");
      }
    } else {
      if (email === "swm.officer@mysuru.gov.in" || email === DEMO.officer.email) {
        setEmail("");
      }
    }
  };

  async function signIn(targetEmail, targetName, targetAddress) {
    setError("");
    setBusy(true);
    try {
      const data = await authApi.demo(targetEmail, targetName, targetAddress);
      setUser(data.user);
      const targetPath = homeFor(data.user);
      navigate(targetPath, { replace: true, state: { user: data.user, profile: data.user } });
    } catch (err) {
      setError(err.message || "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (isOfficerTab && code && !/^MCC-/i.test(code)) {
      setError("Use an MCC officer code such as MCC-SWM-204.");
      return;
    }
    const entered = email.trim();
    const mapped =
      entered ||
      (isOfficerTab
        ? DEMO.officer.email
        : DEMO.civilian.email);
    const wardLabel = ward ? `Ward ${ward}, Mysuru` : undefined;

    if (password) {
      setBusy(true);
      try {
        const data = await authApi.login(mapped, password);
        setUser(data.user);
        const targetPath = homeFor(data.user);
        navigate(targetPath, { replace: true, state: { user: data.user, profile: data.user } });
      } catch (err) {
        setError(err.message || "Invalid email or password");
      } finally {
        setBusy(false);
      }
    } else {
      signIn(mapped, name.trim() || undefined, wardLabel);
    }
  }

  return (
    <main className="auth">
      {/* Top right floating theme toggle */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "20px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--surface)",
          padding: "4px 8px",
          borderRadius: "10px",
          border: "1px solid var(--line)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <ThemeToggle showLabel />
      </div>

      <section className="rail">
        <div className="rail-top">
          <BrandMark />
          <div>
            <h1>Mysuru Swachha Portal</h1>
            <p className="rail-sub">Mysuru City Corporation · Solid Waste Management Cell</p>
          </div>
        </div>
        <div className="rail-mid">
          <h2>One login. Two very different jobs.</h2>
          <p>
            Citizens report a black spot or a missed pickup and follow it to closure. MCC officers
            work the same complaint queue against SLA clocks and push the ward data into the 600 TPD
            logistics simulator.
          </p>
          <ul className="rail-list">
            <li>
              <b>65 wards</b> · 9 zonal offices mapped end to end
            </li>
            <li>
              <b>Email at every status change</b> — registered, assigned, in progress, resolved
            </li>
            <li>
              <b>SLA clocks</b> from 6 h for dead animal removal to 96 h for segregation notices
            </li>
          </ul>
        </div>
        <p className="rail-foot">
          Demonstration build. Sign-in is simulated locally — no credentials leave this device and no
          live MCC systems are touched. Browse the{" "}
          <Link to="/simulator">logistics simulator</Link> or{" "}
          <Link to="/operations">Swachha Grid</Link> without signing in.
        </p>
      </section>

      <section className="pane">
        <div className="auth-card" role="form" aria-labelledby="authTitle">
          {/* 1. Separate Login Experience: Tab selector at top of login card */}
          <div className="role-seg" role="tablist" aria-label="Portal Selection">
            <button
              type="button"
              role="tab"
              className={!isOfficerTab ? "on" : ""}
              aria-selected={!isOfficerTab}
              onClick={() => handleTabSwitch("citizen")}
            >
              <span className="seg-t">Citizen Login</span>
              <span className="seg-s">Report &amp; track</span>
            </button>
            <button
              type="button"
              role="tab"
              className={isOfficerTab ? "on" : ""}
              aria-selected={isOfficerTab}
              onClick={() => handleTabSwitch("officer")}
            >
              <span className="seg-t">MCC Official Portal</span>
              <span className="seg-s">Operations console</span>
            </button>
          </div>

          {/* Dynamic Heading & Subheading */}
          <h2 id="authTitle">
            {isOfficerTab ? "MCC Officer Operations Login" : "Sign in to your citizen dashboard"}
          </h2>
          <p className="sub">
            {isOfficerTab
              ? "Work the 65-ward operations queue, dispatch sanitation crews, and command the 600 TPD simulator."
              : "Track every complaint you file and get an email the moment its status moves."}
          </p>

          <div className="oauth">
            <button className="oauth-btn" type="button" onClick={() => signIn(isOfficerTab ? DEMO.officer.email : DEMO.civilian.email)}>
              <svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.34A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.95 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.09l2.99-2.34z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z" />
              </svg>
              Continue with Google
            </button>
            <button
              className="oauth-btn"
              type="button"
              onClick={() => signIn(isOfficerTab ? DEMO.officer.email : DEMO.civilian.email)}
            >
              <svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true" fill="currentColor">
                <path d="M12.3 9.53c.02 2.2 1.93 2.93 1.95 2.94-.02.05-.31 1.06-1.02 2.1-.61.9-1.25 1.79-2.26 1.81-.99.02-1.31-.59-2.44-.59-1.14 0-1.49.57-2.43.6-.97.04-1.71-.95-2.33-1.84C2.5 12.73 1.53 9.3 2.84 7c.65-1.17 1.8-1.9 3.06-1.92.96-.02 1.86.65 2.44.65.58 0 1.68-.8 2.83-.69.48.02 1.84.18 2.7 1.32-.07.05-1.62.94-1.6 2.8M10.6 3.2c.52-.63.87-1.5.77-2.37-.76.03-1.68.5-2.22 1.14-.49.56-.9 1.46-.79 2.31.85.07 1.72-.43 2.24-1.08" />
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="or">
            <span>or use your email</span>
          </div>

          <form onSubmit={submit} noValidate>
            <label className="f">
              <span>
                {isOfficerTab ? "Official Government Email" : "Email address"}
              </span>
              <input
                type="email"
                autoComplete="email"
                placeholder={isOfficerTab ? "swm.officer@mysuru.gov.in" : "you@example.in"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {isOfficerTab && (
                <small style={{ color: "var(--accent)", fontSize: "11px", marginTop: "2px" }}>
                  💡 Pre-filled / suggested: swm.officer@mysuru.gov.in
                </small>
              )}
            </label>

            <label className="f">
              <span>Password (optional for demo)</span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="f">
              <span>
                Full name <em>(new here?)</em>
              </span>
              <input
                type="text"
                autoComplete="name"
                placeholder={isOfficerTab ? "e.g. SWM Operations Lead" : "As it should appear on complaints"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            {!isOfficerTab ? (
              <label className="f">
                <span>Home ward</span>
                <select value={ward} onChange={(e) => setWard(e.target.value)}>
                  <option value="">Select ward</option>
                  {wards.map((w) => (
                    <option key={w.ward} value={w.ward}>
                      W{w.ward} · {w.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="f">
                <span>MCC officer authorization code (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. MCC-SWM-204"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            )}

            <label className="chk">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Email me on every complaint status change
            </label>

            {error ? <p className="err">{error}</p> : null}

            {/* Dynamic Submission Button */}
            <button className="btn wide" type="submit" disabled={busy}>
              {busy
                ? "Signing in…"
                : isOfficerTab
                  ? "Enter MCC Officer Console"
                  : "Continue to citizen dashboard"}
            </button>
          </form>

          <div className="demo">
            <span>Quick demo accounts</span>
            <button className="link" type="button" onClick={() => signIn(DEMO.civilian.email, DEMO.civilian.name)}>
              ravi.citizen@mysuru.demo (Citizen)
            </button>
            <button className="link" type="button" onClick={() => signIn(DEMO.officer.email, DEMO.officer.name)}>
              swm.officer@mysuru.gov.in (MCC Officer)
            </button>
            <button className="link" type="button" onClick={() => signIn(DEMO.northOfficer.email, DEMO.northOfficer.name)}>
              ananya.officer@mysuru.gov.in (North Zone)
            </button>
            <button className="link" type="button" onClick={() => signIn(DEMO.admin.email, DEMO.admin.name)}>
              commissioner@mysuru.gov.in (Admin)
            </button>
          </div>

          <p className="legal">
            By continuing you agree that complaint details and photographs may be shared with the
            ward sanitary inspector and the zonal office handling your request.
          </p>
        </div>
      </section>
    </main>
  );
}
