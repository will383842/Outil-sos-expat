/**
 * Threshold Tracking Types
 * Types for international tax threshold monitoring system
 * @module types/thresholds
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ENUMS AND TYPE ALIASES
// ============================================================================

/**
 * Period type for threshold calculation
 */
export type ThresholdPeriodType = 'CALENDAR_YEAR' | 'ROLLING_12M' | 'QUARTER';

/**
 * Status of a threshold tracking
 */
export type ThresholdStatus = 'SAFE' | 'WARNING_70' | 'WARNING_90' | 'EXCEEDED' | 'REGISTERED';

/**
 * Supported currencies for threshold tracking
 */
export type ThresholdCurrency =
  | 'EUR'
  | 'GBP'
  | 'CHF'
  | 'AUD'
  | 'JPY'
  | 'SGD'
  | 'INR'
  | 'CAD'
  | 'KRW'
  | 'MXN'
  | 'USD';

/**
 * Customer type for B2C/B2B distinction
 */
export type CustomerType = 'B2C' | 'B2B';

/**
 * Alert type for threshold notifications
 */
export type ThresholdAlertType = 'WARNING_70' | 'WARNING_90' | 'EXCEEDED';

// ============================================================================
// MAIN INTERFACES
// ============================================================================

/**
 * Alerts sent tracking
 */
export interface AlertsSent {
  alert70: boolean;
  alert90: boolean;
  alert100: boolean;
  alert70SentAt?: Date;
  alert90SentAt?: Date;
  alert100SentAt?: Date;
}

/**
 * Threshold Tracking document stored in Firestore
 * Collection: threshold_tracking/{countryCode}
 */
export interface ThresholdTracking {
  /** ISO country/zone code (e.g., "OSS_EU", "UK", "CH") */
  countryCode: string;

  /** Display name of the country/zone */
  countryName: string;

  /** Period identifier (e.g., "2024", "2024-Q1", "rolling") */
  period: string;

  /** Type of period calculation */
  periodType: ThresholdPeriodType;

  // === Amounts ===

  /** Threshold amount in local currency */
  thresholdAmount: number;

  /** Currency of the threshold */
  thresholdCurrency: ThresholdCurrency;

  /** Current accumulated amount in local currency */
  currentAmount: number;

  /** Current amount converted to EUR for reporting */
  currentAmountEUR: number;

  // === Transaction Statistics ===

  /** Total number of transactions */
  transactionCount: number;

  /** Number of B2C transactions */
  b2cCount: number;

  /** Number of B2B transactions */
  b2bCount: number;

  // === Status ===

  /** Percentage of threshold used (0-100+) */
  percentageUsed: number;

  /** Current status based on percentage */
  status: ThresholdStatus;

  /** Whether we are registered for tax in this jurisdiction */
  isRegistered: boolean;

  /** Tax registration number if registered */
  registrationNumber?: string;

  /** Date of registration if registered */
  registrationDate?: Date;

  // === Alerts ===

  /** Tracking of which alerts have been sent */
  alertsSent: AlertsSent;

  // === Timestamps ===

  /** Timestamp of last transaction that affected this tracking */
  lastTransactionAt?: Date;

  /** Timestamp of last alert sent */
  lastAlertAt?: Date;

  /** Document creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Threshold configuration for a country/zone
 * Static configuration defining threshold rules
 */
export interface ThresholdConfig {
  /** ISO country/zone code */
  countryCode: string;

  /** Display name */
  name: string;

  /** Threshold amount */
  thresholdAmount: number;

  /** Currency */
  currency: ThresholdCurrency;

  /** Period type for calculation */
  periodType: ThresholdPeriodType;

  /** Consequence when threshold is exceeded */
  consequence: string;

  /** Whether this applies only to B2C transactions */
  b2cOnly: boolean;

  /** Flag emoji for display */
  flag: string;

  /** Notes or special rules */
  notes?: string;

  /** Whether to enable automatic blocking when exceeded */
  enableBlocking: boolean;

  /** URL to registration portal (if available) */
  registrationUrl?: string;
}

/**
 * Threshold alert record
 * Collection: threshold_alerts/{alertId}
 */
export interface ThresholdAlert {
  /** Alert document ID */
  id: string;

  /** Country/zone code this alert is for */
  countryCode: string;

  /** Type of alert */
  alertType: ThresholdAlertType;

