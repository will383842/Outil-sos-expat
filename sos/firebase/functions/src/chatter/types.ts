/**
 * Chatter System Types
 *
 * Complete type definitions for the SOS-Expat Chatter (Affiliate Ambassador) program.
 * Supports:
 * - Client referral commissions
 * - Provider recruitment commissions
 * - Gamification (levels, badges, streaks)
 * - Quiz qualification system
 * - Monthly leaderboards with bonuses
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Chatter account status
 */
export type ChatterStatus =
  | "pending_quiz"      // Registered but hasn't passed quiz
  | "active"            // Passed quiz, can earn commissions
  | "suspended"         // Temporarily suspended by admin
  | "banned";           // Permanently banned

/**
 * Chatter level (1-5 based on total earnings)
 */
export type ChatterLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Supported languages for chatters
 */
export type SupportedChatterLanguage =
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
 * Commission type for chatters
 */
export type ChatterCommissionType =
  | "client_referral"       // Client completed a paid call
  | "recruitment"           // Recruited provider received first call
  | "bonus_level"           // Level-up bonus
  | "bonus_streak"          // Streak bonus
  | "bonus_top3"            // Monthly Top 3 bonus
  | "bonus_zoom"            // Zoom meeting attendance bonus
  | "manual_adjustment"     // Admin manual adjustment
  // Referral system commissions (2-level)
  | "threshold_10"          // Filleul N1 reached $10 threshold
  | "threshold_50"          // Filleul N1 reached $50 threshold
  | "threshold_50_n2"       // Filleul N2 reached $50 threshold
  | "recurring_5pct"        // Monthly recurring 5% on active filleuls
  | "tier_bonus";           // Tier bonus (5/10/25/50 filleuls)

/**
 * Commission status lifecycle
 */
export type ChatterCommissionStatus =
  | "pending"       // In validation period (waiting for call completion/refund window)
  | "validated"     // Validated, waiting to be released
  | "available"     // Available for withdrawal
  | "paid"          // Included in a withdrawal
  | "cancelled";    // Cancelled by admin or system

/**
 * Withdrawal status lifecycle
 */
export type ChatterWithdrawalStatus =
  | "pending"       // Requested, waiting for admin
  | "approved"      // Admin approved, processing
  | "processing"    // Payment in progress
  | "completed"     // Payment successful
  | "failed"        // Payment failed
  | "rejected";     // Admin rejected

/**
 * Payment method for withdrawals
 * NOTE: Aligned with Influencer - includes PayPal support
 */
export type ChatterPaymentMethod =
  | "wise"          // Wise (TransferWise)
  | "paypal"        // PayPal
  | "mobile_money"  // Mobile Money (Flutterwave)
  | "bank_transfer"; // Bank transfer

/**
 * Platform where chatter promotes
 */
export type ChatterPlatform =
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
  | "other";

/**
 * Badge types
 */
export type ChatterBadgeType =
  | "first_client"          // First client referral
  | "first_recruitment"     // First provider recruited
  | "first_quiz_pass"       // First quiz pass
  | "streak_7"              // 7-day streak
  | "streak_30"             // 30-day streak
  | "streak_100"            // 100-day streak
  | "level_2"               // Reached level 2
  | "level_3"               // Reached level 3
  | "level_4"               // Reached level 4
  | "level_5"               // Reached level 5
  | "top1_monthly"          // Monthly #1
  | "top3_monthly"          // Monthly Top 3
  | "clients_10"            // 10 clients
  | "clients_50"            // 50 clients
  | "clients_100"           // 100 clients
  | "recruits_5"            // 5 providers recruited
  | "recruits_10"           // 10 providers recruited
  | "earned_100"            // Earned $100
  | "earned_500"            // Earned $500
  | "earned_1000"           // Earned $1000
  | "zoom_participant"      // First Zoom meeting
  | "zoom_regular";         // 5 Zoom meetings

// ============================================================================
// CHATTER PROFILE
// ============================================================================

/**
 * Chatter profile document
 * Collection: chatters/{uid}
 */
export interface Chatter {
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

  /** Countries where chatter can promote (list of country codes) */
  interventionCountries: string[];

  /** Primary language */
  language: SupportedChatterLanguage;

  /** Additional languages spoken */
  additionalLanguages?: SupportedChatterLanguage[];

  /** Platforms where chatter promotes */
  platforms: ChatterPlatform[];

  /** Bio/description */
  bio?: string;

  // ---- Status & Level ----

  /** Account status */
  status: ChatterStatus;

  /** Current level (1-5) */
  level: ChatterLevel;

  /** Progress towards next level (0-100%) */
  levelProgress: number;

  /** Admin notes (internal) */
  adminNotes?: string;

  // ---- Affiliate Codes ----

  /** Code for client referrals (e.g., "JEAN123") */
  affiliateCodeClient: string;

  /** Code for provider recruitment (e.g., "REC-JEAN123") */
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

  /** Commissions by type */
  commissionsByType: {
    client_referral: { count: number; amount: number };
    recruitment: { count: number; amount: number };
    bonus: { count: number; amount: number };
  };

  // ---- Gamification ----

  /** Current streak (consecutive days with activity) */
  currentStreak: number;

  /** Best streak ever */
  bestStreak: number;

  /** Last activity date (for streak calculation) */
  lastActivityDate: string | null; // YYYY-MM-DD

  /** Earned badges */
  badges: ChatterBadgeType[];

  /** Current month rank (1-indexed, null if not ranked) */
  currentMonthRank: number | null;

  /** Best ever rank */
  bestRank: number | null;

  // ---- Zoom ----

  /** Total Zoom meetings attended */
  zoomMeetingsAttended: number;

  /** Last Zoom attendance date */
  lastZoomAttendance: Timestamp | null;

  // ---- Quiz ----

  /** Quiz attempts count */
  quizAttempts: number;

  /** Last quiz attempt date */
  lastQuizAttempt: Timestamp | null;

  /** Quiz passed date */
  quizPassedAt: Timestamp | null;

  // ---- Payment Details ----

  /** Preferred payment method */
  preferredPaymentMethod: ChatterPaymentMethod | null;

  /** Payment details (varies by method) */
  paymentDetails: ChatterPaymentDetails | null;

  /** Current pending withdrawal ID */
  pendingWithdrawalId: string | null;

  // ---- Referral (who recruited this chatter) ----

  /** Chatter who recruited this one (chatter ID) - N1 parrain */
  recruitedBy: string | null;

