export type AppLocale = "en" | "am";

export const APP_LOCALES: AppLocale[] = ["en", "am"];

export const LOCALE_STORAGE_KEY = "chora.locale";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  am: "አማርኛ",
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "am";
}
