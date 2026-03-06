/**
 * Commission Plans - Shared Types
 *
 * Defines the commission_plans Firestore collection structure
 * and the LockedRates snapshot stored on each affiliate profile.
 *
 * LIFETIME RATE LOCK: Whatever rates are active at registration
 * are permanently frozen for that affiliate forever.
 */

import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// COMMISSION PLAN (Firestore: commission_plans/{planId})
// ============================================================================

/**
 * Rates specific to Chatter affiliates (amounts in cents)
 */
export interface ChatterPlanRates {
  commissionClientCallAmount: number;
  commissionClientCallAmountLawyer?: number;
  commissionClientCallAmountExpat?: number;
  commissionN1CallAmount: number;
  commissionN2CallAmount: number;
  commissionActivationBonusAmount: number;
  commissionN1RecruitBonusAmount: number;
  commissionProviderCallAmount: number;
  commissionProviderCallAmountLawyer?: number;
  commissionProviderCallAmountExpat?: number;
  commissionCaptainCallAmountLawyer?: number;
  commissionCaptainCallAmountExpat?: number;
}

/**
 * Rates specific to Influencer affiliates (amounts in cents)
 */
export interface InfluencerPlanRates {
  commissionClientAmount: number;
  commissionClientAmountLawyer?: number;
  commissionClientAmountExpat?: number;
  commissionRecruitmentAmount: number;
  commissionRecruitmentAmountLawyer?: number;
  commissionRecruitmentAmountExpat?: number;
}

/**
 * Rates specific to Blogger affiliates (amounts in cents)
 */
export interface BloggerPlanRates {
  commissionClientAmount: number;
  commissionClientAmountLawyer?: number;
  commissionClientAmountExpat?: number;
  commissionRecruitmentAmount: number;
  commissionRecruitmentAmountLawyer?: number;
  commissionRecruitmentAmountExpat?: number;
}

/**
 * Rates specific to GroupAdmin affiliates (amounts in cents)
 */
export interface GroupAdminPlanRates {
  commissionClientCallAmount?: number;
  commissionClientAmountLawyer?: number;
  commissionClientAmountExpat?: number;
  commissionN1CallAmount: number;
  commissionN2CallAmount: number;
  commissionActivationBonusAmount: number;
  commissionN1RecruitBonusAmount: number;
}

/**
 * Rates for generic affiliate program (clients, lawyers, expats who refer users)
 * Uses a mix of fixed amounts (cents) and percentage rates
 */
export interface AffiliatePlanRates {
  /** Fixed bonus for referral signup (cents) */
  signupBonus: number;
  /** Rate on call revenue (e.g., 0.75 = 75%) */
  callCommissionRate: number;
  /** Fixed bonus per call (cents) */
  callFixedBonus: number;
  /** Rate on subscription revenue (e.g., 0.15 = 15%) */
  subscriptionRate: number;
  /** Fixed bonus per subscription (cents) */
  subscriptionFixedBonus: number;
  /** Fixed bonus when referred provider completes KYC (cents) */
  providerValidationBonus: number;
}

/**
 * Commission Plan document
 * Collection: commission_plans/{planId}
 *
 * Plans define commission rates for a time period.
 * When an affiliate registers during a plan's active period,
 * the plan's rates are snapshot onto their profile as lockedRates.
 */
export interface CommissionPlan {
  id: string;
  name: string;
  description?: string;

  /** Start date (inclusive) - plan is active from this date */
  startDate: Timestamp;
  /** End date (inclusive) - plan is active until this date */
  endDate: Timestamp;
  /** Whether this plan is enabled (can be disabled by admin) */
  isActive: boolean;

  /** Priority when multiple plans overlap (higher = wins) */
  priority: number;

  /** Rates per affiliate role */
  chatterRates: ChatterPlanRates;
  influencerRates: InfluencerPlanRates;
  bloggerRates: BloggerPlanRates;
  groupAdminRates: GroupAdminPlanRates;
  /** Rates for generic affiliate program (clients, lawyers, expats) */
  affiliateRates?: AffiliatePlanRates;

  /** Metadata */
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// LOCKED RATES (snapshot stored on affiliate profiles)
// ============================================================================

/**
 * Fields added to each affiliate profile when rates are locked.
 * All fields are optional for backward compatibility.
 */
export interface LockedRatesFields {
  /** ID of the commission plan that was active at registration */
  commissionPlanId?: string;
  /** Name of the plan (denormalized for display) */
  commissionPlanName?: string;
  /** ISO date when rates were locked (registration date) */
  rateLockDate?: string;
  /** Snapshot of commission rates frozen at registration */
  lockedRates?: Record<string, number>;
}
