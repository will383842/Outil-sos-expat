/**
 * Influencer System Types
 *
 * Complete type definitions for the SOS-Expat Influencer program.
 * Supports:
 * - Client referral commissions ($10 base + level/streak/top3 bonuses)
 * - Provider recruitment commissions (fixed $5 for 6 months)
 * - Influencer recruitment commissions ($5 one-time when recruit reaches $50)
 * - Levels 1-5 based on totalEarned (same thresholds as Chatter)
 * - Monthly Top 3 leaderboard with bonus multipliers
 * - Streak bonuses for consecutive daily activity
 * - Promotional tools (banners, widgets, QR codes)
 * - 5% client discount via referral links
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Influencer level (1-5 based on total earnings, aligned with Chatter)
 */
export type InfluencerLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Influencer account status
 * NOTE: Using "banned" for consistency with Chatter system
 */
export type InfluencerStatus =
  | "active"      // Active, can earn commissions
  | "suspended"   // Temporarily suspended by admin
  | "banned";     // Permanently banned (aligned with Chatter terminology)

/**
 * Supported languages for influencers
 */
export type SupportedInfluencerLanguage =
  | "fr"    // French
  | "en"    // English
  | "es"    // Spanish
  | "pt"    // Portuguese
  | "ar"    // Arabic
  | "de"    // German
  | "it"    // Italian
  | "nl"    // Dutch
  | "zh";   // Chinese

/**
 * Commission type for influencers (V2 - Extended)
 */
export type InfluencerCommissionType =
  | "client_referral"       // Client completed a paid call
  | "recruitment"           // Recruited provider received a call (6 months window)
  | "signup_bonus"          // Bonus inscription filleul
  | "first_call"            // Premier appel du filleul
  | "recurring_call"        // Appels récurrents
  | "subscription"          // Souscription abonnement
  | "renewal"               // Renouvellement abonnement
  | "provider_bonus"        // Bonus prestataire validé
  | "manual_adjustment";    // Admin manual adjustment

/**
 * Commission calculation type (V2)
 */
export type CommissionCalculationType = "fixed" | "percentage" | "hybrid";

/**
 * Commission status lifecycle
 */
export type InfluencerCommissionStatus =
  | "pending"       // In validation period (7-14 days)
  | "validated"     // Validated, waiting to be released
  | "available"     // Available for withdrawal
  | "paid"          // Included in a withdrawal
  | "cancelled";    // Cancelled by admin or system

/**
 * Withdrawal status lifecycle
 */
export type InfluencerWithdrawalStatus =
  | "pending"       // Requested, waiting for admin
  | "approved"      // Admin approved, processing
  | "processing"    // Payment in progress
  | "completed"     // Payment successful
  | "failed"        // Payment failed
  | "rejected";     // Admin rejected

/**
 * Payment method for withdrawals
 * NOTE: Aligned with Chatter - includes Mobile Money for African markets
 */
export type InfluencerPaymentMethod =
  | "wise"          // Wise (TransferWise)
  | "mobile_money"  // Mobile Money (Flutterwave) - for African markets
  | "bank_transfer"; // Bank transfer

/**
 * Platform where influencer promotes
 */
export type InfluencerPlatform =
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "whatsapp"
  | "telegram"
  | "snapchat"
  | "reddit"
  | "discord"
  | "blog"
  | "website"
  | "forum"
  | "podcast"
  | "newsletter"
  | "other";

// ============================================================================
// INFLUENCER PROFILE
// ============================================================================

/**
 * Influencer profile document
 * Collection: influencers/{uid}
 */
export interface Influencer {
  /** Document ID (same as user UID) */
  id: string;

  // ---- User Info ----
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;

  /** Profile photo URL */
  photoUrl?: string;

  /** Country of residence */
  country: string;

  /** Primary language */
  language: SupportedInfluencerLanguage;

  /** Additional languages spoken */
  additionalLanguages?: SupportedInfluencerLanguage[];

  /** Main platforms where influencer promotes */
  platforms: InfluencerPlatform[];

  /** Bio/description of their community */
  bio?: string;

  /** Community size estimate */
  communitySize?: number;

  /** Community niche/focus (e.g., "expatriés", "voyageurs", "digital nomads") */
  communityNiche?: string;

  /** Countries where influencer can promote (ISO alpha-2 codes) */
  interventionCountries?: string[];

