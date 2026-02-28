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

export type BloggerStatus = 'active' | 'suspended' | 'banned';

export type BloggerCommissionType = 'client_referral' | 'recruitment' | 'manual_adjustment';

export type BloggerCommissionStatus = 'pending' | 'validated' | 'available' | 'paid' | 'cancelled';

/**
 * @deprecated Use centralized payment types from @/types/payment instead.
 */
export type BloggerWithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';

/**
 * @deprecated Use centralized payment types from @/types/payment instead.
 */
export type BloggerPaymentMethod = 'wise' | 'mobile_money';

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

  // Telegram Onboarding
  telegramOnboardingCompleted?: boolean;
  telegramOnboardingSkipped?: boolean;
  hasTelegram?: boolean;
  telegramId?: number;
  telegramUsername?: string;
  telegramLinkedAt?: string;
  telegramBonusCredited?: boolean;
  telegramBonusAmount?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// ============================================================================
// PAYMENT DETAILS
// ============================================================================

/**
 * @deprecated These payment types are deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment
 *
 * These types will be removed in a future version.
 */

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

/**
 * @deprecated This type is deprecated.
 * Use the centralized payment system instead:
 * - Types: @/types/payment
 *
 * This type will be removed in a future version.
 */
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
  recruitmentCode?: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
  termsType?: string;
  termsAffiliateVersion?: string;
  termsAffiliateType?: string;
  termsAcceptanceMeta?: {
    userAgent: string;
    language: string;
    timestamp: number;
    acceptanceMethod: string;
  };
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

/**
 * @deprecated Use centralized payment types from @/types/payment instead.
 */
export interface RequestBloggerWithdrawalInput {
  amount?: number;
  paymentMethod: BloggerPaymentMethod;
  paymentDetails: BloggerPaymentDetails;
}

/**
 * @deprecated Use centralized payment types from @/types/payment instead.
 */
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

// ============================================================================
// PROMO WIDGETS (NEW - For Blogger Dashboard)
// ============================================================================

/**
 * Type of promo widget
 * - button: CTA button with customizable text and colors
 * - banner: Image banner with various dimensions
 */
export type PromoWidgetType = 'button' | 'banner';

/**
 * Target type for tracking
 * - client: For referring new clients ($10/call)
 * - recruitment: For finding partners ($5/call for 6 months)
 */
export type PromoWidgetTargetType = 'client' | 'recruitment';

/**
 * Standard banner dimensions
 */
export type PromoWidgetDimension =
  | '728x90'    // Leaderboard
  | '300x250'   // Medium Rectangle
  | '160x600'   // Wide Skyscraper
  | '320x50'    // Mobile Leaderboard
  | '300x600'   // Half Page
  | '970x250'   // Billboard
  | '250x250'   // Square
  | '120x60'    // Button (small)
  | '468x60'    // Full Banner
  | 'custom';   // Custom size for buttons

/**
 * Widget style configuration for buttons
 */
export interface PromoWidgetButtonStyle {
  backgroundColor: string;
  backgroundGradient?: string;
  textColor: string;
  borderRadius: string;
  fontSize: string;
  fontWeight: string;
  padding: string;
  hoverBackgroundColor?: string;
  hoverBackgroundGradient?: string;
  shadow?: string;
}

/**
 * Promo Widget definition
 * Stored in Firestore collection: blogger_promo_widgets
 */
export interface PromoWidget {
  id: string;

  // Basic info
  name: string;
  nameTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;

  // Widget configuration
  type: PromoWidgetType;
  targetType: PromoWidgetTargetType;
  dimension: PromoWidgetDimension;
  customWidth?: number;
  customHeight?: number;

  // Content
  buttonText?: string;
  buttonTextTranslations?: Record<string, string>;
  imageUrl?: string;
  altText?: string;
  altTextTranslations?: Record<string, string>;

  // Styling (for buttons)
  style?: PromoWidgetButtonStyle;

  // HTML template (with placeholders: {{affiliateUrl}}, {{affiliateCode}}, {{trackingParams}})
  htmlTemplate: string;

  // Tracking
  trackingId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;

  // Status
  isActive: boolean;
  order: number;

