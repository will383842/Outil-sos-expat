/**
 * Locale-aware formatting utilities for dates, times, and numbers
 * Supports country-specific conventions for all 9 supported languages
 */

import { format } from 'date-fns';
import { enUS, fr, de, es, pt, ru, zhCN, hi, ar } from 'date-fns/locale';
import type { Locale } from 'date-fns/locale';
import { getCachedGeoData, detectCountryFromTimezone } from '../multilingual-system/core/country-manager/languageDetection';

// Map language codes to date-fns locales
const DATE_FNS_LOCALES: Record<string, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  es: es,
  pt: pt,
  ru: ru,
  ch: zhCN,
  hi: hi,
  ar: ar,
};

// Map country codes to locale strings (ISO 639-1 + ISO 3166-1)
const COUNTRY_TO_LOCALE: Record<string, string> = {
  // Europe
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  PT: 'pt-PT',
  IT: 'it-IT',
  NL: 'nl-NL',
  BE: 'fr-BE',
  CH: 'de-CH',
  AT: 'de-AT',
  GB: 'en-GB',
  IE: 'en-IE',
  PL: 'pl-PL',
  CZ: 'cs-CZ',
  SK: 'sk-SK',
  HU: 'hu-HU',
  RO: 'ro-RO',
  BG: 'bg-BG',
  GR: 'el-GR',
  SE: 'sv-SE',
  NO: 'nb-NO',
  DK: 'da-DK',
  FI: 'fi-FI',
  RU: 'ru-RU',
  UA: 'uk-UA',
  BY: 'be-BY',
  
  // Americas
  US: 'en-US',
  CA: 'en-CA',
  MX: 'es-MX',
  BR: 'pt-BR',
  AR: 'es-AR',
  CL: 'es-CL',
  CO: 'es-CO',
  PE: 'es-PE',
  VE: 'es-VE',
  AU: 'en-AU',
  NZ: 'en-NZ',
  
  // Asia
  CN: 'zh-CN',
  JP: 'ja-JP',
  KR: 'ko-KR',
  IN: 'hi-IN',
  ID: 'id-ID',
  TH: 'th-TH',
  VN: 'vi-VN',
  PH: 'en-PH',
  SG: 'en-SG',
  MY: 'ms-MY',
  
  // Middle East
  SA: 'ar-SA',
  AE: 'ar-AE',
  EG: 'ar-EG',
  IL: 'he-IL',
  TR: 'tr-TR',
  IR: 'fa-IR',
  
  // Africa
  ZA: 'en-ZA',
  NG: 'en-NG',
  KE: 'en-KE',
};

// Countries using 12-hour time format
const TWELVE_HOUR_COUNTRIES = new Set([
  'US', 'CA', 'AU', 'NZ', 'PH', 'BD', 'EG', 'SA', 'IN', 'PK', 'MY', 'SG'
]);

// Date format patterns by country
const DATE_FORMAT_PATTERNS: Record<string, string> = {
  // dd.MM.yyyy format (German-speaking)
  DE: 'dd.MM.yyyy',
  AT: 'dd.MM.yyyy',
  CH: 'dd.MM.yyyy',
  
  // dd/MM/yyyy format (French, Spanish, Portuguese, UK, etc.)
  FR: 'dd/MM/yyyy',
  ES: 'dd/MM/yyyy',
  IT: 'dd/MM/yyyy',
  PT: 'dd/MM/yyyy',
  GB: 'dd/MM/yyyy',
  IE: 'dd/MM/yyyy',
  AU: 'dd/MM/yyyy',
  NZ: 'dd/MM/yyyy',
  BR: 'dd/MM/yyyy',
  MX: 'dd/MM/yyyy',
  AR: 'dd/MM/yyyy',
  CL: 'dd/MM/yyyy',
  CO: 'dd/MM/yyyy',
  PE: 'dd/MM/yyyy',
  VE: 'dd/MM/yyyy',
  IN: 'dd/MM/yyyy',
  ZA: 'dd/MM/yyyy',
  
  // MM/dd/yyyy format (US, Canada, Philippines)
  US: 'MM/dd/yyyy',
  CA: 'MM/dd/yyyy',
  PH: 'MM/dd/yyyy',
};

