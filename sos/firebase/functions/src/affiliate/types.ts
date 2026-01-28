/**
 * Affiliate System Types
 *
 * Complete type definitions for the SOS-Expat affiliate/referral program.
 * Supports:
 * - Fixed, percentage, and hybrid commissions
 * - Multiple action types (signup, calls, subscriptions, etc.)
 * - Lifetime frozen rates (capturedRates)
 * - Wise integration for payouts
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Commission calculation type
 */
export type CommissionType = "fixed" | "percentage" | "hybrid";

/**
 * Actions that can generate commissions
 */
export type CommissionActionType =
  | "referral_signup" // Referral signs up
  | "referral_first_call" // First call by referral
  | "referral_recurring_call" // Subsequent calls by referral
  | "referral_subscription" // Subscription created
  | "referral_subscription_renewal" // Subscription renewed
  | "referral_provider_validated" // Provider completed KYC
  | "manual_adjustment"; // Admin manual adjustment

/**
 * Commission status lifecycle
 */
export type CommissionStatus =
  | "pending" // In hold period
  | "available" // Ready for withdrawal
  | "paid" // Included in a payout
  | "cancelled"; // Cancelled by admin or system

/**
 * Payout status lifecycle
 */
export type PayoutStatus =
  | "pending" // Requested, waiting for admin validation
  | "approved" // Admin approved, ready for processing
  | "processing" // Wise transfer initiated
  | "completed" // Wise transfer successful
  | "failed" // Wise transfer failed
  | "rejected"; // Admin rejected

/**
 * Affiliate status
 */
export type AffiliateStatus = "active" | "suspended" | "flagged";

/**
 * Bank account types supported by Wise
 */
export type BankAccountType =
  | "iban" // Europe (SEPA)
  | "sort_code" // UK
  | "aba" // USA
  | "bsb" // Australia
  | "clabe" // Mexico
  | "ifsc"; // India

// ============================================================================
// BANK DETAILS
// ============================================================================

/**
 * Encrypted bank details for payouts
 * All sensitive fields are AES-256-GCM encrypted
 */
export interface BankDetails {
  /** Bank account type */
  accountType: BankAccountType;

  /** Account holder name (encrypted) */
  accountHolderName: string;

  /** Country code (ISO 3166-1 alpha-2) */
  country: string;

  /** Target currency for payouts */
  currency: string;

  // IBAN (Europe)
  iban?: string; // Encrypted

  // Sort Code (UK)
  sortCode?: string; // Encrypted
  accountNumber?: string; // Encrypted (also used for USA ABA)

  // ABA Routing (USA)
  routingNumber?: string; // Encrypted

  // SWIFT/BIC (international)
  bic?: string; // Encrypted

  /** Address fields for compliance */
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  /** When the bank details were last updated */
  updatedAt: Timestamp;

  /** Whether bank details have been verified */
  isVerified: boolean;

  /** Wise recipient ID if already created */
  wiseRecipientId?: string;
}

// ============================================================================
// CAPTURED RATES (FROZEN AT SIGNUP)
// ============================================================================

/**
 * Commission rates captured at user signup
 * These rates NEVER change for the user, even if global config changes
 */
export interface CapturedRates {
  /** When rates were captured */
  capturedAt: Timestamp;

  /** Config version at capture time (for audit) */
  configVersion: string;

  // ---- Per-action rates ----

  /** Fixed bonus per referral signup (cents) */
  signupBonus: number;

  /** Commission rate on calls (0.75 = 75%) */
  callCommissionRate: number;

  /** Fixed bonus per call (cents) */
  callFixedBonus: number;

  /** Commission rate on subscriptions (0.15 = 15%) */
  subscriptionRate: number;

  /** Fixed bonus per subscription (cents) */
  subscriptionFixedBonus: number;

  /** Fixed bonus when provider completes KYC (cents) */
  providerValidationBonus: number;
}

// ============================================================================
// USER AFFILIATE FIELDS
// ============================================================================

/**
 * Affiliate-related fields stored in the user document
 * Path: users/{uid}
 */
export interface UserAffiliateFields {
  /** Unique affiliate code (6-8 alphanumeric) - NEVER changes */
  affiliateCode: string;

  /** Who referred this user (affiliate code) */
  referredBy: string | null;

  /** UID of the referrer */
  referredByUserId: string | null;

  /** When the referral was captured */
  referredAt: Timestamp | null;