  // Stats
  views: number;
  clicks: number;
  conversions: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Widget usage tracking for analytics
 */
export interface PromoWidgetUsage {
  id: string;
  widgetId: string;
  bloggerId: string;
  bloggerCode: string;
  action: 'view' | 'copy' | 'click' | 'conversion';
  metadata?: {
    referrer?: string;
    userAgent?: string;
    clientId?: string;
    callSessionId?: string;
    conversionValue?: number;
  };
  createdAt: string;
}

/**
 * Blogger-specific widget stats
 * Stored in subcollection: bloggers/{bloggerId}/widget_stats/{widgetId}
 */
export interface BloggerWidgetStats {
  widgetId: string;
  widgetName: string;
  widgetType: PromoWidgetType;
  copies: number;
  lastCopiedAt: string | null;
  // These are tracked via UTM parameters when conversions happen
  clicks: number;
  conversions: number;
  earnings: number;
  updatedAt: string;
}

/**
 * Standard widget dimensions with labels
 */
export const PROMO_WIDGET_DIMENSIONS: {
  value: PromoWidgetDimension;
  width: number;
  height: number;
  labelFr: string;
  labelEn: string;
  category: 'standard' | 'mobile' | 'large';
}[] = [
  { value: '728x90', width: 728, height: 90, labelFr: 'Leaderboard (728x90)', labelEn: 'Leaderboard (728x90)', category: 'standard' },
  { value: '300x250', width: 300, height: 250, labelFr: 'Rectangle moyen (300x250)', labelEn: 'Medium Rectangle (300x250)', category: 'standard' },
  { value: '160x600', width: 160, height: 600, labelFr: 'Skyscraper large (160x600)', labelEn: 'Wide Skyscraper (160x600)', category: 'standard' },
  { value: '468x60', width: 468, height: 60, labelFr: 'Bannière complète (468x60)', labelEn: 'Full Banner (468x60)', category: 'standard' },
  { value: '250x250', width: 250, height: 250, labelFr: 'Carré (250x250)', labelEn: 'Square (250x250)', category: 'standard' },
  { value: '120x60', width: 120, height: 60, labelFr: 'Bouton (120x60)', labelEn: 'Button (120x60)', category: 'standard' },
  { value: '320x50', width: 320, height: 50, labelFr: 'Mobile Leaderboard (320x50)', labelEn: 'Mobile Leaderboard (320x50)', category: 'mobile' },
  { value: '300x600', width: 300, height: 600, labelFr: 'Demi-page (300x600)', labelEn: 'Half Page (300x600)', category: 'large' },
  { value: '970x250', width: 970, height: 250, labelFr: 'Billboard (970x250)', labelEn: 'Billboard (970x250)', category: 'large' },
  { value: 'custom', width: 0, height: 0, labelFr: 'Personnalisé', labelEn: 'Custom', category: 'standard' },
];

/**
 * Default button styles for quick creation
 */
export const PROMO_WIDGET_BUTTON_PRESETS: {
  id: string;
  name: string;
  nameTranslations: Record<string, string>;
  style: PromoWidgetButtonStyle;
}[] = [
  {
    id: 'purple-gradient',
    name: 'Purple Gradient',
    nameTranslations: { fr: 'Dégradé violet', en: 'Purple Gradient', es: 'Degradado púrpura' },
    style: {
      backgroundColor: '#8b5cf6',
      backgroundGradient: 'linear-gradient(to right, #8b5cf6, #7c3aed)',
      textColor: '#ffffff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '12px 24px',
      hoverBackgroundGradient: 'linear-gradient(to right, #7c3aed, #6d28d9)',
      shadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
    },
  },
  {
    id: 'red-gradient',
    name: 'Red Gradient (SOS-Expat)',
    nameTranslations: { fr: 'Dégradé rouge (SOS-Expat)', en: 'Red Gradient (SOS-Expat)', es: 'Degradado rojo (SOS-Expat)' },
    style: {
      backgroundColor: '#dc2626',
      backgroundGradient: 'linear-gradient(to right, #dc2626, #b91c1c)',
      textColor: '#ffffff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      padding: '12px 24px',
      hoverBackgroundGradient: 'linear-gradient(to right, #b91c1c, #991b1b)',
      shadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)',
    },
  },
  {
    id: 'green-gradient',
    name: 'Green Gradient',
    nameTranslations: { fr: 'Dégradé vert', en: 'Green Gradient', es: 'Degradado verde' },
    style: {
      backgroundColor: '#16a34a',
      backgroundGradient: 'linear-gradient(to right, #16a34a, #15803d)',
      textColor: '#ffffff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '12px 24px',
      hoverBackgroundGradient: 'linear-gradient(to right, #15803d, #166534)',
      shadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
    },
  },
  {
    id: 'blue-gradient',
    name: 'Blue Gradient',
    nameTranslations: { fr: 'Dégradé bleu', en: 'Blue Gradient', es: 'Degradado azul' },
    style: {
      backgroundColor: '#2563eb',
      backgroundGradient: 'linear-gradient(to right, #2563eb, #1d4ed8)',
      textColor: '#ffffff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '12px 24px',
      hoverBackgroundGradient: 'linear-gradient(to right, #1d4ed8, #1e40af)',
      shadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
    },
  },
  {
    id: 'dark-solid',
    name: 'Dark Solid',
    nameTranslations: { fr: 'Noir solide', en: 'Dark Solid', es: 'Negro sólido' },
    style: {
      backgroundColor: '#1f2937',
      textColor: '#ffffff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '12px 24px',
      hoverBackgroundColor: '#111827',
      shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
    },
  },
  {
    id: 'white-outline',
    name: 'White Outline',
    nameTranslations: { fr: 'Contour blanc', en: 'White Outline', es: 'Contorno blanco' },
    style: {
      backgroundColor: 'transparent',
      textColor: '#8b5cf6',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      padding: '10px 22px',
      shadow: 'inset 0 0 0 2px #8b5cf6',
    },
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get affiliate link for client referrals (blogger referring clients)
 */
export function getBloggerAffiliateLink(affiliateCode: string): string {
  return `https://sos-expat.com?ref=${affiliateCode}`;
}

/**
 * Get recruitment link for blogger-to-blogger referrals
 */
export function getBloggerRecruitmentLink(affiliateCode: string): string {
  return `https://sos-expat.com/blogger/inscription?ref=${affiliateCode}`;
}

/**
 * Format amount in cents to display currency
 */
export function formatBloggerAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
