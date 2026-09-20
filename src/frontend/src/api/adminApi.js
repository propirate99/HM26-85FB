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
  aiStatus: () => api.get("/admin/ai/status"),
  updateAiConfig: (body) => api.post("/admin/ai/config", body),
  // RBAC Enterprise Operations
  getTriage: () => api.get("/admin/triage"),
  patchTriage: (id, body) => api.patch(`/admin/triage/${id}`, body),
  getLogistics: () => api.get("/admin/logistics"),
  dispatchLogistics: (body) => api.post("/admin/logistics/dispatch", body),
  getSimulators: () => api.get("/admin/simulators"),
  runSimulator: (body) => api.post("/admin/simulators/run", body),
  getAuditLogs: () => api.get("/admin/audit-trail"),
  getMedia: () => api.get("/admin/media"),
  toggleMediaMask: (id) => api.patch(`/admin/media/${id}/mask`, {}),
};