  /** Referral tracking info */
  referralTracking?: {
    /** UTM parameters captured at referral */
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    /** Landing page URL */
    landingPage?: string;
    /** User agent at referral */
    userAgent?: string;
    /** IP address (for fraud detection) */
    ip?: string;
  };

  // ---- Rates (frozen at signup) ----

  /** Commission rates frozen at signup */
  capturedRates: CapturedRates;

  // ---- Balances ----

  /** Total earned all time (cents) - never decreases */
  totalEarned: number;

  /** Available for withdrawal (cents) */
  availableBalance: number;

  /** Pending (in hold period, not yet available) (cents) */
  pendingBalance: number;

  // ---- Statistics ----

  /** Affiliate statistics */
  affiliateStats: {
    /** Total number of referrals */
    totalReferrals: number;
    /** Referrals who completed at least one action */
    activeReferrals: number;
    /** Total number of commissions */
    totalCommissions: number;
    /** Breakdown by action type */
    byType: {
      signup: { count: number; amount: number };
      firstCall: { count: number; amount: number };
      recurringCall: { count: number; amount: number };
      subscription: { count: number; amount: number };
      renewal: { count: number; amount: number };
      providerBonus: { count: number; amount: number };
    };
  };

  // ---- Bank & Payout ----

  /** Encrypted bank details */
  bankDetails: BankDetails | null;

  /** Current payout in progress (if any) */
  pendingPayoutId: string | null;

  /** Affiliate status */
  affiliateStatus: AffiliateStatus;

  /** Admin notes (internal) */
  affiliateAdminNotes?: string;
}

// ============================================================================
// COMMISSION DOCUMENT
// ============================================================================

/**
 * Individual commission record
 * Collection: affiliate_commissions/{commissionId}
 */
export interface AffiliateCommission {
  /** Document ID */
  id: string;

  // ---- Actors ----

  /** Affiliate who earns the commission */
  referrerId: string;
  referrerEmail: string;
  referrerAffiliateCode: string;

  /** Referral who generated the commission */
  refereeId: string;
  refereeEmail: string;

  // ---- Action Type ----

  /** Type of action that generated this commission */
  type: CommissionActionType;

  // ---- Source Reference ----

  /** ID of the source document */
  sourceId: string | null;

  /** Type of source document */
  sourceType: "call_session" | "payment" | "subscription" | "user" | null;

  /** Additional source details */
  sourceDetails?: {
    // For calls
    callSessionId?: string;
    providerType?: "lawyer" | "expat";
    callDuration?: number;
    connectionFee?: number;

    // For payments
    paymentId?: string;
    paymentSource?: "stripe" | "paypal";
    invoiceId?: string;

    // For subscriptions
    subscriptionId?: string;
    planName?: string;
    billingPeriod?: "monthly" | "yearly";
  };

  // ---- Calculation ----

  /** How the commission was calculated */
  calculationType: CommissionType;

  /** Base amount for percentage calculation (cents) */
  baseAmount: number | null;

  /** Rate applied (0.75 = 75%) */
  rateApplied: number | null;

  /** Fixed amount component (cents) */
  fixedAmount: number | null;

  /** Final commission amount (cents) */
  amount: number;

  /** Currency (USD) */
  currency: "USD";

  /** Human-readable calculation explanation */
  calculationDetails: string;

  // ---- Status ----

  /** Current status */
  status: CommissionStatus;

  /** When the commission becomes available */
  availableAt: Timestamp | null;

  /** Cancellation details */
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Timestamp;

  // ---- Payout ----

  /** Payout that included this commission */
  payoutId: string | null;

  /** When the payout was completed */
  paidAt: Timestamp | null;

  // ---- Metadata ----

  /** Human-readable description */
  description: string;

  /** Admin notes */
  adminNotes?: string;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Last update timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// PAYOUT DOCUMENT
// ============================================================================

/**
 * Payout request record
 * Collection: affiliate_payouts/{payoutId}
 */
export interface AffiliatePayout {
  /** Document ID */
  id: string;

  /** User who requested the payout */
  userId: string;
  userEmail: string;
  userName: string;

  /** Amount requested (cents) */
  amount: number;

  /** Original currency (USD) */
  sourceCurrency: "USD";

  /** Target currency for payout */
  targetCurrency: string;

  /** Exchange rate at time of processing */
  exchangeRate?: number;

  /** Amount after conversion */
  convertedAmount?: number;

  /** Current status */
  status: PayoutStatus;

