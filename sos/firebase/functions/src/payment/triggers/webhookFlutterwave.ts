/**
 * HTTP Endpoint: webhookFlutterwave
 *
 * Handles incoming webhooks from Flutterwave payment provider.
 * - Verifies webhook signature using verif-hash header
 * - Parses transfer completion/failure events
 * - Updates withdrawal status in Firestore
 * - Logs webhook events
 */

import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import * as crypto from "crypto";

import { WithdrawalRequest, WithdrawalStatus } from "../types";
import {
  FLUTTERWAVE_WEBHOOK_SECRET,
  getFlutterwaveWebhookSecret,
} from "../../lib/secrets";

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
 * Flutterwave webhook event types
 */
type FlutterwaveEventType =
  | "transfer.completed"
  | "transfer.failed"
  | "transfer.reversed";

/**
 * Flutterwave transfer status values
 */
type FlutterwaveTransferStatus = "NEW" | "PENDING" | "SUCCESSFUL" | "FAILED";

/**
 * Flutterwave webhook payload structure
 */
interface FlutterwaveWebhookPayload {
  event: FlutterwaveEventType;
  data: {
    id: number;
    account_number: string;
    bank_code: string;
    full_name: string;
    date_created: string;
    currency: string;
    debit_currency: string;
    amount: number;
    fee: number;
    status: FlutterwaveTransferStatus;
    reference: string;
    meta?: Record<string, unknown>[];
    narration: string;
    complete_message?: string;
    requires_approval: number;
    is_approved: number;
    bank_name: string;
    [key: string]: unknown;
  };
  "event.type"?: string;
}

/**
 * Verify Flutterwave webhook signature
 *
 * Flutterwave uses a simple secret hash comparison via verif-hash header
 * SECURITY: Uses timing-safe comparison to prevent timing attacks
 */
function verifyFlutterwaveSignature(
  verifHash: string,
  webhookSecret: string
): boolean {
  if (!webhookSecret) {
    logger.error("[webhookFlutterwave] Webhook secret not configured");
    return false;
  }

  if (!verifHash) {
    logger.error("[webhookFlutterwave] Missing verif-hash header");
    return false;
  }

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  // Convert strings to buffers of equal length for comparison
  try {
    const verifHashBuffer = Buffer.from(verifHash, "utf-8");
    const webhookSecretBuffer = Buffer.from(webhookSecret, "utf-8");

    // If lengths differ, create a buffer of matching length to maintain constant time
    if (verifHashBuffer.length !== webhookSecretBuffer.length) {
      logger.warn("[webhookFlutterwave] Hash length mismatch");
      return false;
    }

    const isValid = crypto.timingSafeEqual(verifHashBuffer, webhookSecretBuffer);

    logger.info("[webhookFlutterwave] Signature verification", {
      isValid,
      hashLength: verifHash?.length || 0,
    });

    return isValid;
  } catch (error) {
    logger.error("[webhookFlutterwave] Signature verification error", { error });
    return false;
  }
}

/**
 * Map Flutterwave status to our withdrawal status
 */
function mapFlutterwaveStatusToWithdrawalStatus(
  status: FlutterwaveTransferStatus,
  event: FlutterwaveEventType
): WithdrawalStatus {
  // Event-based mapping takes priority
  if (event === "transfer.completed" || status === "SUCCESSFUL") {
    return "completed";
  }

  if (event === "transfer.failed" || status === "FAILED") {
    return "failed";
  }

  if (event === "transfer.reversed") {
    return "failed";
  }

  // Status-based fallback
  const statusMap: Record<FlutterwaveTransferStatus, WithdrawalStatus> = {
    NEW: "processing",
    PENDING: "processing",
    SUCCESSFUL: "completed",
    FAILED: "failed",
  };

  return statusMap[status] || "processing";
}

/**
 * Get error message for failed transfers
 */
function getErrorMessage(
  webhookData: FlutterwaveWebhookPayload
): string | undefined {
  if (webhookData.event === "transfer.failed") {
    return (
      webhookData.data.complete_message ||
      "Transfer failed - recipient bank rejected the payment"
    );
  }

  if (webhookData.event === "transfer.reversed") {
    return "Transfer was reversed by Flutterwave";
  }

  return undefined;
}

/**
 * Find withdrawal by Flutterwave transfer reference or ID
 */
