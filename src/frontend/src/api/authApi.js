import { api } from "./client.js";

export const authApi = {
  me: () => api.get("/auth/me"),
  login: async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    if (data?.token) {
      localStorage.setItem("cv_token", data.token);
    }
    return data;
  },
  register: async (userData) => {
    const data = await api.post("/auth/register", userData);
    if (data?.token) {
      localStorage.setItem("cv_token", data.token);
    }
    return data;
  },
  google: async (credential) => {
    const data = await api.post("/auth/google", { credential });
    if (data?.token) {
      localStorage.setItem("cv_token", data.token);
    }
    return data;
  },
  demo: async (email, name, address) => {
    const data = await api.post("/auth/demo", { email, name, address });
    if (data?.token) {
      localStorage.setItem("cv_token", data.token);
    }
    return data;
  },
  logout: async () => {
    try {
      await api.post("/auth/logout", {});
    } finally {
      localStorage.removeItem("cv_token");
      localStorage.removeItem("mcc_user");
    }
  },
  profile: () => api.get("/users/me"),
  updateProfile: (body) => api.patch("/users/me", body),
};
