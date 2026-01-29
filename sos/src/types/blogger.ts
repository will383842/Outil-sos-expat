/**
 * Blogger Types for Frontend
 *
 * Matches the backend types from functions/src/blogger/types.ts
 *
 * KEY DIFFERENCES FROM CHATTER/INFLUENCER:
 * - FIXED commissions only ($10 client, $5 recruitment)
 * - No levels, no bonuses, no multipliers
 * - No quiz (direct activation)
 * - No client discount (0%)
 * - Definitive role (cannot change)
 * - 12 simplified badges
 * - Exclusive Resources section
 * - Exclusive Integration Guide
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type BloggerStatus = 'active' | 'suspended' | 'blocked';

export type BloggerCommissionType = 'client_referral' | 'recruitment' | 'manual_adjustment';

export type BloggerCommissionStatus = 'pending' | 'validated' | 'available' | 'paid' | 'cancelled';

export type BloggerWithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';

export type BloggerPaymentMethod = 'paypal' | 'wise' | 'mobile_money';

export type BlogTrafficTier = 'lt1k' | '1k-5k' | '5k-10k' | '10k-50k' | '50k-100k' | 'gt100k';

export type BlogTheme =
  | 'expatriation'
  | 'travel'
  | 'legal'
  | 'finance'
  | 'lifestyle'
  | 'tech'
  | 'family'
  | 'career'
  | 'education'
  | 'other';

export type BloggerBadgeType =
  | 'first_conversion'
  | 'earnings_100'
  | 'earnings_500'
  | 'earnings_1000'
  | 'earnings_5000'
  | 'recruit_1'
  | 'recruit_10'
  | 'streak_7'
  | 'streak_30'
  | 'top10'
  | 'top3'
  | 'top1';

export type BloggerResourceCategory = 'sos_expat' | 'ulixai' | 'founder';

export type BloggerResourceType = 'logo' | 'image' | 'text' | 'data' | 'photo' | 'bio' | 'quote';

export type SupportedBloggerLanguage = 'fr' | 'en' | 'es' | 'pt' | 'ar' | 'de' | 'it' | 'nl' | 'zh';

// ============================================================================
// BLOGGER PROFILE
// ============================================================================

export interface Blogger {
  id: string;

  // Personal info
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoUrl?: string;
  country: string;
  language: SupportedBloggerLanguage;
  additionalLanguages?: SupportedBloggerLanguage[];
  bio?: string;

  // Blog info (SPECIFIC TO BLOGGERS)
  blogUrl: string;
  blogName: string;
  blogLanguage: SupportedBloggerLanguage;
  blogCountry: string;
  blogTheme: BlogTheme;
  blogTraffic: BlogTrafficTier;
  blogDescription?: string;

  // Status
  status: BloggerStatus;
  suspensionReason?: string;

  // Definitive role acknowledgment
  definitiveRoleAcknowledged: boolean;
  definitiveRoleAcknowledgedAt: string | null;

  // Affiliate codes
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;

  // Balances (in cents)
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalWithdrawn: number;

  // Statistics
  totalClients: number;
  totalRecruits: number;
  totalCommissions: number;
  currentMonthStats: {
    clients: number;
    recruits: number;
    earnings: number;
    month: string;
  };
  currentMonthRank: number | null;
  bestRank: number | null;

  // Gamification (simplified)
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  badges: BloggerBadgeType[];

  // Payment
  preferredPaymentMethod: BloggerPaymentMethod | null;
  paymentDetails: BloggerPaymentDetails | null;
  pendingWithdrawalId: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// ============================================================================
// PAYMENT DETAILS
// ============================================================================

export interface BloggerPayPalDetails {
  type: 'paypal';
  email: string;
  currency: string;
  accountHolderName: string;
}

export interface BloggerWiseDetails {
  type: 'wise';
  email: string;
  currency: string;
  accountHolderName: string;
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bic?: string;
}

export interface BloggerMobileMoneyDetails {
  type: 'mobile_money';
  provider: 'mtn' | 'orange' | 'moov' | 'airtel' | 'mpesa' | 'wave';
  phoneNumber: string;
  country: string;
  currency: string;
  accountName: string;
}

export type BloggerPaymentDetails =
  | BloggerPayPalDetails
  | BloggerWiseDetails
  | BloggerMobileMoneyDetails;

// ============================================================================
// COMMISSION
// ============================================================================

export interface BloggerCommission {
  id: string;
  bloggerId: string;
  bloggerEmail: string;
  bloggerCode: string;

  type: BloggerCommissionType;
  amount: number; // FIXED, no bonuses
  currency: 'USD';
  description: string;
  status: BloggerCommissionStatus;

  sourceId: string | null;
  sourceType: 'call_session' | 'user' | 'provider' | null;
  sourceDetails?: {
    clientId?: string;
    clientEmail?: string;
    callSessionId?: string;
    callDuration?: number;
    connectionFee?: number;
    providerId?: string;
    providerEmail?: string;
    providerType?: 'lawyer' | 'expat';
    callId?: string;
    recruitmentDate?: string;
    monthsRemaining?: number;
  };

  validatedAt: string | null;
  availableAt: string | null;
  withdrawalId: string | null;
  paidAt: string | null;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WITHDRAWAL
// ============================================================================

export interface BloggerWithdrawal {
  id: string;
  bloggerId: string;
  bloggerEmail: string;
  bloggerName: string;

  amount: number;
  sourceCurrency: 'USD';
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;

  status: BloggerWithdrawalStatus;
  paymentMethod: BloggerPaymentMethod;
  paymentDetailsSnapshot: BloggerPaymentDetails;

  commissionIds: string[];
  commissionCount: number;

  paymentReference?: string;
  paypalTransactionId?: string;
  wiseTransferId?: string;
  flutterwaveRef?: string;
  estimatedArrival?: string;

  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  adminNotes?: string;
}

// ============================================================================
// RECRUITED PROVIDER
// ============================================================================

export interface BloggerRecruitedProvider {
  id: string;
  bloggerId: string;
  bloggerCode: string;
  bloggerEmail: string;

  providerId: string;
  providerEmail: string;
  providerType: 'lawyer' | 'expat';
  providerName: string;

  recruitedAt: string;
  commissionWindowEndsAt: string;
  isActive: boolean;

  callsWithCommission: number;
  totalCommissions: number;
  lastCommissionAt: string | null;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// BADGES
// ============================================================================

export interface BloggerBadgeDefinition {
  id: BloggerBadgeType;
  name: string;
  nameTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  icon: string;
  category: 'milestone' | 'earnings' | 'recruitment' | 'streak' | 'competition';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  order: number;
}

export interface BloggerBadgeAward {
  id: string;
  bloggerId: string;
  bloggerEmail: string;
  badgeType: BloggerBadgeType;
  awardedAt: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// NOTIFICATION
// ============================================================================

export type BloggerNotificationType =
  | 'commission_earned'
  | 'commission_validated'
  | 'commission_available'
  | 'withdrawal_approved'
  | 'withdrawal_completed'
  | 'withdrawal_rejected'
  | 'badge_earned'
  | 'rank_achieved'
  | 'new_referral'
  | 'new_resource'
  | 'guide_update'
  | 'system';

export interface BloggerNotification {
  id: string;
  bloggerId: string;
  type: BloggerNotificationType;
  title: string;
  titleTranslations?: Record<string, string>;
  message: string;
  messageTranslations?: Record<string, string>;
  actionUrl?: string;
  isRead: boolean;
  emailSent: boolean;
  data?: {
    commissionId?: string;
    withdrawalId?: string;
    badgeType?: BloggerBadgeType;
    referralId?: string;
    resourceId?: string;
    rank?: number;
    month?: string;
    amount?: number;
  };
  createdAt: string;
  readAt?: string;
}

// ============================================================================
// MONTHLY RANKINGS
// ============================================================================

export interface BloggerMonthlyRanking {
  id: string;
  month: string;
  rankings: Array<{
    rank: number;
    bloggerId: string;
    bloggerName: string;
    bloggerCode: string;
    photoUrl?: string;
    country: string;
    blogUrl: string;
    monthlyEarnings: number;
    monthlyClients: number;
    monthlyRecruits: number;
  }>;
  calculatedAt: string;
  isFinalized: boolean;
}

// ============================================================================
// RESOURCES (EXCLUSIVE)
// ============================================================================

export interface BloggerResource {
  id: string;
  category: BloggerResourceCategory;
  type: BloggerResourceType;
  name: string;
  nameTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  fileFormat?: string;
  dimensions?: { width: number; height: number };
  isActive: boolean;
  order: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BloggerResourceText {
  id: string;
  category: BloggerResourceCategory;
  type: BloggerResourceType;
  title: string;
  titleTranslations?: Record<string, string>;
  content: string;
  contentTranslations?: Record<string, string>;
  isActive: boolean;
  order: number;
  copyCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GUIDE (EXCLUSIVE)
// ============================================================================

export interface BloggerGuideTemplate {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  content: string;
  contentTranslations?: Record<string, string>;
  targetAudience?: string;
  recommendedWordCount?: number;
  seoKeywords?: string[];
  isActive: boolean;
  order: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BloggerGuideCopyText {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  category: 'intro' | 'cta' | 'testimonial' | 'feature' | 'benefit' | 'conclusion';
  content: string;
  contentTranslations?: Record<string, string>;
  characterCount: number;
  isActive: boolean;
  order: number;
  copyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BloggerGuideBestPractice {
  id: string;
  title: string;
  titleTranslations?: Record<string, string>;
  content: string;
  contentTranslations?: Record<string, string>;
  category: 'seo' | 'writing' | 'promotion' | 'conversion' | 'monetization';
  icon?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface BloggerConfig {
  id: 'current';
  isSystemActive: boolean;
  newRegistrationsEnabled: boolean;
  withdrawalsEnabled: boolean;
  commissionClientAmount: number; // FIXED $10
  commissionRecruitmentAmount: number; // FIXED $5
  clientDiscountPercent: number; // 0% for bloggers
  recruitmentWindowMonths: number;
  minimumWithdrawalAmount: number;
  validationHoldPeriodDays: number;
  releaseDelayHours: number;
  attributionWindowDays: number;
  leaderboardSize: number;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// API INPUT/OUTPUT TYPES
// ============================================================================

export interface RegisterBloggerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: SupportedBloggerLanguage;
  additionalLanguages?: SupportedBloggerLanguage[];
  bio?: string;
  blogUrl: string;
  blogName: string;
  blogLanguage: SupportedBloggerLanguage;
  blogCountry: string;
  blogTheme: BlogTheme;
  blogTraffic: BlogTrafficTier;
  blogDescription?: string;
  definitiveRoleAcknowledged: boolean;
}

export interface RegisterBloggerResponse {
  success: boolean;
  bloggerId: string;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  message: string;
}

export interface BloggerDashboardData {
  blogger: Omit<Blogger, 'paymentDetails'>;
  recentCommissions: Array<{
    id: string;
    type: BloggerCommissionType;
    amount: number;
    status: BloggerCommissionStatus;
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
  config: {
    commissionClientAmount: number;
    commissionRecruitmentAmount: number;
    minimumWithdrawalAmount: number;
  };
  // Additional data for referrals page
  recruitedProviders?: Array<{
    providerId: string;
    providerDisplayName: string;
    providerSpecialty?: string;
    registeredAt: string;
    commissionExpiresAt: string;
    isActive: boolean;
    totalCalls: number;
    totalEarned: number;
  }>;
  recruitmentEarnings?: number;
}

export interface RequestBloggerWithdrawalInput {
  amount?: number;
  paymentMethod: BloggerPaymentMethod;
  paymentDetails: BloggerPaymentDetails;
}

export interface RequestBloggerWithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: BloggerWithdrawalStatus;
  message: string;
}

export interface UpdateBloggerProfileInput {
  phone?: string;
  country?: string;
  additionalLanguages?: SupportedBloggerLanguage[];
  bio?: string;
  photoUrl?: string;
  blogUrl?: string;
  blogName?: string;
  blogDescription?: string;
  blogTheme?: BlogTheme;
  blogTraffic?: BlogTrafficTier;
  preferredPaymentMethod?: BloggerPaymentMethod;
  paymentDetails?: BloggerPaymentDetails;
}

export interface BloggerLeaderboardEntry {
  rank: number;
  bloggerId: string;
  displayName: string;
  blogName: string;
  photoUrl?: string;
  country: string;
  earnings: number;
  clients: number;
  isCurrentUser: boolean;
}

export interface BloggerLeaderboardData {
  entries: BloggerLeaderboardEntry[];
  currentUserRank: {
    rank: number;
    earnings: number;
    clients: number;
  } | null;
  month: string;
}

// ============================================================================
// RESOURCES API TYPES
// ============================================================================

export interface BloggerResourceFile {
  id: string;
  category: BloggerResourceCategory;
  type: BloggerResourceType;
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

export interface BloggerResourcesData {
  files: BloggerResourceFile[];
  texts: BloggerResourceText[];
}

// Simplified types for Guide API response (used in frontend)
export interface BloggerGuideTemplateResponse {
  id: string;
  title: string;
  description?: string;
  content: string;
  targetAudience?: string;
  recommendedWordCount?: number;
  seoKeywords?: string[];
}

export interface BloggerGuideCopyTextResponse {
  id: string;
  title: string;
  type: string;
  content: string;
  characterCount?: number;
}

export interface BloggerGuideBestPracticeResponse {
  id: string;
  title: string;
  content: string;
  priority?: 'high' | 'medium' | 'low';
  examples?: string[];
}

export interface BloggerGuideData {
  templates: BloggerGuideTemplateResponse[];
  copyTexts: BloggerGuideCopyTextResponse[];
  bestPractices: BloggerGuideBestPracticeResponse[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const BLOG_THEMES: { value: BlogTheme; labelFr: string; labelEn: string }[] = [
  { value: 'expatriation', labelFr: 'Expatriation', labelEn: 'Expatriation' },
  { value: 'travel', labelFr: 'Voyage', labelEn: 'Travel' },
  { value: 'legal', labelFr: 'Juridique', labelEn: 'Legal' },
  { value: 'finance', labelFr: 'Finance', labelEn: 'Finance' },
  { value: 'lifestyle', labelFr: 'Lifestyle', labelEn: 'Lifestyle' },
  { value: 'tech', labelFr: 'Technologie', labelEn: 'Technology' },
  { value: 'family', labelFr: 'Famille', labelEn: 'Family' },
  { value: 'career', labelFr: 'Carrière', labelEn: 'Career' },
  { value: 'education', labelFr: 'Éducation', labelEn: 'Education' },
  { value: 'other', labelFr: 'Autre', labelEn: 'Other' },
];

export const BLOG_TRAFFIC_TIERS: { value: BlogTrafficTier; labelFr: string; labelEn: string }[] = [
  { value: 'lt1k', labelFr: '< 1 000 visiteurs/mois', labelEn: '< 1,000 visitors/month' },
  { value: '1k-5k', labelFr: '1 000 - 5 000 visiteurs/mois', labelEn: '1,000 - 5,000 visitors/month' },
  { value: '5k-10k', labelFr: '5 000 - 10 000 visiteurs/mois', labelEn: '5,000 - 10,000 visitors/month' },
  { value: '10k-50k', labelFr: '10 000 - 50 000 visiteurs/mois', labelEn: '10,000 - 50,000 visitors/month' },
  { value: '50k-100k', labelFr: '50 000 - 100 000 visiteurs/mois', labelEn: '50,000 - 100,000 visitors/month' },
  { value: 'gt100k', labelFr: '> 100 000 visiteurs/mois', labelEn: '> 100,000 visitors/month' },
];

export const BLOGGER_BADGE_INFO: Record<BloggerBadgeType, { emoji: string; icon: string; color: string; labelFr: string; labelEn: string }> = {
  first_conversion: { emoji: '🎯', icon: '🎯', color: 'green', labelFr: 'Première conversion', labelEn: 'First conversion' },
  earnings_100: { emoji: '💵', icon: '💵', color: 'green', labelFr: '100$ gagnés', labelEn: '$100 earned' },
  earnings_500: { emoji: '💰', icon: '💰', color: 'blue', labelFr: '500$ gagnés', labelEn: '$500 earned' },
  earnings_1000: { emoji: '💎', icon: '💎', color: 'purple', labelFr: '1000$ gagnés', labelEn: '$1000 earned' },
  earnings_5000: { emoji: '🏆', icon: '🏆', color: 'gold', labelFr: '5000$ gagnés', labelEn: '$5000 earned' },
  recruit_1: { emoji: '🤝', icon: '🤝', color: 'blue', labelFr: 'Premier filleul', labelEn: 'First recruit' },
  recruit_10: { emoji: '👥', icon: '👥', color: 'purple', labelFr: '10 filleuls', labelEn: '10 recruits' },
  streak_7: { emoji: '🔥', icon: '🔥', color: 'orange', labelFr: '7 jours consécutifs', labelEn: '7-day streak' },
  streak_30: { emoji: '⚡', icon: '⚡', color: 'yellow', labelFr: '30 jours consécutifs', labelEn: '30-day streak' },
  top10: { emoji: '📊', icon: '📊', color: 'blue', labelFr: 'Top 10', labelEn: 'Top 10' },
  top3: { emoji: '🥉', icon: '🥉', color: 'bronze', labelFr: 'Top 3', labelEn: 'Top 3' },
  top1: { emoji: '🥇', icon: '🥇', color: 'gold', labelFr: 'Numéro 1', labelEn: 'Number 1' },
};
