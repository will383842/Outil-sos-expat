/**
 * GroupAdmin System Types
 *
 * Complete type definitions for the SOS-Expat GroupAdmin (Group/Community Administrators) program.
 * Supports:
 * - Client referral commissions ($10 per client)
 * - Admin recruitment commissions ($5 per recruited admin, paid when recruit reaches $50)
 * - Resources & ready-to-use posts
 * - Gamification (badges, leaderboard)
 * - 9 languages: fr, en, es, pt, ar, de, it, nl, zh
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * GroupAdmin account status
 */
export type GroupAdminStatus =
  | "active"      // Active, can earn commissions
  | "suspended"   // Temporarily suspended by admin
  | "blocked";    // Permanently blocked

/**
 * Supported languages for GroupAdmins
 */
export type SupportedGroupAdminLanguage =
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
 * Type of Facebook group managed
 */
export type GroupType =
  | "travel"           // Travel groups
  | "expat"            // Expatriate communities
  | "digital_nomad"    // Digital nomads
  | "immigration"      // Immigration assistance
  | "relocation"       // International relocation
  | "language"         // Language exchange
  | "country_specific" // Country-specific (e.g., French in Canada)
  | "profession"       // Profession abroad
  | "family"           // Expatriate families
  | "student"          // Students abroad
  | "retirement"       // Retirement abroad
  | "other";

/**
 * Facebook group size tier
 */
export type GroupSizeTier =
  | "lt1k"        // < 1,000 members
  | "1k-5k"       // 1,000 - 5,000
  | "5k-10k"      // 5,000 - 10,000
  | "10k-25k"     // 10,000 - 25,000
  | "25k-50k"     // 25,000 - 50,000
  | "50k-100k"    // 50,000 - 100,000
  | "gt100k";     // > 100,000 members

/**
 * Commission type for GroupAdmins
 */
export type GroupAdminCommissionType =
  | "client_referral"    // $10 per client booking
  | "recruitment"        // $50 per recruited admin
  | "manual_adjustment"; // Admin manual adjustment

/**
 * Commission status lifecycle
 */
export type GroupAdminCommissionStatus =
  | "pending"       // In validation period
  | "validated"     // Validated, waiting to be released
  | "available"     // Available for withdrawal
  | "paid"          // Included in a withdrawal
  | "cancelled";    // Cancelled by admin or system

/**
 * Withdrawal status lifecycle
 */
export type GroupAdminWithdrawalStatus =
  | "pending"       // Requested, waiting for admin
  | "approved"      // Admin approved, processing
  | "processing"    // Payment in progress
  | "completed"     // Payment successful
  | "failed"        // Payment failed
  | "rejected";     // Admin rejected

/**
 * Payment method for withdrawals
 */
export type GroupAdminPaymentMethod =
  | "wise"          // Wise (TransferWise)
  | "mobile_money"  // Mobile Money (Flutterwave)
  | "bank_transfer"; // Bank transfer

/**
 * Badge types for GroupAdmins
 */
export type GroupAdminBadgeType =
  // Onboarding badges
  | "first_conversion"   // First client conversion
  | "group_verified"     // Group verified by admin
  // Earnings badges
  | "earnings_100"       // Earned $100
  | "earnings_500"       // Earned $500
  | "earnings_1000"      // Earned $1,000
  | "earnings_5000"      // Earned $5,000
  // Recruitment badges
  | "recruit_1"          // First admin recruited
  | "recruit_10"         // 10 admins recruited
  | "recruit_25"         // 25 admins recruited
  // Monthly ranking badges
  | "top10"              // Top 10 monthly
  | "top3"               // Top 3 monthly
  | "top1";              // #1 monthly

/**
 * Resource category
 */
export type GroupAdminResourceCategory =
  | "pinned_posts"      // Posts to pin in group
  | "cover_banners"     // Group cover banners
  | "post_images"       // Images for posts
  | "story_images"      // Story/Reel format images
  | "badges"            // Official partner badges
  | "welcome_messages"; // Welcome messages for new members

/**
 * Resource type
 */
export type GroupAdminResourceType =
  | "image"    // JPEG/PNG
  | "text"     // Copyable text
  | "template" // Template with placeholders
  | "video";   // Short video

/**
 * Post category
 */
