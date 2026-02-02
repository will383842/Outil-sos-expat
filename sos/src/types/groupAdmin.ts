/**
 * GroupAdmin Types - Frontend
 *
 * Type definitions for the GroupAdmin (Facebook Group Administrator) feature.
 * These are simplified versions of the backend types for frontend use.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type GroupAdminStatus = "active" | "suspended" | "blocked";

export type SupportedGroupAdminLanguage =
  | "fr" | "en" | "es" | "pt" | "ar" | "de" | "it" | "nl" | "zh";

export type GroupType =
  | "travel"
  | "expat"
  | "digital_nomad"
  | "immigration"
  | "relocation"
  | "language"
  | "country_specific"
  | "profession"
  | "family"
  | "student"
  | "retirement"
  | "other";

export type GroupSizeTier =
  | "lt1k"
  | "1k-5k"
  | "5k-10k"
  | "10k-25k"
  | "25k-50k"
  | "50k-100k"
  | "gt100k";

export type GroupAdminCommissionType =
  | "client_referral"
  | "recruitment"
  | "manual_adjustment";

export type GroupAdminCommissionStatus =
  | "pending"
  | "validated"
  | "available"
  | "paid"
  | "cancelled";

export type GroupAdminWithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "rejected";

export type GroupAdminPaymentMethod =
  | "wise"
  | "paypal"
  | "mobile_money"
  | "bank_transfer";

export type GroupAdminBadgeType =
  | "first_conversion"
  | "group_verified"
  | "earnings_100"
  | "earnings_500"
  | "earnings_1000"
  | "earnings_5000"
  | "recruit_1"
  | "recruit_10"
  | "recruit_25"
  | "top10"
  | "top3"
  | "top1";

export type GroupAdminResourceCategory =
  | "pinned_posts"
  | "cover_banners"
  | "post_images"
  | "story_images"
  | "badges"
  | "welcome_messages";

export type GroupAdminResourceType =
  | "image"
  | "text"
  | "template"
  | "video";

export type GroupAdminPostCategory =
  | "announcement"
  | "reminder"
  | "testimonial"
  | "qa"
  | "emergency"
  | "seasonal";

// ============================================================================
// INTERFACES
// ============================================================================

/** Date type that handles both Date objects and serialized date strings from Firebase */
export type FirebaseDate = Date | string;

export interface GroupAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoUrl?: string;
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
  isGroupVerified: boolean;
  groupVerifiedAt?: FirebaseDate;

  status: GroupAdminStatus;
  adminNotes?: string;
  suspensionReason?: string;

  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;

  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalWithdrawn: number;

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

  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  badges: GroupAdminBadgeType[];

  recruitedBy: string | null;
  recruitedByCode: string | null;
  recruitedAt?: FirebaseDate | null;

  preferredPaymentMethod: GroupAdminPaymentMethod | null;
  paymentDetails: GroupAdminPaymentDetails | null;
  pendingWithdrawalId: string | null;

  createdAt: FirebaseDate;
  updatedAt: FirebaseDate;
  lastLoginAt?: FirebaseDate | null;
}

// ============================================================================
// PAYMENT DETAILS
// ============================================================================

export type GroupAdminPaymentDetails =
  | GroupAdminWiseDetails
  | GroupAdminPayPalDetails
  | GroupAdminMobileMoneyDetails
  | GroupAdminBankTransferDetails;

export interface GroupAdminWiseDetails {
  type: "wise";
  email: string;
  accountHolderName: string;
  currency: string;
}

