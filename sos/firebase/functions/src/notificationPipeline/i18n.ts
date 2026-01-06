// Supported languages for notifications (same as frontend)
export type Lang = "fr" | "en" | "es" | "de" | "pt" | "ru" | "ar" | "hi" | "ch";

// Map of language codes to their normalized form
const LANG_MAP: Record<string, Lang> = {
  // French
  "fr": "fr",
  "fr-fr": "fr",
  "fr-ca": "fr",
  "fr-be": "fr",
  "fr-ch": "fr",
  // English (default)
  "en": "en",
  "en-us": "en",
  "en-gb": "en",
  "en-au": "en",
  // Spanish
  "es": "es",
  "es-es": "es",
  "es-mx": "es",
  "es-ar": "es",
  // German
  "de": "de",
  "de-de": "de",
  "de-at": "de",
  "de-ch": "de",
  // Portuguese
  "pt": "pt",
  "pt-pt": "pt",
  "pt-br": "pt",
  // Russian
  "ru": "ru",
  "ru-ru": "ru",
  // Arabic
  "ar": "ar",
  "ar-sa": "ar",
  "ar-ae": "ar",
  "ar-eg": "ar",
  // Hindi
  "hi": "hi",
  "hi-in": "hi",
  // Chinese
  "ch": "ch",
  "zh": "ch",
  "zh-cn": "ch",
  "zh-tw": "ch",
  "zh-hk": "ch",
};

/**
 * Resolves user language to one of the 9 supported languages.
 * Falls back to English if language is not supported.
 */
export function resolveLang(input?: string): Lang {
  if (!input) return "en";

  const normalized = String(input).toLowerCase().trim();

  // Direct match
  if (LANG_MAP[normalized]) {
    return LANG_MAP[normalized];
  }

  // Try prefix match (e.g., "fr-CA" -> "fr")
  const prefix = normalized.split("-")[0];
  if (LANG_MAP[prefix]) {
    return LANG_MAP[prefix];
  }

  // Default fallback to English
  return "en";
}
