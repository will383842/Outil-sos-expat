/**
 * Admin Callable: manageCommissionPlans
 *
 * CRUD operations for the commission_plans collection.
 * Used by the admin console to create/update/list/delete commission plans.
 *
 * Plans define commission rates for specific time periods.
 * When an affiliate registers during a plan's active period,
 * rates are permanently locked onto their profile.
 *
 * @deprecated 2026-04-19 — prefer the unified callables `adminCreateCommissionPlan` /
 *   `adminUpdateCommissionPlan` / `adminListCommissionPlans` / `adminDeleteCommissionPlan`
 *   from `unified/callables/adminPlans.ts`. Both routes write to the same
 *   `commission_plans` collection, but the unified ones include the full V2 plan
 *   schema (bonuses, discount, withdrawal rules) with zod validation.
 *   Kept here for backwards compatibility with `AdminCommissionPlans.tsx` and
 *   `Commissions/tabs/PlansTab.tsx` — migrate those UIs then remove this file.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { CommissionPlan } from "../lib/commissionPlans";
import { clearPlanCache } from "../lib/planResolver";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

// ============================================================================
// PROPAGATE PLAN RATES TO {role}_config/current DOCS
// Landing pages read from these docs via usePublicCommissionRates hook
// ============================================================================

async function propagatePlanToConfigs(
  db: FirebaseFirestore.Firestore,
  plan: Omit<CommissionPlan, "id"> | null
): Promise<void> {
  const batch = db.batch();

  if (plan) {
    // Active plan: propagate plan rates to config docs
    const chatterRef = db.doc("chatter_config/current");
    batch.set(chatterRef, {
      ...plan.chatterRates,
      _activePlanName: plan.name,
      _propagatedAt: Timestamp.now(),
    }, { merge: true });

    const influencerRef = db.doc("influencer_config/current");
    batch.set(influencerRef, {
      // Map influencer field names to config field names
      commissionClientAmount: plan.influencerRates.commissionClientAmount,
      commissionClientAmountLawyer: plan.influencerRates.commissionClientAmountLawyer ?? null,
      commissionClientAmountExpat: plan.influencerRates.commissionClientAmountExpat ?? null,
      commissionRecruitmentAmount: plan.influencerRates.commissionRecruitmentAmount,
      commissionRecruitmentAmountLawyer: plan.influencerRates.commissionRecruitmentAmountLawyer ?? null,
      commissionRecruitmentAmountExpat: plan.influencerRates.commissionRecruitmentAmountExpat ?? null,
      _activePlanName: plan.name,
      _propagatedAt: Timestamp.now(),
    }, { merge: true });

    const bloggerRef = db.doc("blogger_config/current");
    batch.set(bloggerRef, {
      commissionClientAmount: plan.bloggerRates.commissionClientAmount,
      commissionClientAmountLawyer: plan.bloggerRates.commissionClientAmountLawyer ?? null,
      commissionClientAmountExpat: plan.bloggerRates.commissionClientAmountExpat ?? null,
      commissionRecruitmentAmount: plan.bloggerRates.commissionRecruitmentAmount,
      commissionRecruitmentAmountLawyer: plan.bloggerRates.commissionRecruitmentAmountLawyer ?? null,
      commissionRecruitmentAmountExpat: plan.bloggerRates.commissionRecruitmentAmountExpat ?? null,
      _activePlanName: plan.name,
      _propagatedAt: Timestamp.now(),
    }, { merge: true });

    const groupAdminRef = db.doc("group_admin_config/current");
    batch.set(groupAdminRef, {
      commissionClientCallAmount: plan.groupAdminRates.commissionClientCallAmount ?? null,
      commissionClientAmountLawyer: plan.groupAdminRates.commissionClientAmountLawyer ?? null,
      commissionClientAmountExpat: plan.groupAdminRates.commissionClientAmountExpat ?? null,
      commissionN1CallAmount: plan.groupAdminRates.commissionN1CallAmount,
      commissionN2CallAmount: plan.groupAdminRates.commissionN2CallAmount,
      commissionActivationBonusAmount: plan.groupAdminRates.commissionActivationBonusAmount,
      commissionN1RecruitBonusAmount: plan.groupAdminRates.commissionN1RecruitBonusAmount,
      _activePlanName: plan.name,
      _propagatedAt: Timestamp.now(),
    }, { merge: true });

    logger.info("[manageCommissionPlans] Plan rates propagated to config docs", {
      planName: plan.name,
    });
  } else {
    // No active plan: revert to default rates
    // Delete all plan-propagated commission fields + metadata so config services
    // fall back to their DEFAULT_*_CONFIG values
    const { FieldValue } = await import("firebase-admin/firestore");
    const del = FieldValue.delete();

    // Chatter: remove all propagated fields
    const chatterRef = db.doc("chatter_config/current");
    batch.set(chatterRef, {
      commissionClientCallAmount: del,
      commissionClientCallAmountLawyer: del,
      commissionClientCallAmountExpat: del,
      commissionN1CallAmount: del,
      commissionN2CallAmount: del,
      commissionActivationBonusAmount: del,
      commissionN1RecruitBonusAmount: del,
      commissionProviderCallAmount: del,
      commissionProviderCallAmountLawyer: del,
      commissionProviderCallAmountExpat: del,
      commissionCaptainCallAmountLawyer: del,
      commissionCaptainCallAmountExpat: del,
      _activePlanName: del,
      _propagatedAt: del,
    }, { merge: true });

    // Influencer: remove all propagated fields
    const influencerRef = db.doc("influencer_config/current");
    batch.set(influencerRef, {
      commissionClientAmount: del,
      commissionClientAmountLawyer: del,
      commissionClientAmountExpat: del,
      commissionRecruitmentAmount: del,
      commissionRecruitmentAmountLawyer: del,
      commissionRecruitmentAmountExpat: del,
      _activePlanName: del,
      _propagatedAt: del,
    }, { merge: true });

    // Blogger: remove all propagated fields
    const bloggerRef = db.doc("blogger_config/current");
    batch.set(bloggerRef, {
      commissionClientAmount: del,
      commissionClientAmountLawyer: del,
      commissionClientAmountExpat: del,
      commissionRecruitmentAmount: del,
      commissionRecruitmentAmountLawyer: del,
      commissionRecruitmentAmountExpat: del,
      _activePlanName: del,
      _propagatedAt: del,
    }, { merge: true });

    // GroupAdmin: remove all propagated fields
    const groupAdminRef = db.doc("group_admin_config/current");
    batch.set(groupAdminRef, {
      commissionClientCallAmount: del,
      commissionClientAmountLawyer: del,
      commissionClientAmountExpat: del,
      commissionN1CallAmount: del,
      commissionN2CallAmount: del,
      commissionActivationBonusAmount: del,
      commissionN1RecruitBonusAmount: del,
      _activePlanName: del,
      _propagatedAt: del,
    }, { merge: true });

    logger.info("[manageCommissionPlans] Plan rates reverted to defaults on config docs");
  }

  await batch.commit();
}

/**
 * Check if a plan is currently active (within date range and enabled)
 */
