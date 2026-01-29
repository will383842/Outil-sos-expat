/**
 * Countries Configuration for Centralized Payment System
 *
 * This module maps countries to their appropriate payment providers:
 * - Flutterwave: FCFA zone (West/Central Africa) + other African countries with Mobile Money
 * - Wise: Rest of world (Europe, Americas, Asia, Oceania, Middle East)
 *
 * @module payment/config/countriesConfig
 */

import {
  PaymentProvider,
  PaymentMethodType,
  MobileMoneyProvider,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for a single country
 */
export interface CountryConfig {
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;

  /** Country name in French */
  countryName: string;

  /** Primary payment provider for this country */
  provider: PaymentProvider;

  /** Primary payment method type */
  methodType: PaymentMethodType;

  /** ISO 4217 currency code */
  currency: string;

  /** Available mobile money providers (for Flutterwave countries) */
  availableMethods: MobileMoneyProvider[];

  /** Whether Wise supports this country */
  wiseSupported: boolean;

  /** Whether Flutterwave supports this country */
  flutterwaveSupported: boolean;

  /** Region for grouping */
  region: CountryRegion;
}

/**
 * Geographic regions for country grouping
 */
export type CountryRegion =
  | 'fcfa_west_africa'
  | 'fcfa_central_africa'
  | 'africa_other'
  | 'europe'
  | 'north_america'
  | 'latin_america'
  | 'asia'
  | 'middle_east'
  | 'oceania'
  | 'caribbean';

// ============================================================================
// CONSTANT ARRAYS
// ============================================================================

/**
 * FCFA Zone Countries (West and Central Africa)
 * These use XOF (West) or XAF (Central) currencies, both pegged to EUR
 */
export const FCFA_COUNTRIES: string[] = [
  // UEMOA (West African FCFA - XOF)
  'SN', // Senegal
  'CI', // Ivory Coast (Cote d'Ivoire)
  'ML', // Mali
  'BF', // Burkina Faso
  'BJ', // Benin
  'TG', // Togo
  'GN', // Guinea (uses GNF but included for mobile money)
  'NE', // Niger
  // CEMAC (Central African FCFA - XAF)
  'CM', // Cameroon
  'GA', // Gabon
  'CG', // Congo (Republic)
  'TD', // Chad
  'CF', // Central African Republic
  'GQ', // Equatorial Guinea
];

/**
 * Other African countries with strong Mobile Money support via Flutterwave
 */
export const FLUTTERWAVE_AFRICA_COUNTRIES: string[] = [
  'NG', // Nigeria
  'GH', // Ghana
  'KE', // Kenya
  'TZ', // Tanzania
  'UG', // Uganda
  'RW', // Rwanda
  'ZM', // Zambia
  'ZA', // South Africa
  'MW', // Malawi
  'MZ', // Mozambique
  'ZW', // Zimbabwe
  'BW', // Botswana
  'NA', // Namibia
  'LS', // Lesotho
  'SZ', // Eswatini (Swaziland)
  'ET', // Ethiopia
  'DJ', // Djibouti
  'MU', // Mauritius
  'MG', // Madagascar
  'SC', // Seychelles
  'CV', // Cape Verde
  'GM', // Gambia
  'SL', // Sierra Leone
  'LR', // Liberia
  'GW', // Guinea-Bissau
  'MR', // Mauritania
  'SO', // Somalia
  'ER', // Eritrea
  'SS', // South Sudan
  'AO', // Angola
  'CD', // Democratic Republic of Congo
];

/**
 * All Flutterwave-supported countries (FCFA + other Africa)
 */
export const FLUTTERWAVE_COUNTRIES: string[] = [
  ...FCFA_COUNTRIES,
  ...FLUTTERWAVE_AFRICA_COUNTRIES,
];

/**
 * Wise-supported countries (rest of world with bank transfer)
 */
export const WISE_COUNTRIES: string[] = [
  // Europe - Western
  'FR', // France
  'DE', // Germany
  'ES', // Spain
  'IT', // Italy
  'BE', // Belgium
  'NL', // Netherlands
  'PT', // Portugal
  'CH', // Switzerland
  'AT', // Austria
  'LU', // Luxembourg
  'MC', // Monaco
  'AD', // Andorra
  'LI', // Liechtenstein
  'SM', // San Marino
  'VA', // Vatican City
  // Europe - Northern
  'GB', // United Kingdom
  'IE', // Ireland
  'SE', // Sweden
  'NO', // Norway
  'DK', // Denmark
  'FI', // Finland
  'IS', // Iceland
  // Europe - Eastern
  'PL', // Poland
  'CZ', // Czech Republic
  'SK', // Slovakia
  'HU', // Hungary
  'RO', // Romania
  'BG', // Bulgaria
  'SI', // Slovenia
  'HR', // Croatia
  'RS', // Serbia
  'BA', // Bosnia and Herzegovina
  'ME', // Montenegro
  'MK', // North Macedonia
  'AL', // Albania
  'XK', // Kosovo
  'EE', // Estonia
  'LV', // Latvia
  'LT', // Lithuania
  'UA', // Ukraine
  'MD', // Moldova
  'BY', // Belarus
  'GE', // Georgia
  'AM', // Armenia
  'AZ', // Azerbaijan
  'GR', // Greece
  'CY', // Cyprus
  'MT', // Malta
  // North America
  'US', // United States
  'CA', // Canada
  'MX', // Mexico
  // Latin America
  'BR', // Brazil
  'AR', // Argentina
  'CL', // Chile
  'CO', // Colombia
  'PE', // Peru
  'VE', // Venezuela
  'EC', // Ecuador
  'BO', // Bolivia
  'PY', // Paraguay
  'UY', // Uruguay
  'GY', // Guyana
  'SR', // Suriname
  'GF', // French Guiana
  'PA', // Panama
  'CR', // Costa Rica
  'NI', // Nicaragua
  'HN', // Honduras
  'SV', // El Salvador
  'GT', // Guatemala
  'BZ', // Belize
  // Caribbean
  'JM', // Jamaica
  'TT', // Trinidad and Tobago
  'DO', // Dominican Republic
  'HT', // Haiti
  'BB', // Barbados
  'BS', // Bahamas
  'LC', // Saint Lucia
  'GD', // Grenada
  'VC', // Saint Vincent and the Grenadines
  'AG', // Antigua and Barbuda
  'DM', // Dominica
  'KN', // Saint Kitts and Nevis
  'PR', // Puerto Rico
  'CW', // Curacao
  'AW', // Aruba
  // Asia
  'JP', // Japan
  'KR', // South Korea
  'CN', // China
  'HK', // Hong Kong
  'TW', // Taiwan
  'SG', // Singapore
  'MY', // Malaysia
  'TH', // Thailand
  'VN', // Vietnam
  'ID', // Indonesia
  'PH', // Philippines
  'IN', // India
  'PK', // Pakistan
  'BD', // Bangladesh
  'LK', // Sri Lanka
  'NP', // Nepal
  'MM', // Myanmar
  'KH', // Cambodia
  'LA', // Laos
  'MN', // Mongolia
  'BN', // Brunei
  'MV', // Maldives
  'BT', // Bhutan
  'TL', // Timor-Leste
  'KZ', // Kazakhstan
  'UZ', // Uzbekistan
  'TM', // Turkmenistan
  'KG', // Kyrgyzstan
  'TJ', // Tajikistan
  'AF', // Afghanistan
  // Middle East
  'AE', // United Arab Emirates
  'SA', // Saudi Arabia
  'QA', // Qatar
  'KW', // Kuwait
  'BH', // Bahrain
  'OM', // Oman
  'IL', // Israel
  'JO', // Jordan
  'LB', // Lebanon
  'IQ', // Iraq
  'YE', // Yemen
  'TR', // Turkey
  'EG', // Egypt
  'MA', // Morocco
  'DZ', // Algeria
  'TN', // Tunisia
  'LY', // Libya
  // Oceania
  'AU', // Australia
  'NZ', // New Zealand
  'FJ', // Fiji
  'PG', // Papua New Guinea
  'NC', // New Caledonia
  'PF', // French Polynesia
  'WS', // Samoa
  'TO', // Tonga
  'VU', // Vanuatu
  'SB', // Solomon Islands
];

/**
 * Sanctioned or unsupported countries
 */
export const UNSUPPORTED_COUNTRIES: string[] = [
  'IR', // Iran
  'KP', // North Korea
  'CU', // Cuba
  'SY', // Syria
  'SD', // Sudan
  'VE', // Venezuela (limited)
  'MM', // Myanmar (limited)
  'RU', // Russia (sanctions)
  'BY', // Belarus (sanctions)
];

// ============================================================================
// MOBILE MONEY PROVIDERS BY COUNTRY
// ============================================================================

/**
 * Available mobile money providers for each Flutterwave country
 */
const MOBILE_MONEY_BY_COUNTRY: Record<string, MobileMoneyProvider[]> = {
  // FCFA Zone - West Africa
  SN: ['orange_money', 'wave', 'free_money'],
  CI: ['orange_money', 'wave', 'mtn_momo', 'moov_money'],
  ML: ['orange_money', 'moov_money'],
  BF: ['orange_money', 'moov_money'],
  BJ: ['mtn_momo', 'moov_money', 'flooz'],
  TG: ['moov_money', 't_money', 'flooz'],
  GN: ['orange_money', 'mtn_momo'],
  NE: ['orange_money', 'airtel_money'],
  // FCFA Zone - Central Africa
  CM: ['orange_money', 'mtn_momo'],
  GA: ['airtel_money', 'moov_money'],
  CG: ['airtel_money', 'mtn_momo'],
  TD: ['airtel_money', 'moov_money'],
  CF: ['orange_money', 'moov_money'],
  GQ: ['orange_money'],
  // Other Africa
  NG: ['mtn_momo', 'airtel_money'],
  GH: ['mtn_momo', 'airtel_money', 'vodafone_cash' as MobileMoneyProvider],
  KE: ['mpesa', 'airtel_money'],
  TZ: ['mpesa', 'airtel_money'],
  UG: ['mtn_momo', 'airtel_money'],
  RW: ['mtn_momo', 'airtel_money'],
  ZM: ['mtn_momo', 'airtel_money'],
  ZA: [], // Bank transfers mainly
  MW: ['airtel_money', 'mpesa'],
  MZ: ['mpesa', 'mtn_momo'],
  ZW: ['ecocash' as MobileMoneyProvider],
  BW: [],
  NA: [],
  LS: ['mpesa'],
  SZ: ['mtn_momo'],
  ET: ['mpesa'],
  DJ: [],
  MU: [],
  MG: ['orange_money', 'airtel_money'],
  SC: [],
  CV: [],
  GM: ['afrimoney' as MobileMoneyProvider],
  SL: ['orange_money', 'afrimoney' as MobileMoneyProvider],
  LR: ['orange_money', 'mtn_momo'],
  GW: ['orange_money', 'mtn_momo'],
  MR: [],
  SO: ['hormuud' as MobileMoneyProvider],
  ER: [],
  SS: ['mtn_momo'],
  AO: [],
  CD: ['orange_money', 'mpesa', 'airtel_money'],
};

// ============================================================================
// CURRENCY BY COUNTRY
// ============================================================================

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  // FCFA Zone - West Africa (XOF)
  SN: 'XOF',
  CI: 'XOF',
  ML: 'XOF',
  BF: 'XOF',
  BJ: 'XOF',
  TG: 'XOF',
  GN: 'GNF',
  NE: 'XOF',
  // FCFA Zone - Central Africa (XAF)
  CM: 'XAF',
  GA: 'XAF',
  CG: 'XAF',
  TD: 'XAF',
  CF: 'XAF',
  GQ: 'XAF',
  // Other Africa
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  TZ: 'TZS',
  UG: 'UGX',
  RW: 'RWF',
  ZM: 'ZMW',
  ZA: 'ZAR',
  MW: 'MWK',
  MZ: 'MZN',
  ZW: 'ZWL',
  BW: 'BWP',
  NA: 'NAD',
  LS: 'LSL',
  SZ: 'SZL',
  ET: 'ETB',
  DJ: 'DJF',
  MU: 'MUR',
  MG: 'MGA',
  SC: 'SCR',
  CV: 'CVE',
  GM: 'GMD',
  SL: 'SLL',
  LR: 'LRD',
  GW: 'XOF',
  MR: 'MRU',
  SO: 'SOS',
  ER: 'ERN',
  SS: 'SSP',
  AO: 'AOA',
  CD: 'CDF',
  // Europe
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  BE: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  CH: 'CHF',
  AT: 'EUR',
  LU: 'EUR',
  MC: 'EUR',
  AD: 'EUR',
  LI: 'CHF',
  SM: 'EUR',
  VA: 'EUR',
  GB: 'GBP',
  IE: 'EUR',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  FI: 'EUR',
  IS: 'ISK',
  PL: 'PLN',
  CZ: 'CZK',
  SK: 'EUR',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  SI: 'EUR',
  HR: 'EUR',
  RS: 'RSD',
  BA: 'BAM',
  ME: 'EUR',
  MK: 'MKD',
  AL: 'ALL',
  XK: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  UA: 'UAH',
  MD: 'MDL',
  BY: 'BYN',
  GE: 'GEL',
  AM: 'AMD',
  AZ: 'AZN',
  GR: 'EUR',
  CY: 'EUR',
  MT: 'EUR',
  // North America
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  // Latin America
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  VE: 'VES',
  EC: 'USD',
  BO: 'BOB',
  PY: 'PYG',
  UY: 'UYU',
  GY: 'GYD',
  SR: 'SRD',
  GF: 'EUR',
  PA: 'USD',
  CR: 'CRC',
  NI: 'NIO',
  HN: 'HNL',
  SV: 'USD',
  GT: 'GTQ',
  BZ: 'BZD',
  // Caribbean
  JM: 'JMD',
  TT: 'TTD',
  DO: 'DOP',
  HT: 'HTG',
  BB: 'BBD',
  BS: 'BSD',
  LC: 'XCD',
  GD: 'XCD',
  VC: 'XCD',
  AG: 'XCD',
  DM: 'XCD',
  KN: 'XCD',
  PR: 'USD',
  CW: 'ANG',
  AW: 'AWG',
  // Asia
  JP: 'JPY',
  KR: 'KRW',
  CN: 'CNY',
  HK: 'HKD',
  TW: 'TWD',
  SG: 'SGD',
  MY: 'MYR',
  TH: 'THB',
  VN: 'VND',
  ID: 'IDR',
  PH: 'PHP',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  NP: 'NPR',
  MM: 'MMK',
  KH: 'KHR',
  LA: 'LAK',
  MN: 'MNT',
  BN: 'BND',
  MV: 'MVR',
  BT: 'BTN',
  TL: 'USD',
  KZ: 'KZT',
  UZ: 'UZS',
  TM: 'TMT',
  KG: 'KGS',
  TJ: 'TJS',
  AF: 'AFN',
  // Middle East
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  IL: 'ILS',
  JO: 'JOD',
  LB: 'LBP',
  IQ: 'IQD',
  YE: 'YER',
  TR: 'TRY',
  EG: 'EGP',
  MA: 'MAD',
  DZ: 'DZD',
  TN: 'TND',
  LY: 'LYD',
  // Oceania
  AU: 'AUD',
  NZ: 'NZD',
  FJ: 'FJD',
  PG: 'PGK',
  NC: 'XPF',
  PF: 'XPF',
  WS: 'WST',
  TO: 'TOP',
  VU: 'VUV',
  SB: 'SBD',
};

