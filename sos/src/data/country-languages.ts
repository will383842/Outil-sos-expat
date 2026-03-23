/**
 * Country → supported site languages mapping
 * Only includes the 9 languages supported by SOS Expat: fr, en, es, de, ru, pt, ch (Chinese), ar, hi
 * English ('en') is ALWAYS included as universal fallback for every country.
 *
 * NOTE: Chinese uses 'ch' internally in SOS Expat (not 'zh'), matching SupportedLanguage type.
 */

import type { SupportedLanguage } from '../contexts/types';

// ---------------------------------------------------------------------------
// Main mapping — ISO 3166-1 alpha-2 → supported SOS Expat languages
// ---------------------------------------------------------------------------

export const COUNTRY_LANGUAGES: Record<string, string[]> = {
  // ───────────────────────────── Europe ─────────────────────────────

  // Western Europe
  FR: ['fr', 'en'],                // France
  BE: ['fr', 'de', 'en'],         // Belgium (French + German communities)
  CH: ['fr', 'de', 'en'],         // Switzerland (French + German regions)
  LU: ['fr', 'de', 'en'],         // Luxembourg
  MC: ['fr', 'en'],               // Monaco
  AD: ['es', 'fr', 'en'],         // Andorra (Catalan official but Spanish widely used)
  LI: ['de', 'en'],               // Liechtenstein

  // Germanic countries
  DE: ['de', 'en'],               // Germany
  AT: ['de', 'en'],               // Austria

  // British Isles
  GB: ['en'],                     // United Kingdom
  IE: ['en'],                     // Ireland

  // Iberian Peninsula
  ES: ['es', 'en'],               // Spain
  PT: ['pt', 'en'],               // Portugal
  GI: ['es', 'en'],               // Gibraltar

  // Italy & Malta
  IT: ['en'],                     // Italy
  MT: ['en'],                     // Malta

  // Scandinavia & Nordics
  SE: ['en'],                     // Sweden
  NO: ['en'],                     // Norway
  DK: ['en'],                     // Denmark
  FI: ['en'],                     // Finland
  IS: ['en'],                     // Iceland

  // Central Europe
  PL: ['en'],                     // Poland
  CZ: ['en'],                     // Czech Republic
  SK: ['en'],                     // Slovakia
  HU: ['en'],                     // Hungary
  SI: ['en'],                     // Slovenia
  HR: ['en'],                     // Croatia

  // Eastern Europe
  RO: ['fr', 'en'],              // Romania (Francophonie member)
  MD: ['ru', 'fr', 'en'],        // Moldova (Russian + Francophonie)
  BG: ['ru', 'en'],              // Bulgaria
  RS: ['en'],                     // Serbia
  BA: ['en'],                     // Bosnia and Herzegovina
  ME: ['en'],                     // Montenegro
  MK: ['en'],                     // North Macedonia
  AL: ['en'],                     // Albania
  XK: ['en'],                     // Kosovo

  // Baltic States
  EE: ['ru', 'en'],              // Estonia (large Russian minority)
  LV: ['ru', 'en'],              // Latvia
  LT: ['ru', 'en'],              // Lithuania

  // Eastern Europe & Caucasus
  UA: ['ru', 'en'],              // Ukraine
  BY: ['ru', 'en'],              // Belarus
  RU: ['ru', 'en'],              // Russia
  GE: ['ru', 'en'],              // Georgia
  AM: ['ru', 'en'],              // Armenia
  AZ: ['ru', 'en'],              // Azerbaijan

  // Greece & Cyprus & Turkey
  GR: ['en'],                     // Greece
  CY: ['en'],                     // Cyprus
  TR: ['en'],                     // Turkey

  // ────────────────────────── North Africa ──────────────────────────

  MA: ['ar', 'fr', 'en'],        // Morocco
  DZ: ['ar', 'fr', 'en'],        // Algeria
  TN: ['ar', 'fr', 'en'],        // Tunisia
  LY: ['ar', 'en'],              // Libya
  EG: ['ar', 'en'],              // Egypt

  // ──────────────────── West Africa (Francophone) ───────────────────

  SN: ['fr', 'en'],              // Senegal
  CI: ['fr', 'en'],              // Cote d'Ivoire
  ML: ['fr', 'en'],              // Mali
  BF: ['fr', 'en'],              // Burkina Faso
  NE: ['fr', 'en'],              // Niger
  GN: ['fr', 'en'],              // Guinea
  TG: ['fr', 'en'],              // Togo
  BJ: ['fr', 'en'],              // Benin
  MR: ['ar', 'fr', 'en'],       // Mauritania (Arabic + French)

  // West Africa (Anglophone / Lusophone)
  NG: ['en'],                     // Nigeria
  GH: ['en'],                     // Ghana
  SL: ['en'],                     // Sierra Leone
  LR: ['en'],                     // Liberia
  GM: ['en'],                     // Gambia
  GW: ['pt', 'en'],              // Guinea-Bissau
  CV: ['pt', 'en'],              // Cape Verde

  // ──────────────────── Central Africa ───────────────────────────────

  CM: ['fr', 'en'],              // Cameroon (French + English)
  GA: ['fr', 'en'],              // Gabon
  CG: ['fr', 'en'],              // Congo (Brazzaville)
  CD: ['fr', 'en'],              // Congo (DRC)
  CF: ['fr', 'en'],              // Central African Republic
  TD: ['fr', 'ar', 'en'],       // Chad (French + Arabic)
  GQ: ['es', 'fr', 'pt', 'en'], // Equatorial Guinea
  ST: ['pt', 'en'],              // Sao Tome and Principe

  // ──────────────────── East Africa ─────────────────────────────────

  DJ: ['fr', 'ar', 'en'],       // Djibouti
  ET: ['en'],                     // Ethiopia
  ER: ['ar', 'en'],              // Eritrea
  SO: ['ar', 'en'],              // Somalia
  KE: ['en'],                     // Kenya
  TZ: ['en'],                     // Tanzania
  UG: ['en'],                     // Uganda
  RW: ['fr', 'en'],              // Rwanda
  BI: ['fr', 'en'],              // Burundi
  SS: ['ar', 'en'],              // South Sudan
  SD: ['ar', 'en'],              // Sudan

  // ──────────────────── Southern Africa ─────────────────────────────

  ZA: ['en'],                     // South Africa
  ZM: ['en'],                     // Zambia
  ZW: ['en'],                     // Zimbabwe
  BW: ['en'],                     // Botswana
  NA: ['en'],                     // Namibia
  MZ: ['pt', 'en'],              // Mozambique
  AO: ['pt', 'en'],              // Angola
  MW: ['en'],                     // Malawi
  LS: ['en'],                     // Lesotho
  SZ: ['en'],                     // Eswatini (Swaziland)
  MG: ['fr', 'en'],              // Madagascar
  MU: ['fr', 'en'],              // Mauritius
  SC: ['fr', 'en'],              // Seychelles
  KM: ['fr', 'ar', 'en'],       // Comoros
  RE: ['fr', 'en'],              // Réunion (France)
  YT: ['fr', 'en'],              // Mayotte (France)

  // ──────────────────── Indian Ocean Islands ────────────────────────

  MV: ['en'],                     // Maldives

  // ──────────────────── Middle East ─────────────────────────────────

  SA: ['ar', 'en'],              // Saudi Arabia
  AE: ['ar', 'en'],              // United Arab Emirates
  KW: ['ar', 'en'],              // Kuwait
  QA: ['ar', 'en'],              // Qatar
  BH: ['ar', 'en'],              // Bahrain
  OM: ['ar', 'en'],              // Oman
  YE: ['ar', 'en'],              // Yemen
  IQ: ['ar', 'en'],              // Iraq
  JO: ['ar', 'en'],              // Jordan
  LB: ['ar', 'fr', 'en'],       // Lebanon (Arabic + French widely spoken)
  SY: ['ar', 'en'],              // Syria
  PS: ['ar', 'en'],              // Palestine
  IL: ['ar', 'en'],              // Israel (Arabic co-official)
  IR: ['en'],                     // Iran

  // ──────────────────── Central Asia ────────────────────────────────

  KZ: ['ru', 'en'],              // Kazakhstan
  KG: ['ru', 'en'],              // Kyrgyzstan
  UZ: ['ru', 'en'],              // Uzbekistan
  TJ: ['ru', 'en'],              // Tajikistan
  TM: ['ru', 'en'],              // Turkmenistan
  MN: ['ru', 'en'],              // Mongolia (Russian widely taught)

  // ──────────────────── South Asia ──────────────────────────────────

  IN: ['hi', 'en'],              // India
  PK: ['en'],                     // Pakistan
  BD: ['en'],                     // Bangladesh
  LK: ['en'],                     // Sri Lanka
  NP: ['hi', 'en'],              // Nepal (Hindi understood)
  AF: ['en'],                     // Afghanistan
  BT: ['en'],                     // Bhutan
  MM: ['en'],                     // Myanmar

  // ──────────────────── East Asia ───────────────────────────────────

  CN: ['ch', 'en'],              // China
  TW: ['ch', 'en'],              // Taiwan
  HK: ['ch', 'en'],              // Hong Kong
  MO: ['ch', 'pt', 'en'],       // Macau (Chinese + Portuguese)
  JP: ['en'],                     // Japan
  KR: ['en'],                     // South Korea
  KP: ['en'],                     // North Korea

  // ──────────────────── Southeast Asia ──────────────────────────────

  SG: ['ch', 'en'],              // Singapore (Chinese + English official)
  MY: ['ch', 'en'],              // Malaysia (large Chinese community)
  TH: ['en'],                     // Thailand
  VN: ['en'],                     // Vietnam
  PH: ['en'],                     // Philippines
  ID: ['en'],                     // Indonesia
  KH: ['fr', 'en'],              // Cambodia (Francophonie)
  LA: ['fr', 'en'],              // Laos (Francophonie)
  BN: ['en'],                     // Brunei

  // ──────────────────── Oceania ─────────────────────────────────────

  AU: ['en'],                     // Australia
  NZ: ['en'],                     // New Zealand
  FJ: ['en'],                     // Fiji
  PG: ['en'],                     // Papua New Guinea
  NC: ['fr', 'en'],              // New Caledonia (France)
  PF: ['fr', 'en'],              // French Polynesia
  WF: ['fr', 'en'],              // Wallis and Futuna (France)
  VU: ['fr', 'en'],              // Vanuatu (Francophonie)
  WS: ['en'],                     // Samoa
  TO: ['en'],                     // Tonga
  GU: ['en'],                     // Guam

  // ──────────────────── North America ───────────────────────────────

  US: ['es', 'en'],              // United States (large Spanish-speaking pop)
  CA: ['fr', 'en'],              // Canada
  MX: ['es', 'en'],              // Mexico

  // ──────────────────── Central America ─────────────────────────────

  GT: ['es', 'en'],              // Guatemala
  BZ: ['es', 'en'],              // Belize (English official, Spanish widespread)
  SV: ['es', 'en'],              // El Salvador
  HN: ['es', 'en'],              // Honduras
  NI: ['es', 'en'],              // Nicaragua
  CR: ['es', 'en'],              // Costa Rica
  PA: ['es', 'en'],              // Panama

  // ──────────────────── Caribbean ───────────────────────────────────

  CU: ['es', 'en'],              // Cuba
  DO: ['es', 'en'],              // Dominican Republic
  HT: ['fr', 'en'],              // Haiti (French + Creole)
  JM: ['en'],                     // Jamaica
  TT: ['es', 'en'],              // Trinidad and Tobago (Spanish + English)
  PR: ['es', 'en'],              // Puerto Rico
  GP: ['fr', 'en'],              // Guadeloupe (France)
  MQ: ['fr', 'en'],              // Martinique (France)
  GF: ['fr', 'en'],              // French Guiana (France)
  BS: ['en'],                     // Bahamas
  BB: ['en'],                     // Barbados
  AG: ['en'],                     // Antigua and Barbuda
  DM: ['en'],                     // Dominica
  GD: ['en'],                     // Grenada
  KN: ['en'],                     // Saint Kitts and Nevis
  LC: ['en'],                     // Saint Lucia
  VC: ['en'],                     // Saint Vincent
  AW: ['es', 'en'],              // Aruba (Papiamento/Dutch but Spanish common)
  CW: ['es', 'en'],              // Curacao
  SX: ['en'],                     // Sint Maarten
  BL: ['fr', 'en'],              // Saint Barthelemy (France)
  MF: ['fr', 'en'],              // Saint Martin (France)
  PM: ['fr', 'en'],              // Saint Pierre and Miquelon (France)
  VI: ['en'],                     // US Virgin Islands
  KY: ['en'],                     // Cayman Islands
  TC: ['en'],                     // Turks and Caicos
  BM: ['en'],                     // Bermuda

  // ──────────────────── South America ───────────────────────────────

  BR: ['pt', 'en'],              // Brazil
  AR: ['es', 'en'],              // Argentina
  CO: ['es', 'en'],              // Colombia
  CL: ['es', 'en'],              // Chile
  PE: ['es', 'en'],              // Peru
  VE: ['es', 'en'],              // Venezuela
  EC: ['es', 'en'],              // Ecuador
  BO: ['es', 'en'],              // Bolivia
  PY: ['es', 'en'],              // Paraguay
  UY: ['es', 'en'],              // Uruguay
  GY: ['en'],                     // Guyana
  SR: ['en'],                     // Suriname
};