function isPlanCurrentlyActive(plan: { isActive: boolean; startDate: Timestamp; endDate: Timestamp }): boolean {
  if (!plan.isActive) return false;
  const now = new Date();
  return plan.startDate.toDate() <= now && plan.endDate.toDate() >= now;
}

// ============================================================================
// CALLABLE: manageCommissionPlans
// ============================================================================

export const manageCommissionPlans = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Auth check: admin only
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || (userData.role !== "admin" && userData.role !== "dev")) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { action, data } = request.data as { action: string; data?: any };

    logger.warn("[manageCommissionPlans] DEPRECATED callable used", {
      action,
      caller: request.auth.uid,
      hint: "Migrate to adminCreateCommissionPlan/adminUpdateCommissionPlan (unified/callables/adminPlans.ts)",
    });

    switch (action) {
      case "list":
        return listPlans(db);
      case "get":
        return getPlan(db, data?.planId);
      case "create":
        return createPlan(db, data, request.auth.uid);
      case "update":
        return updatePlan(db, data, request.auth.uid);
      case "delete":
        return deletePlan(db, data?.planId);
      case "getActivePlan":
        return getActivePlan(db);
      default:
        throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
    }
  }
);

// ============================================================================
// LIST ALL PLANS
// ============================================================================