// ============================================================================
// COUNTRY NAMES IN FRENCH
// ============================================================================

const COUNTRY_NAMES_FR: Record<string, string> = {
  // FCFA Zone
  SN: 'Senegal',
  CI: "Cote d'Ivoire",
  ML: 'Mali',
  BF: 'Burkina Faso',
  BJ: 'Benin',
  TG: 'Togo',
  GN: 'Guinee',
  NE: 'Niger',
  CM: 'Cameroun',
  GA: 'Gabon',
  CG: 'Congo',
  TD: 'Tchad',
  CF: 'Centrafrique',
  GQ: 'Guinee Equatoriale',
  // Other Africa
  NG: 'Nigeria',
  GH: 'Ghana',
  KE: 'Kenya',
  TZ: 'Tanzanie',
  UG: 'Ouganda',
  RW: 'Rwanda',
  ZM: 'Zambie',
  ZA: 'Afrique du Sud',
  MW: 'Malawi',
  MZ: 'Mozambique',
  ZW: 'Zimbabwe',
  BW: 'Botswana',
  NA: 'Namibie',
  LS: 'Lesotho',
  SZ: 'Eswatini',
  ET: 'Ethiopie',
  DJ: 'Djibouti',
  MU: 'Maurice',
  MG: 'Madagascar',
  SC: 'Seychelles',
  CV: 'Cap-Vert',
  GM: 'Gambie',
  SL: 'Sierra Leone',
  LR: 'Liberia',
  GW: 'Guinee-Bissau',
  MR: 'Mauritanie',
  SO: 'Somalie',
  ER: 'Erythree',
  SS: 'Soudan du Sud',
  AO: 'Angola',
  CD: 'RD Congo',
  // Europe - Western
  FR: 'France',
  DE: 'Allemagne',
  ES: 'Espagne',
  IT: 'Italie',
  BE: 'Belgique',
  NL: 'Pays-Bas',
  PT: 'Portugal',
  CH: 'Suisse',
  AT: 'Autriche',
  LU: 'Luxembourg',
  MC: 'Monaco',
  AD: 'Andorre',
  LI: 'Liechtenstein',
  SM: 'Saint-Marin',
  VA: 'Vatican',
  // Europe - Northern
  GB: 'Royaume-Uni',
  IE: 'Irlande',
  SE: 'Suede',
  NO: 'Norvege',
  DK: 'Danemark',
  FI: 'Finlande',
  IS: 'Islande',
  // Europe - Eastern
  PL: 'Pologne',
  CZ: 'Tchequie',
  SK: 'Slovaquie',
  HU: 'Hongrie',
  RO: 'Roumanie',
  BG: 'Bulgarie',
  SI: 'Slovenie',
  HR: 'Croatie',
  RS: 'Serbie',
  BA: 'Bosnie-Herzegovine',
  ME: 'Montenegro',
  MK: 'Macedoine du Nord',
  AL: 'Albanie',
  XK: 'Kosovo',
  EE: 'Estonie',
  LV: 'Lettonie',
  LT: 'Lituanie',
  UA: 'Ukraine',
  MD: 'Moldavie',
  BY: 'Bielorussie',
  GE: 'Georgie',
  AM: 'Armenie',
  AZ: 'Azerbaidjan',
  GR: 'Grece',
  CY: 'Chypre',
  MT: 'Malte',
  // North America
  US: 'Etats-Unis',
  CA: 'Canada',
  MX: 'Mexique',
  // Latin America
  BR: 'Bresil',
  AR: 'Argentine',
  CL: 'Chili',
  CO: 'Colombie',
  PE: 'Perou',
  VE: 'Venezuela',
  EC: 'Equateur',
  BO: 'Bolivie',
  PY: 'Paraguay',
  UY: 'Uruguay',
  GY: 'Guyana',
  SR: 'Suriname',
  GF: 'Guyane Francaise',
  PA: 'Panama',
  CR: 'Costa Rica',
  NI: 'Nicaragua',
  HN: 'Honduras',
  SV: 'Salvador',
  GT: 'Guatemala',
  BZ: 'Belize',
  // Caribbean
  JM: 'Jamaique',
  TT: 'Trinite-et-Tobago',
  DO: 'Republique Dominicaine',
  HT: 'Haiti',
  BB: 'Barbade',
  BS: 'Bahamas',
  LC: 'Sainte-Lucie',
  GD: 'Grenade',
  VC: 'Saint-Vincent-et-les-Grenadines',
  AG: 'Antigua-et-Barbuda',
  DM: 'Dominique',
  KN: 'Saint-Kitts-et-Nevis',
  PR: 'Porto Rico',
  CW: 'Curacao',
  AW: 'Aruba',
  // Asia
  JP: 'Japon',
  KR: 'Coree du Sud',
  CN: 'Chine',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  SG: 'Singapour',
  MY: 'Malaisie',
  TH: 'Thailande',
  VN: 'Vietnam',
  ID: 'Indonesie',
  PH: 'Philippines',
  IN: 'Inde',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NP: 'Nepal',
  MM: 'Myanmar',
  KH: 'Cambodge',
  LA: 'Laos',
  MN: 'Mongolie',
  BN: 'Brunei',
  MV: 'Maldives',
  BT: 'Bhoutan',
  TL: 'Timor Oriental',
  KZ: 'Kazakhstan',
  UZ: 'Ouzbekistan',
  TM: 'Turkmenistan',
  KG: 'Kirghizistan',
  TJ: 'Tadjikistan',
  AF: 'Afghanistan',
  // Middle East
  AE: 'Emirats Arabes Unis',
  SA: 'Arabie Saoudite',
  QA: 'Qatar',
  KW: 'Koweit',
  BH: 'Bahrein',
  OM: 'Oman',
  IL: 'Israel',
  JO: 'Jordanie',
  LB: 'Liban',
  IQ: 'Irak',
  YE: 'Yemen',
  TR: 'Turquie',
  EG: 'Egypte',
  MA: 'Maroc',
  DZ: 'Algerie',
  TN: 'Tunisie',
  LY: 'Libye',
  // Oceania
  AU: 'Australie',
  NZ: 'Nouvelle-Zelande',
  FJ: 'Fidji',
  PG: 'Papouasie-Nouvelle-Guinee',
  NC: 'Nouvelle-Caledonie',
  PF: 'Polynesie Francaise',
  WS: 'Samoa',
  TO: 'Tonga',
  VU: 'Vanuatu',
  SB: 'Iles Salomon',
};

