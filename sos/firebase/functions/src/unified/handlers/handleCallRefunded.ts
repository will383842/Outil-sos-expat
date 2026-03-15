/**
 * Unified Handler: Call Refunded
 *
 * Cancels all unified commissions associated with a refunded call session.
 * Called from stripeWebhookHandler on charge.refunded event.
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { cancelCommission } from "../commissionWriter";

/**
 * Cancel all unified commissions linked to a call session.
 *
 * @param sessionId - The call session ID (sourceId in commissions)
 * @param reason - The cancellation reason
 * @returns Number of commissions cancelled
 */
export async function cancelUnifiedCommissionsForCallSession(
  sessionId: string,
  reason: string
): Promise<{ cancelledCount: number }> {
  if (!sessionId) return { cancelledCount: 0 };

  const db = getFirestore();
  let cancelledCount = 0;

  try {
    // Find all non-cancelled, non-paid unified commissions for this session
    const snap = await db
      .collection("commissions")
      .where("sourceId", "==", sessionId)
      .get();

    if (snap.empty) return { cancelledCount: 0 };

    for (const doc of snap.docs) {
      const data = doc.data();
      // Skip already cancelled or paid commissions
      if (data.status === "cancelled" || data.status === "paid") continue;

      try {
        await cancelCommission(doc.id, reason);
        cancelledCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to cancel unified commission ${doc.id}: ${msg}`);
      }
    }

    if (cancelledCount > 0) {
      logger.info(
        `[handleCallRefunded] Cancelled ${cancelledCount} unified commissions for session ${sessionId}`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[handleCallRefunded] Error cancelling commissions for session ${sessionId}: ${msg}`);
  }

  return { cancelledCount };
}
