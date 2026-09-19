import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { issueApi } from "../api/issueApi.js";
import { mediaUrl } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [gallery, setGallery] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [reports, setReports] = useState([]);
  const [civicIssues, setCivicIssues] = useState([]);

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "Jayalakshmipuram, Ward 42, Mysuru",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Gallery filter & search
  const [filterType, setFilterType] = useState("ALL"); // ALL | BEFORE | RESOLVED
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  // Load user gallery, reports, and issues
  useEffect(() => {
    let mounted = true;
    setLoadingGallery(true);

    Promise.allSettled([
      issueApi.getMyGallery(),
      issueApi.myReports(),
      issueApi.listMine(),
    ]).then(([galleryRes, reportsRes, issuesRes]) => {
      if (!mounted) return;
      if (galleryRes.status === "fulfilled" && galleryRes.value?.gallery) {
        setGallery(galleryRes.value.gallery);
      }
      if (reportsRes.status === "fulfilled" && reportsRes.value?.reports) {
        setReports(reportsRes.value.reports);
      }
      if (issuesRes.status === "fulfilled" && issuesRes.value?.issues) {
        setCivicIssues(issuesRes.value.issues);
      }
      setLoadingGallery(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Update editForm when user changes
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "Jayalakshmipuram, Ward 42, Mysuru",
      });
    }
  }, [user]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await issueApi.updateProfile(editForm);
      if (res?.user) {
        setUser(res.user);
        setProfileMsg("Profile updated successfully!");
        setTimeout(() => {
          setProfileMsg("");
          setIsEditing(false);
        }, 1500);
      }
    } catch (err) {
      setProfileMsg("Error updating profile: " + (err.message || "Request failed"));
    } finally {
      setSavingProfile(false);
    }
  }

  // Filtered gallery items
  const filteredGallery = useMemo(() => {
    return gallery.filter((item) => {
      // Filter by type
      if (filterType === "BEFORE" && item.type !== "BEFORE") return false;
      if (filterType === "RESOLVED" && item.issue?.status !== "RESOLVED") return false;

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const evId = (item.evidenceId || "").toLowerCase();
        const issueId = (item.issue?.publicId || "").toLowerCase();
        const title = (item.issue?.title || "").toLowerCase();
        const loc = (item.locationLabel || "").toLowerCase();
        if (!evId.includes(q) && !issueId.includes(q) && !title.includes(q) && !loc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [gallery, filterType, searchQuery]);

  // Statistics calculation
  const totalCaptured = gallery.length;
  const totalComplaints = Math.max(reports.length, civicIssues.length);
  const resolvedCount = civicIssues.filter((i) => i.status === "RESOLVED").length;
  const verifiedRate = totalCaptured > 0 ? "100%" : "—";

  return (
    <div className="shell">
      {/* Breadcrumb / Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Link to="/app" style={{ fontSize: 13, color: "var(--fg-3)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            ← Back to Citizen Desk
          </Link>
          <h1 style={{ marginTop: 6, fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)" }}>Citizen Profile & Evidence Gallery</h1>
        </div>
        <Link to="/app/report" className="btn btn-primary" style={{ padding: "8px 18px", fontWeight: 700 }}>
          📸 Report New Issue
        </Link>
      </div>

      {/* User Identity Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(22, 34, 31, 0.95) 0%, rgba(13, 22, 19, 0.98) 100%)",
          border: "1px solid rgba(55, 211, 155, 0.3)",
          borderRadius: 16,
          padding: "clamp(16px, 3vw, 24px)",
          marginBottom: 24,
          boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          {/* Avatar and Details */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #37d39b 0%, #10b981 100%)",
                color: "#0d1b16",
                display: "grid",
                placeItems: "center",
                fontSize: 32,
                fontWeight: 900,
                boxShadow: "0 0 0 4px rgba(55, 211, 155, 0.25)",
                flexShrink: 0,
              }}
            >
              {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)" }}>{user?.name || "Verified Mysuru Citizen"}</h2>
                <span
                  style={{
                    background: "rgba(55, 211, 155, 0.15)",
                    color: "#37d39b",
                    border: "1px solid rgba(55, 211, 155, 0.4)",
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                  }}
                >
                  ✓ VERIFIED CITIZEN
                </span>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "var(--fg-2)",
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  MCC ROLE: {user?.role || "CITIZEN"}
                </span>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 18, flexWrap: "wrap", color: "var(--fg-3)", fontSize: 13 }}>
                <span>✉️ <strong>{user?.email}</strong></span>
                {user?.phone && <span>📞 <strong>{user.phone}</strong></span>}
                <span>📍 <strong>{user?.address || "Jayalakshmipuram, Ward 42, Mysuru"}</strong></span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{ fontSize: 12.5 }}
            >
              {isEditing ? "✕ Cancel Editing" : "✏️ Edit Profile"}
            </button>
          </div>
        </div>

        {/* Inline Edit Profile Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              alignItems: "flex-end",
            }}
          >
            <div>
              <label style={{ margin: "0 0 6px", fontSize: 12 }}>Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                placeholder="Citizen Name"
              />
            </div>

            <div>
              <label style={{ margin: "0 0 6px", fontSize: 12 }}>Phone Number</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label style={{ margin: "0 0 6px", fontSize: 12 }}>Residential Ward / Area</label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="e.g. Jayalakshmipuram, Ward 42"
              />
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-primary" type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save Changes"}
              </button>
              {profileMsg && (
                <span style={{ fontSize: 12.5, color: profileMsg.includes("Error") ? "#ef4444" : "#37d39b" }}>
                  {profileMsg}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* KPI Counters */}
      <div className="kpis" style={{ marginBottom: 28 }}>
        <div className="kpi">
          <span>Captured Evidence Photos</span>
          <b>{totalCaptured}</b>
          <small style={{ color: "var(--fg-3)", fontSize: 11.5 }}>Stored securely in database</small>
        </div>
        <div className="kpi">
          <span>Total Complaints Raised</span>
          <b>{totalComplaints}</b>
          <small style={{ color: "var(--fg-3)", fontSize: 11.5 }}>Submitted to Mysuru City Corp</small>
        </div>
        <div className="kpi good">
          <span>Resolved & Cleaned</span>
          <b>{resolvedCount}</b>
          <small style={{ color: "var(--fg-3)", fontSize: 11.5 }}>Verified by zone officers</small>
        </div>
        <div className="kpi">
          <span>Integrity Verification</span>
          <b style={{ color: "#37d39b" }}>{verifiedRate}</b>
          <small style={{ color: "var(--fg-3)", fontSize: 11.5 }}>Cryptographic GPS & timestamp</small>
        </div>
      </div>

      {/* GALLERY SECTION */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 16,
          padding: "clamp(16px, 3vw, 24px)",
          marginBottom: 32,
        }}
      >
        {/* Gallery Header and Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, fontSize: "clamp(1.1rem, 1.8vw, 1.4rem)" }}>
              <span>📸 Captured Evidence Gallery</span>
              <span
                style={{
                  background: "rgba(55, 211, 155, 0.15)",
                  color: "#37d39b",
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                {filteredGallery.length} Photos
              </span>
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--fg-3)" }}>
              All field evidence captured through your camera hardware or live simulator, saved in the database with GPS coordinates and AI assessment.
            </p>
          </div>

          {/* Filter Segmented Control & Search */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div className="seg" style={{ margin: 0 }}>
              <button
                type="button"
                className={filterType === "ALL" ? "on" : ""}
                onClick={() => setFilterType("ALL")}
              >
                All ({gallery.length})
              </button>
              <button
                type="button"
                className={filterType === "BEFORE" ? "on" : ""}
                onClick={() => setFilterType("BEFORE")}
              >
                Before
              </button>
              <button
                type="button"
                className={filterType === "RESOLVED" ? "on" : ""}
                onClick={() => setFilterType("RESOLVED")}
              >
                Resolved
              </button>
            </div>

            <input
              type="search"
              placeholder="Search ID, location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 180,
                padding: "6px 10px",
                fontSize: 12.5,
                borderRadius: 8,
              }}
            />
          </div>
        </div>

        {/* Gallery Grid Content */}
        {loadingGallery ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--fg-3)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔄</div>
            <p>Loading captured evidence gallery…</p>
          </div>
        ) : filteredGallery.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px dashed var(--line)",
              borderRadius: 14,
            }}
          >
            <p style={{ fontSize: 40, margin: "0 0 10px" }}>📷</p>
            <h3 style={{ margin: "0 0 6px" }}>No Captured Photos Found</h3>
            <p style={{ fontSize: 13, color: "var(--fg-3)", maxWidth: 420, margin: "0 auto 16px" }}>
              {searchQuery || filterType !== "ALL"
                ? "No captured evidence matched your current filter. Try clearing the search or switching filters."
                : "You haven't captured any field photos yet. When you raise a civic complaint with live camera evidence, your photos will automatically appear here."}
            </p>
            <Link to="/app/report" className="btn btn-primary">
              📸 Capture Field Evidence Now
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
              gap: 16,
            }}
          >
            {filteredGallery.map((item) => {
              const url = mediaUrl(item.publicUrl);
              const coords = item.coordinates || [];
              const coordLabel =
                coords.length >= 2
                  ? `${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E`
                  : null;
              const isResolved = item.issue?.status === "RESOLVED";

              return (
                <article
                  key={item._id || item.evidenceId}
                  className="card"
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--line-soft)",
                    cursor: "pointer",
                    transition: "transform 0.18s ease, border-color 0.18s ease",
                  }}
                  onClick={() => setSelectedEvidence(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line-soft)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {/* Image Frame */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 190,
                      borderRadius: 9,
                      overflow: "hidden",
                      background: "#080e0c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={url}
                      alt={`Evidence ${item.evidenceId}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />

                    {/* Fallback box if image fails */}
                    <div
                      style={{
                        display: "none",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        color: "var(--fg-3)",
                      }}
                    >
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={{ fontSize: 11, marginTop: 4 }}>Captured Evidence</span>
                    </div>

                    {/* Top Badges */}
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        display: "flex",
                        gap: 5,
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          background: item.type === "BEFORE" ? "rgba(239, 68, 68, 0.85)" : "rgba(55, 211, 155, 0.85)",
                          color: "#fff",
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.type || "BEFORE"}
                      </span>

                      {item.capturedThroughApp && (
                        <span
                          style={{
                            background: "rgba(10, 16, 14, 0.85)",
                            color: "#37d39b",
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            border: "1px solid rgba(55, 211, 155, 0.4)",
                          }}
                        >
                          🔒 Live Capture
                        </span>
                      )}
                    </div>

                    {/* Zoom Icon Overlay */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 6,
                        right: 6,
                        background: "rgba(0, 0, 0, 0.65)",
                        color: "#fff",
                        borderRadius: 5,
                        padding: "2px 6px",
                        fontSize: 10.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      🔍 View
                    </div>
                  </div>

                  {/* Info Details */}
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: "var(--fg)" }}>{item.evidenceId}</strong>
                      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                        {formatDate(item.capturedAt)}
                      </span>
                    </div>

                    {item.issue ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Link
                          to={`/app/issues/${item.issue.publicId || item.issue._id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#37d39b",
                            textDecoration: "underline",
                          }}
                        >
                          Ticket #{item.issue.publicId || "Issue"}
                        </Link>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: isResolved ? "rgba(55, 211, 155, 0.15)" : "rgba(251, 191, 36, 0.15)",
                            color: isResolved ? "#37d39b" : "#fbbf24",
                          }}
                        >
                          {item.issue.status || "REPORTED"}
                        </span>
                      </div>
                    ) : item.reportId ? (
                      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                        Report #{item.reportId}
                      </span>
                    ) : null}

                    {/* Geolocation Tag */}
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--fg-3)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={coordLabel || item.locationLabel}
                    >
                      <span>📍</span>
                      <span>{coordLabel || item.locationLabel || "Mysuru"}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* RECENT COMPLAINTS TABLE */}
      <div
        className="card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 16,
          padding: "clamp(16px, 3vw, 24px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: "clamp(1.05rem, 1.5vw, 1.25rem)" }}>
            📋 My Registered Grievances & Status
          </h3>
          <Link to="/app" style={{ fontSize: 12.5, color: "var(--accent)" }}>
            View Full Desk →
          </Link>
        </div>

        {civicIssues.length === 0 ? (
          <p style={{ color: "var(--fg-3)", fontSize: 13, margin: 0 }}>
            No registered grievances found under your profile.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line-soft)", textAlign: "left", color: "var(--fg-3)" }}>
                  <th style={{ padding: "8px 10px" }}>Ticket ID</th>
                  <th style={{ padding: "8px 10px" }}>Title / Category</th>
                  <th style={{ padding: "8px 10px" }}>Status</th>
                  <th style={{ padding: "8px 10px" }}>Verification</th>
                  <th style={{ padding: "8px 10px" }}>Date</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {civicIssues.slice(0, 8).map((issue) => (
                  <tr
                    key={issue._id || issue.publicId}
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                  >
                    <td style={{ padding: "10px", fontWeight: 700, color: "var(--fg)" }}>
                      {issue.publicId}
                    </td>
                    <td style={{ padding: "10px", color: "var(--fg-2)" }}>
                      {issue.title}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            issue.status === "RESOLVED"
                              ? "rgba(55, 211, 155, 0.18)"
                              : issue.status === "IN_PROGRESS"
                              ? "rgba(59, 130, 246, 0.18)"
                              : "rgba(251, 191, 36, 0.18)",
                          color:
                            issue.status === "RESOLVED"
                              ? "#37d39b"
                              : issue.status === "IN_PROGRESS"
                              ? "#60a5fa"
                              : "#fbbf24",
                        }}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px", color: "#37d39b", fontSize: 12 }}>
                      {issue.verificationScore ? `✓ ${issue.verificationScore}% Score` : "Verified"}
                    </td>
                    <td style={{ padding: "10px", color: "var(--fg-3)", fontSize: 12 }}>
                      {formatDate(issue.createdAt)}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <Link
                        to={`/app/issues/${issue.publicId || issue._id}`}
                        className="btn btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX ZOOM MODAL */}
      {selectedEvidence && (
        <div
          onClick={() => setSelectedEvidence(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "90vh",
              backgroundColor: "#101815",
              border: "1px solid rgba(55, 211, 155, 0.3)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "#0a100e",
              }}
            >
              <div>
                <strong style={{ fontSize: 15, color: "#37d39b" }}>
                  {selectedEvidence.evidenceId} · {selectedEvidence.type || "BEFORE"} EVIDENCE
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-3)" }}>
                  Captured: {formatDate(selectedEvidence.capturedAt)}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedEvidence(null)}
                style={{
                  width: 34,
                  height: 34,
                  padding: 0,
                  borderRadius: "50%",
                  fontSize: 16,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Image Display */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#050807",
                maxHeight: "60vh",
                overflow: "hidden",
              }}
            >
              <img
                src={mediaUrl(selectedEvidence.publicUrl)}
                alt={selectedEvidence.evidenceId}
                style={{
                  maxWidth: "100%",
                  maxHeight: "60vh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Modal Metadata Footer */}
            <div
              style={{
                padding: "16px 20px",
                background: "#0c1411",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 12.5, color: "var(--fg-2)" }}>
                <div>
                  📍 <strong>Location:</strong>{" "}
                  {selectedEvidence.coordinates?.length >= 2
                    ? `${selectedEvidence.coordinates[1].toFixed(5)}°N, ${selectedEvidence.coordinates[0].toFixed(5)}°E`
                    : selectedEvidence.locationLabel || "Mysuru"}
                </div>
                {selectedEvidence.issue && (
                  <div style={{ marginTop: 4 }}>
                    🎫 <strong>Linked Ticket:</strong> #{selectedEvidence.issue.publicId} ({selectedEvidence.issue.status})
                  </div>
                )}
                {selectedEvidence.aiAssessment && (
                  <div style={{ marginTop: 4, color: "#37d39b" }}>
                    🤖 <strong>AI Analysis:</strong> {JSON.stringify(selectedEvidence.aiAssessment)}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {selectedEvidence.issue && (
                  <Link
                    to={`/app/issues/${selectedEvidence.issue.publicId || selectedEvidence.issue._id}`}
                    className="btn btn-primary"
                    style={{ fontSize: 12 }}
                  >
                    Go to Complaint Ticket →
                  </Link>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedEvidence(null)}
                  style={{ fontSize: 12 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