  /** Social links for verification */
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
    other?: string;
  };

  // ---- Status ----

  /** Account status */
  status: InfluencerStatus;

  /** Admin notes (internal) */
  adminNotes?: string;

  /** Suspension reason if suspended */
  suspensionReason?: string;

  // ---- Affiliate Codes ----

  /** Code for client referrals (e.g., "MARIE123") - provides 5% discount */
  affiliateCodeClient: string;

  /** Code for provider recruitment (e.g., "REC-MARIE123") */
  affiliateCodeRecruitment: string;

  // ---- Balances (in cents) ----

  /** Total earned all time (never decreases) */
  totalEarned: number;

  /** Available for withdrawal */
  availableBalance: number;

  /** Pending (in validation period) */
  pendingBalance: number;

  /** Validated but not yet available */
  validatedBalance: number;

  // ---- Statistics ----

  /** Total clients referred */
  totalClients: number;

  /** Total providers recruited */
  totalRecruits: number;

  /** Total commissions count */
  totalCommissions: number;

  /** Monthly statistics for current month */
  currentMonthStats: {
    clients: number;
    recruits: number;
    earnings: number;
    month: string; // YYYY-MM format
  };

  /** Current month rank (1-indexed, null if not in top 10) */
  currentMonthRank: number | null;

  /** Best ever rank */
  bestRank: number | null;

  // ---- Level & Gamification (aligned with Chatter) ----

  /** Current level (1-5) based on totalEarned */
  level: InfluencerLevel;

  /** Progress towards next level (0-100%) */
  levelProgress: number;

  /** Current streak (consecutive days with activity) */
  currentStreak: number;

  /** Best streak ever */
  bestStreak: number;

  /**
   * Commission multiplier for this month (reward for being top 3 previous month)
   * 1.0 = no bonus, 2.0 = double, 1.5 = +50%, 1.15 = +15%
   */
  monthlyTopMultiplier: number;

  /** Month during which the multiplier is active (YYYY-MM format, null if no active bonus) */
  monthlyTopMultiplierMonth: string | null;

  // ---- Recruitment (who recruited this influencer) ----

  /** Influencer who recruited this one (influencer ID) */
  recruitedBy: string | null;

  /** Recruitment code used */
  recruitedByCode: string | null;

  /** When recruited */
  recruitedAt: Timestamp | null;

  // ---- Payment Details ----

  /** Preferred payment method */
  preferredPaymentMethod: InfluencerPaymentMethod | null;

  /** Payment details (varies by method) */
  paymentDetails: InfluencerPaymentDetails | null;

  /** Current pending withdrawal ID */
  pendingWithdrawalId: string | null;

  // ---- V2: Captured Rates ----

  /** Commission rates frozen at registration */
  capturedRates?: InfluencerCapturedRates;

  /** Total amount withdrawn all time */
  totalWithdrawn: number;

  // ---- Timestamps ----

  /** Registration date */
  createdAt: Timestamp;

  /** Last update */
  updatedAt: Timestamp;

  /** Last login */
  lastLoginAt: Timestamp | null;

  /** Last activity date (for ranking calculation) */
  lastActivityDate: string | null; // YYYY-MM-DD

  // ---- TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD) ----

  /** Whether terms were accepted */
  termsAccepted?: boolean;

  /** ISO timestamp of terms acceptance */
  termsAcceptedAt?: string;

  /** Version of terms accepted (e.g., "3.0") */
  termsVersion?: string;

  /** Type of terms (e.g., "terms_influencers") */
  termsType?: string;

  /** Metadata about the acceptance context */
  termsAcceptanceMeta?: {
    userAgent: string;
    language: string;
    timestamp: number;
    acceptanceMethod: string;
    ipHash?: string;
  };
}

/**
 * Payment details union type
 * NOTE: Aligned with Chatter - includes Mobile Money support
 */
export type InfluencerPaymentDetails =
  | InfluencerWiseDetails
  | InfluencerMobileMoneyDetails
  | InfluencerBankDetails;

/**
 * Wise payment details
 */
export interface InfluencerWiseDetails {
  type: "wise";
  email: string;
  currency: string;
  accountHolderName: string;
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bic?: string;
}

/**
 * Mobile Money payment details
 * NOTE: Added for alignment with Chatter system - supports African markets
 */
export interface InfluencerMobileMoneyDetails {
  type: "mobile_money";
  provider: "mtn" | "orange" | "moov" | "airtel" | "mpesa" | "wave";
  phoneNumber: string;
  country: string;
  currency: string;
  accountName: string;
}

/**
 * Bank transfer details
 */
export interface InfluencerBankDetails {
  type: "bank_transfer";
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  country: string;
  currency: string;
}

// ============================================================================
// COMMISSION DOCUMENT
// ============================================================================

/**
 * Individual commission record
 * Collection: influencer_commissions/{commissionId}
 */
export interface InfluencerCommission {
  /** Document ID */
  id: string;

  // ---- Influencer ----

  /** Influencer who earns the commission */
  influencerId: string;
  influencerEmail: string;
  influencerCode: string;

  // ---- Commission Type ----

  /** Type of commission */
  type: InfluencerCommissionType;

  // ---- Source Reference ----

  /** ID of the source (call session, user, etc.) */
  sourceId: string | null;

  /** Type of source */
  sourceType: "call_session" | "user" | "provider" | null;

  /** Additional source details */
  sourceDetails?: {
    // For client referral
    clientId?: string;
    clientEmail?: string;
    callSessionId?: string;
    callDuration?: number;
    connectionFee?: number;
    discountApplied?: number; // 5% discount given to client

    // For recruitment
    providerId?: string;
    providerEmail?: string;
    providerType?: "lawyer" | "expat";
    callId?: string; // The call that triggered the commission
    recruitmentDate?: string; // When provider was recruited
    monthsRemaining?: number; // Months left in 6-month window
  };

  // ---- Amount ----

  /** Base amount before bonuses (cents) */
  baseAmount: number;

  /** Level bonus multiplier applied (1.0 = no bonus) */
  levelBonus: number;

  /** Top 3 bonus multiplier applied (1.0 = no bonus) */
  top3Bonus: number;

  /** Streak bonus multiplier applied (1.0 = no bonus) */
  streakBonus: number;

  /** Monthly top multiplier (reward for being top 3 previous month, 1.0 = no bonus) */
  monthlyTopMultiplier: number;

  /** Final commission amount (cents) */
  amount: number;

  /** Currency (always USD) */
  currency: "USD";

  /** Human-readable calculation explanation */
  calculationDetails: string;

  /** Human-readable description */
  description: string;

  // ---- Status ----

  /** Current status */
  status: InfluencerCommissionStatus;

  /** When the commission was validated */
  validatedAt: Timestamp | null;

  /** When the commission becomes available */
  availableAt: Timestamp | null;

  /** Cancellation details */
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Timestamp;

  // ---- Withdrawal ----

  /** Withdrawal that included this commission */
  withdrawalId: string | null;

  /** When included in withdrawal */
  paidAt: Timestamp | null;

  // ---- Metadata ----

  /** Admin notes */
  adminNotes?: string;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Last update timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// WITHDRAWAL DOCUMENT
// ============================================================================

/**
 * Withdrawal request record
 * Collection: influencer_withdrawals/{withdrawalId}
 */
export interface InfluencerWithdrawal {
  /** Document ID */
  id: string;

  /** Influencer who requested */
  influencerId: string;
  influencerEmail: string;
  influencerName: string;

