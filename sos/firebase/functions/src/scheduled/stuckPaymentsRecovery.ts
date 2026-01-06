/**
 * stuckPaymentsRecovery.ts
 *
 * P0-2 FIX: Scheduled function to recover stuck payments
 *
 * Problem: With capture_method: 'manual', if TwilioCallManager.capturePayment() fails
 * silently, payments can remain stuck in 'requires_capture' indefinitely.
 *
 * Solution: This scheduled function runs every 30 minutes to:
 * 1. Find payments stuck in 'requires_capture' for more than 10 minutes
 * 2. Check if the call session is completed - if so, capture the payment
 * 3. Find payments stuck in 'requires_capture' for more than 24 hours - refund them
 * 4. Alert admins about stuck payments
 *
 * Runs every 30 minutes
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret, defineString } from "firebase-functions/params";
import Stripe from "stripe";
import { logError } from "../utils/logs/logError";
import { syncPaymentStatus } from "../utils/paymentSync";
// P0 FIX: Import stuck transfers recovery
import { recoverStuckTransfers } from "../PendingTransferProcessor";

// Secrets
const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");
// Note: STRIPE_MODE is a string param, not a secret
const STRIPE_MODE = defineString("STRIPE_MODE");

// Configuration
const RECOVERY_CONFIG = {
  // Payments stuck for more than 10 minutes with completed call = auto-capture
  CAPTURE_THRESHOLD_MINUTES: 10,
  // Payments stuck for more than 24 hours without completed call = auto-refund
  REFUND_THRESHOLD_HOURS: 24,
  // Maximum payments to process per run
  BATCH_SIZE: 50,
  // Minimum call duration for capture (seconds)
  MIN_CALL_DURATION: 120,
};

/**
 * Get Stripe instance based on mode
 */
function getStripeInstance(): Stripe {
  const mode = STRIPE_MODE.value() || "test";
  const secretKey = mode === "live"
    ? STRIPE_SECRET_KEY_LIVE.value()
    : STRIPE_SECRET_KEY_TEST.value();

  return new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });
}

/**
 * Scheduled function - runs every 30 minutes
 */
