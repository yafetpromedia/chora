"use client";

import { APP_LOCALES, type AppLocale } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

type Props = {
  compact?: boolean;
  className?: string;
};

const SHORT: Record<AppLocale, string> = {
  en: "EN",
  am: "አማ",
};

export function LanguageSwitcher({ compact = false, className = "" }: Props) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`lang-switch${compact ? " lang-switch--compact" : ""} ${className}`.trim()}
      role="group"
      aria-label={t("common.language")}
    >
      {APP_LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            className={`lang-switch__btn${active ? " is-active" : ""}`}
            aria-pressed={active}
            aria-label={code === "am" ? "አማርኛ" : "English"}
            onClick={() => setLocale(code)}
          >
            {compact ? SHORT[code] : code === "am" ? "አማርኛ" : "English"}
          </button>
        );
      })}
    </div>
  );
}