  /** Amount requested (cents) */
  amount: number;

  /** Original currency (USD) */
  sourceCurrency: "USD";

  /** Target currency for payout */
  targetCurrency: string;

  /** Exchange rate at processing */
  exchangeRate?: number;

  /** Amount after conversion */
  convertedAmount?: number;

  /** Current status */
  status: InfluencerWithdrawalStatus;

  // ---- Payment Method ----

  /** Payment method used */
  paymentMethod: InfluencerPaymentMethod;

  /** Payment details snapshot at request time */
  paymentDetailsSnapshot: InfluencerPaymentDetails;

  // ---- Commission References ----

  /** Commission IDs included in this withdrawal */
  commissionIds: string[];

  /** Number of commissions */
  commissionCount: number;

  // ---- Processing Details ----

  /** Payment reference/transaction ID */
  paymentReference?: string;

  /** Wise transfer ID (if using Wise) */
  wiseTransferId?: string;

  /** Estimated arrival date */
  estimatedArrival?: Timestamp;

  // ---- Timestamps ----

  /** When requested */
  requestedAt: Timestamp;

  /** When processed by admin */
  processedAt?: Timestamp;

  /** Who processed it */
  processedBy?: string;

  /** Rejection reason */
  rejectionReason?: string;

  /** When payment completed */
  completedAt?: Timestamp;

  /** When failed */
  failedAt?: Timestamp;

  /** Failure reason */
  failureReason?: string;

  /** Admin notes */
  adminNotes?: string;
}

// ============================================================================
// REFERRAL TRACKING
// ============================================================================

/**
 * Provider referral tracking
 * Collection: influencer_referrals/{referralId}
 *
 * Tracks providers recruited by influencers for 6-month commission window
 */
export interface InfluencerReferral {
  /** Document ID */
  id: string;

  /** Influencer who recruited the provider */
  influencerId: string;
  influencerCode: string;
  influencerEmail: string;

  /** Recruited provider info */
  providerId: string;
  providerEmail: string;
  providerType: "lawyer" | "expat";
  providerName: string;

  /** Recruitment date */
  recruitedAt: Timestamp;

  /** Commission window end date (6 months from recruitment) */
  commissionWindowEndsAt: Timestamp;

  /** Whether commission window is still active */
  isActive: boolean;

  /** Number of calls that generated commissions */
  callsWithCommission: number;

  /** Total commissions earned from this referral (cents) */
  totalCommissions: number;

  /** Last commission date */
  lastCommissionAt: Timestamp | null;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// COMMISSION RULES (V2)
// ============================================================================

/**
 * Commission rule conditions
 */
export interface InfluencerCommissionConditions {
  /** Minimum call duration in seconds */
  minCallDuration?: number;
  /** Provider types this applies to */
  providerTypes?: ("lawyer" | "expat")[];
  /** Maximum commissions per month (0 = unlimited) */
  maxPerMonth?: number;
  /** Lifetime limit (0 = unlimited) */
  lifetimeLimit?: number;
  /** Require email verification */
  requireEmailVerification?: boolean;
}

/**
 * Commission rule definition (V2)
 * Defines how a specific commission type is calculated
 */
export interface InfluencerCommissionRule {
  /** Rule ID */
  id: string;
  /** Commission type this rule applies to */
  type: InfluencerCommissionType;
  /** Whether this rule is enabled */
  enabled: boolean;
  /** How to calculate the commission */
  calculationType: CommissionCalculationType;

  /** Fixed amount in cents (for fixed or hybrid) */
  fixedAmount: number;
  /** Percentage rate (0.75 = 75%) for percentage or hybrid */
  percentageRate: number;
  /** What to apply percentage to */
  applyTo?: "connection_fee" | "total_amount";

  /** Conditions that must be met */
  conditions: InfluencerCommissionConditions;

  /** Hold period in days (overrides global default) */
  holdPeriodDays: number;
  /** Release delay in hours after hold period */
  releaseDelayHours: number;

  /** Human-readable description */
  description: string;
}

/**
 * Captured rates at registration (V2)
 * Rates are frozen at signup and never change for the influencer
 */
export interface InfluencerCapturedRates {
  /** When rates were captured */
  capturedAt: Timestamp;
  /** Config version at capture time */
  version: number;
  /** Captured rules by type */
  rules: Partial<Record<InfluencerCommissionType, {
    calculationType: CommissionCalculationType;
    fixedAmount: number;
    percentageRate: number;
    holdPeriodDays: number;
    releaseDelayHours: number;
  }>>;
}

/**
 * Anti-fraud configuration (V2)
 */
export interface InfluencerAntiFraudConfig {
  /** Whether anti-fraud is enabled */
  enabled: boolean;
  /** Max referrals per day (0 = unlimited) */
  maxReferralsPerDay: number;
  /** Max referrals per week (0 = unlimited) */
  maxReferralsPerWeek: number;
  /** Block referrals from same IP */
  blockSameIPReferrals: boolean;
  /** Minimum account age in days */
  minAccountAgeDays: number;
  /** Require email verification for referrals */
  requireEmailVerification: boolean;
  /** Suspicious conversion rate threshold (0.5 = 50%) */
  suspiciousConversionRateThreshold: number;
  /** Auto-suspend on violation */
  autoSuspendOnViolation: boolean;
}

/**
 * Rate history entry (V2)
 */
export interface InfluencerRateHistoryEntry {
  /** When the change was made */
  changedAt: Timestamp;
  /** Admin who made the change */
  changedBy: string;
  /** Previous rules before change */
  previousRules: InfluencerCommissionRule[];
  /** Reason for change */
  reason: string;
}

// ============================================================================
// RECRUITED INFLUENCERS TRACKING
// ============================================================================

/**
 * Recruited influencer tracking document (mirrors GroupAdminRecruit)
 * Collection: influencer_recruited_influencers/{id}
 */
export interface InfluencerRecruitedInfluencer {
  id: string;

