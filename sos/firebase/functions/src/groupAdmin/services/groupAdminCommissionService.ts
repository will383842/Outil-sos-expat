/**
 * GroupAdmin Commission Service
 *
 * Handles commission creation, validation, and release for GroupAdmins.
 */

import { getFirestore, Timestamp, FieldValue, Firestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";

import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminCommissionType,
  GroupAdminCommissionStatus,
  GroupAdminRecruit,
} from "../types";
import {
  getGroupAdminConfig,
  getClientCommissionAmount,
  getRecruitmentCommissionAmount,
  getRecruitmentCommissionThreshold,
} from "../groupAdminConfig";

// Lazy Firestore initialization
let _db: Firestore | null = null;
function getDb(): Firestore {
  if (!getApps().length) {
    initializeApp();
  }
  if (!_db) {
    _db = getFirestore();
  }
  return _db;
}

/**
 * Create a client referral commission.
 * Amount is a fixed USD value from config (default $10 = 1000 cents),
 * independent of the call's billing currency (EUR, USD, etc.).
 */
export async function createClientReferralCommission(
  groupAdminId: string,
  clientId: string,
  callId: string,
  description: string = "Client referral commission"
): Promise<GroupAdminCommission | null> {
  try {
    // Get GroupAdmin
    const groupAdminDoc = await getDb().collection("group_admins").doc(groupAdminId).get();
    if (!groupAdminDoc.exists) {
      logger.error("[GroupAdminCommission] GroupAdmin not found", { groupAdminId });
      return null;
    }

    const groupAdmin = groupAdminDoc.data() as GroupAdmin;
    if (groupAdmin.status !== "active") {
      logger.warn("[GroupAdminCommission] GroupAdmin not active", { groupAdminId, status: groupAdmin.status });
      return null;
    }

    // Duplicate check for client_referral (same groupAdminId + callId)
    const duplicateCheck = await getDb()
      .collection("group_admin_commissions")
      .where("groupAdminId", "==", groupAdminId)
      .where("type", "==", "client_referral")
      .where("sourceCallId", "==", callId)
      .limit(1)
      .get();

    if (!duplicateCheck.empty) {
      logger.warn("[GroupAdminCommission] Client referral commission already exists", {
        groupAdminId,
        clientId,
        callId,
        existingCommissionId: duplicateCheck.docs[0].id,
      });
      return null;
    }

    // Get commission amount
    let amount = await getClientCommissionAmount();

    // Check for active promotions
    let promoId: string | undefined;
    let promoMultiplier: number | undefined;

    try {
      const { getBestPromoMultiplier } = await import("./groupAdminPromotionService");
      const promoResult = await getBestPromoMultiplier(
        groupAdminId,
        groupAdmin.country || "",
        "client_referral"
      );
      if (promoResult.multiplier > 1.0) {
        const beforePromo = amount;
        amount = Math.round(amount * promoResult.multiplier);
        promoId = promoResult.promoId || undefined;
        promoMultiplier = promoResult.multiplier;

        // Track budget spend asynchronously
        const bonusFromPromo = amount - beforePromo;
        if (promoResult.promoId) {
          import("./groupAdminPromotionService").then(({ trackBudgetSpend }) => {
            trackBudgetSpend(promoResult.promoId!, bonusFromPromo).catch(() => {});
          }).catch(() => {});
        }
      }
    } catch {
      // Promotion service unavailable — proceed without promo
    }

    // P0 FIX: Atomic transaction — commission creation + balance update
    const commissionRef = getDb().collection("group_admin_commissions").doc();
    const now = Timestamp.now();
    const currentMonth = new Date().toISOString().substring(0, 7);

    const commission: GroupAdminCommission = {
      id: commissionRef.id,
      groupAdminId,
      type: "client_referral",
      status: "pending",
      amount,
      originalAmount: amount,
      currency: "USD",
      description,
      createdAt: now,
      sourceClientId: clientId,
      sourceCallId: callId,
      ...(promoId ? { promotionId: promoId, promoMultiplier } : {}),
    };

    await getDb().runTransaction(async (tx) => {
      // Re-read GroupAdmin inside transaction to avoid stale data
      const freshGroupAdminDoc = await tx.get(groupAdminDoc.ref);
      if (!freshGroupAdminDoc.exists) {
        throw new Error("GroupAdmin document disappeared during transaction");
      }
      const freshGroupAdmin = freshGroupAdminDoc.data() as GroupAdmin;

      tx.set(commissionRef, commission);
      tx.update(groupAdminDoc.ref, {
        totalClients: FieldValue.increment(1),
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.clients": freshGroupAdmin.currentMonthStats.month === currentMonth
          ? FieldValue.increment(1)
          : 1,
        "currentMonthStats.earnings": freshGroupAdmin.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: Timestamp.now(),
      });
    });

    logger.info("[GroupAdminCommission] Client referral commission created (atomic)", {
      groupAdminId,
      commissionId: commission.id,
      amount,
      clientId,
      callId,
    });

    // Check if this GroupAdmin was recruited and if the threshold is now met
    await checkAndPayRecruitmentCommission(groupAdminId);

    return commission;
  } catch (error) {
    logger.error("[GroupAdminCommission] Error creating client referral commission", {
      groupAdminId,
      error,
    });
    return null;
  }
}

