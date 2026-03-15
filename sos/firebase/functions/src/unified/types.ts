/**
 * Unified Affiliate System — Type Definitions
 *
 * Central type definitions for the unified commission system.
 * Replaces 6 parallel type systems (chatter, influencer, blogger,
 * groupAdmin, affiliate, partner) with 1 flexible plan-based model.
 *
 * KEY PRINCIPLES:
 * - 1 user = 1 affiliate code = 1 link (/r/CODE)
 * - Commission behavior determined by CommissionPlan, not code
 * - 4-level customization: role default > sub-group > individual > lockedRates
 * - All amounts in CENTS (USD)
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// COMMISSION PLAN — Main configuration document
// Collection: commission_plans/{planId}
// ============================================================================

export interface UnifiedCommissionPlan {
  id: string;
  name: string;
  description: string;
  /** Roles this plan targets (e.g., ["chatter"] or ["*"] for all) */
  targetRoles: string[];
  /** Default plan for the target role(s) — only 1 per role */
  isDefault: boolean;

  rules: CommissionPlanRules;
  bonuses: CommissionPlanBonuses;
  discount: CommissionPlanDiscount;
  withdrawal: CommissionPlanWithdrawal;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
  /** Incremented on each update for optimistic concurrency */
  version: number;
}

// ============================================================================
// RULES — What commissions are generated and how
// ============================================================================

export interface CommissionPlanRules {
  signup_bonus: {
    enabled: boolean;
    /** Cents awarded when a referred user registers */
    amount: number;
  };
  client_call: {
    enabled: boolean;
    type: "fixed" | "percentage";
    /** Fixed amounts per provider type (cents). Used when type="fixed" */
    amounts?: {
      lawyer: number;
      expat: number;
    };
    /** Rate applied to call amount. Used when type="percentage" (0.15 = 15%) */
    rate?: number;
  };
  recruitment_call: {
    enabled: boolean;
    /** Max cascade depth (0=disabled, 1=N1 only, 2=N1+N2, max 5) */
    depth: number;
    /** Amount per depth level in cents. Length must equal depth. */
    depthAmounts: number[];
  };
  activation_bonus: {
    enabled: boolean;
    /** Cents awarded when recruited user makes their Nth call */
    amount: number;
    /** Which call number triggers the bonus (e.g., 2 = after 2nd call) */
    afterNthCall: number;
  };
  provider_recruitment: {
    enabled: boolean;
    /** Commission per call received by recruited provider (cents) */
    amounts: {
      lawyer: number;
      expat: number;
    };
    /** Commission window in months (1-24) */
    windowMonths: number;
  };
  recruit_bonus: {
    enabled: boolean;
    /** Cents when your recruited affiliate activates */
    amount: number;
  };
  n1_recruit_bonus: {
    enabled: boolean;
    /** Cents when N1's recruit activates (bonus for N2) */
    amount: number;
  };
  subscription_commission: {
    enabled: boolean;
    type: "fixed" | "percentage";
    /** Cents for first subscription month (if type="fixed") */
    firstMonthAmount?: number;
    /** Cents per renewal (if type="fixed") */
    renewalAmount?: number;
    /** Rate on subscription amount (if type="percentage", 0-1) */
    rate?: number;
    /** Max renewal months to earn on (0 = unlimited) */
    maxMonths?: number;
  };
  referral_milestones: {
    enabled: boolean;
    /** Min cents earned by referral to count as "qualified" */
    qualificationThreshold: number;
    /** One-time bonuses at referral count milestones */
    milestones: ReferralMilestone[];
  };
  captain_bonus: {
    enabled: boolean;
    /** Cents per team call (replaces N1/N2 for captains) */
    callAmount: number;
    /** Monthly tier bonuses based on team call count */
    tiers: CaptainTier[];
    qualityBonus: {
      enabled: boolean;
      /** Cents for monthly quality bonus */
      amount: number;
      /** Min active recruits required */
      minActiveRecruits: number;
      /** Min team commission cents required */
      minTeamCommissions: number;
    };
  };
  promo_multiplier: {
    enabled: boolean;
    // Resolved at runtime via promotion service
    // Plan only stores the flag; actual promo is in admin_config
  };
}

export interface ReferralMilestone {
  /** Number of qualified referrals to trigger this milestone */
  minQualifiedReferrals: number;
  /** One-time bonus in cents (never resets) */
  bonusAmount: number;
  /** Display name (e.g., "5 filleuls") */
  name?: string;
}

export interface CaptainTier {
  /** Display name: "Bronze", "Argent", "Or", "Platine", "Diamant" */
  name: string;
  /** Minimum team calls in the month to reach this tier */
  minTeamCalls: number;
  /** Monthly bonus in cents */
  bonusAmount: number;
}

// ============================================================================
// DISCOUNT — Reduction for clients using the affiliate link
// ============================================================================

