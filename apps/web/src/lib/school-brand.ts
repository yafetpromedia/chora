import {
  AUTH_SCHOOL_ACCENT_KEY,
  AUTH_SCHOOL_DEEP_KEY,
  AUTH_SCHOOL_LOGO_KEY,
  AUTH_SCHOOL_NAME_KEY,
  AUTH_SCHOOL_PRIMARY_KEY,
} from "@/lib/auth";

export const SCHOOL_BRAND_UPDATED_EVENT = "campusone-school-brand-updated";

export const DEFAULT_SCHOOL_THEME = {
  primaryColor: "#3d9b9b",
  accentColor: "#5ec9cf",
  accentDeep: "#0f766e",
} as const;

export type SchoolBrand = {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  accentDeep: string | null;
};

const THEME_CSS_VARS = [
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
] as const;

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function mix(hex: string, withRgb: { r: number; g: number; b: number }, amount: number): string {
  const a = hexToRgb(hex);
  return rgbToHex(
    a.r + (withRgb.r - a.r) * amount,
    a.g + (withRgb.g - a.g) * amount,
    a.b + (withRgb.b - a.b) * amount,
  );
}

export function readSchoolBrand(): SchoolBrand {
  if (typeof window === "undefined") {
    return {
      name: "Chora",
      logoUrl: null,
      primaryColor: null,
      accentColor: null,
      accentDeep: null,
    };
  }
  const name = localStorage.getItem(AUTH_SCHOOL_NAME_KEY) || "Chora";
  const logoUrl = localStorage.getItem(AUTH_SCHOOL_LOGO_KEY);
  return {
    name,
    logoUrl: logoUrl || null,
    primaryColor: normalizeHex(localStorage.getItem(AUTH_SCHOOL_PRIMARY_KEY)),
    accentColor: normalizeHex(localStorage.getItem(AUTH_SCHOOL_ACCENT_KEY)),
    accentDeep: normalizeHex(localStorage.getItem(AUTH_SCHOOL_DEEP_KEY)),
  };
}

function writeColorKey(key: string, value: string | null | undefined) {
  if (value === undefined) return;
  const normalized = normalizeHex(value);
  if (normalized) {
    localStorage.setItem(key, normalized);
  } else {
    localStorage.removeItem(key);
  }
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
  writeColorKey(AUTH_SCHOOL_PRIMARY_KEY, brand.primaryColor);
  writeColorKey(AUTH_SCHOOL_ACCENT_KEY, brand.accentColor);
  writeColorKey(AUTH_SCHOOL_DEEP_KEY, brand.accentDeep);
  applySchoolTheme(readSchoolBrand());
  window.dispatchEvent(new CustomEvent(SCHOOL_BRAND_UPDATED_EVENT));
}

export function applySchoolTheme(brand?: Partial<SchoolBrand> | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary =
    normalizeHex(brand?.primaryColor) ?? DEFAULT_SCHOOL_THEME.primaryColor;
  const accent =
    normalizeHex(brand?.accentColor) ?? DEFAULT_SCHOOL_THEME.accentColor;
  const deep =
    normalizeHex(brand?.accentDeep) ?? DEFAULT_SCHOOL_THEME.accentDeep;

  root.style.setProperty("--brand-teal", primary);
  root.style.setProperty("--brand-teal-dark", deep);
  root.style.setProperty("--brand-accent-deep", deep);
  root.style.setProperty("--brand-cyan", accent);
  root.style.setProperty("--brand-cyan-light", mix(accent, { r: 255, g: 255, b: 255 }, 0.55));
  root.style.setProperty("--brand-ink", mix(primary, { r: 0, g: 0, b: 0 }, 0.55));
  root.style.setProperty("--brand-muted", mix(primary, { r: 80, g: 80, b: 80 }, 0.35));
  root.style.setProperty("--brand-faint", mix(primary, { r: 160, g: 160, b: 160 }, 0.45));
  root.style.setProperty("--brand-border", mix(primary, { r: 255, g: 255, b: 255 }, 0.72));
  root.style.setProperty("--brand-surface", mix(primary, { r: 255, g: 255, b: 255 }, 0.9));
  root.style.setProperty("--brand-surface-2", mix(primary, { r: 255, g: 255, b: 255 }, 0.82));
}

export function clearSchoolTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const prop of THEME_CSS_VARS) {
    root.style.removeProperty(prop);
  }
}

export function clearSchoolBrandStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_SCHOOL_PRIMARY_KEY);
  localStorage.removeItem(AUTH_SCHOOL_ACCENT_KEY);
  localStorage.removeItem(AUTH_SCHOOL_DEEP_KEY);
  clearSchoolTheme();
}
