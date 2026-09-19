import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { BrandMark } from "../components/BrandMark.jsx";
import { swmApi } from "../services/swmApi.js";

function homeFor(user) {
  if (user?.role === "ZONE_OFFICER") return "/officer";
  if (user?.role === "MAIN_AUTHORITY") return "/admin";
  return "/app";
}

const DEMO = {
  civilian: { email: "anitha.r@example.in", name: "Anitha R" },
  officer: { email: "swm.officer@mysuru.gov.in", name: "SWM Officer" },
  admin: { email: "commissioner@mysuru.gov.in", name: "MCC Commissioner" },
};

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("civilian");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [ward, setWard] = useState("");
  const [code, setCode] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const wards = useMemo(() => {
    const data = swmApi.getStaticData().swmData;
    return (data?.wards || []).slice().sort((a, b) => a.ward - b.ward);
  }, []);

  async function signIn(targetEmail) {
    setError("");
    setBusy(true);
    try {
      const data = await authApi.demo(targetEmail);
      setUser(data.user);
      navigate(homeFor(data.user));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (role === "admin" && code && !/^MCC-/i.test(code)) {
      setError("Use an MCC officer code such as MCC-SWM-204.");
      return;
    }
    const mapped =
      role === "admin"
        ? DEMO.admin.email
        : role === "officer"
          ? DEMO.officer.email
          : DEMO.civilian.email;
    signIn(mapped);
  }

  const isOfficer = role !== "civilian";

  return (
    <main className="auth">
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
          <div className="role-seg" role="tablist" aria-label="Account type">
            <button
              type="button"
              role="tab"
              className={role === "civilian" ? "on" : ""}
              aria-selected={role === "civilian"}
              onClick={() => setRole("civilian")}
            >
              <span className="seg-t">Citizen</span>
              <span className="seg-s">Report &amp; track</span>
            </button>
            <button
              type="button"
              role="tab"
              className={isOfficer ? "on" : ""}
              aria-selected={isOfficer}
              onClick={() => setRole("admin")}
            >
              <span className="seg-t">MCC officer</span>
              <span className="seg-s">Operations console</span>
            </button>
          </div>

          <h2 id="authTitle">
            {role === "civilian" ? "Sign in to your citizen dashboard" : "Sign in to the MCC console"}
          </h2>
          <p className="sub">
            {role === "civilian"
              ? "Track every complaint you file and get an email the moment its status moves."
              : "Work the 65-ward queue, dispatch crews, and open the 600 TPD simulator."}
          </p>

          <div className="oauth">
            <button className="oauth-btn" type="button" onClick={() => signIn(DEMO.civilian.email)}>
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
              onClick={() => signIn(isOfficer ? DEMO.admin.email : DEMO.civilian.email)}
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
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="f">
              <span>
                Full name <em>(new here?)</em>
              </span>
              <input
                type="text"
                autoComplete="name"
                placeholder="As it should appear on complaints"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {role === "civilian" ? (
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
                <span>MCC officer code</span>
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
            <button className="btn wide" type="submit" disabled={busy}>
              {busy
                ? "Signing in…"
                : role === "civilian"
                  ? "Continue to citizen dashboard"
                  : "Continue to operations console"}
            </button>
          </form>

          <div className="demo">
            <span>Quick demo</span>
            <button className="link" type="button" onClick={() => signIn(DEMO.civilian.email)}>
              anitha.r@example.in
            </button>
            <button className="link" type="button" onClick={() => signIn(DEMO.officer.email)}>
              swm.officer@mysuru.gov.in
            </button>
            <button className="link" type="button" onClick={() => signIn(DEMO.admin.email)}>
              commissioner@mysuru.gov.in
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
