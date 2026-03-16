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
  GroupAdminBadgeType,
  GroupAdminCommission,
  GroupAdminCommissionType,
  GroupAdminCommissionStatus,
  GroupAdminRecruit,
} from "../types";
import {
  getGroupAdminConfig,
  getClientCommissionAmount,
  getN1CallAmount,
  getN2CallAmount,
  getActivationBonusAmount,
  getN1RecruitBonusAmount,
  getActivationCallsRequired,
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
 * Amount is a fixed USD value from config ($5 lawyer / $3 expat),
 * independent of the call's billing currency (EUR, USD, etc.).
 */
export async function createClientReferralCommission(
  groupAdminId: string,
  clientId: string,
  callId: string,
  description: string = "Client referral commission",
  providerType?: 'lawyer' | 'expat'
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

    // Get commission amount (split by provider type)
    // Locked rates on the recipient's doc take priority (Lifetime Rate Lock)
    const amount = await getClientCommissionAmount(providerType, groupAdmin.lockedRates, groupAdmin.individualRates);

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
    };

    await getDb().runTransaction(async (tx) => {
      // Re-read GroupAdmin inside transaction to avoid stale data
      const freshGroupAdminDoc = await tx.get(groupAdminDoc.ref);
      if (!freshGroupAdminDoc.exists) {
        throw new Error("GroupAdmin document disappeared during transaction");
      }
      const freshGroupAdmin = freshGroupAdminDoc.data() as GroupAdmin;

      // Double-check for duplicates inside transaction (race condition safety net)
      const txDuplicateCheck = await tx.get(
        getDb().collection("group_admin_commissions")
          .where("groupAdminId", "==", groupAdminId)
          .where("type", "==", "client_referral")
          .where("sourceCallId", "==", callId)
          .limit(1)
      );
      if (!txDuplicateCheck.empty) {
        throw new Error("Commission already exists for this call");
      }

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

    // Chatter-style N1/N2/activation logic (non-blocking, non-critical)
    checkAndPayActivationBonus(groupAdminId, callId).catch((err) =>
      logger.warn("[GroupAdminCommission] Activation bonus check failed (non-critical)", { groupAdminId, err })
    );

    // Check for badge awards (non-blocking)
    checkAndAwardBadges(groupAdminId).catch((err) =>
      logger.warn("[GroupAdminCommission] Badge check failed (non-critical)", { groupAdminId, err })
    );

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

    // Get commission amount — use activation bonus amount ($5) as legacy fallback
    const amount = await getActivationBonusAmount(recruiter.lockedRates, recruiter.individualRates);

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
 * Check if a recruited GroupAdmin should trigger the $5 activation bonus for their recruiter.
 * Called after each client_referral commission is created.
 * Bonus is paid when the recruit makes their 2nd referral (configurable via activationCallsRequired).
 *
 * Uses a Firestore transaction to prevent race conditions (only one process wins).
 */
async function checkAndPayActivationBonus(groupAdminId: string, _callId: string): Promise<void> {
  try {
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
    if (recruit.activationBonusPaid) return;

    // Check commission window
    if (recruit.commissionWindowEnd.toDate() < new Date()) return;

    // Increment activationCallCount atomically, check if threshold reached
    const required = await getActivationCallsRequired();
    const newCount = (recruit.activationCallCount ?? 0) + 1;

    if (newCount < required) {
      // Just increment the counter
      await recruitDoc.ref.update({
        activationCallCount: newCount,
        updatedAt: Timestamp.now(),
      });
      return;
    }

    // Threshold reached — pay activation bonus via transaction
    const recruitRef = recruitDoc.ref;
    const recruiterRef = getDb().collection("group_admins").doc(groupAdmin.recruitedBy);
    // Pre-read recruiter doc to get lockedRates for Lifetime Rate Lock
    const recruiterPreSnap = await recruiterRef.get();
    const recruiterData = recruiterPreSnap.exists ? (recruiterPreSnap.data() as GroupAdmin) : undefined;
    const recruiterLockedRates = recruiterData?.lockedRates;
    const recruiterIndividualRates = recruiterData?.individualRates;
    const amount = await getActivationBonusAmount(recruiterLockedRates, recruiterIndividualRates);

    // Check recruiter's direct commissions THIS MONTH (not lifetime)
    const config = await getGroupAdminConfig();
    const minDirectCommissions = config.activationMinDirectCommissions || 10000;
    const nowDate = new Date();
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const monthStartTs = Timestamp.fromDate(monthStart);
    const recruiterMonthlySnap = await getDb().collection("group_admin_commissions")
      .where("groupAdminId", "==", groupAdmin.recruitedBy)
      .where("type", "in", ["client_referral"])
      .where("createdAt", ">=", monthStartTs)
      .get();
    let recruiterMonthlyDirect = 0;
    recruiterMonthlySnap.forEach(d => { recruiterMonthlyDirect += d.data().amount || 0; });

    if (recruiterMonthlyDirect < minDirectCommissions) {
      logger.info("[GroupAdminCommission] Recruiter hasn't reached minimum for activation bonus this month", {
        recruiterId: groupAdmin.recruitedBy,
        monthlyDirect: recruiterMonthlyDirect,
        required: minDirectCommissions,
        recruitedId: groupAdminId,
      });

      // Still update the call count and mark activated (but NOT activationBonusPaid)
      await recruitRef.update({
        activationCallCount: newCount,
        updatedAt: Timestamp.now(),
      });

      // TODO: Pay deferred activation bonus when recruiter reaches $100 threshold
      //       (requires a separate trigger on recruiter's totalEarned update)
    } else {
    await getDb().runTransaction(async (tx) => {
      const freshRecruit = await tx.get(recruitRef);
      if (!freshRecruit.exists || freshRecruit.data()?.activationBonusPaid === true) {
        // Already paid by concurrent process
        return;
      }

      const recruiterSnap = await tx.get(recruiterRef);
      if (!recruiterSnap.exists || (recruiterSnap.data() as GroupAdmin).status !== "active") {
        return;
      }

      const commissionRef = getDb().collection("group_admin_commissions").doc();
      const now = Timestamp.now();
      const currentMonth = new Date().toISOString().substring(0, 7);
      const recruiter = recruiterSnap.data() as GroupAdmin;

      const commission: GroupAdminCommission = {
        id: commissionRef.id,
        groupAdminId: groupAdmin.recruitedBy!,
        type: "activation_bonus",
        status: "pending",
        amount,
        originalAmount: amount,
        currency: "USD",
        description: `Activation bonus — ${groupAdmin.firstName} ${groupAdmin.lastName} made ${required} referrals`,
        createdAt: now,
        sourceRecruitId: groupAdminId,
      };

      tx.set(commissionRef, commission);

      tx.update(recruitRef, {
        activationBonusPaid: true,
        activationBonusCommissionId: commissionRef.id,
        activationBonusPaidAt: now,
        activationCallCount: newCount,
        // Legacy backward compat
        commissionPaid: true,
        commissionId: commissionRef.id,
        commissionPaidAt: now,
      });

      tx.update(recruiterRef, {
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.earnings": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: now,
      });

      logger.info("[GroupAdminCommission] Activation bonus paid (transaction)", {
        recruiterId: groupAdmin.recruitedBy,
        commissionId: commissionRef.id,
        amount,
        recruitedId: groupAdminId,
        activationCallCount: newCount,
      });
    });
    } // end else (recruiter meets $100 threshold)

    // ========================================================================
    // RECRUITMENT MILESTONES CHECK
    // ========================================================================

    if (groupAdmin.recruitedBy) {
      try {
        const { checkAndPayRecruitmentMilestones } = await import("../../lib/milestoneService");
        const recruiterMilestoneDoc = await getDb().collection("group_admins").doc(groupAdmin.recruitedBy).get();
        if (recruiterMilestoneDoc.exists) {
          const recruiterForMilestone = recruiterMilestoneDoc.data() as GroupAdmin;
          const recruitsSnap = await getDb().collection("group_admins")
            .where("recruitedBy", "==", groupAdmin.recruitedBy)
            .get();

          await checkAndPayRecruitmentMilestones({
            affiliateId: groupAdmin.recruitedBy,
            role: "groupAdmin",
            collection: "group_admins",
            commissionCollection: "group_admin_commissions",
            totalRecruits: recruitsSnap.size,
            tierBonusesPaid: recruiterForMilestone.tierBonusesPaid || [],
            milestones: (config.recruitmentMilestones || []).map((m: { recruits: number; bonus: number }) => ({
              recruits: m.recruits,
              bonus: m.bonus,
            })),
            commissionType: "tier_bonus",
          });
        }
      } catch (milestoneErr) {
        logger.warn("[GroupAdminCommission] Milestone check failed (non-critical)", { groupAdminId, error: milestoneErr });
      }
    }
  } catch (error) {
    logger.error("[GroupAdminCommission] Error checking activation bonus", {
      groupAdminId,
      error,
    });
  }
}

/**
 * Create a N1 call commission for the recruiter of a GroupAdmin.
 * $1 per client call made by the N1 recruit (the GA who was recruited by the recruiter).
 */
export async function createN1CallCommission(
  recruitedAdminId: string,
  callId: string,
  _providerType?: 'lawyer' | 'expat'
): Promise<void> {
  try {
    const gaDoc = await getDb().collection("group_admins").doc(recruitedAdminId).get();
    if (!gaDoc.exists) return;

    const ga = gaDoc.data() as GroupAdmin;
    if (!ga.recruitedBy) return;

    // Duplicate check
    const dupCheck = await getDb()
      .collection("group_admin_commissions")
      .where("groupAdminId", "==", ga.recruitedBy)
      .where("type", "==", "n1_call")
      .where("sourceCallId", "==", callId)
      .limit(1)
      .get();
    if (!dupCheck.empty) return;

    const recruiterDoc = await getDb().collection("group_admins").doc(ga.recruitedBy).get();
    if (!recruiterDoc.exists) return;
    const recruiter = recruiterDoc.data() as GroupAdmin;
    if (recruiter.status !== "active") return;

    const amount = await getN1CallAmount(recruiter.lockedRates, recruiter.individualRates);
    const commissionRef = getDb().collection("group_admin_commissions").doc();
    const now = Timestamp.now();
    const currentMonth = new Date().toISOString().substring(0, 7);

    const commission: GroupAdminCommission = {
      id: commissionRef.id,
      groupAdminId: ga.recruitedBy,
      type: "n1_call",
      status: "pending",
      amount,
      originalAmount: amount,
      currency: "USD",
      description: `N1 call commission — recruit ${ga.firstName} ${ga.lastName} call ${callId}`,
      createdAt: now,
      sourceRecruitId: recruitedAdminId,
      sourceCallId: callId,
    };

    await getDb().runTransaction(async (tx) => {
      // Double-check for duplicates inside transaction (race condition safety net)
      const txDupCheck = await tx.get(
        getDb().collection("group_admin_commissions")
          .where("groupAdminId", "==", ga.recruitedBy)
          .where("type", "==", "n1_call")
          .where("sourceCallId", "==", callId)
          .limit(1)
      );
      if (!txDupCheck.empty) {
        throw new Error("N1 commission already exists for this call");
      }

      tx.set(commissionRef, commission);
      tx.update(recruiterDoc.ref, {
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.earnings": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: now,
      });
    });

    logger.info("[GroupAdminCommission] N1 call commission created", {
      recruiterId: ga.recruitedBy,
      recruitedAdminId,
      callId,
      amount,
    });
  } catch (error) {
    logger.error("[GroupAdminCommission] Error creating N1 call commission", { recruitedAdminId, callId, error });
  }
}

/**
 * Create a N2 call commission for the grandparent recruiter.
 * $0.50 per client call made by a N2 recruit.
 */
export async function createN2CallCommission(
  recruitedAdminId: string,
  callId: string,
  _providerType?: 'lawyer' | 'expat'
): Promise<void> {
  try {
    const gaDoc = await getDb().collection("group_admins").doc(recruitedAdminId).get();
    if (!gaDoc.exists) return;

    const ga = gaDoc.data() as GroupAdmin;
    // N2 parent is stored on the recruit doc as parrainNiveau2Id
    const n2ParentId = ga.parrainNiveau2Id;
    if (!n2ParentId) return;

    // Duplicate check
    const dupCheck = await getDb()
      .collection("group_admin_commissions")
      .where("groupAdminId", "==", n2ParentId)
      .where("type", "==", "n2_call")
      .where("sourceCallId", "==", callId)
      .limit(1)
      .get();
    if (!dupCheck.empty) return;

    const n2Doc = await getDb().collection("group_admins").doc(n2ParentId).get();
    if (!n2Doc.exists) return;
    const n2 = n2Doc.data() as GroupAdmin;
    if (n2.status !== "active") return;

    const amount = await getN2CallAmount(n2.lockedRates, n2.individualRates);
    const commissionRef = getDb().collection("group_admin_commissions").doc();
    const now = Timestamp.now();
    const currentMonth = new Date().toISOString().substring(0, 7);

    const commission: GroupAdminCommission = {
      id: commissionRef.id,
      groupAdminId: n2ParentId,
      type: "n2_call",
      status: "pending",
      amount,
      originalAmount: amount,
      currency: "USD",
      description: `N2 call commission — N2 recruit ${ga.firstName} ${ga.lastName} call ${callId}`,
      createdAt: now,
      sourceRecruitId: recruitedAdminId,
      sourceCallId: callId,
    };

    await getDb().runTransaction(async (tx) => {
      // Double-check for duplicates inside transaction (race condition safety net)
      const txDupCheck = await tx.get(
        getDb().collection("group_admin_commissions")
          .where("groupAdminId", "==", n2ParentId)
          .where("type", "==", "n2_call")
          .where("sourceCallId", "==", callId)
          .limit(1)
      );
      if (!txDupCheck.empty) {
        throw new Error("N2 commission already exists for this call");
      }

      tx.set(commissionRef, commission);
      tx.update(n2Doc.ref, {
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.earnings": n2.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: now,
      });
    });

    logger.info("[GroupAdminCommission] N2 call commission created", {
      n2ParentId,
      recruitedAdminId,
      callId,
      amount,
    });
  } catch (error) {
    logger.error("[GroupAdminCommission] Error creating N2 call commission", { recruitedAdminId, callId, error });
  }
}

/**
 * Create a N1 recruit bonus commission ($1) when a N1 recruit recruits a new N2.
 * DISABLED: Redundant with N2 commissions — grandparent already earns N2 call commissions automatically.
 */
export async function createN1RecruitBonusCommission(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  n1AdminId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  n2AdminId: string
): Promise<void> {
  // N1 recruit bonus removed — redundant with N2 commissions
  return;
  try {
    // Duplicate check
    const dupCheck = await getDb()
      .collection("group_admin_commissions")
      .where("groupAdminId", "==", n1AdminId)
      .where("type", "==", "n1_recruit_bonus")
      .where("sourceRecruitId", "==", n2AdminId)
      .limit(1)
      .get();
    if (!dupCheck.empty) return;

    const n1Doc = await getDb().collection("group_admins").doc(n1AdminId).get();
    if (!n1Doc.exists) return;
    const n1 = n1Doc.data() as GroupAdmin;
    if (n1.status !== "active") return;

    const n2Doc = await getDb().collection("group_admins").doc(n2AdminId).get();
    const n2 = n2Doc.exists ? (n2Doc.data() as GroupAdmin) : null;

    const amount = await getN1RecruitBonusAmount(n1.lockedRates, n1.individualRates);
    const commissionRef = getDb().collection("group_admin_commissions").doc();
    const now = Timestamp.now();
    const currentMonth = new Date().toISOString().substring(0, 7);
    const recruitName = n2 ? `${n2.firstName} ${n2.lastName}` : n2AdminId;

    const commission: GroupAdminCommission = {
      id: commissionRef.id,
      groupAdminId: n1AdminId,
      type: "n1_recruit_bonus",
      status: "pending",
      amount,
      originalAmount: amount,
      currency: "USD",
      description: `N1 recruit bonus — ${recruitName} joined your network`,
      createdAt: now,
      sourceRecruitId: n2AdminId,
    };

    await getDb().runTransaction(async (tx) => {
      tx.set(commissionRef, commission);
      tx.update(n1Doc.ref, {
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.earnings": n1.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: now,
      });
    });

    logger.info("[GroupAdminCommission] N1 recruit bonus created", {
      n1AdminId,
      n2AdminId,
      amount,
    });
  } catch (error) {
    logger.error("[GroupAdminCommission] Error creating N1 recruit bonus", { n1AdminId, n2AdminId, error });
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
      .where("sourceCallId", "==", callSessionId)
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

      // Can only cancel pending, validated, or available commissions
      if (!["pending", "validated", "available"].includes(commission.status)) {
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

      // Update GroupAdmin balance based on current commission status
      const groupAdminRef = getDb().collection("group_admins").doc(commission.groupAdminId);
      const balanceUpdates: Record<string, unknown> = {
        totalCommissions: FieldValue.increment(-1),
        updatedAt: Timestamp.now(),
      };

      switch (commission.status) {
        case "pending":
          balanceUpdates.pendingBalance = FieldValue.increment(-commission.amount);
          break;
        case "validated":
          balanceUpdates.validatedBalance = FieldValue.increment(-commission.amount);
          break;
        case "available":
          balanceUpdates.availableBalance = FieldValue.increment(-commission.amount);
          balanceUpdates.totalEarned = FieldValue.increment(-commission.amount);
          break;
      }

      transaction.update(groupAdminRef, balanceUpdates);

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

// ============================================================================
// BADGE AUTOMATION
// ============================================================================

/** Badge thresholds: badgeType → { field, threshold } */
const BADGE_THRESHOLDS: Array<{
  badge: GroupAdminBadgeType;
  field: "totalClients" | "totalEarned" | "totalRecruits";
  threshold: number;
}> = [
  // First conversion
  { badge: "first_conversion", field: "totalClients", threshold: 1 },
  // Earnings (in cents)
  { badge: "earnings_100", field: "totalEarned", threshold: 10000 },
  { badge: "earnings_500", field: "totalEarned", threshold: 50000 },
  { badge: "earnings_1000", field: "totalEarned", threshold: 100000 },
  { badge: "earnings_5000", field: "totalEarned", threshold: 500000 },
  // Recruitment
  { badge: "recruit_1", field: "totalRecruits", threshold: 1 },
  { badge: "recruit_10", field: "totalRecruits", threshold: 10 },
  { badge: "recruit_25", field: "totalRecruits", threshold: 25 },
];

/**
 * Check and award badges to a GroupAdmin based on current stats.
 * Called after commission creation (non-blocking).
 */
export async function checkAndAwardBadges(groupAdminId: string): Promise<void> {
  const db = getDb();

  try {
    const gaDoc = await db.collection("group_admins").doc(groupAdminId).get();
    if (!gaDoc.exists) return;

    const ga = gaDoc.data() as GroupAdmin;
    const currentBadges = ga.badges || [];
    const newBadges: GroupAdminBadgeType[] = [];

    for (const { badge, field, threshold } of BADGE_THRESHOLDS) {
      if (currentBadges.includes(badge)) continue;

      const value = ga[field] || 0;
      if (value >= threshold) {
        newBadges.push(badge);
      }
    }

    if (newBadges.length === 0) return;

    const now = Timestamp.now();
    const batch = db.batch();

    // Add badges to GroupAdmin doc
    batch.update(gaDoc.ref, {
      badges: FieldValue.arrayUnion(...newBadges),
      updatedAt: now,
    });

    // Create badge award records
    for (const badge of newBadges) {
      const awardRef = db.collection("group_admin_badge_awards").doc();
      batch.set(awardRef, {
        id: awardRef.id,
        groupAdminId,
        groupAdminEmail: ga.email,
        badgeType: badge,
        earnedAt: now,
        valueAtEarning: ga[BADGE_THRESHOLDS.find((b) => b.badge === badge)!.field] || 0,
      });
    }

    await batch.commit();

    logger.info("[GroupAdminCommission] Badges awarded", {
      groupAdminId,
      newBadges,
    });
  } catch (error) {
    logger.warn("[GroupAdminCommission] Badge check error (non-critical)", {
      groupAdminId,
      error,
    });
  }
}