  /** Recruitment code used */
  recruitedByCode: string | null;

  /** When recruited */
  recruitedAt: Timestamp | null;

  /** Whether recruiter commission has been paid (for first client) */
  recruiterCommissionPaid: boolean;

  // REMOVED: recruiterMilestoneBonusPaid and recruiterMilestoneBonusAt
  // The $50 milestone bonus feature has been disabled

  // ---- Referral N2 (2-level referral system) ----

  /** N2 parrain - the parrain of this chatter's parrain */
  parrainNiveau2Id: string | null;

  // ---- Early Adopter (Pioneer) ----

  /** Whether this chatter is an early adopter (+50% bonus for life) */
  isEarlyAdopter: boolean;

  /** Country where this chatter became an early adopter */
  earlyAdopterCountry: string | null;

  /** Date when this chatter became an early adopter */
  earlyAdopterDate: Timestamp | null;

  // ---- Referral Stats ----

  /** Number of N1 filleuls who reached $50 threshold */
  qualifiedReferralsCount: number;

  /** Number of N2 filleuls (filleuls of filleuls) */
  referralsN2Count: number;

  /** Total earnings from referral commissions (separate from client/recruitment) */
  referralEarnings: number;

  /** Ratio of referral earnings to client earnings (for anti-fraud) */
  referralToClientRatio: number;

  // ---- Referral Thresholds Tracking ----

  /** Whether this chatter's $10 threshold was reached (commission paid to parrain) */
  threshold10Reached: boolean;

  /** Whether this chatter's $50 threshold was reached (commission paid to parrain N1 and N2) */
  threshold50Reached: boolean;

  /** Tier bonuses already paid to this chatter (5, 10, 25, 50 filleuls) */
  tierBonusesPaid: number[];

  // ---- Timestamps ----

  /** Registration date */
  createdAt: Timestamp;

  /** Last update */
  updatedAt: Timestamp;

  /** Last login */
  lastLoginAt: Timestamp | null;
}

/**
 * Payment details union type
 * NOTE: Aligned with Influencer - includes PayPal support
 */
export type ChatterPaymentDetails =
  | ChatterWiseDetails
  | ChatterPayPalDetails
  | ChatterMobileMoneyDetails
  | ChatterBankDetails;

/**
 * Wise payment details
 */
export interface ChatterWiseDetails {
  type: "wise";
  email: string;
  currency: string;
  accountHolderName: string;
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bic?: string;
  wiseRecipientId?: string;
}

/**
 * PayPal payment details
 * NOTE: Added for alignment with Influencer system
 */
export interface ChatterPayPalDetails {
  type: "paypal";
  email: string;
  currency: string;
  accountHolderName: string;
}

/**
 * Mobile Money payment details
 */
export interface ChatterMobileMoneyDetails {
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
export interface ChatterBankDetails {
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
 * Collection: chatter_commissions/{commissionId}
 */
export interface ChatterCommission {
  /** Document ID */
  id: string;

  // ---- Chatter ----

  /** Chatter who earns the commission */
  chatterId: string;
  chatterEmail: string;
  chatterCode: string;

  // ---- Commission Type ----

  /** Type of commission */
  type: ChatterCommissionType;

  // ---- Source Reference ----

  /** ID of the source (call session, user, etc.) */
  sourceId: string | null;

  /** Type of source */
  sourceType: "call_session" | "user" | "provider" | "bonus" | null;

  /** Additional source details */
  sourceDetails?: {
    // For client referral
    clientId?: string;
    clientEmail?: string;
    callSessionId?: string;
    callDuration?: number;
    connectionFee?: number;

    // For recruitment
    providerId?: string;
    providerEmail?: string;
    providerType?: "lawyer" | "expat";
    firstCallId?: string;

    // For bonuses
    bonusType?: string;
    bonusReason?: string;
    rank?: number;
    month?: string; // YYYY-MM
    streakDays?: number;
    levelReached?: ChatterLevel;
  };

  // ---- Amount ----

  /** Base amount before bonuses (cents) */
  baseAmount: number;

  /** Level bonus multiplier applied (1.0 = no bonus) */
  levelBonus: number;

  /** Top 3 bonus multiplier applied (1.0 = no bonus) */
  top3Bonus: number;

  /** Zoom bonus multiplier applied (1.0 = no bonus) */
  zoomBonus: number;

  /** Final commission amount (cents) */
  amount: number;

  /** Currency (always USD) */
  currency: "USD";

  /** Human-readable calculation explanation */
  calculationDetails: string;

  // ---- Status ----

  /** Current status */
  status: ChatterCommissionStatus;

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
// WITHDRAWAL DOCUMENT
// ============================================================================

/**
 * Withdrawal request record
 * Collection: chatter_withdrawals/{withdrawalId}
 */
export interface ChatterWithdrawal {
  /** Document ID */
  id: string;

  /** Chatter who requested */
  chatterId: string;
  chatterEmail: string;
  chatterName: string;

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
  status: ChatterWithdrawalStatus;

  // ---- Payment Method ----

  /** Payment method used */
  paymentMethod: ChatterPaymentMethod;

  /** Payment details snapshot at request time */
  paymentDetailsSnapshot: ChatterPaymentDetails;

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

  /** Flutterwave reference (if using Mobile Money) */
  flutterwaveRef?: string;

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
// RECRUITMENT LINK
// ============================================================================

/**
 * Recruitment link for provider onboarding
 * Collection: chatter_recruitment_links/{linkId}
 */
export interface ChatterRecruitmentLink {
  /** Document ID */
  id: string;

  /** Chatter who owns this link */
  chatterId: string;
  chatterCode: string;

  /** The recruitment code (unique) */
  code: string;

  /** Full tracking URL */
  trackingUrl: string;

  /** Provider ID if used */
  usedByProviderId: string | null;

  /** When provider registered */
  usedAt: Timestamp | null;

  /** Whether commission was paid (after first call) */
  commissionPaid: boolean;

  /** Commission ID if paid */
  commissionId: string | null;

  /** Expiration date (6 months from creation) */
  expiresAt: Timestamp;

  /** Whether link is active */
  isActive: boolean;

  /** Created timestamp */
  createdAt: Timestamp;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * System configuration for chatter module
 * Collection: chatter_config/current
 */
export interface ChatterConfig {
  /** Document ID (always "current") */
  id: "current";

  // ---- System Status ----

