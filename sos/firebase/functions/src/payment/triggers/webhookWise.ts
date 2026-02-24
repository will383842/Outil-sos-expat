/**
 * HTTP Endpoint: webhookWise
 *
 * Handles incoming webhooks from Wise payment provider.
 * - Verifies webhook signature
 * - Parses transfer status updates
 * - Updates withdrawal status in Firestore
 * - Logs webhook events
 */

import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { WithdrawalRequest, WithdrawalStatus } from "../types";
import { WISE_WEBHOOK_SECRET } from "../../lib/secrets";
// P2 FIX: Use shared Wise signature verifier (avoid duplication with wiseWebhook)
import { verifyWiseWebhookSignature } from "../../lib/wiseWebhookUtils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Withdrawal document path in Firestore
 */
const WITHDRAWAL_COLLECTION = "payment_withdrawals";

/**
 * Wise webhook event types we handle
 */
type WiseWebhookEventType =
  | "transfers#state-change"
  | "transfers#active-cases"
  | "balances#credit"
  | "balances#update";

/**
 * Wise transfer states
 */
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

/**
 * Wise webhook payload structure
 */
interface WiseWebhookPayload {
  subscriptionId: string;
  profileId: number;
  resourceId: number;
  eventType: WiseWebhookEventType;
  sentAt: string;
  data: {
    resource: {
      id: number;
      profile_id: number;
      account_id: number;
      type: string;
      state: WiseTransferState;
      reference: string;
      customerTransactionId?: string;
      rate: number;
      created: string;
      business: number;
      transferId: number;
      sourceValue: number;
      sourceCurrency: string;
      targetValue: number;
      targetCurrency: string;
      [key: string]: unknown;
    };
    current_state?: WiseTransferState;
    previous_state?: WiseTransferState;
    occurred_at?: string;
  };
}

/**
 * Map Wise transfer state to our withdrawal status
 */
function mapWiseStateToStatus(state: WiseTransferState): WithdrawalStatus {
  const stateMap: Record<WiseTransferState, WithdrawalStatus> = {
    incoming_payment_waiting: "processing",
    incoming_payment_initiated: "processing",
    processing: "processing",
    funds_converted: "processing",
    outgoing_payment_sent: "completed",
    cancelled: "cancelled",
    funds_refunded: "failed",
    bounced_back: "failed",
    charged_back: "failed",
  };

  return stateMap[state] || "processing";
}

/**
 * Get error message for failed states
 */
function getErrorMessageForState(state: WiseTransferState): string | undefined {
  const errorMessages: Partial<Record<WiseTransferState, string>> = {
    funds_refunded: "Transfer funds were refunded by Wise",
    bounced_back: "Transfer bounced back - recipient bank rejected the payment",
    charged_back: "Transfer was charged back",
    cancelled: "Transfer was cancelled",
  };

  return errorMessages[state];
}

/**
 * Find withdrawal by Wise transfer ID
 */
async function findWithdrawalByTransferId(
  transferId: string
): Promise<WithdrawalRequest | null> {
  const db = getFirestore();

  // First, try to find by provider transaction ID
  const byTransactionIdQuery = await db
    .collection(WITHDRAWAL_COLLECTION)
    .where("providerTransactionId", "==", transferId)
    .where("provider", "==", "wise")
    .limit(1)
    .get();

  if (!byTransactionIdQuery.empty) {
    const doc = byTransactionIdQuery.docs[0];
    return { ...doc.data(), id: doc.id } as WithdrawalRequest;
  }

  // Try to find by external ID (withdrawal ID stored in customerTransactionId)
  const byExternalIdQuery = await db
    .collection(WITHDRAWAL_COLLECTION)
    .where("provider", "==", "wise")
    .limit(100) // Query more to search through
    .get();

  for (const doc of byExternalIdQuery.docs) {
    const data = doc.data();
    // Check if providerResponse contains matching data
    if (data.providerResponse?.transferId?.toString() === transferId) {
      return { ...data, id: doc.id } as WithdrawalRequest;
    }
  }

  logger.warn("[webhookWise] Withdrawal not found for transfer", { transferId });
  return null;
}

/**
 * Update withdrawal status based on webhook data
 */
async function updateWithdrawalFromWebhook(
  withdrawal: WithdrawalRequest,
  wiseState: WiseTransferState,
  webhookData: WiseWebhookPayload
): Promise<void> {
  const db = getFirestore();
  const withdrawalRef = db.collection(WITHDRAWAL_COLLECTION).doc(withdrawal.id);

  const newStatus = mapWiseStateToStatus(wiseState);
  const errorMessage = getErrorMessageForState(wiseState);

  // Don't update if status is the same
  if (withdrawal.status === newStatus) {
    logger.debug("[webhookWise] Status unchanged, skipping update", {
      withdrawalId: withdrawal.id,
      status: newStatus,
    });
    return;
  }

  const statusEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    actorType: "system",
    note: `Wise webhook: ${wiseState}`,
    metadata: {
      wiseState,
      previousState: webhookData.data.previous_state,
      occurredAt: webhookData.data.occurred_at,
      transferId: webhookData.data.resource.id,
    },
  };

  // AUDIT-FIX M6: Use FieldValue.arrayUnion instead of array spread to prevent race conditions
  const updateData: Record<string, unknown> = {
    status: newStatus,
    providerStatus: wiseState,
    statusHistory: FieldValue.arrayUnion(statusEntry),
    lastWebhookAt: new Date().toISOString(),
  };

  // Add timestamp based on status
  if (newStatus === "completed") {
    updateData.completedAt = new Date().toISOString();
  } else if (newStatus === "failed") {
    updateData.failedAt = new Date().toISOString();
    updateData.errorMessage = errorMessage;
    updateData.errorCode = wiseState;
  } else if (newStatus === "cancelled") {
    updateData.cancelledAt = new Date().toISOString();
  }

  await withdrawalRef.update(updateData);

  logger.info("[webhookWise] Withdrawal updated from webhook", {
    withdrawalId: withdrawal.id,
    oldStatus: withdrawal.status,
    newStatus,
    wiseState,
  });
}