async function findWithdrawalByReference(
  reference: string,
  transferId: string
): Promise<WithdrawalRequest | null> {
  const db = getFirestore();

  // First, try to find by provider transaction ID
  const byTransactionIdQuery = await db
    .collection(WITHDRAWAL_COLLECTION)
    .where("providerTransactionId", "==", transferId)
    .where("provider", "==", "flutterwave")
    .limit(1)
    .get();

  if (!byTransactionIdQuery.empty) {
    const doc = byTransactionIdQuery.docs[0];
    return { ...doc.data(), id: doc.id } as WithdrawalRequest;
  }

  // Try by reference (which should contain our withdrawal ID)
  // Reference format is typically: "withdrawal_id" or contains it
  const potentialWithdrawalId = reference.split("_").pop() || reference;

  // Try direct document lookup
  const withdrawalDoc = await db
    .collection(WITHDRAWAL_COLLECTION)
    .doc(potentialWithdrawalId)
    .get();

  if (withdrawalDoc.exists) {
    const data = withdrawalDoc.data()!;
    if (data.provider === "flutterwave") {
      return { ...data, id: withdrawalDoc.id } as WithdrawalRequest;
    }
  }

  // Query by reference in provider response
  const byReferenceQuery = await db
    .collection(WITHDRAWAL_COLLECTION)
    .where("provider", "==", "flutterwave")
    .limit(100)
    .get();

  for (const doc of byReferenceQuery.docs) {
    const data = doc.data();
    // Check if reference matches in provider response
    if (
      data.providerResponse?.reference === reference ||
      data.providerResponse?.id?.toString() === transferId
    ) {
      return { ...data, id: doc.id } as WithdrawalRequest;
    }
  }

  logger.warn("[webhookFlutterwave] Withdrawal not found", {
    reference,
    transferId,
  });

  return null;
}

/**
 * Update withdrawal status based on webhook data
 */
async function updateWithdrawalFromWebhook(
  withdrawal: WithdrawalRequest,
  webhookData: FlutterwaveWebhookPayload
): Promise<void> {
  const db = getFirestore();
  const withdrawalRef = db.collection(WITHDRAWAL_COLLECTION).doc(withdrawal.id);

  const newStatus = mapFlutterwaveStatusToWithdrawalStatus(
    webhookData.data.status,
    webhookData.event
  );
  const errorMessage = getErrorMessage(webhookData);

  // Don't update if status is the same
  if (withdrawal.status === newStatus) {
    logger.debug("[webhookFlutterwave] Status unchanged, skipping update", {
      withdrawalId: withdrawal.id,
      status: newStatus,
    });
    return;
  }

  const statusEntry = {
    status: newStatus,
    timestamp: new Date().toISOString(),
    actorType: "system",
    note: `Flutterwave webhook: ${webhookData.event}`,
    metadata: {
      flutterwaveStatus: webhookData.data.status,
      event: webhookData.event,
      transferId: webhookData.data.id,
      completeMessage: webhookData.data.complete_message,
    },
  };

  const updateData: Record<string, unknown> = {
    status: newStatus,
    providerStatus: webhookData.data.status,
    statusHistory: FieldValue.arrayUnion(statusEntry),
    lastWebhookAt: new Date().toISOString(),
  };

  // Add timestamp based on status
  if (newStatus === "completed") {
    updateData.completedAt = new Date().toISOString();
    // Update fees if provided
    if (webhookData.data.fee) {
      updateData.fees = Math.round(webhookData.data.fee * 100); // Convert to cents
    }
  } else if (newStatus === "failed") {
    updateData.failedAt = new Date().toISOString();
    updateData.errorMessage = errorMessage;
    updateData.errorCode = webhookData.data.status;
  }

  await withdrawalRef.update(updateData);

  logger.info("[webhookFlutterwave] Withdrawal updated from webhook", {
    withdrawalId: withdrawal.id,
    oldStatus: withdrawal.status,
    newStatus,
    flutterwaveStatus: webhookData.data.status,
    event: webhookData.event,
  });
}

/**
 * Log webhook event
 */
async function logWebhookEvent(
  webhookData: FlutterwaveWebhookPayload,
  withdrawalId: string | null,
  success: boolean,
  error?: string
): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  const webhookLog = {
    id: "",
    provider: "flutterwave",
    eventType: webhookData.event,
    resourceId: webhookData.data?.id,
    reference: webhookData.data?.reference,
    withdrawalId,
    success,
    error,
    rawPayload: webhookData,
    receivedAt: now,
  };

  const logRef = db.collection("payment_webhook_logs").doc();
  webhookLog.id = logRef.id;
  await logRef.set(webhookLog);

  logger.info("[webhookFlutterwave] Webhook event logged", {
    logId: webhookLog.id,
    eventType: webhookData.event,
    success,
  });
}

