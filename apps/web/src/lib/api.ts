import {
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_ID_KEY,
  clearSessionStorage,
} from "./auth";

const API_PORT = process.env.NEXT_PUBLIC_API_PORT?.trim() || "3001";

/** API origin: matches the page host in local dev (localhost vs LAN IP). */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocalDevHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    if (isLocalDevHost && process.env.NODE_ENV !== "production") {
      return `${protocol}//${hostname}:${API_PORT}`;
    }
  }
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured && configured.length > 0
    ? configured
    : `http://localhost:${API_PORT}`;
}

export type SchoolType =
  | "KINDERGARTEN"
  | "PRIMARY"
  | "SECONDARY"
  | "PREPARATORY"
  | "MIXED";

export type SchoolInfo = {
  id: string;
  name: string;
  slug?: string;
  joinCode: string;
  setupComplete?: boolean;
  schoolType?: SchoolType | null;
  logoUrl?: string | null;
  address?: string | null;
  email?: string | null;
  country?: string | null;
  phone?: string | null;
  attendanceMode?: "DAILY" | "PERIOD" | "BOTH";
  gradePreset?: string | null;
  status?: string;
};

export type GradePresetKey = "GRADES_1_8" | "GRADES_9_12" | "KG_12";

export type SetupStatus = {
  setupComplete: boolean;
  gradePreset: GradePresetKey | null;
  gradeCount: number;
  studentCount: number;
};

export type GradeWithSections = {
  id: string;
  name: string;
  sortOrder: number;
  sections: { id: string; name: string }[];
  _count: { students: number };
};

export type CreateStudentPayload = {
  firstName: string;
  lastName: string;
  gradeId: string;
  sectionId?: string;
  /** Omit to auto-generate a unique random ID (e.g. STU-K7H3NP2M) */
  studentId?: string;
  idNumber: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  email?: string;
  /** @deprecated */
  parentName?: string;
  /** @deprecated */
  parentPhone?: string;
  parentEmail?: string;
  fayedaVerificationToken?: string;
  middleName?: string;
  fan?: string;
  fcn?: string;
  photoUrl?: string;
  nationality?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  address?: string;
  phone?: string;
};

export type CreateStudentResult = {
  student: {
    id: string;
    userId: string;
    name: string;
    grade: string;
    studentId: string;
    idNumber: string;
  };
  father: { id: string; phone: string | null; email: string; isNew: boolean };
  mother: { id: string; phone: string | null; email: string; isNew: boolean };
  parent: { id: string; phone: string | null; email: string; isNew: boolean };
  credentials: {
    studentEmail: string;
    portalUsername: string;
    studentTempPassword: string;
    parentPhone: string;
    parentTempPassword: string | null;
    fatherPhone: string;
    fatherTempPassword: string | null;
    motherPhone: string;
    motherTempPassword: string | null;
    welcomeMessage: string;
  };
};

export type StudentRecord = {
  id: string;
  portalTempPassword: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  middleName: string | null;
  dateOfBirth: string | null;
  photoUrl: string | null;
  fan: string | null;
  fcn: string | null;
  nationality: string | null;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  address: string | null;
  phone: string | null;
  fayedaVerifiedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    externalRef: string | null;
  };
  grade: { id: string; name: string };
  section: { id: string; name: string } | null;
  parents: {
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      email: string;
    };
  }[];
};

