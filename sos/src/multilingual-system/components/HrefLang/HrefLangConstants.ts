// multilingual-system.ts
export type LanguagesType =
  | "en" | "es" | "fr" | "de" | "ru" | "pt" | "hi" | "ch" | "ar";

export const SUPPORTED_LANGUAGES: LanguagesType[] = [
  "en", "es", "fr", "de", "ru", "pt", "hi", "ch", "ar",
];

// Map locales to URL prefixes (same code in this case)
export const localeToPrefix: Record<LanguagesType, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  ru: "ru",
  pt: "pt",
  hi: "hi",
  ch: "ch",  // Simplified Chinese or Chinese variant prefix
  ar: "ar",
};

/**
 * Map internal language codes to ISO hreflang codes for SEO (BCP 47 format).
 *
 * IMPORTANT: These MUST match the Blog Laravel's CanonicalService::HREFLANG_MAP
 * to ensure consistent hreflang signals across the entire sos-expat.com domain.
 * Blog uses: fr-FR, en-US, es-ES, de-DE, ru-RU, pt-PT, zh-Hans, hi-IN, ar-SA
 *
 * For country-specific content (blog articles about Thailand), the Blog overrides
 * these with country-aware codes (e.g., fr-TH, en-TH). The SPA only serves
 * generic pages so always uses the default country per language.
 */
export const localeToHreflang: Record<LanguagesType, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ru: "ru-RU",
  pt: "pt-PT",
  hi: "hi-IN",
  ch: "zh-Hans", // Simplified Chinese (script-based, per BCP 47)
  ar: "ar-SA",
};

/**
 * Converts internal locale code to SEO-compliant hreflang code
 * @param lang - Internal language code (e.g., 'ch')
 * @returns SEO hreflang code (e.g., 'zh-Hans')
 */
export function getHreflangCode(lang: LanguagesType | string): string {
  return localeToHreflang[lang as LanguagesType] || lang;
}
