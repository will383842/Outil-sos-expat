/**
 * Tax Filing Types for Cloud Functions
 * Shared types between frontend and backend
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// ENUMS AND TYPE ALIASES
// ============================================================================

export type TaxFilingType = 'VAT_EE' | 'OSS' | 'DES' | 'UK_VAT' | 'CH_VAT';
export type TaxFilingStatus = 'DRAFT' | 'PENDING_REVIEW' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'PAID';
export type TaxFilingFrequency = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type CustomerType = 'B2C' | 'B2B';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TaxFilingLine {
  countryCode: string;
  countryName: string;
  taxRate: number;
  taxableBase: number;
  taxAmount: number;
  transactionCount: number;
  currency: string;
  customerType?: CustomerType;
  customerVatNumber?: string;
}

export interface TaxFilingSummary {
  totalSales: number;
  totalTaxableBase: number;
  totalTaxDue: number;
  totalTaxDeductible: number;
  netTaxPayable: number;
  currency: string;
}

export interface TaxFilingFiles {
  pdf?: string;
  csv?: string;
  xml?: string;
  xlsx?: string;
}

export interface TaxFilingReminders {
  sent30Days: boolean;
  sent7Days: boolean;
  sent1Day: boolean;
  sentDueDay?: boolean;
  sentOverdue?: boolean;
}

export interface TaxFiling {
  id: string;
  type: TaxFilingType;
  period: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  frequency: TaxFilingFrequency;
  dueDate: Timestamp;
  submissionDeadline: Timestamp;
  paymentDeadline: Timestamp;
  status: TaxFilingStatus;
  statusHistory?: Array<{
    status: TaxFilingStatus;
    changedAt: Timestamp;
    changedBy: string;
    reason?: string;
  }>;
  summary: TaxFilingSummary;
  lines: TaxFilingLine[];
  generatedFiles: TaxFilingFiles;
  submittedAt?: Timestamp;
  submittedBy?: string;
  confirmationNumber?: string;
  paymentReference?: string;
  paidAt?: Timestamp;
  paymentConfirmation?: string;
  reminders: TaxFilingReminders;
  notes?: string;
  rejectionReason?: string;
  transactionIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// EU MEMBER STATES
// ============================================================================

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
];

export function getVatRateForCountry(countryCode: string): number {
  const country = EU_MEMBER_STATES.find(c => c.code === countryCode);
  return country?.vatRate ?? 0;
}

export function getCountryName(countryCode: string, lang: 'fr' | 'en' = 'fr'): string {
  const country = EU_MEMBER_STATES.find(c => c.code === countryCode);
  return lang === 'fr' ? (country?.name ?? countryCode) : (country?.nameEn ?? countryCode);
}

// ============================================================================
// FILING TYPE CONFIGURATIONS
// ============================================================================

export const FILING_TYPE_CONFIGS: Record<TaxFilingType, {
  name: string;
  nameFr: string;
  frequency: TaxFilingFrequency;
  dueDateOffset: number;
  description: string;
  descriptionFr: string;
}> = {
  VAT_EE: {
    name: 'Estonian VAT',
    nameFr: 'TVA Estonie',
    frequency: 'MONTHLY',
    dueDateOffset: 20,
    description: 'Monthly VAT return for domestic Estonian sales',
    descriptionFr: 'Declaration TVA mensuelle pour ventes domestiques en Estonie',
  },
  OSS: {
    name: 'OSS EU Declaration',
    nameFr: 'Declaration OSS UE',
    frequency: 'QUARTERLY',
    dueDateOffset: 30,
    description: 'Quarterly One-Stop-Shop declaration for B2C sales across EU',
    descriptionFr: 'Declaration trimestrielle One-Stop-Shop pour ventes B2C dans l\'UE',
  },
  DES: {
    name: 'European Declaration of Services',
    nameFr: 'Declaration Europeenne de Services (DES)',
    frequency: 'MONTHLY',
    dueDateOffset: 20,
    description: 'Monthly declaration for B2B intra-EU services',
    descriptionFr: 'Declaration mensuelle pour services B2B intra-UE',
  },
  UK_VAT: {
    name: 'UK VAT Return',
    nameFr: 'Declaration TVA UK',
    frequency: 'QUARTERLY',
    dueDateOffset: 37,
    description: 'Quarterly VAT return for UK sales (Making Tax Digital)',
    descriptionFr: 'Declaration TVA trimestrielle pour ventes UK (Making Tax Digital)',
  },
  CH_VAT: {
    name: 'Swiss VAT Return',
    nameFr: 'Declaration TVA Suisse',
    frequency: 'QUARTERLY',
    dueDateOffset: 60,
    description: 'Quarterly VAT return for Swiss sales',
    descriptionFr: 'Declaration TVA trimestrielle pour ventes en Suisse',
  },
};