export type ImportStudentsResult = {
  total: number;
  success: number;
  failed: number;
  results: { row: number; ok: boolean; error?: string; studentName?: string }[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: "admin" | "staff" | "teacher" | "student" | "parent";
    roleTemplateSlug?: string | null;
    roleTemplateName?: string | null;
    permissions?: string[];
    schoolId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  school?: SchoolInfo;
};

export type CurriculumPackageOption = {
  key: string;
  label: string;
  description: string | null;
  gradePreset: string | null;
  schoolType: string | null;
  isBlank: boolean;
  counts: {
    subjects: number;
    departments: number;
    libraryItems: number;
    templates: number;
  };
};

export type RegisterSchoolPayload = {
  schoolName: string;
  schoolType?: SchoolType;
  address?: string;
  schoolEmail?: string;
  logoUrl?: string;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  password: string;
  phone?: string;
  country?: string;
  curriculumPackageKey?: string;
};

export async function fetchCurriculumPackages() {
  const response = await fetch(`${getApiBaseUrl()}/schools/curriculum-packages`);
  if (!response.ok) {
    throw new Error("Could not load curriculum packages");
  }
  return response.json() as Promise<CurriculumPackageOption[]>;
}

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
  studentProfileId: string;
  schoolId: string;
  status: string;
  date: string;
  reason?: string | null;
  periodNumber?: number;
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

export type PlanType = "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export type SubscriptionStatus = {
  plan: PlanType;
  isActive: boolean;
  trialEndsAt: string | null;
  daysRemaining: number | null;
  expired: boolean;
  limits: {
    students: number | null;
    teachers: number | null;
    admins: number | null;
  };
  usage: {
    students: number;
    teachers: number;
    admins: number;
  };
  planLabel: string;
  planDescription: string;
};

export type PlanOption = {
  plan: PlanType;
  students: number | null;
  teachers: number | null;
  admins: number | null;
  label: string;
  description: string;
  usdMonthly?: number;
  etbMonthly?: number;
  features?: string[];
};

async function authPost(path: string, body: unknown): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
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
    if (response.status === 403) throw new Error(msg ?? "Not allowed");
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
  const response = await fetch(`${getApiBaseUrl()}/invites/${encodeURIComponent(token)}`);
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

export async function getSchoolSubscription(): Promise<SubscriptionStatus> {
  return apiFetch<SubscriptionStatus>("/schools/subscription");
}

export async function listPlans(): Promise<PlanOption[]> {
  const response = await fetch(`${getApiBaseUrl()}/schools/plans`);
  if (!response.ok) {
    throw new Error("Could not load plans");
  }
  return response.json();
}

export async function upgradeSchoolPlan(plan: Exclude<PlanType, "TRIAL">): Promise<SubscriptionStatus> {
  return apiPost<SubscriptionStatus>("/schools/subscription/upgrade", { plan });
}

export async function loginWithGoogle(credential: string): Promise<LoginResponse> {
  return authPost("/auth/google", { credential });
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
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
  if (data.user.id) {
    localStorage.setItem(AUTH_USER_ID_KEY, data.user.id);
  }
  return data.accessToken;
}

async function readJsonBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    return null as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid response from server");
  }
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

  const base = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...init, headers });
  } catch (err) {
    const hint =
      err instanceof TypeError
        ? `Cannot reach API at ${base}. Start it: cd apps/api && npm run dev`
        : "API is unavailable";
    throw new Error(hint);
  }

  if (response.status === 401) {
    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      throw new Error("Session expired");
    }
    headers.set("Authorization", `Bearer ${newAccessToken}`);
    let retryResponse: Response;
    try {
      retryResponse = await fetch(`${base}${path}`, { ...init, headers });
    } catch (err) {
      const hint =
        err instanceof TypeError
          ? `Cannot reach API at ${base}. Start it: cd apps/api && npm run dev`
          : "API is unavailable";
      throw new Error(hint);
    }
    if (!retryResponse.ok) {
      throw new Error(`Request failed: ${retryResponse.status}`);
    }
    return readJsonBody<T>(retryResponse);
  }

  if (!response.ok) {
    const data = await readJsonBody<{ message?: string | string[] } | null>(response).catch(
      () => null,
    );
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    if (response.status === 403) {
      throw new Error(msg ?? "Not allowed");
    }
    throw new Error(msg ?? `Request failed: ${response.status}`);
  }

  return readJsonBody<T>(response);
}

export async function apiFetch<T>(path: string): Promise<T> {
  return authedFetch<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return authedFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return authedFetch<T>(path, { method: "DELETE" });
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error("Not authenticated");
  }

  const form = new FormData();
  form.append("file", file);

  const base = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch (err) {
    throw new Error(
      err instanceof TypeError
        ? `Cannot reach API at ${base}. Start it: cd apps/api && npm run dev`
        : "Upload failed — API unavailable",
    );
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(msg ?? `Upload failed: ${response.status}`);
  }

  return response.json();
}
