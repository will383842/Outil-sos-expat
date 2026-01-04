/**
 * Tax Filing Types for SOS-Expat
 *
 * Types for managing tax declarations:
 * - VAT Estonia (Monthly)
 * - OSS EU (Quarterly)
 * - DES - European Declaration of Services (Monthly)
 * - UK VAT Return (Quarterly - if registered)
 * - CH VAT Return (Quarterly - if registered)
 *
 * Company: SOS-Expat OU, Estonia
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ENUMS AND TYPE ALIASES
// ============================================================================

/**
 * Types of tax filings supported
 */
export type TaxFilingType =
  | 'VAT_EE'    // Estonian VAT (Monthly)
  | 'OSS'       // One-Stop-Shop EU (Quarterly)
  | 'DES'       // Declaration Europeenne de Services (Monthly)
  | 'UK_VAT'    // UK VAT Return (Quarterly)
  | 'CH_VAT';   // Swiss VAT Return (Quarterly)

/**
 * Status of a tax filing
 */
export type TaxFilingStatus =
  | 'DRAFT'           // Initial state, being generated
  | 'PENDING_REVIEW'  // Ready for admin review
  | 'SUBMITTED'       // Submitted to tax authority
  | 'ACCEPTED'        // Accepted by tax authority
  | 'REJECTED'        // Rejected by tax authority
  | 'PAID';           // Tax payment completed

/**
 * Frequency of filing
 */
export type TaxFilingFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

/**
 * Customer type for VAT purposes
 */
export type CustomerType = 'B2C' | 'B2B';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Individual line item in a tax filing
 * Used for OSS (27 EU country lines) and other multi-line declarations
 */
export interface TaxFilingLine {
  /** ISO country code (e.g., 'FR', 'DE') */
  countryCode: string;
  /** Country name for display */
  countryName: string;
  /** VAT rate applied (percentage) */
  taxRate: number;
  /** Total taxable base amount (excluding VAT) */
  taxableBase: number;
  /** Total tax amount due */
  taxAmount: number;
  /** Number of transactions */
  transactionCount: number;
  /** Currency code */
  currency: string;
  /** Customer type (B2B or B2C) */
  customerType?: CustomerType;
  /** VAT number of customer (for B2B/DES) */
  customerVatNumber?: string;
}

/**
 * Summary of amounts for a tax filing
 */
export interface TaxFilingSummary {
  /** Total sales amount (gross) */
  totalSales: number;
  /** Total taxable base amount */
  totalTaxableBase: number;
  /** Total tax due */
  totalTaxDue: number;
  /** Total deductible VAT (input VAT) */
  totalTaxDeductible: number;
  /** Net tax payable (totalTaxDue - totalTaxDeductible) */
  netTaxPayable: number;
  /** Currency for all amounts */
  currency: string;
}

/**
 * Generated file references
 */
export interface TaxFilingFiles {
  /** PDF summary document URL */
  pdf?: string;
  /** CSV export URL */
  csv?: string;
  /** XML declaration file URL */
  xml?: string;
  /** Excel export URL */
  xlsx?: string;
}

/**
 * Reminder tracking
 */
export interface TaxFilingReminders {
  /** 30 days before deadline */
  sent30Days: boolean;
  /** 7 days before deadline */
  sent7Days: boolean;
  /** 1 day before deadline */
  sent1Day: boolean;
  /** Day of deadline */
  sentDueDay?: boolean;
  /** Overdue reminder */
  sentOverdue?: boolean;
}

/**
 * Main Tax Filing document
 * Collection: tax_filings/{filingId}
 */
export interface TaxFiling {
  /** Document ID */
  id: string;

  /** Type of tax filing */
  type: TaxFilingType;

  /** Period identifier (e.g., "2024-01" for monthly, "2024-Q1" for quarterly) */
  period: string;

  /** Start of the filing period */
  periodStart: Timestamp;

  /** End of the filing period */
  periodEnd: Timestamp;

  /** Filing frequency */
  frequency: TaxFilingFrequency;

  // === DEADLINES ===

  /** Official due date for submission */
  dueDate: Timestamp;

