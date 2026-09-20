import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/authApi.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => {
    try {
      const cached = localStorage.getItem("mcc_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);

  const setUser = (newUser) => {
    setUserState(newUser);
    try {
      if (newUser) {
        localStorage.setItem("mcc_user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("mcc_user");
      }
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    authApi
      .me()
      .then((d) => {
        if (d?.user) {
          setUser(d.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        // If unauthenticated on server, clear stale cached user
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    setUser(null);
  };

  const normRole = String(user?.role || "").toLowerCase();
  const isAdmin = normRole === "main_authority" || normRole === "admin";
  const isOfficer = normRole === "zone_officer" || normRole === "officer";
  const isCitizen = normRole === "citizen" || (!isAdmin && !isOfficer && Boolean(user));

  const value = {
    user,
    ready,
    setUser,
    logout,
    isAdmin,
    isOfficer,
    isCitizen,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

