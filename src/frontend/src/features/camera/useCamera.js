import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera(initialFacingMode = "environment") {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facingMode, setFacingMode] = useState(initialFacingMode);

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      setStream(null);
    }
  }, [stream]);

  const start = useCallback(async (requestedFacingMode = facingMode) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API is not supported in this browser. Please use file upload.");
      setDenied(true);
      return;
    }

    setLoading(true);
    setError("");

    // Stop existing tracks if any
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    let mediaStream = null;

    // 1. Try preferred facing mode
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: requestedFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err1) {
      // 2. Fallback to generic video constraint (critical for desktops / external webcams)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2) {
        setDenied(true);
        setLoading(false);
        const isPermission =
          err2.name === "NotAllowedError" ||
          err2.name === "PermissionDeniedError" ||
          err2.message?.toLowerCase().includes("denied");
        setError(
          isPermission
            ? "Camera permission was denied. You can allow camera in browser settings or use photo upload below."
            : `Camera unavailable (${err2.message || err2.name}). Use photo upload below.`
        );
        return;
      }
    }

    if (!mediaStream) {
      setLoading(false);
      return;
    }

    setStream(mediaStream);
    setDenied(false);
    setLoading(false);

    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = mediaStream;
      video.onloadedmetadata = () => {
        video.play().catch(() => {
          // Autoplay policy fallback
        });
      };
      // Explicit play attempt in case metadata already loaded
      video.play().catch(() => {});
    }
  }, [facingMode, stream]);

  const switchCamera = useCallback(async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    await start(nextMode);
  }, [facingMode, start]);

  const snapshot = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return null;

    // If video not ready yet, wait briefly
    if (video.readyState < 2 && video.videoWidth === 0) {
      await new Promise((res) => setTimeout(res, 200));
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Mirror if user-facing
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    start,
    stop,
    snapshot,
    switchCamera,
    facingMode,
    error,
    denied,
    loading,
    live: Boolean(stream && stream.active),
  };
}