  /** Recruiter Influencer ID */
  recruiterId: string;

  /** Recruited Influencer ID */
  recruitedId: string;

  /** Recruited influencer's email */
  recruitedEmail: string;

  /** Recruited influencer's name */
  recruitedName: string;

  /** Recruitment code used */
  recruitmentCode: string;

  /** When recruited */
  recruitedAt: Timestamp;

  /** Commission window end date (6 months after recruitment) */
  commissionWindowEnd: Timestamp;

  /** Whether commission was paid */
  commissionPaid: boolean;

  /** Commission ID if paid */
  commissionId?: string;

  /** When commission was paid */
  commissionPaidAt?: Timestamp;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * System configuration for influencer module (V2 Enhanced)
 * Collection: influencer_config/current
 */
export interface InfluencerConfig {
  /** Document ID (always "current") */
  id: "current";

  // ---- System Status ----

  /** Is the influencer system active */
  isSystemActive: boolean;

  /** Are new registrations accepted */
  newRegistrationsEnabled: boolean;

  /** Are withdrawals enabled */
  withdrawalsEnabled: boolean;

  /** Is the training module visible to influencers */
  trainingEnabled: boolean;

  // ---- Commission Amounts (cents) ----

  /** Fixed commission per client referral ($10 = 1000 cents) */
  commissionClientAmount: number;

  /** Fixed commission per provider recruitment call ($5 = 500 cents) */
  commissionRecruitmentAmount: number;

  /** Client discount percentage for referral (5% = 5) */
  clientDiscountPercent: number;

  // ---- Recruitment Window ----

  /** Months during which recruitment commissions are earned */
  recruitmentWindowMonths: number;

  // ---- Withdrawal Settings ----

  /** Minimum withdrawal amount (cents) - $50 = 5000 */
  minimumWithdrawalAmount: number;

  /** Hold period before commission is validated (days) */
  validationHoldPeriodDays: number;

  /** Time before validated becomes available (hours) */
  releaseDelayHours: number;

  // ---- Attribution ----

  /** Cookie duration in days */
  attributionWindowDays: number;

  // ---- Leaderboard ----

  /** Number of influencers shown in leaderboard */
  leaderboardSize: number;

  // ---- Level Bonuses (aligned with Chatter) ----

  levelBonuses: {
    level1: number;  // 1.00 = no bonus
    level2: number;  // 1.10 = +10%
    level3: number;  // 1.20 = +20%
    level4: number;  // 1.35 = +35%
    level5: number;  // 1.50 = +50%
  };

  // ---- Level Thresholds (cents) ----

  levelThresholds: {
    level2: number;  // $100 = 10000
    level3: number;  // $500 = 50000
    level4: number;  // $2000 = 200000
    level5: number;  // $5000 = 500000
  };

  // ---- Top 3 Monthly Bonuses ----

  top1BonusMultiplier: number;  // 2.00 = +100%
  top2BonusMultiplier: number;  // 1.50 = +50%
  top3BonusMultiplier: number;  // 1.15 = +15%

  // ---- Streak Bonus ----

  /** Streak bonus multipliers based on consecutive activity days */
  streakBonuses: {
    days7: number;   // 1.05 = +5% bonus at 7+ days
    days14: number;  // 1.10 = +10% bonus at 14+ days
    days30: number;  // 1.20 = +20% bonus at 30+ days
    days100: number; // 1.50 = +50% bonus at 100+ days
  };

  // ---- Recruitment Commission ----

  /** Minimum totalEarned (cents) a recruited influencer must reach before recruiter gets bonus */
  recruitmentCommissionThreshold: number;

  /** One-time bonus (cents) paid to recruiter when recruited influencer reaches threshold */
  recruitmentCommissionAmount: number;

  // ---- V2: Commission Rules ----

  /** Commission rules by type */
  commissionRules: InfluencerCommissionRule[];

  // ---- V2: Anti-Fraud ----

  /** Anti-fraud configuration */
  antiFraud: InfluencerAntiFraudConfig;

  // ---- V2: Hold Period Defaults ----

  /** Default hold period in days for new rules */
  defaultHoldPeriodDays: number;

  /** Default release delay in hours */
  defaultReleaseDelayHours: number;

  // ---- V2: Rate History ----

  /** History of rate changes */
  rateHistory: InfluencerRateHistoryEntry[];

  // ---- Version & History ----

  /** Config version */
  version: number;

  /** Last update */
  updatedAt: Timestamp;

