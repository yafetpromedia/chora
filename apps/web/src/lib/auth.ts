import {
  AUTH_PERMISSIONS_KEY,
  AUTH_ROLE_TEMPLATE_KEY,
} from "@/lib/permissions";

export {
  AUTH_PERMISSIONS_KEY,
  AUTH_ROLE_TEMPLATE_KEY,
} from "@/lib/permissions";
export type { PermissionKey } from "@/lib/permissions";

export const AUTH_TOKEN_KEY = "edu_os_token";
export const AUTH_REFRESH_TOKEN_KEY = "edu_os_refresh_token";
export const AUTH_ROLE_KEY = "edu_os_role";
export const AUTH_USER_ID_KEY = "edu_os_user_id";
export const AUTH_SCHOOL_JOIN_CODE_KEY = "edu_os_school_join_code";
export const AUTH_SCHOOL_NAME_KEY = "edu_os_school_name";
export const AUTH_SCHOOL_LOGO_KEY = "edu_os_school_logo";
export const AUTH_SCHOOL_PRIMARY_KEY = "edu_os_school_primary";
export const AUTH_SCHOOL_ACCENT_KEY = "edu_os_school_accent";
export const AUTH_SCHOOL_DEEP_KEY = "edu_os_school_deep";

/** Current signed-in school user id (from session or JWT). */
export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(AUTH_USER_ID_KEY);
  if (stored) return stored;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { id?: string };
    return payload.id ?? null;
  } catch {
    return null;
  }
}

export type UserRole = "admin" | "staff" | "teacher" | "student" | "parent";

export function getRolePath(role: UserRole): string {
  if (role === "admin" || role === "staff") return "/admin";
  return `/${role}`;
}

export function isSchoolWorkspaceRole(role: string | null): boolean {
  return role === "admin" || role === "staff";
}

export function clearSessionStorage() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
  localStorage.removeItem(AUTH_USER_ID_KEY);
  localStorage.removeItem(AUTH_PERMISSIONS_KEY);
  localStorage.removeItem(AUTH_ROLE_TEMPLATE_KEY);
  localStorage.removeItem(AUTH_SCHOOL_JOIN_CODE_KEY);
  localStorage.removeItem(AUTH_SCHOOL_NAME_KEY);
  localStorage.removeItem(AUTH_SCHOOL_LOGO_KEY);
  localStorage.removeItem(AUTH_SCHOOL_PRIMARY_KEY);
  localStorage.removeItem(AUTH_SCHOOL_ACCENT_KEY);
  localStorage.removeItem(AUTH_SCHOOL_DEEP_KEY);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    for (const prop of [
      "--brand-teal",
      "--brand-teal-dark",
      "--brand-cyan",
      "--brand-cyan-light",
      "--brand-accent-deep",
      "--brand-ink",
      "--brand-muted",
      "--brand-faint",
      "--brand-border",
      "--brand-surface",
      "--brand-surface-2",
    ]) {
      root.style.removeProperty(prop);
    }
  }
}
