/**
 * Threshold Tracking Types for Cloud Functions
 * Server-side types with Firebase Admin SDK Timestamp
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// ENUMS AND TYPE ALIASES
// ============================================================================

export type ThresholdPeriodType = 'CALENDAR_YEAR' | 'ROLLING_12M' | 'QUARTER';
export type ThresholdStatus = 'SAFE' | 'WARNING_70' | 'WARNING_90' | 'EXCEEDED' | 'REGISTERED';
export type ThresholdCurrency =
  | 'EUR' | 'GBP' | 'CHF' | 'AUD' | 'JPY' | 'SGD' | 'INR' | 'CAD' | 'KRW' | 'MXN' | 'USD'
  | 'NOK' | 'NZD' | 'SAR' | 'AED' | 'BRL' | 'CLP' | 'COP' | 'ARS' | 'IDR' | 'THB'
  | 'VND' | 'PHP' | 'MYR' | 'TRY' | 'ILS' | 'ZAR' | 'TWD' | 'HKD' | 'PLN' | 'SEK'
  | 'DKK' | 'CZK' | 'HUF' | 'RON' | 'BGN' | 'RUB' | 'UAH' | 'EGP' | 'NGN' | 'KES';
export type CustomerType = 'B2C' | 'B2B';
export type ThresholdAlertType = 'WARNING_70' | 'WARNING_90' | 'EXCEEDED';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AlertsSent {
  alert70: boolean;
  alert90: boolean;
  alert100: boolean;
  alert70SentAt?: Timestamp;
  alert90SentAt?: Timestamp;
  alert100SentAt?: Timestamp;
}

export interface ThresholdTracking {
  countryCode: string;
  countryName: string;
  period: string;
  periodType: ThresholdPeriodType;
  thresholdAmount: number;
  thresholdCurrency: ThresholdCurrency;
  currentAmount: number;
  currentAmountEUR: number;
  transactionCount: number;
  b2cCount: number;
  b2bCount: number;
  percentageUsed: number;
  status: ThresholdStatus;
  isRegistered: boolean;
  registrationNumber?: string;
  registrationDate?: Timestamp;
  alertsSent: AlertsSent;
  lastTransactionAt?: Timestamp;
  lastAlertAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ThresholdAlert {
  id?: string;
  countryCode: string;
  alertType: ThresholdAlertType;
  percentageAtAlert: number;
  amountAtAlert: number;
  thresholdAmount: number;
  currency: ThresholdCurrency;
  notificationSent: boolean;
  emailSent: boolean;
  emailRecipients?: string[];
  blockingApplied: boolean;
  createdAt: Timestamp;
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  acknowledgeNotes?: string;
}

export interface ThresholdConfig {
  countryCode: string;
  name: string;
  thresholdAmount: number;
  currency: ThresholdCurrency;
  periodType: ThresholdPeriodType;
  consequence: string;
  b2cOnly: boolean;
  flag: string;
  notes?: string;
  enableBlocking: boolean;
  registrationUrl?: string;
}

export interface UpdateThresholdParams {
  countryCode: string;
  amount: number;
  currency: string;
  customerCountry: string;
  customerType: CustomerType;
  transactionId: string;
  transactionDate: Date;
  hasVatNumber?: boolean;
  vatNumber?: string;
}

export interface ThresholdCheckResult {
  countryCode: string;
  previousStatus: ThresholdStatus;
  newStatus: ThresholdStatus;
  percentageUsed: number;
  alertTriggered: boolean;
  alertType?: ThresholdAlertType;
  shouldBlock: boolean;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const THRESHOLD_CONFIGS: ThresholdConfig[] = [
  {
    countryCode: 'OSS_EU',
    name: 'OSS EU (One Stop Shop)',
    thresholdAmount: 10000,
    currency: 'EUR',
    periodType: 'CALENDAR_YEAR',
    consequence: 'TVA pays client obligatoire',
    b2cOnly: true,
    flag: '🇪🇺',
    notes: 'Seuil commun pour toutes les ventes B2C intra-UE',
    enableBlocking: false,
    registrationUrl: 'https://ec.europa.eu/taxation_customs/business/vat/modernising-vat-cross-border-ecommerce_en'
  },
  {
    countryCode: 'GB',
    name: 'Royaume-Uni',
    thresholdAmount: 0,
    currency: 'GBP',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement UK VAT des 1ere vente',
    b2cOnly: false,
    flag: '🇬🇧',
    notes: 'Enregistrement obligatoire des la premiere vente depuis Brexit',
    enableBlocking: true,
    registrationUrl: 'https://www.gov.uk/vat-registration'
  },
  {
    countryCode: 'CH',
    name: 'Suisse',
    thresholdAmount: 100000,
    currency: 'CHF',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement TVA CH',
    b2cOnly: false,
    flag: '🇨🇭',
    notes: 'Seuil de CHF 100,000 de CA mondial depuis la Suisse',
    enableBlocking: false,
    registrationUrl: 'https://www.estv.admin.ch/'
  },
  {
    countryCode: 'AU',
    name: 'Australie',
    thresholdAmount: 75000,
    currency: 'AUD',
    periodType: 'ROLLING_12M',
    consequence: 'Enregistrement GST',
    b2cOnly: false,
    flag: '🇦🇺',
    notes: 'AUD 75,000 sur 12 mois glissants',
    enableBlocking: false,
    registrationUrl: 'https://www.ato.gov.au/Business/International-tax-for-business/In-detail/GST/'
  },
  {
    countryCode: 'JP',
    name: 'Japon',
    thresholdAmount: 10000000,
    currency: 'JPY',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement JCT',
    b2cOnly: false,
    flag: '🇯🇵',
    notes: 'Japanese Consumption Tax (JCT) a 10%',
    enableBlocking: false,
    registrationUrl: 'https://www.nta.go.jp/english/'
  },
  {
    countryCode: 'SG',
    name: 'Singapour',
    thresholdAmount: 100000,
    currency: 'SGD',
    periodType: 'ROLLING_12M',
    consequence: 'OVR Registration',
    b2cOnly: false,
    flag: '🇸🇬',
    notes: 'Overseas Vendor Registration (OVR) pour services digitaux',
    enableBlocking: false,
    registrationUrl: 'https://www.iras.gov.sg/'
  },
  {
    countryCode: 'IN',
    name: 'Inde',
    thresholdAmount: 2000000,
    currency: 'INR',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement GST',
    b2cOnly: false,
    flag: '🇮🇳',
    notes: 'GST applicable aux services digitaux fournis a des clients indiens',
    enableBlocking: false,
    registrationUrl: 'https://www.gst.gov.in/'
  },
  {
    countryCode: 'CA',
    name: 'Canada',
    thresholdAmount: 30000,
    currency: 'CAD',
    periodType: 'ROLLING_12M',
    consequence: 'Enregistrement GST/HST',
    b2cOnly: false,
    flag: '🇨🇦',
    notes: 'CAD 30,000 sur 4 trimestres consecutifs ou un seul trimestre',
    enableBlocking: false,
    registrationUrl: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html'
  },
  {
    countryCode: 'KR',
    name: 'Coree du Sud',
    thresholdAmount: 0,
    currency: 'KRW',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement des 1ere vente',
    b2cOnly: false,
    flag: '🇰🇷',
    notes: 'VAT 10% applicable des la premiere vente B2C',
    enableBlocking: true,
    registrationUrl: 'https://www.nts.go.kr/english/main.do'
  },
  {
    countryCode: 'MX',
    name: 'Mexique',
    thresholdAmount: 0,
    currency: 'MXN',
    periodType: 'CALENDAR_YEAR',
    consequence: 'IVA des 1ere vente B2C',
    b2cOnly: true,
    flag: '🇲🇽',
    notes: 'IVA 16% applicable des la premiere vente B2C',
    enableBlocking: true,
    registrationUrl: 'https://www.sat.gob.mx/'
  }
];

export const EXCHANGE_RATES_TO_EUR: Record<ThresholdCurrency, number> = {
  // Major currencies
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.05,
  JPY: 0.0067,
  CAD: 0.68,
  AUD: 0.61,
  NZD: 0.57,
  // Asia
  SGD: 0.69,
  HKD: 0.12,
  TWD: 0.029,
  KRW: 0.00069,
  INR: 0.011,
  IDR: 0.000059,
  THB: 0.026,
  VND: 0.000038,
  PHP: 0.016,
  MYR: 0.20,
  // Middle East
  SAR: 0.25,
  AED: 0.25,
  ILS: 0.25,
  TRY: 0.029,
  // Americas
  MXN: 0.054,
  BRL: 0.19,
  CLP: 0.0010,
  COP: 0.00023,
  ARS: 0.0011,
  // Europe (non-EUR)
  NOK: 0.086,
  SEK: 0.088,
  DKK: 0.13,
  PLN: 0.23,
  CZK: 0.040,
  HUF: 0.0026,
  RON: 0.20,
  BGN: 0.51,
  RUB: 0.010,
  UAH: 0.024,
  // Africa
  ZAR: 0.051,
  EGP: 0.019,
  NGN: 0.00059,
  KES: 0.0058,
};

export const ALERT_THRESHOLDS = {
  WARNING_70: 70,
  WARNING_90: 90,
  EXCEEDED: 100
} as const;

// EU country codes for OSS threshold
export const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

// Our company's country (France) - excluded from OSS
export const HOME_COUNTRY = 'FR';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: ThresholdCurrency
): number {
  const fromRate = EXCHANGE_RATES_TO_EUR[fromCurrency as ThresholdCurrency] || 1;
  const toRate = EXCHANGE_RATES_TO_EUR[toCurrency];

  // Convert to EUR first, then to target currency
  const amountInEUR = amount * fromRate;
  return amountInEUR / toRate;
}

export function convertToEUR(amount: number, fromCurrency: string): number {
  const rate = EXCHANGE_RATES_TO_EUR[fromCurrency as ThresholdCurrency] || 1;
  return amount * rate;
}

export function calculateStatus(percentage: number, isRegistered: boolean): ThresholdStatus {
  if (isRegistered) return 'REGISTERED';
  if (percentage >= 100) return 'EXCEEDED';
  if (percentage >= 90) return 'WARNING_90';
  if (percentage >= 70) return 'WARNING_70';
  return 'SAFE';
}

export function getCurrentPeriod(periodType: ThresholdPeriodType): string {
  const now = new Date();
  const year = now.getFullYear();

  switch (periodType) {
    case 'CALENDAR_YEAR':
      return year.toString();
    case 'ROLLING_12M':
      return 'rolling';
    case 'QUARTER':
      const quarter = Math.ceil((now.getMonth() + 1) / 3);
      return `${year}-Q${quarter}`;
  }
}

export function getThresholdConfig(countryCode: string): ThresholdConfig | undefined {
  return THRESHOLD_CONFIGS.find(c => c.countryCode === countryCode);
}

export function determineThresholdCountry(customerCountry: string): string | null {
  // Check if it's an EU country (for OSS threshold)
  if (EU_COUNTRY_CODES.includes(customerCountry) && customerCountry !== HOME_COUNTRY) {
    return 'OSS_EU';
  }

  // Check if we have a specific threshold for this country
  const config = THRESHOLD_CONFIGS.find(c => c.countryCode === customerCountry);
  if (config) {
    return customerCountry;
  }

  return null;
}
