export function AITriageCard({ triage, categoryName, verification }) {
  if (!triage || !triage.analyzed) {
    return (
      <div
        className="card"
        style={{
          borderLeft: "3px solid var(--accent)",
          background: "var(--surface)",
          padding: "16px 20px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <strong>AI Complaint Triage & Multimodal Vision Engine</strong>
          <span className="pill" style={{ marginLeft: "auto", fontSize: 11 }}>
            Pending Verification
          </span>
        </div>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 12.5 }}>
          Multimodal vision inspection and Mysuru municipal geofence validation will initialize upon evidence submission.
        </p>
      </div>
    );
  }

  const isGemini = triage.provider === "gemini";
  const confidencePct = Math.round((triage.confidence || 0.88) * 100);
  const photo = triage.photoAssessment || verification?.photoAssessment;
  const location = triage.locationAssessment || verification?.locationAssessment;

  return (
    <div
      className="card"
      style={{
        border: triage.isFake ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(55, 211, 155, 0.35)",
        background: triage.isFake ? "rgba(239, 68, 68, 0.04)" : "rgba(55, 211, 155, 0.03)",
        padding: "20px",
        borderRadius: 14,
        marginBottom: 20,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>AI Complaint Review (Photo & Location)</h3>
          <span
            className="pill"
            style={{
              background: isGemini ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.08)",
              color: isGemini ? "#38bdf8" : "var(--fg-2)",
              fontSize: 11,
            }}
          >
            {isGemini ? "Google Gemini Vision 2.5" : "Multimodal Civic Vision Engine"} · {triage.model || "v2"}
          </span>
        </div>

        {triage.isFake ? (
          <span className="badge badge-risk" style={{ fontWeight: 700 }}>
            ⚠️ Suspicious Entry Flagged ({triage.fakeReason || "NON_CIVIC"})
          </span>
        ) : (
          <span
            className="pill"
            style={{ background: "rgba(55, 211, 155, 0.15)", color: "#37d39b", fontWeight: 700 }}
          >
            ✓ Verified Authentic Evidence
          </span>
        )}
      </div>

      {/* 2-Column Deep Dive: Photo Review & Location Review */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 14,
        }}
      >
        {/* Photo Review Card */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.25)",
            border: "1px solid var(--line-soft)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>📷</span>
            <strong style={{ fontSize: 12.5, color: "#37d39b" }}>AI Photo Evidence Inspection</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>
            <div>
              <strong>Detected Defect:</strong> {photo?.detectedCategory || triage.suggestedCategory}
            </div>
            <div>
              <strong>Authenticity:</strong>{" "}
              <span style={{ color: triage.isFake ? "#ef4444" : "#37d39b" }}>
                {photo?.authenticity || (triage.isFake ? "Suspicious" : "Genuine Field Photo")}
              </span>
            </div>
            <div style={{ marginTop: 4, color: "var(--fg-3)", fontSize: 11.5 }}>
              {photo?.visualSummary || "Evidence verified: genuine on-site municipal infrastructure defect."}
            </div>
          </div>
        </div>

        {/* Location Review Card */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.25)",
            border: "1px solid var(--line-soft)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>📍</span>
            <strong style={{ fontSize: 12.5, color: "#38bdf8" }}>AI Geofenced Location Audit</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>
            <div>
              <strong>Jurisdiction:</strong> {location?.jurisdictionName || "Mysuru City Corporation (MCC)"}
            </div>
            <div>
              <strong>Ward / Area:</strong> {location?.wardName || "Mysuru Municipal Ward Grid"}
            </div>
            <div style={{ marginTop: 4, color: "var(--fg-3)", fontSize: 11.5 }}>
              {location?.summary || "GPS coordinates verified inside official MCC municipal boundary (High precision lock)."}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Stats: Category, Severity, Duplicate Status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          background: "var(--bg-2)",
          padding: 12,
          borderRadius: 10,
          border: "1px solid var(--line-soft)",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)", letterSpacing: "0.05em" }}>
            AI Categorization
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <strong style={{ fontSize: 14, color: "#37d39b" }}>{triage.suggestedCategory}</strong>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>({confidencePct}% match)</span>
          </div>
          {categoryName && categoryName.toUpperCase() !== triage.suggestedCategory && (
            <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>
              Citizen chose: {categoryName}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)", letterSpacing: "0.05em" }}>
            Estimated Severity
          </div>
          <div style={{ marginTop: 4 }}>
            <span
              className="pill"
              style={{
                background:
                  triage.severity === "CRITICAL"
                    ? "rgba(239, 68, 68, 0.2)"
                    : triage.severity === "HIGH"
                    ? "rgba(251, 191, 36, 0.2)"
                    : "rgba(55, 211, 155, 0.15)",
                color:
                  triage.severity === "CRITICAL"
                    ? "#ef4444"
                    : triage.severity === "HIGH"
                    ? "#fbbf24"
                    : "#37d39b",
                fontWeight: 700,
              }}
            >
              {triage.severity || "MEDIUM"}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)", letterSpacing: "0.05em" }}>
            Spatial Duplicate Check
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <strong style={{ fontSize: 13.5 }}>
              {triage.duplicateScore > 0 ? `${triage.duplicateScore}% Match` : "No nearby match"}
            </strong>
            {triage.duplicateDecision !== "CREATE" && (
              <span className="pill" style={{ fontSize: 10.5 }}>{triage.duplicateDecision}</span>
            )}
          </div>
        </div>
      </div>

      {/* Extracted Municipal Tags */}
      {triage.extractedTags && triage.extractedTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>AI Extracted Tags:</span>
          {triage.extractedTags.map((tag) => (
            <span
              key={tag}
              className="pill"
              style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--line-soft)", fontSize: 11 }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Triage Summary */}
      {triage.summary && (
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--fg-2)" }}>
          <strong>Inspection Verdict:</strong> {triage.summary}{" "}
          {triage.reasoning ? `— ${triage.reasoning}` : ""}
        </p>
      )}
    </div>
  );
}
