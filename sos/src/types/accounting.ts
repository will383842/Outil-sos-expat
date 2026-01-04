/**
 * International Accounting Types for SOS-Expat
 * Complete TypeScript types for multi-country tax compliance and accounting
 *
 * @module types/accounting
 * @description This module provides comprehensive type definitions for:
 * - Multi-country tax configuration (VAT, GST, Sales Tax)
 * - Tax calculation engine inputs/outputs
 * - Threshold tracking for foreign seller obligations
 * - Double-entry accounting (journal entries)
 * - Chart of accounts management
 * - Tax filing and declarations
 * - Bank reconciliation
 * - Country-specific pricing
 *
 * @see types/finance.ts for payment and transaction types
 */

import type { CurrencyCode } from './finance';

// ============================================================================
// ENUMS AND TYPE ALIASES - Tax Types
// ============================================================================

/**
 * Types of tax systems used globally
 */
export type TaxSystemType = 'VAT' | 'GST' | 'SALES_TAX' | 'NONE';

/**
 * Legal system types for regulatory compliance
 */
export type LegalSystemType = 'COMMON_LAW' | 'CIVIL_LAW' | 'MIXED' | 'OTHER';

/**
 * VAT validation API providers
 */
export type VatValidationApi = 'VIES' | 'HMRC' | 'GST_INDIA' | 'ATO' | 'OTHER';

/**
 * Filing frequency options for tax declarations
 */
export type FilingFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

/**
 * Export format types for tax declarations
 */
export type FilingFormat = 'XML' | 'CSV' | 'PDF' | 'JSON' | 'SAF-T';

/**
 * Threshold period calculation methods
 */
export type ThresholdPeriod = 'annual' | 'calendar_year' | 'rolling_12m' | 'fiscal_year';

/**
 * Alert severity levels for threshold warnings
 */
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'URGENT';

/**
 * Alert status for tracking resolution
 */
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

/**
 * Journal entry types for double-entry accounting
 */
export type JournalEntryType =
  | 'STANDARD'
  | 'ADJUSTING'
  | 'CLOSING'
  | 'REVERSING'
  | 'OPENING'
  | 'CORRECTION';

/**
 * Journal entry status
 */
export type JournalEntryStatus = 'DRAFT' | 'PENDING' | 'POSTED' | 'REVERSED' | 'VOIDED';

/**
 * Account types in the chart of accounts
 */
export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'CONTRA_ASSET'
  | 'CONTRA_LIABILITY'
  | 'CONTRA_EQUITY'
  | 'CONTRA_REVENUE'
  | 'CONTRA_EXPENSE';

/**
 * Account sub-types for detailed classification
 */
export type AccountSubType =
  | 'CASH'
  | 'BANK'
  | 'ACCOUNTS_RECEIVABLE'
  | 'ACCOUNTS_PAYABLE'
  | 'VAT_RECEIVABLE'
  | 'VAT_PAYABLE'
  | 'PREPAID_EXPENSE'
  | 'ACCRUED_REVENUE'
  | 'ACCRUED_EXPENSE'
  | 'RETAINED_EARNINGS'
  | 'SERVICE_REVENUE'
  | 'COMMISSION_REVENUE'
  | 'SUBSCRIPTION_REVENUE'
  | 'PLATFORM_FEE'
  | 'PAYMENT_PROCESSING_FEE'
  | 'TAX_EXPENSE'
  | 'OTHER';

/**
 * Accounting period status
 */
export type PeriodStatus = 'OPEN' | 'CLOSING' | 'CLOSED' | 'LOCKED' | 'REOPENED';

/**
 * Tax filing status
 */
export type TaxFilingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'AMENDED'
  | 'PAID';

/**
 * Reconciliation status
 */
export type ReconciliationStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'PARTIALLY_MATCHED'
  | 'UNMATCHED'
  | 'DISPUTED'
  | 'WRITTEN_OFF';

/**
 * Transaction source for reconciliation
 */
export type TransactionSource =
  | 'STRIPE'
  | 'PAYPAL'
  | 'BANK'
  | 'MANUAL'
  | 'WISE'
  | 'REVOLUT';

/**
 * Customer type for tax purposes
 */
export type CustomerType = 'B2C' | 'B2B' | 'B2G';

/**
 * Service category for tax rate determination
 */
export type ServiceCategory =
  | 'DIGITAL'
  | 'PROFESSIONAL'
  | 'LEGAL'
  | 'CONSULTING'
  | 'TRANSLATION'
  | 'ADMINISTRATIVE'
  | 'EDUCATION'
  | 'OTHER';

// ============================================================================
// COUNTRY TAX CONFIGURATION
// ============================================================================

/**
 * Multi-language name structure
 */
export interface LocalizedName {
  /** English name */
  en: string;
  /** French name */
  fr: string;
  /** Local language name (optional) */
  local?: string;
}

/**
 * Tax rates configuration for a country
 */
export interface TaxRates {
  /** Standard VAT/GST rate (e.g., 0.20 for 20%) */
  standard: number;
  /** Reduced rates if applicable (e.g., [0.10, 0.055]) */
  reduced?: number[];
  /** Super-reduced rate if applicable */
  superReduced?: number;
  /** Zero rate applicable */
  zero?: boolean;
  /** Parking rate (historical, some EU countries) */
  parking?: number;
}

/**
 * Foreign seller threshold configuration
 * Determines when a company must register for VAT in a country
 */
export interface ForeignSellerThreshold {
  /** Threshold amount (null if no threshold) */
  amount: number | null;
  /** Currency of the threshold */
  currency: CurrencyCode;
  /** Period for threshold calculation */
  period: ThresholdPeriod;
  /** Effective date of threshold */
  effectiveFrom?: Date;
  /** Notes about threshold (e.g., "Applies to digital services only") */
  notes?: string;
}

/**
 * B2B transaction rules
 */
export interface B2BRules {
  /** Whether reverse charge mechanism applies */
  reverseChargeApplicable: boolean;
  /** VAT number validation required for B2B */
  vatValidationRequired: boolean;
  /** API to use for VAT validation */
  vatValidationApi?: VatValidationApi;
  /** Minimum transaction amount for reverse charge */
  reverseChargeMinAmount?: number;
  /** Specific industries exempt from reverse charge */
  exemptIndustries?: string[];
}

