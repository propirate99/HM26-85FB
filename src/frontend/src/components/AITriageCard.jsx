export function AITriageCard({ triage, categoryName }) {
  if (!triage || !triage.analyzed) {
    return (
      <div
        className="card"
        style={{
          borderLeft: "3px solid var(--accent)",
          background: "var(--surface)",
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <strong>AI Complaint Triage Engine</strong>
          <span className="pill" style={{ marginLeft: "auto", fontSize: 11 }}>
            Pending Verification
          </span>
        </div>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 12.5 }}>
          Multimodal vision and duplicate screening will initialize upon evidence ingestion.
        </p>
      </div>
    );
  }

  const isGemini = triage.provider === "gemini";
  const confidencePct = Math.round((triage.confidence || 0.8) * 100);

  return (
    <div
      className="card"
      style={{
        border: triage.isFake ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(55, 211, 155, 0.3)",
        background: triage.isFake ? "rgba(239, 68, 68, 0.04)" : "rgba(55, 211, 155, 0.03)",
        padding: "20px",
        borderRadius: 14,
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>AI Municipal Complaint Triage</h3>
          <span
            className="pill"
            style={{
              background: isGemini ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.08)",
              color: isGemini ? "#38bdf8" : "var(--fg-2)",
              fontSize: 11,
            }}
          >
            {isGemini ? "Google Gemini Vision" : "Heuristic Multimodal Engine"} · {triage.model || "v1"}
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
            ✓ Civic Integrity Verified
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          background: "var(--bg-2)",
          padding: 14,
          borderRadius: 10,
          border: "1px solid var(--line-soft)",
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)", letterSpacing: "0.05em" }}>
            AI Categorization
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <strong style={{ fontSize: 14, color: "#37d39b" }}>{triage.suggestedCategory}</strong>
            <span style={{ fontSize: 11, color: "var(--fg-3)" }}>({confidencePct}% conf.)</span>
          </div>
          {categoryName && categoryName.toUpperCase() !== triage.suggestedCategory && (
            <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>
              Citizen chose: {categoryName}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--fg-3)", letterSpacing: "0.05em" }}>
            Predicted Severity & SLA
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
            Duplicate Similarity
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <strong style={{ fontSize: 14 }}>
              {triage.duplicateScore > 0 ? `${triage.duplicateScore}% Match` : "No duplicate found"}
            </strong>
            {triage.duplicateDecision !== "CREATE" && (
              <span className="pill" style={{ fontSize: 11 }}>{triage.duplicateDecision}</span>
            )}
          </div>
          {triage.duplicateCandidatePublicId && (
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
              Ref: {triage.duplicateCandidatePublicId}
            </div>
          )}
        </div>
      </div>

      {triage.extractedTags && triage.extractedTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Extracted Municipal Tags:</span>
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

      {triage.summary && (
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--fg-2)" }}>
          <strong>Triage Rationale:</strong> {triage.summary} {triage.reasoning ? `(${triage.reasoning})` : ""}
        </p>
      )}
    </div>
  );
}
