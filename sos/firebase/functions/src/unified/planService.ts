/**
 * Unified Plan Service
 *
 * Core service for resolving which commission plan applies to a user.
 *
 * RESOLUTION HIERARCHY (highest priority first):
 *   1. lockedRates on user doc        → individual rate overrides (frozen at registration or set by admin)
 *   2. commissionPlanId on user doc    → individual plan assigned by admin
 *   3. Role default plan               → plan with isDefault=true + targetRoles includes the role
 *   4. Catch-all default plan          → plan with targetRoles=["*"] (fallback)
 *
 * DISCOUNT HIERARCHY:
 *   1. discountConfig on user doc      → individual discount override
 *   2. Plan discount                   → from the resolved commission plan
 *
 * All amounts in CENTS (USD).
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { UnifiedCommissionPlan } from "./types";

// ============================================================================
// CACHE — Plans with 5-minute TTL
// ============================================================================

let planCache: Map<string, UnifiedCommissionPlan> | null = null;
let defaultPlansByRole: Map<string, UnifiedCommissionPlan> | null = null;
let catchAllPlan: UnifiedCommissionPlan | null | undefined = undefined;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return planCache !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

/** Force-clear cache (after admin updates) */
export function clearUnifiedPlanCache(): void {
  planCache = null;
  defaultPlansByRole = null;
  catchAllPlan = undefined;
  cacheTimestamp = 0;
}

// ============================================================================
// FETCH ALL PLANS
// ============================================================================

async function fetchAllPlans(): Promise<Map<string, UnifiedCommissionPlan>> {
  if (isCacheValid()) return planCache!;

  const db = getFirestore();
  const snapshot = await db.collection("commission_plans").get();

  planCache = new Map();
  defaultPlansByRole = new Map();
  catchAllPlan = null;

  for (const doc of snapshot.docs) {
    const plan = { id: doc.id, ...doc.data() } as UnifiedCommissionPlan;
    planCache.set(doc.id, plan);

    if (plan.isDefault) {
      for (const role of plan.targetRoles) {
        if (role === "*") {
          catchAllPlan = plan;
        } else {
          defaultPlansByRole.set(role, plan);
        }
      }
    }
  }

  cacheTimestamp = Date.now();
  return planCache;
}

// ============================================================================
// GET PLAN BY ID
// ============================================================================

/**
 * Get a specific plan by ID. Returns null if not found.
 */
export async function getPlanById(planId: string): Promise<UnifiedCommissionPlan | null> {
  const plans = await fetchAllPlans();
  return plans.get(planId) ?? null;
}

// ============================================================================
// RESOLVE PLAN FOR USER
// ============================================================================

/**
 * Resolve which commission plan applies to a user.
 *
 * Priority:
 *   1. User's individual commissionPlanId (if set)
 *   2. Default plan for the user's role
 *   3. Catch-all default plan (targetRoles: ["*"])
 *
 * @param role - The user's affiliate role (e.g., "chatter", "influencer", "lawyer")
 * @param commissionPlanId - Optional plan ID from user doc (individual override)
 */
export async function resolvePlanForUser(
  role: string,
  commissionPlanId?: string | null
): Promise<UnifiedCommissionPlan | null> {
  await fetchAllPlans();

  // 1. Individual plan assigned to user
  if (commissionPlanId) {
    const individualPlan = planCache!.get(commissionPlanId);
    if (individualPlan) return individualPlan;
    logger.warn(`Plan ${commissionPlanId} assigned to user but not found, falling back to role default`);
  }

  // 2. Default plan for this role
  const rolePlan = defaultPlansByRole!.get(role);
  if (rolePlan) return rolePlan;

  // 3. Catch-all default
  if (catchAllPlan) return catchAllPlan;

  logger.warn(`No plan found for role "${role}" and no catch-all plan exists`);
  return null;
}

// ============================================================================
// RESOLVE COMMISSION AMOUNT
// ============================================================================

/**
 * Get the effective commission amount for a specific rule, respecting the hierarchy:
 *   1. lockedRates on user doc (highest priority)
 *   2. Plan rule value
 *
 * @param lockedRates - User's frozen rates (may be undefined)
 * @param rateKey - Key in lockedRates (e.g., "client_call_lawyer")
 * @param planAmount - Amount from the resolved plan
 */