  /** Is the chatter system active */
  isSystemActive: boolean;

  /** Are new registrations accepted */
  newRegistrationsEnabled: boolean;

  /** Are withdrawals enabled */
  withdrawalsEnabled: boolean;

  /** Is the training module visible to chatters */
  trainingEnabled: boolean;

  // ---- Commission Amounts (cents) ----

  /** Fixed commission per client referral */
  commissionClientAmount: number;

  /** Fixed commission per provider recruitment */
  commissionRecruitmentAmount: number;

  // ---- Level Bonuses ----

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

  // ---- Zoom Bonus ----

  /** Zoom attendance bonus multiplier */
  zoomBonusMultiplier: number;  // 1.10 = +10%

  /** Days after Zoom meeting that bonus applies */
  zoomBonusDurationDays: number;

  // ---- Recruitment Links ----

  /** Duration of recruitment links in months */
  recruitmentLinkDurationMonths: number;

  // ---- Withdrawal Settings ----

  /** Minimum withdrawal amount (cents) */
  minimumWithdrawalAmount: number;

  /** Hold period before commission is validated (hours) */
  validationHoldPeriodHours: number;

  /** Time before validated becomes available (hours) */
  releaseDelayHours: number;

  // ---- Quiz Settings ----

  /** Passing score percentage */
  quizPassingScore: number;

  /** Hours to wait before retry */
  quizRetryDelayHours: number;

  /** Number of questions per quiz */
  quizQuestionsCount: number;

  // ---- Attribution ----

  /** Cookie duration in days */
  attributionWindowDays: number;

  // ---- Supported Countries ----

  /** Countries where chatters can operate */
  supportedCountries: string[];

  // ---- Version & History ----

  /** Config version */
  version: number;

  /** Last update */
  updatedAt: Timestamp;

  /** Who updated */
  updatedBy: string;
}

/**
 * Default chatter configuration
 */
export const DEFAULT_CHATTER_CONFIG: Omit<
  ChatterConfig,
  "updatedAt" | "updatedBy"
> = {
  id: "current",
  isSystemActive: true,
  newRegistrationsEnabled: true,
  withdrawalsEnabled: true,
  trainingEnabled: true,

  commissionClientAmount: 1000,      // $10
  commissionRecruitmentAmount: 500,  // $5

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

  zoomBonusMultiplier: 1.10,
  zoomBonusDurationDays: 7,

  recruitmentLinkDurationMonths: 6,

  minimumWithdrawalAmount: 2500,     // $25
  validationHoldPeriodHours: 48,     // 2 days
  releaseDelayHours: 24,             // 1 day after validation

  quizPassingScore: 85,
  quizRetryDelayHours: 24,
  quizQuestionsCount: 5,

  attributionWindowDays: 30,

  // All 197 countries supported - uses SUPPORTED_COUNTRIES constant
  supportedCountries: [
    "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS", "BH", "BD", "BB",
    "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI", "CV", "KH",
    "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CG", "CD", "CR", "CI", "HR", "CU", "CY",
    "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FJ", "FI",
    "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY", "HT", "HN", "HU",
    "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KP",
    "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MG", "MW", "MY",
    "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM",
    "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM", "PK", "PW", "PA", "PG",
    "PY", "PE", "PH", "PL", "PT", "QA", "RO", "RU", "RW", "KN", "LC", "VC", "WS", "SM", "ST",
    "SA", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD",
    "SR", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM",
    "TV", "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VU", "VA", "VE", "VN", "YE", "ZM", "ZW",
  ],

  version: 1,
};

// ============================================================================
// QUIZ
// ============================================================================

/**
 * Quiz question
 * Collection: chatter_quiz_questions/{questionId}
 */
export interface ChatterQuizQuestion {
  /** Document ID */
  id: string;

  /** Question text (supports markdown) */
  question: string;

  /** Question in different languages */
  translations: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Answer options */
  options: Array<{
    id: string;
    text: string;
    translations: {
      [key in SupportedChatterLanguage]?: string;
    };
  }>;

  /** Correct answer ID */
  correctAnswerId: string;

  /** Explanation shown after answer */
  explanation?: string;
  explanationTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Category/topic */
  category: "general" | "rules" | "platform" | "ethics" | "commission";

  /** Difficulty */
  difficulty: "easy" | "medium" | "hard";

  /** Is question active */
  isActive: boolean;

  /** Order for display (lower = first) */
  order: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

/**
 * Quiz attempt record
 * Collection: chatter_quiz_attempts/{attemptId}
 */
export interface ChatterQuizAttempt {
  /** Document ID */
  id: string;

  /** Chatter who took the quiz */
  chatterId: string;
  chatterEmail: string;

  /** Questions presented */
  questionIds: string[];

  /** Answers given */
  answers: Array<{
    questionId: string;
    answerId: string;
    isCorrect: boolean;
  }>;

  /** Score (0-100) */
  score: number;

  /** Whether passed */
  passed: boolean;

  /** Duration in seconds */
  durationSeconds: number;

  /** Started timestamp */
  startedAt: Timestamp;

  /** Completed timestamp */
  completedAt: Timestamp;
}

// ============================================================================
// GAMIFICATION
// ============================================================================

/**
 * Badge definition
 * Collection: chatter_badges/{badgeType}
 */
export interface ChatterBadgeDefinition {
  /** Badge type (document ID) */
  id: ChatterBadgeType;

  /** Display name */
  name: string;
  nameTranslations: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Description */
  description: string;
  descriptionTranslations: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Icon URL or emoji */
  icon: string;

  /** Category */
  category: "milestone" | "streak" | "level" | "competition" | "activity";

  /** Rarity */
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";

  /** Bonus reward for earning (cents, 0 = no reward) */
  bonusReward: number;

  /** Whether badge is currently active */
  isActive: boolean;

  /** Display order */
  order: number;
}

/**
 * Badge award record
 * Collection: chatter_badge_awards/{awardId}
 */
export interface ChatterBadgeAward {
  /** Document ID */
  id: string;

  /** Chatter who earned the badge */
  chatterId: string;
  chatterEmail: string;

  /** Badge type */
  badgeType: ChatterBadgeType;

  /** When earned */
  awardedAt: Timestamp;

  /** Bonus commission ID if reward was given */
  bonusCommissionId: string | null;