  /** Percentage at time of alert */
  percentageAtAlert: number;

  /** Amount at time of alert in local currency */
  amountAtAlert: number;

  /** Threshold amount */
  thresholdAmount: number;

  /** Currency */
  currency: ThresholdCurrency;

  /** Whether notification was sent to dashboard */
  notificationSent: boolean;

  /** Whether email was sent */
  emailSent: boolean;

  /** Recipients of email */
  emailRecipients?: string[];

  /** Whether any blocking action was taken */
  blockingApplied: boolean;

  /** Alert creation timestamp */
  createdAt: Date;

  /** User who acknowledged the alert (if any) */
  acknowledgedBy?: string;

  /** Acknowledgement timestamp */
  acknowledgedAt?: Date;

  /** Notes added during acknowledgement */
  acknowledgeNotes?: string;
}

/**
 * Transaction data for threshold calculation
 */
export interface ThresholdTransaction {
  /** Transaction/payment ID */
  transactionId: string;

  /** Amount in original currency */
  amount: number;

  /** Original currency */
  currency: string;

  /** Amount converted to threshold currency */
  amountInThresholdCurrency: number;

  /** Customer country */
  customerCountry: string;

  /** Customer type */
  customerType: CustomerType;

  /** Transaction date */
  transactionDate: Date;

  /** Whether customer has valid VAT number (for B2B) */
  hasVatNumber: boolean;

  /** VAT number if B2B */
  vatNumber?: string;
}

// ============================================================================
// FIRESTORE DOCUMENT TYPES (with Timestamp)
// ============================================================================

/**
 * Firestore document type for ThresholdTracking
 */
export interface ThresholdTrackingDoc {
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
  alertsSent: {
    alert70: boolean;
    alert90: boolean;
    alert100: boolean;
    alert70SentAt?: Timestamp;
    alert90SentAt?: Timestamp;
    alert100SentAt?: Timestamp;
  };
  lastTransactionAt?: Timestamp;
  lastAlertAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Firestore document type for ThresholdAlert
 */
export interface ThresholdAlertDoc {
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

// ============================================================================
// API/SERVICE TYPES
// ============================================================================

/**
 * Parameters for updating threshold tracking
 */
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

/**
 * Result of threshold check
 */
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

/**
 * Dashboard summary for all thresholds
 */
export interface ThresholdDashboardSummary {
  /** Total number of tracked thresholds */
  totalTracked: number;

  /** Number of thresholds in safe status */
  safeCount: number;

  /** Number of thresholds at warning level */
  warningCount: number;

  /** Number of thresholds exceeded */
  exceededCount: number;

  /** Number of registered jurisdictions */
  registeredCount: number;

  /** Thresholds requiring immediate attention */
  criticalThresholds: ThresholdTracking[];

  /** Recent alerts (last 30 days) */
  recentAlerts: ThresholdAlert[];