/**
 * Tax filing requirements for a country
 */
export interface FilingRequirements {
  /** How often filings are required */
  frequency: FilingFrequency;
  /** Days after period end to submit */
  deadlineDays: number;
  /** Required file format */
  format?: FilingFormat;
  /** Electronic submission required */
  electronicRequired?: boolean;
  /** Authority portal URL */
  portalUrl?: string;
  /** Additional declarations required (e.g., EC Sales List, Intrastat) */
  additionalDeclarations?: string[];
}

/**
 * Services taxability configuration
 */
export interface ServicesTaxable {
  /** Digital services (B2C) */
  digital: boolean;
  /** Professional services */
  professional: boolean;
  /** Legal services */
  legal: boolean;
  /** Consulting services */
  consulting: boolean;
  /** Translation services */
  translation?: boolean;
  /** Educational services */
  education?: boolean;
}

/**
 * Legal and regulatory configuration
 */
export interface LegalConfig {
  /** Type of legal system */
  legalSystem: LegalSystemType;
  /** GDPR adequacy decision (for data transfers) */
  gdprAdequate: boolean;
  /** Documents required for registration */
  requiredDocuments: string[];
  /** Specific regulatory requirements */
  regulatoryNotes?: string;
  /** Data localization required */
  dataLocalizationRequired?: boolean;
}

/**
 * SOS-Expat registration status in a country
 */
export interface SOSExpatRegistration {
  /** Whether SOS-Expat is registered for tax in this country */
  isRegistered: boolean;
  /** Tax registration number (VAT, GST, etc.) */
  registrationNumber?: string;
  /** Date of registration */
  registrationDate?: Date;
  /** Registration expiry (if applicable) */
  expiryDate?: Date;
  /** Fiscal representative (if required) */
  fiscalRepresentative?: {
    name: string;
    taxId: string;
    address: string;
    contact: string;
  };
}

/**
 * Complete country tax configuration
 * Central configuration for tax compliance in each country
 */
export interface CountryTaxConfig {
  /** ISO 3166-1 alpha-2 code (e.g., "FR", "DE") */
  code: string;
  /** ISO 3166-1 alpha-3 code (e.g., "FRA", "DEU") */
  code3: string;
  /** Country name in multiple languages */
  name: LocalizedName;
  /** Default currency for this country */
  currency: CurrencyCode;
  /** Primary timezone (IANA format) */
  timezone: string;
  /** Whether this country is active for SOS-Expat */
  isActive: boolean;

  // Fiscalite
  /** Type of tax system (VAT, GST, Sales Tax, None) */
  taxType: TaxSystemType;
  /** Local name of the tax (e.g., "TVA", "Mehrwertsteuer", "IVA") */
  taxName: string;
  /** Tax rates applicable */
  rates: TaxRates;

  // Seuils vendeurs etrangers
  /** Threshold for foreign seller registration obligation */
  foreignSellerThreshold: ForeignSellerThreshold | null;

  // Regles B2B
  /** B2B transaction rules */
  b2bRules: B2BRules;

  // Declarations
  /** Filing requirements */
  filingRequirements: FilingRequirements;

  // Services taxables
  /** Which service categories are taxable */
  servicesTaxable: ServicesTaxable;

  // Config legale
  /** Legal and regulatory configuration */
  legalConfig: LegalConfig;

  // Statut SOS-Expat
  /** SOS-Expat's registration status in this country */
  sosExpatRegistration?: SOSExpatRegistration;

  // Metadata
  /** Last update timestamp */
  updatedAt?: Date;
  /** Update source (manual, API, etc.) */
  updatedBy?: string;
  /** Configuration notes */
  notes?: string;
}

// ============================================================================
// TAX CALCULATION ENGINE
// ============================================================================

/**
 * Customer information for tax calculation
 */
export interface TaxCustomerInfo {
  /** Customer unique ID */
  id: string;
  /** Customer type (B2C, B2B, B2G) */
  type: CustomerType;
  /** Customer country (ISO alpha-2) */
  country: string;
  /** Customer VAT number (for B2B) */
  vatNumber?: string;
  /** VAT number validated */
  vatValidated?: boolean;
  /** VAT validation timestamp */
  vatValidatedAt?: Date;
  /** Customer billing address */
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    region?: string;
    country: string;
  };
}

/**
 * Service line item for tax calculation
 */
export interface TaxLineItem {
  /** Line item ID */
  id: string;
  /** Service category */
  category: ServiceCategory;
  /** Item description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit price (in smallest currency unit, e.g., cents) */
  unitPrice: number;
  /** Currency */
  currency: CurrencyCode;
  /** Tax exempt flag */
  taxExempt?: boolean;
  /** Reason for exemption */
  exemptReason?: string;
  /** Override tax rate (if different from standard) */
  taxRateOverride?: number;
}

/**
 * Input for tax calculation engine
 */
export interface TaxCalculationInput {
  /** Unique calculation request ID */
  requestId: string;
  /** Timestamp of calculation request */
  timestamp: Date;

  // Transaction info
  /** Transaction ID (payment, invoice, etc.) */
  transactionId: string;
  /** Transaction type */
  transactionType: 'PAYMENT' | 'INVOICE' | 'QUOTE' | 'CREDIT_NOTE';
  /** Transaction date */
  transactionDate: Date;

  // Seller info (SOS-Expat)
  /** Seller country (Estonia for SOS-Expat) */
  sellerCountry: string;
  /** Seller VAT number */
  sellerVatNumber: string;

  // Customer info
  /** Customer details */
  customer: TaxCustomerInfo;

  // Line items
  /** Items to calculate tax for */
  lineItems: TaxLineItem[];

  // Options
  /** Include tax in prices (price-inclusive calculation) */
  pricesIncludeTax?: boolean;
  /** Apply reverse charge if applicable */
  applyReverseCharge?: boolean;
  /** Force specific tax rate */
  forceTaxRate?: number;
  /** Calculation mode */
  calculationMode?: 'REAL_TIME' | 'BATCH' | 'SIMULATION';
}

