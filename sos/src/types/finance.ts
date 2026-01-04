/**
 * Finance Types for Admin Dashboard
 * Complete TypeScript types and interfaces for the admin finance section
 * @module types/finance
 */

// ============================================================================
// ENUMS AND TYPE ALIASES
// ============================================================================

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'cancelled';

export type PaymentMethod =
  | 'stripe'
  | 'paypal'
  | 'card'
  | 'sepa'
  | 'bank_transfer';

export type TransactionType =
  | 'call_payment'
  | 'subscription'
  | 'refund'
  | 'payout'
  | 'adjustment'
  | 'dispute';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR' | 'BRL';

/** @deprecated Use CurrencyCode instead */
export type Currency = 'EUR' | 'USD';

export type DisputeStatus = 'open' | 'under_review' | 'won' | 'lost' | 'closed';

export type RefundRequestStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';

export type RefundReason =
  | 'service_not_provided'
  | 'technical_issue'
  | 'provider_no_show'
  | 'quality_issue'
  | 'duplicate_charge'
  | 'other';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// LEGACY INTERFACES (backward compatibility)
// ============================================================================

export interface CurrencyRate {
  base: Currency;
  quote: Currency;
  rate: number;
  asOf: string;
}

export interface TaxRate {
  id: string;
  country: string;
  name: string;
  rate: number;
}

export interface Payment {
  id: string;
  created: string;
  amount: number;
  currency: Currency;
  country?: string;
  status: 'succeeded' | 'refunded' | 'failed' | 'disputed';
  fee?: number;
  invoiceId?: string;
  tax?: number;
}

export interface Invoice {
  id: string;
  created: string;
  total: number;
  currency: Currency;
  country?: string;
  tax?: number;
  taxRates?: TaxRate[];
  paid: boolean;
}

export interface Dispute {
  id: string;
  paymentId: string;
  amount: number;
  currency: Currency;
  status: 'needs_response' | 'warning_closed' | 'won' | 'lost';
  created: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  currency: Currency;
  created: string;
}

