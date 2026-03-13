/**
 * Unified Affiliate System — Default Commission Plans
 *
 * 8 default plans covering all roles. These are seeded into
 * commission_plans collection during Phase 2.
 *
 * All amounts in CENTS (USD).
 */

import { UnifiedCommissionPlan } from "./types";

// Timestamps are set at seed time, not here
type PlanSeedData = Omit<UnifiedCommissionPlan, "createdAt" | "updatedAt">;

// ============================================================================
// DISABLED SECTIONS — Reusable defaults for disabled features
// ============================================================================

const DISABLED_SIGNUP = { enabled: false, amount: 0 } as const;
const DISABLED_RECRUITMENT = { enabled: false, depth: 0, depthAmounts: [] as number[] } as const;
const DISABLED_ACTIVATION = { enabled: false, amount: 0, afterNthCall: 2 } as const;
const DISABLED_PROVIDER = { enabled: false, amounts: { lawyer: 0, expat: 0 }, windowMonths: 6 } as const;
const DISABLED_RECRUIT_BONUS = { enabled: false, amount: 0 } as const;
const DISABLED_SUBSCRIPTION = {
  enabled: false, type: "fixed" as const,
  firstMonthAmount: 0, renewalAmount: 0, maxMonths: 0,
} as const;
const DISABLED_MILESTONES = {
  enabled: false, qualificationThreshold: 0, milestones: [] as import("./types").ReferralMilestone[],
} as const;
const DISABLED_CAPTAIN = {
  enabled: false, callAmount: 0, tiers: [] as import("./types").CaptainTier[],
  qualityBonus: { enabled: false, amount: 0, minActiveRecruits: 0, minTeamCommissions: 0 },
} as const;
const DISABLED_PROMO = { enabled: false } as const;
const DISABLED_BONUSES = {
  levels: false, streaks: false,
  top3: { enabled: false, type: "cash" as const, cashAmounts: [] as number[], multipliers: [] as number[] },
  captain: false, weeklyChallenges: false,
  telegramBonus: { enabled: false, amount: 0, unlockThreshold: 0 },
} as const;
const DISABLED_DISCOUNT = { enabled: false, type: "fixed" as const, value: 0 } as const;
const DEFAULT_WITHDRAWAL = { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 } as const;

// ============================================================================
// PLAN: client_v1
// ============================================================================

export const CLIENT_V1: PlanSeedData = {
  id: "client_v1",
  name: "Plan Client Standard",
  description: "Plan par défaut pour les clients qui parrainent d'autres clients",
  targetRoles: ["client"],
  isDefault: true,
  rules: {
    signup_bonus: { enabled: true, amount: 200 },
    client_call: { enabled: true, type: "fixed", amounts: { lawyer: 200, expat: 100 } },
    recruitment_call: DISABLED_RECRUITMENT,
    activation_bonus: DISABLED_ACTIVATION,
    provider_recruitment: DISABLED_PROVIDER,
    recruit_bonus: DISABLED_RECRUIT_BONUS,
    n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: DISABLED_MILESTONES,
    captain_bonus: DISABLED_CAPTAIN,
    promo_multiplier: DISABLED_PROMO,
  },
  bonuses: DISABLED_BONUSES,
  discount: DISABLED_DISCOUNT,
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// PLAN: provider_v1
// ============================================================================

export const PROVIDER_V1: PlanSeedData = {
  id: "provider_v1",
  name: "Plan Prestataire Standard",
  description: "Plan par défaut pour les avocats et expatriés aidants",
  targetRoles: ["lawyer", "expat", "provider"],
  isDefault: true,
  rules: {
    signup_bonus: { enabled: true, amount: 200 },
    client_call: { enabled: true, type: "fixed", amounts: { lawyer: 200, expat: 100 } },
    recruitment_call: DISABLED_RECRUITMENT,
    activation_bonus: DISABLED_ACTIVATION,
    provider_recruitment: DISABLED_PROVIDER,
    recruit_bonus: DISABLED_RECRUIT_BONUS,
    n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: DISABLED_MILESTONES,
    captain_bonus: DISABLED_CAPTAIN,
    promo_multiplier: DISABLED_PROMO,
  },
  bonuses: DISABLED_BONUSES,
  discount: DISABLED_DISCOUNT,
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// PLAN: chatter_v1
// ============================================================================

export const CHATTER_V1: PlanSeedData = {
  id: "chatter_v1",
  name: "Plan Chatter Standard",
  description: "Plan complet pour les chatters avec cascade N1/N2, milestones, top 3 cash",
  targetRoles: ["chatter"],
  isDefault: true,
  rules: {
    signup_bonus: { enabled: true, amount: 200 },
    client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
    recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] },
    activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 },
    provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
    recruit_bonus: { enabled: true, amount: 100 },
    n1_recruit_bonus: { enabled: true, amount: 100 },
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: {
      enabled: true,
      qualificationThreshold: 2000,
      milestones: [
        { minQualifiedReferrals: 5, bonusAmount: 1500, name: "5 filleuls" },
        { minQualifiedReferrals: 10, bonusAmount: 3500, name: "10 filleuls" },
        { minQualifiedReferrals: 20, bonusAmount: 7500, name: "20 filleuls" },
        { minQualifiedReferrals: 50, bonusAmount: 25000, name: "50 filleuls" },
        { minQualifiedReferrals: 100, bonusAmount: 60000, name: "100 filleuls" },
        { minQualifiedReferrals: 500, bonusAmount: 400000, name: "500 filleuls" },
      ],
    },
    captain_bonus: DISABLED_CAPTAIN,
    promo_multiplier: DISABLED_PROMO,
  },
  bonuses: {
    levels: true,
    streaks: true,
    top3: {
      enabled: true,
      type: "cash",
      cashAmounts: [20000, 10000, 5000],
      minTotalEarned: 2000,
    },
    captain: true,
    weeklyChallenges: true,
    telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 },
  },
  discount: DISABLED_DISCOUNT,
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// PLAN: captain_v1
// ============================================================================

