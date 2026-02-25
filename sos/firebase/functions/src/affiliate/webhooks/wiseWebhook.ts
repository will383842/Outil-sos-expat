/**
 * Wise Webhook Handler
 *
 * Handles incoming webhooks from Wise (TransferWise) API.
 * Updates payout status based on transfer state changes.
 *
 * Webhook events:
 * - transfers#state-change: Transfer status updated
 * - transfers#active-cases: Transfer has issues requiring attention
 */

import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import { WISE_WEBHOOK_SECRET } from "../../lib/secrets";
// P2 FIX: Use shared Wise signature verifier (avoid duplication with paymentWebhookWise)
import { verifyWiseWebhookSignature } from "../../lib/wiseWebhookUtils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface WiseWebhookEvent {
  event_type: string;
  schema_version: string;
  sent_at: string;
  data: {
    resource: {
      id: number;
      profile_id: number;
      type: string;
    };
    current_state: string;
    previous_state: string;
    occurred_at: string;
  };
  subscription_id: string;
}

type WiseTransferState =
  | "incoming_payment_waiting"
  | "incoming_payment_initiated"
  | "processing"
  | "funds_converted"
  | "outgoing_payment_sent"
  | "cancelled"
  | "funds_refunded"
  | "bounced_back"
  | "charged_back";

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export const wiseWebhook = onRequest(
  {
    region: "europe-west3",
    // P0 CRITICAL FIX: Allow unauthenticated access for Wise webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [WISE_WEBHOOK_SECRET],
  },
  async (req, res) => {
    ensureInitialized();

    // Only accept POST requests
    if (req.method !== "POST") {
      logger.warn("[WiseWebhook] Invalid method", { method: req.method });
      res.status(405).send("Method Not Allowed");
      return;
    }

    const db = getFirestore();

    try {
      // 1. Verify webhook signature — P2 FIX: use shared verifier
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers["x-signature-sha256"] as string | undefined;
      const isValid = verifyWiseWebhookSignature(rawBody, signature, WISE_WEBHOOK_SECRET.value());
      if (!isValid) {
        res.status(401).send("Invalid signature");
        return;
      }

      // 2. Parse webhook event
      const event = req.body as WiseWebhookEvent;

      logger.info("[WiseWebhook] Received event", {
        eventType: event.event_type,
        transferId: event.data?.resource?.id,
        currentState: event.data?.current_state,
        previousState: event.data?.previous_state,
      });

      // 3. Only process transfer state changes
      if (event.event_type !== "transfers#state-change") {
        logger.info("[WiseWebhook] Ignoring non-transfer event", {
          eventType: event.event_type,
        });
        res.status(200).send("OK - Event ignored");
        return;
      }

      const transferId = event.data.resource.id;
      const currentState = event.data.current_state as WiseTransferState;

      // 4. Find the payout with this Wise transfer ID
      // Check legacy affiliate_payouts first, then unified payment_withdrawals
      let payoutDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      const legacyQuery = await db
        .collection("affiliate_payouts")
        .where("wiseTransferId", "==", transferId.toString())
        .limit(1)
        .get();

      if (!legacyQuery.empty) {
        payoutDoc = legacyQuery.docs[0];
      } else {
        // Try unified payment_withdrawals (new affiliate withdrawals - W1 migration)
        const unifiedQuery = await db
          .collection("payment_withdrawals")
          .where("providerTransactionId", "==", transferId.toString())
          .where("userType", "==", "affiliate")
          .limit(1)
          .get();

        if (!unifiedQuery.empty) {
          payoutDoc = unifiedQuery.docs[0];
        }
      }

      if (!payoutDoc) {
        logger.warn("[WiseWebhook] No payout found for transfer", { transferId });
        res.status(200).send("OK - Payout not found");
        return;
      }

      const payoutData = payoutDoc.data();
      const payoutId = payoutDoc.id;
      // Detect if this is a unified payment_withdrawals doc (W1 migration) or legacy affiliate_payouts
      const isUnifiedWithdrawal = payoutDoc.ref.parent.id === "payment_withdrawals";

      logger.info("[WiseWebhook] Found payout", {
        payoutId,
        collection: payoutDoc.ref.parent.id,
        currentPayoutStatus: payoutData.status,
        wiseState: currentState,
      });

      // 5. Map Wise state to payout status
      // Note: payment_withdrawals uses "completed", affiliate_payouts uses "paid"
      const now = Timestamp.now();
      let newStatus: string | null = null;
      let shouldRestoreBalance = false;
      let updateData: Record<string, unknown> = {
        wiseState: currentState,
        wiseStateUpdatedAt: now,
        updatedAt: now,
      };

      switch (currentState) {
        case "processing":
        case "funds_converted":
          newStatus = "processing";
          break;

        case "outgoing_payment_sent":
          // AUDIT-FIX C5: Always use "completed" for consistency with frontend WithdrawalStatus enum
          // Both paidAt and completedAt are set for backward compatibility with legacy affiliate_payouts
          newStatus = "completed";
          updateData.paidAt = now;
          updateData.completedAt = now;
          break;

        case "cancelled":
        case "funds_refunded":
        case "bounced_back":
        case "charged_back":
          newStatus = "failed";
          shouldRestoreBalance = true;
          updateData.failedAt = now;
          updateData.failureReason = `Wise transfer ${currentState}`;
          break;

        default:
          // Other states don't change our payout status
          logger.info("[WiseWebhook] No status change for state", { currentState });
      }

      // 6. Update payout if status changed
      if (newStatus && newStatus !== payoutData.status) {
        updateData.status = newStatus;
        updateData.previousStatus = payoutData.status;
        // For unified withdrawals, also append to statusHistory array
        if (isUnifiedWithdrawal) {
          updateData.statusHistory = FieldValue.arrayUnion({
            status: newStatus,
            timestamp: now.toDate().toISOString(),
            actorType: "system",
            note: `Wise webhook: ${currentState}`,
          });
        }

        await payoutDoc.ref.update(updateData);

        logger.info("[WiseWebhook] Updated payout status", {
          payoutId,
          oldStatus: payoutData.status,
          newStatus,
        });

        // 7. If failed, restore user balance and commission statuses
        if (shouldRestoreBalance) {
          await restoreBalanceOnFailure(db, payoutData);
        }

        // 8. Create notification for user
        await createPayoutNotification(db, payoutData.userId, newStatus, payoutData.amount);
      } else {
        // Just update the Wise state tracking
        await payoutDoc.ref.update({
          wiseState: currentState,
          wiseStateUpdatedAt: now,
          updatedAt: now,
        });
      }

      res.status(200).send("OK");
    } catch (error) {
      logger.error("[WiseWebhook] Error processing webhook", { error });
      // Return 200 to prevent Wise from retrying indefinitely
      // Log the error for manual investigation
      res.status(200).send("OK - Error logged");
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Restore user balance when a payout fails
 * P0-4 FIX: Uses transaction + validates commission status before reverting
 * to prevent double-credit if commissions were already released
 */
async function restoreBalanceOnFailure(
  db: FirebaseFirestore.Firestore,
  payoutData: FirebaseFirestore.DocumentData
): Promise<void> {
  const { userId, amount, commissionIds } = payoutData;

  try {
    await db.runTransaction(async (transaction) => {
      const now = Timestamp.now();

      // 1. Re-read user doc to verify current state
      const userRef = db.collection("users").doc(userId);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        logger.error("[WiseWebhook] User not found during restore", { userId });
        return;
      }

      // 2. Restore only commissions that are still in "paid" status
      let restoredAmount = 0;
      let restoredCount = 0;

      if (commissionIds && Array.isArray(commissionIds)) {
        for (const commissionId of commissionIds) {
          const commissionRef = db.collection("affiliate_commissions").doc(commissionId);
          const commSnap = await transaction.get(commissionRef);

          if (commSnap.exists && commSnap.data()!.status === "paid") {
            transaction.update(commissionRef, {
              status: "available",
              payoutId: null,
              paidAt: null,
              updatedAt: now,
            });
            restoredAmount += commSnap.data()!.amount || 0;
            restoredCount++;
          } else {
            logger.warn("[WiseWebhook] Skipping commission restore - not in paid status", {
              commissionId,
              currentStatus: commSnap.exists ? commSnap.data()!.status : "not_found",
            });
          }
        }
      }

      // 3. Restore user balance only for the amount actually restored
      if (restoredAmount > 0) {
        transaction.update(userRef, {
          availableBalance: FieldValue.increment(restoredAmount),
          pendingPayoutId: null,
          updatedAt: now,
        });
      } else {
        // Still clear pendingPayoutId even if no commissions restored
        transaction.update(userRef, {
          pendingPayoutId: null,
          updatedAt: now,
        });
      }

      logger.info("[WiseWebhook] Restored balance after payout failure", {
        userId,
        originalAmount: amount,
        restoredAmount,
        commissionsRestored: restoredCount,
        totalCommissions: commissionIds?.length || 0,
      });
    });
  } catch (error) {
    logger.error("[WiseWebhook] Error restoring balance", { userId, error });
    throw error;
  }
}

/**
 * Create a notification for the user about payout status
 */
async function createPayoutNotification(
  db: FirebaseFirestore.Firestore,
  userId: string,
  status: string,
  amount: number
): Promise<void> {
  try {
    // Get user data for notification
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data()!;

    // Map status to event type
    let eventType: string;
    switch (status) {
      case "completed":
      case "paid": // Legacy status kept for backward compatibility
        eventType = "affiliate_payout_completed";
        break;
      case "failed":
        eventType = "affiliate_payout_failed";
        break;
      case "processing":
        eventType = "affiliate_payout_processing";
        break;
      default:
        return;
    }

    // Create message event for notification pipeline
    await db.collection("message_events").add({
      eventId: eventType,
      recipientUserId: userId,
      recipientEmail: userData.email,
      recipientName: userData.displayName || userData.firstName || "Affilié",
      data: {
        amount: amount / 100,
        currency: "USD",
        status,
      },
      channels: ["email", "push", "in_app"],
      status: "pending",
      createdAt: Timestamp.now(),
    });

    logger.info("[WiseWebhook] Created notification", {
      userId,
      eventType,
    });
  } catch (error) {
    logger.error("[WiseWebhook] Error creating notification", { userId, error });
    // Don't throw - notification failure shouldn't fail the webhook
  }
}