// ============================================================================
// REGION MAPPING
// ============================================================================

const REGION_BY_COUNTRY: Record<string, CountryRegion> = {
  // FCFA Zone - West Africa
  SN: 'fcfa_west_africa',
  CI: 'fcfa_west_africa',
  ML: 'fcfa_west_africa',
  BF: 'fcfa_west_africa',
  BJ: 'fcfa_west_africa',
  TG: 'fcfa_west_africa',
  GN: 'fcfa_west_africa',
  NE: 'fcfa_west_africa',
  // FCFA Zone - Central Africa
  CM: 'fcfa_central_africa',
  GA: 'fcfa_central_africa',
  CG: 'fcfa_central_africa',
  TD: 'fcfa_central_africa',
  CF: 'fcfa_central_africa',
  GQ: 'fcfa_central_africa',
  // Other Africa
  NG: 'africa_other',
  GH: 'africa_other',
  KE: 'africa_other',
  TZ: 'africa_other',
  UG: 'africa_other',
  RW: 'africa_other',
  ZM: 'africa_other',
  ZA: 'africa_other',
  MW: 'africa_other',
  MZ: 'africa_other',
  ZW: 'africa_other',
  BW: 'africa_other',
  NA: 'africa_other',
  LS: 'africa_other',
  SZ: 'africa_other',
  ET: 'africa_other',
  DJ: 'africa_other',
  MU: 'africa_other',
  MG: 'africa_other',
  SC: 'africa_other',
  CV: 'africa_other',
  GM: 'africa_other',
  SL: 'africa_other',
  LR: 'africa_other',
  GW: 'africa_other',
  MR: 'africa_other',
  SO: 'africa_other',
  ER: 'africa_other',
  SS: 'africa_other',
  AO: 'africa_other',
  CD: 'africa_other',
  // Europe
  FR: 'europe',
  DE: 'europe',
  ES: 'europe',
  IT: 'europe',
  BE: 'europe',
  NL: 'europe',
  PT: 'europe',
  CH: 'europe',
  AT: 'europe',
  LU: 'europe',
  MC: 'europe',
  AD: 'europe',
  LI: 'europe',
  SM: 'europe',
  VA: 'europe',
  GB: 'europe',
  IE: 'europe',
  SE: 'europe',
  NO: 'europe',
  DK: 'europe',
  FI: 'europe',
  IS: 'europe',
  PL: 'europe',
  CZ: 'europe',
  SK: 'europe',
  HU: 'europe',
  RO: 'europe',
  BG: 'europe',
  SI: 'europe',
  HR: 'europe',
  RS: 'europe',
  BA: 'europe',
  ME: 'europe',
  MK: 'europe',
  AL: 'europe',
  XK: 'europe',
  EE: 'europe',
  LV: 'europe',
  LT: 'europe',
  UA: 'europe',
  MD: 'europe',
  BY: 'europe',
  GE: 'europe',
  AM: 'europe',
  AZ: 'europe',
  GR: 'europe',
  CY: 'europe',
  MT: 'europe',
  // North America
  US: 'north_america',
  CA: 'north_america',
  MX: 'north_america',
  // Latin America
  BR: 'latin_america',
  AR: 'latin_america',
  CL: 'latin_america',
  CO: 'latin_america',
  PE: 'latin_america',
  VE: 'latin_america',
  EC: 'latin_america',
  BO: 'latin_america',
  PY: 'latin_america',
  UY: 'latin_america',
  GY: 'latin_america',
  SR: 'latin_america',
  GF: 'latin_america',
  PA: 'latin_america',
  CR: 'latin_america',
  NI: 'latin_america',
  HN: 'latin_america',
  SV: 'latin_america',
  GT: 'latin_america',
  BZ: 'latin_america',
  // Caribbean
  JM: 'caribbean',
  TT: 'caribbean',
  DO: 'caribbean',
  HT: 'caribbean',
  BB: 'caribbean',
  BS: 'caribbean',
  LC: 'caribbean',
  GD: 'caribbean',
  VC: 'caribbean',
  AG: 'caribbean',
  DM: 'caribbean',
  KN: 'caribbean',
  PR: 'caribbean',
  CW: 'caribbean',
  AW: 'caribbean',
  // Asia
  JP: 'asia',
  KR: 'asia',
  CN: 'asia',
  HK: 'asia',
  TW: 'asia',
  SG: 'asia',
  MY: 'asia',
  TH: 'asia',
  VN: 'asia',
  ID: 'asia',
  PH: 'asia',
  IN: 'asia',
  PK: 'asia',
  BD: 'asia',
  LK: 'asia',
  NP: 'asia',
  MM: 'asia',
  KH: 'asia',
  LA: 'asia',
  MN: 'asia',
  BN: 'asia',
  MV: 'asia',
  BT: 'asia',
  TL: 'asia',
  KZ: 'asia',
  UZ: 'asia',
  TM: 'asia',
  KG: 'asia',
  TJ: 'asia',
  AF: 'asia',
  // Middle East
  AE: 'middle_east',
  SA: 'middle_east',
  QA: 'middle_east',
  KW: 'middle_east',
  BH: 'middle_east',
  OM: 'middle_east',
  IL: 'middle_east',
  JO: 'middle_east',
  LB: 'middle_east',
  IQ: 'middle_east',
  YE: 'middle_east',
  TR: 'middle_east',
  EG: 'middle_east',
  MA: 'middle_east',
  DZ: 'middle_east',
  TN: 'middle_east',
  LY: 'middle_east',
  // Oceania
  AU: 'oceania',
  NZ: 'oceania',
  FJ: 'oceania',
  PG: 'oceania',
  NC: 'oceania',
  PF: 'oceania',
  WS: 'oceania',
  TO: 'oceania',
  VU: 'oceania',
  SB: 'oceania',
};