  // ---- Bank Details (snapshot) ----

  /** Bank details snapshot at request time */
  bankDetailsSnapshot: {
    accountType: BankAccountType;
    accountHolderName: string; // Encrypted
    country: string;
    currency: string;
    /** Masked IBAN/account for display */
    maskedAccount: string;
  };

  // ---- Commission References ----

  /** Commission IDs included in this payout */
  commissionIds: string[];

  /** Number of commissions */
  commissionCount: number;

  // ---- Wise Integration ----

  /** Wise recipient ID */
  wiseRecipientId?: string;

  /** Wise quote ID */
  wiseQuoteId?: string;

  /** Wise transfer ID */
  wiseTransferId?: string;

  /** Wise transfer status */
  wiseTransferStatus?: string;

  /** Estimated arrival date */
  estimatedArrival?: Timestamp;

  // ---- Timestamps ----

  /** When the payout was requested */
  requestedAt: Timestamp;

  /** When admin approved/rejected */
  processedAt?: Timestamp;

  /** Who processed it */
  processedBy?: string;

  /** Rejection reason if applicable */
  rejectionReason?: string;

  /** When Wise transfer completed */
  completedAt?: Timestamp;

  /** When it failed (if applicable) */
  failedAt?: Timestamp;

  /** Failure reason */
  failureReason?: string;

  /** Admin notes */
  adminNotes?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Commission rule for a specific action type
 */
export interface CommissionRule {
  /** Whether this rule is enabled */
  enabled: boolean;

  /** Commission calculation type */
  type: CommissionType;

  /** Fixed amount (cents) */
  fixedAmount: number;

  /** Percentage rate (0.75 = 75%) */
  percentageRate: number;

  /** Base amount for hybrid (cents) - added to percentage */
  baseAmount: number | null;

  /** What to apply percentage to */
  applyTo?: "connection_fee" | "total_amount" | "first_month" | "annual_value";

  /** Conditions for this rule */
  conditions: {
    /** Require email verification */
    requireEmailVerification?: boolean;

    /** Minimum account age (days) */
    minAccountAgeDays?: number;

    /** Only trigger once per referral */
    onlyFirstTime?: boolean;

    /** Minimum call duration (seconds) */
    minCallDuration?: number;

    /** Provider types that trigger commission */
    providerTypes?: ("lawyer" | "expat")[];

    /** Maximum commissions per month (0 = unlimited) */
    maxCallsPerMonth?: number;

    /** Maximum commissions lifetime (0 = unlimited) */
    lifetimeLimit?: number;

    /** Plan types for subscription */
    planTypes?: string[];

    /** Only first subscription */
    onlyFirstSubscription?: boolean;

    /** Maximum months for recurring (0 = forever) */
    maxMonths?: number;

    /** Require KYC completion */
    requireKYCComplete?: boolean;

    /** Require first call */
    requireFirstCall?: boolean;
  };

  /** Human-readable description */
  description: string;
}

/**
 * Anti-fraud settings
 */
export interface AntiFraudSettings {
  /** Require email verification for commission */
  requireEmailVerification: boolean;

  /** Minimum account age (days) before earning */
  minAccountAgeDays: number;

  /** Maximum referrals per day per affiliate */
  maxReferralsPerDay: number;

  /** Block referrals from same IP as affiliate */
  blockSameIPReferrals: boolean;

  /** Blocked email domains (disposable emails) */
  blockedEmailDomains: string[];

  /** Rate limit: max signups per IP per hour */
  maxSignupsPerIPPerHour: number;

  /** Auto-flag affiliate after this many suspicious referrals */
  autoFlagThreshold: number;
}

/**
 * Complete affiliate configuration
 * Collection: affiliate_config/current
 */
export interface AffiliateConfig {
  /** Document ID (always "current") */
  id: "current";

  // ---- System Status ----

  /** Is the affiliate system active */
  isSystemActive: boolean;

  /** Are withdrawals enabled */
  withdrawalsEnabled: boolean;

  /** Are new affiliates accepted */
  newAffiliatesEnabled: boolean;

  // ---- Default Rates (for new signups) ----

  defaultRates: {
    signupBonus: number; // cents
    callCommissionRate: number; // 0.75 = 75%
    callFixedBonus: number; // cents
    subscriptionRate: number; // 0.15 = 15%
    subscriptionFixedBonus: number; // cents
    providerValidationBonus: number; // cents
  };