export const CAPTAIN_V1: PlanSeedData = {
  id: "captain_v1",
  name: "Plan Captain Chatter",
  description: "Plan pour les captains avec tiers mensuels, quality bonus, et commissions d'équipe",
  targetRoles: ["captainChatter"],
  isDefault: true,
  rules: {
    // Same base as chatter
    signup_bonus: { enabled: true, amount: 200 },
    client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
    recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] },
    activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 },
    provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
    recruit_bonus: { enabled: true, amount: 100 },
    n1_recruit_bonus: { enabled: true, amount: 100 },
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: {
      enabled: true,
      qualificationThreshold: 2000,
      milestones: [
        { minQualifiedReferrals: 5, bonusAmount: 1500, name: "5 filleuls" },
        { minQualifiedReferrals: 10, bonusAmount: 3500, name: "10 filleuls" },
        { minQualifiedReferrals: 20, bonusAmount: 7500, name: "20 filleuls" },
        { minQualifiedReferrals: 50, bonusAmount: 25000, name: "50 filleuls" },
        { minQualifiedReferrals: 100, bonusAmount: 60000, name: "100 filleuls" },
        { minQualifiedReferrals: 500, bonusAmount: 400000, name: "500 filleuls" },
      ],
    },
    // Captain-specific
    captain_bonus: {
      enabled: true,
      callAmount: 300,
      tiers: [
        { name: "Bronze", minTeamCalls: 50, bonusAmount: 2500 },
        { name: "Argent", minTeamCalls: 100, bonusAmount: 5000 },
        { name: "Or", minTeamCalls: 200, bonusAmount: 10000 },
        { name: "Platine", minTeamCalls: 500, bonusAmount: 20000 },
        { name: "Diamant", minTeamCalls: 1000, bonusAmount: 40000 },
      ],
      qualityBonus: {
        enabled: true,
        amount: 2000,
        minActiveRecruits: 10,
        minTeamCommissions: 10000,
      },
    },
    promo_multiplier: DISABLED_PROMO,
  },
  bonuses: {
    levels: true,
    streaks: true,
    top3: {
      enabled: true,
      type: "cash",
      cashAmounts: [20000, 10000, 5000],
      minTotalEarned: 2000,
    },
    captain: true,
    weeklyChallenges: true,
    telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 },
  },
  discount: DISABLED_DISCOUNT,
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// PLAN: influencer_v1
// ============================================================================