export interface CommissionPlanDiscount {
  enabled: boolean;
  type: "fixed" | "percentage";
  /** Cents (if fixed) or 1-100 (if percentage) */
  value: number;
  /** Max discount in cents for percentage type */
  maxDiscountCents?: number;
  /** Label shown to client (e.g., "Remise spéciale") */
  label?: string;
  /** i18n translations for the label */
  labelTranslations?: Record<string, string>;
  /** Services this discount applies to (empty = all) */
  appliesToServices?: string[];
  /** Discount expires N days after client registration (0 = never) */
  expiresAfterDays?: number;
}

// ============================================================================
// BONUSES — Gamification and reward features
// ============================================================================

export interface CommissionPlanBonuses {
  /** Enable level progression (1-5) */
  levels: boolean;
  /** Enable streak bonuses */
  streaks: boolean;
  top3: {
    enabled: boolean;
    /** "cash" = fixed amounts, "multiplier" = applied to next month */
    type: "cash" | "multiplier";
    /** [rank1, rank2, rank3] in cents. Used if type="cash" */
    cashAmounts?: number[];
    /** [rank1, rank2, rank3] multipliers. Used if type="multiplier" */
    multipliers?: number[];
    /** Min total earned (cents) to be eligible (legacy) */
    minTotalEarned?: number;
    /** Min monthly earnings (cents) to be eligible for top 3 */
    minMonthlyEarnings?: number;
  };
  /** Enable captain promotion system */
  captain: boolean;
  /** Enable weekly challenges */
  weeklyChallenges: boolean;
  telegramBonus: {
    enabled: boolean;
    /** Bonus amount in cents (e.g., 5000 = $50) */
    amount: number;
    /** Commissions required to unlock (cents, e.g., 15000 = $150) */
    unlockThreshold: number;
  };
}

export interface CommissionPlanWithdrawal {
  /** Minimum withdrawal in cents (e.g., 3000 = $30) */
  minimumAmount: number;
  /** Fixed fee per withdrawal in cents (e.g., 300 = $3) */
  fee: number;
  /** Hours to hold commission before release (0-720) */
  holdPeriodHours: number;
}

// ============================================================================
// UNIFIED COMMISSION — Single document in `commissions` collection
// ============================================================================

export type CommissionType =
  | "client_call"
  | "signup_bonus"
  | "recruitment_call"
  | "activation_bonus"
  | "provider_recruitment"
  | "recruit_bonus"
  | "n1_recruit_bonus"
  | "subscription_commission"
  | "subscription_renewal"
  | "captain_call"
  | "captain_tier_bonus"
  | "captain_quality_bonus"
  | "referral_milestone"
  | "bonus_level"
  | "bonus_streak"
  | "bonus_top3"
  | "bonus_weekly_challenge"
  | "bonus_telegram"
  | "manual_adjustment";

export type CommissionStatus =
  | "pending"
  | "validated"
  | "held"
  | "available"
  | "paid"
  | "cancelled";

export interface UnifiedCommission {
  id: string;

  // WHO EARNS
  referrerId: string;
  referrerRole: string;
  referrerCode: string;

  // WHO TRIGGERED THE ACTION
  refereeId: string;
  refereeRole: string;

  // TYPE
  type: CommissionType;
  /** "n1" | "n2" | "n3" for recruitment_call, milestone name for referral_milestone */
  subType?: string;

  // SOURCE
  /** callSessionId, userId, subscriptionId, etc. */
  sourceId?: string;
  sourceType?: string;

  // AMOUNT CALCULATION
  /** Plan ID used for calculation (traceability) */
  planId: string;
  /** Plan version at time of calculation */
  planVersion: number;
  /** How the amount was determined */
  calculationType: "fixed" | "percentage" | "locked_rate";
  /** Base amount used for percentage calculation */
  baseAmount?: number;
  /** Rate or amount applied */
  rateApplied?: number;
  /** True if lockedRates took priority over plan */
  lockedRateUsed?: boolean;
  /** Multiplier applied (e.g., monthlyTopMultiplier for influencers) */
  multiplierApplied?: number;
  /** Promo multiplier if any (GroupAdmin promotions) */
  promoMultiplierApplied?: number;
  /** Final commission amount in cents */
  amount: number;
  currency: string;

  // STATUS
  status: CommissionStatus;
  /** When held commission should be released */
  holdUntil?: Timestamp;

  // TIMESTAMPS
  createdAt: Timestamp;
  /** Compat with old system validated→held mapping */
  validatedAt?: Timestamp;
  availableAt?: Timestamp;
  paidAt?: Timestamp;
  payoutId?: string;
  cancelledAt?: Timestamp;
  cancelReason?: string;

  // MIGRATION
  /** Source collection if migrated from old system */
  _migratedFrom?: string;
  _migratedAt?: Timestamp;
}

// ============================================================================
// COMMISSION EVENTS — Input events that trigger commission calculation
// ============================================================================

