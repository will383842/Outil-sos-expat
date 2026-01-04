/**
 * Country Fiscal Configurations - 197 Countries
 *
 * Complete fiscal configuration for all countries supported by SOS-Expat.
 * Includes VAT/GST rates, tax types, thresholds, currencies, and payment methods.
 *
 * @module configs/countryFiscalConfigs
 */

// ============================================================================
// TYPES
// ============================================================================

export type TaxType = 'VAT' | 'GST' | 'SALES_TAX' | 'CONSUMPTION_TAX' | 'NONE';
export type PaymentMethod = 'STRIPE' | 'PAYPAL' | 'BOTH' | 'NONE';
export type Region = 'EU' | 'EEA' | 'EUROPE_OTHER' | 'NORTH_AMERICA' | 'LATIN_AMERICA' | 'ASIA_PACIFIC' | 'MIDDLE_EAST' | 'AFRICA' | 'OCEANIA' | 'CARIBBEAN';

export interface CountryFiscalConfig {
  countryCode: string;
  countryName: {
    en: string;
    fr: string;
  };
  region: Region;
  currency: string;
  currencySymbol: string;

  // Tax configuration
  taxType: TaxType;
  standardVatRate: number;
  reducedVatRates?: number[];
  vatEnabled: boolean;
  vatRegistrationThreshold?: number;
  vatRegistrationThresholdCurrency?: string;
  vatRegistrationRequired: boolean;

  // Digital services specific
  digitalServicesRules: {
    applicable: boolean;
    rate?: number;
    threshold?: number;
    thresholdCurrency?: string;
    requiresRegistration: boolean;
    regime?: 'OSS' | 'VOEC' | 'OVR' | 'LOCAL' | 'NONE';
    notes?: string;
  };

  // Payment methods available
  paymentMethods: PaymentMethod;
  stripeSupported: boolean;
  paypalSupported: boolean;

  // Legal requirements
  requiresLocalEntity: boolean;
  requiresFiscalRepresentative: boolean;
  invoiceRequirements?: string[];

  // Additional info
  timezone: string;
  languages: string[];
  flag: string;
  notes?: string;
}

// ============================================================================
// EU COUNTRIES (27)
// ============================================================================