// Map language to default country code
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  fr: 'FR',
  en: 'US',
  es: 'ES',
  pt: 'PT',
  de: 'DE',
  ru: 'RU',
  ch: 'CN',
  hi: 'IN',
  ar: 'SA',
};

/**
 * Get country code from user profile or geolocation
 */
function getCountryCode(userCountry?: string): string | null {
  // Priority 1: User's country from profile
  if (userCountry) {
    return userCountry.toUpperCase();
  }
  
  // Priority 2: Cached geolocation
  const cachedCountry = getCachedGeoData();
  if (cachedCountry) {
    return cachedCountry.toUpperCase();
  }
  
  // Priority 3: Timezone detection
  const timezoneCountry = detectCountryFromTimezone();
  if (timezoneCountry) {
    return timezoneCountry.toUpperCase();
  }
  
  return null;
}

/**
 * Get locale string from country code and language
 */
function getLocaleFromCountry(countryCode: string | null, language: string): string {
  // If we have a direct mapping, use it
  if (countryCode && COUNTRY_TO_LOCALE[countryCode]) {
    return COUNTRY_TO_LOCALE[countryCode];
  }
  
  // Fallback: construct from language + country
  if (countryCode) {
    const langMap: Record<string, string> = {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-PT',
      de: 'de-DE',
      ru: 'ru-RU',
      ch: 'zh-CN',
      hi: 'hi-IN',
      ar: 'ar-SA',
    };
    const baseLocale = langMap[language] || 'en-US';
    // Try to use country-specific variant if available
    return baseLocale;
  }
  
  // Ultimate fallback: use language default
  const defaultCountry = LANGUAGE_TO_COUNTRY[language] || 'US';
  return COUNTRY_TO_LOCALE[defaultCountry] || 'en-US';
}

/**
 * Get date-fns locale from language code
 */
function getDateFnsLocale(language: string): Locale {
  return DATE_FNS_LOCALES[language] || enUS;
}

/**
 * Convert various date formats to Date object
 */
function toDate(date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined): Date | null {
  if (!date && date !== 0) return null;
  
  // Firestore Timestamp
  if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // Firestore Timestamp with seconds
  if (typeof date === 'object' && 'seconds' in date && typeof date.seconds === 'number') {
    return new Date(date.seconds * 1000);
  }
  
  // Date object
  if (date instanceof Date) {
    return date;
  }
  
  // Number (milliseconds or seconds)
  if (typeof date === 'number') {
    // If less than year 2000 in milliseconds, assume it's seconds
    if (date < 946684800000) {
      return new Date(date * 1000);
    }
    return new Date(date);
  }
  
  // String
  if (typeof date === 'string') {
    return new Date(date);
  }
  
  return null;
}

/**
 * Format date according to country conventions
 */
export function formatDate(
  date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined,
  options?: {
    countryCode?: string;
    language?: string;
    userCountry?: string;
    format?: 'short' | 'medium' | 'long' | 'full';
  }
): string {
  const dateObj = toDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) return '—';
  
  const language = options?.language || 'en';
  const countryCode = options?.countryCode || getCountryCode(options?.userCountry) || LANGUAGE_TO_COUNTRY[language] || 'US';
  const locale = getDateFnsLocale(language);
  
  // Use country-specific pattern if available
  const pattern = DATE_FORMAT_PATTERNS[countryCode] || 
    (language === 'de' ? 'dd.MM.yyyy' : 
     language === 'en' && countryCode === 'US' ? 'MM/dd/yyyy' : 
     'dd/MM/yyyy');
  
  // For different format styles
  if (options?.format) {
    const formatMap: Record<string, string> = {
      short: countryCode === 'US' ? 'M/d/yy' : 'dd/MM/yy',
      medium: pattern,
      long: countryCode === 'US' ? 'MMMM d, yyyy' : 'd MMMM yyyy',
      full: countryCode === 'US' ? 'EEEE, MMMM d, yyyy' : 'EEEE d MMMM yyyy',
    };
    return format(dateObj, formatMap[options.format] || pattern, { locale });
  }
  
  return format(dateObj, pattern, { locale });
}

/**
 * Format time according to country conventions (12h vs 24h)
 */
