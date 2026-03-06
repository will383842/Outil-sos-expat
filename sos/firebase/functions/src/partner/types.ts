/**
 * Partner System Types
 *
 * Types for the Partner affiliate system — commercial partnerships
 * with websites that drive traffic and calls via affiliate links.
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================
// ENUMS
// ============================================================

export type SupportedPartnerLanguage = "fr" | "en" | "es" | "de" | "pt" | "ar" | "ch" | "ru" | "hi";

export type PartnerCategory =
  | "expatriation"
  | "travel"
  | "legal"
  | "finance"
  | "insurance"
  | "relocation"
  | "education"
  | "media"
  | "association"
  | "corporate"
  | "other";

export type PartnerTrafficTier =
  | "lt10k"
  | "10k-50k"
  | "50k-100k"
  | "100k-500k"
  | "500k-1m"
  | "gt1m";

export type PartnerCommissionStatus = "pending" | "validated" | "available" | "paid" | "cancelled";

export type PartnerNotificationType =
  | "system_announcement"
  | "commission_earned"
  | "commission_available"
  | "withdrawal_approved"
  | "withdrawal_completed"
  | "withdrawal_rejected"
  | "withdrawal_failed";

// ============================================================
// INTERFACES PRINCIPALES
// ============================================================

export interface Partner {
  // IDENTITE
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoUrl?: string;
  country: string;
  language: SupportedPartnerLanguage;

  // SITE PARTENAIRE
  websiteUrl: string;
  websiteName: string;
  websiteDescription?: string;
  websiteCategory: PartnerCategory;
  websiteTraffic?: PartnerTrafficTier;
  websiteLogo?: string;

  // STATUT
  status: "active" | "suspended" | "banned";
  isVisible: boolean;
  adminNotes?: string;
  suspensionReason?: string;

  // CODE AFFILIE
  affiliateCode: string;
  affiliateLink: string;

  // COMMISSIONS CUSTOM
  commissionConfig: PartnerCommissionConfig;

  // REMISE POUR LA COMMUNAUTE DU PARTENAIRE
  discountConfig?: PartnerDiscountConfig;

  // BALANCES (cents USD)
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalWithdrawn: number;

  // STATS
  totalClicks: number;
  totalClients: number;
  totalCalls: number;
  totalCommissions: number;
  conversionRate: number;
  currentMonthStats: {
    clicks: number;
    clients: number;
    calls: number;
    earnings: number;
    month: string;
  };

  // PAIEMENT
  preferredPaymentMethod: "wise" | "bank_transfer" | "mobile_money" | null;
  paymentMethodId?: string;
  pendingWithdrawalId: string | null;

  // CONTACT COMMERCIAL
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;
  companyAddress?: string;
  vatNumber?: string;

  // CONTRAT
  contractStartDate: Timestamp;
  contractEndDate?: Timestamp | null;
  contractNotes?: string;

  // TIMESTAMPS
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
  createdBy: string;

  // CGU/GDPR
  termsAccepted: boolean;
  termsAcceptedAt: string;
  termsVersion: string;
  termsType: string;
  termsAffiliateVersion?: string;
  termsAffiliateType?: string;
  termsAcceptanceMeta?: {
    userAgent?: string;
    language?: string;
    timestamp?: number;
    acceptanceMethod?: string;
    ipHash?: string;
  };
  registrationIpHash?: string;
}

export interface PartnerApplication {
  id: string;
  status: "pending" | "contacted" | "accepted" | "rejected";

  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: SupportedPartnerLanguage;

  websiteUrl: string;
  websiteName: string;
  websiteCategory: PartnerCategory;
  websiteTraffic?: PartnerTrafficTier;
  websiteDescription?: string;

  message?: string;

  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  convertedToPartnerId?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  ipHash?: string;
  userAgent?: string;
}

export interface PartnerCommissionConfig {
  commissionPerCallLawyer: number;
  commissionPerCallExpat: number;
  usePercentage: boolean;
  commissionPercentage?: number;
  holdPeriodDays: number;
  releaseDelayHours: number;
  minimumCallDuration: number;
}

/**
 * Discount offered by a partner to their community/audience.
 * Applied when a client uses the partner's affiliate link to book a call.
 */
