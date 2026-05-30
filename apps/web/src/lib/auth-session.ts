import type { LoginResponse, SchoolInfo } from "@/lib/api";
import {
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_ROLE_KEY,
  AUTH_SCHOOL_JOIN_CODE_KEY,
  AUTH_SCHOOL_NAME_KEY,
  AUTH_TOKEN_KEY,
} from "@/lib/auth";

export function persistAuthSession(response: LoginResponse) {
  localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, response.refreshToken);
  localStorage.setItem(AUTH_ROLE_KEY, response.user.role);

  if (response.school?.joinCode) {
    localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, response.school.joinCode);
  }
  if (response.school?.name) {
    localStorage.setItem(AUTH_SCHOOL_NAME_KEY, response.school.name);
  }
}

export function saveSchoolInfo(school: SchoolInfo) {
  localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, school.joinCode);
  localStorage.setItem(AUTH_SCHOOL_NAME_KEY, school.name);
}