  /** Context of award */
  context?: {
    rank?: number;
    month?: string;
    streakDays?: number;
    level?: ChatterLevel;
    clientCount?: number;
    recruitCount?: number;
    totalEarned?: number;
  };
}

/**
 * Monthly ranking record
 * Collection: chatter_monthly_rankings/{year-month}
 */
export interface ChatterMonthlyRanking {
  /** Document ID (YYYY-MM format) */
  id: string;

  /** Year-month string */
  month: string;

  /** Top performers (ordered by earnings this month) */
  rankings: Array<{
    rank: number;
    chatterId: string;
    chatterName: string;
    chatterCode: string;
    photoUrl?: string;
    country: string;
    monthlyEarnings: number;
    monthlyClients: number;
    monthlyRecruits: number;
    level: ChatterLevel;
  }>;

  /** Bonus commissions awarded to top 3 */
  bonusesAwarded: boolean;
  bonusCommissionIds: string[];

  /** When rankings were calculated */
  calculatedAt: Timestamp;

  /** Whether month is finalized */
  isFinalized: boolean;
}

// ============================================================================
// PLATFORM
// ============================================================================

/**
 * Platform definition
 * Collection: chatter_platforms/{platformId}
 */
export interface ChatterPlatformDefinition {
  /** Platform ID */
  id: ChatterPlatform;

  /** Display name */
  name: string;

  /** Icon URL */
  iconUrl: string;

  /** Whether platform is active */
  isActive: boolean;

  /** Display order */
  order: number;
}

// ============================================================================
// AFFILIATE CLICKS TRACKING
// ============================================================================

/**
 * Affiliate click tracking
 * Collection: chatter_affiliate_clicks/{clickId}
 */
export interface ChatterAffiliateClick {
  /** Document ID */
  id: string;

  /** Chatter code used */
  chatterCode: string;

  /** Chatter ID */
  chatterId: string;

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
  conversionType?: "client_signup" | "provider_signup" | "chatter_signup";

  /** When clicked */
  clickedAt: Timestamp;

  /** When converted */
  convertedAt?: Timestamp;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Chatter notification
 * Collection: chatter_notifications/{notificationId}
 */
export interface ChatterNotification {
  /** Document ID */
  id: string;

  /** Chatter recipient */
  chatterId: string;

  /** Notification type */
  type:
    | "commission_earned"
    | "commission_validated"
    | "commission_available"
    | "withdrawal_approved"
    | "withdrawal_completed"
    | "withdrawal_rejected"
    | "badge_earned"
    | "level_up"
    | "streak_milestone"
    | "rank_achieved"
    | "zoom_reminder"
    | "system";

