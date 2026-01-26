/**
 * Affiliate Types - Frontend
 *
 * Type definitions for the affiliate system on the frontend.
 * These are simplified versions of the backend types, suitable for UI display.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type CommissionType = "fixed" | "percentage" | "hybrid";

export type CommissionActionType =
  | "referral_signup"
  | "referral_first_call"
  | "referral_recurring_call"
  | "referral_subscription"
  | "referral_subscription_renewal"
  | "referral_provider_validated"
  | "manual_adjustment";

export type CommissionStatus = "pending" | "available" | "paid" | "cancelled";

export type PayoutStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "rejected";

export type AffiliateStatus = "active" | "suspended" | "flagged";

export type BankAccountType = "iban" | "uk_sort_code" | "us_aba" | "other";

// ============================================================================
// CAPTURED RATES
// ============================================================================

export interface CapturedRates {
  capturedAt: string;
  configVersion: string;
  signupBonus: number;
  callCommissionRate: number;
  callFixedBonus: number;
  subscriptionRate: number;
  subscriptionFixedBonus: number;
  providerValidationBonus: number;
  commissionRules?: Record<string, { type: CommissionType; fixedAmount?: number; percentage?: number }>;
}

// ============================================================================
// AFFILIATE STATS
// ============================================================================

export interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommissions: number;
  byType: {
    signup: { count: number; amount: number };
    firstCall: { count: number; amount: number };
    recurringCall: { count: number; amount: number };
    subscription: { count: number; amount: number };
    renewal: { count: number; amount: number };
    providerBonus: { count: number; amount: number };
  };
}

// ============================================================================
// AFFILIATE DATA (from getMyAffiliateData)
// ============================================================================

export interface AffiliateData {
  affiliateCode: string;
  referredBy: string | null;
  capturedRates: CapturedRates | null;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  totalReferrals: number;
  activeReferrals: number;
  affiliateStats: AffiliateStats;
  hasBankDetails: boolean;
  maskedBankAccount?: string;
  bankAccountType?: BankAccountType;
  bankCurrency?: string;
  pendingPayoutId: string | null;
  recentCommissions: AffiliateCommissionSummary[];
}

export interface AffiliateCommissionSummary {
  id: string;
  type: CommissionActionType;
  amount: number;
  status: CommissionStatus;
  refereeEmail: string;
  createdAt: string;
}

// ============================================================================
// COMMISSION (full record for history)
// ============================================================================

export interface AffiliateCommission {
  id: string;
  referrerId: string;
  referrerEmail: string;
  referrerAffiliateCode: string;
  referredUserId: string;
  refereeEmail: string;
  actionType: CommissionActionType;
  commissionType: CommissionType;
  sourceId: string | null;
  sourceType: "call_session" | "payment" | "subscription" | "user" | null;
  baseAmount: number | null;
  rateApplied: number | null;
  fixedAmount: number | null;
  amount: number;
  currency: "EUR";
  calculationDetails: string;
  status: CommissionStatus;
  availableAt: string | null;
  payoutId: string | null;
  paidAt: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PAYOUT
// ============================================================================

export interface AffiliatePayout {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  sourceCurrency: "EUR";
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  status: PayoutStatus;
  bankDetailsSnapshot: {
    accountType: BankAccountType;
    accountHolderName: string;
    country: string;
    currency: string;
    maskedAccount: string;
  };
  commissionIds: string[];
  commissionCount: number;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  estimatedArrival?: string;
  // Wise integration
  wiseTransferId?: string;
  wiseState?: string;
  wiseStateUpdatedAt?: string;
}

// ============================================================================
// REFERRAL
// ============================================================================

export interface Referral {
  id: string;
  referrerId: string;
  referrerEmail: string;
  referrerCode: string;
  referredUserId: string;
  referredUserEmail: string;
  refereeRole: string;
  status: "active" | "inactive";
  createdAt: string;
  firstActionAt: string | null;
  totalCommissions: number;
}

// ============================================================================
// BANK DETAILS (for form)
// ============================================================================

export interface BankDetailsInput {
  accountType: BankAccountType;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  country: string;
  currency: string;
  sortCode?: string;
  routingNumber?: string;
  swiftBic?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

// ============================================================================
// WITHDRAWAL REQUEST
// ============================================================================

export interface WithdrawalRequest {
  amount?: number; // If not provided, withdraw all
}

export interface WithdrawalResponse {
  success: boolean;
  message?: string;
  payoutId?: string;
  amount?: number;
  status?: PayoutStatus;
  estimatedArrival?: string;
}

// ============================================================================
// ADMIN TYPES
// ============================================================================

export interface AffiliateGlobalStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalReferrals: number;
  totalCommissionsAmount: number;
  totalPayoutsAmount: number;
  pendingPayouts: {
    count: number;
    amount: number;
  };
  totalToDisburse: number;
  commissionsToday: {
    count: number;
    amount: number;
  };
  commissionsThisMonth: {
    count: number;
    amount: number;
  };
  topAffiliates: Array<{
    id: string;
    email: string;
    affiliateCode: string;
    totalEarned: number;
    referralCount: number;
  }>;
  fraudAlertsPending: number;
}

export interface CommissionRule {
  enabled: boolean;
  type: CommissionType;
  fixedAmount: number;
  percentageRate: number;
  baseAmount: number | null;
  applyTo?: "connection_fee" | "total_amount" | "first_month" | "annual_value";
  conditions: {
    requireEmailVerification?: boolean;
    minAccountAgeDays?: number;
    onlyFirstTime?: boolean;
    minCallDuration?: number;
    providerTypes?: ("lawyer" | "expat")[];
    maxCallsPerMonth?: number;
    lifetimeLimit?: number;
    planTypes?: string[];
    onlyFirstSubscription?: boolean;
    maxMonths?: number;
    requireKYCComplete?: boolean;
    requireFirstCall?: boolean;
  };
  description: string;
}

export interface AffiliateConfig {
  id: "current";
  isSystemActive: boolean;
  withdrawalsEnabled: boolean;
  newAffiliatesEnabled: boolean;
  defaultRates: {
    signupBonus: number;
    callCommissionRate: number;
    callFixedBonus: number;
    subscriptionRate: number;
    subscriptionFixedBonus: number;
    providerValidationBonus: number;
  };
  commissionRules: {
    referral_signup: CommissionRule;
    referral_first_call: CommissionRule;
    referral_recurring_call: CommissionRule;
    referral_subscription: CommissionRule;
    referral_subscription_renewal: CommissionRule;
    referral_provider_validated: CommissionRule;
  };
  withdrawal: {
    minimumAmount: number;
    holdPeriodHours: number;
    maxWithdrawalsPerMonth: number;
    maxAmountPerMonth: number;
  };
  attribution: {
    windowDays: number;
    model: "first_click" | "last_click";
  };
  antiFraud: {
    requireEmailVerification: boolean;
    minAccountAgeDays: number;
    maxReferralsPerDay: number;
    blockSameIPReferrals: boolean;
    blockedEmailDomains: string[];
    maxSignupsPerIPPerHour: number;
    autoFlagThreshold: number;
  };
  version: number;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format cents to currency string
 */
