import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredUser, getToken, getRefreshToken, setSession, clearSession, API } from "./api";

interface Ctx {
  user: any;
  org: any;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (token: string, user: any, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<Ctx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(getStoredUser());
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(!!getToken());

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const data = await api("/api/auth/me");
      setUser(data.user);
      setSession(getToken()!, data.user);
      if (data.user.orgId) {
        try {
          const o = await api("/api/org");
          setOrg(o.org);
        } catch {
          setOrg(null);
        }
      }
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback((token: string, u: any, refreshToken?: string) => {
    setSession(token, u, refreshToken);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    const rf = getRefreshToken();
    if (rf) {
      fetch(`${API}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rf }),
      }).catch(() => {});
    }
    clearSession();
    setUser(null);
    setOrg(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, org, loading, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "PLATFORM";
}