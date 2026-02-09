/**
 * onPayPalPaymentReceived.ts
 *
 * Telegram notification trigger for successful PayPal payments.
 *
 * This trigger listens to the "paypal_orders/{orderId}" collection and sends
 * a Telegram notification when a PayPal payment is captured.
 *
 * Uses onDocumentWritten to catch:
 * - PayPal orders that are captured (status changes to COMPLETED)
 *
 * Features:
 * - Filters for captured payments only (status = COMPLETED)
 * - Prevents duplicate notifications using telegramNotificationSent flag
 * - Configurable minimum amount threshold
 * - Calculates commission from capturedConnectionFee
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

const LOG_PREFIX = "[telegramOnPayPalPaymentReceived]";

/** Default minimum amount in EUR to trigger notification (0 = all payments) */
const DEFAULT_MIN_AMOUNT_EUR = 0;

/** Paris timezone for date/time formatting */
const PARIS_TIMEZONE = "Europe/Paris";

/** Valid PayPal order statuses that indicate successful capture */
const VALID_PAYPAL_STATUSES = ["COMPLETED"];

// ============================================================================
// TYPES
// ============================================================================

/**
 * PayPal order document structure from Firestore
 */
interface PayPalOrderDocument {
  status?: string;
  orderId?: string;
  amount?: number;
  capturedGrossAmount?: number;
  capturedConnectionFee?: number;
  capturedProviderAmount?: number;
  capturedCurrency?: string;
  capturedAt?: FirebaseFirestore.Timestamp;
  createdAt?: FirebaseFirestore.Timestamp;
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

// ============================================================================
// MAIN TRIGGER
// ============================================================================

/**
 * Telegram notification trigger for successful PayPal payments
 *
 * Listens to: paypal_orders/{orderId}
 * Triggers on: Document update when status becomes "COMPLETED" (capture successful)
 *
 * Notification template variables:
 * - TOTAL_AMOUNT: Total payment amount in EUR (2 decimal places)
 * - COMMISSION_AMOUNT: Platform commission in EUR (2 decimal places)
 * - DATE: Payment date (DD/MM/YYYY, Paris timezone)
 * - TIME: Payment time (HH:MM, Paris timezone)
 */
export const telegramOnPayPalPaymentReceived = onDocumentWritten(
  {
    region: "europe-west3",
    document: "paypal_orders/{orderId}",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    ensureInitialized();

    const orderId = event.params.orderId;
    const afterSnapshot = event.data?.after;
    const beforeSnapshot = event.data?.before;

    logger.info(`${LOG_PREFIX} Processing PayPal order write: ${orderId}`);

    // Check if document exists (not a delete)
    if (!afterSnapshot?.exists) {
      logger.info(`${LOG_PREFIX} PayPal order ${orderId} was deleted - skipping`);
      return;
    }

    const orderData = afterSnapshot.data() as PayPalOrderDocument;
    const previousData = beforeSnapshot?.exists ? beforeSnapshot.data() as PayPalOrderDocument : null;

    try {
      // 1. Check if payment status indicates successful capture
      const status = orderData.status?.toUpperCase();
      if (!status || !VALID_PAYPAL_STATUSES.includes(status)) {
        logger.info(
          `${LOG_PREFIX} PayPal order ${orderId} status is "${status}", not completed - skipping notification`
        );
        return;
      }

      // 2. Check if notification was already sent (prevent duplicates)
      if (orderData.telegramNotificationSent === true) {
        logger.info(
          `${LOG_PREFIX} PayPal order ${orderId} notification already sent - skipping duplicate`
        );
        return;
      }

      // 3. Check if this is a status change TO COMPLETED (not already completed)
      const previousStatus = previousData?.status?.toUpperCase();
      if (previousStatus && VALID_PAYPAL_STATUSES.includes(previousStatus)) {
        logger.info(
          `${LOG_PREFIX} PayPal order ${orderId} was already in completed status "${previousStatus}" - skipping`
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
      // Use capturedGrossAmount if available, otherwise fall back to amount
      const totalAmountEur = orderData.capturedGrossAmount ?? orderData.amount ?? 0;

      // Check minimum amount threshold
      const minAmount = config.minAmountEur ?? DEFAULT_MIN_AMOUNT_EUR;
      if (totalAmountEur < minAmount) {
        logger.info(
          `${LOG_PREFIX} PayPal order amount ${totalAmountEur}EUR < minimum ${minAmount}EUR - skipping notification`
        );
        return;
      }

      // Commission is the connection fee (platform fee)
      const commissionAmountEur = orderData.capturedConnectionFee ?? 0;

      // 6. Get date/time in Paris timezone
      const paymentDate = orderData.capturedAt?.toDate() ?? orderData.createdAt?.toDate() ?? new Date();

      // 7. Build notification variables
      const variables: PaymentReceivedVars = {
        TOTAL_AMOUNT: formatAmount(totalAmountEur),
        COMMISSION_AMOUNT: formatAmount(commissionAmountEur),
        DATE: formatDateParis(paymentDate),
        TIME: formatTimeParis(paymentDate),
      };

      logger.info(`${LOG_PREFIX} Sending notification for PayPal order ${orderId}`, {
        totalAmount: variables.TOTAL_AMOUNT,
        commission: variables.COMMISSION_AMOUNT,
        date: variables.DATE,
        time: variables.TIME,
        statusChanged: `${previousStatus || "new"} -> ${status}`,
        paymentMethod: "PayPal",
      });

      // 8. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "payment_received",
        variables,
        { minAmount: minAmount }
      );

      if (success) {
        logger.info(`${LOG_PREFIX} Notification sent successfully for PayPal order ${orderId}`);

        // 9. Mark notification as sent to prevent duplicates
        const db = getFirestore();
        await db.collection("paypal_orders").doc(orderId).update({
          telegramNotificationSent: true,
          telegramNotificationSentAt: new Date(),
        });
      } else {
        logger.warn(`${LOG_PREFIX} Failed to send notification for PayPal order ${orderId}`);
      }
    } catch (error) {
      // Log error but don't throw - we don't want to retry the trigger
      logger.error(`${LOG_PREFIX} Error processing PayPal order ${orderId}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
);
