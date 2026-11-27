import type { LoginResponse, SchoolInfo } from "@/lib/api";
import {
  AUTH_PERMISSIONS_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_ROLE_KEY,
  AUTH_USER_ID_KEY,
  AUTH_SCHOOL_JOIN_CODE_KEY,
  AUTH_SCHOOL_NAME_KEY,
  AUTH_ROLE_TEMPLATE_KEY,
  AUTH_TOKEN_KEY,
} from "@/lib/auth";
import { persistSchoolBrand } from "@/lib/school-brand";

export function persistAuthSession(response: LoginResponse) {
  localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, response.refreshToken);
  localStorage.setItem(AUTH_ROLE_KEY, response.user.role);
  if (response.user.id) {
    localStorage.setItem(AUTH_USER_ID_KEY, response.user.id);
  }
  if (response.user.permissions?.length) {
    localStorage.setItem(AUTH_PERMISSIONS_KEY, JSON.stringify(response.user.permissions));
  } else {
    localStorage.removeItem(AUTH_PERMISSIONS_KEY);
  }
  if (response.user.roleTemplateSlug) {
    localStorage.setItem(AUTH_ROLE_TEMPLATE_KEY, response.user.roleTemplateSlug);
  } else {
    localStorage.removeItem(AUTH_ROLE_TEMPLATE_KEY);
  }

  if (response.school?.joinCode) {
    localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, response.school.joinCode);
  }
  if (response.school?.name) {
    localStorage.setItem(AUTH_SCHOOL_NAME_KEY, response.school.name);
  }
  if (response.school) {
    persistSchoolBrand({
      name: response.school.name,
      logoUrl: response.school.logoUrl ?? null,
      primaryColor: response.school.primaryColor ?? null,
      accentColor: response.school.accentColor ?? null,
      accentDeep: response.school.accentDeep ?? null,
    });
  }
}

export function saveSchoolInfo(school: SchoolInfo) {
  localStorage.setItem(AUTH_SCHOOL_JOIN_CODE_KEY, school.joinCode);
  localStorage.setItem(AUTH_SCHOOL_NAME_KEY, school.name);
  persistSchoolBrand({
    name: school.name,
    logoUrl: school.logoUrl ?? null,
    primaryColor: school.primaryColor ?? null,
    accentColor: school.accentColor ?? null,
    accentDeep: school.accentDeep ?? null,
  });
}
