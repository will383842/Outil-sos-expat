/**
 * adminManageChatter - Admin callable to block, restrict (suspend), or delete a chatter
 *
 * Before any destructive action, returns balance info as a warning.
 * Actions:
 *   - block (ban): Sets status to 'banned', disables Firebase Auth
 *   - restrict (suspend): Sets status to 'suspended'
 *   - reactivate: Sets status to 'active', re-enables Firebase Auth
 *   - delete: Hard deletes chatter data, Firestore docs, and Firebase Auth
 *   - getBalanceInfo: Returns balance/commission info only (no mutation)
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig as adminConfig } from "../../../lib/functionConfigs";
import { Chatter } from "../../types";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
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

type ManageAction = "block" | "restrict" | "reactivate" | "delete" | "getBalanceInfo";

interface ManageChatterInput {
  chatterId: string;
  action: ManageAction;
  reason?: string;
  confirmDeletion?: boolean; // Must be true for delete action
}

interface BalanceInfo {
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalEarned: number;
  piggyBankBalance: number;
  piggyBankIsUnlocked: boolean;
  pendingWithdrawals: number;
  pendingWithdrawalsCount: number;
  hasActiveFunds: boolean;
}

interface ManageChatterResponse {
  success: boolean;
  message: string;
  balanceInfo: BalanceInfo;
  actionApplied: ManageAction | "none";
  warning?: string;
}

async function getChatterBalanceInfo(db: FirebaseFirestore.Firestore, chatterId: string, chatter: Chatter): Promise<BalanceInfo> {
  // Get pending withdrawals from both legacy and new payment system
  const [legacyWithdrawalsSnap, paymentWithdrawalsSnap] = await Promise.all([
    db.collection("chatter_withdrawals")
      .where("chatterId", "==", chatterId)
      .where("status", "in", ["pending", "approved", "processing"])
      .get(),
    db.collection("payment_withdrawals")
      .where("userId", "==", chatterId)
      .where("status", "in", ["pending", "validating", "approved", "queued", "processing", "sent"])
      .get(),
  ]);

  let pendingWithdrawalsAmount = 0;
  let pendingWithdrawalsCount = 0;
  legacyWithdrawalsSnap.docs.forEach((doc) => {
    pendingWithdrawalsAmount += doc.data().amount || 0;
  });
  pendingWithdrawalsCount += legacyWithdrawalsSnap.size;
  paymentWithdrawalsSnap.docs.forEach((doc) => {
    pendingWithdrawalsAmount += doc.data().amount || 0;
  });
  pendingWithdrawalsCount += paymentWithdrawalsSnap.size;

  const availableBalance = chatter.availableBalance || 0;
  const pendingBalance = chatter.pendingBalance || 0;
  const validatedBalance = chatter.validatedBalance || 0;
  const piggyBankBalance = (chatter as any).piggyBank?.clientEarnings || 0;
  const piggyBankIsUnlocked = (chatter as any).piggyBank?.isUnlocked || false;

  const hasActiveFunds = availableBalance > 0 || pendingBalance > 0 || validatedBalance > 0 || pendingWithdrawalsAmount > 0;

  return {
    availableBalance,
    pendingBalance,
    validatedBalance,
    totalEarned: chatter.totalEarned || 0,
    piggyBankBalance,
    piggyBankIsUnlocked,
    pendingWithdrawals: pendingWithdrawalsAmount,
    pendingWithdrawalsCount,
    hasActiveFunds,
  };
}

export const adminManageChatter = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request): Promise<ManageChatterResponse> => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const db = getFirestore();
    const input = request.data as ManageChatterInput;

    if (!input.chatterId) {
      throw new HttpsError("invalid-argument", "chatterId is required");
    }

    const validActions: ManageAction[] = ["block", "restrict", "reactivate", "delete", "getBalanceInfo"];
    if (!input.action || !validActions.includes(input.action)) {
      throw new HttpsError("invalid-argument", `action must be one of: ${validActions.join(", ")}`);
    }

    // Fetch chatter
    const chatterRef = db.collection("chatters").doc(input.chatterId);
    const chatterDoc = await chatterRef.get();

    if (!chatterDoc.exists) {
      throw new HttpsError("not-found", "Chatter not found");
    }

    const chatter = chatterDoc.data() as Chatter;
    const balanceInfo = await getChatterBalanceInfo(db, input.chatterId, chatter);
    const now = Timestamp.now();

    // Build warning if there are active funds
    let warning: string | undefined;
    if (balanceInfo.hasActiveFunds && input.action !== "getBalanceInfo" && input.action !== "reactivate") {
      const parts: string[] = [];
      if (balanceInfo.availableBalance > 0) parts.push(`$${(balanceInfo.availableBalance / 100).toFixed(2)} disponible`);
      if (balanceInfo.pendingBalance > 0) parts.push(`$${(balanceInfo.pendingBalance / 100).toFixed(2)} en attente`);
      if (balanceInfo.validatedBalance > 0) parts.push(`$${(balanceInfo.validatedBalance / 100).toFixed(2)} valide`);
      if (balanceInfo.pendingWithdrawalsCount > 0) parts.push(`${balanceInfo.pendingWithdrawalsCount} retrait(s) en cours ($${(balanceInfo.pendingWithdrawals / 100).toFixed(2)})`);
      warning = `Ce chatter a des fonds actifs: ${parts.join(", ")}`;
    }

    // ---- getBalanceInfo: read-only ----
    if (input.action === "getBalanceInfo") {
      return {
        success: true,
        message: "Balance info retrieved",
        balanceInfo,
        actionApplied: "getBalanceInfo",
        warning,
      };
    }

    // Require reason for destructive actions
    if (["block", "restrict", "delete"].includes(input.action) && !input.reason) {
      throw new HttpsError("invalid-argument", "reason is required for this action");
    }

    // Helper: append to adminNotes string (field is string, not array)
    const appendAdminNote = (existing: string | undefined, note: string): string => {
      return existing ? `${existing}\n${note}` : note;
    };

    // ---- BLOCK (ban) ----
    if (input.action === "block") {
      await chatterRef.update({
        status: "banned",
        bannedAt: now,
        bannedBy: adminId,
        bannedReason: input.reason,
        adminNotes: appendAdminNote(chatter.adminNotes, `[${now.toDate().toISOString()}] BANNED by ${adminId}: ${input.reason}`),
        updatedAt: now,
      });

      // Update user doc
      await db.collection("users").doc(input.chatterId).update({
        chatterStatus: "banned",
        updatedAt: now,
      });

      // Disable Firebase Auth
      try {
        await getAuth().updateUser(input.chatterId, { disabled: true });
      } catch (authErr) {
        logger.warn("[adminManageChatter] Could not disable auth user", { chatterId: input.chatterId, authErr });
      }

      // Audit log
      await db.collection("admin_audit_logs").add({
        action: "chatter_blocked",
        targetId: input.chatterId,
        targetType: "chatter",
        performedBy: adminId,
        timestamp: now,
        details: { previousStatus: chatter.status, reason: input.reason, balanceInfo },
      });

      logger.info("[adminManageChatter] Chatter blocked", { chatterId: input.chatterId, adminId });

      return {
        success: true,
        message: `Chatter ${chatter.firstName} ${chatter.lastName} a ete bloque (banni)`,
        balanceInfo,
        actionApplied: "block",
        warning,
      };
    }

    // ---- RESTRICT (suspend) ----
    if (input.action === "restrict") {
      await chatterRef.update({
        status: "suspended",
        suspendedAt: now,
        suspendedBy: adminId,
        suspendReason: input.reason,
        adminNotes: appendAdminNote(chatter.adminNotes, `[${now.toDate().toISOString()}] SUSPENDED by ${adminId}: ${input.reason}`),
        updatedAt: now,
      });

      await db.collection("users").doc(input.chatterId).update({
        chatterStatus: "suspended",
        updatedAt: now,
      });

      await db.collection("admin_audit_logs").add({
        action: "chatter_restricted",
        targetId: input.chatterId,
        targetType: "chatter",
        performedBy: adminId,
        timestamp: now,
        details: { previousStatus: chatter.status, reason: input.reason, balanceInfo },
      });

      logger.info("[adminManageChatter] Chatter restricted", { chatterId: input.chatterId, adminId });

      return {
        success: true,
        message: `Chatter ${chatter.firstName} ${chatter.lastName} a ete suspendu`,
        balanceInfo,
        actionApplied: "restrict",
        warning,
      };
    }

    // ---- REACTIVATE ----
    if (input.action === "reactivate") {
      await chatterRef.update({
        status: "active",
        suspendedAt: FieldValue.delete(),
        suspendedBy: FieldValue.delete(),
        suspendReason: FieldValue.delete(),
        bannedAt: FieldValue.delete(),
        bannedBy: FieldValue.delete(),
        bannedReason: FieldValue.delete(),
        adminNotes: appendAdminNote(chatter.adminNotes, `[${now.toDate().toISOString()}] REACTIVATED by ${adminId}: ${input.reason || "No reason"}`),
        updatedAt: now,
      });

      await db.collection("users").doc(input.chatterId).update({
        chatterStatus: "active",
        updatedAt: now,
      });

      // Re-enable Firebase Auth
      try {
        await getAuth().updateUser(input.chatterId, { disabled: false });
      } catch (authErr) {
        logger.warn("[adminManageChatter] Could not re-enable auth user", { chatterId: input.chatterId, authErr });
      }

      await db.collection("admin_audit_logs").add({
        action: "chatter_reactivated",
        targetId: input.chatterId,
        targetType: "chatter",
        performedBy: adminId,
        timestamp: now,
        details: { previousStatus: chatter.status, reason: input.reason || "No reason" },
      });

      logger.info("[adminManageChatter] Chatter reactivated", { chatterId: input.chatterId, adminId });

      return {
        success: true,
        message: `Chatter ${chatter.firstName} ${chatter.lastName} a ete reactive`,
        balanceInfo,
        actionApplied: "reactivate",
      };
    }

    // ---- DELETE ----
    if (input.action === "delete") {
      if (!input.confirmDeletion) {
        throw new HttpsError(
          "failed-precondition",
          "confirmDeletion must be true to delete a chatter. This action is irreversible."
        );
      }

      const deletionSummary: string[] = [];

      // Cancel pending withdrawals from both systems
      if (balanceInfo.pendingWithdrawalsCount > 0) {
        // Legacy chatter_withdrawals
        const legacyPending = await db
          .collection("chatter_withdrawals")
          .where("chatterId", "==", input.chatterId)
          .where("status", "in", ["pending", "approved", "processing"])
          .get();

        if (!legacyPending.empty) {
          const batch = db.batch();
          legacyPending.docs.forEach((doc) => {
            batch.update(doc.ref, {
              status: "cancelled",
              cancelledAt: now,
              cancelledBy: adminId,
              cancelReason: "Chatter account deleted by admin",
            });
          });
          await batch.commit();
          deletionSummary.push(`${legacyPending.size} retraits legacy annules`);
        }

        // New payment_withdrawals system
        const paymentPending = await db
          .collection("payment_withdrawals")
          .where("userId", "==", input.chatterId)
          .where("status", "in", ["pending", "validating", "approved", "queued", "processing", "sent"])
          .get();

        if (!paymentPending.empty) {
          const batch = db.batch();
          paymentPending.docs.forEach((doc) => {
            batch.update(doc.ref, {
              status: "cancelled",
              cancelledAt: now,
              cancelledBy: adminId,
              cancelReason: "Chatter account deleted by admin",
            });
          });
          await batch.commit();
          deletionSummary.push(`${paymentPending.size} retraits payment annules`);
        }
      }

      // Delete all chatter-related collections
      // Each entry: [collectionName, fieldName to query by]
      const collections: Array<[string, string]> = [
        ["chatter_commissions", "chatterId"],
        ["chatter_withdrawals", "chatterId"],
        ["chatter_recruitment_links", "chatterId"],
        ["chatter_badge_awards", "chatterId"],
        ["chatter_quiz_attempts", "chatterId"],
        ["chatter_notifications", "chatterId"],
        ["affiliate_notifications", "userId"],
        ["chatter_referral_commissions", "parrainId"],
        ["chatter_recruited_chatters", "recruiterId"],
        ["chatter_recruited_providers", "chatterId"],
        ["chatter_affiliate_clicks", "chatterId"],
        ["chatter_posts", "chatterId"],
        ["chatter_zoom_attendances", "chatterId"],
        ["chatter_referral_fraud_alerts", "chatterId"],
        ["payment_withdrawals", "userId"],
        ["payment_methods", "userId"],
        ["chatter_training_certificates", "chatterId"],
        ["chatter_tier_bonuses_history", "chatterId"],
        ["chatter_fraud_reviews", "chatterId"],
        ["chatter_ip_registry", "chatterId"],
      ];

      for (const [collectionName, fieldName] of collections) {
        try {
          let totalDeleted = 0;
          let querySnap = await db.collection(collectionName).where(fieldName, "==", input.chatterId).limit(500).get();
          while (!querySnap.empty) {
            const batch = db.batch();
            querySnap.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            totalDeleted += querySnap.size;
            if (querySnap.size < 500) break;
            querySnap = await db.collection(collectionName).where(fieldName, "==", input.chatterId).limit(500).get();
          }
          if (totalDeleted > 0) {
            deletionSummary.push(`${collectionName}: ${totalDeleted} docs`);
          }
        } catch (err) {
          logger.warn(`[adminManageChatter] Error deleting ${collectionName}`, { err });
        }
      }

      // Also delete referral commissions where this chatter is the filleul
      try {
        let totalDeleted = 0;
        let querySnap = await db.collection("chatter_referral_commissions").where("filleulId", "==", input.chatterId).limit(500).get();
        while (!querySnap.empty) {
          const batch = db.batch();
          querySnap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          totalDeleted += querySnap.size;
          if (querySnap.size < 500) break;
          querySnap = await db.collection("chatter_referral_commissions").where("filleulId", "==", input.chatterId).limit(500).get();
        }
        if (totalDeleted > 0) {
          deletionSummary.push(`chatter_referral_commissions (filleul): ${totalDeleted} docs`);
        }
      } catch (err) {
        logger.warn("[adminManageChatter] Error deleting filleul referral commissions", { err });
      }

      // Delete chatter_call_counts (doc ID = chatterId)
      try {
        const callCountDoc = db.collection("chatter_call_counts").doc(input.chatterId);
        const callCountSnap = await callCountDoc.get();
        if (callCountSnap.exists) {
          await callCountDoc.delete();
          deletionSummary.push("chatter_call_counts: 1 doc");
        }
      } catch (err) {
        logger.warn("[adminManageChatter] Error deleting chatter_call_counts", { err });
      }

      // Delete chatter_training_progress (doc ID = chatterId, with subcollection modules)
      try {
        const trainingProgressRef = db.collection("chatter_training_progress").doc(input.chatterId);
        const modulesSnap = await trainingProgressRef.collection("modules").get();
        if (!modulesSnap.empty) {
          const batch = db.batch();
          modulesSnap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          deletionSummary.push(`chatter_training_progress/modules: ${modulesSnap.size} docs`);
        }
        const progressDoc = await trainingProgressRef.get();
        if (progressDoc.exists) {
          await trainingProgressRef.delete();
          deletionSummary.push("chatter_training_progress: 1 doc");
        }
      } catch (err) {
        logger.warn("[adminManageChatter] Error deleting chatter_training_progress", { err });
      }

      // Delete FCM tokens subcollection
      try {
        const fcmSnap = await db.collection("chatters").doc(input.chatterId).collection("fcmTokens").get();
        if (!fcmSnap.empty) {
          const batch = db.batch();
          fcmSnap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          deletionSummary.push(`fcmTokens: ${fcmSnap.size} docs`);
        }
      } catch (err) {
        logger.warn("[adminManageChatter] Error deleting fcmTokens", { err });
      }

      // Delete telegram_onboarding_links
      try {
        const telegramSnap = await db.collection("telegram_onboarding_links").where("chatterId", "==", input.chatterId).get();
        if (!telegramSnap.empty) {
          const batch = db.batch();
          telegramSnap.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          deletionSummary.push(`telegram_onboarding_links: ${telegramSnap.size} docs`);
        }
      } catch (err) {
        logger.warn("[adminManageChatter] Error deleting telegram links", { err });
      }

      // Delete chatters/{id}
      await chatterRef.delete();
      deletionSummary.push("chatters doc deleted");

      // Delete users/{id}
      try {
        await db.collection("users").doc(input.chatterId).delete();
        deletionSummary.push("users doc deleted");
      } catch (err) {
        logger.warn("[adminManageChatter] Error deleting users doc", { err });
      }

      // Delete Firebase Auth
      try {
        await getAuth().deleteUser(input.chatterId);
        deletionSummary.push("Firebase Auth deleted");
      } catch (authErr) {
        logger.warn("[adminManageChatter] Could not delete auth user", { chatterId: input.chatterId, authErr });
      }

      // GDPR Audit log
      await db.collection("admin_audit_logs").add({
        action: "chatter_deleted",
        targetId: input.chatterId,
        targetType: "chatter",
        performedBy: adminId,
        timestamp: now,
        details: {
          chatterName: `${chatter.firstName} ${chatter.lastName}`,
          chatterEmail: chatter.email,
          reason: input.reason,
          balanceAtDeletion: balanceInfo,
          deletionSummary,
        },
      });

      logger.info("[adminManageChatter] Chatter deleted", {
        chatterId: input.chatterId,
        adminId,
        deletionSummary,
      });

      return {
        success: true,
        message: `Chatter ${chatter.firstName} ${chatter.lastName} supprime. ${deletionSummary.join(", ")}`,
        balanceInfo,
        actionApplied: "delete",
        warning,
      };
    }

    throw new HttpsError("invalid-argument", `Unknown action: ${input.action}`);
  }
);