export type GroupAdminPostCategory =
  | "announcement"  // Announcements
  | "reminder"      // Reminders
  | "testimonial"   // Testimonials/Success stories
  | "qa"            // Q&A posts
  | "emergency"     // Emergency help posts
  | "seasonal";     // Seasonal/Holiday posts

// ============================================================================
// GROUPADMIN PROFILE
// ============================================================================

/**
 * GroupAdmin profile document
 * Collection: group_admins/{uid}
 */
export interface GroupAdmin {
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
  language: SupportedGroupAdminLanguage;

  /** Additional languages spoken */
  additionalLanguages?: SupportedGroupAdminLanguage[];

  // ---- Facebook Group Info ----

  /** Facebook group URL */
  groupUrl: string;

  /** Group name */
  groupName: string;

  /** Type of group */
  groupType: GroupType;

  /** Estimated group size */
  groupSize: GroupSizeTier;

  /** Primary country targeted by the group */
  groupCountry: string;

  /** Primary language of the group */
  groupLanguage: SupportedGroupAdminLanguage;

  /** Group description */
  groupDescription?: string;

  /** Whether group is verified by SOS admin */
  isGroupVerified: boolean;

  /** When group was verified */
  groupVerifiedAt?: Timestamp;

  // ---- Status ----

  /** Account status */
  status: GroupAdminStatus;

  /** Admin notes (internal) */
  adminNotes?: string;

  /** Reason for suspension if suspended */
  suspensionReason?: string;

  // ---- Affiliate Codes ----

  /** Code for client referrals (e.g., "GROUP-JEAN123") */
  affiliateCodeClient: string;

  /** Code for admin recruitment (e.g., "REC-GROUP-JEAN123") */
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

  /** Total withdrawn all time */
  totalWithdrawn: number;

  // ---- Statistics ----

  /** Total clients referred */
  totalClients: number;

  /** Total admins recruited */
  totalRecruits: number;

  /** Total commissions count */
  totalCommissions: number;

  /** Current month statistics */
  currentMonthStats: {
    clients: number;
    recruits: number;
    earnings: number;
    month: string; // YYYY-MM
  };

  /** Current month rank (1-indexed, null if not ranked) */
  currentMonthRank: number | null;

  /** Best ever rank */
  bestRank: number | null;

  // ---- Gamification ----

  /** Current streak (consecutive days with activity) */
  currentStreak: number;

  /** Best streak ever */
  bestStreak: number;

  /** Last activity date (for streak calculation) */
  lastActivityDate: string | null; // YYYY-MM-DD

  /** Earned badges */
  badges: GroupAdminBadgeType[];

  // ---- Recruitment (who recruited this GroupAdmin) ----

  /** GroupAdmin who recruited this one */
  recruitedBy: string | null;

  /** Recruitment code used */
  recruitedByCode: string | null;

  /** When recruited */
  recruitedAt: Timestamp | null;

  // ---- Payment Details ----

  /** Preferred payment method */
  preferredPaymentMethod: GroupAdminPaymentMethod | null;

  /** Payment details (varies by method) */
  paymentDetails: GroupAdminPaymentDetails | null;

  /** Current pending withdrawal ID */
  pendingWithdrawalId: string | null;

  // ---- Timestamps ----

  /** Account creation date */
  createdAt: Timestamp;

  /** Last update date */
  updatedAt: Timestamp;

  /** Last login date */
  lastLoginAt: Timestamp | null;

  // ---- TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD) ----

  /** Whether terms were accepted */
  termsAccepted?: boolean;

  /** ISO timestamp of terms acceptance */
  termsAcceptedAt?: string;

  /** Version of terms accepted (e.g., "3.0") */
  termsVersion?: string;

  /** Type of terms (e.g., "terms_group_admins") */
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

// ============================================================================
// PAYMENT DETAILS
// ============================================================================

/**
 * Payment details - varies by method
 */
export type GroupAdminPaymentDetails =
  | GroupAdminWiseDetails
  | GroupAdminMobileMoneyDetails
  | GroupAdminBankTransferDetails;

export interface GroupAdminWiseDetails {
  type: "wise";
  email: string;
  accountHolderName: string;
  currency: string;
}

export interface GroupAdminMobileMoneyDetails {
  type: "mobile_money";
  provider: string;
  phoneNumber: string;
  country: string;
}

export interface GroupAdminBankTransferDetails {
  type: "bank_transfer";
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  country: string;
}

// ============================================================================
// COMMISSIONS
// ============================================================================

/**
 * Commission document
 * Collection: group_admin_commissions/{id}
 */
export interface GroupAdminCommission {
  id: string;