export interface GroupAdminPayPalDetails {
  type: "paypal";
  email: string;
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

export interface GroupAdminCommission {
  id: string;
  groupAdminId: string;
  type: GroupAdminCommissionType;
  status: GroupAdminCommissionStatus;
  amount: number;
  originalAmount: number;
  currency: "USD";
  description: string;
  sourceClientId?: string;
  sourceCallId?: string;
  sourceRecruitId?: string;
  createdAt: FirebaseDate;
  validatedAt?: FirebaseDate;
  availableAt?: FirebaseDate;
  paidAt?: FirebaseDate;
  withdrawalId?: string;
  cancelledAt?: FirebaseDate;
  cancellationReason?: string;
}

// ============================================================================
// WITHDRAWALS
// ============================================================================

export interface GroupAdminWithdrawal {
  id: string;
  groupAdminId: string;
  amount: number;
  currency: "USD";
  status: GroupAdminWithdrawalStatus;
  paymentMethod: GroupAdminPaymentMethod;
  paymentDetails: GroupAdminPaymentDetails;
  commissionIds: string[];
  paymentReference?: string;
  processingFee?: number;
  netAmount?: number;
  createdAt: FirebaseDate;
  approvedAt?: FirebaseDate;
  completedAt?: FirebaseDate;
  rejectedAt?: FirebaseDate;
  rejectionReason?: string;
  failedAt?: FirebaseDate;
  failureReason?: string;
}

// ============================================================================
// RECRUITS
// ============================================================================

export interface GroupAdminRecruit {
  id: string;
  recruiterId: string;
  recruitedId: string;
  recruitedEmail: string;
  recruitedName: string;
  recruitedGroupName: string;
  recruitmentCode: string;
  recruitedAt: FirebaseDate;
  commissionWindowEnd: FirebaseDate;
  commissionPaid: boolean;
  commissionId?: string;
  commissionPaidAt?: FirebaseDate;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

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

export interface GroupAdminNotification {
  id: string;
  groupAdminId: string;
  type: GroupAdminNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: FirebaseDate;
  readAt?: FirebaseDate;
}

// ============================================================================
// RESOURCES
// ============================================================================

export interface GroupAdminResource {
  id: string;
  category: GroupAdminResourceCategory;
  type: GroupAdminResourceType;
  name: string;
  nameTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;
  description?: string;
  descriptionTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  fileUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  fileFormat?: "JPEG" | "PNG" | "GIF" | "MP4";
  dimensions?: { width: number; height: number };
  content?: string;
  contentTranslations?: Partial<Record<SupportedGroupAdminLanguage, string>>;
  placeholders?: string[];
  isActive: boolean;
  order: number;
  downloadCount: number;
  copyCount: number;
  createdAt: FirebaseDate;
  updatedAt: FirebaseDate;
}

// ============================================================================
// POSTS
// ============================================================================

export interface GroupAdminPost {
  id: string;
  name: string;
  nameTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;
  category: GroupAdminPostCategory;
  content: string;
  contentTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;
  imageResourceId?: string;
  placeholders: string[];
  recommendedPinDuration?: "1_week" | "2_weeks" | "1_month" | "permanent";
  bestTimeToPost?: "monday_morning" | "weekend" | "evening" | "any";
  usageCount: number;
  isActive: boolean;
  order: number;
  createdAt: FirebaseDate;
  updatedAt: FirebaseDate;
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export interface GroupAdminLeaderboardEntry {
  rank: number;
  groupAdminId: string;
  groupAdminName: string;
  groupName?: string;
  earnings: number;
  clients?: number;
  recruits?: number;
  badges?: GroupAdminBadgeType[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

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
}

export interface GroupAdminDashboardResponse {
  profile: GroupAdmin;
  recentCommissions: GroupAdminCommission[];
  recentWithdrawals: GroupAdminWithdrawal[];
  recentRecruits: GroupAdminRecruit[];
  notifications: GroupAdminNotification[];
  leaderboard: GroupAdminLeaderboardEntry[];
}

export interface GroupAdminLeaderboardResponse {
  month: string;
  rankings: GroupAdminLeaderboardEntry[];
  currentAdminRank: number | null;
  totalParticipants: number;
}

export interface GroupAdminResourcesResponse {
  resources: GroupAdminResource[];
  categories: { category: GroupAdminResourceCategory; count: number }[];
}

export interface GroupAdminPostsResponse {
  posts: GroupAdminPost[];
  categories: { category: GroupAdminPostCategory; count: number }[];
}

export interface RequestWithdrawalRequest {
  amount: number;
  paymentMethod: GroupAdminPaymentMethod;
  paymentDetails: GroupAdminPaymentDetails;
}

export interface RegisterGroupAdminResponse {
  success: boolean;
  groupAdminId: string;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
}

export interface RequestWithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  estimatedProcessingTime: string;
}

// ============================================================================
// BADGE DEFINITIONS
// ============================================================================

export interface GroupAdminBadgeDefinition {
  type: GroupAdminBadgeType;
  name: string;
  nameTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;
  description: string;
  descriptionTranslations: Partial<Record<SupportedGroupAdminLanguage, string>>;
  icon: string;
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

export const GROUP_ADMIN_BADGES: Record<GroupAdminBadgeType, GroupAdminBadgeDefinition> = {
  first_conversion: {
    type: "first_conversion",
    name: "First Client",
    nameTranslations: { fr: "Premier Client", es: "Primer Cliente" },
    description: "Earned your first client referral commission",
    descriptionTranslations: { fr: "Première commission de parrainage client", es: "Primera comisión de referencia de cliente" },
    icon: "🎯",
    color: "#4CAF50",
    requirement: { type: "clients", threshold: 1 },
    repeatable: false,
    order: 1,
  },
  group_verified: {
    type: "group_verified",
    name: "Verified Group",
    nameTranslations: { fr: "Groupe Vérifié", es: "Grupo Verificado" },
    description: "Your Facebook group has been verified",
    descriptionTranslations: { fr: "Votre groupe Facebook a été vérifié", es: "Tu grupo de Facebook ha sido verificado" },
    icon: "✅",
    color: "#2196F3",
    requirement: { type: "verification" },
    repeatable: false,
    order: 2,
  },
  earnings_100: {
    type: "earnings_100",
    name: "$100 Earned",
    nameTranslations: { fr: "100$ Gagnés", es: "$100 Ganados" },
    description: "Earned $100 in commissions",
    descriptionTranslations: { fr: "100$ de commissions gagnés", es: "$100 en comisiones ganadas" },
    icon: "💵",
    color: "#FFC107",
    requirement: { type: "earnings", threshold: 10000 },
    repeatable: false,
    order: 3,
  },
  earnings_500: {
    type: "earnings_500",
    name: "$500 Earned",
    nameTranslations: { fr: "500$ Gagnés", es: "$500 Ganados" },
    description: "Earned $500 in commissions",
    descriptionTranslations: { fr: "500$ de commissions gagnés", es: "$500 en comisiones ganadas" },
    icon: "💰",
    color: "#FF9800",
    requirement: { type: "earnings", threshold: 50000 },
    repeatable: false,
    order: 4,
  },
  earnings_1000: {
    type: "earnings_1000",
    name: "$1,000 Earned",
    nameTranslations: { fr: "1000$ Gagnés", es: "$1,000 Ganados" },
    description: "Earned $1,000 in commissions",
    descriptionTranslations: { fr: "1000$ de commissions gagnés", es: "$1,000 en comisiones ganadas" },
    icon: "🏆",
    color: "#E91E63",
    requirement: { type: "earnings", threshold: 100000 },
    repeatable: false,
    order: 5,
  },
  earnings_5000: {
    type: "earnings_5000",
    name: "$5,000 Earned",
    nameTranslations: { fr: "5000$ Gagnés", es: "$5,000 Ganados" },
    description: "Earned $5,000 in commissions",
    descriptionTranslations: { fr: "5000$ de commissions gagnés", es: "$5,000 en comisiones ganadas" },
    icon: "💎",
    color: "#9C27B0",
    requirement: { type: "earnings", threshold: 500000 },
    repeatable: false,
    order: 6,
  },
  recruit_1: {
    type: "recruit_1",
    name: "First Recruit",
    nameTranslations: { fr: "Première Recrue", es: "Primera Recluta" },
    description: "Recruited your first group admin",
    descriptionTranslations: { fr: "Première recrue d'admin de groupe", es: "Reclutaste tu primer administrador de grupo" },
    icon: "👥",
    color: "#00BCD4",
    requirement: { type: "recruits", threshold: 1 },
    repeatable: false,
    order: 7,
  },
  recruit_10: {
    type: "recruit_10",
    name: "Team Builder",
    nameTranslations: { fr: "Bâtisseur d'Équipe", es: "Constructor de Equipos" },
    description: "Recruited 10 group admins",
    descriptionTranslations: { fr: "10 admins de groupe recrutés", es: "10 administradores de grupo reclutados" },
    icon: "🏗️",
    color: "#3F51B5",
    requirement: { type: "recruits", threshold: 10 },
    repeatable: false,
    order: 8,
  },
  recruit_25: {
    type: "recruit_25",
    name: "Network Leader",
    nameTranslations: { fr: "Leader de Réseau", es: "Líder de Red" },
    description: "Recruited 25 group admins",
    descriptionTranslations: { fr: "25 admins de groupe recrutés", es: "25 administradores de grupo reclutados" },
    icon: "🌐",
    color: "#673AB7",
    requirement: { type: "recruits", threshold: 25 },
    repeatable: false,
    order: 9,
  },
  top10: {
    type: "top10",
    name: "Top 10",
    nameTranslations: { fr: "Top 10", es: "Top 10" },
    description: "Reached Top 10 in monthly rankings",
    descriptionTranslations: { fr: "Atteint le Top 10 mensuel", es: "Alcanzaste el Top 10 mensual" },
    icon: "🔟",
    color: "#795548",
    requirement: { type: "rank", threshold: 10 },
    repeatable: true,
    order: 10,
  },
  top3: {
    type: "top3",
    name: "Top 3",
    nameTranslations: { fr: "Top 3", es: "Top 3" },
    description: "Reached Top 3 in monthly rankings",
    descriptionTranslations: { fr: "Atteint le Top 3 mensuel", es: "Alcanzaste el Top 3 mensual" },
    icon: "🥉",
    color: "#CD7F32",
    requirement: { type: "rank", threshold: 3 },
    repeatable: true,
    order: 11,
  },
  top1: {
    type: "top1",
    name: "#1 Monthly",
    nameTranslations: { fr: "#1 Mensuel", es: "#1 Mensual" },
    description: "Reached #1 in monthly rankings",
    descriptionTranslations: { fr: "Numéro 1 du classement mensuel", es: "Número 1 del ranking mensual" },
    icon: "🥇",
    color: "#FFD700",
    requirement: { type: "rank", threshold: 1 },
    repeatable: true,
    order: 12,
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export const GROUP_TYPE_LABELS: Record<GroupType, { en: string; fr: string; es: string }> = {
  travel: { en: "Travel", fr: "Voyage", es: "Viaje" },
  expat: { en: "Expatriate Community", fr: "Communauté Expatriés", es: "Comunidad Expatriados" },
  digital_nomad: { en: "Digital Nomads", fr: "Nomades Digitaux", es: "Nómadas Digitales" },
  immigration: { en: "Immigration", fr: "Immigration", es: "Inmigración" },
  relocation: { en: "International Relocation", fr: "Relocalisation Internationale", es: "Reubicación Internacional" },
  language: { en: "Language Exchange", fr: "Échange Linguistique", es: "Intercambio de Idiomas" },
  country_specific: { en: "Country-Specific", fr: "Pays Spécifique", es: "País Específico" },
  profession: { en: "Profession Abroad", fr: "Profession à l'Étranger", es: "Profesión en el Extranjero" },
  family: { en: "Expatriate Families", fr: "Familles Expatriées", es: "Familias Expatriadas" },
  student: { en: "Students Abroad", fr: "Étudiants à l'Étranger", es: "Estudiantes en el Extranjero" },
  retirement: { en: "Retirement Abroad", fr: "Retraite à l'Étranger", es: "Jubilación en el Extranjero" },
  other: { en: "Other", fr: "Autre", es: "Otro" },
};

export const GROUP_SIZE_LABELS: Record<GroupSizeTier, string> = {
  "lt1k": "< 1,000",
  "1k-5k": "1,000 - 5,000",
  "5k-10k": "5,000 - 10,000",
  "10k-25k": "10,000 - 25,000",
  "25k-50k": "25,000 - 50,000",
  "50k-100k": "50,000 - 100,000",
  "gt100k": "> 100,000",
};

export const RESOURCE_CATEGORY_LABELS: Record<GroupAdminResourceCategory, { en: string; fr: string }> = {
  pinned_posts: { en: "Pinned Posts", fr: "Posts Épinglés" },
  cover_banners: { en: "Cover Banners", fr: "Bannières de Couverture" },
  post_images: { en: "Post Images", fr: "Images pour Posts" },
  story_images: { en: "Story Images", fr: "Images Stories" },
  badges: { en: "Partner Badges", fr: "Badges Partenaire" },
  welcome_messages: { en: "Welcome Messages", fr: "Messages de Bienvenue" },
};

export const POST_CATEGORY_LABELS: Record<GroupAdminPostCategory, { en: string; fr: string }> = {
  announcement: { en: "Announcements", fr: "Annonces" },
  reminder: { en: "Reminders", fr: "Rappels" },
  testimonial: { en: "Testimonials", fr: "Témoignages" },
  qa: { en: "Q&A", fr: "Q&R" },
  emergency: { en: "Emergency Help", fr: "Aide d'Urgence" },
  seasonal: { en: "Seasonal", fr: "Saisonnier" },
};

/**
 * Format currency amount (cents to dollars)
 */
export function formatGroupAdminAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Get affiliate link for a GroupAdmin
 */
export function getGroupAdminAffiliateLink(affiliateCode: string): string {
  return `https://sos-expat.com/r/${affiliateCode}`;
}

/**
 * Get recruitment link for a GroupAdmin
 */
export function getGroupAdminRecruitmentLink(affiliateCode: string): string {
  return `https://sos-expat.com/group-admin/inscription?ref=${affiliateCode}`;
}