/**
 * Tax breakdown for a single line item
 */
export interface TaxLineItemResult {
  /** Original line item ID */
  lineItemId: string;
  /** Net amount (before tax) */
  netAmount: number;
  /** Tax rate applied */
  taxRate: number;
  /** Tax amount calculated */
  taxAmount: number;
  /** Gross amount (after tax) */
  grossAmount: number;
  /** Tax type applied */
  taxType: TaxSystemType;
  /** Tax jurisdiction country */
  taxJurisdiction: string;
  /** Reverse charge applied */
  reverseChargeApplied: boolean;
  /** Exempt flag */
  exempt: boolean;
  /** Exemption reason if applicable */
  exemptReason?: string;
}

/**
 * Complete tax calculation result
 */
export interface TaxCalculationResult {
  /** Request ID (matches input) */
  requestId: string;
  /** Calculation timestamp */
  calculatedAt: Date;
  /** Calculation successful */
  success: boolean;
  /** Error message if failed */
  error?: string;

  // Summary
  /** Total net amount (before tax) */
  totalNetAmount: number;
  /** Total tax amount */
  totalTaxAmount: number;
  /** Total gross amount (after tax) */
  totalGrossAmount: number;
  /** Currency used */
  currency: CurrencyCode;

  // Tax breakdown by rate
  /** Tax breakdown by rate */
  taxBreakdown: Array<{
    rate: number;
    taxableAmount: number;
    taxAmount: number;
    taxType: TaxSystemType;
    jurisdiction: string;
  }>;

  // Line item results
  /** Individual line item tax results */
  lineItems: TaxLineItemResult[];

  // Determination info
  /** Tax determination details */
  determination: {
    /** Seller country */
    sellerCountry: string;
    /** Customer country */
    customerCountry: string;
    /** Customer type used */
    customerType: CustomerType;
    /** Rule applied (e.g., "EU_B2C_DIGITAL", "REVERSE_CHARGE") */
    ruleApplied: string;
    /** Place of supply */
    placeOfSupply: string;
    /** Threshold status */
    thresholdStatus?: 'BELOW' | 'ABOVE' | 'NOT_APPLICABLE';
  };

  // Compliance info
  /** Compliance-related information */
  compliance: {
    /** VAT number validated */
    vatValidated: boolean;
    /** Reverse charge applicable */
    reverseChargeApplicable: boolean;
    /** EC Sales List required */
    ecSalesListRequired: boolean;
    /** Declaration required in customer country */
    foreignDeclarationRequired: boolean;
  };

  // Audit
  /** Audit trail */
  audit: {
    /** Configuration version used */
    configVersion: string;
    /** Rate source */
    rateSource: string;
    /** Calculation engine version */
    engineVersion: string;
  };
}

// ============================================================================
// THRESHOLD TRACKING
// ============================================================================

/**
 * Revenue tracking for threshold monitoring
 */
export interface ThresholdRevenue {
  /** Country code */
  country: string;
  /** Period (e.g., "2024", "2024-Q1") */
  period: string;
  /** Period type */
  periodType: ThresholdPeriod;
  /** Total revenue in period (in cents) */
  totalRevenue: number;
  /** Currency of revenue */
  currency: CurrencyCode;
  /** Revenue converted to threshold currency */
  revenueInThresholdCurrency: number;
  /** Threshold currency */
  thresholdCurrency: CurrencyCode;
  /** Number of transactions */
  transactionCount: number;
  /** B2C revenue only */
  b2cRevenue: number;
  /** B2B revenue (excluded from threshold usually) */
  b2bRevenue: number;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Complete threshold tracking for a country
 */
export interface ThresholdTracking {
  /** Unique tracking ID */
  id: string;
  /** Country being tracked */
  countryCode: string;
  /** Country name */
  countryName: string;

  // Threshold info
  /** Current threshold amount */
  thresholdAmount: number | null;
  /** Threshold currency */
  thresholdCurrency: CurrencyCode;
  /** Threshold period type */
  thresholdPeriod: ThresholdPeriod;

  // Current status
  /** Current period revenue data */
  currentPeriod: ThresholdRevenue;
  /** Percentage of threshold reached */
  percentageReached: number;
  /** Projected end-of-period revenue */
  projectedRevenue: number;
  /** Days until period end */
  daysUntilPeriodEnd: number;

  // Historical data
  /** Historical revenue by period */
  historicalRevenue: ThresholdRevenue[];

  // Status
  /** Current threshold status */
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXCEEDED' | 'REGISTERED';
  /** Registration required */
  registrationRequired: boolean;
  /** Estimated registration deadline */
  estimatedRegistrationDeadline?: Date;

  // Alerts
  /** Active alerts for this country */
  activeAlerts: string[]; // Alert IDs

  // Metadata
  /** Last calculation timestamp */
  lastCalculatedAt: Date;
  /** Next scheduled calculation */
  nextCalculationAt: Date;
}

/**
 * Threshold alert configuration
 */
export interface ThresholdAlertConfig {
  /** Alert at percentage (e.g., 70, 85, 95) */
  percentage: number;
  /** Alert severity */
  severity: AlertSeverity;
  /** Notification channels */
  notificationChannels: ('EMAIL' | 'SLACK' | 'SMS' | 'DASHBOARD')[];
  /** Recipients (user IDs or email addresses) */
  recipients: string[];
}

/**
 * Threshold alert instance
 */
export interface ThresholdAlert {
  /** Unique alert ID */
  id: string;
  /** Related threshold tracking ID */
  thresholdTrackingId: string;
  /** Country code */
  countryCode: string;
  /** Country name */
  countryName: string;

  // Alert details
  /** Alert type */
  type: 'THRESHOLD_WARNING' | 'THRESHOLD_CRITICAL' | 'THRESHOLD_EXCEEDED' | 'REGISTRATION_REMINDER';
  /** Alert severity */
  severity: AlertSeverity;
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;

