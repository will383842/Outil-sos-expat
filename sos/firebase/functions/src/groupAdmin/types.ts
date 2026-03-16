/**
 * GroupAdmin System Types
 *
 * Complete type definitions for the SOS-Expat GroupAdmin (Group/Community Administrators) program.
 * Supports:
 * - Client referral commissions ($5 lawyer / $3 expat per client call)
 * - N1/N2 network commissions (Chatter-style: $1 N1 per call, $0.50 N2 per call)
 * - Activation bonus ($5 when recruit makes 2 referrals)
 * - Resources & ready-to-use posts
 * - Gamification (badges, leaderboard)
 * - 9 languages: fr, en, es, pt, ar, de, zh, ru, hi (app navigation languages)
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
  | "banned";     // Permanently banned (aligned with Chatter/Influencer terminology)

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
  | "zh"    // Chinese
  | "ru"    // Russian
  | "hi";   // Hindi

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
  | "affiliation"      // Affiliation / association groups
  | "press"            // Press / journalism
  | "media"            // Media / content creators
  | "lawyers"          // Legal professionals abroad
  | "translators"      // Translators / interpreters
  | "movers"           // International movers
  | "real_estate"      // Real estate abroad
  | "insurance"        // Insurance professionals
  | "finance"          // Finance / banking abroad
  | "healthcare"       // Healthcare professionals
  | "education"        // Education / teachers abroad
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
  | "client_referral"    // $5/$3 per direct client call (lawyer/expat)
  | "n1_call"            // $1 per N1 recruit's client call
  | "n2_call"            // $0.50 per N2 recruit's client call
  | "activation_bonus"   // $5 when recruit makes their 2nd referral
  | "n1_recruit_bonus"   // $1 when N1 recruits a N2
  | "provider_call"      // $5/$3 per recruited provider call (6 months)
  | "tier_bonus"         // Recruitment milestone tier bonus
  | "recruitment"        // Legacy: kept for backward compat
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

  /** Whether this GroupAdmin profile is publicly visible in the directory */
  isVisible: boolean;

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

  /** Unified affiliate code (new system: 1 code, 1 link /r/CODE) */
  affiliateCode?: string;
  /** Code for client referrals (e.g., "GROUP-JEAN123") */
  affiliateCodeClient: string;

  /** Code for admin recruitment (e.g., "REC-GROUP-JEAN123") */
  affiliateCodeRecruitment: string;

  /** Code for provider recruitment (e.g., "PROV-GROUP-JEAN123") */
  affiliateCodeProvider: string;

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

  /** Milestone tier bonuses already paid (indices) */
  tierBonusesPaid?: number[];

  /** Whether this GroupAdmin has been activated (met activation criteria) */
  isActivated?: boolean;

  /** Whether the activation bonus has been paid */
  activationBonusPaid?: boolean;

  /** Total client calls referred (for activation tracking) */
  totalClientCalls?: number;

  // ---- Commission Plan (Lifetime Rate Lock) ----

  /** ID of the commission plan active at registration */
  commissionPlanId?: string;
  /** Name of the plan (denormalized for display) */
  commissionPlanName?: string;
  /** ISO date when rates were locked */
  rateLockDate?: string;
  /** Snapshot of commission rates frozen at registration (amounts in cents) */
  lockedRates?: Record<string, number>;
  /** Admin-set individual rate overrides (highest priority, separate from plan snapshot) */
  individualRates?: Record<string, number>;

  // ---- Recruitment (who recruited this GroupAdmin) ----

  /** GroupAdmin who recruited this one (N1 parent) */
  recruitedBy: string | null;

  /** Recruitment code used */
  recruitedByCode: string | null;

  /** When recruited */
  recruitedAt: Timestamp | null;

  /** N2 level: the recruiter of this GA's recruiter (set on creation) */
  parrainNiveau2Id?: string | null;

  // ---- Payment Details ----

  /** Preferred payment method */
  preferredPaymentMethod: GroupAdminPaymentMethod | null;

  /** Payment details (varies by method) */
  paymentDetails: GroupAdminPaymentDetails | null;

  /** Current pending withdrawal ID */
  pendingWithdrawalId: string | null;

  // ---- Telegram Onboarding ----

  /** Whether the Telegram onboarding flow was completed */
  telegramOnboardingCompleted?: boolean;

  /** Whether user skipped Telegram onboarding */
  telegramOnboardingSkipped?: boolean;

  /** Whether user has a linked Telegram account */
  hasTelegram?: boolean;

  /** Telegram user ID */
  telegramId?: number;

  /** Telegram username */
  telegramUsername?: string;

  /** Telegram first name */
  telegramFirstName?: string;

  /** Telegram last name */
  telegramLastName?: string;

  /** When Telegram was linked */
  telegramLinkedAt?: Timestamp;

  /** Telegram bonus credited flag */
  telegramBonusCredited?: boolean;

  /** Telegram bonus amount in cents */
  telegramBonusAmount?: number;

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

  /** Version of affiliate terms accepted (e.g., "1.0") */
  termsAffiliateVersion?: string;

  /** Type of affiliate terms (e.g., "terms_affiliate") */
  termsAffiliateType?: string;

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
   * Commission amounts are fixed dollar values ($5/$3 client, $1 N1, $0.50 N2, $5 activation bonus),
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

  // ---- Promotion ----

  /** Promotion ID if commission was boosted */
  promotionId?: string;

  /** Promotion multiplier applied (1.0 = no promo) */
  promoMultiplier?: number;
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

  /** Fixed SOS withdrawal fee in cents (300 = $3) */
  withdrawalFee?: number;

  /** Total amount debited from balance (amount + withdrawalFee) */
  totalDebited?: number;

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

  /** Number of client_referral commissions the recruit has made (for activation bonus anti-fraud) */
  activationCallCount: number;

  /** Whether the $5 activation bonus was paid to the recruiter */
  activationBonusPaid: boolean;

  /** Activation bonus commission ID if paid */
  activationBonusCommissionId?: string;

  /** When activation bonus was paid */
  activationBonusPaidAt?: Timestamp;

  /** Whether commission was paid (legacy field, kept for backward compat) */
  commissionPaid: boolean;

  /** Commission ID if paid (legacy) */
  commissionId?: string;

  /** When commission was paid (legacy) */
  commissionPaidAt?: Timestamp;
}