  /** Submission deadline (may differ from due date) */
  submissionDeadline: Timestamp;

  /** Payment deadline */
  paymentDeadline: Timestamp;

  // === STATUS ===

  /** Current status of the filing */
  status: TaxFilingStatus;

  /** Status history for audit trail */
  statusHistory?: Array<{
    status: TaxFilingStatus;
    changedAt: Timestamp;
    changedBy: string;
    reason?: string;
  }>;

  // === AMOUNTS ===

  /** Summary of all amounts */
  summary: TaxFilingSummary;

  /** Line items (for OSS: 27 EU country lines) */
  lines: TaxFilingLine[];

  // === FILES ===

  /** Generated file URLs */
  generatedFiles: TaxFilingFiles;

  // === SUBMISSION DETAILS ===

  /** When the filing was submitted */
  submittedAt?: Timestamp;

  /** Who submitted the filing */
  submittedBy?: string;

  /** Confirmation number from tax authority */
  confirmationNumber?: string;

  /** Reference number for payment */
  paymentReference?: string;

  /** When payment was made */
  paidAt?: Timestamp;

  /** Payment confirmation/transaction ID */
  paymentConfirmation?: string;

  // === REMINDERS ===

  /** Reminder tracking */
  reminders: TaxFilingReminders;

  // === METADATA ===

  /** Notes from admin */
  notes?: string;

  /** Any rejection reason from tax authority */
  rejectionReason?: string;

  /** Source transaction IDs included in this filing */
  transactionIds?: string[];

  /** Created timestamp */
  createdAt: Timestamp;

  /** Last updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin user ID) */
  createdBy?: string;

  /** Last updated by (admin user ID) */
  updatedBy?: string;
}

/**
 * Tax Filing configuration per type
 * Collection: tax_filing_configs/{type}
 */
export interface TaxFilingConfig {
  /** Filing type */
  type: TaxFilingType;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Is this filing type active/required */
  isActive: boolean;

  /** Filing frequency */
  frequency: TaxFilingFrequency;

  /** Days after period end for due date */
  dueDateOffset: number;

  /** Email addresses to notify */
  notifyEmails: string[];

  /** Whether to auto-generate drafts */
  autoGenerateDraft: boolean;

  /** Countries included (for OSS) */
  includedCountries?: string[];

  /** VAT registration number */
  vatRegistrationNumber?: string;

  /** Portal URL for submission */
  portalUrl?: string;

  /** Additional notes/instructions */
  instructions?: string;

  /** Last updated */
  updatedAt: Timestamp;
}

// ============================================================================
// EU COUNTRY DATA
// ============================================================================

/**
 * EU Member States for OSS Declaration (27 countries)
 */
export const EU_MEMBER_STATES: ReadonlyArray<{ code: string; name: string; nameEn: string; vatRate: number }> = [
  { code: 'AT', name: 'Autriche', nameEn: 'Austria', vatRate: 20 },
  { code: 'BE', name: 'Belgique', nameEn: 'Belgium', vatRate: 21 },
  { code: 'BG', name: 'Bulgarie', nameEn: 'Bulgaria', vatRate: 20 },
  { code: 'HR', name: 'Croatie', nameEn: 'Croatia', vatRate: 25 },
  { code: 'CY', name: 'Chypre', nameEn: 'Cyprus', vatRate: 19 },
  { code: 'CZ', name: 'Tchequie', nameEn: 'Czech Republic', vatRate: 21 },
  { code: 'DK', name: 'Danemark', nameEn: 'Denmark', vatRate: 25 },
  { code: 'EE', name: 'Estonie', nameEn: 'Estonia', vatRate: 22 },
  { code: 'FI', name: 'Finlande', nameEn: 'Finland', vatRate: 24 },
  { code: 'FR', name: 'France', nameEn: 'France', vatRate: 20 },
  { code: 'DE', name: 'Allemagne', nameEn: 'Germany', vatRate: 19 },
  { code: 'GR', name: 'Grece', nameEn: 'Greece', vatRate: 24 },
  { code: 'HU', name: 'Hongrie', nameEn: 'Hungary', vatRate: 27 },
  { code: 'IE', name: 'Irlande', nameEn: 'Ireland', vatRate: 23 },
  { code: 'IT', name: 'Italie', nameEn: 'Italy', vatRate: 22 },
  { code: 'LV', name: 'Lettonie', nameEn: 'Latvia', vatRate: 21 },
  { code: 'LT', name: 'Lituanie', nameEn: 'Lithuania', vatRate: 21 },
  { code: 'LU', name: 'Luxembourg', nameEn: 'Luxembourg', vatRate: 17 },
  { code: 'MT', name: 'Malte', nameEn: 'Malta', vatRate: 18 },
  { code: 'NL', name: 'Pays-Bas', nameEn: 'Netherlands', vatRate: 21 },
  { code: 'PL', name: 'Pologne', nameEn: 'Poland', vatRate: 23 },
  { code: 'PT', name: 'Portugal', nameEn: 'Portugal', vatRate: 23 },
  { code: 'RO', name: 'Roumanie', nameEn: 'Romania', vatRate: 19 },
  { code: 'SK', name: 'Slovaquie', nameEn: 'Slovakia', vatRate: 20 },
  { code: 'SI', name: 'Slovenie', nameEn: 'Slovenia', vatRate: 22 },
  { code: 'ES', name: 'Espagne', nameEn: 'Spain', vatRate: 21 },
  { code: 'SE', name: 'Suede', nameEn: 'Sweden', vatRate: 25 },
] as const;