// ============================================================================
// BUILD COUNTRY CONFIG MAP
// ============================================================================

/**
 * Build the complete country configuration
 */
function buildCountryConfig(countryCode: string): CountryConfig | null {
  const isFlutterwave = FLUTTERWAVE_COUNTRIES.includes(countryCode);
  const isWise = WISE_COUNTRIES.includes(countryCode);

  if (!isFlutterwave && !isWise) {
    return null;
  }

  const countryName = COUNTRY_NAMES_FR[countryCode] || countryCode;
  const currency = CURRENCY_BY_COUNTRY[countryCode] || 'USD';
  const region = REGION_BY_COUNTRY[countryCode] || 'europe';
  const availableMethods = MOBILE_MONEY_BY_COUNTRY[countryCode] || [];

  return {
    countryCode,
    countryName,
    provider: isFlutterwave ? 'flutterwave' : 'wise',
    methodType: isFlutterwave ? 'mobile_money' : 'bank_transfer',
    currency,
    availableMethods,
    wiseSupported: isWise || !isFlutterwave, // Wise can handle most countries as fallback
    flutterwaveSupported: isFlutterwave,
    region,
  };
}

/**
 * Complete map of all country configurations
 */
export const COUNTRIES_CONFIG: Map<string, CountryConfig> = new Map();