  // ---- Commission Rules ----

  commissionRules: {
    referral_signup: CommissionRule;
    referral_first_call: CommissionRule;
    referral_recurring_call: CommissionRule;
    referral_subscription: CommissionRule;
    referral_subscription_renewal: CommissionRule;
    referral_provider_validated: CommissionRule;
  };

  // ---- Withdrawal Settings ----

  withdrawal: {
    /** Minimum withdrawal amount (cents) */
    minimumAmount: number;

    /** Hold period before commission is available (hours) */
    holdPeriodHours: number;

    /** Maximum withdrawals per month (0 = unlimited) */
    maxWithdrawalsPerMonth: number;

    /** Maximum withdrawal amount per month (cents, 0 = unlimited) */
    maxAmountPerMonth: number;
  };

  // ---- Attribution ----

  attribution: {
    /** Cookie/localStorage duration (days) */
    windowDays: number;

    /** Attribution model */
    model: "first_click" | "last_click";
  };

  // ---- Anti-Fraud ----

  antiFraud: AntiFraudSettings;

  // ---- Version & History ----

  /** Config version (incremented on each save) */
  version: number;

  /** History of changes */
  rateHistory: Array<{
    changedAt: Timestamp;
    changedBy: string;
    changedByEmail: string;
    previousRates: Record<string, unknown>;
    newRates: Record<string, unknown>;
    reason: string;
  }>;

  /** Last update */
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// FRAUD ALERT
// ============================================================================

/**
 * Fraud alert record
 * Collection: affiliate_fraud_alerts/{alertId}
 */
export interface AffiliateFraudAlert {
  id: string;

  /** Alert type */
  type:
    | "same_ip"
    | "rapid_signups"
    | "disposable_email"
    | "suspicious_pattern"
    | "device_fingerprint"
    | "high_refund_rate"
    | "rate_limit";

  /** Severity */
  severity: "low" | "medium" | "high" | "critical";

  /** Affiliate involved */
  affiliateId: string;
  affiliateEmail: string;
  affiliateCode: string;

  /** Referrals involved (if applicable) */
  referralIds?: string[];

  /** Alert details */
  details: {
    /** IP addresses involved */
    ips?: string[];
    /** Email domains */
    emailDomains?: string[];
    /** Device fingerprints */
    deviceFingerprints?: string[];
    /** Description */
    description: string;
  };

  /** Alert status */
  status: "pending" | "investigating" | "resolved" | "false_positive";

  /** Resolution details */
  resolution?: {
    action: "blocked" | "warned" | "cleared";
    resolvedBy: string;
    resolvedAt: Timestamp;
    notes: string;
  };

  /** Timestamps */
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// AGGREGATED STATS (for admin dashboard)
// ============================================================================

/**
 * Daily affiliate statistics
 * Collection: affiliate_stats/{date}
 */
export interface AffiliateDailyStats {
  /** Date in YYYY-MM-DD format */
  date: string;

  /** Total new affiliates */
  newAffiliates: number;

  /** Total new referrals */
  newReferrals: number;

  /** Commissions created */
  commissionsCreated: {
    count: number;
    amount: number; // cents
  };

  /** Commissions by type */
  commissionsByType: {
    [key in CommissionActionType]?: {
      count: number;
      amount: number;
    };
  };

  /** Payouts */
  payouts: {
    requested: { count: number; amount: number };
    completed: { count: number; amount: number };
    failed: { count: number; amount: number };
  };

  /** Fraud alerts */
  fraudAlerts: {
    total: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };

