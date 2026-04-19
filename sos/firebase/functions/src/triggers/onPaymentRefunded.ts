/**
 * Trigger: onPaymentRefunded
 *
 * Fires when a payment document transitions to status = "refunded".
 * Automatically cancels ALL affiliate commissions (influencer, chatter, blogger,
 * groupAdmin, affiliate, unified) linked to that call session so refunded calls
 * never keep earning the influencer/chatter/etc.
 *
 * Created 2026-04-19 as part of the influencer affiliate audit (bug C3):
 * before this, commissions stayed "available" after a refund and could be
 * withdrawn, requiring an admin to manually call cancelCommissionsForCallSession.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

type PaymentDoc = {
  status?: string;
  sessionId?: string | null;
  callSessionId?: string | null;
  refundReason?: string;
};

export const onPaymentRefunded = onDocumentUpdated(
  {
    document: "payments/{paymentId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
  },
  async (event) => {
    ensureInitialized();

    const before = event.data?.before.data() as PaymentDoc | undefined;
    const after = event.data?.after.data() as PaymentDoc | undefined;
    const paymentId = event.params.paymentId;

    if (!before || !after) return;

    // Only fire on transition TO refunded (ignore other updates and no-op writes)
    if (before.status === "refunded" || after.status !== "refunded") return;

    const sessionId = after.sessionId || after.callSessionId;
    if (!sessionId) {
      logger.warn("[onPaymentRefunded] Payment refunded but no sessionId linked — skipping commission cancellation", {
        paymentId,
      });
      return;
    }

    const reason = after.refundReason
      ? `Payment refunded: ${after.refundReason}`
      : "Payment refunded";

    logger.info("[onPaymentRefunded] Cancelling all affiliate commissions for refunded call", {
      paymentId,
      sessionId,
    });

    const results: Record<string, { cancelled?: number; error?: string }> = {};

    // Each handler is independent — one failure must not block the others.
    const tasks: Array<Promise<void>> = [
      (async () => {
        try {
          const { cancelCommissionsForCallSession } = await import(
            "../influencer/services/influencerCommissionService"
          );
          const r = await cancelCommissionsForCallSession(sessionId, reason);
          results.influencer = { cancelled: r.cancelledCount };
        } catch (err) {
          results.influencer = { error: err instanceof Error ? err.message : String(err) };
        }
      })(),
      (async () => {
        try {
          const { cancelCommissionsForCallSession } = await import(
            "../chatter/services/chatterCommissionService"
          );
          const r = await cancelCommissionsForCallSession(sessionId, reason);
          results.chatter = { cancelled: r.cancelledCount };
        } catch (err) {
          results.chatter = { error: err instanceof Error ? err.message : String(err) };
        }
      })(),
      (async () => {
        try {
          const { cancelBloggerCommissionsForCallSession } = await import(
            "../blogger/services/bloggerCommissionService"
          );
          const r = await cancelBloggerCommissionsForCallSession(sessionId, reason);
          results.blogger = { cancelled: r.cancelledCount };
        } catch (err) {
          results.blogger = { error: err instanceof Error ? err.message : String(err) };
        }
      })(),
      (async () => {
        try {
          const { cancelCommissionsForCallSession } = await import(
            "../groupAdmin/services/groupAdminCommissionService"
          );
          const r = await cancelCommissionsForCallSession(sessionId, reason);
          results.groupAdmin = { cancelled: r.cancelledCount };
        } catch (err) {
          results.groupAdmin = { error: err instanceof Error ? err.message : String(err) };
        }
      })(),
      (async () => {
        try {
          const { cancelCommissionsForCallSession } = await import(
            "../affiliate/services/commissionService"
          );
          const r = await cancelCommissionsForCallSession(sessionId, reason);
          results.affiliate = { cancelled: r.cancelledCount };
        } catch (err) {
          results.affiliate = { error: err instanceof Error ? err.message : String(err) };
        }
      })(),
    ];

    await Promise.all(tasks);

    logger.info("[onPaymentRefunded] Done", { paymentId, sessionId, results });
  }
);