/**
 * Create a recruitment commission.
 *
 * @deprecated No longer called internally. Recruitment commissions are now
 * created atomically inside `checkAndPayRecruitmentCommission()` using a
 * Firestore transaction. Kept for API compatibility only.
 */
export async function createRecruitmentCommission(
  recruiterId: string,
  recruitedId: string,
  recruitedName: string
): Promise<GroupAdminCommission | null> {
  try {
    // Check if commission already exists for this recruitment
    const existingCommission = await getDb()
      .collection("group_admin_commissions")
      .where("groupAdminId", "==", recruiterId)
      .where("type", "==", "recruitment")
      .where("sourceRecruitId", "==", recruitedId)
      .limit(1)
      .get();

    if (!existingCommission.empty) {
      logger.warn("[GroupAdminCommission] Recruitment commission already exists", {
        recruiterId,
        recruitedId,
      });
      return null;
    }

    // Get GroupAdmin
    const recruiterDoc = await getDb().collection("group_admins").doc(recruiterId).get();
    if (!recruiterDoc.exists) {
      logger.error("[GroupAdminCommission] Recruiter not found", { recruiterId });
      return null;
    }

    const recruiter = recruiterDoc.data() as GroupAdmin;
    if (recruiter.status !== "active") {
      logger.warn("[GroupAdminCommission] Recruiter not active", { recruiterId, status: recruiter.status });
      return null;
    }

    // Check recruitment window
    const recruitDoc = await getDb()
      .collection("group_admin_recruited_admins")
      .where("recruiterId", "==", recruiterId)
      .where("recruitedId", "==", recruitedId)
      .limit(1)
      .get();

    if (recruitDoc.empty) {
      logger.warn("[GroupAdminCommission] Recruitment record not found", { recruiterId, recruitedId });
      return null;
    }

    const recruit = recruitDoc.docs[0].data() as GroupAdminRecruit;

    // Check if within commission window
    if (recruit.commissionWindowEnd.toDate() < new Date()) {
      logger.warn("[GroupAdminCommission] Recruitment commission window expired", {
        recruiterId,
        recruitedId,
        windowEnd: recruit.commissionWindowEnd.toDate(),
      });
      return null;
    }

    // Get commission amount
    const amount = await getRecruitmentCommissionAmount();

    // Create commission
    const commission = await createCommission(
      recruiterId,
      "recruitment",
      amount,
      `Recruitment commission for ${recruitedName}`,
      {
        sourceRecruitId: recruitedId,
      }
    );

    if (commission) {
      // Update recruiter stats
      const currentMonth = new Date().toISOString().substring(0, 7);

      await recruiterDoc.ref.update({
        totalRecruits: FieldValue.increment(1),
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.recruits": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(1)
          : 1,
        "currentMonthStats.earnings": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: Timestamp.now(),
      });

      // Update recruitment record
      await recruitDoc.docs[0].ref.update({
        commissionPaid: true,
        commissionId: commission.id,
        commissionPaidAt: Timestamp.now(),
      });

      logger.info("[GroupAdminCommission] Recruitment commission created", {
        recruiterId,
        commissionId: commission.id,
        amount,
        recruitedId,
      });
    }

    return commission;
  } catch (error) {
    logger.error("[GroupAdminCommission] Error creating recruitment commission", {
      recruiterId,
      recruitedId,
      error,
    });
    return null;
  }
}

/**
 * Check if a recruited GroupAdmin has reached the threshold for the recruiter to get paid.
 * Called after each client referral commission is created.
 *
 * Uses a Firestore transaction on the recruit record to prevent race conditions:
 * two concurrent calls completing at the same time could both see commissionPaid=false
 * and each create a recruitment commission. The transaction ensures only one wins.
 *
 * All amounts are in USD cents (fixed amounts, independent of call currency).
 */
