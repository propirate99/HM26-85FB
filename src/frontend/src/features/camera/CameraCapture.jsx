import { useEffect } from "react";
import { useCamera } from "./useCamera.js";

export function CameraCapture({ onCapture }) {
  const { videoRef, start, snapshot, error, denied, live } = useCamera();

  useEffect(() => {
    start();
  }, [start]);

  async function take() {
    const blob = await snapshot();
    if (blob) onCapture(blob);
  }

  return (
    <div>
      <p>
        Capture a new photo in this app. Existing gallery uploads are disabled for this report.
      </p>
      <div className="camera-frame">
        <video ref={videoRef} autoPlay playsInline muted />
      </div>
      {error ? <p className="muted">{error} The report can still be submitted for manual review.</p> : null}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-gold" type="button" onClick={take} disabled={!live}>
          Capture evidence
        </button>
        {denied ? (
          <button className="btn btn-ghost" type="button" onClick={start}>
            Retry camera
          </button>
        ) : null}
      </div>
    </div>
  );
}