  /** GroupAdmin who earned this commission */
  groupAdminId: string;

  /** Type of commission */
  type: GroupAdminCommissionType;

  /** Current status */
  status: GroupAdminCommissionStatus;

  /** Amount in cents */
  amount: number;

  /** Original amount before any adjustments */
  originalAmount: number;

  /**
   * Currency — always USD.
   * Commission amounts are fixed dollar values ($10 client, $5 recruitment),
   * NOT a percentage of the call price. The call itself may be billed in EUR
   * or another currency, but commissions are always computed and stored in
   * USD cents, making the sum currency-safe.
   */
  currency: "USD";

  /** Description */
  description: string;

  // ---- Source Info ----

  /** For client_referral: client user ID */
  sourceClientId?: string;

  /** For client_referral: call/booking ID */
  sourceCallId?: string;

  /** For recruitment: recruited admin ID */
  sourceRecruitId?: string;

  // ---- Status Tracking ----

  /** When commission was created */
  createdAt: Timestamp;

  /** When status changed to validated */
  validatedAt?: Timestamp;

  /** When status changed to available */
  availableAt?: Timestamp;

  /** When included in withdrawal */
  paidAt?: Timestamp;

  /** Withdrawal ID if paid */
  withdrawalId?: string;

  /** When cancelled */
  cancelledAt?: Timestamp;

  /** Reason for cancellation */
  cancellationReason?: string;

  /** Admin who made adjustment if manual */
  adjustedBy?: string;

  /** Notes for adjustment */
  adjustmentNotes?: string;
}

// ============================================================================
// WITHDRAWALS
// ============================================================================

/**
 * Withdrawal request document
 * Collection: group_admin_withdrawals/{id}
 */
export interface GroupAdminWithdrawal {
  id: string;

  /** GroupAdmin requesting withdrawal */
  groupAdminId: string;

  /** Amount requested in cents */
  amount: number;

  /** Currency */
  currency: "USD";

  /** Current status */
  status: GroupAdminWithdrawalStatus;

  /** Payment method */
  paymentMethod: GroupAdminPaymentMethod;

  /** Payment details at time of request */
  paymentDetails: GroupAdminPaymentDetails;

  /** Commission IDs included in this withdrawal */
  commissionIds: string[];

  // ---- Processing Info ----

  /** External payment reference */
  paymentReference?: string;

  /** Payment processor (wise, paypal, etc.) */
  paymentProcessor?: string;

  /** Fee charged by processor */
  processingFee?: number;

  /** Net amount after fees */
  netAmount?: number;

  // ---- Status Tracking ----

  /** When requested */
  createdAt: Timestamp;

  /** When approved by admin */
  approvedAt?: Timestamp;

  /** Admin who approved */
  approvedBy?: string;

  /** When processing started */
  processingStartedAt?: Timestamp;

  /** When completed */
  completedAt?: Timestamp;

  /** When rejected */
  rejectedAt?: Timestamp;

  /** Admin who rejected */
  rejectedBy?: string;

  /** Rejection reason */
  rejectionReason?: string;

  /** When failed */
  failedAt?: Timestamp;

  /** Failure reason */
  failureReason?: string;

  /** Admin notes */
  adminNotes?: string;
}

// ============================================================================
// RECRUITED ADMINS
// ============================================================================

/**
 * Recruited admin tracking document
 * Collection: group_admin_recruited_admins/{id}
 */
export interface GroupAdminRecruit {
  id: string;

  /** Recruiter GroupAdmin ID */
  recruiterId: string;

  /** Recruited GroupAdmin ID */
  recruitedId: string;

  /** Recruited admin's email */
  recruitedEmail: string;

  /** Recruited admin's name */
  recruitedName: string;

  /** Recruited admin's group name */
  recruitedGroupName: string;

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
// CLICKS TRACKING
// ============================================================================

/**
 * Click tracking document
 * Collection: group_admin_clicks/{id}
 */
export interface GroupAdminClick {
  id: string;

  /** GroupAdmin who owns the link */
  groupAdminId: string;

  /** Affiliate code used */
  affiliateCode: string;

  /** Type of click */
  clickType: "client" | "recruitment";

  /** IP address (hashed for privacy) */
  ipHash: string;

