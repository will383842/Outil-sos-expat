/**
 * Admin Callables — Unified Commission Plan Management
 *
 * CRUD operations on commission_plans + individual user overrides.
 * All callables require admin authentication.
 *
 * Region: us-central1 (affiliate region, optimal Firestore latency)
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../lib/functionConfigs";
import { UnifiedCommissionPlan } from "../types";
import { validateCommissionPlan } from "../validators";
import {
  createPlan,
  updatePlan,
  deletePlan,
  listPlans,
  getPlanById,
  assignPlanToUser,
  removePlanFromUser,
  setUserLockedRates,
  setUserDiscountConfig,
} from "../planService";

// ============================================================================
// HELPERS
// ============================================================================

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const uid = request.auth.uid;
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") return uid;

  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

// ============================================================================
// LIST PLANS
// ============================================================================

export const adminListCommissionPlans = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { role, isDefault } = (request.data || {}) as {
      role?: string;
      isDefault?: boolean;
    };

    const plans = await listPlans({ role, isDefault });
    return { success: true, plans };
  }
);

// ============================================================================
// GET PLAN BY ID
// ============================================================================

export const adminGetCommissionPlan = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    await assertAdmin(request);

    const { planId } = request.data as { planId: string };
    if (!planId) throw new HttpsError("invalid-argument", "planId is required");

    const plan = await getPlanById(planId);
    if (!plan) throw new HttpsError("not-found", `Plan ${planId} not found`);

    return { success: true, plan };
  }
);

// ============================================================================
// CREATE PLAN
// ============================================================================

export const adminCreateCommissionPlan = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { plan: planData } = request.data as { plan: Record<string, unknown> };
    if (!planData) throw new HttpsError("invalid-argument", "plan object is required");

    // Validate before creating (runtime check since data comes from frontend)
    const typedPlan = planData as Partial<UnifiedCommissionPlan>;
    const validation = validateCommissionPlan(typedPlan);
    if (!validation.valid) {
      throw new HttpsError("invalid-argument", `Validation failed: ${validation.errors.join("; ")}`);
    }

    // After validation passes, we know required fields are present
    const plan = await createPlan(typedPlan as Parameters<typeof createPlan>[0], adminId);
    return { success: true, plan };
  }
);

// ============================================================================
// UPDATE PLAN
// ============================================================================

export const adminUpdateCommissionPlan = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { planId, updates, expectedVersion } = request.data as {
      planId: string;
      updates: Record<string, unknown>;
      expectedVersion?: number;
    };

    if (!planId) throw new HttpsError("invalid-argument", "planId is required");
    if (!updates) throw new HttpsError("invalid-argument", "updates object is required");

    // Validate the merged result
    const current = await getPlanById(planId);
    if (!current) throw new HttpsError("not-found", `Plan ${planId} not found`);

    const merged = { ...current, ...updates };
    const validation = validateCommissionPlan(merged as Partial<UnifiedCommissionPlan>);
    if (!validation.valid) {
      throw new HttpsError("invalid-argument", `Validation failed: ${validation.errors.join("; ")}`);
    }

    try {
      const plan = await updatePlan(planId, updates as Partial<UnifiedCommissionPlan>, adminId, expectedVersion);
      return { success: true, plan };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Version conflict")) {
        throw new HttpsError("aborted", message);
      }
      throw new HttpsError("internal", message);
    }
  }
);

// ============================================================================
// DELETE PLAN
// ============================================================================

export const adminDeleteCommissionPlan = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { planId } = request.data as { planId: string };
    if (!planId) throw new HttpsError("invalid-argument", "planId is required");

    try {
      await deletePlan(planId, adminId);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Cannot delete")) {
        throw new HttpsError("failed-precondition", message);
      }
      throw new HttpsError("internal", message);
    }
  }
);

// ============================================================================
// ASSIGN PLAN TO USER (individual override)
// ============================================================================

export const adminAssignPlanToUser = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { userId, planId } = request.data as { userId: string; planId: string };
    if (!userId) throw new HttpsError("invalid-argument", "userId is required");
    if (!planId) throw new HttpsError("invalid-argument", "planId is required");

    try {
      await assignPlanToUser(userId, planId, adminId);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("does not exist")) {
        throw new HttpsError("not-found", message);
      }
      throw new HttpsError("internal", message);
    }
  }
);

// ============================================================================
// REMOVE PLAN FROM USER (falls back to role default)
// ============================================================================

export const adminRemovePlanFromUser = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { userId } = request.data as { userId: string };
    if (!userId) throw new HttpsError("invalid-argument", "userId is required");

    await removePlanFromUser(userId, adminId);
    return { success: true };
  }
);

// ============================================================================
// SET USER LOCKED RATES (individual commission overrides)
// ============================================================================

export const adminSetUserLockedRates = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { userId, rates } = request.data as {
      userId: string;
      rates: Record<string, number>;
    };

    if (!userId) throw new HttpsError("invalid-argument", "userId is required");
    if (!rates || typeof rates !== "object") {
      throw new HttpsError("invalid-argument", "rates must be an object of { key: number }");
    }

    // Validate all values are numbers >= 0
    for (const [key, value] of Object.entries(rates)) {
      if (typeof value !== "number" || value < 0) {
        throw new HttpsError("invalid-argument", `rates.${key} must be a number >= 0`);
      }
    }

    await setUserLockedRates(userId, rates, adminId);
    return { success: true };
  }
);

// ============================================================================
// SET USER DISCOUNT CONFIG (individual discount override)
// ============================================================================

export const adminSetUserDiscountConfig = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { userId, discountConfig } = request.data as {
      userId: string;
      discountConfig: {
        enabled: boolean;
        type: "fixed" | "percentage";
        value: number;
        label?: string;
        labelTranslations?: Record<string, string>;
        maxDiscountCents?: number;
        expiresAfterDays?: number;
      };
    };

    if (!userId) throw new HttpsError("invalid-argument", "userId is required");
    if (!discountConfig) throw new HttpsError("invalid-argument", "discountConfig is required");

    // Validate
    if (!["fixed", "percentage"].includes(discountConfig.type)) {
      throw new HttpsError("invalid-argument", "discountConfig.type must be 'fixed' or 'percentage'");
    }
    if (discountConfig.value < 0) {
      throw new HttpsError("invalid-argument", "discountConfig.value must be >= 0");
    }
    if (discountConfig.type === "percentage" && discountConfig.value > 100) {
      throw new HttpsError("invalid-argument", "discountConfig.value must be <= 100 for percentage type");
    }

    await setUserDiscountConfig(userId, discountConfig, adminId);
    return { success: true };
  }
);
