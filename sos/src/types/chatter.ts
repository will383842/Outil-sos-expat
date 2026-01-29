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
  | "client_referral"
  | "recruitment"
  | "bonus_level"
  | "bonus_streak"
  | "bonus_top3"
  | "bonus_zoom"
  | "manual_adjustment";

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

// NOTE: Added 'paypal' for alignment with Influencer system
export type ChatterPaymentMethod = "wise" | "paypal" | "mobile_money" | "bank_transfer";

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
  | "recruits_5"
  | "recruits_10"
  | "earned_100"
  | "earned_500"
  | "earned_1000"
  | "zoom_participant"
  | "zoom_regular";

// ============================================================================
// PAYMENT DETAILS
// ============================================================================

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

export interface ChatterPayPalDetails {
  type: "paypal";
  email: string;
  currency: string;
  accountHolderName: string;
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
  | ChatterPayPalDetails
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
}

// ============================================================================
// INPUT TYPES
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
  recruitmentCode?: string;
}

export interface SubmitQuizInput {
  answers: Array<{
    questionId: string;
    answerId: string;
  }>;
  startedAt: string;
}

export interface RequestWithdrawalInput {
  amount?: number;
  paymentMethod: ChatterPaymentMethod;
  paymentDetails: ChatterPaymentDetails;
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