  /** Title */
  title: string;
  titleTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Message body */
  message: string;
  messageTranslations?: {
    [key in SupportedChatterLanguage]?: string;
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
    badgeType?: ChatterBadgeType;
    newLevel?: ChatterLevel;
    streakDays?: number;
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
// ZOOM MEETINGS
// ============================================================================

/**
 * Zoom meeting record
 * Collection: chatter_zoom_meetings/{meetingId}
 */
export type ChatterZoomMeetingStatus = "scheduled" | "live" | "completed" | "cancelled";

export interface ChatterZoomMeeting {
  /** Document ID */
  id: string;

  /** Meeting title */
  title: string;
  titleTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Meeting description */
  description?: string;
  descriptionTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Zoom meeting ID */
  zoomMeetingId?: string;
  /** Alternative field name for compatibility */
  zoomId?: string;

  /** Zoom meeting password */
  zoomPassword?: string;

  /** Join URL */
  joinUrl?: string;
  /** Alternative URL field for compatibility */
  zoomUrl?: string;

  /** Scheduled start time */
  scheduledAt: Timestamp;

  /** Duration in minutes */
  durationMinutes: number;

  /** Meeting status */
  status: ChatterZoomMeetingStatus;

  /** Whether meeting has ended (legacy) */
  hasEnded?: boolean;

  /** Ended timestamp */
  endedAt?: Timestamp;

  /** Bonus amount in cents */
  bonusAmount?: number;

  /** Max participants */
  maxParticipants?: number;

  /** Current attendee count */
  attendeeCount: number;

  /** Meeting topics */
  topics?: string[];

  /** Host name */
  hostName?: string;

  /** Meeting language */
  language?: string;

  /** Created by (admin ID) */
  createdBy?: string;

  /** Target audience */
  targetAudience?: "all" | "new_chatters" | "top_performers" | "selected";

  /** Selected chatter IDs (if targetAudience is "selected") */
  selectedChatterIds?: string[];

  /** Minimum level required */
  minimumLevel?: ChatterLevel;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

/**
 * Zoom attendance record
 * Collection: chatter_zoom_attendance/{attendanceId}
 */
export interface ChatterZoomAttendance {
  /** Document ID */
  id: string;

  /** Meeting ID */
  meetingId: string;

  /** Chatter ID */
  chatterId: string;
  chatterEmail?: string;
  chatterName?: string;

  /** Join time (legacy field) */
  joinedAt?: Timestamp;
  /** Attended timestamp (new field) */
  attendedAt?: Timestamp;

  /** Leave time */
  leftAt?: Timestamp;

  /** Duration attended (minutes) */
  durationMinutes?: number;
  /** Alternative field name */
  durationAttended?: number;

  /** Whether attendance qualifies for bonus (legacy) */
  qualifiesForBonus?: boolean;
  /** Whether bonus was received (new field) */
  bonusReceived?: boolean;

  /** Bonus commission ID if awarded */
  bonusCommissionId?: string;
}

// ============================================================================
// POSTS (for admin moderation)
// ============================================================================

/**
 * Chatter post submission
 * Collection: chatter_posts/{postId}
 */
export interface ChatterPost {
  /** Document ID */
  id: string;

  /** Chatter who submitted */
  chatterId: string;
  chatterName: string;
  chatterCode: string;

  /** Post type */
  postType: "text" | "image" | "video" | "link";

  /** Platform posted on */
  platform: ChatterPlatform;

  /** Post URL (external link) */
  postUrl?: string;

  /** Post content/caption */
  content: string;

  /** Attached media URLs */
  mediaUrls?: string[];

  /** Moderation status */
  status: "pending" | "approved" | "rejected";

  /** Rejection reason */
  rejectionReason?: string;

  /** Moderated by (admin ID) */
  moderatedBy?: string;

  /** Moderated timestamp */
  moderatedAt?: Timestamp;

  /** Engagement metrics (optional) */
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// POSTS / JOURNAL DES POSTS
// ============================================================================

/**
 * Post submission by a chatter
 * Collection: chatter_posts/{postId}
 */
export interface ChatterPostSubmission {
  /** Document ID */
  id: string;

  /** Chatter who submitted */
  chatterId: string;
  chatterEmail: string;
  chatterName: string;
  chatterCode: string;

  /** Post details */
  url: string;
  platform: ChatterPlatform;
  targetCountry: string; // Country code or "GLOBAL"
  language: SupportedChatterLanguage;
  content?: string; // Post caption/text
  screenshotUrl?: string;

  /** Group/Forum reference (if posted in a tracked group) */
  groupId?: string;
  groupName?: string;

  /** Stats */
  clickCount: number;
  conversionCount: number;
  earningsGenerated: number;

  /** Moderation */
  status: "pending" | "approved" | "rejected";
  moderatedBy?: string;
  moderatedAt?: Timestamp;
  rejectionReason?: string;

  /** Spam detection */
  isSpamFlagged: boolean;
  spamFlags?: string[];

  /** Timestamps */
  postedAt: Timestamp; // When the post was made on the platform
  submittedAt: Timestamp; // When submitted to our system
  updatedAt: Timestamp;
}

// ============================================================================
// GROUPS / FORUMS DATABASE
// ============================================================================

/**
 * Group/Forum entry in the database
 * Collection: chatter_groups/{groupId}
 */
export interface ChatterGroup {
  /** Document ID */
  id: string;

  /** Group details */
  name: string;
  url: string;
  platform: ChatterPlatform;
  targetCountry: string; // Country code or "GLOBAL"
  language: SupportedChatterLanguage;
  memberCount?: number; // Approximate members
  thematic: "expatriates" | "legal" | "real_estate" | "health" | "employment" | "general" | "other";
  accessType: "public" | "private_member" | "admin_moderator";

  /** Who submitted this group */
  submittedByChatterId: string;
  submittedByEmail: string;

  /** Chatters active in this group */
  activeChatterIds: string[];
  activeChatterCount: number;

  /** Stats aggregated */
  totalPosts: number;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;

  /** Admin status */
  status: "active" | "saturated" | "banned" | "exclusive";
  exclusiveToChatterId?: string; // If assigned exclusively
  adminNotes?: string;
  markedBy?: string;
  markedAt?: Timestamp;

  /** Deduplication - normalized URL hash */
  urlHash: string;

  /** Timestamps */
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Chatter's activity in a specific group
 * Subcollection: chatter_groups/{groupId}/chatter_activity/{chatterId}
 */
export interface ChatterGroupActivity {
  chatterId: string;
  chatterEmail: string;
  groupId: string;

  /** Stats for this chatter in this group */
  postCount: number;
  clickCount: number;
  conversionCount: number;
  earningsGenerated: number;

  /** Status */
  status: "active" | "banned" | "inactive";
  bannedReason?: string;

  /** First and last activity */
  firstPostAt: Timestamp;
  lastPostAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// COUNTRY ROTATION SYSTEM
// ============================================================================

/**
 * Tracks country assignments per cycle
 * Collection: chatter_country_assignments/{countryCode}
 */
export interface ChatterCountryAssignment {
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode: string;

  /** Country name for display */
  countryName: string;

  /** Current cycle number (starts at 1) */
  currentCycle: number;

  /** Number of times this country has been assigned in current cycle */
  assignmentsInCurrentCycle: number;

  /** Total assignments across all cycles */
  totalAssignments: number;

  /** Chatters assigned to this country in current cycle */
  currentCycleChatterIds: string[];

  /** Last assignment timestamp */
  lastAssignedAt: Timestamp | null;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

/**
 * Global country rotation state
 * Collection: chatter_config/country_rotation
 */
export interface ChatterCountryRotationState {
  /** Document ID */
  id: "country_rotation";

  /** Current global cycle number */
  currentGlobalCycle: number;

  /** Total countries in the system */
  totalCountries: number;

  /** Countries assigned at least once in current cycle */
  countriesAssignedInCurrentCycle: number;

  /** Threshold percentage to advance to next cycle (default 90%) */
  cycleThresholdPercent: number;

  /** Whether cycle advancement is automatic */
  autoAdvanceCycle: boolean;

  /** Last cycle advancement */
  lastCycleAdvancedAt: Timestamp | null;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

/**
 * List of all 197 supported countries
 */
export const SUPPORTED_COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "AF", name: "Afghanistan" }, { code: "AL", name: "Albania" }, { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" }, { code: "AO", name: "Angola" }, { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" }, { code: "AM", name: "Armenia" }, { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" }, { code: "AZ", name: "Azerbaijan" }, { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" }, { code: "BD", name: "Bangladesh" }, { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" }, { code: "BE", name: "Belgium" }, { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" }, { code: "BT", name: "Bhutan" }, { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" }, { code: "BW", name: "Botswana" }, { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" }, { code: "BG", name: "Bulgaria" }, { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" }, { code: "CV", name: "Cabo Verde" }, { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" }, { code: "CA", name: "Canada" }, { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" }, { code: "CL", name: "Chile" }, { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" }, { code: "KM", name: "Comoros" }, { code: "CG", name: "Congo" },
  { code: "CD", name: "DR Congo" }, { code: "CR", name: "Costa Rica" }, { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" }, { code: "CU", name: "Cuba" }, { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" }, { code: "DK", name: "Denmark" }, { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" }, { code: "DO", name: "Dominican Republic" }, { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" }, { code: "SV", name: "El Salvador" }, { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" }, { code: "EE", name: "Estonia" }, { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" }, { code: "FJ", name: "Fiji" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "GA", name: "Gabon" }, { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" }, { code: "DE", name: "Germany" }, { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" }, { code: "GD", name: "Grenada" }, { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" }, { code: "GW", name: "Guinea-Bissau" }, { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" }, { code: "HN", name: "Honduras" }, { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" }, { code: "IN", name: "India" }, { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" }, { code: "IQ", name: "Iraq" }, { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" }, { code: "IT", name: "Italy" }, { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" }, { code: "JO", name: "Jordan" }, { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" }, { code: "KI", name: "Kiribati" }, { code: "KP", name: "North Korea" },
  { code: "KR", name: "South Korea" }, { code: "KW", name: "Kuwait" }, { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" }, { code: "LV", name: "Latvia" }, { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" }, { code: "LR", name: "Liberia" }, { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" }, { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "MG", name: "Madagascar" }, { code: "MW", name: "Malawi" }, { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" }, { code: "ML", name: "Mali" }, { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" }, { code: "MR", name: "Mauritania" }, { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" }, { code: "FM", name: "Micronesia" }, { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" }, { code: "MN", name: "Mongolia" }, { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" }, { code: "MZ", name: "Mozambique" }, { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" }, { code: "NR", name: "Nauru" }, { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" }, { code: "NZ", name: "New Zealand" }, { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" }, { code: "NG", name: "Nigeria" }, { code: "MK", name: "North Macedonia" },
  { code: "NO", name: "Norway" }, { code: "OM", name: "Oman" }, { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" }, { code: "PA", name: "Panama" }, { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" }, { code: "PE", name: "Peru" }, { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" }, { code: "RU", name: "Russia" }, { code: "RW", name: "Rwanda" },
  { code: "KN", name: "Saint Kitts and Nevis" }, { code: "LC", name: "Saint Lucia" }, { code: "VC", name: "Saint Vincent" },
  { code: "WS", name: "Samoa" }, { code: "SM", name: "San Marino" }, { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" }, { code: "SN", name: "Senegal" }, { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" }, { code: "SL", name: "Sierra Leone" }, { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" }, { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" }, { code: "ZA", name: "South Africa" }, { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" }, { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" }, { code: "SE", name: "Sweden" }, { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" }, { code: "TW", name: "Taiwan" }, { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" }, { code: "TH", name: "Thailand" }, { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" }, { code: "TO", name: "Tonga" }, { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" }, { code: "TR", name: "Turkey" }, { code: "TM", name: "Turkmenistan" },
  { code: "TV", name: "Tuvalu" }, { code: "UG", name: "Uganda" }, { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" }, { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" }, { code: "UZ", name: "Uzbekistan" }, { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" }, { code: "VE", name: "Venezuela" }, { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" }, { code: "ZM", name: "Zambia" }, { code: "ZW", name: "Zimbabwe" },
];

// ============================================================================
// REFERRAL SYSTEM TYPES (2-LEVEL)
// ============================================================================

/**
 * Type of referral fraud alert
 */
export type ChatterReferralFraudAlertType =
  | "circular_referral"       // A refers B who refers A (or chain)
  | "high_ratio"             // referral/client ratio too high
  | "multiple_accounts"      // Same IP/device multiple accounts
  | "suspicious_activity"    // Unusual patterns
  | "rapid_referrals";       // Too many referrals in short time

/**
 * Status of a referral fraud alert
 */
export type ChatterReferralFraudAlertStatus =
  | "pending"      // Awaiting review
  | "confirmed"    // Fraud confirmed
  | "dismissed"    // False positive
  | "resolved";    // Action taken

/**
 * Referral commission record (specific to referral system)
 * Collection: chatter_referral_commissions/{id}
 */
export interface ChatterReferralCommission {
  /** Document ID */
  id: string;

  /** Parrain who earns the commission */
  parrainId: string;
  parrainEmail: string;
  parrainCode: string;

  /** Filleul who triggered the commission */
  filleulId: string;
  filleulEmail: string;
  filleulName: string;

  /** Type of referral commission */
  type: "threshold_10" | "threshold_50" | "threshold_50_n2" | "recurring_5pct" | "tier_bonus";

  /** Level (1 = direct filleul, 2 = filleul of filleul) */
  level: 1 | 2;

  /** Base amount (cents) */
  baseAmount: number;

  /** Multipliers applied */
  earlyAdopterMultiplier: number;  // 1.0 or 1.5 (50% bonus)
  promoMultiplier: number;          // 1.0, 2.0, 3.0 for hackathons

  /** Final amount (cents) */
  amount: number;

  /** For recurring: the month this is for (YYYY-MM) */
  recurringMonth?: string;

  /** For recurring: the filleul's earnings that month */
  filleulMonthlyEarnings?: number;

  /** For tier bonus: the tier reached (5, 10, 25, 50) */
  tierReached?: number;

  /** Currency (always USD) */
  currency: "USD";

  /** Status */
  status: ChatterCommissionStatus;

  /** Calculation breakdown */
  calculationDetails: string;

  /** Promotion ID if a promo was applied */
  promotionId?: string;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** When validated */
  validatedAt?: Timestamp;

  /** When made available */
  availableAt?: Timestamp;
}

/**
 * Promotion / Hackathon definition
 * Collection: chatter_promotions/{id}
 */
export interface ChatterPromotion {
  /** Document ID */
  id: string;

  /** Promotion name */
  name: string;
  nameTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Promotion description */
  description: string;
  descriptionTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Type of promotion */
  type: "hackathon" | "bonus_weekend" | "country_challenge" | "special_event";

  /** Multiplier applied to referral commissions (2.0 = x2, 3.0 = x3) */
  multiplier: number;

  /** Which commission types this applies to */
  appliesToTypes: ChatterCommissionType[];

  /** Country restrictions (empty = all countries) */
  targetCountries: string[];

  /** Start date */
  startDate: Timestamp;

  /** End date */
  endDate: Timestamp;

  /** Whether promotion is active */
  isActive: boolean;

  /** Maximum budget (cents, 0 = unlimited) */
  maxBudget: number;

  /** Current spent (cents) */
  currentSpent: number;

  /** Number of participants */
  participantCount: number;

  /** Created by (admin ID) */
  createdBy: string;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;
}

/**
 * Early Adopter counter per country
 * Collection: chatter_early_adopter_counters/{countryCode}
 */
export interface ChatterEarlyAdopterCounter {
  /** Country code (document ID) */
  countryCode: string;

  /** Country name */
  countryName: string;

  /** Maximum early adopters for this country */
  maxEarlyAdopters: number;

  /** Current count of early adopters */
  currentCount: number;

  /** Remaining slots */
  remainingSlots: number;

  /** Whether registration is still open */
  isOpen: boolean;

  /** List of early adopter chatter IDs */
  earlyAdopterIds: string[];

  /** Updated timestamp */
  updatedAt: Timestamp;
}

/**
 * Tier bonus history record
 * Collection: chatter_tier_bonuses_history/{id}
 */
export interface ChatterTierBonusHistory {
  /** Document ID */
  id: string;

  /** Chatter who received the bonus */
  chatterId: string;
  chatterEmail: string;
  chatterName: string;

  /** Tier reached (5, 10, 25, 50) */
  tier: 5 | 10 | 25 | 50;

  /** Bonus amount (cents) */
  amount: number;

  /** Commission ID */
  commissionId: string;

  /** Number of qualified filleuls at the time */
  qualifiedFilleulsCount: number;

  /** When awarded */
  awardedAt: Timestamp;
}

/**
 * Referral fraud alert
 * Collection: chatter_referral_fraud_alerts/{id}
 */
export interface ChatterReferralFraudAlert {
  /** Document ID */
  id: string;

  /** Chatter being investigated */
  chatterId: string;
  chatterEmail: string;
  chatterName: string;

  /** Type of alert */
  alertType: ChatterReferralFraudAlertType;

  /** Severity level */
  severity: "low" | "medium" | "high" | "critical";

  /** Alert status */
  status: ChatterReferralFraudAlertStatus;

  /** Detailed description */
  details: string;

  /** Evidence data */
  evidence: {
    /** For circular referral */
    circularChain?: string[];
    /** For high ratio */
    ratio?: number;
    referralEarnings?: number;
    clientEarnings?: number;
    /** For multiple accounts */
    relatedAccountIds?: string[];
    ipHash?: string;
    /** For rapid referrals */
    referralCount?: number;
    timeWindowHours?: number;
  };

  /** Recommended action */
  recommendedAction: "review" | "warn" | "suspend" | "ban";

  /** Action taken (if any) */
  actionTaken?: "none" | "warning_sent" | "suspended" | "banned";

  /** Admin who reviewed */
  reviewedBy?: string;

  /** Review notes */
  reviewNotes?: string;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Reviewed timestamp */
  reviewedAt?: Timestamp;
}

/**
 * Referral dashboard data response
 */
export interface GetReferralDashboardResponse {
  /** Summary stats */
  stats: {
    totalFilleulsN1: number;
    qualifiedFilleulsN1: number;
    totalFilleulsN2: number;
    totalReferralEarnings: number;
    monthlyReferralEarnings: number;
  };

  /** Recent referral commissions */
  recentCommissions: Array<{
    id: string;
    type: ChatterCommissionType;
    filleulName: string;
    amount: number;
    createdAt: string;
  }>;

  /** Filleuls N1 with their progression */
  filleulsN1: Array<{
    id: string;
    name: string;
    email: string;
    clientEarnings: number;
    threshold10Reached: boolean;
    threshold50Reached: boolean;
    isActive: boolean;
    joinedAt: string;
  }>;

  /** Filleuls N2 (simplified) */
  filleulsN2: Array<{
    id: string;
    name: string;
    parrainN1Name: string;
    threshold50Reached: boolean;
    joinedAt: string;
  }>;

  /** Tier bonus progress */
  tierProgress: {
    currentTier: number | null;
    nextTier: number | null;
    filleulsNeeded: number;
    bonusAmount: number;
  };

  /** Early adopter status */
  earlyAdopter: {
    isEarlyAdopter: boolean;
    country: string | null;
    multiplier: number;
  };

  /** Active promotion if any */
  activePromotion: {
    id: string;
    name: string;
    multiplier: number;
    endsAt: string;
  } | null;
}

/**
 * Referral configuration constants
 */
export const REFERRAL_CONFIG = {
  /** Threshold amounts (cents) - EXCLUDES referral earnings */
  THRESHOLDS: {
    THRESHOLD_10: 1000,   // $10
    THRESHOLD_50: 5000,   // $50
  },

  /** Commission amounts (cents) */
  COMMISSIONS: {
    THRESHOLD_10_AMOUNT: 100,    // $1 when filleul reaches $10
    THRESHOLD_50_N1_AMOUNT: 400, // $4 when filleul N1 reaches $50
    THRESHOLD_50_N2_AMOUNT: 200, // $2 when filleul N2 reaches $50
    RECURRING_PERCENT: 0.05,     // 5% monthly on active filleuls
    MONTHLY_ACTIVITY_THRESHOLD: 2000, // $20/month to be "active"
  },

  /** Tier bonuses (filleuls count → bonus in cents) */
  TIER_BONUSES: {
    5: 2500,    // $25 for 5 qualified filleuls
    10: 7500,   // $75 for 10 qualified filleuls
    25: 20000,  // $200 for 25 qualified filleuls
    50: 50000,  // $500 for 50 qualified filleuls
  } as Record<number, number>,

  /** Early adopter settings */
  EARLY_ADOPTER: {
    MULTIPLIER: 1.5,              // +50% bonus
    DEFAULT_SLOTS_PER_COUNTRY: 100, // 100 first per country
  },

  /** Anti-fraud thresholds */
  FRAUD: {
    MAX_REFERRAL_TO_CLIENT_RATIO: 2.0,  // Max 2:1 referral vs client earnings
    MAX_REFERRALS_PER_DAY: 10,
    CIRCULAR_DETECTION_DEPTH: 5,
  },
} as const;

// ============================================================================
// INPUT/OUTPUT TYPES FOR CALLABLES
// ============================================================================

export interface RegisterChatterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  interventionCountries: string[];
  language: SupportedChatterLanguage;
  additionalLanguages?: SupportedChatterLanguage[];
  platforms: ChatterPlatform[];
  bio?: string;
  recruitmentCode?: string; // If recruited by another chatter
}

export interface RegisterChatterResponse {
  success: boolean;
  chatterId: string;
  message: string;
}

export interface SubmitQuizInput {
  answers: Array<{
    questionId: string;
    answerId: string;
  }>;
  startedAt: string; // ISO timestamp
}

export interface SubmitQuizResponse {
  success: boolean;
  passed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswerId: string;
    explanation?: string;
  }>;
  canRetryAt?: string; // ISO timestamp if failed
  affiliateCodeClient?: string; // If passed
  affiliateCodeRecruitment?: string; // If passed
}

export interface GetChatterDashboardResponse {
  chatter: Omit<Chatter, "paymentDetails" | "adminNotes">;
  recentCommissions: Array<{
    id: string;
    type: ChatterCommissionType;
    amount: number;
    status: ChatterCommissionStatus;
    description: string;
    createdAt: string;
  }>;
  monthlyStats: {
    earnings: number;
    clients: number;
    recruits: number;
    rank: number | null;
  };
  upcomingZoomMeeting: {
    id: string;
    title: string;
    scheduledAt: string;
    joinUrl: string;
  } | null;
  unreadNotifications: number;
  config: Pick<ChatterConfig,
    | "commissionClientAmount"
    | "commissionRecruitmentAmount"
    | "minimumWithdrawalAmount"
    | "levelThresholds"
    | "levelBonuses"
  >;

  /** Referral system stats (2-level) */
  referralStats: {
    filleulsN1: number;
    qualifiedFilleulsN1: number;
    filleulsN2: number;
    referralEarnings: number;
    nextTierBonus: {
      tier: number;
      filleulsNeeded: number;
      bonusAmount: number;
    } | null;
  };

  /** Early adopter (Pioneer) status */
  earlyAdopter: {
    isEarlyAdopter: boolean;
    country: string | null;
    multiplier: number;
  };

  /** Earnings ratio (affiliation vs referral) */
  earningsRatio: {
    affiliationEarnings: number;   // Client referrals + recruitment
    referralEarnings: number;      // Referral system only
    affiliationPercent: number;
    referralPercent: number;
  };

  /** Active promotion if any */
  activePromotion: {
    id: string;
    name: string;
    multiplier: number;
    endsAt: string;
  } | null;
}

export interface RequestWithdrawalInput {
  amount?: number; // If not provided, withdraw all available
  paymentMethod: ChatterPaymentMethod;
  paymentDetails: ChatterPaymentDetails;
}

export interface RequestWithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: ChatterWithdrawalStatus;
  message: string;
}

export interface UpdateChatterProfileInput {
  phone?: string;
  country?: string;
  interventionCountries?: string[];
  additionalLanguages?: SupportedChatterLanguage[];
  platforms?: ChatterPlatform[];
  bio?: string;
  photoUrl?: string;
  preferredPaymentMethod?: ChatterPaymentMethod;
  paymentDetails?: ChatterPaymentDetails;
}

// ============================================================================
// ADMIN INPUT/OUTPUT TYPES
// ============================================================================

export interface AdminGetChattersListInput {
  status?: ChatterStatus;
  level?: ChatterLevel;
  country?: string;
  search?: string;
  sortBy?: "createdAt" | "totalEarned" | "totalClients" | "currentStreak";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface AdminGetChattersListResponse {
  chatters: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    status: ChatterStatus;
    level: ChatterLevel;
    totalEarned: number;
    totalClients: number;
    totalRecruits: number;
    currentStreak: number;
    createdAt: string;
  }>;
  total: number;
  hasMore: boolean;
}

export interface AdminGetChatterDetailResponse {
  chatter: Chatter;
  commissions: Array<Omit<ChatterCommission, "createdAt"> & { createdAt: string }>;
  withdrawals: Array<Omit<ChatterWithdrawal, "requestedAt"> & { requestedAt: string }>;
  recruitmentLinks: Array<Omit<ChatterRecruitmentLink, "createdAt"> & { createdAt: string }>;
  badges: Array<Omit<ChatterBadgeAward, "awardedAt"> & { awardedAt: string }>;
  quizAttempts: Array<Omit<ChatterQuizAttempt, "completedAt"> & { completedAt: string }>;
}

export interface AdminProcessWithdrawalInput {
  withdrawalId: string;
  action: "approve" | "reject" | "complete" | "fail";
  reason?: string;
  paymentReference?: string;
  notes?: string;
}

export interface AdminUpdateChatterStatusInput {
  chatterId: string;
  status: ChatterStatus;
  reason: string;
}

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
 * Training module category
 */
export type ChatterTrainingCategory =
  | "onboarding"      // Introduction to the platform
  | "promotion"       // How to promote effectively
  | "conversion"      // Converting leads to clients
  | "recruitment"     // Recruiting providers
  | "best_practices"; // Tips and best practices

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
    [key in SupportedChatterLanguage]?: string;
  };

  /** Main content (markdown supported) */
  content: string;
  contentTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Media URL (for video/image types) */
  mediaUrl?: string;

  /** Checklist items (for checklist type) */
  checklistItems?: Array<{
    text: string;
    textTranslations?: {
      [key in SupportedChatterLanguage]?: string;
    };
  }>;

  /** Tips list (for tips type) */
  tips?: Array<{
    text: string;
    textTranslations?: {
      [key in SupportedChatterLanguage]?: string;
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
    [key in SupportedChatterLanguage]?: string;
  };

  /** Answer options */
  options: Array<{
    id: string;
    text: string;
    textTranslations?: {
      [key in SupportedChatterLanguage]?: string;
    };
  }>;

  /** Correct answer ID */
  correctAnswerId: string;

  /** Explanation shown after answer */
  explanation?: string;
  explanationTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };
}

/**
 * Training module
 * Collection: chatter_training_modules/{moduleId}
 */
export interface ChatterTrainingModule {
  /** Document ID */
  id: string;

  /** Module order (1, 2, 3, 4, 5) */
  order: number;

  /** Module title */
  title: string;
  titleTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Short description */
  description: string;
  descriptionTranslations?: {
    [key in SupportedChatterLanguage]?: string;
  };

  /** Module category */
  category: ChatterTrainingCategory;

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

  /** Reward for completing (optional badge or bonus) */
  completionReward?: {
    type: "badge" | "bonus";
    badgeType?: ChatterBadgeType;
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
 * Chatter's training progress
 * Collection: chatter_training_progress/{chatterId}/modules/{moduleId}
 */
export interface ChatterTrainingProgress {
  /** Chatter ID */
  chatterId: string;

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
 * Collection: chatter_training_certificates/{certificateId}
 */
export interface ChatterTrainingCertificate {
  /** Document ID */
  id: string;

  /** Chatter ID */
  chatterId: string;

  /** Chatter name */
  chatterName: string;

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

export interface GetTrainingModulesResponse {
  modules: Array<{
    id: string;
    order: number;
    title: string;
    description: string;
    category: ChatterTrainingCategory;
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

export interface GetTrainingModuleContentResponse {
  module: ChatterTrainingModule;
  progress: ChatterTrainingProgress | null;
  canAccess: boolean;
  blockedByPrerequisites: string[];
}

export interface SubmitTrainingQuizInput {
  moduleId: string;
  answers: Array<{
    questionId: string;
    answerId: string;
  }>;
}

export interface SubmitTrainingQuizResponse {
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
    type: "badge" | "bonus";
    badgeType?: ChatterBadgeType;
    bonusAmount?: number;
  };
}

export interface GetTrainingCertificateResponse {
  certificate: ChatterTrainingCertificate;
  verificationUrl: string;
}
