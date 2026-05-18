/**
 * Internationalization (i18n) system for FreedomPool.
 * Supports: English, German, Turkish, French, Spanish, Arabic, Chinese
 */
import en from "../locales/en.js";
import de from "../locales/de.js";
import tr from "../locales/tr.js";
import fr from "../locales/fr.js";
import es from "../locales/es.js";
import ar from "../locales/ar.js";
import zh from "../locales/zh.js";

export const LANGUAGES = {
  en: { name: "English", flag: "🇬🇧", dir: "ltr", locale: "en-US" },
  de: { name: "Deutsch", flag: "🇩🇪", dir: "ltr", locale: "de-DE" },
  tr: { name: "Türkçe", flag: "🇹🇷", dir: "ltr", locale: "tr-TR" },
  fr: { name: "Français", flag: "🇫🇷", dir: "ltr", locale: "fr-FR" },
  es: { name: "Español", flag: "🇪🇸", dir: "ltr", locale: "es-ES" },
  ar: { name: "العربية", flag: "🇸🇦", dir: "rtl", locale: "ar-SA" },
  zh: { name: "中文", flag: "🇨🇳", dir: "ltr", locale: "zh-CN" },
};

const translations = { en, de, tr, fr, es, ar, zh };

/**
 * Get a translation string by key path (dot notation).
 * Example: t("home.hero.title", "en") => "Put your money to work..."
 */
export function t(key, lang = "en") {
  const keys = key.split(".");
  let value = translations[lang];
  for (const k of keys) {
    if (!value || typeof value !== "object") return key;
    value = value[k];
  }
  return value || translations["en"]?.[keys[0]]?.[keys[1]] || key;
}

/**
 * Get the text direction for a language
 */
export function getDir(lang) {
  return LANGUAGES[lang]?.dir || "ltr";
}

/**
 * Get the locale string for number formatting
 */
export function getLocale(lang) {
  return LANGUAGES[lang]?.locale || "en-US";
}

/**
 * Format a number using the language's locale
 */
export function fmtNum(n, lang, dec = 0) {
  const locale = getLocale(lang);
  return n.toLocaleString(locale, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/**
 * Detect browser language and return supported language code
 */
export function detectLanguage() {
  const stored = localStorage.getItem("freedompool_lang");
  if (stored && LANGUAGES[stored]) return stored;

  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && LANGUAGES[browserLang]) return browserLang;

  return "en";
}