// Build the config map
const allCountries = [...new Set([...FLUTTERWAVE_COUNTRIES, ...WISE_COUNTRIES])];
for (const countryCode of allCountries) {
  const config = buildCountryConfig(countryCode);
  if (config) {
    COUNTRIES_CONFIG.set(countryCode, config);
  }
}

/**
 * Array version of the config for iteration
 */
export const COUNTRIES_CONFIG_ARRAY: CountryConfig[] = Array.from(COUNTRIES_CONFIG.values());

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the full configuration for a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Country configuration or undefined if not supported
 */
export function getCountryConfig(countryCode: string): CountryConfig | undefined {
  return COUNTRIES_CONFIG.get(countryCode.toUpperCase());
}

/**
 * Get the primary payment provider for a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Payment provider or undefined if country not supported
 */
export function getProviderForCountry(countryCode: string): PaymentProvider | undefined {
  const config = getCountryConfig(countryCode);
  return config?.provider;
}

/**
 * Get available mobile money methods for a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Array of available mobile money providers (empty for non-mobile-money countries)
 */
export function getAvailableMethodsForCountry(countryCode: string): MobileMoneyProvider[] {
  const config = getCountryConfig(countryCode);
  return config?.availableMethods || [];
}

/**
 * Check if a country is supported by the payment system
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns True if the country is supported
 */