/**
 * Recruited provider tracking document
 * Collection: group_admin_recruited_providers/{id}
 *
 * Created when a lawyer/expat registers using a GroupAdmin recruitment link.
 * Commission is awarded per call for the duration of the window.
 */
export interface GroupAdminRecruitedProvider {
  id: string;

  /** GroupAdmin who recruited this provider */
  groupAdminId: string;

  /** Recruitment code used */
  groupAdminCode: string;

  /** GroupAdmin email */
  groupAdminEmail: string;

  /** Recruited provider ID */
  providerId: string;

  /** Provider email */
  providerEmail: string;

  /** Provider type */
  providerType: "lawyer" | "expat";

  /** Provider display name */
  providerName: string;

  /** When recruited */
  recruitedAt: Timestamp;

  /** Commission window end date (recruitmentWindowMonths after recruitment) */
  commissionWindowEndsAt: Timestamp;

  /** Whether this recruitment is still within the commission window */
  isActive: boolean;

  /** Number of calls that generated a commission */
  callsWithCommission: number;

  /** Total commissions earned from this provider */
  totalCommissions: number;

  /** Last commission timestamp */
  lastCommissionAt: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  clickType: "client" | "recruitment" | "provider";

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
  | "new_provider_recruited"
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

  /** Title translations (9 languages) */
  titleTranslations?: Record<string, string>;

  /** Message body */
  message: string;

  /** Message translations (9 languages) */
  messageTranslations?: Record<string, string>;

  /** Additional data */
  data?: Record<string, unknown>;

  /** Whether read */
  isRead: boolean;

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

  /** Whether the public GroupAdmin listing/directory page is visible */
  isGroupAdminListingPageVisible: boolean;

  /** Whether new registrations are enabled */
  newRegistrationsEnabled: boolean;

  /** Whether withdrawals are enabled */
  withdrawalsEnabled: boolean;

  // ---- Commission Amounts (in cents) ----

  /** Commission client referral — lawyer provider (500 cents = $5) */
  commissionClientAmountLawyer?: number;
  /** Commission client referral — expat provider (300 cents = $3) */
  commissionClientAmountExpat?: number;
  /** Fallback client commission when no provider type known (300 cents = $3) */
  commissionClientCallAmount?: number;

