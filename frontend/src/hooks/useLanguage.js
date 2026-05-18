import { createContext, useContext, useState, useCallback } from "react";
import { t as translate, getDir, getLocale, fmtNum, detectLanguage, LANGUAGES } from "../config/i18n";

const LanguageContext = createContext(null);

/**
 * Language Provider — wraps the app and provides i18n utilities.
 */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage);

  const setLang = useCallback((newLang) => {
    if (LANGUAGES[newLang]) {
      setLangState(newLang);
      localStorage.setItem("freedompool_lang", newLang);
      document.documentElement.dir = getDir(newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  const t = useCallback((key) => translate(key, lang), [lang]);
  const fmt = useCallback((n, dec = 0) => fmtNum(n, lang, dec), [lang]);
  const dir = getDir(lang);
  const locale = getLocale(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, fmt, dir, locale, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context.
 * Returns: { lang, setLang, t, fmt, dir, locale, languages }
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