export const stuckPaymentsRecovery = onSchedule(
  {
    schedule: "*/30 * * * *", // Every 30 minutes
    region: "europe-west1",
    timeZone: "Europe/Paris",
    timeoutSeconds: 300,
    memory: "512MiB",
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
  },
  async () => {
    console.log("🔧 [StuckPayments] Starting stuck payments recovery...");
    const db = admin.firestore();

    const results = {
      captured: 0,
      refunded: 0,
      alerted: 0,
      errors: 0,
      // P0 FIX: Add stuck transfers recovery results
      transfersRecovered: 0,
      transfersSucceeded: 0,
      transfersFailed: 0,
    };

    try {
      // 1. Find and capture payments for completed calls
      await captureCompletedCallPayments(db, results);

      // 2. Find and refund very old stuck payments
      await refundOldStuckPayments(db, results);

      // 3. Alert about remaining stuck payments
      await alertStuckPayments(db, results);

      // 4. P0 FIX: Recover stuck pending_transfers (in "processing" for > 1 hour)
      try {
        const transferResults = await recoverStuckTransfers(db);
        results.transfersRecovered = transferResults.recovered;
        results.transfersSucceeded = transferResults.succeeded;
        results.transfersFailed = transferResults.failed;
        console.log("🔄 [StuckPayments] Stuck transfers recovery:", transferResults);
      } catch (transferError) {
        console.error("❌ [StuckPayments] Stuck transfers recovery failed:", transferError);
        results.errors++;
      }

      console.log("✅ [StuckPayments] Recovery completed:", results);

      // Log summary if any action was taken
      const hasPaymentActions = results.captured > 0 || results.refunded > 0 || results.alerted > 0;
      const hasTransferActions = results.transfersRecovered > 0;

      if (hasPaymentActions || hasTransferActions) {
        await db.collection("admin_alerts").add({
          type: "stuck_payments_recovery",
          priority: results.refunded > 0 || results.transfersFailed > 0 ? "high" : "medium",
          title: "Récupération paiements/transferts bloqués",
          message: `Paiements - Capturés: ${results.captured}, Remboursés: ${results.refunded}, Alertes: ${results.alerted}. ` +
            `Transferts - Récupérés: ${results.transfersRecovered}, Réussis: ${results.transfersSucceeded}, Échoués: ${results.transfersFailed}`,
          results,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("❌ [StuckPayments] Recovery failed:", error);
      await logError("stuckPaymentsRecovery", error);
    }
  }
);

/**
 * Find payments stuck in requires_capture where the call is completed
 * and capture them automatically
 */
async function captureCompletedCallPayments(
  db: admin.firestore.Firestore,
  results: { captured: number; errors: number }
): Promise<void> {
  const cutoffTime = new Date(
    Date.now() - RECOVERY_CONFIG.CAPTURE_THRESHOLD_MINUTES * 60 * 1000
  );

  console.log(`💳 [StuckPayments] Looking for stuck payments older than ${cutoffTime.toISOString()}`);

  try {
    // Find payments in requires_capture status
    const stuckPayments = await db
      .collection("payments")
      .where("status", "==", "requires_capture")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffTime))
      .limit(RECOVERY_CONFIG.BATCH_SIZE)
      .get();

    if (stuckPayments.empty) {
      console.log("💳 [StuckPayments] No stuck payments found for capture");
      return;
    }

    console.log(`💳 [StuckPayments] Found ${stuckPayments.size} stuck payments to evaluate`);
    const stripe = getStripeInstance();

    for (const paymentDoc of stuckPayments.docs) {
      const paymentData = paymentDoc.data();
      const paymentIntentId = paymentData.paymentIntentId || paymentDoc.id;

      try {
        // Find the associated call session
        const sessionQuery = await db
          .collection("call_sessions")
          .where("paymentId", "==", paymentDoc.id)
          .limit(1)
          .get();

        // Also try by payment.intentId (legacy)
        let sessionData: admin.firestore.DocumentData | null = null;
        let sessionId: string | null = null;

        if (!sessionQuery.empty) {
          sessionData = sessionQuery.docs[0].data();
          sessionId = sessionQuery.docs[0].id;
        } else {
          const legacyQuery = await db
            .collection("call_sessions")
            .where("payment.intentId", "==", paymentIntentId)
            .limit(1)
            .get();
          if (!legacyQuery.empty) {
            sessionData = legacyQuery.docs[0].data();
            sessionId = legacyQuery.docs[0].id;
          }
        }

        if (!sessionData) {
          console.warn(`⚠️ [StuckPayments] No session found for payment ${paymentDoc.id}`);
          continue;
        }

        // Check if call is completed and meets minimum duration
        const isCompleted = sessionData.status === "completed";
        const duration = sessionData.actualDuration || sessionData.duration || 0;
        const meetsMinDuration = duration >= RECOVERY_CONFIG.MIN_CALL_DURATION;

        if (isCompleted && meetsMinDuration) {
          console.log(`💳 [StuckPayments] Capturing payment ${paymentIntentId} for completed call ${sessionId}`);

          // Verify with Stripe that it's still capturable
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

          if (paymentIntent.status === "requires_capture") {
            // Capture the payment
            await stripe.paymentIntents.capture(paymentIntentId);

            // Update Firestore
            await syncPaymentStatus(db, paymentDoc.id, sessionId, {
              status: "captured",
              capturedAt: admin.firestore.FieldValue.serverTimestamp(),
              capturedBy: "stuck_payments_recovery",
              recoveryReason: "Call completed but capture was stuck",
            });

            results.captured++;
            console.log(`✅ [StuckPayments] Successfully captured ${paymentIntentId}`);
          } else {
            console.log(`ℹ️ [StuckPayments] Payment ${paymentIntentId} is now ${paymentIntent.status}`);
            // Update our status to match Stripe
            await db.collection("payments").doc(paymentDoc.id).update({
              status: paymentIntent.status === "succeeded" ? "captured" : paymentIntent.status,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              syncedFromStripe: true,
            });
          }
        }
      } catch (error) {
        console.error(`❌ [StuckPayments] Error processing payment ${paymentDoc.id}:`, error);
        results.errors++;
      }
    }
  } catch (error) {
    console.error("❌ [StuckPayments] Error in captureCompletedCallPayments:", error);
    results.errors++;
  }
}

/**
 * Find very old stuck payments (> 24 hours) and refund them
 * This prevents money from being held indefinitely
 */
async function refundOldStuckPayments(
  db: admin.firestore.Firestore,
  results: { refunded: number; errors: number }
): Promise<void> {
  const cutoffTime = new Date(
    Date.now() - RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS * 60 * 60 * 1000
  );

  console.log(`💸 [StuckPayments] Looking for very old stuck payments (> 24h)`);

  try {
    const veryOldPayments = await db
      .collection("payments")
      .where("status", "==", "requires_capture")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffTime))
      .limit(RECOVERY_CONFIG.BATCH_SIZE)
      .get();

    if (veryOldPayments.empty) {
      console.log("💸 [StuckPayments] No very old stuck payments found");
      return;
    }

    console.log(`💸 [StuckPayments] Found ${veryOldPayments.size} very old stuck payments`);
    const stripe = getStripeInstance();

    for (const paymentDoc of veryOldPayments.docs) {
      const paymentData = paymentDoc.data();
      const paymentIntentId = paymentData.paymentIntentId || paymentDoc.id;

      try {
        // Check with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === "requires_capture") {
          console.log(`💸 [StuckPayments] Canceling/refunding very old payment ${paymentIntentId}`);

          // Cancel the payment intent (this releases the hold on the customer's card)
          await stripe.paymentIntents.cancel(paymentIntentId, {
            cancellation_reason: "abandoned",
          });

          // Find and update the call session
          const sessionQuery = await db
            .collection("call_sessions")
            .where("paymentId", "==", paymentDoc.id)
            .limit(1)
            .get();

          const sessionId = !sessionQuery.empty ? sessionQuery.docs[0].id : null;

          // Update Firestore
          await syncPaymentStatus(db, paymentDoc.id, sessionId, {
            status: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: "stuck_payments_recovery",
            cancellationReason: "Payment stuck for more than 24 hours without completed call",
          });

          // Also update call session status if exists
          if (sessionId) {
            await db.collection("call_sessions").doc(sessionId).update({
              status: "cancelled",
              cancelledReason: "Payment timeout - stuck for 24+ hours",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          results.refunded++;
          console.log(`✅ [StuckPayments] Successfully cancelled ${paymentIntentId}`);
        }
      } catch (error) {
        console.error(`❌ [StuckPayments] Error refunding payment ${paymentDoc.id}:`, error);
        results.errors++;
      }
    }
  } catch (error) {
    console.error("❌ [StuckPayments] Error in refundOldStuckPayments:", error);
    results.errors++;
  }
}

/**
 * Alert admins about stuck payments that need manual review
 */
async function alertStuckPayments(
  db: admin.firestore.Firestore,
  results: { alerted: number; errors: number }
): Promise<void> {
  const warningCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
  const criticalCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours

  try {
    // Find payments that are stuck for 1-24 hours
    const warningPayments = await db
      .collection("payments")
      .where("status", "==", "requires_capture")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(warningCutoff))
      .where("createdAt", ">", admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS * 60 * 60 * 1000)
      ))
      .get();

    if (!warningPayments.empty) {
      const criticalCount = warningPayments.docs.filter(doc => {
        const createdAt = doc.data().createdAt?.toDate?.() || new Date();
        return createdAt < criticalCutoff;
      }).length;

      // Only alert if we haven't already alerted today
      const today = new Date().toISOString().split("T")[0];
      const existingAlert = await db
        .collection("admin_alerts")
        .where("type", "==", "stuck_payments_warning")
        .where("date", "==", today)
        .limit(1)
        .get();

      if (existingAlert.empty) {
        await db.collection("admin_alerts").add({
          type: "stuck_payments_warning",
          priority: criticalCount > 0 ? "critical" : "high",
          title: `⚠️ ${warningPayments.size} paiements bloqués`,
          message: `${warningPayments.size} paiements sont bloqués en attente de capture. ` +
            `${criticalCount} sont critiques (> 6 heures). Vérifiez les sessions d'appel associées.`,
          count: warningPayments.size,
          criticalCount,
          date: today,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.alerted = warningPayments.size;
        console.log(`🚨 [StuckPayments] Alert created for ${warningPayments.size} stuck payments`);
      }
    }
  } catch (error) {
    console.error("❌ [StuckPayments] Error alerting stuck payments:", error);
    results.errors++;
  }
}

/**
 * Manual trigger for stuck payments recovery (admin only)
 */
export const triggerStuckPaymentsRecovery = onCall(
  {
    region: "europe-west1",
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Verify admin role
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || !["admin", "dev"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Only admins can trigger recovery");
    }

    console.log(`🔧 [StuckPayments] Manual recovery triggered by ${request.auth.uid}`);

    const results = {
      captured: 0,
      refunded: 0,
      alerted: 0,
      errors: 0,
    };

    try {
      await captureCompletedCallPayments(db, results);
      await refundOldStuckPayments(db, results);
      await alertStuckPayments(db, results);

      return {
        success: true,
        results,
        triggeredBy: request.auth.uid,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ [StuckPayments] Manual recovery failed:", error);
      throw new HttpsError("internal", "Recovery failed");
    }
  }
);