export function resolveAmount(
  lockedRates: Record<string, number> | undefined | null,
  rateKey: string,
  planAmount: number
): number {
  if (lockedRates && rateKey in lockedRates) {
    return lockedRates[rateKey];
  }
  return planAmount;
}

/**
 * Get the effective commission amount with lawyer/expat distinction.
 *
 * @param lockedRates - User's frozen rates
 * @param baseKey - e.g., "client_call"
 * @param providerType - "lawyer" | "expat"
 * @param planAmounts - { lawyer: number, expat: number } from plan
 */
export function resolveAmountByProviderType(
  lockedRates: Record<string, number> | undefined | null,
  baseKey: string,
  providerType: "lawyer" | "expat",
  planAmounts: { lawyer: number; expat: number }
): number {
  const specificKey = `${baseKey}_${providerType}`;

  // lockedRates take priority
  if (lockedRates) {
    if (specificKey in lockedRates) return lockedRates[specificKey];
    if (baseKey in lockedRates) return lockedRates[baseKey];
  }

  return providerType === "lawyer" ? planAmounts.lawyer : planAmounts.expat;
}

// ============================================================================
// SNAPSHOT LOCKED RATES AT REGISTRATION
// ============================================================================

/**
 * Create a lockedRates snapshot for a new affiliate at registration.
 * Freezes the current plan rates so they never change for this user.
 *
 * @param role - The affiliate role being registered
 * @param planOverrideId - Optional specific plan to use (instead of role default)
 */
export async function snapshotLockedRatesUnified(
  role: string,
  planOverrideId?: string
): Promise<{
  commissionPlanId: string;
  commissionPlanName: string;
  rateLockDate: string;
  lockedRates: Record<string, number>;
} | null> {
  const plan = planOverrideId
    ? await getPlanById(planOverrideId)
    : await resolvePlanForUser(role);

  if (!plan) return null;

  const rates: Record<string, number> = {};

  // Flatten plan rules into a Record<string, number> for lifetime lock
  const rules = plan.rules;

  // signup_bonus
  if (rules.signup_bonus.enabled) {
    rates.signup_bonus = rules.signup_bonus.amount;
  }

  // client_call
  if (rules.client_call.enabled) {
    if (rules.client_call.type === "fixed" && rules.client_call.amounts) {
      rates.client_call_lawyer = rules.client_call.amounts.lawyer;
      rates.client_call_expat = rules.client_call.amounts.expat;
    }
    if (rules.client_call.type === "percentage" && rules.client_call.rate !== undefined) {
      rates.client_call_rate = rules.client_call.rate;
    }
  }

  // recruitment_call
  if (rules.recruitment_call.enabled && rules.recruitment_call.depth > 0) {
    rates.recruitment_depth = rules.recruitment_call.depth;
    for (let i = 0; i < rules.recruitment_call.depthAmounts.length; i++) {
      rates[`recruitment_n${i + 1}`] = rules.recruitment_call.depthAmounts[i];
    }
  }

  // activation_bonus
  if (rules.activation_bonus.enabled) {
    rates.activation_bonus = rules.activation_bonus.amount;
    rates.activation_after_nth_call = rules.activation_bonus.afterNthCall;
  }

  // provider_recruitment
  if (rules.provider_recruitment.enabled) {
    rates.provider_recruitment_lawyer = rules.provider_recruitment.amounts.lawyer;
    rates.provider_recruitment_expat = rules.provider_recruitment.amounts.expat;
    rates.provider_recruitment_window = rules.provider_recruitment.windowMonths;
  }

  // recruit_bonus
  if (rules.recruit_bonus.enabled) {
    rates.recruit_bonus = rules.recruit_bonus.amount;
  }

  // n1_recruit_bonus
  if (rules.n1_recruit_bonus.enabled) {
    rates.n1_recruit_bonus = rules.n1_recruit_bonus.amount;
  }

  // subscription_commission
  if (rules.subscription_commission.enabled) {
    rates.subscription_type = rules.subscription_commission.type === "percentage" ? 1 : 0;
    if (rules.subscription_commission.type === "fixed") {
      if (rules.subscription_commission.firstMonthAmount !== undefined) {
        rates.subscription_first_month = rules.subscription_commission.firstMonthAmount;
      }
      if (rules.subscription_commission.renewalAmount !== undefined) {
        rates.subscription_renewal = rules.subscription_commission.renewalAmount;
      }
    }
    if (rules.subscription_commission.type === "percentage" && rules.subscription_commission.rate !== undefined) {
      rates.subscription_rate = rules.subscription_commission.rate;
    }
    if (rules.subscription_commission.maxMonths !== undefined) {
      rates.subscription_max_months = rules.subscription_commission.maxMonths;
    }
  }

  // referral_milestones — snapshot the full milestone data
  if (rules.referral_milestones.enabled) {
    rates.milestones_threshold = rules.referral_milestones.qualificationThreshold;
    for (let i = 0; i < rules.referral_milestones.milestones.length; i++) {
      const m = rules.referral_milestones.milestones[i];
      rates[`milestone_${i}_refs`] = m.minQualifiedReferrals;
      rates[`milestone_${i}_amount`] = m.bonusAmount;
    }
    rates.milestones_count = rules.referral_milestones.milestones.length;
  }

  // captain_bonus — snapshot tiers + quality bonus
  if (rules.captain_bonus.enabled) {
    rates.captain_call = rules.captain_bonus.callAmount;
    for (let i = 0; i < rules.captain_bonus.tiers.length; i++) {
      const t = rules.captain_bonus.tiers[i];
      rates[`captain_tier_${i}_calls`] = t.minTeamCalls;
      rates[`captain_tier_${i}_amount`] = t.bonusAmount;
    }
    rates.captain_tiers_count = rules.captain_bonus.tiers.length;
    if (rules.captain_bonus.qualityBonus.enabled) {
      rates.captain_quality_amount = rules.captain_bonus.qualityBonus.amount;
      rates.captain_quality_min_recruits = rules.captain_bonus.qualityBonus.minActiveRecruits;
      rates.captain_quality_min_commissions = rules.captain_bonus.qualityBonus.minTeamCommissions;
    }
  }

  return {
    commissionPlanId: plan.id,
    commissionPlanName: plan.name,
    rateLockDate: new Date().toISOString(),
    lockedRates: rates,
  };
}

