/**
 * Blogger System Types
 *
 * Complete type definitions for the SOS-Expat Blogger program.
 * Supports:
 * - Client referral commissions (FIXED $10 - no bonuses)
 * - Provider recruitment commissions (FIXED $5 - no bonuses)
 * - Top 10 monthly leaderboard (informational only, no rewards)
 * - 12 simplified badges
 * - Exclusive Resources (SOS-Expat, Ulixai, Founder)
 * - Integration Guide (templates, copy texts, best practices)
 *
 * KEY DIFFERENCES FROM CHATTER/INFLUENCER:
 * - FIXED commissions only (no levels, no multipliers, no bonuses)
 * - NO quiz requirement (direct activation)
 * - NO client discount (0% vs 5% for influencers)
 * - DEFINITIVE role (cannot become Chatter/Influencer)
 * - 12 simplified badges (vs ~20 for chatters)
 * - Exclusive Resources section
 * - Exclusive Integration Guide section
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Blogger account status
 * NOTE: No "pending_quiz" status since bloggers don't need to pass a quiz
 */
export type BloggerStatus =
  | "active"      // Active, can earn commissions (immediate after registration)
  | "suspended"   // Temporarily suspended by admin
  | "blocked";    // Permanently blocked

/**
 * Supported languages for bloggers
 */
export type SupportedBloggerLanguage =
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
 * Commission type for bloggers
 * NOTE: Simplified - only client referral, recruitment, and manual adjustment
 */
export type BloggerCommissionType =
  | "client_referral"       // Client completed a paid call ($10 FIXED)
  | "recruitment"           // Recruited provider received a call ($5 FIXED)
  | "manual_adjustment";    // Admin manual adjustment

/**
 * Commission status lifecycle
 */
export type BloggerCommissionStatus =
  | "pending"       // In validation period
  | "validated"     // Validated, waiting to be released
  | "available"     // Available for withdrawal
  | "paid"          // Included in a withdrawal
  | "cancelled";    // Cancelled by admin or system

/**
 * Withdrawal status lifecycle
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export type BloggerWithdrawalStatus =
  | "pending"       // Requested, waiting for admin
  | "approved"      // Admin approved, processing
  | "processing"    // Payment in progress
  | "completed"     // Payment successful
  | "failed"        // Payment failed
  | "rejected";     // Admin rejected

/**
 * Payment method for withdrawals
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export type BloggerPaymentMethod =
  | "paypal"        // PayPal
  | "wise"          // Wise (TransferWise)
  | "mobile_money"; // Mobile Money (Flutterwave)

/**
 * Blog traffic tier estimate
 */
export type BlogTrafficTier =
  | "lt1k"       // Less than 1,000 monthly visitors
  | "1k-5k"      // 1,000 - 5,000 monthly visitors
  | "5k-10k"     // 5,000 - 10,000 monthly visitors
  | "10k-50k"    // 10,000 - 50,000 monthly visitors
  | "50k-100k"   // 50,000 - 100,000 monthly visitors
  | "gt100k";    // More than 100,000 monthly visitors

/**
 * Blog theme/niche categories
 */
export type BlogTheme =
  | "expatriation"   // Expat life, moving abroad
  | "travel"         // Travel, nomad lifestyle
  | "legal"          // Legal advice, immigration
  | "finance"        // Finance, banking abroad
  | "lifestyle"      // General lifestyle
  | "tech"           // Technology, digital nomads
  | "family"         // Family, parenting abroad
  | "career"         // Career, work abroad
  | "education"      // Education, studying abroad
  | "other";         // Other

/**
 * Badge types - 12 simplified badges
 * NOTE: Simplified compared to Chatters (~20 badges)
 */
export type BloggerBadgeType =
  | "first_conversion"    // First client referral
  | "earnings_100"        // Earned $100
  | "earnings_500"        // Earned $500
  | "earnings_1000"       // Earned $1,000
  | "earnings_5000"       // Earned $5,000
  | "recruit_1"           // First provider recruited
  | "recruit_10"          // 10 providers recruited
  | "streak_7"            // 7-day activity streak
  | "streak_30"           // 30-day activity streak
  | "top10"               // Reached Top 10 monthly
  | "top3"                // Reached Top 3 monthly
  | "top1";               // Reached #1 monthly