  /** Who updated */
  updatedBy: string;
}

/**
 * Default commission rules (V2)
 */
export const DEFAULT_COMMISSION_RULES: InfluencerCommissionRule[] = [
  {
    id: "client_referral",
    type: "client_referral",
    enabled: true,
    calculationType: "fixed",
    fixedAmount: 1000, // $10
    percentageRate: 0,
    conditions: {},
    holdPeriodDays: 7,
    releaseDelayHours: 24,
    description: "Commission par client référé",
  },
  {
    id: "recruitment",
    type: "recruitment",
    enabled: true,
    calculationType: "fixed",
    fixedAmount: 500, // $5
    percentageRate: 0,
    conditions: {},
    holdPeriodDays: 7,
    releaseDelayHours: 24,
    description: "Commission par appel de prestataire recruté",
  },
  {
    id: "signup_bonus",
    type: "signup_bonus",
    enabled: false,
    calculationType: "fixed",
    fixedAmount: 0,
    percentageRate: 0,
    conditions: { requireEmailVerification: true },
    holdPeriodDays: 14,
    releaseDelayHours: 24,
    description: "Bonus inscription filleul",
  },
  {
    id: "first_call",
    type: "first_call",
    enabled: false,
    calculationType: "fixed",
    fixedAmount: 0,
    percentageRate: 0,
    conditions: { minCallDuration: 60 },
    holdPeriodDays: 7,
    releaseDelayHours: 24,
    description: "Bonus premier appel du filleul",
  },
  {
    id: "recurring_call",
    type: "recurring_call",
    enabled: false,
    calculationType: "percentage",
    fixedAmount: 0,
    percentageRate: 0,
    applyTo: "connection_fee",
    conditions: {},
    holdPeriodDays: 7,
    releaseDelayHours: 24,
    description: "Commission sur appels récurrents",
  },
  {
    id: "subscription",
    type: "subscription",
    enabled: false,
    calculationType: "percentage",
    fixedAmount: 0,
    percentageRate: 0,
    applyTo: "total_amount",
    conditions: {},
    holdPeriodDays: 30,
    releaseDelayHours: 24,
    description: "Commission souscription abonnement",
  },
  {
    id: "renewal",
    type: "renewal",
    enabled: false,
    calculationType: "percentage",
    fixedAmount: 0,
    percentageRate: 0,
    applyTo: "total_amount",
    conditions: {},
    holdPeriodDays: 30,
    releaseDelayHours: 24,
    description: "Commission renouvellement abonnement",
  },
  {
    id: "provider_bonus",
    type: "provider_bonus",
    enabled: false,
    calculationType: "fixed",
    fixedAmount: 0,
    percentageRate: 0,
    conditions: {},
    holdPeriodDays: 14,
    releaseDelayHours: 24,
    description: "Bonus prestataire validé",
  },
];

/**
 * Default anti-fraud configuration (V2)
 * NOTE: Anti-fraud is ENABLED by default for security
 */
export const DEFAULT_ANTI_FRAUD_CONFIG: InfluencerAntiFraudConfig = {
  enabled: true,
  maxReferralsPerDay: 50,
  maxReferralsPerWeek: 200,
  blockSameIPReferrals: true,
  minAccountAgeDays: 1,
  requireEmailVerification: true,
  suspiciousConversionRateThreshold: 0.8,
  autoSuspendOnViolation: true,
};

/**
 * Default influencer configuration (V2 Enhanced)
 */
export const DEFAULT_INFLUENCER_CONFIG: Omit<
  InfluencerConfig,
  "updatedAt" | "updatedBy"
> = {
  id: "current",
  isSystemActive: true,
  newRegistrationsEnabled: true,
  withdrawalsEnabled: true,
  trainingEnabled: true,

  commissionClientAmount: 1000,      // $10
  commissionRecruitmentAmount: 500,  // $5
  clientDiscountPercent: 5,          // 5% discount for referred clients

  recruitmentWindowMonths: 6,

  minimumWithdrawalAmount: 2500,     // $25 (aligned with Chatter/Blogger/GroupAdmin)
  validationHoldPeriodDays: 7,       // 7 days minimum
  releaseDelayHours: 24,             // 1 day after validation

  attributionWindowDays: 30,

  leaderboardSize: 10,

  // Level bonuses (aligned with Chatter)
  levelBonuses: {
    level1: 1.00,
    level2: 1.10,
    level3: 1.20,
    level4: 1.35,
    level5: 1.50,
  },

  levelThresholds: {
    level2: 10000,   // $100
    level3: 50000,   // $500
    level4: 200000,  // $2000
    level5: 500000,  // $5000
  },

  top1BonusMultiplier: 2.00,
  top2BonusMultiplier: 1.50,
  top3BonusMultiplier: 1.15,

  streakBonuses: {
    days7: 1.05,    // +5% bonus at 7+ consecutive days
    days14: 1.10,   // +10% bonus at 14+ consecutive days
    days30: 1.20,   // +20% bonus at 30+ consecutive days
    days100: 1.50,  // +50% bonus at 100+ consecutive days
  },

  recruitmentCommissionThreshold: 5000, // $50 — recruited influencer must earn this before recruiter gets bonus
  recruitmentCommissionAmount: 500, // $5 — one-time bonus paid to recruiter

  // V2: Commission rules
  commissionRules: DEFAULT_COMMISSION_RULES,

  // V2: Anti-fraud
  antiFraud: DEFAULT_ANTI_FRAUD_CONFIG,

  // V2: Hold period defaults
  defaultHoldPeriodDays: 7,
  defaultReleaseDelayHours: 24,

  // V2: Rate history
  rateHistory: [],

  version: 1,
};

// ============================================================================
// MONTHLY RANKINGS
// ============================================================================

/**
 * Monthly ranking record
 * Collection: influencer_monthly_rankings/{year-month}
 *
 * Top 3 get bonus multipliers for the following month (aligned with Chatter)
 */
export interface InfluencerMonthlyRanking {
  /** Document ID (YYYY-MM format) */
  id: string;

  /** Year-month string */
  month: string;

  /** Top performers (ordered by earnings this month) */
  rankings: Array<{
    rank: number;
    influencerId: string;
    influencerName: string;
    influencerCode: string;
    photoUrl?: string;
    country: string;
    monthlyEarnings: number;
    monthlyClients: number;
    monthlyRecruits: number;
  }>;

  /** When rankings were calculated */
  calculatedAt: Timestamp;

  /** Whether month is finalized */
  isFinalized: boolean;
}

// ============================================================================
// AFFILIATE CLICKS TRACKING
// ============================================================================

/**
 * Affiliate click tracking
 * Collection: influencer_affiliate_clicks/{clickId}
 */
export interface InfluencerAffiliateClick {
  /** Document ID */
  id: string;

  /** Influencer code used */
  influencerCode: string;

  /** Influencer ID */
  influencerId: string;

  /** Type of link */
  linkType: "client" | "recruitment";

  /** Landing page URL */
  landingPage: string;

  /** Referrer URL */
  referrer?: string;

  /** UTM parameters */
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  /** User agent */
  userAgent?: string;

  /** IP address (hashed for privacy) */
  ipHash: string;

  /** Country (from IP) */
  country?: string;

  /** Whether this click converted */
  converted: boolean;