async function checkAndPayRecruitmentCommission(groupAdminId: string): Promise<void> {
  try {
    // ---- Preliminary reads (outside transaction) ----
    const groupAdminDoc = await getDb().collection("group_admins").doc(groupAdminId).get();
    if (!groupAdminDoc.exists) return;

    const groupAdmin = groupAdminDoc.data() as GroupAdmin;
    if (!groupAdmin.recruitedBy) return;

    // Find the recruitment record
    const recruitQuery = await getDb()
      .collection("group_admin_recruited_admins")
      .where("recruiterId", "==", groupAdmin.recruitedBy)
      .where("recruitedId", "==", groupAdminId)
      .limit(1)
      .get();

    if (recruitQuery.empty) return;

    const recruitDoc = recruitQuery.docs[0];
    const recruit = recruitDoc.data() as GroupAdminRecruit;

    // Already paid — skip
    if (recruit.commissionPaid) return;

    // Check commission window
    if (recruit.commissionWindowEnd.toDate() < new Date()) {
      logger.info("[GroupAdminCommission] Recruitment window expired, skipping", {
        recruitedId: groupAdminId,
        recruiterId: groupAdmin.recruitedBy,
      });
      return;
    }

    // Sum all non-cancelled client_referral commissions for this recruited admin (USD cents)
    const commissionsSnapshot = await getDb()
      .collection("group_admin_commissions")
      .where("groupAdminId", "==", groupAdminId)
      .where("type", "==", "client_referral")
      .get();

    let totalEarnedFromCommissions = 0;
    for (const doc of commissionsSnapshot.docs) {
      const c = doc.data() as GroupAdminCommission;
      if (c.status !== "cancelled") {
        totalEarnedFromCommissions += c.amount;
      }
    }

    const threshold = await getRecruitmentCommissionThreshold();

    if (totalEarnedFromCommissions < threshold) return;

    logger.info("[GroupAdminCommission] Recruitment threshold reached, paying recruiter", {
      recruitedId: groupAdminId,
      recruiterId: groupAdmin.recruitedBy,
      totalEarned: totalEarnedFromCommissions,
      threshold,
    });

    // ---- Atomic transaction: mark recruit as paid + create commission ----
    const recruitRef = recruitDoc.ref;
    const recruiterRef = getDb().collection("group_admins").doc(groupAdmin.recruitedBy);
    const amount = await getRecruitmentCommissionAmount();

    await getDb().runTransaction(async (tx) => {
      // Re-read inside transaction to guard against concurrent writes
      const freshRecruit = await tx.get(recruitRef);
      if (!freshRecruit.exists || freshRecruit.data()?.commissionPaid === true) {
        // Another process already paid — abort silently
        return;
      }

      // Verify recruiter is still active
      const recruiterSnap = await tx.get(recruiterRef);
      if (!recruiterSnap.exists || (recruiterSnap.data() as GroupAdmin).status !== "active") {
        return;
      }

      // Create commission document
      const commissionRef = getDb().collection("group_admin_commissions").doc();
      const now = Timestamp.now();
      const currentMonth = new Date().toISOString().substring(0, 7);
      const recruiter = recruiterSnap.data() as GroupAdmin;

      const commission: GroupAdminCommission = {
        id: commissionRef.id,
        groupAdminId: groupAdmin.recruitedBy!,
        type: "recruitment",
        status: "pending",
        amount,
        originalAmount: amount,
        currency: "USD", // Always USD — fixed amount, not a % of call price
        description: `Recruitment commission for ${groupAdmin.firstName} ${groupAdmin.lastName}`,
        createdAt: now,
        sourceRecruitId: groupAdminId,
      };

      tx.set(commissionRef, commission);

      // Mark recruitment record as paid
      tx.update(recruitRef, {
        commissionPaid: true,
        commissionId: commissionRef.id,
        commissionPaidAt: now,
      });

      // Update recruiter stats
      tx.update(recruiterRef, {
        totalRecruits: FieldValue.increment(1),
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.recruits": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(1)
          : 1,
        "currentMonthStats.earnings": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: now,
      });

      logger.info("[GroupAdminCommission] Recruitment commission created (transaction)", {
        recruiterId: groupAdmin.recruitedBy,
        commissionId: commissionRef.id,
        amount,
        recruitedId: groupAdminId,
      });
    });
  } catch (error) {
    logger.error("[GroupAdminCommission] Error checking recruitment threshold", {
      groupAdminId,
      error,
    });
  }
}

/**
 * Create a manual adjustment commission
 */