// ---------------------------------------------------------------------------
// Language name → SOS Expat site code mapping
// Covers common language names (English labels) as stored in provider profiles
// ---------------------------------------------------------------------------

const LANGUAGE_NAME_TO_CODE: Record<string, SupportedLanguage> = {
  // English
  french: 'fr',
  français: 'fr',
  francés: 'fr',
  französisch: 'fr',
  francese: 'fr',
  francês: 'fr',

  // English
  english: 'en',
  anglais: 'en',
  inglés: 'en',
  englisch: 'en',
  inglese: 'en',
  inglês: 'en',

  // Spanish
  spanish: 'es',
  espagnol: 'es',
  español: 'es',
  spanisch: 'es',
  spagnolo: 'es',
  espanhol: 'es',

  // German
  german: 'de',
  allemand: 'de',
  alemán: 'de',
  deutsch: 'de',
  tedesco: 'de',
  alemão: 'de',

  // Russian
  russian: 'ru',
  russe: 'ru',
  ruso: 'ru',
  russisch: 'ru',
  russo: 'ru',

  // Portuguese
  portuguese: 'pt',
  portugais: 'pt',
  portugués: 'pt',
  portugiesisch: 'pt',
  portoghese: 'pt',
  português: 'pt',

  // Chinese → 'ch' in SOS Expat (not 'zh')
  chinese: 'ch' as SupportedLanguage,
  chinois: 'ch' as SupportedLanguage,
  chino: 'ch' as SupportedLanguage,
  chinesisch: 'ch' as SupportedLanguage,
  cinese: 'ch' as SupportedLanguage,
  chinês: 'ch' as SupportedLanguage,
  mandarin: 'ch' as SupportedLanguage,
  cantonese: 'ch' as SupportedLanguage,

  // Arabic
  arabic: 'ar',
  arabe: 'ar',
  árabe: 'ar',
  arabisch: 'ar',

  // Hindi
  hindi: 'hi',
};