  /** Conversion ID (user or provider ID) */
  conversionId?: string;

  /** Conversion type */
  conversionType?: "client_signup" | "provider_signup" | "call_completed";

  /** When clicked */
  clickedAt: Timestamp;

  /** When converted */
  convertedAt?: Timestamp;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Influencer notification
 * Collection: influencer_notifications/{notificationId}
 */
export interface InfluencerNotification {
  /** Document ID */
  id: string;

  /** Influencer recipient */
  influencerId: string;

  /** Notification type */
  type:
    | "commission_earned"
    | "commission_validated"
    | "commission_available"
    | "withdrawal_approved"
    | "withdrawal_completed"
    | "withdrawal_rejected"
    | "rank_achieved"
    | "new_referral"
    | "system";

  /** Title */
  title: string;
  titleTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Message body */
  message: string;
  messageTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Link to navigate to */
  actionUrl?: string;

  /** Whether notification has been read */
  isRead: boolean;

  /** Whether email was sent */
  emailSent: boolean;

  /** Reference data */
  data?: {
    commissionId?: string;
    withdrawalId?: string;
    referralId?: string;
    rank?: number;
    month?: string;
    amount?: number;
  };

  /** Created timestamp */
  createdAt: Timestamp;

  /** Read timestamp */
  readAt?: Timestamp;
}

// ============================================================================
// RESOURCE SYSTEM
// ============================================================================

/**
 * Resource categories for influencers
 */
export type InfluencerResourceCategory =
  | "sos_expat"    // SOS-Expat resources
  | "ulixai"       // Ulixai AI resources
  | "founder";     // Founder's resources (photos, bio, quotes)

/**
 * Resource type
 */
export type InfluencerResourceType =
  | "logo"         // Logo files
  | "image"        // Images/graphics
  | "text"         // Text content
  | "data"         // Data/statistics
  | "photo"        // Photos (founder)
  | "bio"          // Biography text
  | "quote";       // Quotes

/**
 * Influencer downloadable resource
 * Collection: influencer_resources/{resourceId}
 */
export interface InfluencerResource {
  id: string;
  category: InfluencerResourceCategory;
  type: InfluencerResourceType;
  name: string;
  nameTranslations?: { [key in SupportedInfluencerLanguage]?: string };
  description?: string;
  descriptionTranslations?: { [key in SupportedInfluencerLanguage]?: string };
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  fileFormat?: string;
  dimensions?: { width: number; height: number };
  isActive: boolean;
  order: number;
  downloadCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Influencer copyable text resource
 * Collection: influencer_resource_texts/{textId}
 */
export interface InfluencerResourceText {
  id: string;
  category: InfluencerResourceCategory;
  type: InfluencerResourceType;
  title: string;
  titleTranslations?: { [key in SupportedInfluencerLanguage]?: string };
  content: string;
  contentTranslations?: { [key in SupportedInfluencerLanguage]?: string };
  isActive: boolean;
  order: number;
  copyCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/**
 * Resource callables input/output types
 */
export interface GetInfluencerResourcesInput {
  category?: InfluencerResourceCategory;
}

export interface GetInfluencerResourcesResponse {
  resources: Array<{
    id: string;
    category: InfluencerResourceCategory;
    type: InfluencerResourceType;
    name: string;
    description?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    fileSize?: number;
    fileFormat?: string;
    dimensions?: { width: number; height: number };
  }>;
  texts: Array<{
    id: string;
    category: InfluencerResourceCategory;
    type: InfluencerResourceType;
    title: string;
    content: string;
  }>;
}

export interface DownloadInfluencerResourceInput {
  resourceId: string;
}

export interface DownloadInfluencerResourceResponse {
  success: boolean;
  downloadUrl: string;
}

export interface CopyInfluencerResourceTextInput {
  textId: string;
}

export interface CopyInfluencerResourceTextResponse {
  success: boolean;
  content: string;
}

// ============================================================================
// WIDGET SYSTEM
// ============================================================================

/**
 * Widget banner
 * Collection: widget_banners/{bannerId}
 */
export interface WidgetBanner {
  /** Document ID */
  id: string;

  /** Banner name */
  name: string;

  /** Description */
  description?: string;

  /** Category */
  category: "header" | "sidebar" | "social" | "email" | "square" | "vertical";

  /** Dimensions */
  width: number;
  height: number;

  /** Image URL */
  imageUrl: string;

  /** Thumbnail URL */
  thumbnailUrl?: string;

  /** Languages available */
  languages: SupportedInfluencerLanguage[];

  /** Whether banner is active */
  isActive: boolean;

  /** Display order */
  order: number;

  /** Usage count */
  usageCount: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

/**
 * Widget promotional text
 * Collection: widget_texts/{textId}
 */
export interface WidgetText {
  /** Document ID */
  id: string;

  /** Text name/title */
  name: string;

  /** Category */
  category: "social_post" | "email_signature" | "bio" | "short" | "long";

  /** Platform targeting */
  platforms?: InfluencerPlatform[];

  /** Text content per language */
  content: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Placeholder instructions */
  placeholderHint?: string;

  /** Whether text is active */
  isActive: boolean;

  /** Display order */
  order: number;

  /** Usage count */
  usageCount: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// INPUT/OUTPUT TYPES FOR CALLABLES
// ============================================================================

export interface RegisterInfluencerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: SupportedInfluencerLanguage;
  additionalLanguages?: SupportedInfluencerLanguage[];
  platforms: InfluencerPlatform[];
  bio?: string;
  communitySize?: number;
  communityNiche?: string;
  interventionCountries?: string[]; // Countries where influencer can promote
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
    other?: string;
  };
  recruiterCode?: string; // Recruitment code from URL
  referralCapturedAt?: string; // ISO date - when the referral code was captured (for 30-day window enforcement)