export const INFLUENCER_V1: PlanSeedData = {
  id: "influencer_v1",
  name: "Plan Influenceur Standard",
  description: "Plan influenceur avec top 3 multiplicateur et 5% discount client",
  targetRoles: ["influencer"],
  isDefault: true,
  rules: {
    signup_bonus: { enabled: true, amount: 200 },
    client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
    recruitment_call: DISABLED_RECRUITMENT,
    activation_bonus: DISABLED_ACTIVATION,
    provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
    recruit_bonus: DISABLED_RECRUIT_BONUS,
    n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: DISABLED_MILESTONES,
    captain_bonus: DISABLED_CAPTAIN,
    promo_multiplier: DISABLED_PROMO,
  },
  bonuses: {
    levels: true,
    streaks: true,
    top3: {
      enabled: true,
      type: "multiplier",
      multipliers: [2.0, 1.5, 1.15],
    },
    captain: false,
    weeklyChallenges: false,
    telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 },
  },
  discount: {
    enabled: true,
    type: "percentage",
    value: 5,
    label: "Remise affilié",
    labelTranslations: { fr: "5% de remise", en: "5% discount" },
  },
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// PLAN: blogger_v1
// ============================================================================

export const BLOGGER_V1: PlanSeedData = {
  id: "blogger_v1",
  name: "Plan Bloggeur Standard",
  description: "Plan bloggeur avec commissions fixes, pas de discount client",
  targetRoles: ["blogger"],
  isDefault: true,
  rules: {
    signup_bonus: { enabled: true, amount: 200 },
    client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
    recruitment_call: DISABLED_RECRUITMENT,
    activation_bonus: DISABLED_ACTIVATION,
    provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
    recruit_bonus: DISABLED_RECRUIT_BONUS,
    n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: DISABLED_MILESTONES,
    captain_bonus: DISABLED_CAPTAIN,
    promo_multiplier: DISABLED_PROMO,
  },
  bonuses: DISABLED_BONUSES,
  discount: DISABLED_DISCOUNT,
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// PLAN: groupadmin_v1
// ============================================================================

export const GROUPADMIN_V1: PlanSeedData = {
  id: "groupadmin_v1",
  name: "Plan Admin Groupe Standard",
  description: "Plan admin groupe avec cascade N1/N2, promo multiplier, et $5 discount client",
  targetRoles: ["groupAdmin"],
  isDefault: true,
  rules: {
    signup_bonus: { enabled: true, amount: 200 },
    client_call: { enabled: true, type: "fixed", amounts: { lawyer: 500, expat: 300 } },
    recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] },
    activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 },
    provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
    recruit_bonus: { enabled: true, amount: 100 },
    n1_recruit_bonus: { enabled: true, amount: 100 },
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: DISABLED_MILESTONES,
    captain_bonus: DISABLED_CAPTAIN,
    promo_multiplier: { enabled: true },
  },
  bonuses: DISABLED_BONUSES,
  discount: {
    enabled: true,
    type: "fixed",
    value: 500,
    label: "Remise groupe",
    labelTranslations: { fr: "5$ de remise", en: "$5 discount" },
  },
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// PLAN: partner_v1
// ============================================================================

export const PARTNER_V1: PlanSeedData = {
  id: "partner_v1",
  name: "Plan Partenaire Standard",
  description: "Plan partenaire avec commission en pourcentage. Discount géré individuellement.",
  targetRoles: ["partner"],
  isDefault: true,
  rules: {
    signup_bonus: DISABLED_SIGNUP,
    client_call: { enabled: true, type: "percentage", rate: 0.15 },
    recruitment_call: DISABLED_RECRUITMENT,
    activation_bonus: DISABLED_ACTIVATION,
    provider_recruitment: DISABLED_PROVIDER,
    recruit_bonus: DISABLED_RECRUIT_BONUS,
    n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
    subscription_commission: DISABLED_SUBSCRIPTION,
    referral_milestones: DISABLED_MILESTONES,
    captain_bonus: DISABLED_CAPTAIN,
    promo_multiplier: DISABLED_PROMO,
  },
  bonuses: DISABLED_BONUSES,
  // Partners have individual discountConfig on their document, not via plan
  discount: DISABLED_DISCOUNT,
  withdrawal: DEFAULT_WITHDRAWAL,
  updatedBy: "system",
  version: 1,
};

// ============================================================================
// ALL DEFAULT PLANS
// ============================================================================

export const ALL_DEFAULT_PLANS: PlanSeedData[] = [
  CLIENT_V1,
  PROVIDER_V1,
  CHATTER_V1,
  CAPTAIN_V1,
  INFLUENCER_V1,
  BLOGGER_V1,
  GROUPADMIN_V1,
  PARTNER_V1,
];
