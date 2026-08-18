export const API: string = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

export function getToken(): string | null {
  return localStorage.getItem("naio_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("naio_refresh");
}

export function setSession(token: string, user: any, refresh?: string) {
  localStorage.setItem("naio_token", token);
  localStorage.setItem("naio_user", JSON.stringify(user));
  if (refresh) localStorage.setItem("naio_refresh", refresh);
}

export function clearSession() {
  localStorage.removeItem("naio_token");
  localStorage.removeItem("naio_user");
  localStorage.removeItem("naio_refresh");
}

export function getStoredUser(): any {
  try {
    return JSON.parse(localStorage.getItem("naio_user") || "null");
  } catch {
    return null;
  }
}

export async function api<T = any>(path: string, opts: RequestInit & { _retry?: boolean } = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });

  // 401 → intenta renovar con el refresh token y reintenta una sola vez
  if (res.status === 401 && !opts._retry) {
    const rf = getRefreshToken();
    if (rf) {
      try {
        const rr = await fetch(`${API}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rf }),
        });
        if (rr.ok) {
          const j = await rr.json();
          setSession(j.token, getStoredUser(), j.refreshToken);
          return api<T>(path, { ...opts, _retry: true });
        }
      } catch {
        /* sigue al cierre de sesión */
      }
    }
    clearSession();
    if (!location.pathname.startsWith("/login")) location.href = "/login";
    throw new Error("Sesión expirada");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Error ${res.status}`);
  return data as T;
}

export function q(params: Record<string, any>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}