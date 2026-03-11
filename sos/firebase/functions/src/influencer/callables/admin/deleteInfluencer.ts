/**
 * adminDeleteInfluencer - Hard delete an influencer with full sub-collection cascade
 *
 * Deletes: influencer doc, user doc, Firebase Auth, and all related collections.
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

export const adminDeleteInfluencer = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; message: string; deletedSubDocs: number }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request.auth);

    const { influencerId, reason } = request.data as { influencerId: string; reason?: string };
    if (!influencerId) {
      throw new HttpsError("invalid-argument", "influencerId is required");
    }

    const db = getFirestore();
    const influencerRef = db.collection("influencers").doc(influencerId);
    const influencerDoc = await influencerRef.get();

    if (!influencerDoc.exists) {
      throw new HttpsError("not-found", "Influencer not found");
    }

    const influencer = influencerDoc.data();
    const deletionSummary: string[] = [];
    let deletedCount = 0;

    // Cancel pending withdrawals first
    const pendingStatuses = ["pending", "validating", "approved", "queued", "processing", "sent"];
    const pendingWithdrawals = await db.collection("payment_withdrawals")
      .where("userId", "==", influencerId)
      .where("status", "in", pendingStatuses)
      .get();

    if (!pendingWithdrawals.empty) {
      const batch = db.batch();
      pendingWithdrawals.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancelledAt: Timestamp.now(),
          cancelledBy: adminId,
          cancelReason: "Influencer account deleted by admin",
        });
      });
      await batch.commit();
      deletionSummary.push(`${pendingWithdrawals.size} retraits annules`);
    }

    // Delete all influencer-related collections
    const collections: Array<[string, string]> = [
      ["influencer_commissions", "influencerId"],
      ["influencer_notifications", "influencerId"],
      ["affiliate_notifications", "userId"],
      ["influencer_recruited_providers", "influencerId"],
      ["influencer_affiliate_clicks", "influencerId"],
      ["influencer_referrals", "influencerId"],
      ["influencer_withdrawals", "influencerId"],
      ["influencer_training_progress", "influencerId"],
      ["influencer_badge_awards", "influencerId"],
      ["payment_withdrawals", "userId"],
      ["payment_methods", "userId"],
    ];

    for (const [collectionName, fieldName] of collections) {
      try {
        let totalDeleted = 0;
        let querySnap = await db.collection(collectionName).where(fieldName, "==", influencerId).limit(500).get();
        while (!querySnap.empty) {
          const batch = db.batch();
          querySnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          totalDeleted += querySnap.size;
          if (querySnap.size < 500) break;
          querySnap = await db.collection(collectionName).where(fieldName, "==", influencerId).limit(500).get();
        }
        if (totalDeleted > 0) {
          deletionSummary.push(`${collectionName}: ${totalDeleted} docs`);
          deletedCount += totalDeleted;
        }
      } catch (err) {
        logger.warn(`[adminDeleteInfluencer] Error deleting ${collectionName}`, { err });
      }
    }

    // Delete telegram_onboarding_links
    try {
      const telegramSnap = await db.collection("telegram_onboarding_links").where("influencerId", "==", influencerId).get();
      if (!telegramSnap.empty) {
        const batch = db.batch();
        telegramSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deletionSummary.push(`telegram_onboarding_links: ${telegramSnap.size} docs`);
        deletedCount += telegramSnap.size;
      }
    } catch (err) {
      logger.warn("[adminDeleteInfluencer] Error deleting telegram links", { err });
    }

    // Delete main influencer doc
    await influencerRef.delete();
    deletionSummary.push("influencers doc deleted");

    // Delete users doc
    try {
      await db.collection("users").doc(influencerId).delete();
      deletionSummary.push("users doc deleted");
    } catch (err) {
      logger.warn("[adminDeleteInfluencer] Error deleting users doc", { err });
    }

    // Delete Firebase Auth
    try {
      await getAuth().deleteUser(influencerId);
      deletionSummary.push("Firebase Auth deleted");
    } catch (authErr) {
      logger.warn("[adminDeleteInfluencer] Could not delete auth user", { influencerId, authErr });
    }

    // Audit log
    await db.collection("admin_audit_logs").add({
      action: "influencer_deleted",
      targetId: influencerId,
      targetType: "influencer",
      performedBy: adminId,
      timestamp: Timestamp.now(),
      details: {
        influencerName: `${influencer?.firstName || ""} ${influencer?.lastName || ""}`,
        influencerEmail: influencer?.email || "",
        reason: reason || "No reason provided",
        deletionSummary,
        deletedSubDocs: deletedCount,
      },
    });

    logger.info("[adminDeleteInfluencer] Influencer deleted", {
      influencerId,
      adminId,
      deletionSummary,
    });

    return {
      success: true,
      message: `Influenceur supprime. ${deletionSummary.join(", ")}`,
      deletedSubDocs: deletedCount,
    };
  }
);
