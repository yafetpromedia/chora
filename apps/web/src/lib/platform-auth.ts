import { getApiBaseUrl } from "@/lib/api";

export const PLATFORM_TOKEN_KEY = "campusone_platform_token";
export const PLATFORM_USER_KEY = "campusone_platform_user";

export type PlatformUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "OWNER" | "SUPPORT" | "SALES";
  scope: "platform";
};

export type PlatformLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: PlatformUser;
};

export async function platformLogin(
  email: string,
  password: string,
): Promise<PlatformLoginResponse> {
  const res = await fetch(`${getApiBaseUrl()}/platform/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Login failed");
  }
  return res.json();
}

export function clearPlatformSession() {
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  localStorage.removeItem(PLATFORM_USER_KEY);
}

export function isPlatformAuthError(err: unknown) {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("unauthorized") ||
    msg.includes("not authenticated") ||
    msg.includes("session expired") ||
    msg.includes("platform user no longer exists")
  );
}

export async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(PLATFORM_TOKEN_KEY);
  if (!token) throw new Error("Not authenticated");

  const headers = new Headers(init?.headers);
  if (init?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    const message = data?.message ?? `Request failed: ${res.status}`;
    if (res.status === 401) {
      clearPlatformSession();
      throw new Error(message === "Unauthorized" ? "Session expired — sign in again" : message);
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export function persistPlatformSession(data: PlatformLoginResponse) {
  localStorage.setItem(PLATFORM_TOKEN_KEY, data.accessToken);
  localStorage.setItem(PLATFORM_USER_KEY, JSON.stringify(data.user));
}
