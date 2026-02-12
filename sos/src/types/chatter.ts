/**
 * Chatter Types - Frontend
 *
 * Type definitions for the chatter system on the frontend.
 * These are simplified versions of the backend types, suitable for UI display.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ChatterStatus = "pending_quiz" | "active" | "suspended" | "banned";

export type ChatterLevel = 1 | 2 | 3 | 4 | 5;

export type SupportedChatterLanguage =
  | "fr"
  | "en"
  | "es"
  | "pt"
  | "ar"
  | "de"
  | "it"
  | "nl"
  | "zh";

export type ChatterCommissionType =
  // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
  | "client_call"        // $10 - Direct client call via chatter's link
  | "n1_call"            // $1 - N1 filleul's client call
  | "n2_call"            // $0.50 - N2 filleul's client call
  | "activation_bonus"   // $5 - When filleul activates (after 2nd call)
  | "n1_recruit_bonus"   // $1 - When N1 recruits someone who activates
  | "provider_call"      // $5 - Recruited provider received a call (6 months window)
  // Tier bonuses
  | "tier_bonus"         // Milestone bonus (5→$15, 10→$35, 20→$75, 50→$250, 100→$600, 500→$4000)
  // Monthly rewards
  | "bonus_top3"         // Monthly top 3 rewards (2.0x / 1.5x / 1.15x multipliers)
  // Other bonuses
  | "bonus_level"        // Level-up bonus
  | "bonus_streak"       // Streak bonus
  | "bonus_zoom"         // Zoom attendance bonus
  | "bonus_telegram"     // Telegram onboarding bonus ($50, unlocked at $150 earnings)
  | "manual_adjustment"  // Admin manual adjustment
  // LEGACY (kept for backward compatibility)
  | "client_referral"    // @deprecated - Use client_call
  | "recruitment"        // @deprecated - Use activation_bonus
  | "threshold_10"       // @deprecated - Old referral system
  | "threshold_50"       // @deprecated - Old referral system
  | "threshold_50_n2"    // @deprecated - Old referral system
  | "recurring_5pct";    // @deprecated - Old referral system

export type ChatterCommissionStatus =
  | "pending"
  | "validated"
  | "available"
  | "paid"
  | "cancelled";

export type ChatterWithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "rejected";

export type ChatterPaymentMethod = "wise" | "mobile_money" | "bank_transfer";

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

export type ChatterBadgeType =
  | "first_client"
  | "first_recruitment"
  | "first_quiz_pass"
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "level_2"
  | "level_3"
  | "level_4"
  | "level_5"
  | "top1_monthly"
  | "top3_monthly"
  | "clients_10"
  | "clients_50"
  | "clients_100"
  | "recruits_3"
  | "recruits_5"
  | "recruits_10"
  | "recruits_25"
  | "recruits_50"
  | "earned_100"
  | "earned_500"
  | "earned_1000"
  | "team_10"
  | "team_25"
  | "team_50"
  | "team_100"
  | "team_earned_500"
  | "team_earned_1000"
  | "team_earned_5000";

// ============================================================================
// PAYMENT DETAILS
// ============================================================================

/**
 * @deprecated These payment types are deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (PaymentMethod, PaymentDetails, etc.)
 * - Components: @/components/Payment
 * - Hooks: @/hooks/usePayment
 *
 * These types will be removed in a future version.
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
}

export type MobileMoneyProvider = "mtn" | "orange" | "moov" | "airtel" | "mpesa" | "wave";

export interface ChatterMobileMoneyDetails {
  type: "mobile_money";
  provider: MobileMoneyProvider | "";
  phoneNumber: string;
  country: string;
  currency?: string;
  accountName: string;
}

export interface ChatterBankDetails {
  type: "bank_transfer";
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  swiftBic?: string;
  iban?: string;
  country: string;
  currency: string;
}

export type ChatterPaymentDetails =
  | ChatterWiseDetails
  | ChatterMobileMoneyDetails
  | ChatterBankDetails;

// ============================================================================
// CHATTER DATA
// ============================================================================

export interface ChatterData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  whatsapp?: string;
  photoUrl?: string;
  country: string;
  interventionCountries: string[];
  language: SupportedChatterLanguage;
  additionalLanguages?: SupportedChatterLanguage[];
  platforms: ChatterPlatform[];
  bio?: string;

  status: ChatterStatus;
  level: ChatterLevel;
  levelProgress: number;

  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;

  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;

  totalClients: number;
  totalRecruits: number;
  totalCommissions: number;
  commissionsByType: {
    client_referral: { count: number; amount: number };
    recruitment: { count: number; amount: number };
    bonus: { count: number; amount: number };
  };

  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  badges: ChatterBadgeType[];
  currentMonthRank: number | null;
  bestRank: number | null;

  zoomMeetingsAttended: number;
  lastZoomAttendance: string | null;

  quizAttempts: number;
  lastQuizAttempt: string | null;
  quizPassedAt: string | null;

  preferredPaymentMethod: ChatterPaymentMethod | null;
  pendingWithdrawalId: string | null;

  recruitedBy: string | null;
  recruitedByCode: string | null;
  recruitedAt: string | null;

  // Referral N2 (2-level system)
  parrainNiveau2Id: string | null;

  // Referral Stats
  qualifiedReferralsCount: number;
  referralsN2Count: number;
  referralEarnings: number;
  referralToClientRatio: number;

  // Referral Thresholds
  threshold10Reached: boolean;
  threshold50Reached: boolean;
  tierBonusesPaid: number[];

  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// ============================================================================
// COMMISSION
// ============================================================================

export interface ChatterCommission {
  id: string;
  chatterId: string;
  chatterEmail: string;
  chatterCode: string;
  type: ChatterCommissionType;
  sourceId: string | null;
  sourceType: "call_session" | "user" | "provider" | "bonus" | null;
  baseAmount: number;
  levelBonus: number;
  top3Bonus: number;
  zoomBonus: number;
  amount: number;
  currency: "USD";
  calculationDetails: string;
  status: ChatterCommissionStatus;
  description: string;
  createdAt: string;
  validatedAt: string | null;
  availableAt: string | null;
  paidAt: string | null;
}

export interface ChatterCommissionSummary {
  id: string;
  type: ChatterCommissionType;
  amount: number;
  status: ChatterCommissionStatus;
  description: string;
  createdAt: string;
}

// ============================================================================
// WITHDRAWAL
// ============================================================================

/**
 * @deprecated This withdrawal type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (WithdrawalRequest, WithdrawalStatus, etc.)
 * - Components: @/components/Payment
 * - Hooks: @/hooks/usePayment
 *
 * This type will be removed in a future version.
 */