/**
 * Get VAT rate for a country
 */
export function getVatRateForCountry(countryCode: string): number {
  const country = EU_MEMBER_STATES.find(c => c.code === countryCode);
  return country?.vatRate ?? 0;
}

/**
 * Get country name by code
 */
export function getCountryName(countryCode: string, lang: 'fr' | 'en' = 'fr'): string {
  const country = EU_MEMBER_STATES.find(c => c.code === countryCode);
  return lang === 'fr' ? (country?.name ?? countryCode) : (country?.nameEn ?? countryCode);
}

// ============================================================================
// QUARTERLY PERIODS
// ============================================================================

/**
 * Quarter definitions for OSS and UK VAT
 */
export interface QuarterPeriod {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  months: [number, number, number];
  dueDateMonth: number;
  dueDateDay: number;
}

export const QUARTER_PERIODS: ReadonlyArray<QuarterPeriod> = [
  { quarter: 'Q1', months: [1, 2, 3], dueDateMonth: 4, dueDateDay: 30 },   // Jan-Mar, due Apr 30
  { quarter: 'Q2', months: [4, 5, 6], dueDateMonth: 7, dueDateDay: 31 },   // Apr-Jun, due Jul 31
  { quarter: 'Q3', months: [7, 8, 9], dueDateMonth: 10, dueDateDay: 31 },  // Jul-Sep, due Oct 31
  { quarter: 'Q4', months: [10, 11, 12], dueDateMonth: 1, dueDateDay: 31 }, // Oct-Dec, due Jan 31 (N+1)
] as const;

/**
 * Get quarter for a given month (1-12)
 */
export function getQuarterForMonth(month: number): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

/**
 * Get period string for a date
 */
export function getPeriodString(date: Date, frequency: TaxFilingFrequency): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (frequency === 'MONTHLY') {
    return `${year}-${String(month).padStart(2, '0')}`;
  } else if (frequency === 'QUARTERLY') {
    return `${year}-${getQuarterForMonth(month)}`;
  } else {
    return `${year}`;
  }
}

// ============================================================================
// FILING TYPE CONFIGURATION
// ============================================================================

/**
 * Default configurations for each filing type
 */
