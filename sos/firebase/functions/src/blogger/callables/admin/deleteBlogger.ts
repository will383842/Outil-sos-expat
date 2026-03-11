/**
 * adminDeleteBlogger - Hard delete a blogger with full sub-collection cascade
 *
 * Deletes: blogger doc, user doc, Firebase Auth, and all related collections.
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

export const adminDeleteBlogger = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; message: string; deletedSubDocs: number }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request.auth);

    const { bloggerId, reason } = request.data as { bloggerId: string; reason?: string };
    if (!bloggerId) {
      throw new HttpsError("invalid-argument", "bloggerId is required");
    }

    const db = getFirestore();
    const bloggerRef = db.collection("bloggers").doc(bloggerId);
    const bloggerDoc = await bloggerRef.get();

    if (!bloggerDoc.exists) {
      throw new HttpsError("not-found", "Blogger not found");
    }

    const blogger = bloggerDoc.data();
    const deletionSummary: string[] = [];
    let deletedCount = 0;

    // Cancel pending withdrawals first
    const pendingStatuses = ["pending", "validating", "approved", "queued", "processing", "sent"];
    const pendingWithdrawals = await db.collection("payment_withdrawals")
      .where("userId", "==", bloggerId)
      .where("status", "in", pendingStatuses)
      .get();

    if (!pendingWithdrawals.empty) {
      const batch = db.batch();
      pendingWithdrawals.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancelledAt: Timestamp.now(),
          cancelledBy: adminId,
          cancelReason: "Blogger account deleted by admin",
        });
      });
      await batch.commit();
      deletionSummary.push(`${pendingWithdrawals.size} retraits annules`);
    }

    // Delete all blogger-related collections
    const collections: Array<[string, string]> = [
      ["blogger_commissions", "bloggerId"],
      ["blogger_notifications", "bloggerId"],
      ["affiliate_notifications", "userId"],
      ["blogger_recruited_providers", "bloggerId"],
      ["blogger_affiliate_clicks", "bloggerId"],
      ["blogger_articles", "bloggerId"],
      ["blogger_withdrawals", "bloggerId"],
      ["blogger_badge_awards", "bloggerId"],
      ["blogger_referrals", "bloggerId"],
      ["payment_withdrawals", "userId"],
      ["payment_methods", "userId"],
    ];

    for (const [collectionName, fieldName] of collections) {
      try {
        let totalDeleted = 0;
        let querySnap = await db.collection(collectionName).where(fieldName, "==", bloggerId).limit(500).get();
        while (!querySnap.empty) {
          const batch = db.batch();
          querySnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          totalDeleted += querySnap.size;
          if (querySnap.size < 500) break;
          querySnap = await db.collection(collectionName).where(fieldName, "==", bloggerId).limit(500).get();
        }
        if (totalDeleted > 0) {
          deletionSummary.push(`${collectionName}: ${totalDeleted} docs`);
          deletedCount += totalDeleted;
        }
      } catch (err) {
        logger.warn(`[adminDeleteBlogger] Error deleting ${collectionName}`, { err });
      }
    }

    // Delete telegram_onboarding_links
    try {
      const telegramSnap = await db.collection("telegram_onboarding_links").where("bloggerId", "==", bloggerId).get();
      if (!telegramSnap.empty) {
        const batch = db.batch();
        telegramSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deletionSummary.push(`telegram_onboarding_links: ${telegramSnap.size} docs`);
        deletedCount += telegramSnap.size;
      }
    } catch (err) {
      logger.warn("[adminDeleteBlogger] Error deleting telegram links", { err });
    }

    // Delete main blogger doc
    await bloggerRef.delete();
    deletionSummary.push("bloggers doc deleted");

    // Delete users doc
    try {
      await db.collection("users").doc(bloggerId).delete();
      deletionSummary.push("users doc deleted");
    } catch (err) {
      logger.warn("[adminDeleteBlogger] Error deleting users doc", { err });
    }

    // Delete Firebase Auth
    try {
      await getAuth().deleteUser(bloggerId);
      deletionSummary.push("Firebase Auth deleted");
    } catch (authErr) {
      logger.warn("[adminDeleteBlogger] Could not delete auth user", { bloggerId, authErr });
    }

    // Audit log
    await db.collection("admin_audit_logs").add({
      action: "blogger_deleted",
      targetId: bloggerId,
      targetType: "blogger",
      performedBy: adminId,
      timestamp: Timestamp.now(),
      details: {
        bloggerName: `${blogger?.firstName || ""} ${blogger?.lastName || ""}`,
        bloggerEmail: blogger?.email || "",
        reason: reason || "No reason provided",
        deletionSummary,
        deletedSubDocs: deletedCount,
      },
    });

    logger.info("[adminDeleteBlogger] Blogger deleted", {
      bloggerId,
      adminId,
      deletionSummary,
    });

    return {
      success: true,
      message: `Blogueur supprime. ${deletionSummary.join(", ")}`,
      deletedSubDocs: deletedCount,
    };
  }
);
