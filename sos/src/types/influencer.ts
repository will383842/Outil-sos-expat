/**
 * Influencer Types for Frontend
 *
 * Matches the backend types from functions/src/influencer/types.ts
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

// NOTE: Changed from 'blocked' to 'banned' for consistency with Chatter
export type InfluencerStatus = 'active' | 'suspended' | 'banned';

// V2: Extended commission types
export type InfluencerCommissionType =
  | 'client_referral'
  | 'recruitment'
  | 'signup_bonus'
  | 'first_call'
  | 'recurring_call'
  | 'subscription'
  | 'renewal'
  | 'provider_bonus'
  | 'manual_adjustment';

// V2: Commission calculation type
export type CommissionCalculationType = 'fixed' | 'percentage' | 'hybrid';

export type InfluencerCommissionStatus = 'pending' | 'validated' | 'available' | 'paid' | 'cancelled';

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (WithdrawalStatus)
 *
 * This type will be removed in a future version.
 */
export type InfluencerWithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (PaymentMethod)
 *
 * NOTE: Added 'mobile_money' for alignment with Chatter (African markets)
 * This type will be removed in a future version.
 */
export type InfluencerPaymentMethod = 'wise' | 'mobile_money' | 'bank_transfer';

export type InfluencerPlatform =
  | 'youtube'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'twitter'
  | 'linkedin'
  | 'blog'
  | 'website'
  | 'podcast'
  | 'newsletter'
  | 'other';

// ============================================================================
// V2: COMMISSION RULES
// ============================================================================

export interface InfluencerCommissionConditions {
  minCallDuration?: number;
  providerTypes?: ('lawyer' | 'expat')[];
  maxPerMonth?: number;
  lifetimeLimit?: number;
  requireEmailVerification?: boolean;
}

export interface InfluencerCommissionRule {
  id: string;
  type: InfluencerCommissionType;
  enabled: boolean;
  calculationType: CommissionCalculationType;
  fixedAmount: number;
  percentageRate: number;
  applyTo?: 'connection_fee' | 'total_amount';
  conditions: InfluencerCommissionConditions;
  holdPeriodDays: number;
  releaseDelayHours: number;
  description: string;
}

export interface InfluencerCapturedRates {
  capturedAt: string;
  version: number;
  rules: Partial<Record<InfluencerCommissionType, {
    calculationType: CommissionCalculationType;
    fixedAmount: number;
    percentageRate: number;
    holdPeriodDays: number;
    releaseDelayHours: number;
  }>>;
}

export interface InfluencerAntiFraudConfig {
  enabled: boolean;
  maxReferralsPerDay: number;
  maxReferralsPerWeek: number;
  blockSameIPReferrals: boolean;
  minAccountAgeDays: number;
  requireEmailVerification: boolean;
  suspiciousConversionRateThreshold: number;
  autoSuspendOnViolation: boolean;
}

export interface InfluencerRateHistoryEntry {
  changedAt: string;
  changedBy: string;
  previousRules: InfluencerCommissionRule[];
  reason: string;
}

// ============================================================================
// INFLUENCER PROFILE
// ============================================================================

export interface Influencer {
  id: string;
  odooId?: number;
  userId: string;

  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: string;

  // Profile info
  platforms: InfluencerPlatform[];
  bio?: string;
  communitySize?: number;
  communityNiche?: string;
  socialLinks?: Record<string, string>;

  // Affiliate codes
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;

  // Status
  status: InfluencerStatus;
  suspensionReason?: string;
  suspendedAt?: string;

  // Balance (in cents)
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawalId?: string;

  // Statistics
  totalClicks: number;
  totalReferrals: number;
  totalClientsReferred: number;
  totalProvidersRecruited: number;
  conversionRate: number;
  currentMonthEarnings: number;
  currentMonthRank?: number;

  // Level & bonuses
  level?: 1 | 2 | 3 | 4 | 5;
  levelProgress?: number;
  monthlyTopMultiplier?: number;
  monthlyTopMultiplierMonth?: string | null;
  bestStreak?: number;

  // Activity tracking
  lastActivityAt?: string;
  currentStreak: number;
  longestStreak: number;

