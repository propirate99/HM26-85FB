import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { issueApi } from "../api/issueApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { formatDate } from "../utils/formatDate.js";

export function NotificationCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all' | 'unread'
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const dropdownRef = useRef(null);

  async function fetchNotifications() {
    if (!user) return;
    try {
      const res = await issueApi.notifications();
      setItems(res.notifications || []);
    } catch (_err) {}
  }

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, [user]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = items.filter((n) => !n.read).length;
  const filteredItems = filter === "unread" ? items.filter((n) => !n.read) : items;

  async function handleMarkRead(id, e) {
    if (e) e.stopPropagation();
    try {
      await issueApi.markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (_e) {}
  }

  async function handleMarkAllRead() {
    try {
      await issueApi.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (_e) {}
  }

  function getTypeBadge(type) {
    switch (type) {
      case "ADMIN_NEW_COMPLAINT":
        return { icon: "🚨", label: "New Complaint", color: "#f87171", bg: "rgba(239, 68, 68, 0.15)" };
      case "ADMIN_EVIDENCE_ATTACHED":
      case "EVIDENCE_ATTACHED":
        return { icon: "📸", label: "Evidence Photo", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" };
      case "OFFICER_ASSIGNED":
        return { icon: "📋", label: "Task Assigned", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.15)" };
      case "COMPLAINT_REGISTERED":
        return { icon: "✅", label: "Registered", color: "#37d39b", bg: "rgba(55, 211, 155, 0.15)" };
      case "STATUS_UPDATE":
        return { icon: "⚡", label: "Status Update", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.15)" };
      default:
        return { icon: "🔔", label: "Alert", color: "#37d39b", bg: "rgba(55, 211, 155, 0.1)" };
    }
  }

  if (!user) return null;

  return (
    <div className="notification-center-container" ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`btn ghost notif-bell-btn ${unreadCount > 0 ? "has-unread" : ""}`}
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        title="View Notifications & Evidence Dispatch"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          borderRadius: 10,
          background: open ? "var(--bg-3)" : "rgba(26, 38, 34, 0.6)",
          border: unreadCount > 0 ? "1px solid rgba(55, 211, 155, 0.4)" : "1px solid var(--line-soft)",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 16 }}>🔔</span>
        {unreadCount > 0 ? (
          <span
            style={{
              background: "#37d39b",
              color: "#0a100d",
              fontSize: 11,
              fontWeight: 800,
              padding: "1px 6px",
              borderRadius: 999,
              minWidth: 18,
              textAlign: "center",
              boxShadow: "0 0 10px rgba(55, 211, 155, 0.6)",
            }}
          >
            {unreadCount}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Alerts</span>
        )}
      </button>

      {/* Floating Dropdown Panel */}
      {open && (
        <div
          className="notif-dropdown-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "clamp(340px, 90vw, 440px)",
            maxHeight: "80vh",
            background: "linear-gradient(180deg, #16221f 0%, #0d1513 100%)",
            border: "1px solid rgba(55, 211, 155, 0.3)",
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(55, 211, 155, 0.15)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 18px",
              borderBottom: "1px solid var(--line-soft)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(20, 30, 27, 0.8)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <strong style={{ fontSize: 15, color: "var(--fg)" }}>
                {user.role === "MAIN_AUTHORITY" ? "Authority Dispatch Alerts" : "Notifications"}
              </strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "rgba(55, 211, 155, 0.2)",
                    color: "#37d39b",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    border: "1px solid rgba(55, 211, 155, 0.3)",
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    fontSize: 12,
                    cursor: "pointer",
                    padding: "2px 6px",
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--fg-3)",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "2px 6px",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: "flex",
              padding: "8px 16px",
              gap: 8,
              borderBottom: "1px solid var(--line-soft)",
              background: "rgba(15, 23, 21, 0.5)",
            }}
          >
            <button
              type="button"
              onClick={() => setFilter("all")}
              style={{
                background: filter === "all" ? "var(--bg-3)" : "transparent",
                border: "none",
                borderRadius: 8,
                color: filter === "all" ? "var(--fg)" : "var(--fg-3)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                cursor: "pointer",
              }}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              style={{
                background: filter === "unread" ? "var(--bg-3)" : "transparent",
                border: "none",
                borderRadius: 8,
                color: filter === "unread" ? "#37d39b" : "var(--fg-3)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                cursor: "pointer",
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div style={{ overflowY: "auto", maxHeight: "calc(80vh - 120px)", padding: 8 }}>
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--fg-3)" }}>
                <span style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.6 }}>📭</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>No notifications yet</p>
                <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.7 }}>
                  Complaints, evidence photos, and location updates will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredItems.map((n) => {
                const badge = getTypeBadge(n.type);
                const targetUrl = n.issuePublicId
                  ? user.role === "ZONE_OFFICER"
                    ? `/officer/issues/${n.issuePublicId}`
                    : `/app/issues/${n.issuePublicId}`
                  : null;

                return (
                  <div
                    key={n._id}
                    onClick={() => {
                      if (!n.read) handleMarkRead(n._id);
                    }}
                    style={{
                      padding: 14,
                      marginBottom: 8,
                      borderRadius: 12,
                      background: n.read ? "rgba(26, 38, 34, 0.35)" : "rgba(32, 50, 44, 0.75)",
                      border: n.read ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(55, 211, 155, 0.35)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      transition: "all 0.2s ease",
                      position: "relative",
                    }}
                  >
                    {/* Top Row: Badge + Time + Read Dot */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: badge.bg,
                          color: badge.color,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {badge.icon} {badge.label}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{formatDate(n.createdAt)}</span>
                        {!n.read && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#37d39b",
                              boxShadow: "0 0 6px #37d39b",
                            }}
                            title="Unread"
                          />
                        )}
                      </div>
                    </div>

                    {/* Title & Body */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)" }}>{n.title}</div>
                      {n.body && (
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>
                          {n.body}
                        </p>
                      )}
                    </div>

                    {/* Photo & Location Section */}
                    {(n.photoUrl || n.locationLabel || n.location?.coordinates) && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: 8,
                          borderRadius: 8,
                          background: "rgba(10, 16, 14, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        {/* Evidence Photo Thumbnail */}
                        {n.photoUrl ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhoto({ url: n.photoUrl, title: n.title, loc: n.locationLabel });
                            }}
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 8,
                              overflow: "hidden",
                              flexShrink: 0,
                              cursor: "zoom-in",
                              position: "relative",
                              border: "1px solid rgba(55, 211, 155, 0.3)",
                              background: "#000",
                            }}
                            title="Click to view full photo"
                          >
                            <img
                              src={n.photoUrl}
                              alt="Evidence"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                bottom: 2,
                                right: 2,
                                background: "rgba(0,0,0,0.7)",
                                borderRadius: 4,
                                padding: "1px 3px",
                                fontSize: 9,
                              }}
                            >
                              🔍
                            </div>
                          </div>
                        ) : null}

                        {/* Location Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#37d39b" }}>
                            📍 {n.locationLabel || "Mysuru Verified Coordinates"}
                          </div>
                          {n.location?.coordinates && (
                            <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2, fontFamily: "monospace" }}>
                              {n.location.coordinates[1]?.toFixed(5)}°N, {n.location.coordinates[0]?.toFixed(5)}°E
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Links */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      {targetUrl ? (
                        <Link
                          to={targetUrl}
                          onClick={() => setOpen(false)}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--accent)",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          View Work Order ({n.issuePublicId}) ↗
                        </Link>
                      ) : (
                        <span />
                      )}

                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(n._id, e)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--fg-3)",
                            fontSize: 11,
                            cursor: "pointer",
                            padding: "2px 6px",
                          }}
                          title="Mark as read"
                        >
                          ✓ Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Lightbox / Full Photo Modal Preview */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
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
              maxWidth: "min(680px, 95vw)",
              background: "#16221f",
              borderRadius: 16,
              border: "1px solid rgba(55, 211, 155, 0.4)",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--line-soft)",
              }}
            >
              <div>
                <strong style={{ fontSize: 14 }}>📷 Captured Evidence Photo</strong>
                {previewPhoto.loc && <div style={{ fontSize: 11, color: "#37d39b" }}>📍 {previewPhoto.loc}</div>}
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                style={{ background: "none", border: "none", color: "var(--fg)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ maxHeight: "70vh", overflow: "hidden", display: "flex", justifyContent: "center", background: "#000" }}>
              <img
                src={previewPhoto.url}
                alt="Captured Complaint Evidence"
                style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
