/**
 * Shared utilities for phone-code-based country/flag display
 * Used by registration forms (Chatter, Influencer, Blogger, GroupAdmin)
 */
import type { PhoneCodeEntry } from '@/data/phone-codes';

/** Get localized country name from a PhoneCodeEntry */
export const getCountryNameFromEntry = (entry: PhoneCodeEntry, locale: string): string => {
  const localeMap: Record<string, keyof PhoneCodeEntry> = {
    fr: 'fr', en: 'en', es: 'es', de: 'de', pt: 'pt', ru: 'ru', zh: 'zh', ch: 'zh', ar: 'ar', hi: 'hi'
  };
  const key = localeMap[locale] || 'en';
  return (entry[key] as string) || entry.en;
};

/** Get flag emoji from a 2-letter country code */
export const getFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