  // Threshold info at time of alert
  /** Threshold amount */
  thresholdAmount: number;
  /** Current revenue at alert time */
  currentRevenue: number;
  /** Percentage at alert time */
  percentageAtAlert: number;
  /** Currency */
  currency: CurrencyCode;

  // Status
  /** Alert status */
  status: AlertStatus;
  /** Acknowledged by (user ID) */
  acknowledgedBy?: string;
  /** Acknowledged timestamp */
  acknowledgedAt?: Date;
  /** Resolution notes */
  resolutionNotes?: string;
  /** Resolved timestamp */
  resolvedAt?: Date;

  // Timestamps
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;

  // Actions taken
  /** Actions taken in response */
  actionsTaken?: Array<{
    action: string;
    performedBy: string;
    performedAt: Date;
    notes?: string;
  }>;
}

// ============================================================================
// DOUBLE-ENTRY ACCOUNTING
// ============================================================================

/**
 * Single line in a journal entry (debit or credit)
 */
export interface JournalEntryLine {
  /** Line number */
  lineNumber: number;
  /** Account code */
  accountCode: string;
  /** Account name */
  accountName: string;
  /** Debit amount (in smallest currency unit) */
  debit: number;
  /** Credit amount (in smallest currency unit) */
  credit: number;
  /** Currency */
  currency: CurrencyCode;
  /** Amount in base currency (EUR) if different */
  baseAmount?: number;
  /** Exchange rate used */
  exchangeRate?: number;
  /** Line description */
  description?: string;
  /** Tax code if applicable */
  taxCode?: string;
  /** Related entity type */
  entityType?: 'CLIENT' | 'PROVIDER' | 'SUPPLIER' | 'TAX_AUTHORITY' | 'BANK';
  /** Related entity ID */
  entityId?: string;
  /** Cost center */
  costCenter?: string;
  /** Project code */
  projectCode?: string;
}

/**
 * Complete journal entry for double-entry accounting
 */
export interface JournalEntry {
  /** Unique journal entry ID */
  id: string;
  /** Journal entry number (sequential) */
  entryNumber: string;
  /** Entry type */
  type: JournalEntryType;
  /** Entry status */
  status: JournalEntryStatus;

  // Dates
  /** Transaction date */
  transactionDate: Date;
  /** Posting date (when entered in ledger) */
  postingDate: Date;
  /** Period (e.g., "2024-01") */
  period: string;

  // Entry details
  /** Entry description/memo */
  description: string;
  /** Reference number (invoice, payment, etc.) */
  reference?: string;
  /** Reference type */
  referenceType?: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'ADJUSTMENT' | 'OTHER';
  /** External reference (Stripe ID, etc.) */
  externalReference?: string;

  // Lines
  /** Journal entry lines */
  lines: JournalEntryLine[];

  // Totals (for validation)
  /** Total debits (must equal credits) */
  totalDebits: number;
  /** Total credits (must equal debits) */
  totalCredits: number;
  /** Base currency */
  baseCurrency: CurrencyCode;

  // Reversal info
  /** If this is a reversal, original entry ID */
  reversesEntryId?: string;
  /** If reversed, the reversing entry ID */
  reversedByEntryId?: string;
  /** Reversal date if applicable */
  reversalDate?: Date;

  // Auto-generated flag
  /** Whether entry was auto-generated */
  autoGenerated: boolean;
  /** Source of auto-generation */
  autoGeneratedSource?: string;

  // Audit
  /** Created by user ID */
  createdBy: string;
  /** Created timestamp */
  createdAt: Date;
  /** Posted by user ID */
  postedBy?: string;
  /** Posted timestamp */
  postedAt?: Date;
  /** Last updated by */
  updatedBy?: string;
  /** Last updated timestamp */
  updatedAt?: Date;

  // Attachments
  /** Supporting document URLs */
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }>;

  // Notes
  /** Internal notes */
  notes?: string;
}

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

/**
 * Single account in the chart of accounts
 */
export interface Account {
  /** Account code (e.g., "4010", "512000") */
  code: string;
  /** Account name */
  name: LocalizedName;
  /** Account type */
  type: AccountType;
  /** Account sub-type */
  subType: AccountSubType;
  /** Parent account code (for hierarchical structure) */
  parentCode?: string;
  /** Account level in hierarchy */
  level: number;
  /** Is this a control account (has sub-accounts) */
  isControlAccount: boolean;
  /** Is this a posting account (can post transactions) */
  isPostingAccount: boolean;
  /** Currency restriction (null = all currencies) */
  currency?: CurrencyCode;
  /** Normal balance side */
  normalBalance: 'DEBIT' | 'CREDIT';
  /** Account is active */
  isActive: boolean;
  /** Tax code associated */
  taxCode?: string;
  /** Description */
  description?: string;
  /** Opening balance */
  openingBalance?: number;
  /** Current balance */
  currentBalance?: number;
  /** Last transaction date */
  lastTransactionDate?: Date;
}

/**
 * Complete chart of accounts structure
 */
export interface ChartOfAccounts {
  /** Chart of accounts ID */
  id: string;
  /** Version number */
  version: string;
  /** Name of chart */
  name: string;
  /** Base country (Estonia for SOS-Expat) */
  baseCountry: string;
  /** Base currency */
  baseCurrency: CurrencyCode;
  /** Accounting standard (IFRS, local GAAP, etc.) */
  accountingStandard: 'IFRS' | 'ESTONIAN_GAAP' | 'OTHER';

  // Accounts
  /** All accounts */
  accounts: Account[];

  // Structure
  /** Root account codes by type */
  rootAccounts: {
    assets: string;
    liabilities: string;
    equity: string;
    revenue: string;
    expenses: string;
  };

  // Metadata
  /** Effective date */
  effectiveDate: Date;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
  /** Updated by */
  updatedBy?: string;

  // Validation
  /** Is balanced (debits = credits for all entries) */
  isBalanced: boolean;
  /** Last validation date */
  lastValidatedAt?: Date;
}

// ============================================================================
// ACCOUNTING PERIOD
// ============================================================================

/**
 * Accounting period for financial reporting
 */
