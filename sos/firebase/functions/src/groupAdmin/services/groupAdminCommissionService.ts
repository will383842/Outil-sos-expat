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
 * Create a client referral commission
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

    // Get commission amount
    const amount = await getClientCommissionAmount();

    // Create commission
    const commission = await createCommission(
      groupAdminId,
      "client_referral",
      amount,
      description,
      {
        sourceClientId: clientId,
        sourceCallId: callId,
      }
    );

    if (commission) {
      // Update GroupAdmin stats
      const currentMonth = new Date().toISOString().substring(0, 7);

      await groupAdminDoc.ref.update({
        totalClients: FieldValue.increment(1),
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.clients": groupAdmin.currentMonthStats.month === currentMonth
          ? FieldValue.increment(1)
          : 1,
        "currentMonthStats.earnings": groupAdmin.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: Timestamp.now(),
      });

      logger.info("[GroupAdminCommission] Client referral commission created", {
        groupAdminId,
        commissionId: commission.id,
        amount,
        clientId,
        callId,
      });
    }

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
 * Create a recruitment commission
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
    const commission = await createCommission(
      groupAdminId,
      "manual_adjustment",
      amount,
      description,
      {
        adjustedBy: adminId,
        adjustmentNotes: notes,
      }
    );

    if (commission) {
      // Update GroupAdmin balance (manual adjustments go directly to available)
      const groupAdminDoc = await getDb().collection("group_admins").doc(groupAdminId).get();

      if (groupAdminDoc.exists) {
        await groupAdminDoc.ref.update({
          totalCommissions: FieldValue.increment(1),
          totalEarned: FieldValue.increment(amount),
          availableBalance: FieldValue.increment(amount),
          updatedAt: Timestamp.now(),
        });
      }

      logger.info("[GroupAdminCommission] Manual adjustment created", {
        groupAdminId,
        commissionId: commission.id,
        amount,
        adminId,
      });
    }

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
 * Cancel a commission
 */
export async function cancelCommission(
  commissionId: string,
  reason: string
): Promise<boolean> {
  try {
    const commissionRef = getDb().collection("group_admin_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

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

    await getDb().runTransaction(async (transaction) => {
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
    });

    logger.info("[GroupAdminCommission] Commission cancelled", {
      commissionId,
      reason,
    });

    return true;
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