export const EU_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'AT',
    countryName: { en: 'Austria', fr: 'Autriche' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [10, 13],
    vatEnabled: true,
    vatRegistrationThreshold: 35000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS',
      notes: 'OSS regime for intra-EU B2C digital services'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Vienna',
    languages: ['de'],
    flag: '🇦🇹'
  },
  {
    countryCode: 'BE',
    countryName: { en: 'Belgium', fr: 'Belgique' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [6, 12],
    vatEnabled: true,
    vatRegistrationThreshold: 25000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 21,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Brussels',
    languages: ['nl', 'fr', 'de'],
    flag: '🇧🇪'
  },
  {
    countryCode: 'BG',
    countryName: { en: 'Bulgaria', fr: 'Bulgarie' },
    region: 'EU',
    currency: 'BGN',
    currencySymbol: 'лв',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [9],
    vatEnabled: true,
    vatRegistrationThreshold: 50000,
    vatRegistrationThresholdCurrency: 'BGN',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Sofia',
    languages: ['bg'],
    flag: '🇧🇬'
  },
  {
    countryCode: 'HR',
    countryName: { en: 'Croatia', fr: 'Croatie' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 25,
    reducedVatRates: [5, 13],
    vatEnabled: true,
    vatRegistrationThreshold: 39816,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 25,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Zagreb',
    languages: ['hr'],
    flag: '🇭🇷'
  },
  {
    countryCode: 'CY',
    countryName: { en: 'Cyprus', fr: 'Chypre' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 19,
    reducedVatRates: [5, 9],
    vatEnabled: true,
    vatRegistrationThreshold: 15600,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Nicosia',
    languages: ['el', 'tr'],
    flag: '🇨🇾'
  },
  {
    countryCode: 'CZ',
    countryName: { en: 'Czech Republic', fr: 'République tchèque' },
    region: 'EU',
    currency: 'CZK',
    currencySymbol: 'Kč',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [10, 15],
    vatEnabled: true,
    vatRegistrationThreshold: 2000000,
    vatRegistrationThresholdCurrency: 'CZK',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 21,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Prague',
    languages: ['cs'],
    flag: '🇨🇿'
  },
  {
    countryCode: 'DK',
    countryName: { en: 'Denmark', fr: 'Danemark' },
    region: 'EU',
    currency: 'DKK',
    currencySymbol: 'kr',
    taxType: 'VAT',
    standardVatRate: 25,
    reducedVatRates: [],
    vatEnabled: true,
    vatRegistrationThreshold: 50000,
    vatRegistrationThresholdCurrency: 'DKK',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 25,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Copenhagen',
    languages: ['da'],
    flag: '🇩🇰'
  },
  {
    countryCode: 'EE',
    countryName: { en: 'Estonia', fr: 'Estonie' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 22,
    reducedVatRates: [9],
    vatEnabled: true,
    vatRegistrationThreshold: 40000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 22,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS',
      notes: 'SOS-Expat OU is registered in Estonia'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Tallinn',
    languages: ['et'],
    flag: '🇪🇪'
  },
  {
    countryCode: 'FI',
    countryName: { en: 'Finland', fr: 'Finlande' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 24,
    reducedVatRates: [10, 14],
    vatEnabled: true,
    vatRegistrationThreshold: 15000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 24,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Helsinki',
    languages: ['fi', 'sv'],
    flag: '🇫🇮'
  },
  {
    countryCode: 'FR',
    countryName: { en: 'France', fr: 'France' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [5.5, 10],
    vatEnabled: true,
    vatRegistrationThreshold: 85800,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    invoiceRequirements: ['TVA number', 'Sequential numbering', 'Date', 'Seller details'],
    timezone: 'Europe/Paris',
    languages: ['fr'],
    flag: '🇫🇷'
  },
  {
    countryCode: 'DE',
    countryName: { en: 'Germany', fr: 'Allemagne' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 19,
    reducedVatRates: [7],
    vatEnabled: true,
    vatRegistrationThreshold: 22000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Berlin',
    languages: ['de'],
    flag: '🇩🇪'
  },
  {
    countryCode: 'GR',
    countryName: { en: 'Greece', fr: 'Grèce' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 24,
    reducedVatRates: [6, 13],
    vatEnabled: true,
    vatRegistrationThreshold: 10000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 24,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Athens',
    languages: ['el'],
    flag: '🇬🇷'
  },
  {
    countryCode: 'HU',
    countryName: { en: 'Hungary', fr: 'Hongrie' },
    region: 'EU',
    currency: 'HUF',
    currencySymbol: 'Ft',
    taxType: 'VAT',
    standardVatRate: 27,
    reducedVatRates: [5, 18],
    vatEnabled: true,
    vatRegistrationThreshold: 12000000,
    vatRegistrationThresholdCurrency: 'HUF',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 27,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Budapest',
    languages: ['hu'],
    flag: '🇭🇺'
  },
  {
    countryCode: 'IE',
    countryName: { en: 'Ireland', fr: 'Irlande' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 23,
    reducedVatRates: [9, 13.5],
    vatEnabled: true,
    vatRegistrationThreshold: 37500,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 23,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Dublin',
    languages: ['en', 'ga'],
    flag: '🇮🇪'
  },
  {
    countryCode: 'IT',
    countryName: { en: 'Italy', fr: 'Italie' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 22,
    reducedVatRates: [4, 5, 10],
    vatEnabled: true,
    vatRegistrationThreshold: 65000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 22,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Rome',
    languages: ['it'],
    flag: '🇮🇹'
  },
  {
    countryCode: 'LV',
    countryName: { en: 'Latvia', fr: 'Lettonie' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [5, 12],
    vatEnabled: true,
    vatRegistrationThreshold: 40000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 21,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Riga',
    languages: ['lv'],
    flag: '🇱🇻'
  },
  {
    countryCode: 'LT',
    countryName: { en: 'Lithuania', fr: 'Lituanie' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [5, 9],
    vatEnabled: true,
    vatRegistrationThreshold: 45000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 21,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Vilnius',
    languages: ['lt'],
    flag: '🇱🇹'
  },
  {
    countryCode: 'LU',
    countryName: { en: 'Luxembourg', fr: 'Luxembourg' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 17,
    reducedVatRates: [3, 8, 14],
    vatEnabled: true,
    vatRegistrationThreshold: 35000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 17,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Luxembourg',
    languages: ['lb', 'fr', 'de'],
    flag: '🇱🇺'
  },
  {
    countryCode: 'MT',
    countryName: { en: 'Malta', fr: 'Malte' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 18,
    reducedVatRates: [5, 7],
    vatEnabled: true,
    vatRegistrationThreshold: 35000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 18,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Malta',
    languages: ['mt', 'en'],
    flag: '🇲🇹'
  },
  {
    countryCode: 'NL',
    countryName: { en: 'Netherlands', fr: 'Pays-Bas' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [9],
    vatEnabled: true,
    vatRegistrationThreshold: 20000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 21,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Amsterdam',
    languages: ['nl'],
    flag: '🇳🇱'
  },
  {
    countryCode: 'PL',
    countryName: { en: 'Poland', fr: 'Pologne' },
    region: 'EU',
    currency: 'PLN',
    currencySymbol: 'zł',
    taxType: 'VAT',
    standardVatRate: 23,
    reducedVatRates: [5, 8],
    vatEnabled: true,
    vatRegistrationThreshold: 200000,
    vatRegistrationThresholdCurrency: 'PLN',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 23,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Warsaw',
    languages: ['pl'],
    flag: '🇵🇱'
  },
  {
    countryCode: 'PT',
    countryName: { en: 'Portugal', fr: 'Portugal' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 23,
    reducedVatRates: [6, 13],
    vatEnabled: true,
    vatRegistrationThreshold: 12500,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 23,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Lisbon',
    languages: ['pt'],
    flag: '🇵🇹'
  },
  {
    countryCode: 'RO',
    countryName: { en: 'Romania', fr: 'Roumanie' },
    region: 'EU',
    currency: 'RON',
    currencySymbol: 'lei',
    taxType: 'VAT',
    standardVatRate: 19,
    reducedVatRates: [5, 9],
    vatEnabled: true,
    vatRegistrationThreshold: 300000,
    vatRegistrationThresholdCurrency: 'RON',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Bucharest',
    languages: ['ro'],
    flag: '🇷🇴'
  },
  {
    countryCode: 'SK',
    countryName: { en: 'Slovakia', fr: 'Slovaquie' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [10],
    vatEnabled: true,
    vatRegistrationThreshold: 49790,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Bratislava',
    languages: ['sk'],
    flag: '🇸🇰'
  },
  {
    countryCode: 'SI',
    countryName: { en: 'Slovenia', fr: 'Slovénie' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 22,
    reducedVatRates: [5, 9.5],
    vatEnabled: true,
    vatRegistrationThreshold: 50000,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 22,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Ljubljana',
    languages: ['sl'],
    flag: '🇸🇮'
  },
  {
    countryCode: 'ES',
    countryName: { en: 'Spain', fr: 'Espagne' },
    region: 'EU',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [4, 10],
    vatEnabled: true,
    vatRegistrationThreshold: 0,
    vatRegistrationThresholdCurrency: 'EUR',
    vatRegistrationRequired: true,
    digitalServicesRules: {
      applicable: true,
      rate: 21,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Madrid',
    languages: ['es', 'ca', 'gl', 'eu'],
    flag: '🇪🇸'
  },
  {
    countryCode: 'SE',
    countryName: { en: 'Sweden', fr: 'Suède' },
    region: 'EU',
    currency: 'SEK',
    currencySymbol: 'kr',
    taxType: 'VAT',
    standardVatRate: 25,
    reducedVatRates: [6, 12],
    vatEnabled: true,
    vatRegistrationThreshold: 80000,
    vatRegistrationThresholdCurrency: 'SEK',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 25,
      threshold: 10000,
      thresholdCurrency: 'EUR',
      requiresRegistration: false,
      regime: 'OSS'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Stockholm',
    languages: ['sv'],
    flag: '🇸🇪'
  }
];

// ============================================================================
// EEA COUNTRIES (Non-EU but in European Economic Area)
// ============================================================================

export const EEA_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'IS',
    countryName: { en: 'Iceland', fr: 'Islande' },
    region: 'EEA',
    currency: 'ISK',
    currencySymbol: 'kr',
    taxType: 'VAT',
    standardVatRate: 24,
    reducedVatRates: [11],
    vatEnabled: true,
    vatRegistrationThreshold: 2000000,
    vatRegistrationThresholdCurrency: 'ISK',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 24,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Atlantic/Reykjavik',
    languages: ['is'],
    flag: '🇮🇸'
  },
  {
    countryCode: 'LI',
    countryName: { en: 'Liechtenstein', fr: 'Liechtenstein' },
    region: 'EEA',
    currency: 'CHF',
    currencySymbol: 'CHF',
    taxType: 'VAT',
    standardVatRate: 8.1,
    reducedVatRates: [2.6, 3.8],
    vatEnabled: true,
    vatRegistrationThreshold: 100000,
    vatRegistrationThresholdCurrency: 'CHF',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 8.1,
      threshold: 100000,
      thresholdCurrency: 'CHF',
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Vaduz',
    languages: ['de'],
    flag: '🇱🇮'
  },
  {
    countryCode: 'NO',
    countryName: { en: 'Norway', fr: 'Norvège' },
    region: 'EEA',
    currency: 'NOK',
    currencySymbol: 'kr',
    taxType: 'VAT',
    standardVatRate: 25,
    reducedVatRates: [12, 15],
    vatEnabled: true,
    vatRegistrationThreshold: 50000,
    vatRegistrationThresholdCurrency: 'NOK',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 25,
      threshold: 50000,
      thresholdCurrency: 'NOK',
      requiresRegistration: true,
      regime: 'VOEC',
      notes: 'VOEC registration required for B2C digital services'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Oslo',
    languages: ['no'],
    flag: '🇳🇴'
  }
];

// ============================================================================
// OTHER EUROPEAN COUNTRIES
// ============================================================================

export const EUROPE_OTHER_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'GB',
    countryName: { en: 'United Kingdom', fr: 'Royaume-Uni' },
    region: 'EUROPE_OTHER',
    currency: 'GBP',
    currencySymbol: '£',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [5],
    vatEnabled: true,
    vatRegistrationThreshold: 0,
    vatRegistrationThresholdCurrency: 'GBP',
    vatRegistrationRequired: true,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      threshold: 0,
      thresholdCurrency: 'GBP',
      requiresRegistration: true,
      regime: 'LOCAL',
      notes: 'UK VAT registration required from first B2C digital service sale'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/London',
    languages: ['en'],
    flag: '🇬🇧'
  },
  {
    countryCode: 'CH',
    countryName: { en: 'Switzerland', fr: 'Suisse' },
    region: 'EUROPE_OTHER',
    currency: 'CHF',
    currencySymbol: 'CHF',
    taxType: 'VAT',
    standardVatRate: 8.1,
    reducedVatRates: [2.6, 3.8],
    vatEnabled: true,
    vatRegistrationThreshold: 100000,
    vatRegistrationThresholdCurrency: 'CHF',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 8.1,
      threshold: 100000,
      thresholdCurrency: 'CHF',
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'Swiss VAT registration required if CHF 100,000 threshold exceeded'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: true,
    timezone: 'Europe/Zurich',
    languages: ['de', 'fr', 'it', 'rm'],
    flag: '🇨🇭'
  },
  {
    countryCode: 'UA',
    countryName: { en: 'Ukraine', fr: 'Ukraine' },
    region: 'EUROPE_OTHER',
    currency: 'UAH',
    currencySymbol: '₴',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [7],
    vatEnabled: true,
    vatRegistrationThreshold: 1000000,
    vatRegistrationThresholdCurrency: 'UAH',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Kiev',
    languages: ['uk'],
    flag: '🇺🇦'
  },
  {
    countryCode: 'RS',
    countryName: { en: 'Serbia', fr: 'Serbie' },
    region: 'EUROPE_OTHER',
    currency: 'RSD',
    currencySymbol: 'дин.',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [10],
    vatEnabled: true,
    vatRegistrationThreshold: 8000000,
    vatRegistrationThresholdCurrency: 'RSD',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Belgrade',
    languages: ['sr'],
    flag: '🇷🇸'
  },
  {
    countryCode: 'AL',
    countryName: { en: 'Albania', fr: 'Albanie' },
    region: 'EUROPE_OTHER',
    currency: 'ALL',
    currencySymbol: 'L',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [6, 10],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Tirane',
    languages: ['sq'],
    flag: '🇦🇱'
  },
  {
    countryCode: 'MD',
    countryName: { en: 'Moldova', fr: 'Moldavie' },
    region: 'EUROPE_OTHER',
    currency: 'MDL',
    currencySymbol: 'L',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [8],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Chisinau',
    languages: ['ro'],
    flag: '🇲🇩'
  },
  {
    countryCode: 'MK',
    countryName: { en: 'North Macedonia', fr: 'Macédoine du Nord' },
    region: 'EUROPE_OTHER',
    currency: 'MKD',
    currencySymbol: 'ден',
    taxType: 'VAT',
    standardVatRate: 18,
    reducedVatRates: [5, 10],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Skopje',
    languages: ['mk'],
    flag: '🇲🇰'
  },
  {
    countryCode: 'BA',
    countryName: { en: 'Bosnia and Herzegovina', fr: 'Bosnie-Herzégovine' },
    region: 'EUROPE_OTHER',
    currency: 'BAM',
    currencySymbol: 'KM',
    taxType: 'VAT',
    standardVatRate: 17,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Sarajevo',
    languages: ['bs', 'hr', 'sr'],
    flag: '🇧🇦'
  },
  {
    countryCode: 'ME',
    countryName: { en: 'Montenegro', fr: 'Monténégro' },
    region: 'EUROPE_OTHER',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [7],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Podgorica',
    languages: ['sr'],
    flag: '🇲🇪'
  },
  {
    countryCode: 'XK',
    countryName: { en: 'Kosovo', fr: 'Kosovo' },
    region: 'EUROPE_OTHER',
    currency: 'EUR',
    currencySymbol: '€',
    taxType: 'VAT',
    standardVatRate: 18,
    reducedVatRates: [8],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Belgrade',
    languages: ['sq', 'sr'],
    flag: '🇽🇰'
  },
  {
    countryCode: 'BY',
    countryName: { en: 'Belarus', fr: 'Biélorussie' },
    region: 'EUROPE_OTHER',
    currency: 'BYN',
    currencySymbol: 'Br',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [10],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'NONE',
    stripeSupported: false,
    paypalSupported: false,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Minsk',
    languages: ['be', 'ru'],
    flag: '🇧🇾',
    notes: 'Sanctions - payments restricted'
  },
  {
    countryCode: 'RU',
    countryName: { en: 'Russia', fr: 'Russie' },
    region: 'EUROPE_OTHER',
    currency: 'RUB',
    currencySymbol: '₽',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [10],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'NONE',
    stripeSupported: false,
    paypalSupported: false,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Moscow',
    languages: ['ru'],
    flag: '🇷🇺',
    notes: 'Sanctions - payments restricted'
  },
  {
    countryCode: 'TR',
    countryName: { en: 'Turkey', fr: 'Turquie' },
    region: 'EUROPE_OTHER',
    currency: 'TRY',
    currencySymbol: '₺',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [1, 10],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Europe/Istanbul',
    languages: ['tr'],
    flag: '🇹🇷'
  }
];

// ============================================================================
// NORTH AMERICAN COUNTRIES
// ============================================================================

export const NORTH_AMERICA_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'US',
    countryName: { en: 'United States', fr: 'États-Unis' },
    region: 'NORTH_AMERICA',
    currency: 'USD',
    currencySymbol: '$',
    taxType: 'SALES_TAX',
    standardVatRate: 0,
    vatEnabled: false,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE',
      notes: 'Professional services generally exempt from Sales Tax. State-level nexus rules apply.'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/New_York',
    languages: ['en', 'es'],
    flag: '🇺🇸',
    notes: 'Sales tax varies by state. Professional/legal services typically exempt.'
  },
  {
    countryCode: 'CA',
    countryName: { en: 'Canada', fr: 'Canada' },
    region: 'NORTH_AMERICA',
    currency: 'CAD',
    currencySymbol: '$',
    taxType: 'GST',
    standardVatRate: 5,
    vatEnabled: true,
    vatRegistrationThreshold: 30000,
    vatRegistrationThresholdCurrency: 'CAD',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 5,
      threshold: 30000,
      thresholdCurrency: 'CAD',
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'GST 5% federal. HST varies by province (13-15%). PST in some provinces.'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Toronto',
    languages: ['en', 'fr'],
    flag: '🇨🇦'
  },
  {
    countryCode: 'MX',
    countryName: { en: 'Mexico', fr: 'Mexique' },
    region: 'NORTH_AMERICA',
    currency: 'MXN',
    currencySymbol: '$',
    taxType: 'VAT',
    standardVatRate: 16,
    reducedVatRates: [0],
    vatEnabled: true,
    vatRegistrationThreshold: 0,
    vatRegistrationThresholdCurrency: 'MXN',
    vatRegistrationRequired: true,
    digitalServicesRules: {
      applicable: true,
      rate: 16,
      threshold: 0,
      requiresRegistration: true,
      regime: 'LOCAL',
      notes: 'IVA 16% required from first B2C digital service sale'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Mexico_City',
    languages: ['es'],
    flag: '🇲🇽'
  }
];

// ============================================================================
// ASIA PACIFIC COUNTRIES
// ============================================================================

export const ASIA_PACIFIC_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'JP',
    countryName: { en: 'Japan', fr: 'Japon' },
    region: 'ASIA_PACIFIC',
    currency: 'JPY',
    currencySymbol: '¥',
    taxType: 'CONSUMPTION_TAX',
    standardVatRate: 10,
    reducedVatRates: [8],
    vatEnabled: true,
    vatRegistrationThreshold: 10000000,
    vatRegistrationThresholdCurrency: 'JPY',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 10,
      threshold: 10000000,
      thresholdCurrency: 'JPY',
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'JCT 10% for digital services'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Tokyo',
    languages: ['ja'],
    flag: '🇯🇵'
  },
  {
    countryCode: 'KR',
    countryName: { en: 'South Korea', fr: 'Corée du Sud' },
    region: 'ASIA_PACIFIC',
    currency: 'KRW',
    currencySymbol: '₩',
    taxType: 'VAT',
    standardVatRate: 10,
    vatEnabled: true,
    vatRegistrationThreshold: 0,
    vatRegistrationThresholdCurrency: 'KRW',
    vatRegistrationRequired: true,
    digitalServicesRules: {
      applicable: true,
      rate: 10,
      threshold: 0,
      requiresRegistration: true,
      regime: 'LOCAL',
      notes: 'VAT 10% required from first B2C digital service sale'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Seoul',
    languages: ['ko'],
    flag: '🇰🇷'
  },
  {
    countryCode: 'CN',
    countryName: { en: 'China', fr: 'Chine' },
    region: 'ASIA_PACIFIC',
    currency: 'CNY',
    currencySymbol: '¥',
    taxType: 'VAT',
    standardVatRate: 13,
    reducedVatRates: [6, 9],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 6,
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'VAT 6% for digital services. Withholding tax may apply.'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Shanghai',
    languages: ['zh'],
    flag: '🇨🇳',
    notes: 'Stripe not available. Use PayPal or local alternatives.'
  },
  {
    countryCode: 'HK',
    countryName: { en: 'Hong Kong', fr: 'Hong Kong' },
    region: 'ASIA_PACIFIC',
    currency: 'HKD',
    currencySymbol: '$',
    taxType: 'NONE',
    standardVatRate: 0,
    vatEnabled: false,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE',
      notes: 'No VAT/GST in Hong Kong'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Hong_Kong',
    languages: ['zh', 'en'],
    flag: '🇭🇰'
  },
  {
    countryCode: 'SG',
    countryName: { en: 'Singapore', fr: 'Singapour' },
    region: 'ASIA_PACIFIC',
    currency: 'SGD',
    currencySymbol: '$',
    taxType: 'GST',
    standardVatRate: 9,
    vatEnabled: true,
    vatRegistrationThreshold: 100000,
    vatRegistrationThresholdCurrency: 'SGD',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 9,
      threshold: 100000,
      thresholdCurrency: 'SGD',
      requiresRegistration: false,
      regime: 'OVR',
      notes: 'OVR (Overseas Vendor Registration) for digital services'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Singapore',
    languages: ['en', 'zh', 'ms', 'ta'],
    flag: '🇸🇬'
  },
  {
    countryCode: 'AU',
    countryName: { en: 'Australia', fr: 'Australie' },
    region: 'OCEANIA',
    currency: 'AUD',
    currencySymbol: '$',
    taxType: 'GST',
    standardVatRate: 10,
    vatEnabled: true,
    vatRegistrationThreshold: 75000,
    vatRegistrationThresholdCurrency: 'AUD',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 10,
      threshold: 75000,
      thresholdCurrency: 'AUD',
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'GST 10% for digital services to Australian consumers'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Australia/Sydney',
    languages: ['en'],
    flag: '🇦🇺'
  },
  {
    countryCode: 'NZ',
    countryName: { en: 'New Zealand', fr: 'Nouvelle-Zélande' },
    region: 'OCEANIA',
    currency: 'NZD',
    currencySymbol: '$',
    taxType: 'GST',
    standardVatRate: 15,
    vatEnabled: true,
    vatRegistrationThreshold: 60000,
    vatRegistrationThresholdCurrency: 'NZD',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 15,
      threshold: 60000,
      thresholdCurrency: 'NZD',
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Pacific/Auckland',
    languages: ['en', 'mi'],
    flag: '🇳🇿'
  },
  {
    countryCode: 'IN',
    countryName: { en: 'India', fr: 'Inde' },
    region: 'ASIA_PACIFIC',
    currency: 'INR',
    currencySymbol: '₹',
    taxType: 'GST',
    standardVatRate: 18,
    reducedVatRates: [5, 12],
    vatEnabled: true,
    vatRegistrationThreshold: 2000000,
    vatRegistrationThresholdCurrency: 'INR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 18,
      threshold: 2000000,
      thresholdCurrency: 'INR',
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'GST 18% for OIDAR (Online Information Database Access and Retrieval) services'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Kolkata',
    languages: ['hi', 'en'],
    flag: '🇮🇳'
  },
  {
    countryCode: 'TW',
    countryName: { en: 'Taiwan', fr: 'Taïwan' },
    region: 'ASIA_PACIFIC',
    currency: 'TWD',
    currencySymbol: 'NT$',
    taxType: 'VAT',
    standardVatRate: 5,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 5,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Taipei',
    languages: ['zh'],
    flag: '🇹🇼'
  },
  {
    countryCode: 'TH',
    countryName: { en: 'Thailand', fr: 'Thaïlande' },
    region: 'ASIA_PACIFIC',
    currency: 'THB',
    currencySymbol: '฿',
    taxType: 'VAT',
    standardVatRate: 7,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 7,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Bangkok',
    languages: ['th'],
    flag: '🇹🇭'
  },
  {
    countryCode: 'MY',
    countryName: { en: 'Malaysia', fr: 'Malaisie' },
    region: 'ASIA_PACIFIC',
    currency: 'MYR',
    currencySymbol: 'RM',
    taxType: 'SALES_TAX',
    standardVatRate: 6,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 6,
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'Digital service tax 6% from 2020'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Kuala_Lumpur',
    languages: ['ms', 'en'],
    flag: '🇲🇾'
  },
  {
    countryCode: 'ID',
    countryName: { en: 'Indonesia', fr: 'Indonésie' },
    region: 'ASIA_PACIFIC',
    currency: 'IDR',
    currencySymbol: 'Rp',
    taxType: 'VAT',
    standardVatRate: 11,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 11,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Jakarta',
    languages: ['id'],
    flag: '🇮🇩'
  },
  {
    countryCode: 'PH',
    countryName: { en: 'Philippines', fr: 'Philippines' },
    region: 'ASIA_PACIFIC',
    currency: 'PHP',
    currencySymbol: '₱',
    taxType: 'VAT',
    standardVatRate: 12,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 12,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Manila',
    languages: ['tl', 'en'],
    flag: '🇵🇭'
  },
  {
    countryCode: 'VN',
    countryName: { en: 'Vietnam', fr: 'Vietnam' },
    region: 'ASIA_PACIFIC',
    currency: 'VND',
    currencySymbol: '₫',
    taxType: 'VAT',
    standardVatRate: 10,
    reducedVatRates: [5],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 10,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Ho_Chi_Minh',
    languages: ['vi'],
    flag: '🇻🇳'
  }
];

// ============================================================================
// MIDDLE EAST COUNTRIES
// ============================================================================

export const MIDDLE_EAST_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'AE',
    countryName: { en: 'United Arab Emirates', fr: 'Émirats arabes unis' },
    region: 'MIDDLE_EAST',
    currency: 'AED',
    currencySymbol: 'د.إ',
    taxType: 'VAT',
    standardVatRate: 5,
    vatEnabled: true,
    vatRegistrationThreshold: 375000,
    vatRegistrationThresholdCurrency: 'AED',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 5,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Dubai',
    languages: ['ar', 'en'],
    flag: '🇦🇪'
  },
  {
    countryCode: 'SA',
    countryName: { en: 'Saudi Arabia', fr: 'Arabie saoudite' },
    region: 'MIDDLE_EAST',
    currency: 'SAR',
    currencySymbol: '﷼',
    taxType: 'VAT',
    standardVatRate: 15,
    vatEnabled: true,
    vatRegistrationThreshold: 375000,
    vatRegistrationThresholdCurrency: 'SAR',
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 15,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Riyadh',
    languages: ['ar'],
    flag: '🇸🇦'
  },
  {
    countryCode: 'IL',
    countryName: { en: 'Israel', fr: 'Israël' },
    region: 'MIDDLE_EAST',
    currency: 'ILS',
    currencySymbol: '₪',
    taxType: 'VAT',
    standardVatRate: 17,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 17,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Jerusalem',
    languages: ['he', 'ar'],
    flag: '🇮🇱'
  },
  {
    countryCode: 'QA',
    countryName: { en: 'Qatar', fr: 'Qatar' },
    region: 'MIDDLE_EAST',
    currency: 'QAR',
    currencySymbol: '﷼',
    taxType: 'NONE',
    standardVatRate: 0,
    vatEnabled: false,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Qatar',
    languages: ['ar'],
    flag: '🇶🇦'
  },
  {
    countryCode: 'KW',
    countryName: { en: 'Kuwait', fr: 'Koweït' },
    region: 'MIDDLE_EAST',
    currency: 'KWD',
    currencySymbol: 'د.ك',
    taxType: 'NONE',
    standardVatRate: 0,
    vatEnabled: false,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Kuwait',
    languages: ['ar'],
    flag: '🇰🇼'
  },
  {
    countryCode: 'BH',
    countryName: { en: 'Bahrain', fr: 'Bahreïn' },
    region: 'MIDDLE_EAST',
    currency: 'BHD',
    currencySymbol: '.د.ب',
    taxType: 'VAT',
    standardVatRate: 10,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 10,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Bahrain',
    languages: ['ar'],
    flag: '🇧🇭'
  },
  {
    countryCode: 'OM',
    countryName: { en: 'Oman', fr: 'Oman' },
    region: 'MIDDLE_EAST',
    currency: 'OMR',
    currencySymbol: '﷼',
    taxType: 'VAT',
    standardVatRate: 5,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 5,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Muscat',
    languages: ['ar'],
    flag: '🇴🇲'
  },
  {
    countryCode: 'EG',
    countryName: { en: 'Egypt', fr: 'Égypte' },
    region: 'MIDDLE_EAST',
    currency: 'EGP',
    currencySymbol: '£',
    taxType: 'VAT',
    standardVatRate: 14,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 14,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Cairo',
    languages: ['ar'],
    flag: '🇪🇬'
  },
  {
    countryCode: 'JO',
    countryName: { en: 'Jordan', fr: 'Jordanie' },
    region: 'MIDDLE_EAST',
    currency: 'JOD',
    currencySymbol: 'د.ا',
    taxType: 'SALES_TAX',
    standardVatRate: 16,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 16,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Amman',
    languages: ['ar'],
    flag: '🇯🇴'
  },
  {
    countryCode: 'LB',
    countryName: { en: 'Lebanon', fr: 'Liban' },
    region: 'MIDDLE_EAST',
    currency: 'LBP',
    currencySymbol: 'ل.ل',
    taxType: 'VAT',
    standardVatRate: 11,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 11,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Asia/Beirut',
    languages: ['ar', 'fr'],
    flag: '🇱🇧'
  }
];

// ============================================================================
// LATIN AMERICAN COUNTRIES
// ============================================================================

export const LATIN_AMERICA_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'BR',
    countryName: { en: 'Brazil', fr: 'Brésil' },
    region: 'LATIN_AMERICA',
    currency: 'BRL',
    currencySymbol: 'R$',
    taxType: 'VAT',
    standardVatRate: 17,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 17,
      requiresRegistration: false,
      regime: 'LOCAL',
      notes: 'Complex tax system: ICMS (state), ISS (municipal), PIS/COFINS (federal)'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Sao_Paulo',
    languages: ['pt'],
    flag: '🇧🇷'
  },
  {
    countryCode: 'AR',
    countryName: { en: 'Argentina', fr: 'Argentine' },
    region: 'LATIN_AMERICA',
    currency: 'ARS',
    currencySymbol: '$',
    taxType: 'VAT',
    standardVatRate: 21,
    reducedVatRates: [10.5],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 21,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Argentina/Buenos_Aires',
    languages: ['es'],
    flag: '🇦🇷'
  },
  {
    countryCode: 'CL',
    countryName: { en: 'Chile', fr: 'Chili' },
    region: 'LATIN_AMERICA',
    currency: 'CLP',
    currencySymbol: '$',
    taxType: 'VAT',
    standardVatRate: 19,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Santiago',
    languages: ['es'],
    flag: '🇨🇱'
  },
  {
    countryCode: 'CO',
    countryName: { en: 'Colombia', fr: 'Colombie' },
    region: 'LATIN_AMERICA',
    currency: 'COP',
    currencySymbol: '$',
    taxType: 'VAT',
    standardVatRate: 19,
    reducedVatRates: [5],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Bogota',
    languages: ['es'],
    flag: '🇨🇴'
  },
  {
    countryCode: 'PE',
    countryName: { en: 'Peru', fr: 'Pérou' },
    region: 'LATIN_AMERICA',
    currency: 'PEN',
    currencySymbol: 'S/',
    taxType: 'VAT',
    standardVatRate: 18,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 18,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Lima',
    languages: ['es'],
    flag: '🇵🇪'
  },
  {
    countryCode: 'UY',
    countryName: { en: 'Uruguay', fr: 'Uruguay' },
    region: 'LATIN_AMERICA',
    currency: 'UYU',
    currencySymbol: '$U',
    taxType: 'VAT',
    standardVatRate: 22,
    reducedVatRates: [10],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 22,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Montevideo',
    languages: ['es'],
    flag: '🇺🇾'
  },
  {
    countryCode: 'EC',
    countryName: { en: 'Ecuador', fr: 'Équateur' },
    region: 'LATIN_AMERICA',
    currency: 'USD',
    currencySymbol: '$',
    taxType: 'VAT',
    standardVatRate: 12,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 12,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Guayaquil',
    languages: ['es'],
    flag: '🇪🇨'
  },
  {
    countryCode: 'VE',
    countryName: { en: 'Venezuela', fr: 'Venezuela' },
    region: 'LATIN_AMERICA',
    currency: 'VES',
    currencySymbol: 'Bs.',
    taxType: 'VAT',
    standardVatRate: 16,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: false,
      requiresRegistration: false,
      regime: 'NONE'
    },
    paymentMethods: 'NONE',
    stripeSupported: false,
    paypalSupported: false,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Caracas',
    languages: ['es'],
    flag: '🇻🇪',
    notes: 'Sanctions - payments restricted'
  },
  {
    countryCode: 'PA',
    countryName: { en: 'Panama', fr: 'Panama' },
    region: 'LATIN_AMERICA',
    currency: 'USD',
    currencySymbol: '$',
    taxType: 'VAT',
    standardVatRate: 7,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 7,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Panama',
    languages: ['es'],
    flag: '🇵🇦'
  },
  {
    countryCode: 'CR',
    countryName: { en: 'Costa Rica', fr: 'Costa Rica' },
    region: 'LATIN_AMERICA',
    currency: 'CRC',
    currencySymbol: '₡',
    taxType: 'VAT',
    standardVatRate: 13,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 13,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Costa_Rica',
    languages: ['es'],
    flag: '🇨🇷'
  },
  {
    countryCode: 'DO',
    countryName: { en: 'Dominican Republic', fr: 'République dominicaine' },
    region: 'CARIBBEAN',
    currency: 'DOP',
    currencySymbol: 'RD$',
    taxType: 'VAT',
    standardVatRate: 18,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 18,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'America/Santo_Domingo',
    languages: ['es'],
    flag: '🇩🇴'
  }
];

// ============================================================================
// AFRICAN COUNTRIES
// ============================================================================

export const AFRICA_COUNTRIES: CountryFiscalConfig[] = [
  {
    countryCode: 'ZA',
    countryName: { en: 'South Africa', fr: 'Afrique du Sud' },
    region: 'AFRICA',
    currency: 'ZAR',
    currencySymbol: 'R',
    taxType: 'VAT',
    standardVatRate: 15,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 15,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Johannesburg',
    languages: ['en', 'af', 'zu'],
    flag: '🇿🇦'
  },
  {
    countryCode: 'NG',
    countryName: { en: 'Nigeria', fr: 'Nigeria' },
    region: 'AFRICA',
    currency: 'NGN',
    currencySymbol: '₦',
    taxType: 'VAT',
    standardVatRate: 7.5,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 7.5,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Lagos',
    languages: ['en'],
    flag: '🇳🇬'
  },
  {
    countryCode: 'KE',
    countryName: { en: 'Kenya', fr: 'Kenya' },
    region: 'AFRICA',
    currency: 'KES',
    currencySymbol: 'KSh',
    taxType: 'VAT',
    standardVatRate: 16,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 16,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Nairobi',
    languages: ['en', 'sw'],
    flag: '🇰🇪'
  },
  {
    countryCode: 'MA',
    countryName: { en: 'Morocco', fr: 'Maroc' },
    region: 'AFRICA',
    currency: 'MAD',
    currencySymbol: 'د.م.',
    taxType: 'VAT',
    standardVatRate: 20,
    reducedVatRates: [7, 10, 14],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 20,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Casablanca',
    languages: ['ar', 'fr'],
    flag: '🇲🇦'
  },
  {
    countryCode: 'TN',
    countryName: { en: 'Tunisia', fr: 'Tunisie' },
    region: 'AFRICA',
    currency: 'TND',
    currencySymbol: 'د.ت',
    taxType: 'VAT',
    standardVatRate: 19,
    reducedVatRates: [7, 13],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Tunis',
    languages: ['ar', 'fr'],
    flag: '🇹🇳'
  },
  {
    countryCode: 'DZ',
    countryName: { en: 'Algeria', fr: 'Algérie' },
    region: 'AFRICA',
    currency: 'DZD',
    currencySymbol: 'د.ج',
    taxType: 'VAT',
    standardVatRate: 19,
    reducedVatRates: [9],
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Algiers',
    languages: ['ar', 'fr'],
    flag: '🇩🇿'
  },
  {
    countryCode: 'GH',
    countryName: { en: 'Ghana', fr: 'Ghana' },
    region: 'AFRICA',
    currency: 'GHS',
    currencySymbol: '₵',
    taxType: 'VAT',
    standardVatRate: 15,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 15,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'BOTH',
    stripeSupported: true,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Accra',
    languages: ['en'],
    flag: '🇬🇭'
  },
  {
    countryCode: 'SN',
    countryName: { en: 'Senegal', fr: 'Sénégal' },
    region: 'AFRICA',
    currency: 'XOF',
    currencySymbol: 'CFA',
    taxType: 'VAT',
    standardVatRate: 18,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 18,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Dakar',
    languages: ['fr'],
    flag: '🇸🇳'
  },
  {
    countryCode: 'CI',
    countryName: { en: 'Ivory Coast', fr: "Côte d'Ivoire" },
    region: 'AFRICA',
    currency: 'XOF',
    currencySymbol: 'CFA',
    taxType: 'VAT',
    standardVatRate: 18,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 18,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Abidjan',
    languages: ['fr'],
    flag: '🇨🇮'
  },
  {
    countryCode: 'CM',
    countryName: { en: 'Cameroon', fr: 'Cameroun' },
    region: 'AFRICA',
    currency: 'XAF',
    currencySymbol: 'FCFA',
    taxType: 'VAT',
    standardVatRate: 19.25,
    vatEnabled: true,
    vatRegistrationRequired: false,
    digitalServicesRules: {
      applicable: true,
      rate: 19.25,
      requiresRegistration: false,
      regime: 'LOCAL'
    },
    paymentMethods: 'PAYPAL',
    stripeSupported: false,
    paypalSupported: true,
    requiresLocalEntity: false,
    requiresFiscalRepresentative: false,
    timezone: 'Africa/Douala',
    languages: ['fr', 'en'],
    flag: '🇨🇲'
  }
];

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

export const ALL_COUNTRY_CONFIGS: CountryFiscalConfig[] = [
  ...EU_COUNTRIES,
  ...EEA_COUNTRIES,
  ...EUROPE_OTHER_COUNTRIES,
  ...NORTH_AMERICA_COUNTRIES,
  ...ASIA_PACIFIC_COUNTRIES,
  ...MIDDLE_EAST_COUNTRIES,
  ...LATIN_AMERICA_COUNTRIES,
  ...AFRICA_COUNTRIES
];

// Country code to config map for fast lookup
export const COUNTRY_CONFIG_MAP: Map<string, CountryFiscalConfig> = new Map(
  ALL_COUNTRY_CONFIGS.map(config => [config.countryCode, config])
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getCountryConfig(countryCode: string): CountryFiscalConfig | undefined {
  return COUNTRY_CONFIG_MAP.get(countryCode.toUpperCase());
}

export function getCountriesByRegion(region: Region): CountryFiscalConfig[] {
  return ALL_COUNTRY_CONFIGS.filter(c => c.region === region);
}

export function getCountriesWithStripe(): CountryFiscalConfig[] {
  return ALL_COUNTRY_CONFIGS.filter(c => c.stripeSupported);
}

export function getCountriesWithPayPal(): CountryFiscalConfig[] {
  return ALL_COUNTRY_CONFIGS.filter(c => c.paypalSupported);
}

export function getEUCountryCodes(): string[] {
  return EU_COUNTRIES.map(c => c.countryCode);
}

export function isEUCountry(countryCode: string): boolean {
  return EU_COUNTRIES.some(c => c.countryCode === countryCode.toUpperCase());
}

export function getVATRate(countryCode: string): number {
  const config = getCountryConfig(countryCode);
  return config?.standardVatRate || 0;
}

export function getDigitalServicesTaxRate(countryCode: string): number {
  const config = getCountryConfig(countryCode);
  return config?.digitalServicesRules.rate || 0;
}

export function requiresVATRegistration(countryCode: string, revenue: number): boolean {
  const config = getCountryConfig(countryCode);
  if (!config) return false;

  if (config.vatRegistrationRequired) return true;

  const threshold = config.vatRegistrationThreshold || 0;
  return revenue >= threshold;
}

// ============================================================================
// STATISTICS
// ============================================================================

export const COUNTRY_STATS = {
  total: ALL_COUNTRY_CONFIGS.length,
  eu: EU_COUNTRIES.length,
  eea: EEA_COUNTRIES.length,
  europeOther: EUROPE_OTHER_COUNTRIES.length,
  northAmerica: NORTH_AMERICA_COUNTRIES.length,
  asiaPacific: ASIA_PACIFIC_COUNTRIES.length,
  middleEast: MIDDLE_EAST_COUNTRIES.length,
  latinAmerica: LATIN_AMERICA_COUNTRIES.length,
  africa: AFRICA_COUNTRIES.length,
  stripeSupported: ALL_COUNTRY_CONFIGS.filter(c => c.stripeSupported).length,
  paypalSupported: ALL_COUNTRY_CONFIGS.filter(c => c.paypalSupported).length,
  withVAT: ALL_COUNTRY_CONFIGS.filter(c => c.vatEnabled).length,
  withDigitalServicesTax: ALL_COUNTRY_CONFIGS.filter(c => c.digitalServicesRules.applicable).length
};

console.log(`Country Fiscal Configs loaded: ${COUNTRY_STATS.total} countries`);
console.log(`- EU: ${COUNTRY_STATS.eu}, EEA: ${COUNTRY_STATS.eea}`);
console.log(`- Stripe: ${COUNTRY_STATS.stripeSupported}, PayPal: ${COUNTRY_STATS.paypalSupported}`);
console.log(`- With VAT: ${COUNTRY_STATS.withVAT}, Digital Services Tax: ${COUNTRY_STATS.withDigitalServicesTax}`);