async function listPlans(db: FirebaseFirestore.Firestore) {
  const snapshot = await db
    .collection("commission_plans")
    .orderBy("startDate", "desc")
    .get();

  const plans = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate?.toDate?.()?.toISOString() || null,
    endDate: doc.data().endDate?.toDate?.()?.toISOString() || null,
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
  }));

  return { success: true, plans };
}

// ============================================================================
// GET SINGLE PLAN
// ============================================================================

async function getPlan(db: FirebaseFirestore.Firestore, planId: string) {
  if (!planId) throw new HttpsError("invalid-argument", "planId required");

  const doc = await db.collection("commission_plans").doc(planId).get();
  if (!doc.exists) {
    throw new HttpsError("not-found", "Plan not found");
  }

  const data = doc.data()!;
  return {
    success: true,
    plan: {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate?.()?.toISOString() || null,
      endDate: data.endDate?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    },
  };
}

// ============================================================================
// GET ACTIVE PLAN (currently effective for new registrations)
// ============================================================================

async function getActivePlan(db: FirebaseFirestore.Firestore) {
  const nowMs = Date.now();
  const snapshot = await db
    .collection("commission_plans")
    .where("isActive", "==", true)
    .get();

  const activePlans = snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      // Fix 2026-04-19: compare milliseconds (previous Timestamp<=Timestamp was object comparison)
      const startMs = (data.startDate as Timestamp | undefined)?.toMillis?.() ?? 0;
      const endMs = (data.endDate as Timestamp | undefined)?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
      return startMs <= nowMs && endMs >= nowMs;
    })
    .sort((a, b) => (b.data().priority || 0) - (a.data().priority || 0));

  if (activePlans.length === 0) {
    return { success: true, plan: null };
  }

  const doc = activePlans[0];
  const data = doc.data();
  return {
    success: true,
    plan: {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate?.()?.toISOString() || null,
      endDate: data.endDate?.toDate?.()?.toISOString() || null,
    },
  };
}

// ============================================================================
// CREATE PLAN
// ============================================================================

async function createPlan(
  db: FirebaseFirestore.Firestore,
  data: any,
  adminId: string
) {
  if (!data?.name || !data?.startDate) {
    throw new HttpsError(
      "invalid-argument",
      "name and startDate are required"
    );
  }

  const now = Timestamp.now();
  const planRef = db.collection("commission_plans").doc();

  // Empty endDate means "unlimited" — store 9999-12-31 so comparisons still work
  const endDateValue = data.endDate
    ? Timestamp.fromDate(new Date(data.endDate))
    : Timestamp.fromDate(new Date("9999-12-31T23:59:59Z"));

  const plan: Omit<CommissionPlan, "id"> = {
    name: data.name,
    description: data.description || "",
    startDate: Timestamp.fromDate(new Date(data.startDate)),
    endDate: endDateValue,
    isActive: data.isActive ?? true,
    priority: data.priority ?? 0,
    chatterRates: data.chatterRates || {
      commissionClientCallAmount: 1000,
      commissionN1CallAmount: 100,
      commissionN2CallAmount: 50,
      commissionActivationBonusAmount: 500,
      commissionN1RecruitBonusAmount: 100,
      commissionProviderCallAmount: 500,
    },
    influencerRates: data.influencerRates || {
      commissionClientAmount: 1000,
      commissionRecruitmentAmount: 500,
    },
    bloggerRates: data.bloggerRates || {
      commissionClientAmount: 1000,
      commissionRecruitmentAmount: 500,
    },
    groupAdminRates: data.groupAdminRates || {
      commissionClientCallAmount: 1000,
      commissionN1CallAmount: 100,
      commissionN2CallAmount: 50,
      commissionActivationBonusAmount: 500,
      commissionN1RecruitBonusAmount: 100,
    },
    affiliateRates: data.affiliateRates || {
      signupBonus: 100,
      callCommissionRate: 0,
      callFixedBonus: 1000,
      subscriptionRate: 0,
      subscriptionFixedBonus: 500,
      providerValidationBonus: 500,
    },
    createdAt: now,
    createdBy: adminId,
    updatedAt: now,
    updatedBy: adminId,
  };

  await planRef.set(plan);
  clearPlanCache();

  // Propagate to config docs if plan is currently active
  if (isPlanCurrentlyActive(plan)) {
    await propagatePlanToConfigs(db, plan);
  }

  logger.info("[manageCommissionPlans] Plan created", {
    planId: planRef.id,
    name: data.name,
    adminId,
  });

  return { success: true, planId: planRef.id };
}

