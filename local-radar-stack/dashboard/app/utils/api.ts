import { apiBase } from "../constants/api";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("radar_auth_token") : null;
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Optionally redirect to login if unauthorized
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  return response;
}