/**
 * Log webhook event
 */
async function logWebhookEvent(
  webhookData: WiseWebhookPayload,
  withdrawalId: string | null,
  success: boolean,
  error?: string
): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  const webhookLog = {
    id: "",
    provider: "wise",
    eventType: webhookData.eventType,
    resourceId: webhookData.resourceId,
    withdrawalId,
    success,
    error,
    rawPayload: webhookData,
    receivedAt: now,
  };

  const logRef = db.collection("payment_webhook_logs").doc();
  webhookLog.id = logRef.id;
  await logRef.set(webhookLog);

  logger.info("[webhookWise] Webhook event logged", {
    logId: webhookLog.id,
    eventType: webhookData.eventType,
    success,
  });
}

/**
 * Main webhook handler
 */
export const paymentWebhookWise = onRequest(
  {
    region: "europe-west3",
    // P0 CRITICAL FIX: Allow unauthenticated access for Wise webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [WISE_WEBHOOK_SECRET],
    cors: false,
  },
  async (req, res) => {
    ensureInitialized();

    // Only accept POST requests
    if (req.method !== "POST") {
      logger.warn("[webhookWise] Invalid method", { method: req.method });
      res.status(405).send("Method Not Allowed");
      return;
    }

    const signature = req.headers["x-signature-sha256"] as string;
    const rawBody = JSON.stringify(req.body);

    logger.info("[webhookWise] Received webhook", {
      contentType: req.headers["content-type"],
      hasSignature: !!signature,
      bodyLength: rawBody?.length || 0,
    });

    try {
      // Verify signature — P2 FIX: use shared verifier
      if (!verifyWiseWebhookSignature(rawBody, signature, WISE_WEBHOOK_SECRET.value())) {
        logger.error("[webhookWise] Invalid signature");
        res.status(401).send("Invalid signature");
        return;
      }

      // Parse webhook payload
      const webhookData = req.body as WiseWebhookPayload;

      logger.info("[webhookWise] Processing webhook", {
        eventType: webhookData.eventType,
        resourceId: webhookData.resourceId,
        profileId: webhookData.profileId,
      });

      // Idempotency check - prevent duplicate processing
      const db = getFirestore();
      const idempotencyKey = `wise_${webhookData.resourceId || 'unknown'}_${webhookData.eventType}`;
      const webhookEventRef = db.collection('processed_webhook_events').doc(idempotencyKey);
      let isDuplicate = false;
      try {
        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(webhookEventRef);
          if (doc.exists) {
            isDuplicate = true;
            return;
          }
          transaction.set(webhookEventRef, {
            processedAt: FieldValue.serverTimestamp(),
            eventType: webhookData.eventType,
            resourceId: webhookData.resourceId,
            source: 'wise',
            expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        });
      } catch (txError) {
        logger.error('[webhookWise] Idempotency check failed', { txError });
        res.status(500).send('Internal error');
        return;
      }
      if (isDuplicate) {
        logger.info('[webhookWise] Duplicate event, skipping', { idempotencyKey });
        res.status(200).send('OK - already processed');
        return;
      }

      // Only handle transfer state changes
      if (webhookData.eventType !== "transfers#state-change") {
        logger.info("[webhookWise] Ignoring non-transfer event", {
          eventType: webhookData.eventType,
        });
        await logWebhookEvent(webhookData, null, true, "Event type not handled");
        res.status(200).send("OK");
        return;
      }

      // Extract transfer information
      const transferId = webhookData.data.resource.id?.toString() ||
                         webhookData.data.resource.transferId?.toString() ||
                         webhookData.resourceId?.toString();

      const newState = webhookData.data.current_state || webhookData.data.resource.state;

      if (!transferId || !newState) {
        logger.error("[webhookWise] Missing transfer ID or state", {
          transferId,
          newState,
        });
        await logWebhookEvent(webhookData, null, false, "Missing transfer ID or state");
        res.status(400).send("Missing transfer ID or state");
        return;
      }

      // Find the associated withdrawal
      const withdrawal = await findWithdrawalByTransferId(transferId);

      if (!withdrawal) {
        logger.warn("[webhookWise] Withdrawal not found", { transferId });
        await logWebhookEvent(webhookData, null, false, "Withdrawal not found");
        // Still return 200 to acknowledge receipt (Wise will retry otherwise)
        res.status(200).send("OK");
        return;
      }

      // Update withdrawal status
      await updateWithdrawalFromWebhook(withdrawal, newState, webhookData);

      // Log webhook event
      await logWebhookEvent(webhookData, withdrawal.id, true);

      logger.info("[webhookWise] Webhook processed successfully", {
        withdrawalId: withdrawal.id,
        transferId,
        newState,
      });

      res.status(200).send("OK");
    } catch (error) {
      logger.error("[webhookWise] Error processing webhook", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Try to log the error
      try {
        await logWebhookEvent(
          req.body as WiseWebhookPayload,
          null,
          false,
          error instanceof Error ? error.message : "Unknown error"
        );
      } catch {
        // Ignore logging error
      }

      // Return 200 to prevent Wise from retrying (we've logged the error)
      res.status(200).send("OK");
    }
  }
);