  // V2: Captured rates (frozen at registration)
  capturedRates?: InfluencerCapturedRates;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMMISSION
// ============================================================================

export interface InfluencerCommission {
  id: string;
  influencerId: string;

  // Type and amounts
  type: InfluencerCommissionType;
  baseAmount: number;
  finalAmount: number;

  // Status
  status: InfluencerCommissionStatus;

  // Reference data
  referenceId?: string;
  referenceType?: 'call' | 'provider';
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: string;
  validatedAt?: string;
  availableAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

// ============================================================================
// WITHDRAWAL
// ============================================================================

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (PaymentDetailsWise)
 *
 * This type will be removed in a future version.
 */
export interface InfluencerPaymentDetailsWise {
  type: 'wise';
  email: string;
  currency: string;
  accountHolderName: string;
}

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (MobileMoneyProvider)
 *
 * This type will be removed in a future version.
 */
export type InfluencerMobileMoneyProvider =
  | 'orange_money'
  | 'wave'
  | 'mtn_momo'
  | 'moov_money'
  | 'airtel_money'
  | 'mpesa';

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (PaymentDetailsMobileMoney)
 *
 * This type will be removed in a future version.
 */
export interface InfluencerPaymentDetailsMobileMoney {
  type: 'mobile_money';
  provider: InfluencerMobileMoneyProvider;
  phoneNumber: string;
  country: string;
  accountName: string;
}

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (PaymentDetailsBankTransfer)
 *
 * This type will be removed in a future version.
 */
export interface InfluencerPaymentDetailsBankTransfer {
  type: 'bank_transfer';
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  country: string;
  currency: string;
}

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (PaymentDetails)
 *
 * This type will be removed in a future version.
 */
export type InfluencerPaymentDetails =
  | InfluencerPaymentDetailsWise
  | InfluencerPaymentDetailsMobileMoney
  | InfluencerPaymentDetailsBankTransfer;

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (WithdrawalRequest)
 *
 * This type will be removed in a future version.
 */
export interface InfluencerWithdrawal {
  id: string;
  influencerId: string;

  // Amount
  amount: number;

  // Payment info
  paymentMethod: InfluencerPaymentMethod;
  paymentDetails: InfluencerPaymentDetails;

  // Status
  status: InfluencerWithdrawalStatus;
  rejectionReason?: string;
  failureReason?: string;

  // Admin
  processedBy?: string;
  transactionId?: string;

  // Timestamps
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  failedAt?: string;
}

// ============================================================================
// REFERRAL (Provider Recruitment)
// ============================================================================

export interface InfluencerReferral {
  id: string;
  influencerId: string;
  providerId: string;

  // Tracking
  commissionWindowEnd: string;
  totalCallsReceived: number;
  totalCommissionsEarned: number;

  // Provider info (for display)
  providerName?: string;
  providerRole?: 'lawyer' | 'expat';

  // Timestamps
  createdAt: string;
}

// ============================================================================
// NOTIFICATION
// ============================================================================

export type InfluencerNotificationType =
  | 'welcome'
  | 'commission_earned'
  | 'commission_validated'
  | 'commission_available'
  | 'withdrawal_approved'
  | 'withdrawal_completed'
  | 'withdrawal_rejected'
  | 'withdrawal_failed'
  | 'referral_converted'
  | 'provider_recruited'
  | 'status_change'
  | 'system';

export interface InfluencerNotification {
  id: string;
  influencerId: string;
  type: InfluencerNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ============================================================================
// CONFIG
// ============================================================================

export interface InfluencerConfig {
  // System status
  isSystemActive?: boolean;
  newRegistrationsEnabled?: boolean;
  withdrawalsEnabled?: boolean;
  trainingEnabled?: boolean;

  // Commission rates (fixed amounts in cents) - Legacy
  clientReferralCommission: number;
  providerRecruitmentCommission: number;

  // Client discount
  clientDiscountPercent: number;

  // Withdrawal settings
  minimumWithdrawalAmount: number;

  // Commission validation
  commissionValidationDays: number;
  commissionReleaseHours: number;

  // Recruitment window
  recruitmentCommissionWindowMonths: number;

