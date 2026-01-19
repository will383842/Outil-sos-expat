/**
 * =============================================================================
 * CONFIGURATION I18N - SYSTÈME MULTILINGUE
 * =============================================================================
 *
 * Ce fichier configure react-i18next pour le support multilingue de l'application.
 *
 * Langues supportées:
 * - Console Admin: FR, EN (2 langues)
 * - Dashboard Prestataires: FR, EN, DE, RU, ZH, ES, PT, AR, HI (9 langues)
 *
 * Fonctionnalités:
 * - Détection automatique de la langue du navigateur
 * - Stockage de la préférence dans localStorage
 * - Support RTL pour l'arabe
 * - Fonts spéciales pour chinois, hindi, arabe
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// =============================================================================
// IMPORT DES TRADUCTIONS - FRANÇAIS (langue par défaut)
// =============================================================================
import frCommon from "./locales/fr/common.json";
import frAdmin from "./locales/fr/admin.json";
import frProvider from "./locales/fr/provider.json";
import frChat from "./locales/fr/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - ANGLAIS
// =============================================================================
import enCommon from "./locales/en/common.json";
import enAdmin from "./locales/en/admin.json";
import enProvider from "./locales/en/provider.json";
import enChat from "./locales/en/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - ALLEMAND
// =============================================================================
import deCommon from "./locales/de/common.json";
import deAdmin from "./locales/de/admin.json";
import deProvider from "./locales/de/provider.json";
import deChat from "./locales/de/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - RUSSE
// =============================================================================
import ruCommon from "./locales/ru/common.json";
import ruAdmin from "./locales/ru/admin.json";
import ruProvider from "./locales/ru/provider.json";
import ruChat from "./locales/ru/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - CHINOIS (Simplifié)
// =============================================================================
import zhCommon from "./locales/zh/common.json";
import zhAdmin from "./locales/zh/admin.json";
import zhProvider from "./locales/zh/provider.json";
import zhChat from "./locales/zh/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - ESPAGNOL
// =============================================================================
import esCommon from "./locales/es/common.json";
import esAdmin from "./locales/es/admin.json";
import esProvider from "./locales/es/provider.json";
import esChat from "./locales/es/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - PORTUGAIS
// =============================================================================
import ptCommon from "./locales/pt/common.json";
import ptAdmin from "./locales/pt/admin.json";
import ptProvider from "./locales/pt/provider.json";
import ptChat from "./locales/pt/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - ARABE
// =============================================================================
import arCommon from "./locales/ar/common.json";
import arAdmin from "./locales/ar/admin.json";
import arProvider from "./locales/ar/provider.json";
import arChat from "./locales/ar/chat.json";

// =============================================================================
// IMPORT DES TRADUCTIONS - HINDI
// =============================================================================
import hiCommon from "./locales/hi/common.json";
import hiAdmin from "./locales/hi/admin.json";
import hiProvider from "./locales/hi/provider.json";
import hiChat from "./locales/hi/chat.json";

// =============================================================================
// CONFIGURATION DES LANGUES
// =============================================================================

/**
 * Langues disponibles pour la console admin (2 langues)
 */
export const ADMIN_LANGUAGES = ["fr", "en"] as const;
export type AdminLanguage = (typeof ADMIN_LANGUAGES)[number];

/**
 * Langues disponibles pour le dashboard prestataires (9 langues)
 */
export const PROVIDER_LANGUAGES = [
  "fr",
  "en",
  "de",
  "ru",
  "zh",
  "es",
  "pt",
  "ar",
  "hi",
] as const;
export type ProviderLanguage = (typeof PROVIDER_LANGUAGES)[number];

/**
 * Langues RTL (Right-to-Left)
 * Inclut: Arabe, Hébreu, Persan, Ourdou
 */
export const RTL_LANGUAGES = ["ar", "he", "fa", "ur"] as const;
export type RTLLanguage = (typeof RTL_LANGUAGES)[number];

