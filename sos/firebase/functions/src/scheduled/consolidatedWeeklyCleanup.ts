/**
 * Consolidated Weekly Cleanup (Sunday 3h Paris)
 *
 * Replaces 3 separate scheduled functions to reduce Cloud Run memory quota in europe-west3:
 * - cleanupOldPaymentAlerts (monitoring/paymentMonitoring.ts) - was Sunday 3h
 * - cleanupFunctionalData (monitoring/functionalMonitoring.ts) - was Sunday 4h
 * - cleanupOldAlerts (monitoring/criticalAlerts.ts) - was 1st of month 5h (safe to run weekly)
 *
 * Each handler runs independently with its own try/catch.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

export const consolidatedWeeklyCleanup = onSchedule(
  {
    schedule: "0 3 * * 0", // Dimanche 3h Paris
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    const startTime = Date.now();
    logger.info("[ConsolidatedWeeklyCleanup] Starting...");

    // 1. Payment alerts cleanup
    try {
      const { cleanupOldPaymentAlertsHandler } = await import(
        "../monitoring/paymentMonitoring"
      );
      await cleanupOldPaymentAlertsHandler();
      logger.info("[ConsolidatedWeeklyCleanup] cleanupOldPaymentAlerts completed");
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] cleanupOldPaymentAlerts failed:", error);
    }

    // 2. Functional data cleanup
    try {
      const { cleanupFunctionalDataHandler } = await import(
        "../monitoring/functionalMonitoring"
      );
      await cleanupFunctionalDataHandler();
      logger.info("[ConsolidatedWeeklyCleanup] cleanupFunctionalData completed");
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] cleanupFunctionalData failed:", error);
    }

    // 3. Old monitoring alerts cleanup (was monthly, safe to run weekly)
    try {
      const { cleanupOldAlertsHandler } = await import(
        "../monitoring/criticalAlerts"
      );
      await cleanupOldAlertsHandler();
      logger.info("[ConsolidatedWeeklyCleanup] cleanupOldAlerts completed");
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] cleanupOldAlerts failed:", error);
    }

    // 4. P2-4 FIX: Cleanup stale FCM tokens (>90 days unused)
    try {
      const admin = await import("firebase-admin");
      const db = admin.default.firestore();
      const cutoff = admin.default.firestore.Timestamp.fromMillis(
        Date.now() - 90 * 24 * 60 * 60 * 1000
      );
      const usersSnap = await db.collection("fcm_tokens").listDocuments();
      let deletedTokens = 0;

      for (const userDocRef of usersSnap) {
        const staleTokens = await userDocRef
          .collection("tokens")
          .where("lastUsedAt", "<", cutoff)
          .limit(50)
          .get();

        if (!staleTokens.empty) {
          const batch = db.batch();
          staleTokens.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          deletedTokens += staleTokens.size;
        }
      }

      logger.info("[ConsolidatedWeeklyCleanup] FCM token cleanup completed", {
        deletedTokens,
      });
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] FCM token cleanup failed:", error);
    }

    // 5. P2-7 FIX: Cleanup old DLQ entries (>90 days)
    try {
      const admin = await import("firebase-admin");
      const db = admin.default.firestore();
      const dlqCutoff = admin.default.firestore.Timestamp.fromMillis(
        Date.now() - 90 * 24 * 60 * 60 * 1000
      );
      const oldDlq = await db
        .collection("notification_dlq")
        .where("movedToDLQAt", "<", dlqCutoff)
        .limit(100)
        .get();

      if (!oldDlq.empty) {
        const batch = db.batch();
        oldDlq.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        logger.info("[ConsolidatedWeeklyCleanup] DLQ cleanup completed", {
          deleted: oldDlq.size,
        });
      } else {
        logger.info("[ConsolidatedWeeklyCleanup] DLQ cleanup: nothing to clean");
      }
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] DLQ cleanup failed:", error);
    }

    // 6. P3-2 FIX: Cleanup abandoned booking_requests (status "pending" > 24h)
    try {
      const admin = await import("firebase-admin");
      const db = admin.default.firestore();
      const bookingCutoff = admin.default.firestore.Timestamp.fromMillis(
        Date.now() - 24 * 60 * 60 * 1000 // 24 heures
      );
      const abandonedBookings = await db
        .collection("booking_requests")
        .where("status", "==", "pending")
        .where("createdAt", "<", bookingCutoff)
        .limit(200)
        .get();

      if (!abandonedBookings.empty) {
        const batch = db.batch();
        abandonedBookings.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        logger.info("[ConsolidatedWeeklyCleanup] Abandoned booking_requests cleanup completed", {
          deleted: abandonedBookings.size,
        });
      } else {
        logger.info("[ConsolidatedWeeklyCleanup] Abandoned booking_requests: nothing to clean");
      }
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] Abandoned booking_requests cleanup failed:", error);
    }

    // 7. P3-03 FIX: Cleanup old read notifications (>90 days) across all affiliate types
    try {
      const admin = await import("firebase-admin");
      const db = admin.default.firestore();
      const notifCutoff = admin.default.firestore.Timestamp.fromMillis(
        Date.now() - 90 * 24 * 60 * 60 * 1000 // 90 days
      );
      const notificationCollections = [
        "chatter_notifications",
        "influencer_notifications",
        "blogger_notifications",
        "group_admin_notifications",
        "affiliate_notifications",
      ];
      let totalDeletedNotifs = 0;

      for (const collName of notificationCollections) {
        try {
          const oldNotifs = await db
            .collection(collName)
            .where("isRead", "==", true)
            .where("createdAt", "<", notifCutoff)
            .limit(200)
            .get();

          if (!oldNotifs.empty) {
            // Firestore batch limit is 500, we're safe with 200
            const batch = db.batch();
            oldNotifs.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => batch.delete(doc.ref));
            await batch.commit();
            totalDeletedNotifs += oldNotifs.size;
          }
        } catch (collError) {
          // Collection may not exist yet, skip silently
          logger.warn(`[ConsolidatedWeeklyCleanup] ${collName} cleanup skipped`, { error: collError });
        }
      }

      logger.info("[ConsolidatedWeeklyCleanup] Old notifications cleanup completed", {
        totalDeletedNotifs,
      });
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] Notifications cleanup failed:", error);
    }

    // 8. P3-02 FIX: Balance reconciliation check for affiliate accounts
    try {
      const admin = await import("firebase-admin");
      const db = admin.default.firestore();
      const reconciliationIssues: Array<{ userId: string; role: string; expected: number; actual: number; diff: number }> = [];

      const affiliateRoles = [
        { collection: "chatters", commissions: "chatter_commissions", withdrawals: "chatter_withdrawals", role: "chatter" },
        { collection: "influencers", commissions: "influencer_commissions", withdrawals: "influencer_withdrawals", role: "influencer" },
        { collection: "bloggers", commissions: "blogger_commissions", withdrawals: "blogger_withdrawals", role: "blogger" },
        { collection: "group_admins", commissions: "group_admin_commissions", withdrawals: "group_admin_withdrawals", role: "groupAdmin" },
      ];

      for (const { collection, commissions, withdrawals, role } of affiliateRoles) {
        try {
          // Sample top 10 accounts by balance (not exhaustive, just sanity check)
          const topAccounts = await db
            .collection(collection)
            .where("availableBalance", ">", 0)
            .orderBy("availableBalance", "desc")
            .limit(10)
            .get();

          for (const accountDoc of topAccounts.docs) {
            const account = accountDoc.data();
            const userId = accountDoc.id;
            const reportedBalance = account.availableBalance || 0;

            // Sum validated/released commissions
            const commissionsSnap = await db
              .collection(commissions)
              .where("chatterId", "==", userId)
              .where("status", "in", ["validated", "released"])
              .get();
            // Fallback: try userId field if chatterId doesn't match the role
            let totalCommissions = 0;
            if (commissionsSnap.empty) {
              const altSnap = await db
                .collection(commissions)
                .where("userId", "==", userId)
                .where("status", "in", ["validated", "released"])
                .get();
              totalCommissions = altSnap.docs.reduce((sum: number, d: FirebaseFirestore.QueryDocumentSnapshot) => sum + (d.data().amount || 0), 0);
            } else {
              totalCommissions = commissionsSnap.docs.reduce((sum: number, d: FirebaseFirestore.QueryDocumentSnapshot) => sum + (d.data().amount || 0), 0);
            }

            // Sum completed withdrawals
            const withdrawalsSnap = await db
              .collection(withdrawals)
              .where("userId", "==", userId)
              .where("status", "==", "completed")
              .get();
            const totalWithdrawn = withdrawalsSnap.docs.reduce((sum: number, d: FirebaseFirestore.QueryDocumentSnapshot) => sum + (d.data().totalDebited || d.data().amount || 0), 0);

            const expectedBalance = totalCommissions - totalWithdrawn;
            const diff = Math.abs(reportedBalance - expectedBalance);

            // Flag if difference exceeds $5 (500 cents)
            if (diff > 500) {
              reconciliationIssues.push({
                userId,
                role,
                expected: expectedBalance,
                actual: reportedBalance,
                diff,
              });
            }
          }
        } catch (roleError) {
          logger.warn(`[ConsolidatedWeeklyCleanup] ${role} reconciliation skipped`, { error: roleError });
        }
      }

      if (reconciliationIssues.length > 0) {
        // Write alert for admin review
        const alertRef = db.collection("admin_alerts").doc();
        await alertRef.set({
          id: alertRef.id,
          type: "balance_reconciliation",
          priority: reconciliationIssues.length >= 5 ? "high" : "medium",
          title: `Balance reconciliation: ${reconciliationIssues.length} mismatch(es)`,
          details: reconciliationIssues.slice(0, 20),
          status: "pending",
          createdAt: admin.default.firestore.Timestamp.now(),
        });
        logger.warn("[ConsolidatedWeeklyCleanup] Balance reconciliation issues found", {
          count: reconciliationIssues.length,
          issues: reconciliationIssues.slice(0, 5),
        });
      } else {
        logger.info("[ConsolidatedWeeklyCleanup] Balance reconciliation: all clean");
      }
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] Balance reconciliation failed:", error);
    }

    logger.info(
      `[ConsolidatedWeeklyCleanup] All tasks completed in ${Date.now() - startTime}ms`
    );
  }
);