export function isCountrySupported(countryCode: string): boolean {
  const code = countryCode.toUpperCase();

  // Check if explicitly unsupported
  if (UNSUPPORTED_COUNTRIES.includes(code)) {
    return false;
  }

  // Check if we have a config for it
  return COUNTRIES_CONFIG.has(code);
}

/**
 * Get all countries supported by a specific provider
 *
 * @param provider - The payment provider to filter by
 * @returns Array of country configurations for that provider
 */
export function getCountriesByProvider(provider: PaymentProvider): CountryConfig[] {
  return COUNTRIES_CONFIG_ARRAY.filter((config) => config.provider === provider);
}

/**
 * Get all supported country codes
 *
 * @returns Array of all supported ISO country codes
 */
export function getAllSupportedCountries(): string[] {
  return Array.from(COUNTRIES_CONFIG.keys());
}

/**
 * Get all countries in a specific region
 *
 * @param region - The region to filter by
 * @returns Array of country configurations in that region
 */
export function getCountriesByRegion(region: CountryRegion): CountryConfig[] {
  return COUNTRIES_CONFIG_ARRAY.filter((config) => config.region === region);
}

/**
 * Get the currency for a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns ISO 4217 currency code or undefined
 */
export function getCurrencyForCountry(countryCode: string): string | undefined {
  const config = getCountryConfig(countryCode);
  return config?.currency;
}