export interface ChatterWithdrawal {
  id: string;
  chatterId: string;
  chatterEmail: string;
  chatterName: string;
  amount: number;
  sourceCurrency: "USD";
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  status: ChatterWithdrawalStatus;
  paymentMethod: ChatterPaymentMethod;
  commissionCount: number;
  paymentReference?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failedAt?: string;
  rejectionReason?: string;
  failureReason?: string;
}

// ============================================================================
// QUIZ
// ============================================================================

export interface ChatterQuizQuestion {
  id: string;
  question: string;
  /** Options from backend (named 'options' to match API response) */
  options: Array<{
    id: string;
    text: string;
    /** Only present in quiz results, not in initial questions */
    isCorrect?: boolean;
  }>;
}

export interface ChatterQuizResult {
  questionId: string;
  isCorrect: boolean;
  correctAnswerId: string;
  explanation?: string;
}

// ============================================================================
// BADGE
// ============================================================================

export interface ChatterBadge {
  id: ChatterBadgeType;
  name: string;
  description: string;
  icon: string;
  category: "milestone" | "streak" | "level" | "competition" | "activity";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  awardedAt?: string;
}

// ============================================================================
// ZOOM
// ============================================================================

export interface ChatterZoomMeeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  joinUrl: string;
  hasEnded: boolean;
}

// ============================================================================
// NOTIFICATION
// ============================================================================

export interface ChatterNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  data?: {
    commissionId?: string;
    withdrawalId?: string;
    badgeType?: ChatterBadgeType;
    newLevel?: ChatterLevel;
    amount?: number;
  };
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export interface ChatterLeaderboardEntry {
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
}

// ============================================================================
// CONFIG (subset exposed to frontend)
// ============================================================================

