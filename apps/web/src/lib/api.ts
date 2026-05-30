import {
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  clearSessionStorage,
} from "./auth";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : "http://localhost:3001";

export type SchoolInfo = {
  id: string;
  name: string;
  slug?: string;
  joinCode: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id?: string;
    role: "admin" | "teacher" | "student" | "parent";
    schoolId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  school?: SchoolInfo;
};

export type RegisterSchoolPayload = {
  schoolName: string;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  password: string;
  phone?: string;
  country?: string;
};

export type JoinSchoolPayload = {
  schoolCode: string;
  role: "teacher" | "student" | "parent";
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  externalRef?: string;
};

export type JoinInvitePayload = {
  inviteToken: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  externalRef?: string;
};

export type InvitePreview = {
  valid: boolean;
  token: string;
  schoolName: string;
  role: "teacher" | "student" | "parent";
  label: string | null;
  expiresAt: string | null;
};

export type SchoolInvite = {
  id: string;
  token: string;
  role: string;
  label: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  inviteUrl: string;
  createdAt: string;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  schoolId: string;
  status: string;
  date: string;
};

export type ResultRecord = {
  id: string;
  studentId: string;
  schoolId: string;
  subject: string;
  score: number;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

async function authPost(path: string, body: unknown): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const hint =
      typeof window !== "undefined" && err instanceof TypeError
        ? "Cannot reach API. Is it running on port 3001? Restart with: npm run dev"
        : "API is unavailable. Start backend server and try again.";
    throw new Error(hint);
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    if (response.status === 401) throw new Error(msg ?? "Invalid credentials");
    if (response.status === 404) throw new Error(msg ?? "School code not found");
    if (response.status === 409) throw new Error(msg ?? "Account already exists");
    if (response.status === 400) throw new Error(msg ?? "Invalid request");
    throw new Error(msg ?? "Request failed. Please try again.");
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return authPost("/auth/login", { email, password });
}

export async function registerSchool(payload: RegisterSchoolPayload): Promise<LoginResponse> {
  return authPost("/auth/register-school", payload);
}

export async function joinSchool(payload: JoinSchoolPayload): Promise<LoginResponse> {
  return authPost("/auth/join-school", payload);
}

export async function joinInvite(payload: JoinInvitePayload): Promise<LoginResponse> {
  return authPost("/auth/join-invite", payload);
}

export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  const response = await fetch(`${API_BASE_URL}/invites/${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error("Invitation not found");
  }
  return response.json();
}

export async function createSchoolInvite(body: {
  role: "teacher" | "student" | "parent";
  label?: string;
  expiresInDays?: number;
  maxUses?: number;
}): Promise<SchoolInvite> {
  return apiPost<SchoolInvite>("/schools/invites", body);
}

export async function listSchoolInvites(): Promise<SchoolInvite[]> {
  return apiFetch<SchoolInvite[]>("/schools/invites");
}

export async function loginWithGoogle(credential: string): Promise<LoginResponse> {
  return authPost("/auth/google", { credential });
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearSessionStorage();
    return null;
  }

  const data = (await response.json()) as LoginResponse;
  localStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, data.refreshToken);
  return data.accessToken;
}

async function authedFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error("Not authenticated");
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 401) {
    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      throw new Error("Session expired");
    }
    headers.set("Authorization", `Bearer ${newAccessToken}`);
    const retryResponse = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    if (!retryResponse.ok) {
      throw new Error(`Request failed: ${retryResponse.status}`);
    }
    return retryResponse.json();
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(msg ?? `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function apiFetch<T>(path: string): Promise<T> {
  return authedFetch<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}
