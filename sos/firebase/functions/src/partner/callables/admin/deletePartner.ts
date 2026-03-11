/**
 * adminDeletePartner - Hard delete a partner with full sub-collection cascade
 *
 * Deletes: partner doc, user doc, Firebase Auth, and all related collections.
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

export const adminDeletePartner = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean; message: string; deletedSubDocs: number }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request.auth);

    const { partnerId, reason } = request.data as { partnerId: string; reason?: string };
    if (!partnerId) {
      throw new HttpsError("invalid-argument", "partnerId is required");
    }

    const db = getFirestore();
    const partnerRef = db.collection("partners").doc(partnerId);
    const partnerDoc = await partnerRef.get();

    if (!partnerDoc.exists) {
      throw new HttpsError("not-found", "Partner not found");
    }

    const partner = partnerDoc.data();
    const deletionSummary: string[] = [];
    let deletedCount = 0;

    // Cancel pending withdrawals first
    const pendingStatuses = ["pending", "validating", "approved", "queued", "processing", "sent"];
    const pendingWithdrawals = await db.collection("payment_withdrawals")
      .where("userId", "==", partnerId)
      .where("status", "in", pendingStatuses)
      .get();

    if (!pendingWithdrawals.empty) {
      const batch = db.batch();
      pendingWithdrawals.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "cancelled",
          cancelledAt: Timestamp.now(),
          cancelledBy: adminId,
          cancelReason: "Partner account deleted by admin",
        });
      });
      await batch.commit();
      deletionSummary.push(`${pendingWithdrawals.size} retraits annules`);
    }

    // Delete all partner-related collections
    const collections: Array<[string, string]> = [
      ["partner_commissions", "partnerId"],
      ["partner_notifications", "partnerId"],
      ["partner_affiliate_clicks", "partnerId"],
      ["partner_widgets", "partnerId"],
      ["partner_applications", "partnerId"],
      ["payment_withdrawals", "userId"],
      ["payment_methods", "userId"],
    ];

    for (const [collectionName, fieldName] of collections) {
      try {
        let totalDeleted = 0;
        let querySnap = await db.collection(collectionName).where(fieldName, "==", partnerId).limit(500).get();
        while (!querySnap.empty) {
          const batch = db.batch();
          querySnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          totalDeleted += querySnap.size;
          if (querySnap.size < 500) break;
          querySnap = await db.collection(collectionName).where(fieldName, "==", partnerId).limit(500).get();
        }
        if (totalDeleted > 0) {
          deletionSummary.push(`${collectionName}: ${totalDeleted} docs`);
          deletedCount += totalDeleted;
        }
      } catch (err) {
        logger.warn(`[adminDeletePartner] Error deleting ${collectionName}`, { err });
      }
    }

    // Delete main partner doc
    await partnerRef.delete();
    deletionSummary.push("partners doc deleted");

    // Delete users doc
    try {
      await db.collection("users").doc(partnerId).delete();
      deletionSummary.push("users doc deleted");
    } catch (err) {
      logger.warn("[adminDeletePartner] Error deleting users doc", { err });
    }

    // Delete Firebase Auth
    try {
      await getAuth().deleteUser(partnerId);
      deletionSummary.push("Firebase Auth deleted");
    } catch (authErr) {
      logger.warn("[adminDeletePartner] Could not delete auth user", { partnerId, authErr });
    }

    // Audit log
    await db.collection("admin_audit_logs").add({
      action: "partner_deleted",
      targetId: partnerId,
      targetType: "partner",
      performedBy: adminId,
      timestamp: Timestamp.now(),
      details: {
        partnerName: partner?.companyName || partner?.name || "",
        partnerEmail: partner?.email || "",
        reason: reason || "No reason provided",
        deletionSummary,
        deletedSubDocs: deletedCount,
      },
    });

    logger.info("[adminDeletePartner] Partner deleted", {
      partnerId,
      adminId,
      deletionSummary,
    });

    return {
      success: true,
      message: `Partenaire supprime. ${deletionSummary.join(", ")}`,
      deletedSubDocs: deletedCount,
    };
  }
);