// The 9 supported language codes in SOS Expat
const SUPPORTED_CODES = new Set<string>(['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'ar', 'hi']);

// ---------------------------------------------------------------------------
// Helper: get the site language codes for a country
// ---------------------------------------------------------------------------

/**
 * Get the supported SOS Expat languages for a given country.
 * Always includes 'en'. Returns ['en'] for unknown countries.
 */
export function getCountryLanguages(countryCode: string): string[] {
  const upper = countryCode?.toUpperCase();
  const langs = COUNTRY_LANGUAGES[upper];
  if (!langs) return ['en'];
  // Guarantee 'en' is present
  return langs.includes('en') ? langs : [...langs, 'en'];
}

// ---------------------------------------------------------------------------
// Helper: map a provider language name to a site code
// ---------------------------------------------------------------------------

/**
 * Convert a language name (e.g. "French", "Arabic") to its SOS Expat site code.
 * Returns undefined if not a supported site language.
 */
export function languageNameToCode(name: string): SupportedLanguage | undefined {
  const key = name?.toLowerCase().trim();
  return LANGUAGE_NAME_TO_CODE[key];
}

// ---------------------------------------------------------------------------
// Main helper: eligible languages for a provider in a given country
// ---------------------------------------------------------------------------

/**
 * Get eligible languages for a provider in a given country.
 * Combines: country's languages + provider's spoken languages + 'en' (universal).
 * Filtered to only the 9 supported site languages.
 *
 * @param countryCode  ISO 3166-1 alpha-2 country code (e.g. "FR", "US")
 * @param providerLanguages  Language names as stored in provider profile
 *                           (e.g. ["French", "Arabic", "English"])
 * @returns Deduplicated array of supported language codes, always including 'en'
 */
export function getEligibleLanguages(
  countryCode: string,
  providerLanguages: string[] = [],
): string[] {
  const result = new Set<string>();

  // 1. Always add English
  result.add('en');

  // 2. Add country languages
  const countryLangs = getCountryLanguages(countryCode);
  for (const lang of countryLangs) {
    if (SUPPORTED_CODES.has(lang)) {
      result.add(lang);
    }
  }

  // 3. Add provider spoken languages (mapped to site codes)
  for (const name of providerLanguages) {
    const code = languageNameToCode(name);
    if (code && SUPPORTED_CODES.has(code)) {
      result.add(code);
    }
  }

  return Array.from(result);
}