// ============================================================================
// ADMIN CRUD — Create, Update, Delete plans
// ============================================================================

/**
 * Create a new commission plan in Firestore.
 */
export async function createPlan(
  planData: Omit<UnifiedCommissionPlan, "createdAt" | "updatedAt"> & { id?: string },
  adminId: string
): Promise<UnifiedCommissionPlan> {
  const db = getFirestore();
  const now = Timestamp.now();

  const docRef = planData.id
    ? db.collection("commission_plans").doc(planData.id)
    : db.collection("commission_plans").doc();

  // Check if plan with this ID already exists
  if (planData.id) {
    const existing = await docRef.get();
    if (existing.exists) {
      throw new Error(`Plan with ID "${planData.id}" already exists. Use updatePlan() instead.`);
    }
  }

  const plan: UnifiedCommissionPlan = {
    ...planData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
    updatedBy: adminId,
  };

  await docRef.set(plan);
  clearUnifiedPlanCache();

  logger.info(`Plan "${plan.name}" (${plan.id}) created by ${adminId}`);
  return plan;
}

/**
 * Update an existing commission plan.
 * Increments version for optimistic concurrency.
 */
export async function updatePlan(
  planId: string,
  updates: Partial<UnifiedCommissionPlan>,
  adminId: string,
  expectedVersion?: number
): Promise<UnifiedCommissionPlan> {
  const db = getFirestore();
  const docRef = db.collection("commission_plans").doc(planId);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      throw new Error(`Plan ${planId} not found`);
    }

    const current = snap.data() as UnifiedCommissionPlan;

    // Optimistic concurrency check
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new Error(
        `Version conflict: expected ${expectedVersion}, found ${current.version}. Plan was modified by another user.`
      );
    }

    const updated: Partial<UnifiedCommissionPlan> = {
      ...updates,
      id: planId, // prevent ID change
      version: current.version + 1,
      updatedAt: Timestamp.now(),
      updatedBy: adminId,
    };

    // Don't overwrite createdAt
    delete (updated as Record<string, unknown>).createdAt;

    tx.update(docRef, updated);
    return { ...current, ...updated } as UnifiedCommissionPlan;
  });

  clearUnifiedPlanCache();
  logger.info(`Plan "${result.name}" (${planId}) updated to v${result.version} by ${adminId}`);
  return result;
}

