// Shared constants for registration forms

// Regex patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Support all alphabets: Latin, Chinese (CJK), Cyrillic, Arabic, Devanagari, etc.
export const NAME_REGEX = /^[\p{L}\p{M}\s'-]{2,50}$/u;

// Bio constraints
export const MIN_BIO_LENGTH = 50;
export const MAX_BIO_LENGTH = 500;

// Password constraints
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

// Graduation year range
export const MIN_GRADUATION_YEAR = 1980;

// Experience range
export const MAX_YEARS_EXPERIENCE = 60;

// Preferred language type
export type PreferredLanguage = 'fr' | 'en' | 'es' | 'de' | 'ru' | 'hi' | 'pt' | 'ch' | 'ar';

// Language mapping for countries data
export const LANG_TO_COUNTRY_PROP: Record<string, string> = {
  fr: 'nameFr',
  en: 'nameEn',
  es: 'nameEs',
  de: 'nameDe',
  pt: 'namePt',
  ru: 'nameRu',
  ar: 'nameAr',
  hi: 'nameEn',
  ch: 'nameZh',
};

// Locale mapping for expat help types
export const LANG_TO_HELP_LOCALE: Record<string, 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi'> = {
  fr: 'fr',
  en: 'en',
  es: 'es',
  de: 'de',
  pt: 'pt',
  ru: 'ru',
  ch: 'zh',
  hi: 'hi',
  ar: 'ar',
};
