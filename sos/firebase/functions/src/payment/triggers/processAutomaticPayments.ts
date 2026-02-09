/**
 * Scheduled Function: processAutomaticPayments
 *
 * Runs every 15 minutes to process queued withdrawals automatically.
 * - Gets payment configuration
 * - Finds approved/queued withdrawals ready for processing
 * - Processes each one via PaymentRouter
 * - Handles errors and retries
 * - Logs results
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  WithdrawalRequest,
  PaymentConfig,
  DEFAULT_PAYMENT_CONFIG,
  WithdrawalStatus,
  BankTransferDetails,
  MobileMoneyDetails,
} from "../types";
import { createPaymentRouter } from "../services/paymentRouter";
import {
  WISE_SECRETS,
  FLUTTERWAVE_SECRETS,
  ENCRYPTION_KEY,
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
 * Payment config document path
 */
const CONFIG_DOC_PATH = "config/payment_config";

/**
 * Maximum withdrawals to process per run (to stay within function timeout)
 */
const MAX_WITHDRAWALS_PER_RUN = 10;

/**
 * Get payment configuration from Firestore
 */
async function getPaymentConfig(): Promise<PaymentConfig> {
  const db = getFirestore();
  const configDoc = await db.doc(CONFIG_DOC_PATH).get();

  if (!configDoc.exists) {
    logger.warn("[processAutomaticPayments] Payment config not found, using defaults");
    return {
      ...DEFAULT_PAYMENT_CONFIG,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    };
  }

  return configDoc.data() as PaymentConfig;
}

/**
 * Find withdrawals ready for automatic processing
 */
async function findReadyWithdrawals(config: PaymentConfig): Promise<WithdrawalRequest[]> {
  const db = getFirestore();
  const now = new Date();

  // Check if automatic or hybrid mode is enabled
  if (config.paymentMode === "manual") {
    logger.info("[processAutomaticPayments] Manual mode - skipping auto-processing");
    return [];
  }

  // Find queued withdrawals that are past their processing delay
  const readyWithdrawalsQuery = db
    .collection(WITHDRAWAL_COLLECTION)
    .where("status", "in", ["queued", "approved"])
    .where("isAutomatic", "==", true)
    .orderBy("requestedAt", "asc")
    .limit(MAX_WITHDRAWALS_PER_RUN);

  const snapshot = await readyWithdrawalsQuery.get();

  const readyWithdrawals: WithdrawalRequest[] = [];

  for (const doc of snapshot.docs) {
    const withdrawal = { ...doc.data(), id: doc.id } as WithdrawalRequest;

    // Check if the processing delay has passed
    const processAfter = (withdrawal as unknown as { processAfter?: string }).processAfter;
    if (processAfter) {
      const processAfterDate = new Date(processAfter);
      if (processAfterDate > now) {
        logger.debug("[processAutomaticPayments] Withdrawal not yet ready", {
          withdrawalId: withdrawal.id,
          processAfter,
          now: now.toISOString(),
        });
        continue;
      }
    }

    // Check if withdrawal should be retried
    if (withdrawal.status === "failed" as WithdrawalStatus) {
      const canRetry = (withdrawal as unknown as { canRetry?: boolean }).canRetry;
      const nextRetryAt = (withdrawal as unknown as { nextRetryAt?: string }).nextRetryAt;

      if (!canRetry || (nextRetryAt && new Date(nextRetryAt) > now)) {
        continue;
      }
    }

    readyWithdrawals.push(withdrawal);
  }

  logger.info("[processAutomaticPayments] Found ready withdrawals", {
    count: readyWithdrawals.length,
    totalQueued: snapshot.size,
  });

  return readyWithdrawals;
}

/**
 * Process a single withdrawal
 */