/**
 * Check if a country is in the FCFA zone
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns True if the country uses FCFA currency (XOF or XAF)
 */
export function isFcfaCountry(countryCode: string): boolean {
  return FCFA_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Check if a country supports mobile money
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns True if mobile money is available
 */
export function hasMobileMoneySupport(countryCode: string): boolean {
  const methods = getAvailableMethodsForCountry(countryCode);
  return methods.length > 0;
}

/**
 * Get the method type for a country (mobile_money or bank_transfer)
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Payment method type or undefined
 */
export function getMethodTypeForCountry(countryCode: string): PaymentMethodType | undefined {
  const config = getCountryConfig(countryCode);
  return config?.methodType;
}

/**
 * Check if a country is sanctioned/unsupported
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns True if the country is on the sanctions list
 */
export function isCountrySanctioned(countryCode: string): boolean {
  return UNSUPPORTED_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Get the French name of a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Country name in French or the code if not found
 */
export function getCountryNameFr(countryCode: string): string {
  return COUNTRY_NAMES_FR[countryCode.toUpperCase()] || countryCode;
}

/**
 * Validate that a payment method is available for a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param provider - The mobile money provider to check
 * @returns True if the provider is available in that country
 */
export function isMethodAvailableInCountry(
  countryCode: string,
  provider: MobileMoneyProvider
): boolean {
  const methods = getAvailableMethodsForCountry(countryCode);
  return methods.includes(provider);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get statistics about supported countries
 */
export function getCountryStatistics(): {
  totalSupported: number;
  flutterwaveCount: number;
  wiseCount: number;
  fcfaCount: number;
  unsupportedCount: number;
  byRegion: Record<CountryRegion, number>;
} {
  const byRegion: Record<CountryRegion, number> = {
    fcfa_west_africa: 0,
    fcfa_central_africa: 0,
    africa_other: 0,
    europe: 0,
    north_america: 0,
    latin_america: 0,
    asia: 0,
    middle_east: 0,
    oceania: 0,
    caribbean: 0,
  };

  for (const config of COUNTRIES_CONFIG_ARRAY) {
    byRegion[config.region]++;
  }

  return {
    totalSupported: COUNTRIES_CONFIG.size,
    flutterwaveCount: getCountriesByProvider('flutterwave').length,
    wiseCount: getCountriesByProvider('wise').length,
    fcfaCount: FCFA_COUNTRIES.length,
    unsupportedCount: UNSUPPORTED_COUNTRIES.length,
    byRegion,
  };
}
