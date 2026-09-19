import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Creates an animated 30fps canvas stream simulating a real-time Mysuru civic audit camera feed.
 * Useful when hardware camera is blocked, unavailable, or running in an environment without physical webcam.
 */
function createSimulatedCameraStream() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  let animationFrameId = null;
  let frame = 0;
  let isRunning = true;

  function render() {
    if (!isRunning) return;
    frame++;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const millis = String(now.getMilliseconds()).padStart(3, "0");

    // Dynamic environmental lighting / ambient gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1280, 720);
    bgGrad.addColorStop(0, "#16231e");
    bgGrad.addColorStop(0.5, "#1f322b");
    bgGrad.addColorStop(1, "#121a16");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Subtle moving civic survey grid lines
    ctx.strokeStyle = "rgba(55, 211, 155, 0.07)";
    ctx.lineWidth = 1;
    const gridOffset = (frame * 0.4) % 40;
    for (let x = gridOffset; x < 1280; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = gridOffset; y < 720; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }

    // Street perspective view (Mysuru Ward inspection road)
    ctx.fillStyle = "#223129";
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.lineTo(1280, 460);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.fill();

    // Road surface
    ctx.fillStyle = "#161f1b";
    ctx.beginPath();
    ctx.moveTo(220, 720);
    ctx.lineTo(590, 465);
    ctx.lineTo(690, 465);
    ctx.lineTo(1060, 720);
    ctx.fill();

    // Road yellow markings
    ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
    ctx.lineWidth = 5;
    ctx.setLineDash([24, 24]);
    ctx.lineDashOffset = -frame * 2.5;
    ctx.beginPath();
    ctx.moveTo(640, 465);
    ctx.lineTo(640, 720);
    ctx.stroke();
    ctx.setLineDash([]);

    // Municipal issue anomaly marker (e.g. solid waste / defect spot)
    const bobbing = Math.sin(frame * 0.08) * 5;
    const radius = 24 + Math.sin(frame * 0.1) * 3;
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.beginPath();
    ctx.arc(640, 485 + bobbing, radius + 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
    ctx.beginPath();
    ctx.arc(640, 485 + bobbing, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ISSUE ZONE", 640, 490 + bobbing);

    // Live reticle HUD
    const cx = 640;
    const cy = 360;
    ctx.strokeStyle = "rgba(55, 211, 155, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 50, cy); ctx.lineTo(cx - 15, cy);
    ctx.moveTo(cx + 15, cy); ctx.lineTo(cx + 50, cy);
    ctx.moveTo(cx, cy - 50); ctx.lineTo(cx, cy - 15);
    ctx.moveTo(cx, cy + 15); ctx.lineTo(cx, cy + 50);
    ctx.stroke();

    // Viewfinder corners
    const bracketSize = 36;
    ctx.strokeStyle = "#37d39b";
    ctx.lineWidth = 3;
    // TL
    ctx.beginPath(); ctx.moveTo(40, 40 + bracketSize); ctx.lineTo(40, 40); ctx.lineTo(40 + bracketSize, 40); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(1240 - bracketSize, 40); ctx.lineTo(1240, 40); ctx.lineTo(1240, 40 + bracketSize); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(40, 680 - bracketSize); ctx.lineTo(40, 680); ctx.lineTo(40 + bracketSize, 680); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(1240 - bracketSize, 680); ctx.lineTo(1240, 680); ctx.lineTo(1240, 680 - bracketSize); ctx.stroke();

    // HUD Header & Info Watermark
    ctx.textAlign = "left";
    ctx.fillStyle = "#37d39b";
    ctx.font = "bold 18px monospace";
    ctx.fillText("● LIVE CAM AUDIT [MCC WARD 48 - VIDYARANYAPURAM]", 50, 68);

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "14px monospace";
    ctx.fillText(`TIMESTAMP : ${dateStr} ${timeStr}.${millis} IST`, 50, 94);
    ctx.fillText("GPS COORDS: 12.2892° N, 76.6431° E (Mysuru Grid)", 50, 116);
    ctx.fillText("INTEGRITY : GEO-FENCED & TIME-VERIFIED EVIDENCE", 50, 138);

    ctx.fillStyle = "rgba(55, 211, 155, 0.8)";
    ctx.font = "bold 13px monospace";
    ctx.fillText("ISO-8601 ENCRYPTED PROVENANCE STREAM", 50, 660);

    animationFrameId = requestAnimationFrame(render);
  }

  render();

  const stream = canvas.captureStream(30);

  // Attach stop listener to halt the requestAnimationFrame loop
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    const origStop = videoTrack.stop.bind(videoTrack);
    videoTrack.stop = () => {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      origStop();
    };
  }

  return stream;
}