export type CommissionEvent =
  | CommissionEventCallCompleted
  | CommissionEventUserRegistered
  | CommissionEventProviderRegistered
  | CommissionEventSubscriptionCreated
  | CommissionEventSubscriptionRenewed;

export interface CommissionEventCallCompleted {
  type: "call_completed";
  callSession: {
    id: string;
    clientId: string;
    providerId: string;
    providerType: "lawyer" | "expat";
    amount: number;
    connectionFee: number;
    duration: number;
    isPaid: boolean;
  };
  shadowMode?: boolean;
}

export interface CommissionEventUserRegistered {
  type: "user_registered";
  userId: string;
  role: string;
  referralCode?: string;
  referralCapturedAt?: string;
  shadowMode?: boolean;
}

export interface CommissionEventProviderRegistered {
  type: "provider_registered";
  userId: string;
  providerType: "lawyer" | "expat";
  /** Unified field — new system */
  recruitmentCode?: string;
  /** Legacy fields for backward compatibility */
  providerRecruitedByChatter?: string;
  providerRecruitedByBlogger?: string;
  recruitedByInfluencer?: boolean;
  influencerCode?: string;
  providerRecruitedByGroupAdmin?: string;
  shadowMode?: boolean;
}

export interface CommissionEventSubscriptionCreated {
  type: "subscription_created";
  subscriptionId: string;
  providerId: string;
  planId: string;
  amount: number;
  billingPeriod: "monthly" | "yearly";
  shadowMode?: boolean;
}

export interface CommissionEventSubscriptionRenewed {
  type: "subscription_renewed";
  subscriptionId: string;
  providerId: string;
  renewalMonth: number;
  amount: number;
  shadowMode?: boolean;
}

// ============================================================================
// SHADOW MODE — Compare new vs old system results
// ============================================================================

export interface ShadowResult {
  commissions: Array<{
    referrerId: string;
    type: CommissionType;
    subType?: string;
    amount: number;
  }>;
  totalAmount: number;
  discountApplied?: number;
}

// ============================================================================
// REFERRAL RESOLUTION — Finding who referred whom
// ============================================================================

export interface ReferralResolution {
  userId: string;
  email: string;
  role: string;
  affiliateCode: string;
  commissionPlanId: string;
  lockedRates?: Record<string, number>;
  monthlyTopMultiplier?: number;
  /** Individual discount config override (if set on user doc) */
  discountConfig?: {
    enabled: boolean;
    type: "fixed" | "percentage";
    value: number;
    maxDiscountCents?: number;
    label?: string;
    labelTranslations?: Record<string, string>;
    expiresAfterDays?: number;
  } | null;
  resolvedVia:
    | "unified"
    | "legacy_client"
    | "legacy_recruitment"
    | "legacy_provider"
    | "partner";
}

export interface CascadeNode {
  userId: string;
  role: string;
  affiliateCode: string;
  commissionPlanId: string;
  lockedRates?: Record<string, number>;
  isCaptain?: boolean;
  depth: number;
}

// ============================================================================
// DISCOUNT RESOLUTION — Calculating affiliate discount for client
// ============================================================================

export interface DiscountResult {
  hasDiscount: boolean;
  discountAmount: number;
  originalPrice: number;
  finalPrice: number;
  label?: string;
  labelTranslations?: Record<string, string>;
  referrerCode?: string;
  referrerId?: string;
  planId?: string;
  discountType?: "fixed" | "percentage";
  discountValue?: number;
}

// ============================================================================
// RECRUITED PROVIDER — Unified tracking
// Collection: recruited_providers/{id}
// ============================================================================

export interface UnifiedRecruitedProvider {
  id: string;
  recruiterId: string;
  recruiterRole: string;
  recruiterCode: string;
  /** Plan ID of the recruiter at time of recruitment */
  commissionPlanId: string | null;
  providerId: string;
  providerEmail: string;
  providerType: "lawyer" | "expat";
  providerName: string;
  recruitedAt: Timestamp;
  /** When the commission window closes */
  windowEnd: Timestamp;
  isActive: boolean;
  callsWithCommission: number;
  totalCommissions: number;
  lastCommissionAt?: Timestamp;
  /** Source collection if migrated */
  _migratedFrom?: string;
}

// ============================================================================
// FEATURE FLAG — System cutover control
// Collection: unified_commission_system/config
// ============================================================================

export interface UnifiedSystemConfig {
  /** Master switch: true = new system active, false = old system */
  enabled: boolean;
  /** Shadow mode: new system calculates but doesn't write */
  shadowMode: boolean;
  /** Date when system was enabled */
  enabledAt?: Timestamp;
  /** Who enabled it */
  enabledBy?: string;
  /** Rollback notes */
  lastRollbackAt?: Timestamp;
  lastRollbackBy?: string;
  lastRollbackReason?: string;
}
