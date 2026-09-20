const base =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "/api";

async function request(path, options = {}) {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("cv_token") : null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || data.message || res.statusText || "Request failed";
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, form) => request(path, { method: "POST", body: form }),
};

export const complaintsApi = {
  submitComplaint: (formData) => api.upload("/complaints", formData),
  list: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") q.append(k, v);
    });
    const qs = q.toString();
    return api.get(`/complaints${qs ? `?${qs}` : ""}`);
  },
  get: (id) => api.get(`/complaints/${id}`),
  updateStatus: (id, { status, resolutionNote }) =>
    api.patch(`/complaints/${id}/status`, { status, resolutionNote }),
};

export function mediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "";
  if (apiUrl.startsWith("http")) {
    return `${new URL(apiUrl).origin}${url}`;
  }
  return url;
}
