/**
 * onPaymentReceived.ts
 *
 * Telegram notification trigger for successful payments.
 *
 * This trigger listens to the "payments/{paymentId}" collection and sends
 * a Telegram notification when a successful payment is received.
 *
 * IMPORTANT: Uses onDocumentWritten to catch both:
 * - New payments created with status "succeeded" (rare)
 * - Existing payments updated to status "succeeded/completed/captured" (common)
 *
 * Features:
 * - Filters for successful/completed/captured payments only
 * - Prevents duplicate notifications using notificationSent flag
 * - Configurable minimum amount threshold
 * - Calculates commission (20% platform fee or from payment data)
 * - Paris timezone for date/time formatting
 * - Graceful error handling
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import type { PaymentReceivedVars } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[telegramOnPaymentReceived]";

/** Default platform commission percentage (20%) */
const DEFAULT_COMMISSION_RATE = 0.20;

/** Default minimum amount in EUR to trigger notification (0 = all payments) */
const DEFAULT_MIN_AMOUNT_EUR = 0;

/** Paris timezone for date/time formatting */
const PARIS_TIMEZONE = "Europe/Paris";

/** Valid payment statuses that should trigger notification */
const VALID_PAYMENT_STATUSES = ["succeeded", "completed", "captured"];

// ============================================================================
// TYPES
// ============================================================================

/**
 * Payment document structure from Firestore
 */
interface PaymentDocument {
  status?: string;
  amount?: number;
  amountInCents?: number;
  currency?: string;
  platformFee?: number;
  platformFeeInCents?: number;
  commissionRate?: number;
  createdAt?: FirebaseFirestore.Timestamp;
  metadata?: {
    [key: string]: unknown;
  };
  // Telegram notification tracking
  telegramNotificationSent?: boolean;
  telegramNotificationSentAt?: Date;
}

/**
 * Trigger configuration from Firestore
 */
interface TriggerConfig {
  minAmountEur?: number;
  enabled?: boolean;
}

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

/**
 * Ensure Firebase Admin is initialized
 */