/**
 * Delete a commission plan.
 * Only allowed if no users reference this plan.
 */
export async function deletePlan(planId: string, adminId: string): Promise<void> {
  const db = getFirestore();

  // Safety check: ensure no users reference this plan
  const usersWithPlan = await db
    .collection("users")
    .where("commissionPlanId", "==", planId)
    .limit(1)
    .get();

  if (!usersWithPlan.empty) {
    throw new Error(
      `Cannot delete plan ${planId}: ${usersWithPlan.size}+ users still reference it. ` +
      `Reassign them first.`
    );
  }

  await db.collection("commission_plans").doc(planId).delete();
  clearUnifiedPlanCache();
  logger.info(`Plan ${planId} deleted by ${adminId}`);
}

/**
 * List all commission plans, optionally filtered.
 */
export async function listPlans(filters?: {
  role?: string;
  isDefault?: boolean;
}): Promise<UnifiedCommissionPlan[]> {
  const plans = await fetchAllPlans();
  let result = Array.from(plans.values());

  if (filters?.role) {
    result = result.filter(
      (p) => p.targetRoles.includes(filters.role!) || p.targetRoles.includes("*")
    );
  }

  if (filters?.isDefault !== undefined) {
    result = result.filter((p) => p.isDefault === filters.isDefault);
  }

  return result;
}

// ============================================================================
// INDIVIDUAL USER OVERRIDES
// ============================================================================

/**
 * Assign a specific plan to a user (individual override).
 */
export async function assignPlanToUser(
  userId: string,
  planId: string,
  adminId: string
): Promise<void> {
  const db = getFirestore();

  // Verify plan exists
  const plan = await getPlanById(planId);
  if (!plan) {
    throw new Error(`Plan ${planId} does not exist`);
  }

  await db.collection("users").doc(userId).update({
    commissionPlanId: planId,
    commissionPlanName: plan.name,
    commissionPlanAssignedBy: adminId,
    commissionPlanAssignedAt: Timestamp.now(),
  });

  logger.info(`Plan "${plan.name}" assigned to user ${userId} by ${adminId}`);
}

/**
 * Remove individual plan assignment (user falls back to role default).
 */
export async function removePlanFromUser(
  userId: string,
  adminId: string
): Promise<void> {
  const db = getFirestore();
  const { FieldValue } = await import("firebase-admin/firestore");

  await db.collection("users").doc(userId).update({
    commissionPlanId: FieldValue.delete(),
    commissionPlanName: FieldValue.delete(),
    commissionPlanAssignedBy: FieldValue.delete(),
    commissionPlanAssignedAt: FieldValue.delete(),
  });

  logger.info(`Individual plan removed from user ${userId} by ${adminId}`);
}

/**
 * Set individual locked rate overrides on a user.
 * These take priority over everything (plan + role default).
 */
export async function setUserLockedRates(
  userId: string,
  rates: Record<string, number>,
  adminId: string
): Promise<void> {
  const db = getFirestore();

  await db.collection("users").doc(userId).update({
    lockedRates: rates,
    lockedRatesUpdatedBy: adminId,
    lockedRatesUpdatedAt: Timestamp.now(),
  });

  logger.info(`Locked rates updated for user ${userId} by ${adminId}: ${JSON.stringify(rates)}`);
}

/**
 * Set individual discount config on a user.
 * Takes priority over the plan's discount.
 */