  /** User agent */
  userAgent?: string;

  /** Referrer URL */
  referrer?: string;

  /** Country (from IP geolocation) */
  country?: string;

  /** Whether this resulted in a conversion */
  converted: boolean;

  /** Conversion ID if applicable */
  conversionId?: string;

  /** When clicked */
  createdAt: Timestamp;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * GroupAdmin notification types
 */
export type GroupAdminNotificationType =
  | "commission_earned"
  | "commission_available"
  | "withdrawal_approved"
  | "withdrawal_completed"
  | "withdrawal_rejected"
  | "badge_earned"
  | "rank_achieved"
  | "group_verified"
  | "system_announcement";

/**
 * Notification document
 * Collection: group_admin_notifications/{id}
 */
export interface GroupAdminNotification {
  id: string;

  /** GroupAdmin recipient */
  groupAdminId: string;

  /** Notification type */
  type: GroupAdminNotificationType;

  /** Title */
  title: string;

  /** Message body */
  message: string;

  /** Additional data */
  data?: Record<string, unknown>;

  /** Whether read */
  read: boolean;

  /** When created */
  createdAt: Timestamp;

  /** When read */
  readAt?: Timestamp;
}

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * Resource document
 * Collection: group_admin_resources/{id}
 */
export interface GroupAdminResource {
  id: string;

  /** Resource category */
  category: GroupAdminResourceCategory;

  /** Resource type */
  type: GroupAdminResourceType;

  /** Name (default/fallback) */
  name: string;

  /** Name translations */
  nameTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;

  /** Description (default/fallback) */
  description?: string;

  /** Description translations */
  descriptionTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;

  // ---- For images/videos ----

  /** File URL in Storage */
  fileUrl?: string;

  /** Thumbnail URL */
  thumbnailUrl?: string;

  /** File size in bytes */
  fileSize?: number;

  /** File format */
  fileFormat?: "JPEG" | "PNG" | "GIF" | "MP4";

  /** Dimensions */
  dimensions?: { width: number; height: number };

  // ---- For texts/templates ----

  /** Content (default/fallback) */
  content?: string;

  /** Content translations */
  contentTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;

  /** Placeholders to replace */
  placeholders?: string[]; // ['{{AFFILIATE_LINK}}', '{{GROUP_NAME}}', '{{ADMIN_NAME}}']

  // ---- Metadata ----

  /** Whether active */
  isActive: boolean;

  /** Display order */
  order: number;

  /** Download count */
  downloadCount: number;

  /** Copy count (for texts) */
  copyCount: number;

  /** When created */
  createdAt: Timestamp;

  /** When updated */
  updatedAt: Timestamp;
}

// ============================================================================
// RESOURCE TEXTS
// ============================================================================

/**
 * Resource text document (for longer copyable texts)
 * Collection: group_admin_resource_texts/{id}
 */
export interface GroupAdminResourceText {
  id: string;

  /** Parent resource ID */
  resourceId: string;

  /** Language */
  language: SupportedGroupAdminLanguage;

  /** Full text content */
  content: string;

  /** When created */
  createdAt: Timestamp;

  /** When updated */
  updatedAt: Timestamp;
}

// ============================================================================
// POSTS
// ============================================================================

/**
 * Ready-to-use Facebook post document
 * Collection: group_admin_posts/{id}
 */
export interface GroupAdminPost {
  id: string;

  /** Post name (default/fallback) */
  name: string;

  /** Name translations */
  nameTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;

  /** Post category */
  category: GroupAdminPostCategory;

  /** Content (default/fallback) */
  content: string;

  /** Content translations */
  contentTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;

  /** Associated image resource ID */
  imageResourceId?: string;

  /** Placeholders in the content */
  placeholders: string[]; // ['{{AFFILIATE_LINK}}', '{{DISCOUNT_AMOUNT}}', '{{GROUP_NAME}}']

  /** Recommended pin duration */
  recommendedPinDuration?: "1_week" | "2_weeks" | "1_month" | "permanent";

  /** Best time to post */
  bestTimeToPost?: "monday_morning" | "weekend" | "evening" | "any";

  /** Usage count */
  usageCount: number;

  /** Whether active */
  isActive: boolean;

  /** Display order */
  order: number;

  /** When created */
  createdAt: Timestamp;