  // V2: Commission rules
  commissionRules?: InfluencerCommissionRule[];

  // V2: Anti-fraud
  antiFraud?: InfluencerAntiFraudConfig;

  // V2: Hold period defaults
  defaultHoldPeriodDays?: number;
  defaultReleaseDelayHours?: number;

  // V2: Rate history
  rateHistory?: InfluencerRateHistoryEntry[];

  // Version
  version?: number;

  // Timestamps
  updatedAt?: string;
  updatedBy?: string;
}

// ============================================================================
// DASHBOARD DATA
// ============================================================================

export interface InfluencerDashboardData {
  influencer: Influencer;
  recentCommissions: InfluencerCommission[];
  recentNotifications: InfluencerNotification[];
  config: InfluencerConfig;
  monthlyRank?: {
    rank: number;
    totalParticipants: number;
    earnings: number;
  };
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export interface InfluencerLeaderboardEntry {
  rank: number;
  influencerId: string;
  displayName: string;
  country?: string;
  earnings: number;
  referrals: number;
  isCurrentUser: boolean;
}

export interface InfluencerLeaderboardData {
  month: string;
  year: number;
  entries: InfluencerLeaderboardEntry[];
  currentUserRank?: InfluencerLeaderboardEntry;
  totalParticipants: number;
}

// ============================================================================
// INPUT TYPES (for callables)
// ============================================================================

export interface RegisterInfluencerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: string;
  platforms: InfluencerPlatform[];
  bio?: string;
  communitySize?: number;
  communityNiche?: string;
  socialLinks?: Record<string, string>;
}

export interface UpdateInfluencerProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  communitySize?: number;
  communityNiche?: string;
  socialLinks?: Record<string, string>;
}

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment (WithdrawalRequestInput)
 * - Hooks: @/hooks/usePayment
 *
 * This type will be removed in a future version.
 */
export interface RequestInfluencerWithdrawalInput {
  amount: number;
  paymentMethod: InfluencerPaymentMethod;
  paymentDetails: InfluencerPaymentDetails;
}

// ============================================================================
// TRAINING SYSTEM
// ============================================================================

export type TrainingModuleStatus = "draft" | "published" | "archived";
export type TrainingSlideType = "text" | "video" | "image" | "checklist" | "tips";
export type InfluencerTrainingCategory =
  | "onboarding"
  | "content_creation"
  | "promotion"
  | "analytics"
  | "monetization";

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

export interface InfluencerTrainingModule {
  id: string;
  order: number;
  title: string;
  titleTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  category: InfluencerTrainingCategory;
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
    type: "bonus";
    bonusAmount?: number;
  };
}

export interface InfluencerTrainingProgress {
  influencerId: string;
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

export interface InfluencerTrainingCertificate {
  id: string;
  influencerId: string;
  influencerName: string;
  moduleId: string;
  type: "module" | "full_program";
  title: string;
  averageScore: number;
  modulesCompleted: number;
  issuedAt: string;
  pdfUrl?: string;
  verificationCode: string;
}

export interface InfluencerTrainingModuleListItem {
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
}

export interface InfluencerTrainingOverallProgress {
  completedModules: number;
  totalModules: number;
  completionPercent: number;
  hasCertificate: boolean;
  certificateId?: string;
}

export interface SubmitInfluencerTrainingQuizInput {
  moduleId: string;
  answers: Array<{
    questionId: string;
    answerId: string;
  }>;
}

export interface SubmitInfluencerTrainingQuizResult {
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

// ============================================================================
// RESOURCES
// ============================================================================

export type InfluencerResourceCategory = 'sos_expat' | 'ulixai' | 'founder';

export interface InfluencerResourceFile {
  id: string;
  category: InfluencerResourceCategory;
  type: string;
  name: string;
  description?: string;
  fileUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  format?: string;
  size?: number;
  sizeFormatted?: string;
  dimensions?: { width: number; height: number };
}

export interface InfluencerResourceText {
  id: string;
  category: InfluencerResourceCategory;
  type: string;
  title: string;
  content: string;
}

export interface InfluencerResourcesData {
  files: InfluencerResourceFile[];
  texts: InfluencerResourceText[];
}
