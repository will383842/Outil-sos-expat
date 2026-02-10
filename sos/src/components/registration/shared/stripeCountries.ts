// Stripe Connect supported countries (44 countries)
// Source: https://stripe.com/global
// Synced with sos/firebase/functions/src/lib/paymentCountries.ts

import { countriesData } from '@/data/countries';

export const STRIPE_SUPPORTED_COUNTRIES = new Set([
  // North America
  'US', 'CA',
  // Europe (32)
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GI', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH', 'GB',
  // Asia-Pacific (7)
  'AU', 'HK', 'JP', 'MY', 'NZ', 'SG', 'TH',
  // Middle East (1)
  'AE',
  // Latin America (2)
  'BR', 'MX',
]);

// Get ISO country code from localized country name
export const getCountryCode = (countryName: string): string => {
  if (!countryName) return 'US';

  const normalizedName = countryName.trim().toLowerCase();

  const country = countriesData.find(c => {
    return (
      c.nameFr?.toLowerCase() === normalizedName ||
      c.nameEn?.toLowerCase() === normalizedName ||
      c.nameEs?.toLowerCase() === normalizedName ||
      c.nameDe?.toLowerCase() === normalizedName ||
      c.namePt?.toLowerCase() === normalizedName ||
      c.nameRu?.toLowerCase() === normalizedName ||
      c.nameAr?.toLowerCase() === normalizedName ||
      c.nameIt?.toLowerCase() === normalizedName ||
      c.nameNl?.toLowerCase() === normalizedName ||
      c.nameZh?.toLowerCase() === normalizedName ||
      c.nameFr === countryName ||
      c.nameEn === countryName ||
      c.nameEs === countryName ||
      c.nameDe === countryName ||
      c.namePt === countryName ||
      c.nameRu === countryName ||
      c.nameAr === countryName ||
      c.nameIt === countryName ||
      c.nameNl === countryName ||
      c.nameZh === countryName
    );
  });

  return country?.code || 'US';
};

export const isCountrySupportedByStripe = (countryCode: string): boolean => {
  return STRIPE_SUPPORTED_COUNTRIES.has(countryCode.toUpperCase());
};

export const getCountryNameFromCode = (code: string, lang: string): string => {
  const country = countriesData.find(c => c.code === code);
  if (!country) return code;

  const langMap: Record<string, keyof typeof country> = {
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

  const prop = langMap[lang] || 'nameEn';
  return (country[prop] as string) || country.nameEn || code;
};