export interface ChatterConfig {
  commissionClientAmount: number;
  commissionRecruitmentAmount: number;
  minimumWithdrawalAmount: number;
  levelThresholds: {
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  levelBonuses: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
}

// ============================================================================
// DASHBOARD RESPONSE
// ============================================================================

/**
 * Piggy bank data for bonus display
 */
export interface PiggyBankData {
  isUnlocked: boolean;
  clientEarnings: number;
  unlockThreshold: number;
  progressPercent: number;
  amountToUnlock: number;
  totalPending: number;
  message: string;
}

/**
 * Weekly/monthly trend data for visualization
 */
export interface ChatterTrendsData {
  /** Daily earnings for this week (7 values, in cents) */
  earningsWeekly: number[];
  /** Daily earnings for last week (7 values, in cents) */
  earningsMonthly: number[];
  /** Daily clients for this week (7 values) */
  clientsWeekly: number[];
  /** Daily recruits for this week (7 values) */
  recruitsWeekly: number[];
}

/**
 * Month-over-month comparison data
 */
export interface ChatterComparisonData {
  /** Earnings this month vs last month (percentage change) */
  earningsVsLastMonth: number;
  /** Clients this month vs last month (percentage change) */
  clientsVsLastMonth: number;
  /** Recruits this month vs last month (percentage change) */
  recruitsVsLastMonth: number;
  /** Rank change (positive = moved up) */
  rankChange: number;
  /** Last month raw values for display */
  lastMonth: {
    earnings: number;
    clients: number;
    recruits: number;
  };
}

/**
 * Forecast/projection data
 */
export interface ChatterForecastData {
  /** Estimated end-of-month earnings (in cents) */
  estimatedMonthlyEarnings: number;
  /** Estimated time to next level (in days, null if max level) */
  estimatedNextLevel: number | null;
  /** Potential bonus from next tier (in cents) */
  potentialBonus: number;
  /** Current day of month */
  currentDayOfMonth: number;
}

export interface ChatterDashboardData {
  chatter: ChatterData;
  recentCommissions: ChatterCommissionSummary[];
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
  config: ChatterConfig;
  piggyBank?: PiggyBankData;
  /** Weekly/monthly trend data for visualization */
  trends?: ChatterTrendsData;
  /** Month-over-month comparison data */
  comparison?: ChatterComparisonData;
  /** Forecast/projection data */
  forecast?: ChatterForecastData;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface RegisterChatterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  country: string;
  interventionCountries: string[];
  language: SupportedChatterLanguage;
  additionalLanguages?: SupportedChatterLanguage[];
  platforms: ChatterPlatform[];
  bio?: string;
  recruitmentCode?: string;
}

export interface SubmitQuizInput {
  answers: Array<{
    questionId: string;
    answerId: string;
  }>;
  startedAt: string;
}

/**
 * @deprecated This input type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment
 * - Hooks: @/hooks/usePayment
 */
export interface RequestWithdrawalInput {
  amount?: number;
  paymentMethod: ChatterPaymentMethod;
  paymentDetails: ChatterPaymentDetails;
}

export interface UpdateChatterProfileInput {
  phone?: string;
  whatsapp?: string;
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
// TRAINING SYSTEM
// ============================================================================

export type TrainingModuleStatus = "draft" | "published" | "archived";
export type TrainingSlideType = "text" | "video" | "image" | "checklist" | "tips";
export type ChatterTrainingCategory =
  | "onboarding"
  | "promotion"
  | "conversion"
  | "recruitment"
  | "best_practices";

export interface TrainingSlide {
  order: number;
  type: TrainingSlideType;
  title: string;
  titleTranslations?: Record<string, string>;
  content: string;
  contentTranslations?: Record<string, string>;
  mediaUrl?: string;
  checklistItems?: Array<{
    text: string;
    textTranslations?: Record<string, string>;
  }>;
  tips?: Array<{
    text: string;
    textTranslations?: Record<string, string>;
  }>;
}

export interface TrainingQuizQuestion {
  id: string;
  question: string;
  questionTranslations?: Record<string, string>;
  options: Array<{
    id: string;
    text: string;
    textTranslations?: Record<string, string>;
  }>;
  correctAnswerId: string;
  explanation?: string;
  explanationTranslations?: Record<string, string>;
}

export interface ChatterTrainingModule {
  id: string;
  order: number;
  title: string;
  titleTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  category: ChatterTrainingCategory;
  coverImageUrl?: string;
  introVideoUrl?: string;
  slides: TrainingSlide[];
  quizQuestions: TrainingQuizQuestion[];
  passingScore: number;
  estimatedMinutes: number;
  isRequired: boolean;
  prerequisites: string[];
  status: TrainingModuleStatus;
  completionReward?: {
    type: "badge" | "bonus";
    badgeType?: ChatterBadgeType;
    bonusAmount?: number;
  };
}

export interface ChatterTrainingProgress {
  chatterId: string;
  moduleId: string;
  moduleTitle: string;
  startedAt: string;
  completedAt?: string;
  currentSlideIndex: number;
  slidesViewed: number[];
  quizAttempts: Array<{
    attemptedAt: string;
    answers: Array<{
      questionId: string;
      answerId: string;
      isCorrect: boolean;
    }>;
    score: number;
    passed: boolean;
  }>;
  bestScore: number;
  isCompleted: boolean;
  certificateId?: string;
}

export interface ChatterTrainingCertificate {
  id: string;
  chatterId: string;
  chatterName: string;
  moduleId: string;
  type: "module" | "full_program";
  title: string;
  averageScore: number;
  modulesCompleted: number;
  issuedAt: string;
  pdfUrl?: string;
  verificationCode: string;
}

export interface TrainingModuleListItem {
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
}

export interface TrainingOverallProgress {
  completedModules: number;
  totalModules: number;
  completionPercent: number;
  hasCertificate: boolean;
  certificateId?: string;
}

export interface SubmitTrainingQuizInput {
  moduleId: string;
  answers: Array<{
    questionId: string;
    answerId: string;
  }>;
}

export interface SubmitTrainingQuizResult {
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

// ============================================================================
// REFERRAL SYSTEM (2-LEVEL)
// ============================================================================

/**
 * Referral commission from parrainage
 */
export interface ChatterReferralCommission {
  id: string;
  parrainId: string;
  parrainEmail: string;
  filleulId: string;
  filleulName: string;
  type: "threshold_10" | "threshold_50" | "threshold_50_n2" | "recurring_5pct" | "tier_bonus";
  level: 1 | 2;
  baseAmount: number;
  promoMultiplier: number;
  amount: number;
  recurringMonth?: string;
  tierReached?: number;
  status: ChatterCommissionStatus;
  calculationDetails: string;
  createdAt: string;
}

/**
 * Filleul N1 data for display
 */
export interface ChatterFilleulN1 {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  clientEarnings: number;
  threshold10Reached: boolean;
  threshold50Reached: boolean;
  isActive: boolean;
  joinedAt: string;
  lastActivityAt?: string;
}

/**
 * Filleul N2 data for display
 */
export interface ChatterFilleulN2 {
  id: string;
  name: string;
  whatsapp?: string;
  parrainN1Name: string;
  threshold50Reached: boolean;
  joinedAt: string;
}

/**
 * Referral stats summary
 */
export interface ChatterReferralStats {
  totalFilleulsN1: number;
  qualifiedFilleulsN1: number;
  totalFilleulsN2: number;
  totalReferralEarnings: number;
  monthlyReferralEarnings: number;
}

/**
 * Tier progress info
 */
export interface ChatterTierProgress {
  currentTier: number | null;
  nextTier: number | null;
  filleulsNeeded: number;
  bonusAmount: number;
  qualifiedFilleulsCount?: number;
  paidTierBonuses?: number[];
}

/**
 * Active promotion info
 */
export interface ChatterActivePromotion {
  id: string;
  name: string;
  multiplier: number;
  endsAt: string;
}

/**
 * Promotion data
 */
export interface ChatterPromotion {
  id: string;
  name: string;
  description: string;
  type: "hackathon" | "bonus_weekend" | "country_challenge" | "special_event";
  multiplier: number;
  appliesToTypes: ChatterCommissionType[];
  targetCountries: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxBudget: number;
  currentSpent: number;
}

/**
 * Viral kit data for sharing
 */
export interface ChatterViralKit {
  referralLink: string;
  referralCode: string;
  shareMessages: {
    fr: string;
    en: string;
  };
  qrCodeUrl?: string;
}

/**
 * Referral dashboard response
 */
export interface ChatterReferralDashboardData {
  stats: ChatterReferralStats;
  recentCommissions: Array<{
    id: string;
    type: ChatterCommissionType;
    filleulName: string;
    amount: number;
    createdAt: string;
  }>;
  filleulsN1: ChatterFilleulN1[];
  filleulsN2: ChatterFilleulN2[];
  tierProgress: ChatterTierProgress;
  activePromotion: ChatterActivePromotion | null;
}

/**
 * Referral configuration constants
 */
export const REFERRAL_CONFIG = {
  THRESHOLDS: {
    THRESHOLD_10: 1000,   // $10
    THRESHOLD_50: 5000,   // $50
  },
  COMMISSIONS: {
    THRESHOLD_10_AMOUNT: 100,    // $1
    THRESHOLD_50_N1_AMOUNT: 400, // $4
    THRESHOLD_50_N2_AMOUNT: 200, // $2
    N1_PER_CALL: 100,            // $1 per call from N1
    N2_PER_CALL: 50,             // $0.50 per call from N2
    MONTHLY_ACTIVITY_THRESHOLD: 2000,
  },
  TIER_BONUSES: {
    5: 1500,      // $15
    10: 3500,     // $35
    20: 7500,     // $75
    50: 25000,    // $250
    100: 60000,   // $600
    500: 400000,  // $4,000
  } as Record<number, number>,
} as const;

// ============================================================================
// ACTIVITY FEED
// ============================================================================

/**
 * Activity types for live feed
 */
export type ActivityFeedType = "commission" | "signup" | "level_up";

/**
 * Activity feed item for live social proof display
 */
export interface ActivityFeedItem {
  id: string;
  type: ActivityFeedType;
  chatterName: string; // Anonymized: "Marie D."
  country: string; // ISO country code: "FR"
  amount?: number; // In cents, for commission type
  level?: number; // For level_up type
  createdAt: string; // ISO timestamp
  expiresAt: string; // TTL 24h
}
