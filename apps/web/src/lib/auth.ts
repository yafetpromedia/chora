export const AUTH_TOKEN_KEY = "edu_os_token";
export const AUTH_REFRESH_TOKEN_KEY = "edu_os_refresh_token";
export const AUTH_ROLE_KEY = "edu_os_role";
export const AUTH_SCHOOL_JOIN_CODE_KEY = "edu_os_school_join_code";
export const AUTH_SCHOOL_NAME_KEY = "edu_os_school_name";

export type UserRole = "admin" | "teacher" | "student" | "parent";

export function getRolePath(role: UserRole): string {
  return `/${role}`;
}

export function clearSessionStorage() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
  localStorage.removeItem(AUTH_SCHOOL_JOIN_CODE_KEY);
  localStorage.removeItem(AUTH_SCHOOL_NAME_KEY);
}