export interface RefundRequest {
  id: string;
  clientId: string;
  clientEmail?: string;
  paymentId: string;
  paymentIntentId?: string;
  sessionId?: string;
  providerId?: string;
  amount: number;
  currency: Currency;
  reason: RefundReason;
  description?: string;
  status: RefundRequestStatus;
  adminNotes?: string;
  processedBy?: string;
  processedAt?: string;
  refundId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CountryAmount {
  country: string;
  currency: Currency;
  gross: number;
  net: number;
  tax: number;
  count: number;
}

export interface VatBucket {
  country: string;
  rate: number;
  taxable: number;
  tax: number;
}

// ============================================================================
// ADMIN DASHBOARD INTERFACES
// ============================================================================

export interface InvoiceReference {
  id: string;
  invoiceNumber: string;
  type: 'platform' | 'provider' | 'client';
  downloadUrl: string;
  amount: number;
  createdAt: Date;
}

export interface AdminPaymentRecord {
  id: string;
  amount: number;
  amountInEuros?: number;
  currency: CurrencyCode;
  providerAmount?: number;
  commissionAmount?: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionType: TransactionType;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  clientCountry?: string;
  providerId: string;
  providerName?: string;
  providerEmail?: string;
  providerCountry?: string;
  callSessionId?: string;
  subscriptionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  invoices?: InvoiceReference[];
  createdAt: Date;
  updatedAt?: Date;
  capturedAt?: Date;
  refundedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AdminSubscriptionRecord {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: SubscriptionStatus;
  pricePerMonth: number;
  currency: CurrencyCode;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialEnd?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  quotaUsed: number;
  quotaLimit: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AdminRefundRecord {
  id: string;
  paymentId: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedBy: string;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  stripeRefundId?: string;
  paypalRefundId?: string;
  notes?: string;
}

export interface AdminDisputeRecord {
  id: string;
  paymentId: string;
  amount: number;
  currency: CurrencyCode;
  status: DisputeStatus;
  reason: string;
  evidence?: {
    documents: string[];
    submittedAt?: Date;
  };
  stripeDisputeId?: string;
  paypalDisputeId?: string;
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  dueBy?: Date;
}

export interface AdminPayoutRecord {
  id: string;
  providerId: string;
  providerName?: string;
  providerEmail?: string;
  amount: number;
  currency: CurrencyCode;
  status: PayoutStatus;
  paymentMethod: 'bank_transfer' | 'wise' | 'paypal' | 'stripe_connect';
  bankDetails?: {
    accountName?: string;
    iban?: string;
    bic?: string;
    country?: string;
  };
  reference?: string;
  scheduledAt?: Date;
  processedAt?: Date;
  failedReason?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// FILTERS AND KPIS
// ============================================================================

export interface FinanceFilters {
  status?: PaymentStatus | PaymentStatus[] | 'all';
  paymentMethod?: PaymentMethod | 'all';
  transactionType?: TransactionType | 'all';
  country?: string | 'all';
  currency?: CurrencyCode | 'all';
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface FinanceKPIs {
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  revenueByPeriod: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  transactionsByStatus: Record<PaymentStatus, number>;
  transactionsByMethod: Record<PaymentMethod, number>;
  refundsTotal: number;
  refundsCount: number;
  refundRate: number;
  disputesOpen: number;
  disputesTotal: number;
  disputeRate: number;
  subscriptionsMRR: number;
  subscriptionsActive: number;
  subscriptionsChurnRate: number;
  topCountries: Array<{
    country: string;
    revenue: number;
    count: number;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  dateRange: {
    from: Date;
    to: Date;
  };
  filters: FinanceFilters;
  columns: string[];
  includeInvoices: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isPaymentStatus(value: string): value is PaymentStatus {
  return ['pending', 'processing', 'paid', 'captured', 'failed', 'refunded', 'partially_refunded', 'disputed', 'cancelled'].includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return ['stripe', 'paypal', 'card', 'sepa', 'bank_transfer'].includes(value);
}

export function isTransactionType(value: string): value is TransactionType {
  return ['call_payment', 'subscription', 'refund', 'payout', 'adjustment', 'dispute'].includes(value);
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused'].includes(value);
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL'].includes(value);
}

export function isDisputeStatus(value: string): value is DisputeStatus {
  return ['open', 'under_review', 'won', 'lost', 'closed'].includes(value);
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'pending', 'processing', 'paid', 'captured', 'failed', 'refunded', 'partially_refunded', 'disputed', 'cancelled'
] as const;

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'stripe', 'paypal', 'card', 'sepa', 'bank_transfer'
] as const;

export const TRANSACTION_TYPES: readonly TransactionType[] = [
  'call_payment', 'subscription', 'refund', 'payout', 'adjustment', 'dispute'
] as const;

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'paused'
] as const;

export const CURRENCY_CODES: readonly CurrencyCode[] = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL'
] as const;

export const DISPUTE_STATUSES: readonly DisputeStatus[] = [
  'open', 'under_review', 'won', 'lost', 'closed'
] as const;

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'En attente',
  processing: 'En cours',
  paid: 'Payé',
  captured: 'Capturé',
  failed: 'Échoué',
  refunded: 'Remboursé',
  partially_refunded: 'Partiellement remboursé',
  disputed: 'Contesté',
  cancelled: 'Annulé',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  card: 'Carte bancaire',
  sepa: 'Prélèvement SEPA',
  bank_transfer: 'Virement bancaire',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  call_payment: 'Paiement appel',
  subscription: 'Abonnement',
  refund: 'Remboursement',
  payout: 'Reversement',
  adjustment: 'Ajustement',
  dispute: 'Litige',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Actif',
  trialing: 'Essai',
  past_due: 'En retard',
  canceled: 'Annulé',
  unpaid: 'Impayé',
  paused: 'Suspendu',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Ouvert',
  under_review: 'En examen',
  won: 'Gagné',
  lost: 'Perdu',
  closed: 'Fermé',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function formatCurrency(amount: number, currency: CurrencyCode = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function getStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    captured: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
    partially_refunded: 'bg-purple-100 text-purple-800',
    disputed: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
