import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  const start = useCallback(async () => {
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(media);
      setDenied(false);
      if (videoRef.current) videoRef.current.srcObject = media;
    } catch (err) {
      setDenied(true);
      setError(err.message || "Camera permission denied.");
    }
  }, []);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, [stream]);

  const snapshot = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, start, stop, snapshot, error, denied, live: Boolean(stream) };
}