/**
 * Main webhook handler
 */
export const paymentWebhookFlutterwave = onRequest(
  {
    region: "europe-west3",
    // P0 CRITICAL FIX: Allow unauthenticated access for Flutterwave webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [FLUTTERWAVE_WEBHOOK_SECRET],
    cors: false,
  },
  async (req, res) => {
    ensureInitialized();

    // Only accept POST requests
    if (req.method !== "POST") {
      logger.warn("[webhookFlutterwave] Invalid method", { method: req.method });
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Get verification hash from header
    const verifHash = req.headers["verif-hash"] as string;

    logger.info("[webhookFlutterwave] Received webhook", {
      contentType: req.headers["content-type"],
      hasVerifHash: !!verifHash,
    });

    try {
      // Verify signature
      const webhookSecret = getFlutterwaveWebhookSecret();

      if (!verifyFlutterwaveSignature(verifHash, webhookSecret)) {
        logger.error("[webhookFlutterwave] Invalid signature");
        res.status(401).send("Invalid signature");
        return;
      }

      // Parse webhook payload
      const webhookData = req.body as FlutterwaveWebhookPayload;

      // Normalize event type (Flutterwave sometimes uses different formats)
      const eventType = webhookData.event || webhookData["event.type"];
      if (!eventType) {
        logger.error("[webhookFlutterwave] Missing event type");
        res.status(400).send("Missing event type");
        return;
      }
      webhookData.event = eventType as FlutterwaveEventType;

      logger.info("[webhookFlutterwave] Processing webhook", {
        event: webhookData.event,
        transferId: webhookData.data?.id,
        status: webhookData.data?.status,
        reference: webhookData.data?.reference,
      });

      // Idempotency check - prevent duplicate processing
      const db = getFirestore();
      const idempotencyKey = `flutterwave_${webhookData.data?.id || 'unknown'}_${webhookData.event}`;
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
            eventType: webhookData.event,
            transferId: webhookData.data?.id,
            reference: webhookData.data?.reference,
            source: 'flutterwave',
            expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        });
      } catch (txError) {
        logger.error('[webhookFlutterwave] Idempotency check failed', { txError });
        res.status(500).send('Internal error');
        return;
      }
      if (isDuplicate) {
        logger.info('[webhookFlutterwave] Duplicate event, skipping', { idempotencyKey });
        res.status(200).send('OK - already processed');
        return;
      }

      // Only handle transfer events
      if (
        !webhookData.event.startsWith("transfer.") ||
        !["transfer.completed", "transfer.failed", "transfer.reversed"].includes(
          webhookData.event
        )
      ) {
        logger.info("[webhookFlutterwave] Ignoring non-transfer event", {
          event: webhookData.event,
        });
        await logWebhookEvent(webhookData, null, true, "Event type not handled");
        res.status(200).send("OK");
        return;
      }

      // Extract transfer information
      const reference = webhookData.data?.reference;
      const transferId = webhookData.data?.id?.toString();

      if (!reference && !transferId) {
        logger.error("[webhookFlutterwave] Missing reference and transfer ID");
        await logWebhookEvent(
          webhookData,
          null,
          false,
          "Missing reference and transfer ID"
        );
        res.status(400).send("Missing reference and transfer ID");
        return;
      }

      // Find the associated withdrawal
      const withdrawal = await findWithdrawalByReference(
        reference || "",
        transferId || ""
      );

      if (!withdrawal) {
        logger.warn("[webhookFlutterwave] Withdrawal not found", {
          reference,
          transferId,
        });
        await logWebhookEvent(webhookData, null, false, "Withdrawal not found");
        // Still return 200 to acknowledge receipt
        res.status(200).send("OK");
        return;
      }

      // Update withdrawal status
      await updateWithdrawalFromWebhook(withdrawal, webhookData);

      // Log webhook event
      await logWebhookEvent(webhookData, withdrawal.id, true);

      logger.info("[webhookFlutterwave] Webhook processed successfully", {
        withdrawalId: withdrawal.id,
        transferId,
        event: webhookData.event,
        status: webhookData.data.status,
      });

      res.status(200).send("OK");
    } catch (error) {
      logger.error("[webhookFlutterwave] Error processing webhook", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Try to log the error
      try {
        await logWebhookEvent(
          req.body as FlutterwaveWebhookPayload,
          null,
          false,
          error instanceof Error ? error.message : "Unknown error"
        );
      } catch {
        // Ignore logging error
      }

      // Return 200 to prevent Flutterwave from retrying
      res.status(200).send("OK");
    }
  }
);
