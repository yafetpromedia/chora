import { AUTH_SCHOOL_LOGO_KEY, AUTH_SCHOOL_NAME_KEY } from "@/lib/auth";

export const SCHOOL_BRAND_UPDATED_EVENT = "campusone-school-brand-updated";

export type SchoolBrand = {
  name: string;
  logoUrl: string | null;
};

export function readSchoolBrand(): SchoolBrand {
  if (typeof window === "undefined") {
    return { name: "CampusOne", logoUrl: null };
  }
  const name = localStorage.getItem(AUTH_SCHOOL_NAME_KEY) || "CampusOne";
  const logoUrl = localStorage.getItem(AUTH_SCHOOL_LOGO_KEY);
  return { name, logoUrl: logoUrl || null };
}

export function persistSchoolBrand(brand: Partial<SchoolBrand>) {
  if (typeof window === "undefined") return;
  if (brand.name) {
    localStorage.setItem(AUTH_SCHOOL_NAME_KEY, brand.name);
  }
  if (brand.logoUrl !== undefined) {
    if (brand.logoUrl) {
      localStorage.setItem(AUTH_SCHOOL_LOGO_KEY, brand.logoUrl);
    } else {
      localStorage.removeItem(AUTH_SCHOOL_LOGO_KEY);
    }
  }
  window.dispatchEvent(new CustomEvent(SCHOOL_BRAND_UPDATED_EVENT));
}
