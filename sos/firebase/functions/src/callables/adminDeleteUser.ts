/**
 * adminDeleteUser - Universal user deletion from admin panel
 *
 * Handles ALL roles: client, lawyer, expat, admin, chatter, blogger,
 * influencer, groupAdmin, partner.
 *
 * Deletes: Firebase Auth + Firestore user doc + sos_profiles + all
 * role-specific sub-collections with batch chunking.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { adminConfig, ALLOWED_ORIGINS } from "../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

async function assertAdmin(auth: { uid: string; token?: Record<string, unknown> } | undefined): Promise<string> {
  if (!auth) throw new HttpsError("unauthenticated", "Authentication required");
  const role = auth.token?.role as string | undefined;
  if (role === "admin" || role === "superadmin") return auth.uid;
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || !["admin", "superadmin"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  return auth.uid;
}

/** Batch-delete all docs in a collection matching a field value (max 500 per batch) */
async function deleteCollectionDocs(collectionName: string, fieldName: string, fieldValue: string): Promise<number> {
  const db = getFirestore();
  let totalDeleted = 0;
  let querySnap = await db.collection(collectionName).where(fieldName, "==", fieldValue).limit(500).get();
  while (!querySnap.empty) {
    const batch = db.batch();
    querySnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += querySnap.size;
    if (querySnap.size < 500) break;
    querySnap = await db.collection(collectionName).where(fieldName, "==", fieldValue).limit(500).get();
  }
  return totalDeleted;
}

/** Role-specific collection mappings: [collectionName, fieldName] */
function getCollectionsForRole(role: string): Array<[string, string]> {
  const common: Array<[string, string]> = [
    ["payment_withdrawals", "userId"],
    ["payment_methods", "userId"],
    ["affiliate_notifications", "userId"],
  ];

  switch (role) {
    case "chatter":
      return [
        ...common,
        ["chatter_commissions", "chatterId"],
        ["chatter_withdrawals", "chatterId"],
        ["chatter_recruitment_links", "chatterId"],
        ["chatter_badge_awards", "chatterId"],
        ["chatter_quiz_attempts", "chatterId"],
        ["chatter_notifications", "chatterId"],
        ["chatter_referral_commissions", "parrainId"],
        ["chatter_recruited_chatters", "recruiterId"],
        ["chatter_recruited_providers", "chatterId"],
        ["chatter_affiliate_clicks", "chatterId"],
        ["chatter_posts", "chatterId"],
        ["chatter_zoom_attendances", "chatterId"],
        ["chatter_referral_fraud_alerts", "chatterId"],
        ["chatter_training_certificates", "chatterId"],
        ["chatter_tier_bonuses_history", "chatterId"],
        ["chatter_fraud_reviews", "chatterId"],
        ["chatter_ip_registry", "chatterId"],
        ["telegram_onboarding_links", "chatterId"],
      ];

    case "blogger":
      return [
        ...common,
        ["blogger_commissions", "bloggerId"],
        ["blogger_notifications", "bloggerId"],
        ["blogger_recruited_providers", "bloggerId"],
        ["blogger_affiliate_clicks", "bloggerId"],
        ["blogger_articles", "bloggerId"],
        ["blogger_withdrawals", "bloggerId"],
        ["blogger_badge_awards", "bloggerId"],
        ["blogger_referrals", "bloggerId"],
        ["telegram_onboarding_links", "bloggerId"],
      ];

    case "influencer":
      return [
        ...common,
        ["influencer_commissions", "influencerId"],
        ["influencer_notifications", "influencerId"],
        ["influencer_recruited_providers", "influencerId"],
        ["influencer_affiliate_clicks", "influencerId"],
        ["influencer_referrals", "influencerId"],
        ["influencer_withdrawals", "influencerId"],
        ["influencer_training_progress", "influencerId"],
        ["influencer_badge_awards", "influencerId"],
        ["telegram_onboarding_links", "influencerId"],
      ];

    case "groupAdmin":
      return [
        ...common,
        ["group_admin_commissions", "groupAdminId"],
        ["group_admin_notifications", "groupAdminId"],
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
        ["telegram_onboarding_links", "groupAdminId"],
      ];

    case "partner":
      return [
        ...common,
        ["partner_commissions", "partnerId"],
        ["partner_notifications", "partnerId"],
        ["partner_affiliate_clicks", "partnerId"],
        ["partner_widgets", "partnerId"],
        ["partner_applications", "partnerId"],
      ];

    default:
      // client, lawyer, expat, admin
      return [
        ...common,
        ["call_history", "clientId"],
        ["call_history", "providerId"],
        ["reviews", "clientId"],
        ["reviews", "providerId"],
      ];
  }
}

