/**
 * Trigger: onPaymentStatusChanged
 *
 * AUDIT FIX: Fires when a payment document is updated in the `payments` collection.
 * Cancels all affiliate commissions (5 systems) when payment status changes to
 * 'cancelled' or 'refunded'.
 *
 * This is a safety net that catches ALL cancellation sources — not just Stripe webhooks.
 * The charge.refunded webhook handler also cancels commissions, but this trigger
 * covers edge cases like manual admin cancellations, PayPal refunds, etc.
 *
 * Idempotent: checks if commissions were already cancelled before processing.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const PAYMENTS_COLLECTION = "payments";

/** Statuses that trigger commission cancellation */
const CANCELLATION_STATUSES = ["cancelled", "refunded", "canceled"];

/**
 * Main trigger function — watches payments collection for status changes
 */
export const paymentOnPaymentStatusChanged = onDocumentUpdated(
  {
    document: `${PAYMENTS_COLLECTION}/{paymentId}`,
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) {
      logger.warn("[onPaymentStatusChanged] Missing before or after data");
      return;
    }

    const paymentId = event.params.paymentId;
    const previousStatus = beforeData.status;
    const newStatus = afterData.status;

    // Only process if status actually changed
    if (previousStatus === newStatus) {
      return;
    }

    // Only process cancellation/refund status transitions
    if (!CANCELLATION_STATUSES.includes(newStatus)) {
      return;
    }

    // Don't re-process if already coming from a cancellation status
    if (CANCELLATION_STATUSES.includes(previousStatus)) {
      logger.info(`[onPaymentStatusChanged] Payment ${paymentId} already in cancellation status (${previousStatus} → ${newStatus}), skipping`);
      return;
    }

    const callSessionId = afterData.callSessionId;
    if (!callSessionId) {
      logger.warn(`[onPaymentStatusChanged] Payment ${paymentId} has no callSessionId, skipping commission cancellation`);
      return;
    }

    logger.info(`[onPaymentStatusChanged] Payment ${paymentId} status changed: ${previousStatus} → ${newStatus}. Cancelling commissions for session ${callSessionId}`);

    // Check idempotence: has this payment already been processed for commission cancellation?
    const db = getFirestore();
    const idempotenceRef = db.collection("processed_commission_cancellations").doc(paymentId);
    const idempotenceDoc = await idempotenceRef.get();

    if (idempotenceDoc.exists) {
      logger.info(`[onPaymentStatusChanged] Commissions already cancelled for payment ${paymentId}, skipping (idempotent)`);
      return;
    }

    try {
      // Dynamic imports to avoid cold start overhead for non-cancellation updates
      const { cancelCommissionsForCallSession: cancelChatter } = await import(
        "../../chatter/services/chatterCommissionService"
      );
      const { cancelCommissionsForCallSession: cancelInfluencer } = await import(
        "../../influencer/services/influencerCommissionService"
      );
      const { cancelBloggerCommissionsForCallSession: cancelBlogger } = await import(
        "../../blogger/services/bloggerCommissionService"
      );
      const { cancelCommissionsForCallSession: cancelGroupAdmin } = await import(
        "../../groupAdmin/services/groupAdminCommissionService"
      );
      const { cancelCommissionsForCallSession: cancelAffiliate } = await import(
        "../../affiliate/services/commissionService"
      );

      const cancelReason = `Payment ${newStatus}: ${paymentId}`;
      const results = await Promise.allSettled([
        cancelChatter(callSessionId, cancelReason, "system_payment_trigger"),
        cancelInfluencer(callSessionId, cancelReason, "system_payment_trigger"),
        cancelBlogger(callSessionId, cancelReason, "system_payment_trigger"),
        cancelGroupAdmin(callSessionId, cancelReason), // No cancelledBy param
        cancelAffiliate(callSessionId, cancelReason, "system_payment_trigger"),
      ]);

      const labels = ["chatter", "influencer", "blogger", "groupAdmin", "affiliate"] as const;
      let totalCancelled = 0;
      const errors: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled") {
          totalCancelled += r.value.cancelledCount;
          if (r.value.errors?.length) {
            errors.push(...r.value.errors.map((e: string) => `${labels[i]}: ${e}`));
          }
        } else {
          const errorMsg = `${labels[i]}: ${r.reason?.message || r.reason}`;
          errors.push(errorMsg);
          logger.error(`[onPaymentStatusChanged] Failed to cancel ${labels[i]} commissions:`, r.reason);
        }
      }

      // Mark as processed (idempotence)
      await idempotenceRef.set({
        paymentId,
        callSessionId,
        previousStatus,
        newStatus,
        totalCancelled,
        errors: errors.length > 0 ? errors : null,
        processedAt: new Date().toISOString(),
        source: "onPaymentStatusChanged_trigger",
      });

      logger.info(
        `[onPaymentStatusChanged] Cancelled ${totalCancelled} commissions for session ${callSessionId} (payment ${paymentId}). Errors: ${errors.length}`
      );
    } catch (error) {
      logger.error(`[onPaymentStatusChanged] Critical error cancelling commissions for payment ${paymentId}:`, error);
      // Don't write idempotence doc on failure — allow retry on next trigger
    }
  }
);
