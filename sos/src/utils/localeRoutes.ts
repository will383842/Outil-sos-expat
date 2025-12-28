/**
 * Locale Routes Utility
 * Handles language-country locale prefixes in routes (e.g., /en-us/, /fr-fr/)
 ***/

import { getCachedGeoData, detectCountryFromTimezone } from "../multilingual-system/core/country-manager/languageDetection";

type Language = "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

// Map language to default country code (fallback only)
const LANGUAGE_TO_COUNTRY: Record<Language, string> = {
  fr: "fr",  // French -> France
  en: "us",  // English -> United States
  es: "es",  // Spanish -> Spain
  de: "de",  // German -> Germany
  ru: "ru",  // Russian -> Russia
  pt: "pt",  // Portuguese -> Portugal
  ch: "cn",  // Chinese -> China
  hi: "in",  // Hindi -> India
  ar: "sa",  // Arabic -> Saudi Arabia
};

/**
 * Get country code from geolocation (synchronous - uses cache and timezcone)
 * Returns lowercase country code or null if not available
 */
function getCountryFromGeolocation(): string | null {
  // Try cached geolocation data first (fastest, no API calls)
  const cachedCountry = getCachedGeoData();
  if (cachedCountry) {
    return cachedCountry.toLowerCase();
  }

  // Try timezone detection (no API, no rate limits)
  const timezoneCountry = detectCountryFromTimezone();
  if (timezoneCountry) {
    return timezoneCountry.toLowerCase();
  }

  return null;
}

/**
 * Generate locale string (e.g., "en-us", "fr-fr")
 * Uses geolocation country when available, falls back to language default
 */
export function getLocaleString(lang: Language, country?: string): string {
  // If country is explicitly provided, use it
  if (country) {
    return `${lang}-${country.toLowerCase()}`;
  }

  // Try to get country from geolocation
  const geoCountry = getCountryFromGeolocation();
  if (geoCountry) {
    return `${lang}-${geoCountry}`;
  }

  // Fallback to language-to-country mapping
  const countryCode = LANGUAGE_TO_COUNTRY[lang];
  return `${lang}-${countryCode}`;
}

/**
 * Parse locale from URL path
 * Example: "/en-us/dashboard" -> { locale: "en-us", lang: "en", country: "us", pathWithoutLocale: "/dashboard" }
 */
export function parseLocaleFromPath(pathname: string): {
  locale: string | null;
  lang: Language | null;
  country: string | null;
  pathWithoutLocale: string;
} {
  const localePattern = /^\/([a-z]{2})-([a-z]{2})(\/.*)?$/;
  const match = pathname.match(localePattern);

  if (match) {
    return {
      locale: `${match[1]}-${match[2]}`,
      lang: match[1] as Language,
      country: match[2],
      pathWithoutLocale: match[3] || "/",
    };
  }

  return {
    locale: null,
    lang: null,
    country: null,
    pathWithoutLocale: pathname,
  };
}

/**
 * Get all supported locale strings
 */
export function getSupportedLocales(): string[] {
  return Object.keys(LANGUAGE_TO_COUNTRY).map((lang) =>
    getLocaleString(lang as Language)
  );
}

/**
 * Check if a path starts with a locale prefix
 */
export function hasLocalePrefix(pathname: string): boolean {
  return /^\/[a-z]{2}-[a-z]{2}(\/|$)/.test(pathname);
}

/**
 * Extract locale from pathname or return default
 */
export function getLocaleFromPath(pathname: string, defaultLang: Language): string {
  const parsed = parseLocaleFromPath(pathname);
  return parsed.locale || getLocaleString(defaultLang);
}
