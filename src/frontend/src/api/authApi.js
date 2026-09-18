import { api } from "./client.js";

export const authApi = {
  me: () => api.get("/auth/me"),
  google: (credential) => api.post("/auth/google", { credential }),
  demo: (email) => api.post("/auth/demo", { email }),
  logout: () => api.post("/auth/logout", {}),
  profile: () => api.get("/users/me"),
  updateProfile: (body) => api.patch("/users/me", body),
};
