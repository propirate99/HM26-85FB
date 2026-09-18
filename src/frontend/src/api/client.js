const base = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
  upload: (path, form) => request(path, { method: "POST", body: form }),
};

export function mediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const api = import.meta.env.VITE_API_BASE_URL || "";
  if (api.startsWith("http")) {
    return `${new URL(api).origin}${url}`;
  }
  return url;
}
