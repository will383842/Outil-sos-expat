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
 * 3. Find payments stuck in 'requires_capture' for more than 6 hours - refund them
 * 4. Alert admins about stuck payments
 *
 * Runs every 15 minutes
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { logError } from "../utils/logs/logError";
import { syncPaymentStatus } from "../utils/paymentSync";
// P0 FIX: Import stuck transfers recovery
import { recoverStuckTransfers } from "../PendingTransferProcessor";
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_MODE,
  // P0 FIX 2026-02-01: PayPal secrets for stuck PayPal payments recovery
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
} from "../lib/secrets";

// Configuration
const RECOVERY_CONFIG = {
  // Payments stuck for more than 10 minutes with completed call = auto-capture
  CAPTURE_THRESHOLD_MINUTES: 10,
  // Payments stuck for more than 1 hour without completed call = auto-refund
  // P0 FIX 2026-01-30: Reduced from 24h to 6h
  // P0 FIX 2026-02-09: Reduced from 6h to 1h for much faster customer refund
  REFUND_THRESHOLD_HOURS: 1,
  // Maximum payments to process per run
  BATCH_SIZE: 50,
  // Minimum call duration for capture (seconds) - P0 FIX 2026-02-01: Reduced from 2 min to 1 min
  MIN_CALL_DURATION: 60,
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
 * Scheduled function - runs every 15 minutes
 * 2026-02-09: Changed from 4h to 15min - refund threshold is 1h so we need frequent checks
 */
export const stuckPaymentsRecovery = onSchedule(
  {
    schedule: "*/30 * * * *", // Every 30 minutes (optimized from 15min - refund threshold is 1h so 30min is safe)
    region: "europe-west3",
    timeZone: "Europe/Paris",
    timeoutSeconds: 300,
    memory: "512MiB",
    // P0 FIX 2026-02-01: Added PayPal secrets for stuck PayPal payments recovery
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
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
      // P0 FIX 2026-02-01: Add PayPal stuck payments recovery results
      paypalCaptured: 0,
      paypalVoided: 0,
    };

    try {
      // 1. Find and capture Stripe payments for completed calls
      await captureCompletedCallPayments(db, results);

      // 2. P0 FIX 2026-02-01: Find and capture PayPal payments for completed calls
      await captureCompletedPayPalPayments(db, results);

      // 3. Find and refund very old stuck Stripe payments
      await refundOldStuckPayments(db, results);

      // 3b. P0 FIX 2026-02-12: Cancel abandoned 3D Secure payments (requires_action)
      await cancelAbandonedRequiresActionPayments(db, results);

      // 4. Alert about remaining stuck payments
      await alertStuckPayments(db, results);

      // 5. P0 FIX: Recover stuck pending_transfers (in "processing" for > 1 hour)
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
      const hasPayPalActions = results.paypalCaptured > 0 || results.paypalVoided > 0;
      const hasTransferActions = results.transfersRecovered > 0;

      if (hasPaymentActions || hasPayPalActions || hasTransferActions) {
        await db.collection("admin_alerts").add({
          type: "stuck_payments_recovery",
          priority: results.refunded > 0 || results.transfersFailed > 0 ? "high" : "medium",
          title: "Récupération paiements/transferts bloqués",
          message: `Stripe - Capturés: ${results.captured}, Remboursés: ${results.refunded}, Alertes: ${results.alerted}. ` +
            `PayPal - Capturés: ${results.paypalCaptured}, Annulés: ${results.paypalVoided}. ` +
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
            await stripe.paymentIntents.capture(paymentIntentId, {}, {
              idempotencyKey: `recovery_capture_${paymentIntentId}`.substring(0, 255),
            });

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
 * P0 FIX 2026-02-01: Find PayPal payments stuck in AUTHORIZED where the call is completed
 * and capture them automatically
 *
 * This fixes the issue where:
 * 1. Client pays via PayPal → authorization created
 * 2. Call completes successfully (> 2 min)
 * 3. But payment.status in call_session is not "authorized" (maybe "pending_approval")
 * 4. shouldCapturePayment() returns false → capture never happens
 *
 * This recovery job finds these cases and captures them.
 */
async function captureCompletedPayPalPayments(
  db: admin.firestore.Firestore,
  results: { paypalCaptured: number; paypalVoided: number; errors: number }
): Promise<void> {
  console.log(`💳 [StuckPayments] Looking for stuck PayPal payments...`);

  try {
    // Find PayPal orders in AUTHORIZED status that haven't been captured
    const stuckPayPalOrders = await db
      .collection("paypal_orders")
      .where("status", "==", "AUTHORIZED")
      .where("intent", "==", "AUTHORIZE")
      .limit(RECOVERY_CONFIG.BATCH_SIZE)
      .get();

    if (stuckPayPalOrders.empty) {
      console.log("💳 [StuckPayments] No stuck PayPal payments found");
      return;
    }

    console.log(`💳 [StuckPayments] Found ${stuckPayPalOrders.size} stuck PayPal orders to evaluate`);

    // Import PayPalManager dynamically to avoid circular dependencies
    const { PayPalManager } = await import("../PayPalManager");
    const paypalManager = new PayPalManager();

    for (const orderDoc of stuckPayPalOrders.docs) {
      const orderData = orderDoc.data();
      const orderId = orderDoc.id;
      const callSessionId = orderData.callSessionId;

      if (!callSessionId) {
        console.warn(`⚠️ [StuckPayments] PayPal order ${orderId} has no callSessionId`);
        continue;
      }

      try {
        // Find the associated call session
        const sessionDoc = await db.collection("call_sessions").doc(callSessionId).get();

        // Check order age for timeout logic
        const orderCreatedAt = orderData.createdAt?.toDate?.()?.getTime() || orderData.createdAt?.getTime?.() || 0;
        const orderAgeMs = orderCreatedAt > 0 ? Date.now() - orderCreatedAt : 0;
        const orderAgeHours = orderAgeMs / (60 * 60 * 1000);
        const isOlderThanThreshold = orderAgeHours >= RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS;

        if (!sessionDoc.exists) {
          // 2026-02-09: If session not found AND order is old → void the authorization
          if (isOlderThanThreshold) {
            console.log(`💳 [StuckPayments] VOIDING PayPal order ${orderId} - session ${callSessionId} NOT FOUND and order is ${Math.round(orderAgeHours * 60)} min old`);
            try {
              const authorizationId = orderData.authorizationId;
              if (authorizationId) {
                const { PayPalManager } = await import("../PayPalManager");
                const pm = new PayPalManager();
                const voidResult = await pm.voidAuthorization(authorizationId);
                if (voidResult.success) {
                  results.paypalVoided++;
                  await db.collection("paypal_orders").doc(orderId).update({
                    status: "VOIDED",
                    voidedAt: admin.firestore.FieldValue.serverTimestamp(),
                    voidedBy: "stuck_payments_recovery",
                    voidReason: "session_not_found_timeout",
                  });
                }
              }
            } catch (voidErr) {
              console.error(`❌ [StuckPayments] Error voiding PayPal order ${orderId} (no session):`, voidErr);
              results.errors++;
            }
          } else {
            console.warn(`⚠️ [StuckPayments] Call session ${callSessionId} not found for PayPal order ${orderId}, waiting for timeout`);
          }
          continue;
        }

        const sessionData = sessionDoc.data()!;
        const sessionStatus = sessionData.status;
        const paymentStatus = sessionData.payment?.status;

        // Calculate duration from various sources
        let duration = sessionData.conference?.duration || sessionData.conference?.billingDuration || 0;

        // Fallback: calculate from timestamps
        if (duration === 0 && sessionData.participants?.client?.connectedAt && sessionData.participants?.provider?.connectedAt) {
          const clientConnected = sessionData.participants.client.connectedAt.toDate().getTime();
          const providerConnected = sessionData.participants.provider.connectedAt.toDate().getTime();
          const bothConnectedAt = Math.max(clientConnected, providerConnected);

          const clientDisconnected = sessionData.participants.client.disconnectedAt?.toDate()?.getTime();
          const providerDisconnected = sessionData.participants.provider.disconnectedAt?.toDate()?.getTime();

          if (clientDisconnected || providerDisconnected) {
            const firstDisconnectedAt = Math.min(
              clientDisconnected || Infinity,
              providerDisconnected || Infinity
            );
            if (firstDisconnectedAt !== Infinity) {
              duration = Math.round((firstDisconnectedAt - bothConnectedAt) / 1000);
            }
          }
        }

        console.log(`💳 [StuckPayments] Evaluating PayPal order ${orderId}:`);
        console.log(`   sessionId: ${callSessionId}`);
        console.log(`   sessionStatus: ${sessionStatus}`);
        console.log(`   paymentStatus: ${paymentStatus}`);
        console.log(`   duration: ${duration}s`);

        // Check if call is completed and meets minimum duration
        const isCompleted = sessionStatus === "completed";
        const meetsMinDuration = duration >= RECOVERY_CONFIG.MIN_CALL_DURATION;

        if (isCompleted && meetsMinDuration) {
          // Call completed successfully - capture the payment
          console.log(`💳 [StuckPayments] CAPTURING PayPal order ${orderId} for completed call ${callSessionId}`);

          try {
            const captureResult = await paypalManager.captureOrder(orderId);

            if (captureResult.success) {
              results.paypalCaptured++;
              console.log(`✅ [StuckPayments] Successfully captured PayPal order ${orderId}`);

              // Update call session to mark as captured
              await db.collection("call_sessions").doc(callSessionId).update({
                "payment.status": "captured",
                "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
                "payment.paypalCaptureId": captureResult.captureId,
                "payment.capturedBy": "stuck_payments_recovery",
                "isPaid": true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              console.error(`❌ [StuckPayments] PayPal capture failed for ${orderId}:`, captureResult);
              results.errors++;
            }
          } catch (captureError) {
            console.error(`❌ [StuckPayments] Error capturing PayPal order ${orderId}:`, captureError);
            results.errors++;
          }
        } else if (sessionStatus === "failed" || sessionStatus === "cancelled") {
          // Call failed or was cancelled - void the authorization
          console.log(`💳 [StuckPayments] VOIDING PayPal order ${orderId} for failed/cancelled call ${callSessionId}`);

          try {
            const authorizationId = orderData.authorizationId;
            if (authorizationId) {
              const voidResult = await paypalManager.voidAuthorization(authorizationId);

              if (voidResult.success) {
                results.paypalVoided++;
                console.log(`✅ [StuckPayments] Successfully voided PayPal authorization ${authorizationId}`);

                // Update PayPal order status
                await db.collection("paypal_orders").doc(orderId).update({
                  status: "VOIDED",
                  voidedAt: admin.firestore.FieldValue.serverTimestamp(),
                  voidedBy: "stuck_payments_recovery",
                });

                // Update call session payment status
                await db.collection("call_sessions").doc(callSessionId).update({
                  "payment.status": "cancelled",
                  "payment.cancelledAt": admin.firestore.FieldValue.serverTimestamp(),
                  "payment.cancelledBy": "stuck_payments_recovery",
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            }
          } catch (voidError) {
            console.error(`❌ [StuckPayments] Error voiding PayPal order ${orderId}:`, voidError);
            results.errors++;
          }
        } else if (isOlderThanThreshold) {
          // 2026-02-09: Session stuck in non-terminal status (pending, scheduled, etc.)
          // AND order is older than threshold → void the authorization (same as Stripe refund logic)
          console.log(`💳 [StuckPayments] VOIDING PayPal order ${orderId} - session ${callSessionId} stuck in "${sessionStatus}" for ${Math.round(orderAgeHours * 60)} min`);

          try {
            const authorizationId = orderData.authorizationId;
            if (authorizationId) {
              const voidResult = await paypalManager.voidAuthorization(authorizationId);

              if (voidResult.success) {
                results.paypalVoided++;
                console.log(`✅ [StuckPayments] Successfully voided stuck PayPal authorization ${authorizationId}`);

                await db.collection("paypal_orders").doc(orderId).update({
                  status: "VOIDED",
                  voidedAt: admin.firestore.FieldValue.serverTimestamp(),
                  voidedBy: "stuck_payments_recovery",
                  voidReason: `session_stuck_${sessionStatus}_timeout`,
                });

                await db.collection("call_sessions").doc(callSessionId).update({
                  status: "cancelled",
                  "payment.status": "cancelled",
                  "payment.cancelledAt": admin.firestore.FieldValue.serverTimestamp(),
                  "payment.cancelledBy": "stuck_payments_recovery",
                  cancelledReason: `PayPal payment timeout - stuck for ${RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS}+ hour(s) in ${sessionStatus}`,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
            }
          } catch (voidError) {
            console.error(`❌ [StuckPayments] Error voiding stuck PayPal order ${orderId}:`, voidError);
            results.errors++;
          }
        } else {
          // Session still in progress and not yet past threshold - leave it alone
          console.log(`ℹ️ [StuckPayments] Skipping PayPal order ${orderId} - session status: ${sessionStatus}, age: ${Math.round(orderAgeHours * 60)} min`);
        }
      } catch (error) {
        console.error(`❌ [StuckPayments] Error processing PayPal order ${orderId}:`, error);
        results.errors++;
      }
    }
  } catch (error) {
    console.error("❌ [StuckPayments] Error in captureCompletedPayPalPayments:", error);
    results.errors++;
  }
}

/**
 * Find old stuck payments (> 1 hour) and refund them
 * This prevents money from being held indefinitely
 * P0 FIX 2026-01-30: Reduced from 24h to 6h for better customer experience
 * P0 FIX 2026-02-09: Reduced from 6h to 1h for much faster customer refund
 */
async function refundOldStuckPayments(
  db: admin.firestore.Firestore,
  results: { refunded: number; errors: number }
): Promise<void> {
  const cutoffTime = new Date(
    Date.now() - RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS * 60 * 60 * 1000
  );

  console.log(`💸 [StuckPayments] Looking for stuck payments (> ${RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS}h)`);

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
            cancellationReason: `Payment stuck for more than ${RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS} hour(s) without completed call`,
          });

          // Also update call session status if exists
          if (sessionId) {
            await db.collection("call_sessions").doc(sessionId).update({
              status: "cancelled",
              cancelledReason: `Payment timeout - stuck for ${RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS}+ hour(s)`,
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
 * P0 FIX 2026-02-12: Cancel payments stuck in 'requires_action' (3D Secure abandoned)
 * If a client starts 3D Secure but never completes it, the payment stays stuck forever.
 * This recovers those payments by canceling them after the refund threshold.
 */
async function cancelAbandonedRequiresActionPayments(
  db: admin.firestore.Firestore,
  results: { refunded: number; errors: number }
): Promise<void> {
  const cutoffTime = new Date(
    Date.now() - RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS * 60 * 60 * 1000
  );

  console.log(`🔐 [StuckPayments] Looking for abandoned 3D Secure payments (requires_action > ${RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS}h)`);

  try {
    const stuckPayments = await db
      .collection("payments")
      .where("status", "==", "requires_action")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffTime))
      .limit(RECOVERY_CONFIG.BATCH_SIZE)
      .get();

    if (stuckPayments.empty) {
      console.log("🔐 [StuckPayments] No abandoned 3D Secure payments found");
      return;
    }

    console.log(`🔐 [StuckPayments] Found ${stuckPayments.size} abandoned 3D Secure payments`);
    const stripe = getStripeInstance();

    for (const paymentDoc of stuckPayments.docs) {
      const paymentData = paymentDoc.data();
      const paymentIntentId = paymentData.paymentIntentId || paymentDoc.id;

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === "requires_action" || paymentIntent.status === "requires_payment_method") {
          console.log(`🔐 [StuckPayments] Canceling abandoned 3DS payment ${paymentIntentId}`);

          await stripe.paymentIntents.cancel(paymentIntentId, {
            cancellation_reason: "abandoned",
          });

          // Find and update call session
          const sessionQuery = await db
            .collection("call_sessions")
            .where("paymentId", "==", paymentDoc.id)
            .limit(1)
            .get();

          const sessionId = !sessionQuery.empty ? sessionQuery.docs[0].id : null;

          await syncPaymentStatus(db, paymentDoc.id, sessionId, {
            status: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: "stuck_payments_recovery",
            cancellationReason: `3D Secure abandoned - stuck for ${RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS}+ hour(s)`,
          });

          if (sessionId) {
            await db.collection("call_sessions").doc(sessionId).update({
              status: "cancelled",
              cancelledReason: "Payment 3D Secure abandoned",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          results.refunded++;
          console.log(`✅ [StuckPayments] Successfully cancelled 3DS payment ${paymentIntentId}`);
        } else {
          // Status changed on Stripe side - sync our status
          console.log(`ℹ️ [StuckPayments] 3DS payment ${paymentIntentId} is now ${paymentIntent.status}`);
          await db.collection("payments").doc(paymentDoc.id).update({
            status: paymentIntent.status === "succeeded" ? "captured" : paymentIntent.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            syncedFromStripe: true,
          });
        }
      } catch (error) {
        console.error(`❌ [StuckPayments] Error processing 3DS payment ${paymentDoc.id}:`, error);
        results.errors++;
      }
    }
  } catch (error) {
    console.error("❌ [StuckPayments] Error in cancelAbandonedRequiresActionPayments:", error);
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
  const warningCutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
  const criticalCutoff = new Date(Date.now() - RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS * 60 * 60 * 1000); // 1 hour

  try {
    // Find payments that are stuck for 30min to 1 hour (warning before auto-refund)
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
            `${criticalCount} sont critiques (> ${RECOVERY_CONFIG.REFUND_THRESHOLD_HOURS}h). Vérifiez les sessions d'appel associées.`,
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
 * P0 FIX 2026-02-01: Added PayPal recovery
 */
export const triggerStuckPaymentsRecovery = onCall(
  {
    region: "europe-west3",
    // P0 FIX 2026-02-01: Added PayPal secrets
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
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
      // P0 FIX 2026-02-01: Add PayPal results
      paypalCaptured: 0,
      paypalVoided: 0,
    };

    try {
      await captureCompletedCallPayments(db, results);
      // P0 FIX 2026-02-01: Add PayPal recovery
      await captureCompletedPayPalPayments(db, results);
      await refundOldStuckPayments(db, results);
      // P0 FIX 2026-02-12: Cancel abandoned 3D Secure payments
      await cancelAbandonedRequiresActionPayments(db, results);
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

/**
 * P0 FIX 2026-02-01: Manual capture for a specific PayPal payment
 * This can be used to immediately recover a stuck PayPal payment without waiting for the scheduled job
 */
export const capturePayPalPaymentManually = onCall(
  {
    region: "europe-west3",
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
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
      throw new HttpsError("permission-denied", "Only admins can manually capture payments");
    }

    const { callSessionId, paypalOrderId } = request.data;

    if (!callSessionId && !paypalOrderId) {
      throw new HttpsError("invalid-argument", "Either callSessionId or paypalOrderId is required");
    }

    console.log(`💳 [ManualCapture] Triggered by ${request.auth.uid} for session: ${callSessionId || paypalOrderId}`);

    try {
      let orderId = paypalOrderId;

      // If callSessionId provided, get the PayPal order ID from the session
      if (callSessionId && !paypalOrderId) {
        const sessionDoc = await db.collection("call_sessions").doc(callSessionId).get();
        if (!sessionDoc.exists) {
          throw new HttpsError("not-found", `Call session ${callSessionId} not found`);
        }
        const sessionData = sessionDoc.data()!;
        orderId = sessionData.payment?.paypalOrderId;
        if (!orderId) {
          throw new HttpsError("invalid-argument", "This session does not have a PayPal order");
        }
      }

      // Import PayPalManager
      const { PayPalManager } = await import("../PayPalManager");
      const paypalManager = new PayPalManager();

      // Capture the order
      console.log(`💳 [ManualCapture] Capturing PayPal order: ${orderId}`);
      const captureResult = await paypalManager.captureOrder(orderId);

      if (captureResult.success) {
        // Update call session
        const finalCallSessionId = callSessionId || (await findCallSessionByPayPalOrder(db, orderId));
        if (finalCallSessionId) {
          await db.collection("call_sessions").doc(finalCallSessionId).update({
            "payment.status": "captured",
            "payment.capturedAt": admin.firestore.FieldValue.serverTimestamp(),
            "payment.paypalCaptureId": captureResult.captureId,
            "payment.capturedBy": `manual_${request.auth.uid}`,
            "isPaid": true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        console.log(`✅ [ManualCapture] Successfully captured PayPal order ${orderId}`);
        return {
          success: true,
          captureId: captureResult.captureId,
          orderId,
          callSessionId: finalCallSessionId,
          capturedBy: request.auth.uid,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new HttpsError("internal", `PayPal capture failed: ${captureResult.status}`);
      }
    } catch (error) {
      console.error("❌ [ManualCapture] Failed:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error instanceof Error ? error.message : "Capture failed");
    }
  }
);

/**
 * Helper function to find call session by PayPal order ID
 */
async function findCallSessionByPayPalOrder(
  db: admin.firestore.Firestore,
  paypalOrderId: string
): Promise<string | null> {
  const sessionQuery = await db
    .collection("call_sessions")
    .where("payment.paypalOrderId", "==", paypalOrderId)
    .limit(1)
    .get();

  return sessionQuery.empty ? null : sessionQuery.docs[0].id;
}
