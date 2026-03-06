/**
 * Admin Callable: manageCommissionPlans
 *
 * CRUD operations for the commission_plans collection.
 * Used by the admin console to create/update/list/delete commission plans.
 *
 * Plans define commission rates for specific time periods.
 * When an affiliate registers during a plan's active period,
 * rates are permanently locked onto their profile.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { CommissionPlan } from "../lib/commissionPlans";
import { clearPlanCache } from "../lib/planResolver";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

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
  const now = Timestamp.now();
  const snapshot = await db
    .collection("commission_plans")
    .where("isActive", "==", true)
    .get();

  const activePlans = snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      return data.startDate <= now && data.endDate >= now;
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
  if (!data?.name || !data?.startDate || !data?.endDate) {
    throw new HttpsError(
      "invalid-argument",
      "name, startDate, endDate are required"
    );
  }

  const now = Timestamp.now();
  const planRef = db.collection("commission_plans").doc();

  const plan: Omit<CommissionPlan, "id"> = {
    name: data.name,
    description: data.description || "",
    startDate: Timestamp.fromDate(new Date(data.startDate)),
    endDate: Timestamp.fromDate(new Date(data.endDate)),
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
  if (data.endDate !== undefined) updates.endDate = Timestamp.fromDate(new Date(data.endDate));
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.chatterRates !== undefined) updates.chatterRates = data.chatterRates;
  if (data.influencerRates !== undefined) updates.influencerRates = data.influencerRates;
  if (data.bloggerRates !== undefined) updates.bloggerRates = data.bloggerRates;
  if (data.groupAdminRates !== undefined) updates.groupAdminRates = data.groupAdminRates;
  if (data.affiliateRates !== undefined) updates.affiliateRates = data.affiliateRates;

  await planRef.update(updates);
  clearPlanCache();

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

  logger.info("[manageCommissionPlans] Plan deleted", { planId });

  return { success: true };
}