  /** When updated */
  updatedAt: Timestamp;
}

// ============================================================================
// BADGES
// ============================================================================

/**
 * Badge definition document
 * Collection: group_admin_badges/{badgeType}
 */
export interface GroupAdminBadgeDefinition {
  /** Badge type (document ID) */
  type: GroupAdminBadgeType;

  /** Name (default/fallback) */
  name: string;

  /** Name translations */
  nameTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;

  /** Description (default/fallback) */
  description: string;

  /** Description translations */
  descriptionTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;

  /** Icon URL or emoji */
  icon: string;

  /** Color (hex) */
  color: string;

  /** Requirement to earn badge */
  requirement: {
    type: "earnings" | "recruits" | "clients" | "rank" | "verification" | "manual";
    threshold?: number;
  };

  /** Whether badge can be earned multiple times */
  repeatable: boolean;

  /** Display order */
  order: number;
}

/**
 * Badge award document
 * Collection: group_admin_badge_awards/{id}
 */
export interface GroupAdminBadgeAward {
  id: string;

  /** GroupAdmin who earned the badge */
  groupAdminId: string;

  /** Badge type */
  badgeType: GroupAdminBadgeType;

  /** When earned */
  earnedAt: Timestamp;

  /** Value at time of earning (for threshold badges) */
  valueAtEarning?: number;
}

// ============================================================================
// MONTHLY RANKINGS
// ============================================================================

/**
 * Monthly ranking document
 * Collection: group_admin_monthly_rankings/{YYYY-MM}
 */
export interface GroupAdminMonthlyRanking {
  /** Month (YYYY-MM format) */
  month: string;

  /** Rankings (sorted by earnings desc) */
  rankings: {
    rank: number;
    groupAdminId: string;
    groupAdminName: string;
    groupName: string;
    earnings: number;
    clients: number;
    recruits: number;
  }[];

  /** Total earnings this month (all admins) */
  totalEarnings: number;

  /** Total clients this month (all admins) */
  totalClients: number;

  /** Total recruits this month (all admins) */
  totalRecruits: number;

  /** When calculated */
  calculatedAt: Timestamp;

  /** Whether finalized (month is over) */
  finalized: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * System configuration document
 * Collection: group_admin_config/current
 */
export interface GroupAdminConfig {
  id: "current";

  /** Whether the system is active */
  isSystemActive: boolean;

  /** Whether new registrations are enabled */
  newRegistrationsEnabled: boolean;

  /** Whether withdrawals are enabled */
  withdrawalsEnabled: boolean;

  // ---- Commission Amounts (in cents) ----

  /** Client referral commission ($10 = 1000) */
  commissionClientAmount: number;

  /** Recruitment commission ($50 = 5000) */
  commissionRecruitmentAmount: number;

  /** Client discount amount in cents ($5 = 500) */
  clientDiscountAmount: number;

  /** Minimum totalEarned (cents) a recruited admin must reach before recruiter gets $50 */
  recruitmentCommissionThreshold: number;

  /** Payment processing mode */
  paymentMode: "manual" | "automatic";

  // ---- Time Windows ----

  /** Recruitment commission window in months (6) */
  recruitmentWindowMonths: number;

  /** Attribution window for client clicks in days (30) */
  attributionWindowDays: number;

  /** Validation hold period in days (7) */
  validationHoldPeriodDays: number;

  /** Release delay after validation in hours (24) */
  releaseDelayHours: number;

  // ---- Withdrawal Settings ----

  /** Minimum withdrawal amount in cents ($25 = 2500) */
  minimumWithdrawalAmount: number;

  // ---- Leaderboard ----

  /** Number of admins to show in leaderboard (10) */
  leaderboardSize: number;

  // ---- Version Control ----

  /** Configuration version */
  version: number;

  /** When updated */
  updatedAt: Timestamp;