export interface AccountingPeriod {
  /** Period ID */
  id: string;
  /** Period code (e.g., "2024-01", "2024-Q1") */
  code: string;
  /** Period name */
  name: string;
  /** Period type */
  type: 'MONTH' | 'QUARTER' | 'YEAR';
  /** Fiscal year */
  fiscalYear: number;
  /** Period number within year (1-12 for months, 1-4 for quarters) */
  periodNumber: number;

  // Dates
  /** Period start date */
  startDate: Date;
  /** Period end date */
  endDate: Date;

  // Status
  /** Period status */
  status: PeriodStatus;
  /** Status changed timestamp */
  statusChangedAt?: Date;
  /** Status changed by */
  statusChangedBy?: string;

  // Financials
  /** Opening balance */
  openingBalance: number;
  /** Closing balance */
  closingBalance?: number;
  /** Total revenue */
  totalRevenue?: number;
  /** Total expenses */
  totalExpenses?: number;
  /** Net income */
  netIncome?: number;

  // Journal entries
  /** Number of journal entries */
  journalEntryCount: number;
  /** First entry number in period */
  firstEntryNumber?: string;
  /** Last entry number in period */
  lastEntryNumber?: string;

  // Tax
  /** VAT filings for period */
  taxFilingIds?: string[];
  /** VAT amount collected */
  vatCollected?: number;
  /** VAT amount paid */
  vatPaid?: number;
  /** Net VAT position */
  netVat?: number;

  // Audit
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Closed by (user ID) */
  closedBy?: string;
  /** Closed timestamp */
  closedAt?: Date;
  /** Closing notes */
  closingNotes?: string;
  /** Audited flag */
  isAudited?: boolean;
  /** Audited by */
  auditedBy?: string;
  /** Audit date */
  auditedAt?: Date;
}

// ============================================================================
// TAX FILING
// ============================================================================

/**
 * Single line in a tax filing
 */
export interface TaxFilingLine {
  /** Line number (as per form) */
  lineNumber: string;
  /** Box/field code */
  boxCode: string;
  /** Line description */
  description: string;
  /** Amount */
  amount: number;
  /** Currency */
  currency: CurrencyCode;
  /** Tax rate (if applicable) */
  taxRate?: number;
  /** Taxable amount (base) */
  taxableAmount?: number;
  /** Tax amount */
  taxAmount?: number;
  /** Source (calculated, manual, imported) */
  source: 'CALCULATED' | 'MANUAL' | 'IMPORTED' | 'ADJUSTED';
  /** Related journal entries */
  relatedEntries?: string[];
  /** Notes */
  notes?: string;
}

/**
 * Complete tax filing/declaration
 */
export interface TaxFiling {
  /** Filing ID */
  id: string;
  /** Filing reference number */
  referenceNumber: string;
  /** Filing type */
  type: 'VAT_RETURN' | 'EC_SALES_LIST' | 'INTRASTAT' | 'OSS_RETURN' | 'ANNUAL_RETURN' | 'OTHER';
  /** Country filed in */
  country: string;
  /** Tax authority name */
  taxAuthority: string;

  // Period
  /** Period covered */
  period: string;
  /** Period start */
  periodStart: Date;
  /** Period end */
  periodEnd: Date;
  /** Fiscal year */
  fiscalYear: number;

  // Status
  /** Filing status */
  status: TaxFilingStatus;
  /** Status history */
  statusHistory: Array<{
    status: TaxFilingStatus;
    changedAt: Date;
    changedBy: string;
    notes?: string;
  }>;

  // Deadlines
  /** Filing deadline */
  deadline: Date;
  /** Payment deadline (if different) */
  paymentDeadline?: Date;
  /** Days until deadline */
  daysUntilDeadline?: number;
  /** Is overdue */
  isOverdue?: boolean;

  // Lines
  /** Filing lines */
  lines: TaxFilingLine[];

  // Totals
  /** Total taxable amount */
  totalTaxable: number;
  /** Total tax due */
  totalTaxDue: number;
  /** Total tax deductible (input VAT) */
  totalTaxDeductible: number;
  /** Net amount payable/refundable */
  netAmount: number;
  /** Is refund due */
  isRefund: boolean;
  /** Currency */
  currency: CurrencyCode;

  // Payment
  /** Payment status */
  paymentStatus?: 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED';
  /** Payment reference */
  paymentReference?: string;
  /** Payment date */
  paidAt?: Date;
  /** Payment amount */
  paidAmount?: number;

  // Submission
  /** Submitted timestamp */
  submittedAt?: Date;
  /** Submitted by */
  submittedBy?: string;
  /** Submission reference/receipt */
  submissionReference?: string;
  /** Submission method */
  submissionMethod?: 'ELECTRONIC' | 'PAPER' | 'API';

  // Attachments
  /** Filing documents */
  documents?: Array<{
    name: string;
    type: 'SUBMISSION' | 'RECEIPT' | 'SUPPORTING' | 'CORRECTION';
    url: string;
    uploadedAt: Date;
  }>;

  // Amendments
  /** Is this an amendment */
  isAmendment: boolean;
  /** Original filing ID if amendment */
  amendsFilingId?: string;
  /** Amendment reason */
  amendmentReason?: string;

  // Audit
  /** Prepared by */
  preparedBy: string;
  /** Prepared at */
  preparedAt: Date;
  /** Reviewed by */
  reviewedBy?: string;
  /** Reviewed at */
  reviewedAt?: Date;
  /** Approved by */
  approvedBy?: string;
  /** Approved at */
  approvedAt?: Date;
  /** Last updated */
  updatedAt: Date;

  // Notes
  /** Internal notes */
  notes?: string;
}

// ============================================================================
// BANK RECONCILIATION
// ============================================================================

/**
 * Bank transaction for reconciliation
 */
