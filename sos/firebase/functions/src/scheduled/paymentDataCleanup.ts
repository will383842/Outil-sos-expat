/**
 * paymentDataCleanup.ts
 *
 * Scheduled function for cleaning up payment-related data:
 * - #1: TTL sur payment_locks (expired locks > 1 hour)
 * - #3: PayPal Order expirée (orders pending > 24h)
 * - #13: Archivage données paiement (> 90 days)
 *
 * Runs every 6 hours
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";

// Configuration
const CLEANUP_CONFIG = {
  PAYMENT_LOCK_TTL_HOURS: 1,        // Locks older than 1 hour
  PAYPAL_ORDER_TTL_HOURS: 24,       // Pending orders older than 24 hours
  ARCHIVE_DAYS: 90,                  // Archive data older than 90 days
  BATCH_SIZE: 500,                   // Firestore batch limit
};

/**
 * Scheduled cleanup function - runs every 6 hours
 */
export const paymentDataCleanup = onSchedule(
  {
    schedule: "0 */6 * * *", // Every 6 hours
    region: "europe-west3",
    timeZone: "Europe/Paris",
    timeoutSeconds: 540,
    memory: "256MiB",  // FIX: 512MiB needs cpu>=0.5, reduced to 256MiB
    cpu: 0.083,
  },
  async () => {
    console.log("🧹 [PaymentCleanup] Starting scheduled cleanup...");
    const db = admin.firestore();

    const results = {
      paymentLocks: { deleted: 0, errors: 0 },
      paypalOrders: { expired: 0, errors: 0 },
      archived: { payments: 0, callSessions: 0, errors: 0 },
    };

    try {
      // #1: Clean up expired payment locks
      await cleanupPaymentLocks(db, results);

      // #3: Mark expired PayPal orders
      await cleanupExpiredPaypalOrders(db, results);

      // #13: Archive old payment data (move to archive collections)
      await archiveOldPaymentData(db, results);

      console.log("✅ [PaymentCleanup] Cleanup completed:", results);

      // Log summary to admin_alerts if significant cleanup occurred
      const totalCleaned = results.paymentLocks.deleted + results.paypalOrders.expired + results.archived.payments;
      if (totalCleaned > 0) {
        await db.collection("admin_alerts").add({
          type: "payment_cleanup_completed",
          priority: "low",
          title: "Nettoyage données paiement effectué",
          message: `Locks: ${results.paymentLocks.deleted}, Orders expirées: ${results.paypalOrders.expired}, Archivées: ${results.archived.payments}`,
          results,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("❌ [PaymentCleanup] Cleanup failed:", error);
      await logError("paymentDataCleanup", error);
    }
  }
);

/**
 * #1: Clean up expired payment locks (older than 1 hour)
 */
async function cleanupPaymentLocks(
  db: admin.firestore.Firestore,
  results: { paymentLocks: { deleted: number; errors: number } }
): Promise<void> {
  const cutoffTime = new Date(Date.now() - CLEANUP_CONFIG.PAYMENT_LOCK_TTL_HOURS * 60 * 60 * 1000);

  console.log(`🔒 [PaymentCleanup] Cleaning locks older than ${cutoffTime.toISOString()}`);

  try {
    const expiredLocks = await db
      .collection("payment_locks")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffTime))
      .limit(CLEANUP_CONFIG.BATCH_SIZE)
      .get();

    if (expiredLocks.empty) {
      console.log("🔒 [PaymentCleanup] No expired payment locks found");
      return;
    }

    const batch = db.batch();
    expiredLocks.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    results.paymentLocks.deleted = expiredLocks.size;
    console.log(`🔒 [PaymentCleanup] Deleted ${expiredLocks.size} expired payment locks`);
  } catch (error) {
    console.error("❌ [PaymentCleanup] Error cleaning payment locks:", error);
    results.paymentLocks.errors++;
  }
}

/**
 * #3: Mark expired PayPal orders (pending > 24 hours)
 */
async function cleanupExpiredPaypalOrders(
  db: admin.firestore.Firestore,
  results: { paypalOrders: { expired: number; errors: number } }
): Promise<void> {
  const cutoffTime = new Date(Date.now() - CLEANUP_CONFIG.PAYPAL_ORDER_TTL_HOURS * 60 * 60 * 1000);

  console.log(`💳 [PaymentCleanup] Marking PayPal orders older than ${cutoffTime.toISOString()}`);

  try {
    // Find pending PayPal orders older than 24 hours
    const expiredOrders = await db
      .collection("paypal_orders")
      .where("status", "in", ["CREATED", "SAVED", "APPROVED", "PENDING"])
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffTime))
      .limit(CLEANUP_CONFIG.BATCH_SIZE)
      .get();

    if (expiredOrders.empty) {
      console.log("💳 [PaymentCleanup] No expired PayPal orders found");
      return;
    }

    const batch = db.batch();
    expiredOrders.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "EXPIRED",
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        expiredReason: "Order not completed within 24 hours",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    results.paypalOrders.expired = expiredOrders.size;
    console.log(`💳 [PaymentCleanup] Marked ${expiredOrders.size} PayPal orders as expired`);
  } catch (error) {
    console.error("❌ [PaymentCleanup] Error marking expired PayPal orders:", error);
    results.paypalOrders.errors++;
  }
}

/**
 * #13: Archive old payment data (> 90 days)
 * Moves completed payments to archive collection for GDPR compliance
 */
async function archiveOldPaymentData(
  db: admin.firestore.Firestore,
  results: { archived: { payments: number; callSessions: number; errors: number } }
): Promise<void> {
  const cutoffTime = new Date(Date.now() - CLEANUP_CONFIG.ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

  console.log(`📦 [PaymentCleanup] Archiving data older than ${cutoffTime.toISOString()}`);

  try {
    // Archive old completed payments
    const oldPayments = await db
      .collection("payments")
      .where("status", "in", ["captured", "succeeded", "refunded"])
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffTime))
      .limit(CLEANUP_CONFIG.BATCH_SIZE)
      .get();

    if (!oldPayments.empty) {
      const batch = db.batch();

      for (const doc of oldPayments.docs) {
        const data = doc.data();

        // Create archived version with anonymized sensitive data
        const archivedData = {
          ...data,
          // Anonymize PII
          clientId: data.clientId ? `archived_${data.clientId.substring(0, 8)}` : null,
          providerId: data.providerId ? `archived_${data.providerId.substring(0, 8)}` : null,
          // Keep financial data for accounting
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          // Add archive metadata
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
          originalId: doc.id,
          originalCreatedAt: data.createdAt,
        };

        // Add to archive collection
        const archiveRef = db.collection("payments_archive").doc(doc.id);
        batch.set(archiveRef, archivedData);

        // Mark original as archived (don't delete for audit trail)
        batch.update(doc.ref, {
          archived: true,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      results.archived.payments = oldPayments.size;
      console.log(`📦 [PaymentCleanup] Archived ${oldPayments.size} old payments`);
    }
  } catch (error) {
    console.error("❌ [PaymentCleanup] Error archiving payment data:", error);
    results.archived.errors++;
  }
}