export const FILING_TYPE_CONFIGS: Record<TaxFilingType, {
  name: string;
  nameFr: string;
  frequency: TaxFilingFrequency;
  dueDateOffset: number; // Days after period end
  description: string;
  descriptionFr: string;
}> = {
  VAT_EE: {
    name: 'Estonian VAT',
    nameFr: 'TVA Estonie',
    frequency: 'MONTHLY',
    dueDateOffset: 20, // 20th of following month
    description: 'Monthly VAT return for domestic Estonian sales',
    descriptionFr: 'Declaration TVA mensuelle pour ventes domestiques en Estonie',
  },
  OSS: {
    name: 'OSS EU Declaration',
    nameFr: 'Declaration OSS UE',
    frequency: 'QUARTERLY',
    dueDateOffset: 30, // End of month following quarter
    description: 'Quarterly One-Stop-Shop declaration for B2C sales across EU',
    descriptionFr: 'Declaration trimestrielle One-Stop-Shop pour ventes B2C dans l\'UE',
  },
  DES: {
    name: 'European Declaration of Services',
    nameFr: 'Declaration Europeenne de Services (DES)',
    frequency: 'MONTHLY',
    dueDateOffset: 20, // 20th of following month
    description: 'Monthly declaration for B2B intra-EU services',
    descriptionFr: 'Declaration mensuelle pour services B2B intra-UE',
  },
  UK_VAT: {
    name: 'UK VAT Return',
    nameFr: 'Declaration TVA UK',
    frequency: 'QUARTERLY',
    dueDateOffset: 37, // 1 month + 7 days after quarter
    description: 'Quarterly VAT return for UK sales (Making Tax Digital)',
    descriptionFr: 'Declaration TVA trimestrielle pour ventes UK (Making Tax Digital)',
  },
  CH_VAT: {
    name: 'Swiss VAT Return',
    nameFr: 'Declaration TVA Suisse',
    frequency: 'QUARTERLY',
    dueDateOffset: 60, // 2 months after quarter
    description: 'Quarterly VAT return for Swiss sales',
    descriptionFr: 'Declaration TVA trimestrielle pour ventes en Suisse',
  },
};

// ============================================================================
// STATUS LABELS
// ============================================================================

export const TAX_FILING_STATUS_LABELS: Record<TaxFilingStatus, { en: string; fr: string }> = {
  DRAFT: { en: 'Draft', fr: 'Brouillon' },
  PENDING_REVIEW: { en: 'Pending Review', fr: 'En attente de revision' },
  SUBMITTED: { en: 'Submitted', fr: 'Soumis' },
  ACCEPTED: { en: 'Accepted', fr: 'Accepte' },
  REJECTED: { en: 'Rejected', fr: 'Rejete' },
  PAID: { en: 'Paid', fr: 'Paye' },
};

export const TAX_FILING_TYPE_LABELS: Record<TaxFilingType, { en: string; fr: string }> = {
  VAT_EE: { en: 'Estonian VAT', fr: 'TVA Estonie' },
  OSS: { en: 'OSS EU', fr: 'OSS UE' },
  DES: { en: 'DES', fr: 'DES' },
  UK_VAT: { en: 'UK VAT', fr: 'TVA UK' },
  CH_VAT: { en: 'Swiss VAT', fr: 'TVA Suisse' },
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Filters for querying tax filings
 */
export interface TaxFilingFilters {
  type?: TaxFilingType | 'all';
  status?: TaxFilingStatus | 'all';
  year?: number;
  period?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * KPIs for tax filings dashboard
 */
export interface TaxFilingKPIs {
  totalFilings: number;
  pendingFilings: number;
  overdueFilings: number;
  totalTaxDue: number;
  totalTaxPaid: number;
  upcomingDeadlines: Array<{
    type: TaxFilingType;
    period: string;
    dueDate: Date;
    daysUntilDue: number;
  }>;
}

/**
 * Calendar event for tax deadline
 */
export interface TaxCalendarEvent {
  id: string;
  type: TaxFilingType;
  period: string;
  title: string;
  date: Date;
  status: TaxFilingStatus;
  amount?: number;
  isOverdue: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isTaxFilingType(value: string): value is TaxFilingType {
  return ['VAT_EE', 'OSS', 'DES', 'UK_VAT', 'CH_VAT'].includes(value);
}

export function isTaxFilingStatus(value: string): value is TaxFilingStatus {
  return ['DRAFT', 'PENDING_REVIEW', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAID'].includes(value);
}

export function isTaxFilingFrequency(value: string): value is TaxFilingFrequency {
  return ['MONTHLY', 'QUARTERLY', 'ANNUAL'].includes(value);
}