  /** Who updated */
  updatedBy: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_GROUP_ADMIN_CONFIG: Omit<GroupAdminConfig, "updatedAt" | "updatedBy"> = {
  id: "current",
  isSystemActive: true,
  newRegistrationsEnabled: true,
  withdrawalsEnabled: true,

  // All amounts in USD cents — fixed values, independent of call currency (EUR/USD/etc.)
  commissionClientAmount: 1000,        // $10 per client referral
  commissionRecruitmentAmount: 5000,    // $50 per recruited admin (paid once threshold met)
  clientDiscountAmount: 500,           // $5 discount for client
  recruitmentCommissionThreshold: 20000, // $200 — recruited admin must earn this in commissions before recruiter gets $50
  paymentMode: "manual",               // manual | automatic

  recruitmentWindowMonths: 6,
  attributionWindowDays: 30,
  validationHoldPeriodDays: 7,
  releaseDelayHours: 24,

  minimumWithdrawalAmount: 2500,       // $25
  leaderboardSize: 10,

  version: 1,
};

// ============================================================================
// USAGE LOG
// ============================================================================

/**
 * Resource usage log document
 * Collection: group_admin_usage_log/{id}
 */
export interface GroupAdminUsageLog {
  id: string;

  /** GroupAdmin who used the resource */
  groupAdminId: string;

  /** Resource type */
  resourceType: "resource" | "post";

  /** Resource/Post ID */
  resourceId: string;

  /** Action taken */
  action: "view" | "download" | "copy";

  /** Language used */
  language: SupportedGroupAdminLanguage;

  /** When used */
  createdAt: Timestamp;
}

// ============================================================================
// API TYPES (Request/Response)
// ============================================================================

/**
 * Registration request
 */
export interface RegisterGroupAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: SupportedGroupAdminLanguage;
  additionalLanguages?: SupportedGroupAdminLanguage[];

  groupUrl: string;
  groupName: string;
  groupType: GroupType;
  groupSize: GroupSizeTier;
  groupCountry: string;
  groupLanguage: SupportedGroupAdminLanguage;
  groupDescription?: string;

  recruitmentCode?: string;
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

/**
 * Registration response
 */
export interface RegisterGroupAdminResponse {
  success: boolean;
  groupAdminId: string;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
}

/**
 * Dashboard response
 */
export interface GroupAdminDashboardResponse {
  profile: GroupAdmin;
  recentCommissions: GroupAdminCommission[];
  recentWithdrawals: GroupAdminWithdrawal[];
  recentRecruits: GroupAdminRecruit[];
  notifications: GroupAdminNotification[];
  leaderboard: {
    rank: number;
    groupAdminId: string;
    groupAdminName: string;
    earnings: number;
  }[];
}

/**
 * Leaderboard entry with badges for API response
 */
export interface GroupAdminLeaderboardEntryWithBadges {
  rank: number;
  groupAdminId: string;
  groupAdminName: string;
  groupName: string;
  earnings: number;
  clients: number;
  recruits: number;
  badges: GroupAdminBadgeType[];
}

/**
 * Leaderboard response
 */
export interface GroupAdminLeaderboardResponse {
  month: string;
  rankings: GroupAdminLeaderboardEntryWithBadges[];
  currentAdminRank: number | null;
  totalParticipants: number;
}

/**
 * Resources response
 */
export interface GroupAdminResourcesResponse {
  resources: GroupAdminResource[];
  categories: {
    category: GroupAdminResourceCategory;
    count: number;
  }[];
}

/**
 * Posts response
 */
export interface GroupAdminPostsResponse {
  posts: GroupAdminPost[];
  categories: {
    category: GroupAdminPostCategory;
    count: number;
  }[];
}

/**
 * Withdrawal request
 */
export interface RequestWithdrawalRequest {
  amount: number;
  paymentMethod: GroupAdminPaymentMethod;
  paymentDetails: GroupAdminPaymentDetails;
}

/**
 * Withdrawal response
 */
export interface RequestWithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  estimatedProcessingTime: string;
  telegramConfirmationRequired?: boolean;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Partial GroupAdmin for updates
 */
export type GroupAdminUpdate = Partial<Omit<GroupAdmin, "id" | "createdAt" | "affiliateCodeClient" | "affiliateCodeRecruitment">>;

/**
 * GroupAdmin creation data (without computed fields)
 */
export type GroupAdminCreateData = Omit<
  GroupAdmin,
  | "id"
  | "totalEarned"
  | "availableBalance"
  | "pendingBalance"
  | "validatedBalance"
  | "totalWithdrawn"
  | "totalClients"
  | "totalRecruits"
  | "totalCommissions"
  | "currentMonthStats"
  | "currentMonthRank"
  | "bestRank"
  | "currentStreak"
  | "bestStreak"
  | "lastActivityDate"
  | "badges"
  | "pendingWithdrawalId"
  | "updatedAt"
  | "lastLoginAt"
>;
