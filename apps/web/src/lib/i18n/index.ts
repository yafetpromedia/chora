import { am } from "./dictionaries/am";
import { en, type Dictionary } from "./dictionaries/en";
import {
  APP_LOCALES,
  isAppLocale,
  LOCALE_STORAGE_KEY,
  type AppLocale,
} from "./types";

export type { AppLocale, Dictionary };
export { APP_LOCALES, LOCALE_LABELS, LOCALE_STORAGE_KEY, isAppLocale } from "./types";

const dictionaries: Record<AppLocale, Dictionary> = { en, am };

/** Dot-path keys like `common.logOut` or `pages.parentAttendance.title`. */
export type MessageKey = string;

type Vars = Record<string, string | number>;

function getNode(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function getByPath(obj: unknown, path: string): string | undefined {
  const cur = getNode(obj, path);
  return typeof cur === "string" ? cur : undefined;
}

export function getDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale] ?? en;
}

export function translate(
  locale: AppLocale,
  key: MessageKey | string,
  vars?: Vars,
): string {
  const primary = getByPath(dictionaries[locale], key);
  const fallback = locale === "en" ? undefined : getByPath(en, key);
  let text = primary ?? fallback ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Translate a nav/sidebar English label. */
export function translateNavLabel(locale: AppLocale, label: string): string {
  const key = `nav.${label}` as MessageKey;
  const translated = translate(locale, key);
  return translated === key ? label : translated;
}

/** Lookup a map like pageTitles / pageSubtitles by English source string. */
export function translateMapped(
  locale: AppLocale,
  mapPath: "pageTitles" | "pageSubtitles",
  label: string | undefined | null,
): string {
  if (!label) return "";
  const primary = getNode(dictionaries[locale], mapPath);
  if (primary && typeof primary === "object") {
    const hit = (primary as Record<string, unknown>)[label];
    if (typeof hit === "string") return hit;
  }
  if (locale !== "en") {
    const fallback = getNode(en, mapPath);
    if (fallback && typeof fallback === "object") {
      const hit = (fallback as Record<string, unknown>)[label];
      if (typeof hit === "string") return hit;
    }
  }
  return label;
}

export function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isAppLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "en";
}

export function storeLocale(locale: AppLocale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function applyDocumentLocale(locale: AppLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "am" ? "am" : "en";
  document.documentElement.dataset.locale = locale;
  document.body.classList.toggle("locale-am", locale === "am");
  document.body.classList.toggle("locale-en", locale === "en");
}
