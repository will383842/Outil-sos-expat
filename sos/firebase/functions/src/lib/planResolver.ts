/**
 * Plan Resolver Service
 *
 * Resolves the active commission plan at a given moment
 * and creates a lockedRates snapshot for affiliate registration.
 *
 * Cache: 5-minute TTL to avoid repeated Firestore reads.
 */

import { getFirestore } from "firebase-admin/firestore";
import {
  CommissionPlan,
  ChatterPlanRates,
  InfluencerPlanRates,
  BloggerPlanRates,
  GroupAdminPlanRates,
  AffiliatePlanRates,
} from "./commissionPlans";

// ============================================================================
// CACHE
// ============================================================================

let cachedPlans: CommissionPlan[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(): boolean {
  return cachedPlans !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

/** Force-clear cache (for tests or admin updates) */
export function clearPlanCache(): void {
  cachedPlans = null;
  cacheTimestamp = 0;
}

// ============================================================================
// FETCH ALL ACTIVE PLANS
// ============================================================================

async function fetchActivePlans(): Promise<CommissionPlan[]> {
  if (isCacheValid()) return cachedPlans!;

  const db = getFirestore();
  const snapshot = await db
    .collection("commission_plans")
    .where("isActive", "==", true)
    .get();

  cachedPlans = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CommissionPlan[];

  cacheTimestamp = Date.now();
  return cachedPlans;
}

// ============================================================================
// RESOLVE ACTIVE PLAN
// ============================================================================

/**
 * Find the active commission plan at a given moment.
 * If multiple plans overlap, the one with highest priority wins.
 * Returns null if no plan is active (fallback to global config).
 */
export async function resolveActivePlan(
  atDate?: Date
): Promise<CommissionPlan | null> {
  const plans = await fetchActivePlans();
  const now = atDate || new Date();

  const activePlans = plans.filter((plan) => {
    const start = plan.startDate.toDate();
    const end = plan.endDate.toDate();
    return start <= now && end >= now && plan.isActive;
  });

  if (activePlans.length === 0) return null;

  // Sort by priority descending, take highest
  activePlans.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return activePlans[0];
}

// ============================================================================
// SNAPSHOT LOCKED RATES FOR REGISTRATION
// ============================================================================

export type AffiliateRole = "chatter" | "influencer" | "blogger" | "groupAdmin" | "affiliate";

/**
 * Resolve the active plan and create a lockedRates snapshot for a new affiliate.
 * Returns null if no plan is active (affiliate will use global config).
 */
export async function snapshotLockedRates(role: AffiliateRole): Promise<{
  commissionPlanId: string;
  commissionPlanName: string;
  rateLockDate: string;
  lockedRates: Record<string, number>;
} | null> {
  const plan = await resolveActivePlan();
  if (!plan) return null;

  let rates: Record<string, number>;

  switch (role) {
    case "chatter":
      rates = planRatesToRecord(plan.chatterRates);
      break;
    case "influencer":
      rates = planRatesToRecord(plan.influencerRates);
      break;
    case "blogger":
      rates = planRatesToRecord(plan.bloggerRates);
      break;
    case "groupAdmin":
      rates = planRatesToRecord(plan.groupAdminRates);
      break;
    case "affiliate":
      rates = plan.affiliateRates ? planRatesToRecord(plan.affiliateRates) : {};
      break;
  }

  return {
    commissionPlanId: plan.id,
    commissionPlanName: plan.name,
    rateLockDate: new Date().toISOString(),
    lockedRates: rates,
  };
}

/**
 * Convert typed plan rates to a flat Record<string, number>.
 * Only includes defined (non-undefined) values.
 */
function planRatesToRecord(
  rates: ChatterPlanRates | InfluencerPlanRates | BloggerPlanRates | GroupAdminPlanRates | AffiliatePlanRates
): Record<string, number> {
  const record: Record<string, number> = {};
  for (const [key, value] of Object.entries(rates)) {
    if (value !== undefined && value !== null && typeof value === "number") {
      record[key] = value;
    }
  }
  return record;
}

// ============================================================================
// HELPER: Get a locked rate with fallback
// ============================================================================

/**
 * Get a commission amount from lockedRates, falling back to the provided default.
 * This is the core function used by all commission services.
 *
 * @param lockedRates - The affiliate's frozen rates (may be undefined)
 * @param key - The rate field name (e.g., "commissionClientCallAmount")
 * @param fallback - The value from global config to use if no locked rate exists
 */
export function getLockedRate(
  lockedRates: Record<string, number> | undefined | null,
  key: string,
  fallback: number,
  individualRates?: Record<string, number> | null
): number {
  // individualRates take absolute priority
  if (individualRates && key in individualRates) {
    return individualRates[key];
  }
  if (lockedRates && key in lockedRates) {
    return lockedRates[key];
  }
  return fallback;
}

/**
 * Get a commission amount with lawyer/expat override logic.
 * Checks locked rates first (with provider-type-specific key, then generic key),
 * then falls back to global config values.
 *
 * @param lockedRates - The affiliate's frozen rates
 * @param genericKey - e.g., "commissionClientCallAmount"
 * @param lawyerKey - e.g., "commissionClientCallAmountLawyer"
 * @param expatKey - e.g., "commissionClientCallAmountExpat"
 * @param providerType - "lawyer" | "expat" | undefined
 * @param configGeneric - fallback generic amount from config
 * @param configLawyer - fallback lawyer amount from config
 * @param configExpat - fallback expat amount from config
 */
export function getLockedRateByProviderType(
  lockedRates: Record<string, number> | undefined | null,
  genericKey: string,
  lawyerKey: string,
  expatKey: string,
  providerType: "lawyer" | "expat" | undefined,
  configGeneric: number,
  configLawyer: number | undefined,
  configExpat: number | undefined,
  individualRates?: Record<string, number> | null
): number {
  // individualRates take absolute priority
  if (individualRates) {
    if (providerType === "lawyer" && lawyerKey in individualRates) return individualRates[lawyerKey];
    if (providerType === "expat" && expatKey in individualRates) return individualRates[expatKey];
    if (genericKey in individualRates) return individualRates[genericKey];
  }

  // lockedRates second priority
  if (lockedRates) {
    if (providerType === "lawyer" && lawyerKey in lockedRates) {
      return lockedRates[lawyerKey];
    }
    if (providerType === "expat" && expatKey in lockedRates) {
      return lockedRates[expatKey];
    }
    if (genericKey in lockedRates) {
      return lockedRates[genericKey];
    }
  }

  // Config fallback
  if (providerType === "lawyer" && configLawyer != null) {
    return configLawyer;
  }
  if (providerType === "expat" && configExpat != null) {
    return configExpat;
  }
  return configGeneric;
}