/** Get the main role collection name (e.g. chatters, bloggers) */
function getRoleCollection(role: string): string | null {
  const map: Record<string, string> = {
    chatter: "chatters",
    blogger: "bloggers",
    influencer: "influencers",
    groupAdmin: "group_admins",
    partner: "partners",
  };
  return map[role] || null;
}

export const adminDeleteUser = onCall(
  {
    ...adminConfig,
    timeoutSeconds: 120,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{
    success: boolean;
    message: string;
    deletedSubDocs: number;
    role: string;
  }> => {
    ensureInitialized();
    const adminId = await assertAdmin(request.auth);

    const { userId, reason } = request.data as { userId: string; reason?: string };
    if (!userId) throw new HttpsError("invalid-argument", "userId is required");
    if (userId === adminId) throw new HttpsError("failed-precondition", "Cannot delete your own account");

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) throw new HttpsError("not-found", `User ${userId} not found`);

    const userData = userDoc.data()!;
    const role = (userData.role as string) || "unknown";
    const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email || userId;

    logger.info("[adminDeleteUser] Starting deletion", { userId, role, adminId });

    const deletionSummary: string[] = [];
    let deletedCount = 0;

    try {
      // 1. Cancel pending withdrawals
      const pendingStatuses = ["pending", "validating", "approved", "queued", "processing", "sent"];
      const pendingSnap = await db.collection("payment_withdrawals")
        .where("userId", "==", userId)
        .where("status", "in", pendingStatuses)
        .get();

      if (!pendingSnap.empty) {
        const batch = db.batch();
        pendingSnap.docs.forEach((d) => {
          batch.update(d.ref, {
            status: "cancelled",
            cancelledAt: Timestamp.now(),
            cancelledBy: adminId,
            cancelReason: "Account deleted by admin",
          });
        });
        await batch.commit();
        deletionSummary.push(`${pendingSnap.size} retraits annulés`);
      }

      // Also cancel legacy chatter withdrawals if chatter
      if (role === "chatter") {
        const legacyStatuses = ["pending", "approved", "processing"];
        for (const status of legacyStatuses) {
          const snap = await db.collection("chatter_withdrawals")
            .where("chatterId", "==", userId)
            .where("status", "==", status)
            .get();
          if (!snap.empty) {
            const batch = db.batch();
            snap.docs.forEach((d) => {
              batch.update(d.ref, {
                status: "cancelled",
                cancelledAt: Timestamp.now(),
                cancelledBy: adminId,
                cancelReason: "Account deleted by admin",
              });
            });
            await batch.commit();
            deletionSummary.push(`chatter_withdrawals (${status}): ${snap.size} annulés`);
          }
        }
      }

      // 2. Delete role-specific collections
      const collections = getCollectionsForRole(role);
      for (const [collectionName, fieldName] of collections) {
        try {
          const count = await deleteCollectionDocs(collectionName, fieldName, userId);
          if (count > 0) {
            deletedCount += count;
            deletionSummary.push(`${collectionName}: ${count} docs`);
          }
        } catch (err) {
          logger.warn(`[adminDeleteUser] Error cleaning ${collectionName}`, { err });
        }
      }

      // 3. Chatter-specific: reverse referral lookups + doc-based collections
      if (role === "chatter") {
        // Reverse referral
        try {
          const count = await deleteCollectionDocs("chatter_referral_commissions", "filleulId", userId);
          if (count > 0) {
            deletedCount += count;
            deletionSummary.push(`chatter_referral_commissions (filleul): ${count} docs`);
          }
        } catch (err) {
          logger.warn("[adminDeleteUser] Error deleting reverse referrals", { err });
        }

        // Doc-based: chatter_call_counts
        try {
          const callCountDoc = await db.collection("chatter_call_counts").doc(userId).get();
          if (callCountDoc.exists) {
            await db.collection("chatter_call_counts").doc(userId).delete();
            deletionSummary.push("chatter_call_counts: 1 doc");
            deletedCount++;
          }
        } catch (err) {
          logger.warn("[adminDeleteUser] Error deleting chatter_call_counts", { err });
        }

        // chatter_training_progress + subcollection modules
        try {
          const progressRef = db.collection("chatter_training_progress").doc(userId);
          const modulesSnap = await progressRef.collection("modules").get();
          if (!modulesSnap.empty) {
            const batch = db.batch();
            modulesSnap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            deletionSummary.push(`chatter_training_progress/modules: ${modulesSnap.size} docs`);
            deletedCount += modulesSnap.size;
          }
          const progressDoc = await progressRef.get();
          if (progressDoc.exists) {
            await progressRef.delete();
            deletionSummary.push("chatter_training_progress: 1 doc");
            deletedCount++;
          }
        } catch (err) {
          logger.warn("[adminDeleteUser] Error deleting training progress", { err });
        }
      }

      // 4. Delete sos_profiles (for providers)
      try {
        const profileDoc = await db.collection("sos_profiles").doc(userId).get();
        if (profileDoc.exists) {
          await db.collection("sos_profiles").doc(userId).delete();
          deletionSummary.push("sos_profiles: 1 doc");
          deletedCount++;
        }
      } catch (err) {
        logger.warn("[adminDeleteUser] Error deleting sos_profiles", { err });
      }

      // 5. Delete role-specific main doc (chatters, bloggers, etc.)
      const roleCollection = getRoleCollection(role);
      if (roleCollection) {
        try {
          const roleDoc = await db.collection(roleCollection).doc(userId).get();
          if (roleDoc.exists) {
            // Delete subcollections (e.g., fcmTokens)
            try {
              const fcmSnap = await db.collection(roleCollection).doc(userId).collection("fcmTokens").get();
              if (!fcmSnap.empty) {
                const batch = db.batch();
                fcmSnap.docs.forEach((d) => batch.delete(d.ref));
                await batch.commit();
                deletionSummary.push(`${roleCollection}/fcmTokens: ${fcmSnap.size} docs`);
                deletedCount += fcmSnap.size;
              }
            } catch (_) { /* ignore */ }

            await db.collection(roleCollection).doc(userId).delete();
            deletionSummary.push(`${roleCollection}: 1 doc`);
            deletedCount++;
          }
        } catch (err) {
          logger.warn(`[adminDeleteUser] Error deleting ${roleCollection} doc`, { err });
        }
      }

      // 6. Delete users doc
      await db.collection("users").doc(userId).delete();
      deletionSummary.push("users: 1 doc");
      deletedCount++;

      // 7. Delete Firebase Auth
      try {
        await getAuth().deleteUser(userId);
        deletionSummary.push("Firebase Auth deleted");
      } catch (authErr) {
        logger.warn("[adminDeleteUser] Could not delete auth user", { userId, authErr });
      }

      // 8. Audit log
      await db.collection("admin_audit_logs").add({
        action: `${role}_deleted`,
        targetId: userId,
        targetType: role,
        performedBy: adminId,
        timestamp: Timestamp.now(),
        details: {
          userName,
          userEmail: userData.email || "",
          reason: reason || "No reason provided",
          deletionSummary,
          deletedSubDocs: deletedCount,
        },
      });

      logger.info("[adminDeleteUser] User deleted successfully", {
        userId, role, adminId, deletedCount, summary: deletionSummary,
      });

      return {
        success: true,
        message: `"${userName}" supprimé avec succès. ${deletionSummary.length} opérations effectuées.`,
        deletedSubDocs: deletedCount,
        role,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminDeleteUser] Unexpected error", { userId, role, error });
      throw new HttpsError("internal", `Échec de la suppression: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);