  /** N1 call commission: $1 per client call made by a N1 recruit */
  commissionN1CallAmount: number;
  /** N2 call commission: $0.50 per client call made by a N2 recruit */
  commissionN2CallAmount: number;
  /** Activation bonus: $5 when recruit makes their 2nd client referral */
  commissionActivationBonusAmount: number;
  /** N1 recruit bonus: $1 when N1 recruits a N2 */
  commissionN1RecruitBonusAmount: number;
  /** Number of client referrals required from recruit to trigger activation bonus */
  activationCallsRequired: number;

  /** Minimum direct commissions earned (cents) to unlock activation bonus */
  activationMinDirectCommissions: number;

  /** Recruitment milestones: array of { recruits: number, bonus: number (cents) } */
  recruitmentMilestones: Array<{ recruits: number; bonus: number }>;

  /** Client discount type: 'fixed' ($) or 'percent' (%) */
  clientDiscountType: 'percent' | 'fixed';
  /** Client discount amount in cents ($5 = 500) */
  clientDiscountAmount: number;
  /** Client discount percentage (5% = 5) */
  clientDiscountPercent: number;

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

  /** Minimum withdrawal amount in cents ($30 = 3000) */
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

  /** Configuration change history (max 50 entries) */
  configHistory?: GroupAdminConfigHistoryEntry[];
}

/**
 * Configuration history entry for admin config changes
 */
export interface GroupAdminConfigHistoryEntry {
  changedAt: Timestamp;
  changedBy: string;
  previousConfig: Partial<GroupAdminConfig>;
  reason?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_GROUP_ADMIN_CONFIG: Omit<GroupAdminConfig, "updatedAt" | "updatedBy"> = {
  id: "current",
  isSystemActive: true,
  isGroupAdminListingPageVisible: true,
  newRegistrationsEnabled: true,
  withdrawalsEnabled: true,

  // All amounts in USD cents — fixed values, independent of call currency (EUR/USD/etc.)
  commissionClientAmountLawyer: 500,     // $5 per client call (lawyer)
  commissionClientAmountExpat: 300,      // $3 per client call (expat)
  commissionClientCallAmount: 500,       // $5 fallback (when providerType unknown)
  commissionN1CallAmount: 100,           // $1 per N1 recruit's client call
  commissionN2CallAmount: 50,            // $0.50 per N2 recruit's client call
  commissionActivationBonusAmount: 500,  // $5 activation bonus (recruit makes 2 referrals)
  commissionN1RecruitBonusAmount: 100,   // $1 when N1 recruits a N2
  activationCallsRequired: 2,            // 2 referrals needed to trigger activation bonus
  activationMinDirectCommissions: 10000, // $100 minimum direct commissions to unlock activation bonus
  recruitmentMilestones: [
    { recruits: 5, bonus: 1500 },       // $15
    { recruits: 10, bonus: 3500 },      // $35
    { recruits: 20, bonus: 7500 },      // $75
    { recruits: 50, bonus: 25000 },     // $250
    { recruits: 100, bonus: 60000 },    // $600
    { recruits: 500, bonus: 400000 },   // $4,000
  ],
  clientDiscountType: "fixed" as const,  // 'fixed' ($) or 'percent' (%)
  clientDiscountAmount: 500,             // $5 discount for client
  clientDiscountPercent: 0,              // 0% (not used when type=fixed)
  paymentMode: "manual",                 // manual | automatic

  recruitmentWindowMonths: 6,
  attributionWindowDays: 30,
  validationHoldPeriodDays: 7,
  releaseDelayHours: 24,

  minimumWithdrawalAmount: 3000,       // $30
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
  termsAffiliateVersion?: string;
  termsAffiliateType?: string;
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
  affiliateCodeProvider: string;
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
  /** Commission rates (with lockedRates override) */
  config?: {
    commissionClientCallAmount?: number;
    commissionClientAmountLawyer?: number;
    commissionClientAmountExpat?: number;
    commissionN1CallAmount: number;
    commissionN2CallAmount: number;
    commissionActivationBonusAmount: number;
    commissionN1RecruitBonusAmount: number;
    clientDiscountType?: 'percent' | 'fixed';
    clientDiscountAmount?: number;
    clientDiscountPercent?: number;
  };
  /** Commission Plan info (Lifetime Rate Lock) */
  commissionPlan?: {
    id: string;
    name: string;
    rateLockDate?: string;
    isLifetimeLock: boolean;
  } | null;
  isAdminView?: boolean;
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
export type GroupAdminUpdate = Partial<Omit<GroupAdmin, "id" | "createdAt" | "affiliateCodeClient" | "affiliateCodeRecruitment" | "affiliateCodeProvider">>;

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