/**
 * Resource category (EXCLUSIVE to Bloggers)
 */
export type BloggerResourceCategory =
  | "sos_expat"    // SOS-Expat resources
  | "ulixai"       // Ulixai AI resources
  | "founder";     // Founder's resources (photos, bio, quotes)

/**
 * Resource type
 */
export type BloggerResourceType =
  | "logo"         // Logo files
  | "image"        // Images/graphics
  | "text"         // Text content
  | "data"         // Data/statistics
  | "photo"        // Photos (founder)
  | "bio"          // Biography text
  | "quote";       // Quotes

// ============================================================================
// BLOGGER PROFILE
// ============================================================================

/**
 * Blogger profile document
 * Collection: bloggers/{uid}
 */
export interface Blogger {
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
  language: SupportedBloggerLanguage;

  /** Additional languages spoken */
  additionalLanguages?: SupportedBloggerLanguage[];

  /** Bio/description */
  bio?: string;

  // ---- Blog Info (SPECIFIC TO BLOGGERS) ----

  /** Blog URL */
  blogUrl: string;

  /** Blog name */
  blogName: string;

  /** Blog primary language */
  blogLanguage: SupportedBloggerLanguage;

  /** Blog target country (main audience) */
  blogCountry: string;

  /** Blog theme/niche */
  blogTheme: BlogTheme;

  /** Estimated monthly traffic */
  blogTraffic: BlogTrafficTier;

  /** Blog description */
  blogDescription?: string;

  // ---- Status ----

  /** Account status */
  status: BloggerStatus;

  /** Admin notes (internal) */
  adminNotes?: string;

  /** Suspension reason if suspended */
  suspensionReason?: string;

  // ---- Definitive Role Acknowledgment ----

  /** User acknowledged this role is definitive (cannot become Chatter/Influencer) */
  definitiveRoleAcknowledged: boolean;

  /** When they acknowledged */
  definitiveRoleAcknowledgedAt: Timestamp | null;

  // ---- Affiliate Codes ----

  /** Code for client referrals (e.g., "BLOG-JEAN123") */
  affiliateCodeClient: string;

  /** Code for provider recruitment (e.g., "REC-BLOG-JEAN123") */
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

  /** Total amount withdrawn all time */
  totalWithdrawn: number;

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

  // ---- Gamification (Simplified) ----

  /** Current streak (consecutive days with activity) */
  currentStreak: number;

  /** Best streak ever */
  bestStreak: number;

  /** Last activity date (for streak calculation) */
  lastActivityDate: string | null; // YYYY-MM-DD

  /** Earned badges */
  badges: BloggerBadgeType[];

  // ---- Payment Details ----

  /** Preferred payment method */
  preferredPaymentMethod: BloggerPaymentMethod | null;

  /** Payment details (varies by method) */
  paymentDetails: BloggerPaymentDetails | null;

  /** Current pending withdrawal ID */
  pendingWithdrawalId: string | null;

  // ---- Timestamps ----

  /** Registration date */
  createdAt: Timestamp;

  /** Last update */
  updatedAt: Timestamp;

  /** Last login */
  lastLoginAt: Timestamp | null;

  // ---- TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD) ----

  /** Whether terms were accepted */
  termsAccepted?: boolean;

  /** ISO timestamp of terms acceptance */
  termsAcceptedAt?: string;

  /** Version of terms accepted (e.g., "3.0") */
  termsVersion?: string;

  /** Type of terms (e.g., "terms_bloggers") */
  termsType?: string;

  /** Metadata about the acceptance context */
  termsAcceptanceMeta?: {
    userAgent: string;
    language: string;
    timestamp: number;
    acceptanceMethod: string;
    ipAddress?: string;
  };
}

/**
 * Payment details union type
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export type BloggerPaymentDetails =
  | BloggerPayPalDetails
  | BloggerWiseDetails
  | BloggerMobileMoneyDetails;

/**
 * PayPal payment details
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export interface BloggerPayPalDetails {
  type: "paypal";
  email: string;
  currency: string;
  accountHolderName: string;
}

/**
 * Wise payment details
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export interface BloggerWiseDetails {
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
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export interface BloggerMobileMoneyDetails {
  type: "mobile_money";
  provider: "mtn" | "orange" | "moov" | "airtel" | "mpesa" | "wave";
  phoneNumber: string;
  country: string;
  currency: string;
  accountName: string;
}

// ============================================================================
// COMMISSION DOCUMENT
// ============================================================================

/**
 * Individual commission record
 * Collection: blogger_commissions/{commissionId}
 */