export function formatCents(cents: number, locale = "fr-FR", currency = "EUR"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Get human-readable label for commission calculation type (fixed, percentage, hybrid)
 */
export function getCommissionTypeLabel(type: CommissionType, lang = "fr"): string {
  const labels: Record<CommissionType, { fr: string; en: string }> = {
    fixed: { fr: "Fixe", en: "Fixed" },
    percentage: { fr: "Pourcentage", en: "Percentage" },
    hybrid: { fr: "Hybride", en: "Hybrid" },
  };

  return labels[type]?.[lang as "fr" | "en"] || type;
}

/**
 * Get human-readable label for commission action type
 */
export function getCommissionActionTypeLabel(type: CommissionActionType, lang = "fr"): string {
  const labels: Record<CommissionActionType, { fr: string; en: string }> = {
    referral_signup: { fr: "Inscription", en: "Sign up" },
    referral_first_call: { fr: "Premier appel", en: "First call" },
    referral_recurring_call: { fr: "Appel récurrent", en: "Recurring call" },
    referral_subscription: { fr: "Abonnement", en: "Subscription" },
    referral_subscription_renewal: { fr: "Renouvellement", en: "Renewal" },
    referral_provider_validated: { fr: "Prestataire validé", en: "Provider validated" },
    manual_adjustment: { fr: "Ajustement", en: "Adjustment" },
  };

  return labels[type]?.[lang as "fr" | "en"] || type;
}

/**
 * Get human-readable label for commission status
 */
export function getCommissionStatusLabel(status: CommissionStatus, lang = "fr"): string {
  const labels: Record<CommissionStatus, { fr: string; en: string }> = {
    pending: { fr: "En attente", en: "Pending" },
    available: { fr: "Disponible", en: "Available" },
    paid: { fr: "Payé", en: "Paid" },
    cancelled: { fr: "Annulé", en: "Cancelled" },
  };

  return labels[status]?.[lang as "fr" | "en"] || status;
}

/**
 * Get human-readable label for payout status
 */
export function getPayoutStatusLabel(status: PayoutStatus, lang = "fr"): string {
  const labels: Record<PayoutStatus, { fr: string; en: string }> = {
    pending: { fr: "En attente", en: "Pending" },
    approved: { fr: "Approuvé", en: "Approved" },
    processing: { fr: "En cours", en: "Processing" },
    completed: { fr: "Terminé", en: "Completed" },
    failed: { fr: "Échoué", en: "Failed" },
    rejected: { fr: "Rejeté", en: "Rejected" },
  };

  return labels[status]?.[lang as "fr" | "en"] || status;
}

/**
 * Get status color classes for UI
 */
export function getStatusColor(status: CommissionStatus | PayoutStatus): string {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    available: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    paid: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    cancelled: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    approved: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    processing: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    completed: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  return colors[status] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400";
}

/**
 * Generate share URL for affiliate code
 */
export function getAffiliateShareUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || typeof window !== "undefined" ? window.location.origin : "https://sos-expat.com";
  return `${base}?ref=${code}`;
}
