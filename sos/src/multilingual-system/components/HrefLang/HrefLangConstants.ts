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
 * Map internal language codes to ISO hreflang codes for SEO
 * Note: 'ch' is our internal code for Chinese, but SEO requires 'zh-Hans' for simplified Chinese
 */
export const localeToHreflang: Record<LanguagesType, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  ru: "ru",
  pt: "pt",
  hi: "hi",
  ch: "zh-Hans", // Simplified Chinese (script-based, more universal)
  ar: "ar",
};

/**
 * Converts internal locale code to SEO-compliant hreflang code
 * @param lang - Internal language code (e.g., 'ch')
 * @returns SEO hreflang code (e.g., 'zh-Hans')
 */
export function getHreflangCode(lang: LanguagesType | string): string {
  return localeToHreflang[lang as LanguagesType] || lang;
}