export interface BankTransaction {
  /** Transaction ID */
  id: string;
  /** Bank account ID */
  bankAccountId: string;
  /** Transaction date */
  transactionDate: Date;
  /** Value date */
  valueDate?: Date;
  /** Amount (positive for credit, negative for debit) */
  amount: number;
  /** Currency */
  currency: CurrencyCode;
  /** Transaction description from bank */
  description: string;
  /** Bank reference */
  bankReference?: string;
  /** Counterparty name */
  counterpartyName?: string;
  /** Counterparty account */
  counterpartyAccount?: string;
  /** Transaction type from bank */
  bankTransactionType?: string;
  /** Is reconciled */
  isReconciled: boolean;
  /** Import batch ID */
  importBatchId?: string;
  /** Imported at */
  importedAt: Date;
}

/**
 * System transaction for reconciliation matching
 */
export interface SystemTransaction {
  /** Transaction ID */
  id: string;
  /** Source system */
  source: TransactionSource;
  /** External ID (Stripe payment intent, PayPal order, etc.) */
  externalId: string;
  /** Transaction date */
  transactionDate: Date;
  /** Amount */
  amount: number;
  /** Currency */
  currency: CurrencyCode;
  /** Description */
  description: string;
  /** Related entity type */
  entityType: 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'FEE' | 'ADJUSTMENT';
  /** Related entity ID */
  entityId: string;
  /** Is reconciled */
  isReconciled: boolean;
  /** Expected bank amount (after fees) */
  expectedBankAmount?: number;
}

/**
 * Reconciliation match between bank and system transactions
 */
export interface ReconciliationMatch {
  /** Match ID */
  id: string;
  /** Bank transaction ID */
  bankTransactionId: string;
  /** System transaction ID(s) */
  systemTransactionIds: string[];
  /** Match type */
  matchType: 'EXACT' | 'PARTIAL' | 'MULTIPLE' | 'MANUAL';
  /** Confidence score (0-100) */
  confidence: number;
  /** Bank amount */
  bankAmount: number;
  /** System amount */
  systemAmount: number;
  /** Difference */
  difference: number;
  /** Match status */
  status: 'SUGGESTED' | 'CONFIRMED' | 'REJECTED';
  /** Matched by (user ID or 'SYSTEM') */
  matchedBy: string;
  /** Matched at */
  matchedAt: Date;
}

/**
 * Complete reconciliation record
 */
export interface ReconciliationRecord {
  /** Reconciliation ID */
  id: string;
  /** Bank account ID */
  bankAccountId: string;
  /** Bank account name */
  bankAccountName: string;
  /** Reconciliation period */
  period: string;
  /** Period start */
  periodStart: Date;
  /** Period end */
  periodEnd: Date;

  // Status
  /** Reconciliation status */
  status: ReconciliationStatus;
  /** Overall completion percentage */
  completionPercentage: number;

  // Bank statement
  /** Opening balance per bank */
  bankOpeningBalance: number;
  /** Closing balance per bank */
  bankClosingBalance: number;
  /** Total credits per bank */
  bankTotalCredits: number;
  /** Total debits per bank */
  bankTotalDebits: number;
  /** Currency */
  currency: CurrencyCode;

  // System (book) figures
  /** Opening balance per books */
  bookOpeningBalance: number;
  /** Closing balance per books */
  bookClosingBalance: number;
  /** Total credits per books */
  bookTotalCredits: number;
  /** Total debits per books */
  bookTotalDebits: number;

  // Reconciling items
  /** Difference to reconcile */
  differenceAmount: number;
  /** Unreconciled bank transactions */
  unreconciledBankCount: number;
  /** Unreconciled system transactions */
  unreconciledSystemCount: number;
  /** Matched transactions */
  matchedCount: number;

  // Matches
  /** Reconciliation matches */
  matches: ReconciliationMatch[];

  // Bank transactions in scope
  /** Bank transaction IDs */
  bankTransactionIds: string[];

  // System transactions in scope
  /** System transaction IDs */
  systemTransactionIds: string[];

  // Adjustments
  /** Manual adjustments */
  adjustments?: Array<{
    id: string;
    description: string;
    amount: number;
    type: 'BANK_FEE' | 'INTEREST' | 'FX_DIFFERENCE' | 'TIMING' | 'ERROR' | 'OTHER';
    journalEntryId?: string;
    createdBy: string;
    createdAt: Date;
  }>;

  // Audit
  /** Started by */
  startedBy: string;
  /** Started at */
  startedAt: Date;
  /** Completed by */
  completedBy?: string;
  /** Completed at */
  completedAt?: Date;
  /** Reviewed by */
  reviewedBy?: string;
  /** Reviewed at */
  reviewedAt?: Date;
  /** Last updated */
  updatedAt: Date;

  // Notes
  /** Reconciliation notes */
  notes?: string;
}

// ============================================================================
// COUNTRY PRICING
// ============================================================================

/**
 * Service pricing tier
 */
export interface PricingTier {
  /** Tier ID */
  id: string;
  /** Tier name (e.g., "Standard", "Premium") */
  name: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Price in smallest currency unit */
  price: number;
  /** Price per minute (if applicable) */
  pricePerMinute?: number;
  /** Is active */
  isActive: boolean;
}

/**
 * Country-specific pricing configuration
 */
export interface CountryPricing {
  /** Pricing config ID */
  id: string;
  /** Country code (ISO alpha-2) */
  countryCode: string;
  /** Country name */
  countryName: string;
  /** Currency for this country */
  currency: CurrencyCode;

  // Pricing strategy
  /** Pricing strategy */
  strategy: 'FIXED' | 'MARKET_BASED' | 'PPP_ADJUSTED' | 'COST_PLUS';
  /** Base country for comparison */
  baseCountry?: string;
  /** Adjustment factor (e.g., 0.8 for 20% discount) */
  adjustmentFactor?: number;

  // Service pricing
  /** Pricing tiers by service category */
  servicePricing: Record<ServiceCategory, PricingTier[]>;

  // Platform fees
  /** Platform commission rate (e.g., 0.15 for 15%) */
  platformCommissionRate: number;
  /** Minimum platform fee */
  minimumPlatformFee: number;
  /** Payment processing fee passed to customer */
  paymentProcessingFeeRate: number;

  // Tax display
  /** Show prices including tax */
  displayPricesWithTax: boolean;
  /** Tax rate for display */
  displayTaxRate: number;

