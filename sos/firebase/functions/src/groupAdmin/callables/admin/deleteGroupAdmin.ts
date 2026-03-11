/**
 * adminDeleteGroupAdmin - Hard delete a group admin with full sub-collection cascade
 *
 * Deletes: group_admins doc, user doc, Firebase Auth, and all related collections.
 * Requires admin authentication.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

async function assertAdmin(auth: { uid: string; token?: Record<string, unknown> } | undefined): Promise<string> {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const role = auth.token?.role as string | undefined;
  if (role === "admin" || role === "superadmin") return auth.uid;

  const db = getFirestore();
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || !["admin", "superadmin"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  return auth.uid;
}

export const adminDeleteGroupAdmin = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; message: string; deletedSubDocs: number }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request.auth);

    const { groupAdminId, reason } = request.data as { groupAdminId: string; reason?: string };
    if (!groupAdminId) {
      throw new HttpsError("invalid-argument", "groupAdminId is required");
    }

    const db = getFirestore();
    const groupAdminRef = db.collection("group_admins").doc(groupAdminId);
    const groupAdminDoc = await groupAdminRef.get();

    if (!groupAdminDoc.exists) {
      throw new HttpsError("not-found", "GroupAdmin not found");
    }

    const groupAdmin = groupAdminDoc.data();
    const deletionSummary: string[] = [];
    let deletedCount = 0;

    // Cancel pending withdrawals first
    const pendingStatuses = ["pending", "validating", "approved", "queued", "processing", "sent"];
    const pendingWithdrawals = await db.collection("payment_withdrawals")
      .where("userId", "==", groupAdminId)
      .where("status", "in", pendingStatuses)
      .get();

    if (!pendingWithdrawals.empty) {
      const batch = db.batch();
      pendingWithdrawals.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancelledAt: Timestamp.now(),
          cancelledBy: adminId,
          cancelReason: "GroupAdmin account deleted by admin",
        });
      });
      await batch.commit();
      deletionSummary.push(`${pendingWithdrawals.size} retraits annules`);
    }

    // Delete all groupAdmin-related collections
    const collections: Array<[string, string]> = [
      ["group_admin_commissions", "groupAdminId"],
      ["group_admin_notifications", "groupAdminId"],
      ["affiliate_notifications", "userId"],
      ["group_admin_recruited_providers", "groupAdminId"],
      ["group_admin_posts", "groupAdminId"],
      ["group_admin_recruitments", "groupAdminId"],
      ["group_admin_affiliate_clicks", "groupAdminId"],
      ["group_admin_withdrawals", "groupAdminId"],
      ["group_admin_badge_awards", "groupAdminId"],
      ["group_admin_referrals", "groupAdminId"],
      ["group_admin_recruited_admins", "groupAdminId"],
      ["group_admin_clicks", "groupAdminId"],
      ["group_admin_usage_log", "groupAdminId"],
      ["payment_withdrawals", "userId"],
      ["payment_methods", "userId"],
    ];

    for (const [collectionName, fieldName] of collections) {
      try {
        let totalDeleted = 0;
        let querySnap = await db.collection(collectionName).where(fieldName, "==", groupAdminId).limit(500).get();
        while (!querySnap.empty) {
          const batch = db.batch();
          querySnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          totalDeleted += querySnap.size;
          if (querySnap.size < 500) break;
          querySnap = await db.collection(collectionName).where(fieldName, "==", groupAdminId).limit(500).get();
        }
        if (totalDeleted > 0) {
          deletionSummary.push(`${collectionName}: ${totalDeleted} docs`);
          deletedCount += totalDeleted;
        }
      } catch (err) {
        logger.warn(`[adminDeleteGroupAdmin] Error deleting ${collectionName}`, { err });
      }
    }

    // Delete telegram_onboarding_links
    try {
      const telegramSnap = await db.collection("telegram_onboarding_links").where("groupAdminId", "==", groupAdminId).get();
      if (!telegramSnap.empty) {
        const batch = db.batch();
        telegramSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deletionSummary.push(`telegram_onboarding_links: ${telegramSnap.size} docs`);
        deletedCount += telegramSnap.size;
      }
    } catch (err) {
      logger.warn("[adminDeleteGroupAdmin] Error deleting telegram links", { err });
    }

    // Delete main group_admins doc
    await groupAdminRef.delete();
    deletionSummary.push("group_admins doc deleted");

    // Delete users doc
    try {
      await db.collection("users").doc(groupAdminId).delete();
      deletionSummary.push("users doc deleted");
    } catch (err) {
      logger.warn("[adminDeleteGroupAdmin] Error deleting users doc", { err });
    }

    // Delete Firebase Auth
    try {
      await getAuth().deleteUser(groupAdminId);
      deletionSummary.push("Firebase Auth deleted");
    } catch (authErr) {
      logger.warn("[adminDeleteGroupAdmin] Could not delete auth user", { groupAdminId, authErr });
    }

    // Audit log
    await db.collection("admin_audit_logs").add({
      action: "group_admin_deleted",
      targetId: groupAdminId,
      targetType: "groupAdmin",
      performedBy: adminId,
      timestamp: Timestamp.now(),
      details: {
        groupAdminName: `${groupAdmin?.firstName || ""} ${groupAdmin?.lastName || ""}`,
        groupAdminEmail: groupAdmin?.email || "",
        reason: reason || "No reason provided",
        deletionSummary,
        deletedSubDocs: deletedCount,
      },
    });

    logger.info("[adminDeleteGroupAdmin] GroupAdmin deleted", {
      groupAdminId,
      adminId,
      deletionSummary,
    });

    return {
      success: true,
      message: `GroupAdmin supprime. ${deletionSummary.join(", ")}`,
      deletedSubDocs: deletedCount,
    };
  }
);
