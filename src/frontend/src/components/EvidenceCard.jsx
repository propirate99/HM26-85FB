import { useState } from "react";
import { mediaUrl } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";

export function EvidenceCard({ evidence }) {
  const [zoomed, setZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!evidence) return null;

  const url = mediaUrl(evidence.publicUrl);
  const coords = evidence.location?.coordinates;
  const isBefore = evidence.type === "BEFORE";

  return (
    <>
      <article
        className="card evidence-card"
        style={{
          background: "linear-gradient(180deg, rgba(22, 34, 31, 0.8) 0%, rgba(13, 21, 19, 0.9) 100%)",
          border: "1px solid rgba(55, 211, 155, 0.2)",
          borderRadius: 14,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          transition: "transform 0.2s ease, border-color 0.2s ease",
        }}
      >
        {/* Photo Container */}
        <div
          onClick={() => !imgError && setZoomed(true)}
          style={{
            position: "relative",
            width: "100%",
            height: 220,
            borderRadius: 10,
            overflow: "hidden",
            background: "#080e0c",
            cursor: imgError ? "default" : "zoom-in",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={imgError ? "Evidence recorded" : "Click to view high-resolution photo"}
        >
          {!imgError ? (
            <img
              src={url}
              alt={`${evidence.type} evidence`}
              onError={() => setImgError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 20, color: "var(--fg-3)" }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 6 }}>📷</span>
              <strong style={{ fontSize: 13, color: "var(--fg)" }}>Civic Evidence Record</strong>
              <p style={{ margin: "4px 0 0", fontSize: 11 }}>In-App Camera Capture Logged</p>
            </div>
          )}

          {/* Top Badges */}
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              gap: 6,
              zIndex: 2,
            }}
          >
            <span
              style={{
                background: isBefore ? "rgba(239, 68, 68, 0.85)" : "rgba(55, 211, 155, 0.85)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                backdropFilter: "blur(4px)",
                textTransform: "uppercase",
              }}
            >
              {isBefore ? "Before Evidence" : "Resolution Evidence"}
            </span>

            {evidence.capturedThroughApp && (
              <span
                style={{
                  background: "rgba(10, 16, 14, 0.8)",
                  color: "#37d39b",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(55, 211, 155, 0.4)",
                  backdropFilter: "blur(4px)",
                }}
              >
                ● Live Camera Verified
              </span>
            )}
          </div>

          {/* Zoom hint icon */}
          {!imgError && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                background: "rgba(0, 0, 0, 0.65)",
                color: "#fff",
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 4,
                zIndex: 2,
              }}
            >
              🔍 View Photo
            </div>
          )}
        </div>

        {/* Evidence Metadata */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: 13, color: "var(--fg)" }}>{evidence.evidenceId}</strong>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
              {formatDate(evidence.capturedAt || evidence.createdAt)}
            </span>
          </div>

          {coords && coords.length >= 2 && (
            <div style={{ fontSize: 11, color: "#37d39b", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <span>📍</span>
              <span>
                {coords[1]?.toFixed(5)}°N, {coords[0]?.toFixed(5)}°E
                {evidence.locationAccuracyMeters ? ` (±${Math.round(evidence.locationAccuracyMeters)}m)` : ""}
              </span>
            </div>
          )}

          {evidence.aiAssessment && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {evidence.aiAssessment.relevance && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(55, 211, 155, 0.15)",
                    color: "#37d39b",
                  }}
                >
                  Authentic Defect
                </span>
              )}
              {evidence.aiAssessment.syntheticRisk === "LOW" && (
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                  }}
                >
                  Camera Verified
                </span>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Lightbox / Zoom Modal */}
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "min(880px, 95vw)",
              background: "#16221f",
              borderRadius: 16,
              border: "1px solid rgba(55, 211, 155, 0.4)",
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--line-soft)",
              }}
            >
              <div>
                <strong style={{ fontSize: 14 }}>
                  📸 Evidence Photo · {evidence.evidenceId} ({evidence.type})
                </strong>
                {coords && coords.length >= 2 && (
                  <div style={{ fontSize: 11, color: "#37d39b", marginTop: 2 }}>
                    📍 GPS: {coords[1]?.toFixed(5)}°N, {coords[0]?.toFixed(5)}°E
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomed(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--fg)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                maxHeight: "75vh",
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                background: "#000",
              }}
            >
              <img
                src={url}
                alt="High-resolution Evidence"
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