  // Minimum/Maximum
  /** Minimum charge amount */
  minimumChargeAmount: number;
  /** Maximum charge amount */
  maximumChargeAmount?: number;

  // Promotions
  /** Active promotion code */
  activePromotion?: {
    code: string;
    discountPercent: number;
    validFrom: Date;
    validTo: Date;
  };

  // Status
  /** Is active */
  isActive: boolean;
  /** Effective date */
  effectiveFrom: Date;
  /** Expiry date (if temporary) */
  effectiveTo?: Date;

  // Metadata
  /** Created at */
  createdAt: Date;
  /** Updated at */
  updatedAt: Date;
  /** Updated by */
  updatedBy?: string;
  /** Notes */
  notes?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  /** Items in current page */
  items: T[];
  /** Total count */
  total: number;
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total pages */
  totalPages: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrevious: boolean;
}

/**
 * Date range for queries
 */
export interface DateRange {
  /** Start date */
  from: Date;
  /** End date */
  to: Date;
}

/**
 * Country code with validation
 */
export type CountryCodeISO2 = string & { __brand: 'CountryCodeISO2' };
export type CountryCodeISO3 = string & { __brand: 'CountryCodeISO3' };

/**
 * Money amount type (in smallest currency unit)
 */
export interface MoneyAmount {
  /** Amount in smallest currency unit (cents, etc.) */
  amount: number;
  /** Currency code */
  currency: CurrencyCode;
}

/**
 * Exchange rate record
 */
export interface ExchangeRate {
  /** Source currency */
  from: CurrencyCode;
  /** Target currency */
  to: CurrencyCode;
  /** Exchange rate */
  rate: number;
  /** Rate date */
  date: Date;
  /** Source (ECB, manual, etc.) */
  source: 'ECB' | 'MANUAL' | 'STRIPE' | 'OTHER';
}

/**
 * Audit log entry for accounting changes
 */
export interface AccountingAuditEntry {
  /** Entry ID */
  id: string;
  /** Entity type */
  entityType: 'JOURNAL_ENTRY' | 'TAX_FILING' | 'RECONCILIATION' | 'PERIOD' | 'ACCOUNT';
  /** Entity ID */
  entityId: string;
  /** Action performed */
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'POST' | 'REVERSE' | 'CLOSE' | 'APPROVE' | 'REJECT';
  /** Changes made */
  changes?: Record<string, { old: unknown; new: unknown }>;
  /** User ID */
  userId: string;
  /** User email */
  userEmail: string;
  /** IP address */
  ipAddress?: string;
  /** Timestamp */
  timestamp: Date;
  /** Notes */
  notes?: string;
}

// ============================================================================
// FILTER AND QUERY TYPES
// ============================================================================

/**
 * Filter for journal entries
 */
export interface JournalEntryFilter {
  /** Filter by status */
  status?: JournalEntryStatus | JournalEntryStatus[];
  /** Filter by type */
  type?: JournalEntryType | JournalEntryType[];
  /** Filter by date range */
  dateRange?: DateRange;
  /** Filter by period */
  period?: string;
  /** Filter by account code */
  accountCode?: string;
  /** Search in description */
  search?: string;
  /** Filter by reference */
  reference?: string;
  /** Filter by created by */
  createdBy?: string;
  /** Include auto-generated */
  includeAutoGenerated?: boolean;
}

/**
 * Filter for tax filings
 */
export interface TaxFilingFilter {
  /** Filter by status */
  status?: TaxFilingStatus | TaxFilingStatus[];
  /** Filter by type */
  type?: string;
  /** Filter by country */
  country?: string;
  /** Filter by fiscal year */
  fiscalYear?: number;
  /** Filter by period */
  period?: string;
  /** Filter overdue only */
  overdueOnly?: boolean;
}

/**
 * Filter for threshold tracking
 */
export interface ThresholdFilter {
  /** Filter by country */
  country?: string;
  /** Filter by status */
  status?: ('SAFE' | 'WARNING' | 'CRITICAL' | 'EXCEEDED' | 'REGISTERED')[];
  /** Filter registered countries */
  registeredOnly?: boolean;
  /** Filter unregistered countries */
  unregisteredOnly?: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for TaxSystemType
 */
export function isTaxSystemType(value: string): value is TaxSystemType {
  return ['VAT', 'GST', 'SALES_TAX', 'NONE'].includes(value);
}

/**
 * Type guard for FilingFrequency
 */
export function isFilingFrequency(value: string): value is FilingFrequency {
  return ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'].includes(value);
}

/**
 * Type guard for JournalEntryStatus
 */
export function isJournalEntryStatus(value: string): value is JournalEntryStatus {
  return ['DRAFT', 'PENDING', 'POSTED', 'REVERSED', 'VOIDED'].includes(value);
}

/**
 * Type guard for TaxFilingStatus
 */
export function isTaxFilingStatus(value: string): value is TaxFilingStatus {
  return ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'AMENDED', 'PAID'].includes(value);
}

/**
 * Type guard for AccountType
 */
export function isAccountType(value: string): value is AccountType {
  return [
    'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE',
    'CONTRA_ASSET', 'CONTRA_LIABILITY', 'CONTRA_EQUITY', 'CONTRA_REVENUE', 'CONTRA_EXPENSE'
  ].includes(value);
}

/**
 * Type guard for AlertSeverity
 */
export function isAlertSeverity(value: string): value is AlertSeverity {
  return ['INFO', 'WARNING', 'CRITICAL', 'URGENT'].includes(value);
}

/**
 * Type guard for CustomerType
 */
export function isCustomerType(value: string): value is CustomerType {
  return ['B2C', 'B2B', 'B2G'].includes(value);
}

/**
 * Type guard for ServiceCategory
 */
