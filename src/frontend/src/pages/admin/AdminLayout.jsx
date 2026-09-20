import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { adminApi } from "../../api/adminApi.js";
import { complaintsApi } from "../../api/client.js";

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("triage"); // triage, logistics, simulator, audit, gallery
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Data states
  const [triageData, setTriageData] = useState({ complaints: [], pendingIssues: [] });
  const [logisticsData, setLogisticsData] = useState({ dispatches: [], units: [], inventory: [] });
  const [simulatorsData, setSimulatorsData] = useState([]);
  const [auditData, setAuditData] = useState({ auditLogs: [], events: [] });
  const [mediaData, setMediaData] = useState([]);

  // Selected item / modal states
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [overrideScore, setOverrideScore] = useState(85);
  const [triageStatus, setTriageStatus] = useState("TRIAGED");
  const [triageOfficer, setTriageOfficer] = useState("");
  const [isDuplicateFlag, setIsDuplicateFlag] = useState(false);

  // Dispatch modal form
  const [dispatchForm, setDispatchForm] = useState({
    complaintId: "",
    vehicleId: "KA-09-SWM-01",
    crewCount: 3,
    etaMinutes: 45,
    materialItem: "Cold Mix Asphalt (50kg bags)",
    materialQty: 4,
  });

  // Simulator form
  const [simForm, setSimForm] = useState({
    scenarioName: "Dasara Peak Tourist & Transit Surge",
    category: "TRAFFIC_SPIKE",
    intensityFactor: 2.0,
    durationHours: 8,
    affectedZones: ["Central Zone", "North Zone"],
  });
  const [simProjected, setSimProjected] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const [triageRes, logRes, simRes, auditRes, medRes] = await Promise.all([
        adminApi.getTriage().catch(() => ({ complaints: [], pendingIssues: [] })),
        adminApi.getLogistics().catch(() => ({ dispatches: [], units: [], inventory: [] })),
        adminApi.getSimulators().catch(() => ({ simulations: [] })),
        adminApi.getAuditLogs().catch(() => ({ auditLogs: [], events: [] })),
        adminApi.getMedia().catch(() => ({ media: [] })),
      ]);

      setTriageData(triageRes);
      setLogisticsData(logRes);
      setSimulatorsData(simRes.simulations || []);
      setAuditData(auditRes);
      setMediaData(medRes.media || []);
    } catch (err) {
      setError(err.message || "Failed to load command center data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // --- Triage Actions ---
  const handleOpenTriageModal = (item) => {
    setSelectedComplaint(item);
    setOverrideScore(item.verificationMetrics?.compositeScore || item.verificationScore || 75);
    setTriageStatus(item.status || "TRIAGED");
    setTriageOfficer(item.assignedOfficerId?._id || item.assignedOfficerId || "");
    setIsDuplicateFlag(Boolean(item.duplicateReferenceId));
  };

  const handleSaveTriage = async () => {
    if (!selectedComplaint) return;
    try {
      await adminApi.patchTriage(selectedComplaint._id, {
        status: triageStatus,
        scoreOverride: Number(overrideScore),
        isDuplicate: isDuplicateFlag,
        assignedOfficerId: triageOfficer || undefined,
        reason: "Admin manual verification & triage matrix override",
      });
      showSuccess(`Updated triage state for #${selectedComplaint._id.slice(-6)}`);
      setSelectedComplaint(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to save triage override");
    }
  };

  const handleQuickResolve = async (comp) => {
    try {
      await complaintsApi.updateStatus(comp._id, {
        status: "RESOLVED",
        resolutionNote: "Direct verification closure by MCC City Administration.",
      });
      showSuccess(`Complaint #${comp._id.slice(-6)} marked as RESOLVED! Notification email sent.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to resolve complaint");
    }
  };

  // --- Logistics Dispatch Actions ---
  const handleTriggerDispatch = async (e) => {
    e.preventDefault();
    try {
      await adminApi.dispatchLogistics({
        complaintId: dispatchForm.complaintId || triageData.complaints[0]?._id,
        vehicleId: dispatchForm.vehicleId,
        crewCount: Number(dispatchForm.crewCount),
        etaMinutes: Number(dispatchForm.etaMinutes),
        materialAllocations: [
          {
            item: dispatchForm.materialItem,
            quantity: Number(dispatchForm.materialQty),
            unit: dispatchForm.materialItem.includes("bags") ? "bags" : "units",
          },
        ],
      });
      showSuccess(`Field unit ${dispatchForm.vehicleId} dispatched successfully!`);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to trigger field dispatch");
    }
  };

  // --- Simulation Actions ---
  const calculateLocalProjection = () => {
    const base = simForm.category === "FLOOD_PREDICTION" ? 45 : simForm.category === "TRAFFIC_SPIKE" ? 65 : 30;
    const inc = Math.round(base * simForm.intensityFactor * (simForm.durationHours / 4));
    const shortage = Math.max(0, Math.round(inc * 0.35 - 8));
    return { inc, shortage };
  };

  const handleRunSimulation = async () => {
    try {
      const res = await adminApi.runSimulator(simForm);
      showSuccess(`Simulation "${simForm.scenarioName}" executed and recorded!`);
      setSimProjected(res.simulation?.projectedImpact);
      fetchAllData();
    } catch (err) {
      setError(err.message || "Failed to execute simulation sandbox");
    }
  };

  // --- Media Masking Action ---
  const handleToggleMask = async (mediaId) => {
    try {
      const res = await adminApi.toggleMediaMask(mediaId);
      showSuccess(`Privacy masking ${res.isPublicMasked ? "ENABLED (Protected)" : "DISABLED (Public)"}`);
      setMediaData((prev) =>
        prev.map((m) => (m._id === mediaId ? { ...m, isPublicMasked: res.isPublicMasked } : m))
      );
    } catch (err) {
      setError(err.message || "Failed to toggle privacy mask");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)" }}>
      {/* Top Operations Bar */}
      <header
        style={{
          background: "oklch(16% 0.02 250)",
          borderBottom: "1px solid var(--line)",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "var(--good)",
              boxShadow: "0 0 10px var(--good)",
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "0.02em" }}>
              MYSURU CITY CORPORATION (MCC) COMMAND PORTAL
            </div>
            <div style={{ fontSize: "11px", color: "var(--fg-3)", display: "flex", gap: "12px" }}>
              <span>ROLE: <strong style={{ color: "var(--accent)" }}>{user?.role || "CENTRAL MAIN AUTHORITY"}</strong></span>
              <span>ZONE: <strong>{user?.jurisdiction?.zone || "ALL JURISDICTIONS (HQ)"}</strong></span>
              <span>DEPT: <strong>{user?.jurisdiction?.department || "CITY ADMINISTRATION"}</strong></span>
              <span>STATE: <span style={{ color: "var(--good)" }}>RESILIENT ZERO-DOWNTIME ACTIVE</span></span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Admin Identity Display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "4px 12px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent) 0%, oklch(65% 0.15 165) 100%)",
                color: "var(--accent-ink)",
                fontWeight: 900,
                fontSize: "14px",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
              ) : (
                (user?.name || user?.email || "A").slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--fg)" }}>
                  {user?.name || "MCC Commissioner"}
                </span>
                <span
                  style={{
                    background: "oklch(28% 0.08 165)",
                    color: "var(--accent)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                  }}
                >
                  {user?.role || "MAIN_AUTHORITY"}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--fg-3)" }}>
                {user?.email || "commissioner@mysuru.gov.in"}
              </div>
            </div>
          </div>

          <button
            onClick={fetchAllData}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--fg-2)",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            ↻ Refresh Matrix
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            style={{
              background: "oklch(26% 0.08 24)",
              border: "1px solid var(--bad)",
              color: "var(--bad)",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </div>
      </header>


      {/* Operations Navigation Tabs */}
      <nav
        style={{
          display: "flex",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: "0 24px",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "triage", label: "Triage & Verification Matrix", icon: "⚖️" },
          { id: "logistics", label: "Logistics & Field Dispatch", icon: "🚚" },
          { id: "simulator", label: "Scenario Simulator Sandbox", icon: "⚡" },
          { id: "audit", label: "Audit & RBAC Inspector", icon: "🛡️" },
          { id: "gallery", label: "Gallery Asset Manager", icon: "🖼️" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 18px",
                fontSize: "13px",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--accent)" : "var(--fg-3)",
                background: isActive ? "var(--bg)" : "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Notifications / Alerts */}
      <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "16px 24px 0" }}>
        {error ? (
          <div
            style={{
              padding: "12px 16px",
              background: "oklch(24% 0.08 24)",
              border: "1px solid var(--bad)",
              borderRadius: "8px",
              color: "var(--bad)",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>⚠️ {error}</span>
            <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
          </div>
        ) : null}

        {successMsg ? (
          <div
            style={{
              padding: "12px 16px",
              background: "oklch(24% 0.08 150)",
              border: "1px solid var(--good)",
              borderRadius: "8px",
              color: "var(--good)",
              marginBottom: "16px",
            }}
          >
            ✓ {successMsg}
          </div>
        ) : null}
      </div>

      {/* Main Command Console Content */}
      <main style={{ maxWidth: "1600px", margin: "0 auto", padding: "16px 24px 48px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--fg-3)" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>⚙️</div>
            <div>Synchronizing MCC Enterprise Matrices & Live Feeds...</div>
          </div>
        ) : null}

        {/* -------------------------------------------------------------
            VIEW 1: TRIAGE & VERIFICATION MATRIX
           ------------------------------------------------------------- */}
        {!loading && activeTab === "triage" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Incident Triage & Multi-Signal Verification</h2>
                <p style={{ margin: "4px 0 0", color: "var(--fg-3)", fontSize: "13px" }}>
                  Analyze AI visual authenticity scores, duplicate confidence, and enforce zonal field routing.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <span
                  style={{
                    background: "var(--surface-2)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    border: "1px solid var(--line)",
                  }}
                >
                  Standard Complaints: <strong>{triageData.complaints?.length || 0}</strong>
                </span>
                <span
                  style={{
                    background: "var(--surface-2)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    border: "1px solid var(--line)",
                  }}
                >
                  Legacy Pending Issues: <strong>{triageData.pendingIssues?.length || 0}</strong>
                </span>
              </div>
            </div>

            {/* Complaints Matrix Table */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)", color: "var(--fg-2)" }}>
                    <th style={{ padding: "12px 16px", width: "70px" }}>Evidence</th>
                    <th style={{ padding: "12px 16px" }}>ID / Location</th>
                    <th style={{ padding: "12px 16px" }}>Category & Ward</th>
                    <th style={{ padding: "12px 16px" }}>AI Verification</th>
                    <th style={{ padding: "12px 16px" }}>Metrics</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {triageData.complaints?.map((comp) => {
                    const score = comp.aiConfidenceScore || comp.verificationMetrics?.compositeScore || 70;
                    const isHighRisk = score < 60 || comp.isManipulated;
                    const isDup = comp.verificationMetrics?.duplicateConfidence > 0.5 || comp.duplicateReferenceId;

                    return (
                      <tr
                        key={comp._id}
                        style={{
                          borderBottom: "1px solid var(--line-soft)",
                          transition: "background 0.15s",
                        }}
                      >
                        {/* Evidence Photo Thumbnail */}
                        <td style={{ padding: "10px 16px" }}>
                          {comp.photoUrl ? (
                            <a href={comp.photoUrl} target="_blank" rel="noopener noreferrer" title="View full evidence image">
                              <img
                                src={comp.photoUrl}
                                alt="Complaint Evidence"
                                style={{
                                  width: "52px",
                                  height: "52px",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  border: "1px solid var(--line)",
                                  display: "block",
                                }}
                              />
                            </a>
                          ) : (
                            <div
                              style={{
                                width: "52px",
                                height: "52px",
                                borderRadius: "8px",
                                background: "var(--surface-2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                color: "var(--fg-3)",
                                border: "1px dashed var(--line)",
                              }}
                            >
                              📷
                            </div>
                          )}
                        </td>

                        {/* Title & Address */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: "var(--fg)" }}>{comp.title}</div>
                          <div style={{ fontSize: "12px", color: "var(--fg-2)", marginTop: "2px" }}>
                            📍 {comp.googleAddress || comp.location?.address || "Mysuru Jurisdiction"}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--fg-3)", marginTop: "2px" }}>
                            #{comp._id.slice(-8)} • {new Date(comp.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Category & Ward */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                background: "oklch(28% 0.05 165)",
                                color: "var(--accent)",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              {comp.category}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--fg-2)", marginTop: "4px" }}>
                            {comp.wardName ? `${comp.wardName} (W${comp.wardNumber || "N/A"})` : comp.location?.zone || "Central"}
                          </div>
                        </td>

                        {/* AI Verification Score & Tamper Check */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "12px",
                                background: isHighRisk ? "oklch(24% 0.1 24)" : "oklch(24% 0.1 150)",
                                color: isHighRisk ? "var(--bad)" : "var(--good)",
                                border: `1px solid ${isHighRisk ? "var(--bad)" : "var(--good)"}`,
                              }}
                            >
                              {score}
                            </div>
                            <div>
                              <div style={{ fontSize: "11px", fontWeight: 700, color: comp.isManipulated ? "var(--bad)" : "var(--good)" }}>
                                {comp.isManipulated ? "⚠️ Manipulated" : "✓ Authentic"}
                              </div>
                              <div style={{ fontSize: "10px", color: "var(--fg-3)" }}>Gemini AI</div>
                            </div>
                          </div>
                        </td>

                        {/* Metrics Breakdown */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>GPS Acc: <strong>{Math.round((comp.verificationMetrics?.gpsConfidence || 0.96) * 100)}%</strong></span>
                            <span>AI Visual: <strong>{comp.verificationMetrics?.aiVisualScore || score}%</strong></span>
                            <span style={{ color: isDup ? "var(--warn)" : "var(--fg-3)" }}>
                              Dup Prob: <strong>{Math.round((comp.verificationMetrics?.duplicateConfidence || 0) * 100)}%</strong>
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background:
                                comp.status === "RESOLVED"
                                  ? "oklch(24% 0.08 150)"
                                  : comp.status === "IN_PROGRESS"
                                  ? "oklch(24% 0.08 240)"
                                  : comp.status === "ASSIGNED"
                                  ? "oklch(24% 0.08 80)"
                                  : "var(--surface-2)",
                              color:
                                comp.status === "RESOLVED"
                                  ? "var(--good)"
                                  : comp.status === "IN_PROGRESS"
                                  ? "oklch(80% 0.15 240)"
                                  : "var(--fg)",
                            }}
                          >
                            {comp.status}
                          </span>
                        </td>

                        {/* Actions: 1-Click Resolve & Review Modal */}
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                            {comp.status !== "RESOLVED" && (
                              <button
                                onClick={() => handleQuickResolve(comp)}
                                title="Resolve complaint and trigger live citizen email"
                                style={{
                                  background: "var(--good)",
                                  color: "#052e16",
                                  border: "none",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <span>✓</span>
                                <span>Resolve</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenTriageModal(comp)}
                              style={{
                                background: "var(--accent)",
                                color: "var(--accent-ink)",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Override
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal for Triage Override */}
            {selectedComplaint && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 200,
                }}
              >
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "14px",
                    width: "100%",
                    maxWidth: "540px",
                    padding: "24px",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
                      Administrative Triage Override
                    </h3>
                    <button
                      onClick={() => setSelectedComplaint(null)}
                      style={{ background: "none", border: "none", color: "var(--fg-3)", fontSize: "18px", cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>

                  <p style={{ fontSize: "13px", color: "var(--fg-2)", marginBottom: "16px" }}>
                    Incident: <strong>{selectedComplaint.title}</strong> (#{selectedComplaint._id.slice(-6)})
                  </p>

                  {/* Score Slider */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                      <span>Verification Score Override:</span>
                      <strong style={{ color: overrideScore >= 80 ? "var(--good)" : "var(--warn)" }}>
                        {overrideScore} / 100
                      </strong>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={overrideScore}
                      onChange={(e) => setOverrideScore(e.target.value)}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--fg-3)" }}>
                      <span>10 (Fake / Manipulated)</span>
                      <span>80 (Verified Auto-Route)</span>
                      <span>100 (Flawless Proof)</span>
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", marginBottom: "6px" }}>Update Incident Status:</label>
                    <select
                      value={triageStatus}
                      onChange={(e) => setTriageStatus(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        borderRadius: "6px",
                        color: "var(--fg)",
                      }}
                    >
                      <option value="SUBMITTED">SUBMITTED (Pending)</option>
                      <option value="TRIAGED">TRIAGED (Verified Score Enforced)</option>
                      <option value="ASSIGNED">ASSIGNED (Forwarded to Zone Crew)</option>
                      <option value="IN_PROGRESS">IN_PROGRESS (Crew On-Site)</option>
                      <option value="RESOLVED">RESOLVED (Resolution Cleared)</option>
                      <option value="REJECTED">REJECTED (Invalid / Spam)</option>
                    </select>
                  </div>

                  {/* Duplicate Checkbox */}
                  <div
                    style={{
                      marginBottom: "20px",
                      padding: "12px",
                      background: "var(--surface-2)",
                      borderRadius: "8px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input
                        type="checkbox"
                        checked={isDuplicateFlag}
                        onChange={(e) => setIsDuplicateFlag(e.target.checked)}
                        style={{ accentColor: "var(--warn)" }}
                      />
                      <span>Mark as Duplicate Incident (Closes complaint & attaches to cluster)</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      onClick={() => setSelectedComplaint(null)}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        color: "var(--fg-2)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTriage}
                      style={{
                        background: "var(--accent)",
                        border: "none",
                        color: "var(--accent-ink)",
                        fontWeight: 700,
                        padding: "8px 20px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Confirm Triage & Audit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 2: LOGISTICS & FIELD DISPATCH
           ------------------------------------------------------------- */}
        {!loading && activeTab === "logistics" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Fleet Tracking & Closed-Loop Municipal Dispatch</h2>
                <p style={{ margin: "4px 0 0", color: "var(--fg-3)", fontSize: "13px" }}>
                  Monitor Mysuru City Corporation machinery, vehicle assignments, material stocks, and SLA clocks.
                </p>
              </div>
            </div>

            {/* Grid of Vehicles and Inventory */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "24px" }}>
              {/* Unit Fleet Roster */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <h3 style={{ fontSize: "14px", margin: "0 0 12px", color: "var(--fg)" }}>
                  MCC Municipal Fleet & Machinery Status
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {logisticsData.units?.map((u) => (
                    <div
                      key={u.vehicleId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        background: "var(--surface-2)",
                        borderRadius: "8px",
                        border: "1px solid var(--line-soft)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>
                          {u.vehicleId} • <span style={{ color: "var(--accent)" }}>{u.type}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--fg-3)" }}>
                          Assigned Zone: {u.zone} • Crew Size: {u.crewCount} personnel
                        </div>
                      </div>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background:
                            u.status === "AVAILABLE"
                              ? "oklch(24% 0.08 150)"
                              : u.status === "ON_SITE"
                              ? "oklch(24% 0.08 240)"
                              : "oklch(24% 0.08 80)",
                          color:
                            u.status === "AVAILABLE"
                              ? "var(--good)"
                              : u.status === "ON_SITE"
                              ? "oklch(80% 0.15 240)"
                              : "var(--warn)",
                        }}
                      >
                        {u.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Material Inventory */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <h3 style={{ fontSize: "14px", margin: "0 0 12px", color: "var(--fg)" }}>
                  Depot Material Inventory
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {logisticsData.inventory?.map((inv) => (
                    <div
                      key={inv.item}
                      style={{
                        padding: "10px 14px",
                        background: "var(--surface-2)",
                        borderRadius: "8px",
                        border: "1px solid var(--line-soft)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "var(--fg-2)" }}>{inv.item}</span>
                      <strong style={{ fontSize: "14px", color: "var(--accent)" }}>
                        {inv.available} {inv.unit}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Dispatch Action Form */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
              }}
            >
              <h3 style={{ fontSize: "15px", margin: "0 0 16px", color: "var(--fg)" }}>
                Execute Rapid Field Crew Dispatch
              </h3>
              <form
                onSubmit={handleTriggerDispatch}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--fg-3)", marginBottom: "4px" }}>
                    Select Vehicle Unit:
                  </label>
                  <select
                    value={dispatchForm.vehicleId}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleId: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--fg)",
                    }}
                  >
                    {logisticsData.units?.map((u) => (
                      <option key={u.vehicleId} value={u.vehicleId}>
                        {u.vehicleId} ({u.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--fg-3)", marginBottom: "4px" }}>
                    Crew Personnel Count:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={dispatchForm.crewCount}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, crewCount: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--fg)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--fg-3)", marginBottom: "4px" }}>
                    Material Allocation:
                  </label>
                  <select
                    value={dispatchForm.materialItem}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, materialItem: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--fg)",
                    }}
                  >
                    {logisticsData.inventory?.map((inv) => (
                      <option key={inv.item} value={inv.item}>
                        {inv.item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--fg-3)", marginBottom: "4px" }}>
                    Estimated Time of Arrival (Minutes):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="240"
                    value={dispatchForm.etaMinutes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, etaMinutes: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--fg)",
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      background: "var(--accent)",
                      color: "var(--accent-ink)",
                      fontWeight: 700,
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Dispatch Unit
                  </button>
                </div>
              </form>
            </div>

            {/* Active Dispatches Table */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: "14px" }}>
                Active Field Dispatches & SLA Clocks
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)", color: "var(--fg-2)" }}>
                    <th style={{ padding: "10px 16px" }}>Dispatch ID</th>
                    <th style={{ padding: "10px 16px" }}>Vehicle & Crew</th>
                    <th style={{ padding: "10px 16px" }}>Material Allocations</th>
                    <th style={{ padding: "10px 16px" }}>Status</th>
                    <th style={{ padding: "10px 16px" }}>ETA Target</th>
                  </tr>
                </thead>
                <tbody>
                  {logisticsData.dispatches?.map((d) => (
                    <tr key={d._id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                      <td style={{ padding: "10px 16px" }}>#{d._id.slice(-6)}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <strong>{d.assignedUnit?.vehicleId || "KA-09-SWM-01"}</strong> ({d.assignedUnit?.crewCount || 2} crew)
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        {d.materialAllocations?.map((m) => `${m.quantity} ${m.unit} ${m.item}`).join(", ") || "Standard toolset"}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: d.dispatchStatus === "ON_SITE" ? "oklch(24% 0.08 240)" : "oklch(24% 0.08 150)",
                            color: d.dispatchStatus === "ON_SITE" ? "oklch(80% 0.15 240)" : "var(--good)",
                          }}
                        >
                          {d.dispatchStatus}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        {d.eta ? new Date(d.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "30 mins"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 3: SCENARIO SIMULATOR SANDBOX
           ------------------------------------------------------------- */}
        {!loading && activeTab === "simulator" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Regional Stress-Test Sandbox</h2>
                <p style={{ margin: "4px 0 0", color: "var(--fg-3)", fontSize: "13px" }}>
                  Forecast incident volume surges, crew shortages, and resource deficits under extreme municipal stress.
                </p>
              </div>
            </div>

            {/* Sandbox Controls & Live Projection */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", marginBottom: "28px" }}>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <h3 style={{ fontSize: "15px", margin: "0 0 16px", color: "var(--fg)" }}>
                  Scenario Stress Parameters
                </h3>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--fg-3)", marginBottom: "4px" }}>
                    Scenario Category:
                  </label>
                  <select
                    value={simForm.category}
                    onChange={(e) => setSimForm({ ...simForm, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--fg)",
                    }}
                  >
                    <option value="FLOOD_PREDICTION">FLOOD_PREDICTION (Monsoon Drain Overflow)</option>
                    <option value="TRAFFIC_SPIKE">TRAFFIC_SPIKE (Dasara Festival Transit Surge)</option>
                    <option value="RESOURCE_DEFICIT">RESOURCE_DEFICIT (Sanitation Fleet Breakdown)</option>
                  </select>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--fg-3)", marginBottom: "4px" }}>
                    Scenario Title:
                  </label>
                  <input
                    type="text"
                    value={simForm.scenarioName}
                    onChange={(e) => setSimForm({ ...simForm, scenarioName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--fg)",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span>Intensity Multiplier:</span>
                    <strong style={{ color: "var(--accent)" }}>{simForm.intensityFactor}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={simForm.intensityFactor}
                    onChange={(e) => setSimForm({ ...simForm, intensityFactor: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "var(--accent)" }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span>Duration (Hours):</span>
                    <strong style={{ color: "var(--accent)" }}>{simForm.durationHours} hrs</strong>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="24"
                    step="1"
                    value={simForm.durationHours}
                    onChange={(e) => setSimForm({ ...simForm, durationHours: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "var(--accent)" }}
                  />
                </div>

                <button
                  onClick={handleRunSimulation}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  ⚡ Execute Simulation Sandbox & Record Telemetry
                </button>
              </div>

              {/* Live Projection Card */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "15px", margin: "0 0 16px", color: "var(--fg)" }}>
                    Real-Time Stress Impact Projection
                  </h3>
                  {(() => {
                    const local = calculateLocalProjection();
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div
                          style={{
                            padding: "16px",
                            background: "var(--surface-2)",
                            borderRadius: "10px",
                            border: "1px solid var(--line-soft)",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: "11px", color: "var(--fg-3)", textTransform: "uppercase" }}>
                            Est. Incident Volume
                          </div>
                          <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--warn)", margin: "8px 0" }}>
                            {simProjected ? simProjected.incidentVolumeEstimate : local.inc}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--fg-2)" }}>predicted complaints / day</div>
                        </div>

                        <div
                          style={{
                            padding: "16px",
                            background: "var(--surface-2)",
                            borderRadius: "10px",
                            border: "1px solid var(--line-soft)",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: "11px", color: "var(--fg-3)", textTransform: "uppercase" }}>
                            Projected Crew Deficit
                          </div>
                          <div style={{ fontSize: "36px", fontWeight: 800, color: "var(--bad)", margin: "8px 0" }}>
                            {simProjected ? simProjected.crewShortageEstimate : local.shortage}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--fg-2)" }}>field officers needed</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px",
                    background: "oklch(22% 0.04 165)",
                    border: "1px solid var(--accent)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--fg-2)",
                  }}
                >
                  💡 <strong>MCC Recommendation:</strong> Pre-stage 3 additional tipper autos in Central Zone and initiate emergency contractor standby for Kuvempunagar storm lines.
                </div>
              </div>
            </div>

            {/* Historical Simulations Table */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: "14px" }}>
                Simulation Run History & Audited Scenarios
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)", color: "var(--fg-2)" }}>
                    <th style={{ padding: "10px 16px" }}>Scenario</th>
                    <th style={{ padding: "10px 16px" }}>Category</th>
                    <th style={{ padding: "10px 16px" }}>Parameters</th>
                    <th style={{ padding: "10px 16px" }}>Projected Volume</th>
                    <th style={{ padding: "10px 16px" }}>Crew Shortage</th>
                    <th style={{ padding: "10px 16px" }}>Executed At</th>
                  </tr>
                </thead>
                <tbody>
                  {simulatorsData.map((s) => (
                    <tr key={s._id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{s.scenarioName}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: "11px", color: "var(--accent)" }}>{s.category}</span>
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "12px" }}>
                        {s.parameters?.intensityFactor}x intensity • {s.parameters?.durationHours}h
                      </td>
                      <td style={{ padding: "10px 16px", fontWeight: 700, color: "var(--warn)" }}>
                        {s.projectedImpact?.incidentVolumeEstimate} incidents
                      </td>
                      <td style={{ padding: "10px 16px", fontWeight: 700, color: "var(--bad)" }}>
                        {s.projectedImpact?.crewShortageEstimate} crew
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: "12px", color: "var(--fg-3)" }}>
                        {new Date(s.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 4: AUDIT & RBAC INSPECTOR
           ------------------------------------------------------------- */}
        {!loading && activeTab === "audit" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Append-Only Telemetry & State Diff Inspector</h2>
                <p style={{ margin: "4px 0 0", color: "var(--fg-3)", fontSize: "13px" }}>
                  Immutable audit records tracking municipal actor roles, score overrides, and state transitions.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--line)", color: "var(--fg-2)" }}>
                    <th style={{ padding: "12px 16px" }}>Timestamp</th>
                    <th style={{ padding: "12px 16px" }}>Actor & Role</th>
                    <th style={{ padding: "12px 16px" }}>Action</th>
                    <th style={{ padding: "12px 16px" }}>Target Entity</th>
                    <th style={{ padding: "12px 16px" }}>State Diffs / Telemetry</th>
                  </tr>
                </thead>
                <tbody>
                  {auditData.auditLogs?.map((log) => (
                    <tr key={log._id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                      <td style={{ padding: "12px 16px", fontSize: "12px", color: "var(--fg-3)" }}>
                        {new Date(log.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600 }}>{log.actorId?.name || "MCC Central Authority"}</div>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "var(--surface-2)",
                            color: "var(--accent)",
                          }}
                        >
                          {log.actorId?.role || "MAIN_AUTHORITY"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background:
                              log.action === "SCORE_OVERRIDDEN"
                                ? "oklch(24% 0.08 80)"
                                : log.action === "DISPATCH_TRIGGERED"
                                ? "oklch(24% 0.08 165)"
                                : "var(--surface-2)",
                            color:
                              log.action === "SCORE_OVERRIDDEN"
                                ? "var(--warn)"
                                : log.action === "DISPATCH_TRIGGERED"
                                ? "var(--accent)"
                                : "var(--fg)",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                        #{String(log.entityId).slice(-6)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <pre
                          style={{
                            margin: 0,
                            fontSize: "11px",
                            background: "var(--bg)",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--line-soft)",
                            maxHeight: "80px",
                            overflowY: "auto",
                            color: "var(--fg-2)",
                          }}
                        >
                          {JSON.stringify(log.diff, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 5: GALLERY ASSET MANAGER
           ------------------------------------------------------------- */}
        {!loading && activeTab === "gallery" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Evidence Gallery & Privacy Redaction Engine</h2>
                <p style={{ margin: "4px 0 0", color: "var(--fg-3)", fontSize: "13px" }}>
                  Manage public visibility badges, inspect hardware EXIF provenance, and toggle privacy redaction masks.
                </p>
              </div>
            </div>

            {/* Evidence Cards Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "20px",
              }}
            >
              {mediaData.map((item) => {
                const isMasked = Boolean(item.isPublicMasked);
                return (
                  <div
                    key={item._id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    }}
                  >
                    {/* Image with overlay badge */}
                    <div style={{ position: "relative", width: "100%", height: "200px", background: "#111" }}>
                      <img
                        src={item.fileUrl}
                        alt="Evidence Asset"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          filter: isMasked ? "blur(8px)" : "none",
                          transition: "filter 0.3s ease",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: item.stage === "AFTER_RESOLUTION" ? "oklch(24% 0.1 150)" : "oklch(24% 0.1 24)",
                          color: item.stage === "AFTER_RESOLUTION" ? "var(--good)" : "var(--warn)",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {item.stage}
                      </span>
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: isMasked ? "oklch(24% 0.1 24)" : "oklch(24% 0.1 150)",
                          color: isMasked ? "var(--bad)" : "var(--good)",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {isMasked ? "🔒 MASKED (Private)" : "🌐 PUBLIC VIEWABLE"}
                      </span>
                    </div>

                    {/* Metadata & Controls */}
                    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                      <div style={{ fontSize: "12px", color: "var(--fg-2)" }}>
                        Provenance: <strong>{item.metadata?.deviceType || "mobile-pwa"}</strong>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--fg-3)" }}>
                        GPS Coordinates: {item.metadata?.exifGps?.join(", ") || "Geo-tagged on MCC Grid"}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--fg-3)" }}>
                        Recorded: {new Date(item.createdAt).toLocaleString()}
                      </div>

                      <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                        <button
                          onClick={() => handleToggleMask(item._id)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: isMasked ? "var(--good)" : "var(--surface-2)",
                            color: isMasked ? "var(--accent-ink)" : "var(--fg)",
                            border: `1px solid ${isMasked ? "var(--good)" : "var(--line)"}`,
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isMasked ? "🔓 Remove Mask (Make Public)" : "🔒 Apply Privacy Mask (Redact EXIF)"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