export async function createManualAdjustment(
  groupAdminId: string,
  amount: number,
  description: string,
  adminId: string,
  notes?: string
): Promise<GroupAdminCommission | null> {
  try {
    // P0 FIX: Atomic transaction — commission creation + balance update
    const commissionRef = getDb().collection("group_admin_commissions").doc();
    const now = Timestamp.now();
    const groupAdminRef = getDb().collection("group_admins").doc(groupAdminId);

    const commission: GroupAdminCommission = {
      id: commissionRef.id,
      groupAdminId,
      type: "manual_adjustment",
      status: "available",
      amount,
      originalAmount: amount,
      currency: "USD",
      description,
      createdAt: now,
      availableAt: now,
      adjustedBy: adminId,
      adjustmentNotes: notes,
    };

    await getDb().runTransaction(async (tx) => {
      const groupAdminDoc = await tx.get(groupAdminRef);
      if (!groupAdminDoc.exists) {
        throw new Error("GroupAdmin not found");
      }

      tx.set(commissionRef, commission);
      tx.update(groupAdminRef, {
        totalCommissions: FieldValue.increment(1),
        totalEarned: FieldValue.increment(amount),
        availableBalance: FieldValue.increment(amount),
        updatedAt: Timestamp.now(),
      });
    });

    logger.info("[GroupAdminCommission] Manual adjustment created (atomic)", {
      groupAdminId,
      commissionId: commission.id,
      amount,
      adminId,
    });

    return commission;
  } catch (error) {
    logger.error("[GroupAdminCommission] Error creating manual adjustment", {
      groupAdminId,
      error,
    });
    return null;
  }
}

/**
 * Validate pending commissions
 */
export async function validatePendingCommissions(): Promise<number> {
  const config = await getGroupAdminConfig();
  const holdPeriodMs = config.validationHoldPeriodDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - holdPeriodMs);

  try {
    const pendingCommissions = await getDb()
      .collection("group_admin_commissions")
      .where("status", "==", "pending")
      .where("createdAt", "<=", Timestamp.fromDate(cutoffDate))
      .limit(500)
      .get();

    let validatedCount = 0;

    const batch = getDb().batch();

    for (const doc of pendingCommissions.docs) {
      const commission = doc.data() as GroupAdminCommission;

      // Update commission status
      batch.update(doc.ref, {
        status: "validated" as GroupAdminCommissionStatus,
        validatedAt: Timestamp.now(),
      });

      // Update GroupAdmin balances
      const groupAdminRef = getDb().collection("group_admins").doc(commission.groupAdminId);
      batch.update(groupAdminRef, {
        pendingBalance: FieldValue.increment(-commission.amount),
        validatedBalance: FieldValue.increment(commission.amount),
        updatedAt: Timestamp.now(),
      });

      validatedCount++;
    }

    if (validatedCount > 0) {
      await batch.commit();
    }

    logger.info("[GroupAdminCommission] Validated pending commissions", { validatedCount });
    return validatedCount;
  } catch (error) {
    logger.error("[GroupAdminCommission] Error validating pending commissions", { error });
    return 0;
  }
}

/**
 * Release validated commissions to available balance
 */
export async function releaseValidatedCommissions(): Promise<number> {
  const config = await getGroupAdminConfig();
  const releaseDelayMs = config.releaseDelayHours * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - releaseDelayMs);

  try {
    const validatedCommissions = await getDb()
      .collection("group_admin_commissions")
      .where("status", "==", "validated")
      .where("validatedAt", "<=", Timestamp.fromDate(cutoffDate))
      .limit(500)
      .get();

    let releasedCount = 0;

    const batch = getDb().batch();

    for (const doc of validatedCommissions.docs) {
      const commission = doc.data() as GroupAdminCommission;

      // Update commission status
      batch.update(doc.ref, {
        status: "available" as GroupAdminCommissionStatus,
        availableAt: Timestamp.now(),
      });

      // Update GroupAdmin balances
      const groupAdminRef = getDb().collection("group_admins").doc(commission.groupAdminId);
      batch.update(groupAdminRef, {
        validatedBalance: FieldValue.increment(-commission.amount),
        availableBalance: FieldValue.increment(commission.amount),
        totalEarned: FieldValue.increment(commission.amount),
        updatedAt: Timestamp.now(),
      });

      releasedCount++;
    }

    if (releasedCount > 0) {
      await batch.commit();
    }

    logger.info("[GroupAdminCommission] Released validated commissions", { releasedCount });
    return releasedCount;
  } catch (error) {
    logger.error("[GroupAdminCommission] Error releasing validated commissions", { error });
    return 0;
  }
}