function ensureInitialized(): void {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get trigger configuration from Firestore
 */
async function getTriggerConfig(): Promise<TriggerConfig> {
  try {
    const db = getFirestore();
    const configDoc = await db
      .collection("telegram_admin_config")
      .doc("settings")
      .get();

    if (!configDoc.exists) {
      return { minAmountEur: DEFAULT_MIN_AMOUNT_EUR, enabled: true };
    }

    const data = configDoc.data();
    return {
      minAmountEur: data?.paymentMinAmountEur ?? DEFAULT_MIN_AMOUNT_EUR,
      enabled: data?.notifications?.paymentReceived ?? true,
    };
  } catch (error) {
    logger.warn(`${LOG_PREFIX} Error reading trigger config, using defaults:`, error);
    return { minAmountEur: DEFAULT_MIN_AMOUNT_EUR, enabled: true };
  }
}

/**
 * Format date in Paris timezone (DD/MM/YYYY)
 */
function formatDateParis(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format time in Paris timezone (HH:MM)
 */
function formatTimeParis(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format amount with 2 decimal places
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Get amount in EUR from payment data
 * Handles both cents and euros formats
 */
function getAmountInEur(payment: PaymentDocument): number {
  // If amount is in cents
  if (payment.amountInCents !== undefined) {
    return payment.amountInCents / 100;
  }

  // If amount is provided directly (check if it looks like cents - > 1000 = likely cents)
  if (payment.amount !== undefined) {
    // Heuristic: if amount > 1000, it's probably in cents
    if (payment.amount > 1000) {
      return payment.amount / 100;
    }
    return payment.amount;
  }

  return 0;
}

/**
 * Calculate commission amount
 * Uses rate from payment data if available, otherwise uses default 20%
 */
function calculateCommission(
  totalAmountEur: number,
  payment: PaymentDocument
): number {
  // First, check if platform fee is directly available
  if (payment.platformFee !== undefined) {
    // If > 100, assume it's in cents
    if (payment.platformFee > 100) {
      return payment.platformFee / 100;
    }
    return payment.platformFee;
  }

  if (payment.platformFeeInCents !== undefined) {
    return payment.platformFeeInCents / 100;
  }

  // Calculate from commission rate if available
  const commissionRate = payment.commissionRate ?? DEFAULT_COMMISSION_RATE;
  return totalAmountEur * commissionRate;
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

/**
 * Telegram notification trigger for successful payments
 *
 * Listens to: payments/{paymentId}
 * Triggers on: Document creation OR update when status becomes "succeeded", "completed", or "captured"
 *
 * This uses onDocumentWritten to catch:
 * - New payments created directly with success status (rare)
 * - Existing payments updated to success status after capture (common)
 *
 * Notification template variables:
 * - TOTAL_AMOUNT: Total payment amount in EUR (2 decimal places)
 * - COMMISSION_AMOUNT: Platform commission in EUR (2 decimal places)
 * - DATE: Payment date (DD/MM/YYYY, Paris timezone)
 * - TIME: Payment time (HH:MM, Paris timezone)
 */
export const telegramOnPaymentReceived = onDocumentWritten(
  {
    region: "europe-west3",
    document: "payments/{paymentId}",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    ensureInitialized();

    const paymentId = event.params.paymentId;
    const afterSnapshot = event.data?.after;
    const beforeSnapshot = event.data?.before;

    logger.info(`${LOG_PREFIX} Processing payment write: ${paymentId}`);

    // Check if document exists (not a delete)
    if (!afterSnapshot?.exists) {
      logger.info(`${LOG_PREFIX} Payment ${paymentId} was deleted - skipping`);
      return;
    }

    const paymentData = afterSnapshot.data() as PaymentDocument;
    const previousData = beforeSnapshot?.exists ? beforeSnapshot.data() as PaymentDocument : null;

    try {
      // 1. Check if payment status is successful
      const status = paymentData.status?.toLowerCase();
      if (!status || !VALID_PAYMENT_STATUSES.includes(status)) {
        logger.info(
          `${LOG_PREFIX} Payment ${paymentId} status is "${status}", not successful - skipping notification`
        );
        return;
      }

      // 2. Check if notification was already sent (prevent duplicates)
      if (paymentData.telegramNotificationSent === true) {
        logger.info(
          `${LOG_PREFIX} Payment ${paymentId} notification already sent - skipping duplicate`
        );
        return;
      }

      // 3. Check if this is a status change TO a successful status (not already successful)
      const previousStatus = previousData?.status?.toLowerCase();
      if (previousStatus && VALID_PAYMENT_STATUSES.includes(previousStatus)) {
        logger.info(
          `${LOG_PREFIX} Payment ${paymentId} was already in successful status "${previousStatus}" - skipping`
        );
        return;
      }

      // 4. Get trigger configuration
      const config = await getTriggerConfig();

      // Check if notifications are enabled
      if (config.enabled === false) {
        logger.info(`${LOG_PREFIX} Payment notifications are disabled in config`);
        return;
      }

      // 5. Calculate amounts
      const totalAmountEur = getAmountInEur(paymentData);

      // Check minimum amount threshold
      const minAmount = config.minAmountEur ?? DEFAULT_MIN_AMOUNT_EUR;
      if (totalAmountEur < minAmount) {
        logger.info(
          `${LOG_PREFIX} Payment amount ${totalAmountEur}EUR < minimum ${minAmount}EUR - skipping notification`
        );
        return;
      }

      const commissionAmountEur = calculateCommission(totalAmountEur, paymentData);

      // 6. Get date/time in Paris timezone
      const paymentDate = paymentData.createdAt?.toDate() ?? new Date();

      // 7. Build notification variables
      const variables: PaymentReceivedVars = {
        TOTAL_AMOUNT: formatAmount(totalAmountEur),
        COMMISSION_AMOUNT: formatAmount(commissionAmountEur),
        DATE: formatDateParis(paymentDate),
        TIME: formatTimeParis(paymentDate),
      };

      logger.info(`${LOG_PREFIX} Sending notification for payment ${paymentId}`, {
        totalAmount: variables.TOTAL_AMOUNT,
        commission: variables.COMMISSION_AMOUNT,
        date: variables.DATE,
        time: variables.TIME,
        statusChanged: `${previousStatus || "new"} -> ${status}`,
      });

      // 8. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "payment_received",
        variables,
        { minAmount: minAmount }
      );

      if (success) {
        logger.info(`${LOG_PREFIX} Notification sent successfully for payment ${paymentId}`);

        // 9. Mark notification as sent to prevent duplicates
        const db = getFirestore();
        await db.collection("payments").doc(paymentId).update({
          telegramNotificationSent: true,
          telegramNotificationSentAt: new Date(),
        });
      } else {
        logger.warn(`${LOG_PREFIX} Failed to send notification for payment ${paymentId}`);
      }
    } catch (error) {
      // Log error but don't throw - we don't want to retry the trigger
      logger.error(`${LOG_PREFIX} Error processing payment ${paymentId}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
);