/**
 * Noms des langues dans leur langue native
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  ru: "Русский",
  zh: "中文",
  es: "Español",
  pt: "Português",
  ar: "العربية",
  hi: "हिन्दी",
};

/**
 * Drapeaux emoji pour chaque langue
 */
export const LANGUAGE_FLAGS: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  de: "🇩🇪",
  ru: "🇷🇺",
  zh: "🇨🇳",
  es: "🇪🇸",
  pt: "🇵🇹",
  ar: "🇸🇦",
  hi: "🇮🇳",
};

/**
 * Codes locales pour date-fns
 */
export const DATE_LOCALES: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  ru: "ru-RU",
  zh: "zh-CN",
  es: "es-ES",
  pt: "pt-PT",
  ar: "ar-SA",
  hi: "hi-IN",
};

// =============================================================================
// RESSOURCES DE TRADUCTION
// =============================================================================

const resources = {
  fr: {
    common: frCommon,
    admin: frAdmin,
    provider: frProvider,
    chat: frChat,
  },
  en: {
    common: enCommon,
    admin: enAdmin,
    provider: enProvider,
    chat: enChat,
  },
  de: {
    common: deCommon,
    admin: deAdmin,
    provider: deProvider,
    chat: deChat,
  },
  ru: {
    common: ruCommon,
    admin: ruAdmin,
    provider: ruProvider,
    chat: ruChat,
  },
  zh: {
    common: zhCommon,
    admin: zhAdmin,
    provider: zhProvider,
    chat: zhChat,
  },
  es: {
    common: esCommon,
    admin: esAdmin,
    provider: esProvider,
    chat: esChat,
  },
  pt: {
    common: ptCommon,
    admin: ptAdmin,
    provider: ptProvider,
    chat: ptChat,
  },
  ar: {
    common: arCommon,
    admin: arAdmin,
    provider: arProvider,
    chat: arChat,
  },
  hi: {
    common: hiCommon,
    admin: hiAdmin,
    provider: hiProvider,
    chat: hiChat,
  },
};

// =============================================================================
// INITIALISATION I18NEXT
// =============================================================================

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    defaultNS: "common",
    ns: ["common", "admin", "provider", "chat"],

    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false, // React gère déjà l'échappement
    },

    react: {
      useSuspense: true,
    },
  });

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Vérifie si une langue est RTL
 */
export function isRTL(lang?: string): boolean {
  const currentLang = lang || i18n.language;
  return RTL_LANGUAGES.includes(currentLang as RTLLanguage);
}

/**
 * Retourne la famille de police appropriée pour une langue
 */
export function getFontFamily(lang?: string): string {
  const currentLang = lang || i18n.language;
  switch (currentLang) {
    case "zh":
      return '"Noto Sans SC", Inter, system-ui, sans-serif';
    case "hi":
      return '"Noto Sans Devanagari", Inter, system-ui, sans-serif';
    case "ar":
      return '"Noto Sans Arabic", Inter, system-ui, sans-serif';
    default:
      return "Inter, system-ui, sans-serif";
  }
}

/**
 * Retourne le code locale date-fns pour une langue
 */
export function getDateLocale(lang?: string): string {
  const currentLang = lang || i18n.language;
  return DATE_LOCALES[currentLang] || "fr-FR";
}

/**
 * Applique les styles de langue au document (direction RTL, font)
 */
export function applyLanguageStyles(lang?: string): void {
  const currentLang = lang || i18n.language;

  // Direction du document
  document.documentElement.dir = isRTL(currentLang) ? "rtl" : "ltr";

  // Attribut lang
  document.documentElement.lang = currentLang;

  // Font family
  document.documentElement.style.fontFamily = getFontFamily(currentLang);

  // Classe RTL pour styles CSS additionnels
  if (isRTL(currentLang)) {
    document.documentElement.classList.add("rtl");
  } else {
    document.documentElement.classList.remove("rtl");
  }
}

// Appliquer les styles au chargement initial
applyLanguageStyles();

// Écouter les changements de langue
i18n.on("languageChanged", (lng) => {
  applyLanguageStyles(lng);
});

export default i18n;