  /** Total revenue across all jurisdictions in EUR */
  totalRevenueEUR: number;
}

/**
 * Filters for threshold dashboard
 */
export interface ThresholdFilters {
  status?: ThresholdStatus | 'all';
  region?: 'EU' | 'APAC' | 'AMERICAS' | 'OTHER' | 'all';
  periodType?: ThresholdPeriodType | 'all';
  search?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default threshold configurations for all monitored countries/zones
 */
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

/**
 * US States with Sales Tax nexus thresholds (simplified)
 * Full implementation would include all 45+ states
 */
export const US_STATE_THRESHOLDS: Array<{
  stateCode: string;
  stateName: string;
  threshold: number;
  transactionThreshold?: number;
}> = [
  { stateCode: 'CA', stateName: 'California', threshold: 500000 },
  { stateCode: 'TX', stateName: 'Texas', threshold: 500000 },
  { stateCode: 'NY', stateName: 'New York', threshold: 500000, transactionThreshold: 100 },
  { stateCode: 'FL', stateName: 'Florida', threshold: 100000 },
  { stateCode: 'WA', stateName: 'Washington', threshold: 100000 },
  // Add more states as needed
];

/**
 * Currency exchange rates to EUR (approximate - should be updated regularly)
 * In production, use a real-time exchange rate API
 */
export const EXCHANGE_RATES_TO_EUR: Record<ThresholdCurrency, number> = {
  EUR: 1,
  GBP: 1.17,
  CHF: 1.05,
  AUD: 0.61,
  JPY: 0.0067,
  SGD: 0.69,
  INR: 0.011,
  CAD: 0.68,
  KRW: 0.00069,
  MXN: 0.054,
  USD: 0.92
};

/**
 * Alert thresholds in percentages
 */
export const ALERT_THRESHOLDS = {
  WARNING_70: 70,
  WARNING_90: 90,
  EXCEEDED: 100
} as const;

/**
 * Status labels for UI
 */
export const THRESHOLD_STATUS_LABELS: Record<ThresholdStatus, string> = {
  SAFE: 'En securite',
  WARNING_70: 'Attention (70%)',
  WARNING_90: 'Critique (90%)',
  EXCEEDED: 'Depasse',
  REGISTERED: 'Enregistre'
};

/**
 * Status colors for UI
 */
export const THRESHOLD_STATUS_COLORS: Record<ThresholdStatus, string> = {
  SAFE: 'bg-green-100 text-green-800',
  WARNING_70: 'bg-yellow-100 text-yellow-800',
  WARNING_90: 'bg-orange-100 text-orange-800',
  EXCEEDED: 'bg-red-100 text-red-800',
  REGISTERED: 'bg-blue-100 text-blue-800'
};

/**
 * Region mapping for filtering
 */
export const COUNTRY_REGIONS: Record<string, 'EU' | 'APAC' | 'AMERICAS' | 'OTHER'> = {
  OSS_EU: 'EU',
  GB: 'EU',
  CH: 'EU',
  AU: 'APAC',
  JP: 'APAC',
  SG: 'APAC',
  IN: 'APAC',
  KR: 'APAC',
  CA: 'AMERICAS',
  MX: 'AMERICAS',
  US: 'AMERICAS'
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isThresholdStatus(value: string): value is ThresholdStatus {
  return ['SAFE', 'WARNING_70', 'WARNING_90', 'EXCEEDED', 'REGISTERED'].includes(value);
}

export function isThresholdCurrency(value: string): value is ThresholdCurrency {
  return ['EUR', 'GBP', 'CHF', 'AUD', 'JPY', 'SGD', 'INR', 'CAD', 'KRW', 'MXN', 'USD'].includes(value);
}

export function isThresholdPeriodType(value: string): value is ThresholdPeriodType {
  return ['CALENDAR_YEAR', 'ROLLING_12M', 'QUARTER'].includes(value);
}

export function isThresholdAlertType(value: string): value is ThresholdAlertType {
  return ['WARNING_70', 'WARNING_90', 'EXCEEDED'].includes(value);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert amount from one currency to another using exchange rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: ThresholdCurrency,
  toCurrency: ThresholdCurrency
): number {
  if (fromCurrency === toCurrency) return amount;

  // Convert to EUR first, then to target currency
  const amountInEUR = amount * EXCHANGE_RATES_TO_EUR[fromCurrency];
  return amountInEUR / EXCHANGE_RATES_TO_EUR[toCurrency];
}

/**
 * Calculate status based on percentage
 */
export function calculateStatus(percentage: number, isRegistered: boolean): ThresholdStatus {
  if (isRegistered) return 'REGISTERED';
  if (percentage >= 100) return 'EXCEEDED';
  if (percentage >= 90) return 'WARNING_90';
  if (percentage >= 70) return 'WARNING_70';
  return 'SAFE';
}

/**
 * Get current period string based on period type
 */
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

/**
 * Format currency with proper symbol and locale
 */
export function formatThresholdCurrency(
  amount: number,
  currency: ThresholdCurrency
): string {
  const locales: Record<ThresholdCurrency, string> = {
    EUR: 'fr-FR',
    GBP: 'en-GB',
    CHF: 'de-CH',
    AUD: 'en-AU',
    JPY: 'ja-JP',
    SGD: 'en-SG',
    INR: 'en-IN',
    CAD: 'en-CA',
    KRW: 'ko-KR',
    MXN: 'es-MX',
    USD: 'en-US'
  };

  return new Intl.NumberFormat(locales[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2
  }).format(amount);
}

/**
 * Get threshold config by country code
 */
export function getThresholdConfig(countryCode: string): ThresholdConfig | undefined {
  return THRESHOLD_CONFIGS.find(c => c.countryCode === countryCode);
}
