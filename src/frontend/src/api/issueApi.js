import { api } from "./client.js";

export const issueApi = {
  config: async () => {
    const [categories, zones, slas] = await Promise.all([
      api.get("/config/categories"),
      api.get("/config/zones"),
      api.get("/config/slas"),
    ]);
    return { ...categories, ...zones, ...slas };
  },
  createReport: (body) => api.post("/reports", body),
  myReports: () => api.get("/reports/mine"),
  getReport: (id) => api.get(`/reports/${id}`),
  uploadEvidence: (reportId, form) => api.upload(`/reports/${reportId}/evidence`, form),
  nearby: (q) => api.get(`/issues/nearby?${new URLSearchParams(q)}`),
  attach: (reportId, issueId) => api.post(`/reports/${reportId}/attach`, { issueId }),
  createIssue: (reportId) => api.post(`/reports/${reportId}/create-issue`, {}),
  listMine: () => api.get("/issues"),
  getIssue: (id) => api.get(`/issues/${id}`),
  support: (id) => api.post(`/issues/${id}/support`, {}),
  unsupport: (id) => api.del(`/issues/${id}/support`),
  publicList: (q = {}) => api.get(`/public/issues?${new URLSearchParams(q)}`),
  notifications: () => api.get("/notifications"),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => api.post("/notifications/mark-all-read", {}),
  getMyGallery: () => api.get("/users/gallery"),
  getProfile: () => api.get("/users/me"),
  updateProfile: (data) => api.patch("/users/me", data),
};
