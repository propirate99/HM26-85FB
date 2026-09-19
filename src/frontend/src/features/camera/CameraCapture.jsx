import { useEffect, useState } from "react";
import { useCamera } from "./useCamera.js";

function generateSampleCivicBlob(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  if (type === "garbage") {
    // Mysuru Waste / Black Spot
    const bg = ctx.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, "#4a5d53");
    bg.addColorStop(0.5, "#2a3b34");
    bg.addColorStop(1, "#17221d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 960, 720);

    // Street curb
    ctx.fillStyle = "#717d74";
    ctx.fillRect(0, 480, 960, 240);
    ctx.fillStyle = "#f59e0b"; // Mysore yellow curb marks
    for (let x = 0; x < 960; x += 120) {
      ctx.fillRect(x, 480, 60, 25);
    }

    // Waste pile graphic
    ctx.fillStyle = "#3d3023";
    ctx.beginPath();
    ctx.ellipse(480, 520, 280, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e40af"; // blue plastic bags
    ctx.beginPath();
    ctx.arc(420, 490, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#eab308"; // yellow packaging
    ctx.beginPath();
    ctx.arc(520, 510, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#dc2626"; // red debris
    ctx.beginPath();
    ctx.arc(480, 470, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("MYSURU CITY CORPORATION - FIELD SWACHHA AUDIT", 40, 60);
    ctx.font = "18px monospace";
    ctx.fillStyle = "#37d39b";
    ctx.fillText(`LOC: Vidyaranyapuram Ward 48 [12.2892° N, 76.6431° E] | ${timestamp}`, 40, 95);
    ctx.fillText("ISSUE: Unsegregated Solid Waste Black Spot Accumulation", 40, 125);
  } else if (type === "pothole") {
    // Road Pothole
    const bg = ctx.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, "#334155");
    bg.addColorStop(1, "#1e293b");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 960, 720);

    // Asphalt texture
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(480, 440, 260, 140, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(480, 440, 160, 0, Math.PI * 2);
    ctx.fill();

    // Road white stripe
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(450, 0, 30, 200);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("MCC INFRASTRUCTURE DEFECT REPORT", 40, 60);
    ctx.font = "18px monospace";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`LOC: KRS Road, Gokulam 3rd Stage [12.3321° N, 76.6210° E] | ${timestamp}`, 40, 95);
    ctx.fillText("ISSUE: Surface Bitumen Failure & Deep Waterlogged Pothole", 40, 125);
  } else {
    // Streetlight or Drain
    const bg = ctx.createLinearGradient(0, 0, 0, 720);
    bg.addColorStop(0, "#09121a");
    bg.addColorStop(1, "#030712");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 960, 720);

    // Lamp post silhouette
    ctx.fillStyle = "#64748b";
    ctx.fillRect(520, 120, 22, 600);
    ctx.beginPath();
    ctx.arc(531, 120, 50, 0, Math.PI, true);
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("⚠️ NON-OPERATIONAL FIXTURE", 460, 90);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("MCC ELECTRICAL WARD GRID VERIFICATION", 40, 60);
    ctx.font = "18px monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`LOC: Sayyaji Rao Road [12.3150° N, 76.6500° E] | ${timestamp}`, 40, 95);
    ctx.fillText("ISSUE: Streetlight Dark Spot - Junction Feed Cable Disconnected", 40, 125);
  }

  // Common HUD border overlay
  ctx.strokeStyle = "rgba(55, 211, 155, 0.4)";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 920, 680);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

export function CameraCapture({ onCapture }) {
  const {
    videoRef,
    start,
    stop,
    startSimulation,
    snapshot,
    switchCamera,
    facingMode,
    error,
    denied,
    loading,
    live,
    isSimulated,
    devices,
    selectedDeviceId,
    selectDevice,
  } = useCamera();

  const [activeTab, setActiveTab] = useState("camera"); // "camera" | "samples"
  const [capturing, setCapturing] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [sampleSelected, setSampleSelected] = useState("");

  // Start/Stop camera on tab toggle
  useEffect(() => {
    if (activeTab === "camera") {
      start();
    } else {
      stop();
    }
    return () => {
      stop();
    };
  }, [activeTab]);

  async function handleLiveCapture() {
    if (capturing) return;
    setCapturing(true);
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 220);

    try {
      const blob = await snapshot();
      if (blob) {
        onCapture(blob);
      }
    } catch (err) {
      console.error("Snapshot failed:", err);
    } finally {
      setCapturing(false);
    }
  }

  async function handleSample(type, label) {
    setSampleSelected(label);
    const blob = await generateSampleCivicBlob(type);
    if (blob) {
      onCapture(blob);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Evidence Source Switcher */}
      <div className="seg" style={{ alignSelf: "flex-start" }}>
        <button
          type="button"
          className={activeTab === "camera" ? "on" : ""}
          onClick={() => setActiveTab("camera")}
        >
          📷 Live Camera
        </button>
        <button
          type="button"
          className={activeTab === "samples" ? "on" : ""}
          onClick={() => setActiveTab("samples")}
        >
          ⚡ Sample Field Evidence
        </button>
      </div>

      {activeTab === "camera" && (
        <div>
          {/* Status and Controls Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {live && !isSimulated && (
                <span
                  className="pill"
                  style={{
                    background: "rgba(55, 211, 155, 0.15)",
                    color: "#37d39b",
                    border: "1px solid rgba(55, 211, 155, 0.3)",
                    fontWeight: 600,
                  }}
                >
                  ● Live Camera Feed (Hardware)
                </span>
              )}
              {live && isSimulated && (
                <span
                  className="pill"
                  style={{
                    background: "rgba(168, 85, 247, 0.15)",
                    color: "#c084fc",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                    fontWeight: 600,
                  }}
                >
                  ● Live Civic Audit Stream (Simulator)
                </span>
              )}
              {loading && (
                <span
                  className="pill"
                  style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", fontWeight: 600 }}
                >
                  ⏳ Initializing camera stream…
                </span>
              )}
              {denied && !live && (
                <span
                  className="pill"
                  style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", fontWeight: 600 }}
                >
                  ✕ Camera Blocked / Denied
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => selectDevice(e.target.value)}
                  style={{
                    background: "var(--surface)",
                    color: "var(--fg)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 12,
                  }}
                  title="Choose input camera"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {live && (
                <button
                  className="btn btn-ghost"
                  type="button"
                  style={{ padding: "4px 10px", fontSize: "12px" }}
                  onClick={switchCamera}
                  title="Switch camera mode or angle"
                >
                  🔄 {isSimulated ? "Use Physical Camera" : facingMode === "environment" ? "Front Camera" : "Rear Camera"}
                </button>
              )}

              {!isSimulated && (
                <button
                  className="btn btn-ghost"
                  type="button"
                  style={{ padding: "4px 10px", fontSize: "12px", color: "#c084fc" }}
                  onClick={() => startSimulation()}
                  title="Test using live simulated video feed"
                >
                  ⚡ Simulate Feed
                </button>
              )}

              {isSimulated && (
                <button
                  className="btn btn-ghost"
                  type="button"
                  style={{ padding: "4px 10px", fontSize: "12px", color: "#37d39b" }}
                  onClick={() => start()}
                  title="Switch back to real hardware webcam"
                >
                  📷 Hardware Camera
                </button>
              )}
            </div>
          </div>

          {/* Viewfinder Frame */}
          <div
            className="camera-frame"
            style={{
              position: "relative",
              minHeight: 280,
              maxHeight: 420,
              aspectRatio: "16 / 9",
              background: "#080e0b",
              borderRadius: 16,
              border: "1px solid rgba(55, 211, 155, 0.25)",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Always-mounted Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />

            {/* Shutter Flash Animation */}
            {shutterFlash && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                  opacity: 0.85,
                  zIndex: 10,
                  transition: "opacity 0.2s ease-out",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* HUD Reticle Overlay when stream is live */}
            {live && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: 16,
                }}
              >
                {/* Top Corner Brackets */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderTop: "3px solid #37d39b",
                      borderLeft: "3px solid #37d39b",
                    }}
                  />
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderTop: "3px solid #37d39b",
                      borderRight: "3px solid #37d39b",
                    }}
                  />
                </div>

                {/* Center Crosshair Reticle */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 44,
                    height: 44,
                    border: "1px dashed rgba(55, 211, 155, 0.7)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#37d39b",
                      boxShadow: "0 0 8px #37d39b",
                    }}
                  />
                </div>

                {/* Bottom Corner Brackets and Live Watermark */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderBottom: "3px solid #37d39b",
                      borderLeft: "3px solid #37d39b",
                    }}
                  />
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.65)",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "#37d39b",
                      border: "1px solid rgba(55, 211, 155, 0.3)",
                    }}
                  >
                    MCC CIVIC SWACHHA AUDIT • REAL-TIME EVIDENCE
                  </div>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderBottom: "3px solid #37d39b",
                      borderRight: "3px solid #37d39b",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Standby / Initializing Overlay */}
            {!live && !denied && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(10, 16, 13, 0.96)",
                  padding: 24,
                  textAlign: "center",
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "rgba(55, 211, 155, 0.12)",
                    border: "2px solid #37d39b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    marginBottom: 14,
                    animation: loading ? "pulse 1.5s infinite" : "none",
                  }}
                >
                  📷
                </div>
                <strong style={{ fontSize: 15, color: "var(--fg)" }}>
                  {loading ? "Connecting to Device Camera…" : "Camera Inactive"}
                </strong>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--fg-3)",
                    maxWidth: 380,
                    margin: "8px 0 16px",
                  }}
                >
                  {loading
                    ? "Requesting hardware permission from browser. If prompted, please click Allow."
                    : "Click below to initialize your device webcam or launch the simulated live stream."}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button className="btn btn-primary" type="button" onClick={() => start()}>
                    Start Camera
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => startSimulation()}>
                    ⚡ Launch Live Simulator
                  </button>
                </div>
              </div>
            )}

            {/* Denied / Blocked Overlay */}
            {denied && !live && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(20, 12, 12, 0.97)",
                  padding: 24,
                  textAlign: "center",
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "2px solid #ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    marginBottom: 12,
                  }}
                >
                  🔒
                </div>
                <strong style={{ color: "#ef4444", fontSize: 15 }}>
                  Camera Hardware Access Blocked or Not Found
                </strong>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--fg-3)",
                    maxWidth: 420,
                    margin: "8px auto 16px",
                    lineHeight: 1.5,
                  }}
                >
                  {error ||
                    "Browser or operating system blocked camera access, or no webcam was detected on this device. You can use the Live Simulator to capture live evidence."}
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" type="button" onClick={() => start()}>
                    Retry Camera
                  </button>
                  <button
                    className="btn btn-gold"
                    type="button"
                    onClick={() => startSimulation()}
                    style={{ fontWeight: 700 }}
                  >
                    ⚡ Enable Live Simulator
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && !denied && (
            <p
              style={{
                color: "#fbbf24",
                fontSize: 12.5,
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          )}

          {/* Primary Action Button */}
          <div className="row" style={{ marginTop: 14, alignItems: "center" }}>
            <button
              className="btn btn-gold"
              type="button"
              onClick={handleLiveCapture}
              disabled={!live || capturing}
              style={{ fontWeight: 700, padding: "10px 22px", fontSize: 14 }}
            >
              {capturing ? "Capturing Evidence…" : "📸 Capture Evidence Snapshot"}
            </button>

            {!live && (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => startSimulation()}
                style={{ color: "#c084fc" }}
              >
                ⚡ Start Live Simulator
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sample Field Evidence Tab */}
      {activeTab === "samples" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="note-box" style={{ margin: 0 }}>
            💡 <strong>Instant Field Simulator</strong>: Select a realistic Mysuru municipal scenario below to generate verified evidence without camera hardware:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            <button
              className="btn btn-ghost"
              type="button"
              style={{
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "14px 16px",
                borderRadius: 12,
                border: sampleSelected === "Garbage" ? "1px solid var(--accent)" : "1px solid var(--line)",
              }}
              onClick={() => handleSample("garbage", "Garbage")}
            >
              <strong style={{ color: "#37d39b" }}>🗑️ Mysuru Black Spot Waste</strong>
              <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                Vidyaranyapuram Ward 48 • Plastic & organic dump
              </span>
            </button>

            <button
              className="btn btn-ghost"
              type="button"
              style={{
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "14px 16px",
                borderRadius: 12,
                border: sampleSelected === "Pothole" ? "1px solid var(--accent)" : "1px solid var(--line)",
              }}
              onClick={() => handleSample("pothole", "Pothole")}
            >
              <strong style={{ color: "#fbbf24" }}>🕳️ Road Pothole Defect</strong>
              <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                KRS Road, Gokulam • Monsoon bitumen crater
              </span>
            </button>

            <button
              className="btn btn-ghost"
              type="button"
              style={{
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "14px 16px",
                borderRadius: 12,
                border: sampleSelected === "Streetlight" ? "1px solid var(--accent)" : "1px solid var(--line)",
              }}
              onClick={() => handleSample("streetlight", "Streetlight")}
            >
              <strong style={{ color: "#38bdf8" }}>💡 Streetlight Dark Zone</strong>
              <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                Sayyaji Rao Road • Lamp post disconnected
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
