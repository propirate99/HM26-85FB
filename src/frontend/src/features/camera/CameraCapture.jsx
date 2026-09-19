import { useEffect, useRef, useState } from "react";
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
  const { videoRef, start, stop, snapshot, switchCamera, error, denied, loading, live } =
    useCamera();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("camera"); // "camera" | "upload" | "samples"
  const [capturing, setCapturing] = useState(false);
  const [sampleSelected, setSampleSelected] = useState("");

  useEffect(() => {
    if (activeTab === "camera") {
      start();
    } else {
      stop();
    }
  }, [activeTab, start, stop]);

  async function handleLiveCapture() {
    setCapturing(true);
    try {
      const blob = await snapshot();
      if (blob) {
        onCapture(blob);
      }
    } finally {
      setCapturing(false);
    }
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
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
          className={activeTab === "upload" ? "on" : ""}
          onClick={() => setActiveTab("upload")}
        >
          📁 Upload Photo
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {live ? (
                <span className="pill" style={{ background: "rgba(55, 211, 155, 0.15)", color: "#37d39b" }}>
                  ● Live Camera Feed Active
                </span>
              ) : loading ? (
                <span className="pill" style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" }}>
                  ⏳ Starting video feed…
                </span>
              ) : denied ? (
                <span className="pill" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                  ✕ Camera Blocked / Denied
                </span>
              ) : (
                <span className="pill" style={{ opacity: 0.7 }}>Camera standby</span>
              )}
            </div>
            {live && (
              <button
                className="btn btn-ghost"
                type="button"
                style={{ padding: "4px 10px", fontSize: "12px" }}
                onClick={switchCamera}
                title="Switch front/back camera"
              >
                🔄 Flip Camera
              </button>
            )}
          </div>

          <div
            className="camera-frame"
            style={{
              position: "relative",
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#0a0f0d",
              borderRadius: 14,
              border: "1px solid var(--line)",
              overflow: "hidden",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                maxHeight: 380,
                objectFit: "cover",
                display: live ? "block" : "none",
              }}
            />

            {!live && !denied && (
              <div style={{ textAlign: "center", padding: 24, color: "var(--fg-3)" }}>
                <p style={{ margin: "0 0 8px", fontSize: 28 }}>📷</p>
                <p style={{ margin: 0, fontSize: 13.5 }}>
                  {loading ? "Connecting to device camera…" : "Initializing live camera stream…"}
                </p>
              </div>
            )}

            {denied && (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 16px",
                  background: "rgba(239, 68, 68, 0.08)",
                  width: "100%",
                }}
              >
                <p style={{ margin: "0 0 6px", fontSize: 24 }}>🔒</p>
                <strong style={{ color: "#ef4444", fontSize: 14 }}>Camera Access Denied or Unavailable</strong>
                <p style={{ fontSize: 12.5, color: "var(--fg-3)", maxWidth: 360, margin: "6px auto 14px" }}>
                  Your browser or operating system blocked webcam access, or no webcam was detected.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-primary" type="button" onClick={() => start()}>
                    Retry Camera
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setActiveTab("upload")}
                  >
                    Use Photo Upload
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && !denied && (
            <p style={{ color: "#fbbf24", fontSize: 12.5, marginTop: 8 }}>
              ⚠️ {error} You can still take a snapshot or switch to File Upload.
            </p>
          )}

          <div className="row" style={{ marginTop: 14 }}>
            <button
              className="btn btn-gold"
              type="button"
              onClick={handleLiveCapture}
              disabled={!live || capturing}
              style={{ fontWeight: 700 }}
            >
              {capturing ? "Capturing…" : "📸 Capture Evidence"}
            </button>
            {denied && (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setActiveTab("upload")}
              >
                Switch to File Upload
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "upload" && (
        <div
          style={{
            border: "2px dashed var(--line)",
            borderRadius: 14,
            padding: "32px 20px",
            textAlign: "center",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
          <p style={{ fontSize: 32, margin: "0 0 10px" }}>📁</p>
          <h4 style={{ margin: "0 0 6px" }}>Select or Take Photo from Device</h4>
          <p style={{ fontSize: 12.5, color: "var(--fg-3)", maxWidth: 380, margin: "0 auto 16px" }}>
            Upload evidence directly from your device photo library or file storage. The AI integrity
            engine will review metadata and provenance.
          </p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Image File
          </button>
        </div>
      )}

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
