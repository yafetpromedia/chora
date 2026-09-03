import { BRAND_NAME } from "@/lib/brand";

export const SCHOOL_WELCOME_STORAGE_KEY = "chora:school-welcome-pending";
export const SCHOOL_TRIAL_DAYS = 14;

export type PendingSchoolWelcome = {
  schoolName: string;
  joinCode: string;
  nextPath: string;
  adminUsername: string;
};

export function getLoginUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_WEB_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) {
    return normalizeLoginUrl(env);
  }
  if (typeof window !== "undefined") {
    return normalizeLoginUrl(`${window.location.origin}/login`);
  }
  return "/login";
}

export function normalizeLoginUrl(raw: string): string {
  let value = raw.trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  try {
    const parsed = new URL(value);
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/login";
    }
    const path = parsed.pathname.replace(/\/+$/, "") || "/login";
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export function handoutLoginUrlStorageKey(joinCode: string): string {
  return `chora:handout-login-url:${joinCode.trim().toUpperCase()}`;
}

export function readSavedHandoutLoginUrl(joinCode: string): string | null {
  if (typeof window === "undefined" || !joinCode.trim()) return null;
  try {
    const saved = localStorage.getItem(handoutLoginUrlStorageKey(joinCode));
    return saved?.trim() ? normalizeLoginUrl(saved) : null;
  } catch {
    return null;
  }
}

export function saveHandoutLoginUrl(joinCode: string, url: string): void {
  if (typeof window === "undefined" || !joinCode.trim()) return;
  const normalized = normalizeLoginUrl(url);
  if (!normalized) {
    localStorage.removeItem(handoutLoginUrlStorageKey(joinCode));
    return;
  }
  localStorage.setItem(handoutLoginUrlStorageKey(joinCode), normalized);
}

export function buildParentHandout(opts: {
  schoolName: string;
  joinCode: string;
  loginUrl?: string;
}): string {
  const baseUrl = opts.loginUrl ?? getLoginUrl();
  return (
    `${opts.schoolName} — Parent portal\n\n` +
    `1. Open: ${baseUrl}\n` +
    `2. School code: ${opts.joinCode}`
  );
}

export function buildStudentHandout(opts: {
  schoolName: string;
  joinCode: string;
  loginUrl?: string;
}): string {
  const baseUrl = opts.loginUrl ?? getLoginUrl();
  return (
    `${opts.schoolName} — Student portal\n\n` +
    `1. Open: ${baseUrl}\n` +
    `2. School code: ${opts.joinCode}`
  );
}

export function buildShareHandout(opts: {
  schoolName: string;
  joinCode: string;
  loginUrl?: string;
  adminUsername?: string;
}): string {
  const baseUrl = opts.loginUrl ?? getLoginUrl();
  return (
    `${opts.schoolName} — ${BRAND_NAME} portal\n` +
    `Login page: ${baseUrl}\n` +
    `School code: ${opts.joinCode}` +
    `\n\n--- Parents ---\n${buildParentHandout(opts)}` +
    `\n\n--- Students ---\n${buildStudentHandout(opts)}`
  );
}

export function persistPendingSchoolWelcome(data: PendingSchoolWelcome): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCHOOL_WELCOME_STORAGE_KEY, JSON.stringify(data));
}

export function readPendingSchoolWelcome(): PendingSchoolWelcome | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SCHOOL_WELCOME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSchoolWelcome;
    if (!parsed.schoolName || !parsed.joinCode || !parsed.nextPath || !parsed.adminUsername) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingSchoolWelcome(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SCHOOL_WELCOME_STORAGE_KEY);
}