// ============================================================================
// UPDATE PLAN
// ============================================================================

async function updatePlan(
  db: FirebaseFirestore.Firestore,
  data: any,
  adminId: string
) {
  if (!data?.planId) {
    throw new HttpsError("invalid-argument", "planId required");
  }

  const planRef = db.collection("commission_plans").doc(data.planId);
  const existing = await planRef.get();

  if (!existing.exists) {
    throw new HttpsError("not-found", "Plan not found");
  }

  const updates: any = {
    updatedAt: Timestamp.now(),
    updatedBy: adminId,
  };

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.startDate !== undefined) updates.startDate = Timestamp.fromDate(new Date(data.startDate));
  if (data.endDate !== undefined) {
    updates.endDate = data.endDate
      ? Timestamp.fromDate(new Date(data.endDate))
      : Timestamp.fromDate(new Date("9999-12-31T23:59:59Z"));
  }
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.chatterRates !== undefined) updates.chatterRates = data.chatterRates;
  if (data.influencerRates !== undefined) updates.influencerRates = data.influencerRates;
  if (data.bloggerRates !== undefined) updates.bloggerRates = data.bloggerRates;
  if (data.groupAdminRates !== undefined) updates.groupAdminRates = data.groupAdminRates;
  if (data.affiliateRates !== undefined) updates.affiliateRates = data.affiliateRates;

  await planRef.update(updates);
  clearPlanCache();

  // Re-check if plan is currently active after update and propagate
  const updatedDoc = await planRef.get();
  const updatedPlan = updatedDoc.data() as CommissionPlan;
  if (isPlanCurrentlyActive(updatedPlan)) {
    await propagatePlanToConfigs(db, updatedPlan);
  } else {
    // Plan was deactivated or date range changed — check if ANY other plan is active
    const activePlanResult = await getActivePlan(db);
    if (!activePlanResult.plan) {
      await propagatePlanToConfigs(db, null); // Revert to defaults
    }
  }

  logger.info("[manageCommissionPlans] Plan updated", {
    planId: data.planId,
    adminId,
  });

  return { success: true };
}

// ============================================================================
// DELETE PLAN
// ============================================================================

async function deletePlan(db: FirebaseFirestore.Firestore, planId: string) {
  if (!planId) throw new HttpsError("invalid-argument", "planId required");

  const planRef = db.collection("commission_plans").doc(planId);
  const existing = await planRef.get();

  if (!existing.exists) {
    throw new HttpsError("not-found", "Plan not found");
  }

  await planRef.delete();
  clearPlanCache();

  // Check if any other plan is active, revert if not
  const activePlanResult = await getActivePlan(db);
  if (!activePlanResult.plan) {
    await propagatePlanToConfigs(db, null);
  }

  logger.info("[manageCommissionPlans] Plan deleted", { planId });

  return { success: true };
}
