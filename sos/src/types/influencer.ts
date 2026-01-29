/**
 * Influencer Types for Frontend
 *
 * Matches the backend types from functions/src/influencer/types.ts
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type InfluencerStatus = 'active' | 'suspended' | 'blocked';

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

export type InfluencerWithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';

export type InfluencerPaymentMethod = 'wise' | 'paypal' | 'bank_transfer';

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

export interface InfluencerPaymentDetailsWise {
  type: 'wise';
  email: string;
  currency: string;
  accountHolderName: string;
}

export interface InfluencerPaymentDetailsPayPal {
  type: 'paypal';
  email: string;
  currency: string;
  accountHolderName: string;
}

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

export type InfluencerPaymentDetails =
  | InfluencerPaymentDetailsWise
  | InfluencerPaymentDetailsPayPal
  | InfluencerPaymentDetailsBankTransfer;

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

export interface RequestInfluencerWithdrawalInput {
  amount: number;
  paymentMethod: InfluencerPaymentMethod;
  paymentDetails: InfluencerPaymentDetails;
}