  // ✅ TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD)
  acceptTerms?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  termsType?: string;
  termsAcceptanceMeta?: {
    userAgent: string;
    language: string;
    timestamp: number;
    acceptanceMethod: string;
  };
}

export interface RegisterInfluencerResponse {
  success: boolean;
  influencerId: string;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  message: string;
}

export interface GetInfluencerDashboardResponse {
  influencer: Omit<Influencer, "paymentDetails" | "adminNotes">;
  recentCommissions: Array<{
    id: string;
    type: InfluencerCommissionType;
    amount: number;
    status: InfluencerCommissionStatus;
    description: string;
    createdAt: string;
  }>;
  monthlyStats: {
    earnings: number;
    clients: number;
    recruits: number;
    rank: number | null;
  };
  unreadNotifications: number;
  config: Pick<InfluencerConfig,
    | "commissionClientAmount"
    | "commissionRecruitmentAmount"
    | "clientDiscountPercent"
    | "minimumWithdrawalAmount"
    | "levelThresholds"
    | "levelBonuses"
  >;
}

export interface RequestInfluencerWithdrawalInput {
  amount?: number; // If not provided, withdraw all available
  paymentMethod: InfluencerPaymentMethod;
  paymentDetails: InfluencerPaymentDetails;
}

export interface RequestInfluencerWithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: InfluencerWithdrawalStatus;
  message: string;
  telegramConfirmationRequired?: boolean;
}

export interface UpdateInfluencerProfileInput {
  phone?: string;
  country?: string;
  additionalLanguages?: SupportedInfluencerLanguage[];
  platforms?: InfluencerPlatform[];
  bio?: string;
  photoUrl?: string;
  communitySize?: number;
  communityNiche?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
    other?: string;
  };
  preferredPaymentMethod?: InfluencerPaymentMethod;
  paymentDetails?: InfluencerPaymentDetails;
}

export interface GetInfluencerLeaderboardResponse {
  rankings: Array<{
    rank: number;
    influencerId: string;
    influencerName: string;
    photoUrl?: string;
    country: string;
    monthlyEarnings: number;
    monthlyClients: number;
    isCurrentUser: boolean;
  }>;
  currentUserRank: number | null;
  currentUserStats: {
    monthlyEarnings: number;
    monthlyClients: number;
    monthlyRecruits: number;
  } | null;
  month: string;
}

// ============================================================================
// ADMIN INPUT/OUTPUT TYPES
// ============================================================================

export interface AdminGetInfluencersListInput {
  status?: InfluencerStatus;
  country?: string;
  language?: SupportedInfluencerLanguage;
  search?: string;
  sortBy?: "createdAt" | "totalEarned" | "totalClients" | "currentMonthRank";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface AdminGetInfluencersListResponse {
  influencers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    status: InfluencerStatus;
    totalEarned: number;
    totalClients: number;
    totalRecruits: number;
    currentMonthRank: number | null;
    createdAt: string;
  }>;
  total: number;
  hasMore: boolean;
}

export interface AdminGetInfluencerDetailResponse {
  influencer: Influencer;
  commissions: Array<Omit<InfluencerCommission, "createdAt"> & { createdAt: string }>;
  withdrawals: Array<Omit<InfluencerWithdrawal, "requestedAt"> & { requestedAt: string }>;
  referrals: Array<Omit<InfluencerReferral, "recruitedAt"> & { recruitedAt: string }>;
}

export interface AdminProcessInfluencerWithdrawalInput {
  withdrawalId: string;
  action: "approve" | "reject" | "complete" | "fail";
  reason?: string;
  paymentReference?: string;
  notes?: string;
}

export interface AdminUpdateInfluencerStatusInput {
  influencerId: string;
  status: InfluencerStatus;
  reason: string;
}

// ============================================================================
// PLATFORM DEFINITIONS
// ============================================================================

/**
 * Platform definition with display info
 */
export interface InfluencerPlatformDefinition {
  id: InfluencerPlatform;
  name: string;
  iconUrl?: string;
  isActive: boolean;
  order: number;
}

/**
 * All supported platforms with details
 */
export const INFLUENCER_PLATFORMS: InfluencerPlatformDefinition[] = [
  { id: "youtube", name: "YouTube", isActive: true, order: 1 },
  { id: "instagram", name: "Instagram", isActive: true, order: 2 },
  { id: "facebook", name: "Facebook", isActive: true, order: 3 },
  { id: "tiktok", name: "TikTok", isActive: true, order: 4 },
  { id: "twitter", name: "Twitter/X", isActive: true, order: 5 },
  { id: "linkedin", name: "LinkedIn", isActive: true, order: 6 },
  { id: "blog", name: "Blog", isActive: true, order: 7 },
  { id: "website", name: "Site Web", isActive: true, order: 8 },
  { id: "podcast", name: "Podcast", isActive: true, order: 9 },
  { id: "newsletter", name: "Newsletter", isActive: true, order: 10 },
  { id: "whatsapp", name: "WhatsApp", isActive: true, order: 11 },
  { id: "telegram", name: "Telegram", isActive: true, order: 12 },
  { id: "discord", name: "Discord", isActive: true, order: 13 },
  { id: "snapchat", name: "Snapchat", isActive: true, order: 14 },
  { id: "reddit", name: "Reddit", isActive: true, order: 15 },
  { id: "forum", name: "Forum", isActive: true, order: 16 },
  { id: "other", name: "Autre", isActive: true, order: 99 },
];

// ============================================================================
// TRAINING SYSTEM
// ============================================================================

/**
 * Training module status
 */
export type TrainingModuleStatus = "draft" | "published" | "archived";

/**
 * Training slide type
 */
export type TrainingSlideType = "text" | "video" | "image" | "checklist" | "tips";

/**
 * Training module category for influencers
 */
export type InfluencerTrainingCategory =
  | "onboarding"       // Introduction to the platform
  | "content_creation" // Creating engaging content
  | "promotion"        // How to promote effectively
  | "analytics"        // Understanding your stats
  | "monetization";    // Maximizing earnings

/**
 * Training slide content
 */
export interface TrainingSlide {
  /** Slide order (1, 2, 3...) */
  order: number;