async function processWithdrawal(
  withdrawal: WithdrawalRequest,
  config: PaymentConfig
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();
  const withdrawalRef = db.collection(WITHDRAWAL_COLLECTION).doc(withdrawal.id);

  logger.info("[processAutomaticPayments] Processing withdrawal", {
    withdrawalId: withdrawal.id,
    userId: withdrawal.userId,
    amount: withdrawal.amount,
    provider: withdrawal.provider,
  });

  try {
    // Update status to processing
    const processingStatusEntry = {
      status: "processing" as WithdrawalStatus,
      timestamp: new Date().toISOString(),
      actorType: "system",
      note: "Automatic processing started",
    };

    await withdrawalRef.update({
      status: "processing",
      processedAt: new Date().toISOString(),
      statusHistory: [...withdrawal.statusHistory, processingStatusEntry],
    });

    // Create payment router with config
    const router = createPaymentRouter({
      wiseEnabled: config.wiseEnabled,
      flutterwaveEnabled: config.flutterwaveEnabled,
    });

    // Determine country code from payment details
    let countryCode: string;
    if (withdrawal.paymentDetails.type === "bank_transfer") {
      countryCode = (withdrawal.paymentDetails as BankTransferDetails).country;
    } else {
      countryCode = (withdrawal.paymentDetails as MobileMoneyDetails).country;
    }

    // Process the payment
    const result = await router.processPayment({
      withdrawalId: withdrawal.id,
      amount: withdrawal.amount,
      sourceCurrency: withdrawal.sourceCurrency,
      targetCurrency: withdrawal.targetCurrency,
      countryCode,
      methodType: withdrawal.methodType,
      details: withdrawal.paymentDetails,
      reference: `SOS-Expat Payout - ${withdrawal.id}`,
    });

    if (result.success) {
      // Update withdrawal with success
      const successStatusEntry = {
        status: "sent" as WithdrawalStatus,
        timestamp: new Date().toISOString(),
        actorType: "system",
        note: "Payment sent successfully",
        metadata: {
          transactionId: result.transactionId,
          fees: result.fees,
          exchangeRate: result.exchangeRate,
        },
      };

      await withdrawalRef.update({
        status: "sent",
        sentAt: new Date().toISOString(),
        providerTransactionId: result.transactionId,
        providerStatus: result.status,
        providerResponse: result.rawResponse,
        fees: result.fees,
        exchangeRate: result.exchangeRate,
        statusHistory: [...withdrawal.statusHistory, processingStatusEntry, successStatusEntry],
      });

      logger.info("[processAutomaticPayments] Withdrawal sent successfully", {
        withdrawalId: withdrawal.id,
        transactionId: result.transactionId,
      });

      return { success: true };
    } else {
      // Handle failure
      const newRetryCount = withdrawal.retryCount + 1;
      const canRetry = newRetryCount < config.maxRetries;
      const nextRetryAt = canRetry
        ? new Date(Date.now() + config.retryDelayMinutes * 60 * 1000).toISOString()
        : undefined;

      const failedStatusEntry = {
        status: "failed" as WithdrawalStatus,
        timestamp: new Date().toISOString(),
        actorType: "system",
        note: result.message || "Payment processing failed",
        metadata: {
          retryCount: newRetryCount,
          canRetry,
        },
      };

      await withdrawalRef.update({
        status: "failed",
        failedAt: new Date().toISOString(),
        errorMessage: result.message,
        providerResponse: result.rawResponse,
        retryCount: newRetryCount,
        canRetry,
        nextRetryAt,
        lastRetryAt: new Date().toISOString(),
        statusHistory: [...withdrawal.statusHistory, processingStatusEntry, failedStatusEntry],
      });

      logger.error("[processAutomaticPayments] Withdrawal failed", {
        withdrawalId: withdrawal.id,
        error: result.message,
        retryCount: newRetryCount,
        canRetry,
      });

      return { success: false, error: result.message };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle unexpected errors
    const newRetryCount = withdrawal.retryCount + 1;
    const canRetry = newRetryCount < config.maxRetries;
    const nextRetryAt = canRetry
      ? new Date(Date.now() + config.retryDelayMinutes * 60 * 1000).toISOString()
      : undefined;

    const errorStatusEntry = {
      status: "failed" as WithdrawalStatus,
      timestamp: new Date().toISOString(),
      actorType: "system",
      note: `Processing error: ${errorMessage}`,
      metadata: {
        retryCount: newRetryCount,
        canRetry,
        stack: error instanceof Error ? error.stack : undefined,
      },
    };

    try {
      await withdrawalRef.update({
        status: "failed",
        failedAt: new Date().toISOString(),
        errorMessage,
        retryCount: newRetryCount,
        canRetry,
        nextRetryAt,
        lastRetryAt: new Date().toISOString(),
        statusHistory: [...withdrawal.statusHistory, errorStatusEntry],
      });
    } catch (updateError) {
      logger.error("[processAutomaticPayments] Failed to update withdrawal status", {
        withdrawalId: withdrawal.id,
        originalError: errorMessage,
        updateError: updateError instanceof Error ? updateError.message : "Unknown",
      });
    }

    logger.error("[processAutomaticPayments] Unexpected error processing withdrawal", {
      withdrawalId: withdrawal.id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Log processing run results
 */
async function logProcessingRun(
  results: { withdrawalId: string; success: boolean; error?: string }[],
  config: PaymentConfig
): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  const processingLog = {
    id: "",
    type: "automatic_payment_run",
    timestamp: now,
    paymentMode: config.paymentMode,
    withdrawalsProcessed: results.length,
    successCount,
    failureCount,
    results: results.map((r) => ({
      withdrawalId: r.withdrawalId,
      success: r.success,
      error: r.error,
    })),
  };

  const logRef = db.collection("payment_processing_logs").doc();
  processingLog.id = logRef.id;
  await logRef.set(processingLog);

  logger.info("[processAutomaticPayments] Processing run complete", {
    logId: processingLog.id,
    total: results.length,
    success: successCount,
    failed: failureCount,
  });
}

/**
 * Main scheduled function
 */
export const paymentProcessAutomaticPayments = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes
    secrets: [...WISE_SECRETS, ...FLUTTERWAVE_SECRETS, ENCRYPTION_KEY],
  },
  async (_event) => {
    ensureInitialized();

    logger.info("[processAutomaticPayments] Starting automatic payment processing");

    try {
      // 1. Get payment configuration
      const config = await getPaymentConfig();

      // 2. Check if automatic processing is enabled
      if (config.paymentMode === "manual") {
        logger.info("[processAutomaticPayments] Manual mode active - no automatic processing");
        return;
      }

      // 3. Find withdrawals ready for processing
      const readyWithdrawals = await findReadyWithdrawals(config);

      if (readyWithdrawals.length === 0) {
        logger.info("[processAutomaticPayments] No withdrawals ready for processing");
        return;
      }

      // 4. Process each withdrawal
      const results: { withdrawalId: string; success: boolean; error?: string }[] = [];

      for (const withdrawal of readyWithdrawals) {
        const result = await processWithdrawal(withdrawal, config);
        results.push({
          withdrawalId: withdrawal.id,
          success: result.success,
          error: result.error,
        });

        // Small delay between processing to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // 5. Log processing run
      await logProcessingRun(results, config);

      logger.info("[processAutomaticPayments] Automatic payment processing complete", {
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      });
    } catch (error) {
      logger.error("[processAutomaticPayments] Fatal error in automatic processing", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Don't throw - we don't want the scheduler to mark this as failed
      // The error has been logged and individual withdrawals can be retried
    }
  }
);