export interface PartnerDiscountConfig {
  /** Whether the discount is active */
  isActive: boolean;
  /** "fixed" = flat amount in cents, "percentage" = % of call price */
  type: "fixed" | "percentage";
  /** Amount in cents (for fixed) or percentage value 1-100 (for percentage) */
  value: number;
  /** Maximum discount in cents (for percentage type, to cap the discount) */
  maxDiscountCents?: number;
  /** Label shown to client, e.g. "Remise Expatica" */
  label?: string;
  /** Translations of the label */
  labelTranslations?: Record<string, string>;
  /** Optional end date for time-limited promotions */
  expiresAt?: Timestamp | null;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  partnerCode: string;
  partnerEmail: string;
  type: "client_referral" | "manual_adjustment";
  sourceId: string | null;
  sourceType: "call_session" | null;
  sourceDetails?: {
    clientId?: string;
    clientEmail?: string;
    callSessionId?: string;
    callDuration?: number;
    connectionFee?: number;
    providerId?: string;
    providerType?: "lawyer" | "expat";
  };
  amount: number;
  currency: "USD";
  description: string;
  status: PartnerCommissionStatus;
  validatedAt: Timestamp | null;
  availableAt: Timestamp | null;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Timestamp;
  adminNotes?: string;
  withdrawalId: string | null;
  paidAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PartnerNotification {
  id: string;
  partnerId: string;
  type: PartnerNotificationType;
  title: string;
  titleTranslations?: Record<string, string>;
  message: string;
  messageTranslations?: Record<string, string>;
  data?: Record<string, unknown>;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

export interface PartnerAffiliateClick {
  id: string;
  partnerId: string;
  partnerCode: string;
  clickedAt: Timestamp;
  converted: boolean;
  convertedAt?: Timestamp;
  convertedUserId?: string;
  userAgent?: string;
  referrerUrl?: string;
  landingPage?: string;
  ipHash?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface PartnerConfig {
  id: string;
  isSystemActive: boolean;
  withdrawalsEnabled: boolean;
  minimumWithdrawalAmount: number;
  defaultCommissionPerCallLawyer: number;
  defaultCommissionPerCallExpat: number;
  defaultHoldPeriodDays: number;
  defaultReleaseDelayHours: number;
  defaultMinimumCallDuration: number;
  attributionWindowDays: number;
  isPartnerListingPageVisible: boolean;
  isPartnerFooterLinkVisible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PartnerPromoWidget {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  type: "button" | "banner";
  dimension: string;
  customWidth?: number;
  customHeight?: number;
  buttonText?: string;
  buttonTextTranslations?: Record<string, string>;
  imageUrl?: string;
  altText?: string;
  altTextTranslations?: Record<string, string>;
  style?: Record<string, string>;
  htmlTemplate: string;
  trackingId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  isActive: boolean;
  order: number;
  views: number;
  clicks: number;
  conversions: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface GetPartnerDashboardResponse {
  partner: Partner;
  recentCommissions: PartnerCommission[];
  recentClicks: { date: string; count: number }[];
  monthlyStats: {
    month: string;
    clicks: number;
    clients: number;
    calls: number;
    earnings: number;
  }[];
  notifications: PartnerNotification[];
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreatePartnerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  language: SupportedPartnerLanguage;
  websiteUrl: string;
  websiteName: string;
  websiteDescription?: string;
  websiteCategory: PartnerCategory;
  websiteTraffic?: PartnerTrafficTier;
  affiliateCode: string;
  commissionPerCallLawyer: number;
  commissionPerCallExpat: number;
  usePercentage?: boolean;
  commissionPercentage?: number;
  // Discount for partner's community
  discountType?: "fixed" | "percentage";
  discountValue?: number;
  discountMaxCents?: number;
  discountLabel?: string;
  contractNotes?: string;
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  vatNumber?: string;
  sendCredentials?: boolean;
}

export interface SubmitPartnerApplicationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: SupportedPartnerLanguage;
  websiteUrl: string;
  websiteName: string;
  websiteCategory: PartnerCategory;
  websiteTraffic?: PartnerTrafficTier;
  websiteDescription?: string;
  message?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

export const PARTNER_CONSTANTS = {
  MIN_WITHDRAWAL_AMOUNT: 3000, // $30
  SOS_WITHDRAWAL_FEE_CENTS: 300, // $3
  DEFAULT_HOLD_PERIOD_DAYS: 7,
  DEFAULT_RELEASE_DELAY_HOURS: 24,
  DEFAULT_MIN_CALL_DURATION: 60,
  DEFAULT_COMMISSION_LAWYER: 500, // $5
  DEFAULT_COMMISSION_EXPAT: 300,  // $3
  ATTRIBUTION_WINDOW_DAYS: 30,
  AFFILIATE_CODE_REGEX: /^[A-Z0-9]{3,20}$/,
  AFFILIATE_BASE_URL: "https://sos-expat.com",
} as const;

export const DEFAULT_PARTNER_CONFIG: Omit<PartnerConfig, "createdAt" | "updatedAt"> = {
  id: "current",
  isSystemActive: true,
  withdrawalsEnabled: true,
  minimumWithdrawalAmount: PARTNER_CONSTANTS.MIN_WITHDRAWAL_AMOUNT,
  defaultCommissionPerCallLawyer: PARTNER_CONSTANTS.DEFAULT_COMMISSION_LAWYER,
  defaultCommissionPerCallExpat: PARTNER_CONSTANTS.DEFAULT_COMMISSION_EXPAT,
  defaultHoldPeriodDays: PARTNER_CONSTANTS.DEFAULT_HOLD_PERIOD_DAYS,
  defaultReleaseDelayHours: PARTNER_CONSTANTS.DEFAULT_RELEASE_DELAY_HOURS,
  defaultMinimumCallDuration: PARTNER_CONSTANTS.DEFAULT_MIN_CALL_DURATION,
  attributionWindowDays: PARTNER_CONSTANTS.ATTRIBUTION_WINDOW_DAYS,
  isPartnerListingPageVisible: false,
  isPartnerFooterLinkVisible: false,
};
