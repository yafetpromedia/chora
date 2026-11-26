"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentLocale,
  getDictionary,
  readStoredLocale,
  storeLocale,
  translate,
  translateMapped,
  translateNavLabel,
  type AppLocale,
  type Dictionary,
  type MessageKey,
} from "@/lib/i18n";

type Vars = Record<string, string | number>;

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  dict: Dictionary;
  t: (key: MessageKey | string, vars?: Vars) => string;
  tn: (label: string) => string;
  /** Translate DashboardPage title by English source string. */
  tp: (title: string) => string;
  /** Translate DashboardPage subtitle by English source string. */
  ts: (subtitle: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    applyDocumentLocale(stored);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    storeLocale(next);
    applyDocumentLocale(next);
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      setLocale,
      dict,
      t: (key, vars) => translate(locale, key, vars),
      tn: (label) => translateNavLabel(locale, label),
      tp: (title) => translateMapped(locale, "pageTitles", title),
      ts: (subtitle) => translateMapped(locale, "pageSubtitles", subtitle),
    };
  }, [locale, setLocale]);

  /* Avoid a flash of wrong language for client chrome after hydration. */
  if (!ready) {
    return (
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Safe for components that may render outside the provider (returns English). */
export function useLocaleOptional() {
  return useContext(LocaleContext);
}
