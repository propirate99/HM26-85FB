import { useState, useRef, useCallback, useEffect } from "react";

export function BeforeAfterSlider({ beforeUrl, afterUrl, beforeTitle = "Before (Reported)", afterTitle = "After (Resolution)", comparisonNote }) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clamped = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(clamped);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const onTouchMove = useCallback((e) => {
    if (!isDragging || !e.touches?.[0]) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp, onTouchMove]);

  return (
    <div className="before-after-container card">
      <div className="before-after-header">
        <h3>Resolution Evidence Verification</h3>
        <span className="badge badge-verified">✓ AI &amp; Officer Inspected</span>
      </div>
      {comparisonNote && (
        <p className="before-after-note">
          <strong>Verification Finding:</strong> {comparisonNote}
        </p>
      )}

      <div
        ref={containerRef}
        className="slider-viewport"
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches?.[0]) handleMove(e.touches[0].clientX);
        }}
      >
        {/* After Image (Background / Base) */}
        <img src={afterUrl} alt={afterTitle} className="slider-img" />
        <div className="slider-label after-label">{afterTitle}</div>

        {/* Before Image (Foreground / Clipped) */}
        <div
          className="slider-overlay"
          style={{ clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)` }}
        >
          <img src={beforeUrl} alt={beforeTitle} className="slider-img" />
          <div className="slider-label before-label">{beforeTitle}</div>
        </div>

        {/* Divider Handle */}
        <div className="slider-divider" style={{ left: `${position}%` }}>
          <div className="slider-handle">
            <span>‹ ›</span>
          </div>
        </div>
      </div>

      <div className="slider-hint">
        <span>◀ Slide to inspect before &amp; after resolution work ▶</span>
      </div>
    </div>
  );
}