export async function setUserDiscountConfig(
  userId: string,
  discountConfig: {
    enabled: boolean;
    type: "fixed" | "percentage";
    value: number;
    label?: string;
    labelTranslations?: Record<string, string>;
    maxDiscountCents?: number;
    expiresAfterDays?: number;
  },
  adminId: string
): Promise<void> {
  const db = getFirestore();

  await db.collection("users").doc(userId).update({
    discountConfig,
    discountConfigUpdatedBy: adminId,
    discountConfigUpdatedAt: Timestamp.now(),
  });

  logger.info(`Discount config updated for user ${userId} by ${adminId}`);
}

// ============================================================================
// RESOLVE DISCOUNT FOR CLIENT
// ============================================================================

/**
 * Resolve the discount that applies when a client uses an affiliate link.
 *
 * Priority:
 *   1. discountConfig on the referrer's user doc (individual override)
 *   2. Plan discount from the referrer's resolved plan
 *
 * @param referrerId - The affiliate whose link was used
 * @param referrerRole - The affiliate's role
 * @param originalPrice - The original price in cents
 * @param referrerPlanId - Optional plan ID from referrer's user doc
 * @param referrerDiscountConfig - Optional individual discount config from referrer's user doc
 */
export async function resolveDiscount(
  referrerRole: string,
  originalPrice: number,
  referrerPlanId?: string | null,
  referrerDiscountConfig?: {
    enabled: boolean;
    type: "fixed" | "percentage";
    value: number;
    maxDiscountCents?: number;
    label?: string;
    labelTranslations?: Record<string, string>;
    expiresAfterDays?: number;
  } | null,
  /** Date when the client registered (for expiresAfterDays check) */
  clientRegisteredAt?: Date | null
): Promise<{
  hasDiscount: boolean;
  discountAmount: number;
  finalPrice: number;
  label?: string;
  labelTranslations?: Record<string, string>;
  discountType?: "fixed" | "percentage";
  discountValue?: number;
}> {
  const noDiscount = { hasDiscount: false, discountAmount: 0, finalPrice: originalPrice };

  if (originalPrice <= 0) return noDiscount;

  // 1. Individual discount config on user doc
  if (referrerDiscountConfig?.enabled) {
    if (isDiscountExpired(referrerDiscountConfig.expiresAfterDays, clientRegisteredAt)) {
      return noDiscount;
    }
    return computeDiscount(originalPrice, referrerDiscountConfig);
  }

  // 2. Plan discount
  const plan = await resolvePlanForUser(referrerRole, referrerPlanId);
  if (plan?.discount?.enabled) {
    if (isDiscountExpired(plan.discount.expiresAfterDays, clientRegisteredAt)) {
      return noDiscount;
    }
    return computeDiscount(originalPrice, plan.discount);
  }

  return noDiscount;
}

/**
 * Check if a discount has expired based on expiresAfterDays and client registration date.
 */
export function isDiscountExpired(
  expiresAfterDays?: number,
  clientRegisteredAt?: Date | null
): boolean {
  if (!expiresAfterDays || expiresAfterDays <= 0 || !clientRegisteredAt) return false;
  const expiryDate = new Date(clientRegisteredAt.getTime() + expiresAfterDays * 24 * 60 * 60 * 1000);
  return new Date() > expiryDate;
}

export function computeDiscount(
  originalPrice: number,
  config: {
    type: "fixed" | "percentage";
    value: number;
    maxDiscountCents?: number;
    label?: string;
    labelTranslations?: Record<string, string>;
  }
): {
  hasDiscount: boolean;
  discountAmount: number;
  finalPrice: number;
  label?: string;
  labelTranslations?: Record<string, string>;
  discountType: "fixed" | "percentage";
  discountValue: number;
} {
  let discountAmount: number;

  if (config.type === "fixed") {
    discountAmount = config.value;
  } else {
    discountAmount = Math.round((originalPrice * config.value) / 100);
  }

  // Cap discount
  if (config.maxDiscountCents && discountAmount > config.maxDiscountCents) {
    discountAmount = config.maxDiscountCents;
  }

  // Never exceed original price
  if (discountAmount > originalPrice) {
    discountAmount = originalPrice;
  }

  return {
    hasDiscount: discountAmount > 0,
    discountAmount,
    finalPrice: originalPrice - discountAmount,
    label: config.label,
    labelTranslations: config.labelTranslations,
    discountType: config.type,
    discountValue: config.value,
  };
}