export function isServiceCategory(value: string): value is ServiceCategory {
  return ['DIGITAL', 'PROFESSIONAL', 'LEGAL', 'CONSULTING', 'TRANSLATION', 'ADMINISTRATIVE', 'EDUCATION', 'OTHER'].includes(value);
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** All tax system types */
export const TAX_SYSTEM_TYPES: readonly TaxSystemType[] = ['VAT', 'GST', 'SALES_TAX', 'NONE'] as const;

/** All filing frequencies */
export const FILING_FREQUENCIES: readonly FilingFrequency[] = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'] as const;

/** All journal entry statuses */
export const JOURNAL_ENTRY_STATUSES: readonly JournalEntryStatus[] = ['DRAFT', 'PENDING', 'POSTED', 'REVERSED', 'VOIDED'] as const;

/** All tax filing statuses */
export const TAX_FILING_STATUSES: readonly TaxFilingStatus[] = [
  'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'AMENDED', 'PAID'
] as const;

/** All account types */
export const ACCOUNT_TYPES: readonly AccountType[] = [
  'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE',
  'CONTRA_ASSET', 'CONTRA_LIABILITY', 'CONTRA_EQUITY', 'CONTRA_REVENUE', 'CONTRA_EXPENSE'
] as const;

/** All alert severities */
export const ALERT_SEVERITIES: readonly AlertSeverity[] = ['INFO', 'WARNING', 'CRITICAL', 'URGENT'] as const;

/** All customer types */
export const CUSTOMER_TYPES: readonly CustomerType[] = ['B2C', 'B2B', 'B2G'] as const;

/** All service categories */
export const SERVICE_CATEGORIES: readonly ServiceCategory[] = [
  'DIGITAL', 'PROFESSIONAL', 'LEGAL', 'CONSULTING', 'TRANSLATION', 'ADMINISTRATIVE', 'EDUCATION', 'OTHER'
] as const;

/** Labels for tax system types (FR) */
export const TAX_SYSTEM_LABELS: Record<TaxSystemType, string> = {
  VAT: 'TVA',
  GST: 'TPS',
  SALES_TAX: 'Taxe de vente',
  NONE: 'Aucune',
};

/** Labels for filing frequencies (FR) */
export const FILING_FREQUENCY_LABELS: Record<FilingFrequency, string> = {
  MONTHLY: 'Mensuelle',
  QUARTERLY: 'Trimestrielle',
  SEMI_ANNUAL: 'Semestrielle',
  ANNUAL: 'Annuelle',
};

/** Labels for journal entry statuses (FR) */
export const JOURNAL_ENTRY_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  POSTED: 'Comptabilise',
  REVERSED: 'Extourne',
  VOIDED: 'Annule',
};

/** Labels for tax filing statuses (FR) */
export const TAX_FILING_STATUS_LABELS: Record<TaxFilingStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_REVIEW: 'En revision',
  APPROVED: 'Approuve',
  SUBMITTED: 'Soumis',
  ACCEPTED: 'Accepte',
  REJECTED: 'Rejete',
  AMENDED: 'Modifie',
  PAID: 'Paye',
};

/** Labels for alert severities (FR) */
export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  INFO: 'Information',
  WARNING: 'Avertissement',
  CRITICAL: 'Critique',
  URGENT: 'Urgent',
};

/** Labels for customer types (FR) */
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  B2C: 'Particulier',
  B2B: 'Professionnel',
  B2G: 'Administration',
};

/** Labels for service categories (FR) */
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  DIGITAL: 'Services numeriques',
  PROFESSIONAL: 'Services professionnels',
  LEGAL: 'Services juridiques',
  CONSULTING: 'Conseil',
  TRANSLATION: 'Traduction',
  ADMINISTRATIVE: 'Services administratifs',
  EDUCATION: 'Formation',
  OTHER: 'Autre',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate if a threshold has been exceeded
 */
export function isThresholdExceeded(tracking: ThresholdTracking): boolean {
  if (tracking.thresholdAmount === null) return false;
  return tracking.currentPeriod.revenueInThresholdCurrency >= tracking.thresholdAmount;
}

/**
 * Calculate threshold percentage
 */
export function calculateThresholdPercentage(
  currentRevenue: number,
  thresholdAmount: number | null
): number {
  if (thresholdAmount === null || thresholdAmount === 0) return 0;
  return Math.min(100, (currentRevenue / thresholdAmount) * 100);
}

/**
 * Determine threshold status based on percentage
 */
export function getThresholdStatus(
  percentage: number,
  isRegistered: boolean
): ThresholdTracking['status'] {
  if (isRegistered) return 'REGISTERED';
  if (percentage >= 100) return 'EXCEEDED';
  if (percentage >= 90) return 'CRITICAL';
  if (percentage >= 70) return 'WARNING';
  return 'SAFE';
}

/**
 * Validate journal entry balances (debits must equal credits)
 */
export function validateJournalEntryBalance(entry: JournalEntry): boolean {
  const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);
  return totalDebits === totalCredits && totalDebits > 0;
}

/**
 * Get normal balance side for account type
 */
export function getNormalBalanceSide(accountType: AccountType): 'DEBIT' | 'CREDIT' {
  switch (accountType) {
    case 'ASSET':
    case 'EXPENSE':
    case 'CONTRA_LIABILITY':
    case 'CONTRA_EQUITY':
    case 'CONTRA_REVENUE':
      return 'DEBIT';
    case 'LIABILITY':
    case 'EQUITY':
    case 'REVENUE':
    case 'CONTRA_ASSET':
    case 'CONTRA_EXPENSE':
      return 'CREDIT';
    default:
      return 'DEBIT';
  }
}

/**
 * Format money amount for display
 */
export function formatMoneyAmount(money: MoneyAmount, locale: string = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(money.amount / 100);
}

/**
 * Convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rate: number
): number {
  if (fromCurrency === toCurrency) return amount;
  return Math.round(amount * rate);
}

/**
 * Check if a tax filing is overdue
 */
export function isTaxFilingOverdue(filing: TaxFiling): boolean {
  if (filing.status === 'SUBMITTED' || filing.status === 'ACCEPTED' || filing.status === 'PAID') {
    return false;
  }
  return new Date() > filing.deadline;
}

/**
 * Calculate days until deadline
 */
export function daysUntilDeadline(deadline: Date): number {
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// RE-EXPORTS FROM FINANCE
// ============================================================================

// Re-export CurrencyCode for convenience
export type { CurrencyCode } from './finance';
