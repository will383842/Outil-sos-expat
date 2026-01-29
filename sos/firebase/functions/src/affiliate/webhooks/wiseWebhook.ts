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
import * as crypto from "crypto";
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import { WISE_WEBHOOK_SECRET } from "../../lib/secrets";

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
    region: "europe-west1",
    memory: "256MiB",
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
      // 1. Verify webhook signature (if secret is configured)
      const signature = req.headers["x-signature-sha256"] as string;
      const webhookSecret = WISE_WEBHOOK_SECRET.value();

      if (webhookSecret && webhookSecret !== "not_configured") {
        if (!signature) {
          logger.warn("[WiseWebhook] Missing signature header");
          res.status(401).send("Missing signature");
          return;
        }

        const rawBody = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(rawBody)
          .digest("hex");

        if (signature !== expectedSignature) {
          logger.warn("[WiseWebhook] Invalid signature", {
            received: signature.substring(0, 10) + "...",
          });
          res.status(401).send("Invalid signature");
          return;
        }
      } else {
        logger.info("[WiseWebhook] Signature verification skipped (secret not configured)");
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
      const payoutQuery = await db
        .collection("affiliate_payouts")
        .where("wiseTransferId", "==", transferId.toString())
        .limit(1)
        .get();

      if (payoutQuery.empty) {
        logger.warn("[WiseWebhook] No payout found for transfer", { transferId });
        res.status(200).send("OK - Payout not found");
        return;
      }

      const payoutDoc = payoutQuery.docs[0];
      const payoutData = payoutDoc.data();
      const payoutId = payoutDoc.id;

      logger.info("[WiseWebhook] Found payout", {
        payoutId,
        currentPayoutStatus: payoutData.status,
        wiseState: currentState,
      });

      // 5. Map Wise state to payout status
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
          newStatus = "paid";
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
 */
async function restoreBalanceOnFailure(
  db: FirebaseFirestore.Firestore,
  payoutData: FirebaseFirestore.DocumentData
): Promise<void> {
  const { userId, amount, commissionIds } = payoutData;

  try {
    // Start a batch
    const batch = db.batch();

    // 1. Restore user balance
    const userRef = db.collection("users").doc(userId);
    batch.update(userRef, {
      availableBalance: FieldValue.increment(amount),
      pendingPayoutId: null,
      updatedAt: Timestamp.now(),
    });

    // 2. Restore commission statuses
    if (commissionIds && Array.isArray(commissionIds)) {
      for (const commissionId of commissionIds) {
        const commissionRef = db.collection("affiliate_commissions").doc(commissionId);
        batch.update(commissionRef, {
          status: "available",
          payoutId: null,
          updatedAt: Timestamp.now(),
        });
      }
    }

    await batch.commit();

    logger.info("[WiseWebhook] Restored balance after payout failure", {
      userId,
      amount,
      commissionsRestored: commissionIds?.length || 0,
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
      case "paid":
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
