import { api } from "./client.js";

export const adminApi = {
  queue: () => api.get("/officer/queue"),
  officerIssue: (id) => api.get(`/officer/issues/${id}`),
  accept: (id) => api.post(`/officer/issues/${id}/accept`, {}),
  status: (id, body) => api.post(`/officer/issues/${id}/status`, body),
  note: (id, message) => api.post(`/officer/issues/${id}/note`, { message }),
  resolution: (id, form) => api.upload(`/officer/issues/${id}/resolution-evidence`, form),
  resolve: (id, message) => api.post(`/officer/issues/${id}/resolve`, { message }),
  analytics: () => api.get("/admin/analytics"),
  issues: () => api.get("/admin/issues"),
  escalated: () => api.get("/admin/escalated"),
  officers: () => api.get("/admin/officers"),
  audit: () => api.get("/admin/audit"),
  review: (reportId, body) => api.post(`/admin/reviews/${reportId}/decision`, body),
};