export interface BloggerCommission {
  /** Document ID */
  id: string;

  // ---- Blogger ----

  /** Blogger who earns the commission */
  bloggerId: string;
  bloggerEmail: string;
  bloggerCode: string;

  // ---- Commission Type ----

  /** Type of commission */
  type: BloggerCommissionType;

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

    // For recruitment
    providerId?: string;
    providerEmail?: string;
    providerType?: "lawyer" | "expat";
    callId?: string;
    recruitmentDate?: string;
    monthsRemaining?: number;
  };

  // ---- Amount ----

  /** Commission amount (cents) - FIXED, no bonuses */
  amount: number;

  /** Currency (always USD) */
  currency: "USD";

  /** Human-readable description */
  description: string;

  // ---- Status ----

  /** Current status */
  status: BloggerCommissionStatus;

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
 * Collection: blogger_withdrawals/{withdrawalId}
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export interface BloggerWithdrawal {
  /** Document ID */
  id: string;

  /** Blogger who requested */
  bloggerId: string;
  bloggerEmail: string;
  bloggerName: string;

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
  status: BloggerWithdrawalStatus;

  // ---- Payment Method ----

  /** Payment method used */
  paymentMethod: BloggerPaymentMethod;

  /** Payment details snapshot at request time */
  paymentDetailsSnapshot: BloggerPaymentDetails;

  // ---- Commission References ----

  /** Commission IDs included in this withdrawal */
  commissionIds: string[];

  /** Number of commissions */
  commissionCount: number;

  // ---- Processing Details ----

  /** Payment reference/transaction ID */
  paymentReference?: string;

  /** PayPal transaction ID (if using PayPal) */
  paypalTransactionId?: string;

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
// RECRUITED PROVIDERS TRACKING
// ============================================================================

/**
 * Provider referral tracking
 * Collection: blogger_recruited_providers/{referralId}
 *
 * Tracks providers recruited by bloggers for 6-month commission window
 */
export interface BloggerRecruitedProvider {
  /** Document ID */
  id: string;

  /** Blogger who recruited the provider */
  bloggerId: string;
  bloggerCode: string;
  bloggerEmail: string;

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
// BADGES
// ============================================================================

/**
 * Badge definition
 * Collection: blogger_badges/{badgeType}
 */
export interface BloggerBadgeDefinition {
  /** Badge type (document ID) */
  id: BloggerBadgeType;

  /** Display name */
  name: string;
  nameTranslations: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Description */
  description: string;
  descriptionTranslations: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Icon URL or emoji */
  icon: string;

  /** Category */
  category: "milestone" | "earnings" | "recruitment" | "streak" | "competition";

  /** Rarity */
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";

  /** Whether badge is currently active */
  isActive: boolean;

  /** Display order */
  order: number;
}

/**
 * Badge award record
 * Collection: blogger_badge_awards/{awardId}
 */
export interface BloggerBadgeAward {
  /** Document ID */
  id: string;

  /** Blogger who earned the badge */
  bloggerId: string;
  bloggerEmail: string;

  /** Badge type */
  badgeType: BloggerBadgeType;

  /** When earned */
  awardedAt: Timestamp;

  /** Context of award */
  context?: {
    rank?: number;
    month?: string;
    streakDays?: number;
    clientCount?: number;
    recruitCount?: number;
    totalEarned?: number;
  };
}

// ============================================================================
// MONTHLY RANKINGS
// ============================================================================

/**
 * Monthly ranking record
 * Collection: blogger_monthly_rankings/{year-month}
 *
 * NOTE: Top 10 is INFORMATIONAL ONLY - no bonus payouts (unlike Chatters)
 */
export interface BloggerMonthlyRanking {
  /** Document ID (YYYY-MM format) */
  id: string;

  /** Year-month string */
  month: string;

  /** Top performers (ordered by earnings this month, max 10) */
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
 * Collection: blogger_clicks/{clickId}
 */
export interface BloggerAffiliateClick {
  /** Document ID */
  id: string;

  /** Blogger code used */
  bloggerCode: string;

  /** Blogger ID */
  bloggerId: string;

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
 * Blogger notification
 * Collection: blogger_notifications/{notificationId}
 */
export interface BloggerNotification {
  /** Document ID */
  id: string;

  /** Blogger recipient */
  bloggerId: string;

  /** Notification type */
  type:
    | "commission_earned"
    | "commission_validated"
    | "commission_available"
    | "withdrawal_approved"
    | "withdrawal_completed"
    | "withdrawal_rejected"
    | "badge_earned"
    | "rank_achieved"
    | "new_referral"
    | "new_resource"      // New resource available
    | "guide_update"      // Guide content updated
    | "system";

  /** Title */
  title: string;
  titleTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Message body */
  message: string;
  messageTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
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
    badgeType?: BloggerBadgeType;
    referralId?: string;
    resourceId?: string;
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
// RESOURCES (EXCLUSIVE TO BLOGGERS)
// ============================================================================

/**
 * Resource file (downloadable)
 * Collection: blogger_resources/{resourceId}
 */
export interface BloggerResource {
  /** Document ID */
  id: string;

  /** Resource category */
  category: BloggerResourceCategory;

  /** Resource type */
  type: BloggerResourceType;

  /** Resource name */
  name: string;
  nameTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Description */
  description?: string;
  descriptionTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** File URL (for downloadable resources) */
  fileUrl?: string;

  /** Thumbnail/preview URL */
  thumbnailUrl?: string;

  /** File size in bytes */
  fileSize?: number;

  /** File format (e.g., "PNG", "SVG", "PDF") */
  fileFormat?: string;

  /** Dimensions (for images) */
  dimensions?: {
    width: number;
    height: number;
  };

  /** Whether resource is active */
  isActive: boolean;

  /** Display order within category */
  order: number;

  /** Download count */
  downloadCount: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin ID) */
  createdBy: string;
}

/**
 * Resource text content (copyable)
 * Collection: blogger_resource_texts/{textId}
 */
export interface BloggerResourceText {
  /** Document ID */
  id: string;

  /** Resource category */
  category: BloggerResourceCategory;

  /** Resource type */
  type: BloggerResourceType;

  /** Text title */
  title: string;
  titleTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Text content */
  content: string;
  contentTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Whether text is active */
  isActive: boolean;

  /** Display order within category */
  order: number;

  /** Copy count */
  copyCount: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin ID) */
  createdBy: string;
}

// ============================================================================
// INTEGRATION GUIDE (EXCLUSIVE TO BLOGGERS)
// ============================================================================

/**
 * Guide template (article structures)
 * Collection: blogger_guide_templates/{templateId}
 */
export interface BloggerGuideTemplate {
  /** Document ID */
  id: string;

  /** Template name */
  name: string;
  nameTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Description */
  description?: string;
  descriptionTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Template content (markdown with [LIEN] placeholder) */
  content: string;
  contentTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Target audience */
  targetAudience?: string;

  /** Recommended word count */
  recommendedWordCount?: number;

  /** SEO keywords */
  seoKeywords?: string[];

  /** Whether template is active */
  isActive: boolean;

  /** Display order */
  order: number;

  /** Usage count */
  usageCount: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin ID) */
  createdBy: string;
}

/**
 * Guide copy text (ready-to-use texts)
 * Collection: blogger_guide_copy_texts/{textId}
 */
export interface BloggerGuideCopyText {
  /** Document ID */
  id: string;

  /** Text name */
  name: string;
  nameTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Category */
  category: "intro" | "cta" | "testimonial" | "feature" | "benefit" | "conclusion";

  /** Text content (with [LIEN] placeholder for affiliate link) */
  content: string;
  contentTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Character count */
  characterCount: number;

  /** Whether text is active */
  isActive: boolean;

  /** Display order */
  order: number;

  /** Copy count */
  copyCount: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin ID) */
  createdBy: string;
}

/**
 * Guide best practice
 * Collection: blogger_guide_best_practices/{practiceId}
 */
export interface BloggerGuideBestPractice {
  /** Document ID */
  id: string;

  /** Practice title */
  title: string;
  titleTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Practice content */
  content: string;
  contentTranslations?: {
    [key in SupportedBloggerLanguage]?: string;
  };

  /** Category */
  category: "seo" | "writing" | "promotion" | "conversion" | "monetization";

  /** Icon URL or emoji */
  icon?: string;

  /** Whether practice is active */
  isActive: boolean;

  /** Display order */
  order: number;

  /** Created timestamp */
  createdAt: Timestamp;

  /** Updated timestamp */
  updatedAt: Timestamp;

  /** Created by (admin ID) */
  createdBy: string;
}

// ============================================================================
// USAGE LOG
// ============================================================================

/**
 * Usage log for resources and guide content
 * Collection: blogger_usage_log/{logId}
 */
export interface BloggerUsageLog {
  /** Document ID */
  id: string;

  /** Blogger ID */
  bloggerId: string;

  /** Action type */
  action: "download" | "copy" | "view";

  /** Resource type */
  resourceType: "resource" | "resource_text" | "template" | "copy_text" | "best_practice";

  /** Resource ID */
  resourceId: string;

  /** Resource name (denormalized) */
  resourceName: string;

  /** Timestamp */
  timestamp: Timestamp;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * System configuration for blogger module
 * Collection: blogger_config/current
 */
export interface BloggerConfig {
  /** Document ID (always "current") */
  id: "current";

  // ---- System Status ----

  /** Is the blogger system active */
  isSystemActive: boolean;

  /** Are new registrations accepted */
  newRegistrationsEnabled: boolean;

  /** Are withdrawals enabled */
  withdrawalsEnabled: boolean;

  // ---- Commission Amounts (cents) - FIXED ----

  /** Fixed commission per client referral ($10 = 1000 cents) */
  commissionClientAmount: number;

  /** Fixed commission per provider recruitment call ($5 = 500 cents) */
  commissionRecruitmentAmount: number;

  /** Client discount percentage (0% for bloggers) */
  clientDiscountPercent: number;

  // ---- Recruitment Window ----

  /** Months during which recruitment commissions are earned */
  recruitmentWindowMonths: number;

  // ---- Withdrawal Settings ----

  /** Minimum withdrawal amount (cents) */
  minimumWithdrawalAmount: number;

  /** Hold period before commission is validated (days) */
  validationHoldPeriodDays: number;

  /** Time before validated becomes available (hours) */
  releaseDelayHours: number;

  // ---- Attribution ----

  /** Cookie duration in days */
  attributionWindowDays: number;

  // ---- Leaderboard ----

  /** Number of bloggers shown in leaderboard */
  leaderboardSize: number;

  // ---- Version & History ----

  /** Config version */
  version: number;

  /** Last update */
  updatedAt: Timestamp;

  /** Who updated */
  updatedBy: string;
}

/**
 * Default blogger configuration
 * NOTE: FIXED amounts, NO bonuses, 0% client discount
 */
export const DEFAULT_BLOGGER_CONFIG: Omit<
  BloggerConfig,
  "updatedAt" | "updatedBy"
> = {
  id: "current",
  isSystemActive: true,
  newRegistrationsEnabled: true,
  withdrawalsEnabled: true,

  commissionClientAmount: 1000,      // $10 FIXED
  commissionRecruitmentAmount: 500,  // $5 FIXED
  clientDiscountPercent: 0,          // 0% discount (vs 5% for influencers)

  recruitmentWindowMonths: 6,

  minimumWithdrawalAmount: 2500,     // $25
  validationHoldPeriodDays: 7,       // 7 days
  releaseDelayHours: 24,             // 1 day after validation

  attributionWindowDays: 30,

  leaderboardSize: 10,               // Top 10 only (informational)

  version: 1,
};

// ============================================================================
// INPUT/OUTPUT TYPES FOR CALLABLES
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

  // Blog-specific fields (REQUIRED)
  blogUrl: string;
  blogName: string;
  blogLanguage: SupportedBloggerLanguage;
  blogCountry: string;
  blogTheme: BlogTheme;
  blogTraffic: BlogTrafficTier;
  blogDescription?: string;

  // Definitive role acknowledgment (REQUIRED)
  definitiveRoleAcknowledged: boolean;

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

export interface RegisterBloggerResponse {
  success: boolean;
  bloggerId: string;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  message: string;
}

export interface GetBloggerDashboardResponse {
  blogger: Omit<Blogger, "paymentDetails" | "adminNotes">;
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
  config: Pick<BloggerConfig,
    | "commissionClientAmount"
    | "commissionRecruitmentAmount"
    | "minimumWithdrawalAmount"
  >;
}

/**
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export interface RequestBloggerWithdrawalInput {
  amount?: number; // If not provided, withdraw all available
  paymentMethod: BloggerPaymentMethod;
  paymentDetails: BloggerPaymentDetails;
}

/**
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
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

export interface GetBloggerLeaderboardResponse {
  rankings: Array<{
    rank: number;
    bloggerId: string;
    bloggerName: string;
    photoUrl?: string;
    country: string;
    blogUrl: string;
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
// RESOURCES INPUT/OUTPUT TYPES
// ============================================================================

export interface GetBloggerResourcesInput {
  category?: BloggerResourceCategory;
}

export interface GetBloggerResourcesResponse {
  resources: Array<{
    id: string;
    category: BloggerResourceCategory;
    type: BloggerResourceType;
    name: string;
    description?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    fileSize?: number;
    fileFormat?: string;
    dimensions?: {
      width: number;
      height: number;
    };
  }>;
  texts: Array<{
    id: string;
    category: BloggerResourceCategory;
    type: BloggerResourceType;
    title: string;
    content: string;
  }>;
}

export interface DownloadBloggerResourceInput {
  resourceId: string;
}

export interface DownloadBloggerResourceResponse {
  success: boolean;
  downloadUrl: string;
}

export interface CopyBloggerResourceTextInput {
  textId: string;
}

export interface CopyBloggerResourceTextResponse {
  success: boolean;
  content: string;
}

// ============================================================================
// GUIDE INPUT/OUTPUT TYPES
// ============================================================================

export interface GetBloggerGuideResponse {
  templates: Array<{
    id: string;
    name: string;
    description?: string;
    content: string;
    targetAudience?: string;
    recommendedWordCount?: number;
    seoKeywords?: string[];
  }>;
  copyTexts: Array<{
    id: string;
    name: string;
    category: string;
    content: string;
    characterCount: number;
  }>;
  bestPractices: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    icon?: string;
  }>;
}

export interface CopyBloggerGuideTextInput {
  textId: string;
  textType: "template" | "copy_text";
  affiliateLink: string; // To replace [LIEN] placeholder
}

export interface CopyBloggerGuideTextResponse {
  success: boolean;
  content: string; // With [LIEN] replaced by actual affiliate link
}

export interface TrackBloggerGuideUsageInput {
  resourceType: "template" | "copy_text" | "best_practice";
  resourceId: string;
  action: "view" | "copy";
}

// ============================================================================
// ADMIN INPUT/OUTPUT TYPES
// ============================================================================

export interface AdminGetBloggersListInput {
  status?: BloggerStatus;
  country?: string;
  blogTheme?: BlogTheme;
  blogTraffic?: BlogTrafficTier;
  search?: string;
  sortBy?: "createdAt" | "totalEarned" | "totalClients" | "currentMonthRank";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface AdminGetBloggersListResponse {
  bloggers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    country: string;
    status: BloggerStatus;
    blogUrl: string;
    blogName: string;
    blogTheme: BlogTheme;
    blogTraffic: BlogTrafficTier;
    totalEarned: number;
    totalClients: number;
    totalRecruits: number;
    currentMonthRank: number | null;
    createdAt: string;
  }>;
  total: number;
  hasMore: boolean;
}

export interface AdminGetBloggerDetailResponse {
  blogger: Blogger;
  commissions: Array<Omit<BloggerCommission, "createdAt"> & { createdAt: string }>;
  withdrawals: Array<Omit<BloggerWithdrawal, "requestedAt"> & { requestedAt: string }>;
  recruitedProviders: Array<Omit<BloggerRecruitedProvider, "recruitedAt"> & { recruitedAt: string }>;
  badges: Array<Omit<BloggerBadgeAward, "awardedAt"> & { awardedAt: string }>;
}

/**
 * @deprecated Use centralized payment types instead. This type will be removed in a future version.
 */
export interface AdminProcessBloggerWithdrawalInput {
  withdrawalId: string;
  action: "approve" | "reject" | "complete" | "fail";
  reason?: string;
  paymentReference?: string;
  notes?: string;
}

export interface AdminUpdateBloggerStatusInput {
  bloggerId: string;
  status: BloggerStatus;
  reason: string;
}

export interface AdminGetBloggerConfigResponse {
  config: BloggerConfig;
}

export interface AdminUpdateBloggerConfigInput {
  commissionClientAmount?: number;
  commissionRecruitmentAmount?: number;
  minimumWithdrawalAmount?: number;
  validationHoldPeriodDays?: number;
  releaseDelayHours?: number;
  isSystemActive?: boolean;
  newRegistrationsEnabled?: boolean;
  withdrawalsEnabled?: boolean;
}

// ============================================================================
// ADMIN RESOURCE CRUD TYPES
// ============================================================================

export interface AdminCreateBloggerResourceInput {
  category: BloggerResourceCategory;
  type: BloggerResourceType;
  name: string;
  nameTranslations?: { [key: string]: string };
  description?: string;
  descriptionTranslations?: { [key: string]: string };
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  fileFormat?: string;
  dimensions?: { width: number; height: number };
  order?: number;
}

export interface AdminUpdateBloggerResourceInput {
  resourceId: string;
  name?: string;
  nameTranslations?: { [key: string]: string };
  description?: string;
  descriptionTranslations?: { [key: string]: string };
  fileUrl?: string;
  thumbnailUrl?: string;
  isActive?: boolean;
  order?: number;
}

export interface AdminDeleteBloggerResourceInput {
  resourceId: string;
}

export interface AdminCreateBloggerResourceTextInput {
  category: BloggerResourceCategory;
  type: BloggerResourceType;
  title: string;
  titleTranslations?: { [key: string]: string };
  content: string;
  contentTranslations?: { [key: string]: string };
  order?: number;
}

export interface AdminUpdateBloggerResourceTextInput {
  textId: string;
  title?: string;
  titleTranslations?: { [key: string]: string };
  content?: string;
  contentTranslations?: { [key: string]: string };
  isActive?: boolean;
  order?: number;
}

// ============================================================================
// ADMIN GUIDE CRUD TYPES
// ============================================================================

export interface AdminCreateBloggerGuideTemplateInput {
  name: string;
  nameTranslations?: { [key: string]: string };
  description?: string;
  descriptionTranslations?: { [key: string]: string };
  content: string;
  contentTranslations?: { [key: string]: string };
  targetAudience?: string;
  recommendedWordCount?: number;
  seoKeywords?: string[];
  order?: number;
}

export interface AdminUpdateBloggerGuideTemplateInput {
  templateId: string;
  name?: string;
  nameTranslations?: { [key: string]: string };
  description?: string;
  descriptionTranslations?: { [key: string]: string };
  content?: string;
  contentTranslations?: { [key: string]: string };
  targetAudience?: string;
  recommendedWordCount?: number;
  seoKeywords?: string[];
  isActive?: boolean;
  order?: number;
}

export interface AdminCreateBloggerGuideCopyTextInput {
  name: string;
  nameTranslations?: { [key: string]: string };
  category: "intro" | "cta" | "testimonial" | "feature" | "benefit" | "conclusion";
  content: string;
  contentTranslations?: { [key: string]: string };
  order?: number;
}

export interface AdminUpdateBloggerGuideCopyTextInput {
  textId: string;
  name?: string;
  nameTranslations?: { [key: string]: string };
  category?: "intro" | "cta" | "testimonial" | "feature" | "benefit" | "conclusion";
  content?: string;
  contentTranslations?: { [key: string]: string };
  isActive?: boolean;
  order?: number;
}

export interface AdminCreateBloggerGuideBestPracticeInput {
  title: string;
  titleTranslations?: { [key: string]: string };
  content: string;
  contentTranslations?: { [key: string]: string };
  category: "seo" | "writing" | "promotion" | "conversion" | "monetization";
  icon?: string;
  order?: number;
}

export interface AdminUpdateBloggerGuideBestPracticeInput {
  practiceId: string;
  title?: string;
  titleTranslations?: { [key: string]: string };
  content?: string;
  contentTranslations?: { [key: string]: string };
  category?: "seo" | "writing" | "promotion" | "conversion" | "monetization";
  icon?: string;
  isActive?: boolean;
  order?: number;
}

export interface AdminExportBloggersInput {
  status?: BloggerStatus;
  format: "csv" | "json";
}

export interface AdminExportBloggersResponse {
  success: boolean;
  downloadUrl: string;
  count: number;
}
