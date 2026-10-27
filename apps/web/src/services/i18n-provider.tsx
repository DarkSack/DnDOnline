import { useCallback, useMemo, useState, type ReactNode } from "react";
import { DICTIONARIES, I18nContext, type I18nKey, type Locale } from "./i18n";

const STORAGE_KEY = "dndonline.locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    /* almacenamiento bloqueado */
  }
  return navigator.language.startsWith("en") ? "en" : "es";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* almacenamiento bloqueado */
    }
  }, []);

  const value = useMemo(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale,
      t: (key: I18nKey) => dict[key],
      tError: (code: string) => dict[`error.${code}` as I18nKey] ?? dict["error.internal"],
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