  /** Slide type */
  type: TrainingSlideType;

  /** Slide title */
  title: string;
  titleTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Main content (markdown supported) */
  content: string;
  contentTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Media URL (for video/image types) */
  mediaUrl?: string;

  /** Checklist items (for checklist type) */
  checklistItems?: Array<{
    text: string;
    textTranslations?: {
      [key in SupportedInfluencerLanguage]?: string;
    };
  }>;

  /** Tips list (for tips type) */
  tips?: Array<{
    text: string;
    textTranslations?: {
      [key in SupportedInfluencerLanguage]?: string;
    };
  }>;
}

/**
 * Training module quiz question
 */
export interface TrainingQuizQuestion {
  /** Question ID */
  id: string;

  /** Question text */
  question: string;
  questionTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Answer options */
  options: Array<{
    id: string;
    text: string;
    textTranslations?: {
      [key in SupportedInfluencerLanguage]?: string;
    };
  }>;

  /** Correct answer ID */
  correctAnswerId: string;

  /** Explanation shown after answer */
  explanation?: string;
  explanationTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };
}

/**
 * Training module
 * Collection: influencer_training_modules/{moduleId}
 */
export interface InfluencerTrainingModule {
  /** Document ID */
  id: string;

  /** Module order (1, 2, 3, 4, 5) */
  order: number;

  /** Module title */
  title: string;
  titleTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Short description */
  description: string;
  descriptionTranslations?: {
    [key in SupportedInfluencerLanguage]?: string;
  };

  /** Module category */
  category: InfluencerTrainingCategory;

  /** Cover image URL */
  coverImageUrl?: string;

  /** Video URL (optional intro video) */
  introVideoUrl?: string;

  /** Module slides/content */
  slides: TrainingSlide[];

  /** Quiz questions for this module */
  quizQuestions: TrainingQuizQuestion[];

  /** Minimum score to pass (percentage, e.g., 80) */
  passingScore: number;

  /** Estimated duration in minutes */
  estimatedMinutes: number;

  /** Is this module required to be completed? */
  isRequired: boolean;

  /** Prerequisites (module IDs that must be completed first) */
  prerequisites: string[];

  /** Module status */
  status: TrainingModuleStatus;

  /** Reward for completing (optional bonus) */
  completionReward?: {
    type: "bonus";
    bonusAmount?: number; // In cents
  };

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin ID) */
  createdBy: string;
}

/**
 * Influencer's training progress
 * Collection: influencer_training_progress/{influencerId}/modules/{moduleId}
 */
export interface InfluencerTrainingProgress {
  /** Influencer ID */
  influencerId: string;

  /** Module ID */
  moduleId: string;

  /** Module title (denormalized for display) */
  moduleTitle: string;

  /** Started at */
  startedAt: Timestamp;

  /** Completed at */
  completedAt?: Timestamp;

  /** Current slide index (0-based) */
  currentSlideIndex: number;

  /** Slides viewed */
  slidesViewed: number[];

  /** Quiz attempts */
  quizAttempts: Array<{
    attemptedAt: Timestamp;
    answers: Array<{
      questionId: string;
      answerId: string;
      isCorrect: boolean;
    }>;
    score: number; // Percentage
    passed: boolean;
  }>;

  /** Best quiz score */
  bestScore: number;

  /** Whether module is completed */
  isCompleted: boolean;

  /** Certificate ID (if completed) */
  certificateId?: string;
}

/**
 * Training certificate
 * Collection: influencer_training_certificates/{certificateId}
 */
export interface InfluencerTrainingCertificate {
  /** Document ID */
  id: string;

  /** Influencer ID */
  influencerId: string;

  /** Influencer name */
  influencerName: string;

  /** Module ID (or "all" for full completion) */
  moduleId: string;

  /** Certificate type */
  type: "module" | "full_program";

  /** Module title (or "Programme Complet") */
  title: string;

  /** Average score across all modules/quizzes */
  averageScore: number;

  /** Total modules completed */
  modulesCompleted: number;

  /** Issued at */
  issuedAt: Timestamp;

  /** Certificate PDF URL (generated) */
  pdfUrl?: string;

  /** Verification code (unique, for QR code) */
  verificationCode: string;
}

// ============================================================================
// TRAINING INPUT/OUTPUT TYPES
// ============================================================================

export interface GetInfluencerTrainingModulesResponse {
  modules: Array<{
    id: string;
    order: number;
    title: string;
    description: string;
    category: InfluencerTrainingCategory;
    coverImageUrl?: string;
    estimatedMinutes: number;
    isRequired: boolean;
    prerequisites: string[];
    progress: {
      isStarted: boolean;
      isCompleted: boolean;
      currentSlideIndex: number;
      totalSlides: number;
      bestScore: number;
    } | null;
  }>;
  overallProgress: {
    completedModules: number;
    totalModules: number;
    completionPercent: number;
    hasCertificate: boolean;
    certificateId?: string;
  };
}

export interface GetInfluencerTrainingModuleContentResponse {
  module: InfluencerTrainingModule;
  progress: InfluencerTrainingProgress | null;
  canAccess: boolean;
  blockedByPrerequisites: string[];
}

export interface SubmitInfluencerTrainingQuizInput {
  moduleId: string;
  answers: Array<{
    questionId: string;
    answerId: string;
  }>;
}

export interface SubmitInfluencerTrainingQuizResponse {
  success: boolean;
  score: number;
  passed: boolean;
  passingScore: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswerId: string;
    explanation?: string;
  }>;
  moduleCompleted: boolean;
  certificateId?: string;
  rewardGranted?: {
    type: "bonus";
    bonusAmount?: number;
  };
}

export interface GetInfluencerTrainingCertificateResponse {
  certificate: InfluencerTrainingCertificate;
  verificationUrl: string;
}