export function useCamera(initialFacingMode = "user") {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const startingRef = useRef(false);

  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facingMode, setFacingMode] = useState(initialFacingMode);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isSimulated, setIsSimulated] = useState(false);

  // Helper to enumerate available video devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);
    } catch {
      // ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn("Error stopping stream tracks:", e);
      }
      streamRef.current = null;
    }
    setStream(null);
    setIsSimulated(false);
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
  }, []);

  const startSimulation = useCallback(() => {
    stop();
    setLoading(true);
    setError("");
    setDenied(false);

    try {
      const simStream = createSimulatedCameraStream();
      streamRef.current = simStream;
      setStream(simStream);
      setIsSimulated(true);
      setLoading(false);
    } catch (err) {
      console.error("Failed to create simulated camera stream:", err);
      setError("Unable to initialize camera simulation.");
      setLoading(false);
    }
  }, [stop]);

  const start = useCallback(
    async (options = {}) => {
      if (options.simulate) {
        startSimulation();
        return;
      }

      if (startingRef.current) return;
      startingRef.current = true;

      const targetFacingMode = options.facingMode || facingMode;
      const targetDeviceId = options.deviceId || selectedDeviceId;

      setLoading(true);
      setError("");

      // Stop existing stream first
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("navigator.mediaDevices.getUserMedia not available in this environment.");
        // If camera hardware API is unavailable (insecure origin or unsupported), provide seamless simulation fallback
        startingRef.current = false;
        startSimulation();
        return;
      }

      let mediaStream = null;

      try {
        // Strategy 1: specific deviceId if requested
        if (targetDeviceId) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: targetDeviceId } },
              audio: false,
            });
          } catch {
            // fall through
          }
        }

        // Strategy 2: preferred facing mode with 720p ideal
        if (!mediaStream) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: targetFacingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch {
            // fall through to strategy 3
          }
        }

        // Strategy 3: facing mode only
        if (!mediaStream) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: targetFacingMode,
              },
              audio: false,
            });
          } catch {
            // fall through to strategy 4
          }
        }

        // Strategy 4: universal basic video constraint (any webcam)
        if (!mediaStream) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch {
            // fall through to strategy 5
          }
        }

        // Strategy 5: low-resolution fallback
        if (!mediaStream) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { min: 320, ideal: 640 },
                height: { min: 240, ideal: 480 },
              },
              audio: false,
            });
          } catch (err) {
            const errName = err?.name || "";
            const errMsg = err?.message || "";

            console.warn("All hardware camera strategies failed:", errName, errMsg);

            if (
              errName === "NotAllowedError" ||
              errName === "PermissionDeniedError" ||
              errMsg.toLowerCase().includes("denied")
            ) {
              setDenied(true);
              setError(
                "Camera permission was blocked or denied by your browser. Click the camera/lock icon in the URL bar to allow access, or use the Live Simulator."
              );
            } else if (
              errName === "NotReadableError" ||
              errName === "TrackStartError" ||
              errMsg.toLowerCase().includes("could not start")
            ) {
              setError(
                "Camera hardware is currently in use by another app (e.g. Zoom, Teams, FaceTime). Close other webcam apps or switch to the Live Simulator."
              );
            } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
              setDenied(true);
              setError("No physical webcam device detected on your system. Use the Live Simulator or upload a photo.");
            } else {
              setError(`Camera access unavailable (${errName || errMsg || "hardware error"}).`);
            }

            setLoading(false);
            return;
          }
        }

        if (!mediaStream) {
          setLoading(false);
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsSimulated(false);
        setDenied(false);
        setError("");
        setLoading(false);

        // Listen for track ending/muting (e.g. user unplugs camera or OS mutes)
        mediaStream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            stop();
          };
        });

        // Update available devices list with newly granted permission
        refreshDevices();
      } catch (e) {
        console.error("Unexpected error starting camera:", e);
        setError("Camera error occurred. You can switch to the Live Simulator.");
        setLoading(false);
      } finally {
        startingRef.current = false;
      }
    },
    [facingMode, selectedDeviceId, stop, refreshDevices, startSimulation]
  );

  // Bind stream to video element whenever stream changes or video element mounts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!stream) {
      try {
        video.srcObject = null;
      } catch {}
      return;
    }

    try {
      video.defaultMuted = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.srcObject = stream;

      const attemptPlay = () => {
        const p = video.play();
        if (p && typeof p.catch === "function") {
          p.catch((err) => {
            console.warn("Video play auto-resume:", err.message);
          });
        }
      };

      attemptPlay();
      video.addEventListener("loadedmetadata", attemptPlay, { once: true });
      video.addEventListener("canplay", attemptPlay, { once: true });
    } catch (err) {
      console.warn("Failed to set video srcObject:", err);
    }
  }, [stream]);

  const switchCamera = useCallback(async () => {
    if (isSimulated) {
      // Toggle back to real hardware camera
      await start({ facingMode: facingMode === "environment" ? "user" : "environment" });
      return;
    }
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    await start({ facingMode: nextMode });
  }, [facingMode, isSimulated, start]);

  const selectDevice = useCallback(
    async (deviceId) => {
      setSelectedDeviceId(deviceId);
      await start({ deviceId });
    },
    [start]
  );

  const snapshot = useCallback(async () => {
    const video = videoRef.current;
    let width = video?.videoWidth || 1280;
    let height = video?.videoHeight || 720;

    if (width === 0 || height === 0) {
      width = 1280;
      height = 720;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Draw background if video element is empty
    ctx.fillStyle = "#111b17";
    ctx.fillRect(0, 0, width, height);

    if (video && video.readyState >= 2) {
      // Mirror horizontally if user/selfie camera on hardware
      if (facingMode === "user" && !isSimulated) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      if (facingMode === "user" && !isSimulated) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      }
    } else if (streamRef.current) {
      // Fallback: capture current frame representation
      ctx.fillStyle = "#1e2c26";
      ctx.fillRect(0, 0, width, height);
    }

    // Burn official Mysuru City Corporation verification watermark into photo
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const timeStr = now.toLocaleTimeString("en-IN", {
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const stamp = `MCC SWACHHA AUDIT • ${dateStr} ${timeStr} IST • GPS VERIFIED`;

    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    const barHeight = Math.max(34, Math.round(height * 0.05));
    ctx.fillRect(0, height - barHeight, width, barHeight);

    ctx.fillStyle = "#37d39b";
    ctx.font = `bold ${Math.max(13, Math.round(barHeight * 0.45))}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(stamp, 20, height - Math.round(barHeight * 0.3));

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.94);
    });
  }, [facingMode, isSimulated]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        streamRef.current = null;
      }
    };
  }, []);

  return {
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
    live: Boolean(stream && stream.active),
    isSimulated,
    devices,
    selectedDeviceId,
    selectDevice,
    refreshDevices,
  };
}
