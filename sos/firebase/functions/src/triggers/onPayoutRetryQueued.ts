/**
 * Trigger: processes queued payout retries after PayPal email verification.
 * Region: europe-west3 (has PayPal secrets)
 *
 * When a provider verifies their PayPal email, any blocked payouts
 * (payoutPendingVerification=true) are queued in payout_retry_queue.
 * This trigger picks them up and executes the actual PayPal payout.
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } from "../lib/secrets";

export const onPayoutRetryQueued = onDocumentCreated(
  {
    document: "payout_retry_queue/{docId}",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { orderId, providerId, providerEmail, amount, currency, callSessionId } = data;
    const docRef = event.data!.ref;

    console.log(`[onPayoutRetryQueued] Processing retry for order ${orderId}, provider ${providerId}`);

    try {
      // Dynamic import to avoid circular deps
      const { PayPalManager } = await import("../PayPalManager");
      const manager = new PayPalManager();

      const payoutResult = await manager.createPayout({
        providerId,
        providerPayPalEmail: providerEmail,
        amount: typeof amount === "number" ? amount : parseInt(amount, 10),
        currency: currency || "EUR",
        sessionId: callSessionId || orderId,
        note: "Payout automatique apres verification email PayPal",
      });

      // Update retry queue doc
      await docRef.update({
        status: "completed",
        payoutBatchId: payoutResult.payoutBatchId || null,
        payoutItemId: payoutResult.payoutItemId || null,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update paypal_orders
      if (orderId) {
        await admin.firestore().collection("paypal_orders").doc(orderId).update({
          payoutRetryQueued: false,
          payoutTriggered: true,
          payoutId: payoutResult.payoutBatchId || null,
          payoutStatus: "pending",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      console.log(`[onPayoutRetryQueued] Payout retry successful for order ${orderId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[onPayoutRetryQueued] Payout retry failed for order ${orderId}:`, errorMessage);

      await docRef.update({
        status: "failed",
        error: errorMessage,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create admin alert
      await admin.firestore().collection("admin_alerts").add({
        type: "payout_retry_failed",
        priority: "high",
        providerId,
        orderId,
        amount,
        currency,
        error: errorMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