export function formatTime(
  date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined,
  options?: {
    countryCode?: string;
    language?: string;
    userCountry?: string;
    includeSeconds?: boolean;
  }
): string {
  const dateObj = toDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) return '—';
  
  const language = options?.language || 'en';
  const countryCode = options?.countryCode || getCountryCode(options?.userCountry) || LANGUAGE_TO_COUNTRY[language] || 'US';
  const locale = getDateFnsLocale(language);
  const use12Hour = TWELVE_HOUR_COUNTRIES.has(countryCode);
  
  if (use12Hour) {
    const pattern = options?.includeSeconds ? 'h:mm:ss a' : 'h:mm a';
    return format(dateObj, pattern, { locale }); // "3:30 PM"
  } else {
    const pattern = options?.includeSeconds ? 'HH:mm:ss' : 'HH:mm';
    return format(dateObj, pattern, { locale }); // "15:30"
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined,
  options?: {
    countryCode?: string;
    language?: string;
    userCountry?: string;
    dateFormat?: 'short' | 'medium' | 'long' | 'full';
    includeSeconds?: boolean;
  }
): string {
  const dateObj = toDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) return '—';
  
  const dateStr = formatDate(dateObj, options);
  const timeStr = formatTime(dateObj, options);
  return `${dateStr} ${timeStr}`;
}

/**
 * Format number according to country conventions
 */
export function formatNumber(
  value: number,
  options?: {
    countryCode?: string;
    language?: string;
    userCountry?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    style?: 'decimal' | 'currency' | 'percent';
    currency?: string;
  }
): string {
  const language = options?.language || 'en';
  const countryCode = options?.countryCode || getCountryCode(options?.userCountry) || LANGUAGE_TO_COUNTRY[language] || 'US';
  const locale = getLocaleFromCountry(countryCode, language);
  
  try {
    const formatOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits,
      style: options?.style || 'decimal',
    };
    
    if (options?.style === 'currency' && options?.currency) {
      formatOptions.currency = options.currency.toUpperCase();
    }
    
    return new Intl.NumberFormat(locale, formatOptions).format(value);
  } catch {
    return value.toString();
  }
}

/**
 * Format currency according to country conventions
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  options?: {
    countryCode?: string;
    language?: string;
    userCountry?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  return formatNumber(amount, {
    ...options,
    style: 'currency',
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined,
  options?: {
    language?: string;
  }
): string {
  const dateObj = toDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) return '—';
  
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  const language = options?.language || 'en';
  const locale = getDateFnsLocale(language);
  
  // Use date-fns formatDistance for better localization
  try {
    const { formatDistance } = require('date-fns');
    return formatDistance(dateObj, now, { addSuffix: true, locale });
  } catch {
    // Fallback if formatDistance not available
    if (Math.abs(diffDays) > 7) {
      return formatDate(dateObj, { language });
    }
    if (Math.abs(diffDays) > 0) {
      return `${Math.abs(diffDays)} ${diffDays > 0 ? 'days' : 'days ago'}`;
    }
    if (Math.abs(diffHours) > 0) {
      return `${Math.abs(diffHours)} ${diffHours > 0 ? 'hours' : 'hours ago'}`;
    }
    if (Math.abs(diffMinutes) > 0) {
      return `${Math.abs(diffMinutes)} ${diffMinutes > 0 ? 'minutes' : 'minutes ago'}`;
    }
    return 'just now';
  }
}

/**
 * React hook for locale-aware formatting (optional, for convenience)
 */
export function useLocaleFormatters(userCountry?: string, language?: string) {
  // This would typically use useApp() hook, but we'll make it work without
  // to avoid circular dependencies. Components should pass language explicitly.
  return {
    formatDate: (date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined, format?: 'short' | 'medium' | 'long' | 'full') => 
      formatDate(date, { userCountry, language, format }),
    formatTime: (date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined, includeSeconds?: boolean) => 
      formatTime(date, { userCountry, language, includeSeconds }),
    formatDateTime: (date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined, dateFormat?: 'short' | 'medium' | 'long' | 'full', includeSeconds?: boolean) => 
      formatDateTime(date, { userCountry, language, dateFormat, includeSeconds }),
    formatNumber: (value: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => 
      formatNumber(value, { userCountry, language, ...options }),
    formatCurrency: (amount: number, currency?: string, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => 
      formatCurrency(amount, currency, { userCountry, language, ...options }),
    formatRelativeTime: (date: Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined) => 
      formatRelativeTime(date, { language }),
  };
}