  /** Updated timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// INPUT/OUTPUT TYPES FOR CALLABLES
// ============================================================================

export interface GetAffiliateDataResponse {
  affiliateCode: string;
  referredBy: string | null;
  capturedRates: CapturedRates;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  affiliateStats: UserAffiliateFields["affiliateStats"];
  hasBankDetails: boolean;
  pendingPayoutId: string | null;
  recentCommissions: Array<{
    id: string;
    type: CommissionActionType;
    amount: number;
    status: CommissionStatus;
    refereeEmail: string;
    createdAt: string;
  }>;
}

export interface UpdateBankDetailsInput {
  accountType: BankAccountType;
  accountHolderName: string;
  country: string;
  currency: string;
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bic?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface RequestWithdrawalInput {
  amount?: number; // If not provided, withdraw all available
}

export interface RequestWithdrawalResponse {
  payoutId: string;
  amount: number;
  status: PayoutStatus;
  estimatedArrival?: string;
}

// ============================================================================
// ADMIN INPUT/OUTPUT TYPES
// ============================================================================

export interface AdminUpdateConfigInput {
  config: Partial<Omit<AffiliateConfig, "id" | "version" | "rateHistory" | "updatedAt" | "updatedBy">>;
  reason: string;
}

export interface AdminAdjustCommissionInput {
  commissionId: string;
  newAmount: number;
  reason: string;
}

export interface AdminCancelCommissionInput {
  commissionId: string;
  reason: string;
}

export interface AdminProcessPayoutInput {
  payoutId: string;
}

export interface AdminRejectPayoutInput {
  payoutId: string;
  reason: string;
}

export interface AdminGetGlobalStatsResponse {
  totalAffiliates: number;
  activeAffiliates: number;
  totalReferrals: number;
  totalCommissionsAmount: number;
  totalPayoutsAmount: number;
  pendingPayouts: {
    count: number;
    amount: number;
  };
  totalToDisburse: number; // Sum of all availableBalance
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

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

/**
 * Default affiliate configuration
 */
export const DEFAULT_AFFILIATE_CONFIG: Omit<
  AffiliateConfig,
  "updatedAt" | "updatedBy" | "rateHistory"
> = {
  id: "current",
  isSystemActive: true,
  withdrawalsEnabled: true,
  newAffiliatesEnabled: true,

  defaultRates: {
    signupBonus: 200, // 2€
    callCommissionRate: 0.75, // 75%
    callFixedBonus: 0,
    subscriptionRate: 0.15, // 15%
    subscriptionFixedBonus: 0,
    providerValidationBonus: 2000, // 20€
  },

  commissionRules: {
    referral_signup: {
      enabled: true,
      type: "fixed",
      fixedAmount: 200, // 2€
      percentageRate: 0,
      baseAmount: null,
      conditions: {
        requireEmailVerification: true,
        minAccountAgeDays: 0,
        onlyFirstTime: true,
      },
      description: "2€ par inscription validée",
    },
    referral_first_call: {
      enabled: true,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0.5, // 50%
      baseAmount: null,
      applyTo: "connection_fee",
      conditions: {
        minCallDuration: 120, // 2 minutes
        providerTypes: ["lawyer", "expat"],
      },
      description: "50% des frais de connexion du 1er appel",
    },
    referral_recurring_call: {
      enabled: true,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0.2, // 20%
      baseAmount: null,
      applyTo: "connection_fee",
      conditions: {
        minCallDuration: 120,
        providerTypes: ["lawyer", "expat"],
        maxCallsPerMonth: 0, // unlimited
        lifetimeLimit: 0, // unlimited
      },
      description: "20% des frais de connexion des appels suivants",
    },
    referral_subscription: {
      enabled: true,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0.15, // 15%
      baseAmount: null,
      applyTo: "first_month",
      conditions: {
        planTypes: ["solo", "multi", "enterprise"],
        onlyFirstSubscription: true,
      },
      description: "15% du premier mois d'abonnement",
    },
    referral_subscription_renewal: {
      enabled: true,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0.05, // 5%
      baseAmount: null,
      conditions: {
        maxMonths: 12, // 1 year
      },
      description: "5% des renouvellements (max 12 mois)",
    },
    referral_provider_validated: {
      enabled: true,
      type: "fixed",
      fixedAmount: 2000, // 20€
      percentageRate: 0,
      baseAmount: null,
      conditions: {
        requireKYCComplete: true,
        requireFirstCall: false,
      },
      description: "20€ si prestataire parrainé complète son KYC",
    },
  },

  withdrawal: {
    minimumAmount: 3000, // 30€
    holdPeriodHours: 24, // 24 hours
    maxWithdrawalsPerMonth: 0, // unlimited
    maxAmountPerMonth: 0, // unlimited
  },

  attribution: {
    windowDays: 30,
    model: "first_click",
  },

  antiFraud: {
    requireEmailVerification: true,
    minAccountAgeDays: 0,
    maxReferralsPerDay: 50,
    blockSameIPReferrals: true,
    blockedEmailDomains: [
      "tempmail.com",
      "throwaway.email",
      "guerrillamail.com",
      "10minutemail.com",
      "mailinator.com",
      "yopmail.com",
    ],
    maxSignupsPerIPPerHour: 10,
    autoFlagThreshold: 5,
  },

  version: 1,
};