/**
 * P0 FIX 2026-02-12: Cancel all group admin commissions related to a call session
 */
export async function cancelCommissionsForCallSession(
  callSessionId: string,
  reason: string
): Promise<{ success: boolean; cancelledCount: number; errors: string[] }> {
  const db = getDb();
  const errors: string[] = [];
  let cancelledCount = 0;

  try {
    const commissionsQuery = await db
      .collection("group_admin_commissions")
      .where("sourceId", "==", callSessionId)
      .get();

    const commissionsQuery2 = await db
      .collection("group_admin_commissions")
      .where("sourceDetails.callSessionId", "==", callSessionId)
      .get();

    const allCommissions = [...commissionsQuery.docs, ...commissionsQuery2.docs];
    const uniqueCommissions = new Map();
    for (const doc of allCommissions) {
      uniqueCommissions.set(doc.id, doc);
    }

    logger.info("[groupAdmin.cancelCommissionsForCallSession] Found commissions", {
      callSessionId,
      count: uniqueCommissions.size,
    });

    for (const [commissionId] of uniqueCommissions.entries()) {
      const result = await cancelCommission(commissionId, reason);

      if (result) {
        cancelledCount++;
      } else {
        errors.push(`${commissionId}: Failed to cancel`);
      }
    }

    logger.info("[groupAdmin.cancelCommissionsForCallSession] Complete", {
      callSessionId,
      cancelledCount,
      errorsCount: errors.length,
    });

    return { success: errors.length === 0, cancelledCount, errors };
  } catch (error) {
    logger.error("[groupAdmin.cancelCommissionsForCallSession] Error", {
      callSessionId,
      error,
    });
    return {
      success: false,
      cancelledCount,
      errors: [error instanceof Error ? error.message : "Failed to cancel commissions"],
    };
  }
}

/**
 * Cancel a commission
 */
export async function cancelCommission(
  commissionId: string,
  reason: string
): Promise<boolean> {
  try {
    const commissionRef = getDb().collection("group_admin_commissions").doc(commissionId);

    // All checks + mutations inside transaction to prevent double-cancellation
    const result = await getDb().runTransaction(async (transaction) => {
      const commissionDoc = await transaction.get(commissionRef);

      if (!commissionDoc.exists) {
        logger.error("[GroupAdminCommission] Commission not found", { commissionId });
        return false;
      }

      const commission = commissionDoc.data() as GroupAdminCommission;

      // Can only cancel pending or validated commissions
      if (!["pending", "validated"].includes(commission.status)) {
        logger.warn("[GroupAdminCommission] Cannot cancel commission in this status", {
          commissionId,
          status: commission.status,
        });
        return false;
      }

      // Update commission
      transaction.update(commissionRef, {
        status: "cancelled" as GroupAdminCommissionStatus,
        cancelledAt: Timestamp.now(),
        cancellationReason: reason,
      });

      // Update GroupAdmin balance
      const groupAdminRef = getDb().collection("group_admins").doc(commission.groupAdminId);
      const balanceField = commission.status === "pending" ? "pendingBalance" : "validatedBalance";

      transaction.update(groupAdminRef, {
        [balanceField]: FieldValue.increment(-commission.amount),
        totalCommissions: FieldValue.increment(-1),
        updatedAt: Timestamp.now(),
      });

      return true;
    });

    if (result) {
      logger.info("[GroupAdminCommission] Commission cancelled", {
        commissionId,
        reason,
      });
    }

    return result;
  } catch (error) {
    logger.error("[GroupAdminCommission] Error cancelling commission", {
      commissionId,
      error,
    });
    return false;
  }
}

/**
 * Internal helper to create a commission document
 */
async function createCommission(
  groupAdminId: string,
  type: GroupAdminCommissionType,
  amount: number,
  description: string,
  additionalFields: Partial<GroupAdminCommission> = {}
): Promise<GroupAdminCommission | null> {
  try {
    const commissionRef = getDb().collection("group_admin_commissions").doc();
    const now = Timestamp.now();

    const commission: GroupAdminCommission = {
      id: commissionRef.id,
      groupAdminId,
      type,
      status: type === "manual_adjustment" ? "available" : "pending",
      amount,
      originalAmount: amount,
      currency: "USD",
      description,
      createdAt: now,
      ...additionalFields,
    };

    if (type === "manual_adjustment") {
      commission.availableAt = now;
    }

    await commissionRef.set(commission);

    return commission;
  } catch (error) {
    logger.error("[GroupAdminCommission] Error creating commission", {
      groupAdminId,
      type,
      error,
    });
    return null;
  }
}
