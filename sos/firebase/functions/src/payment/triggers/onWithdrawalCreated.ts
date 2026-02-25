/**
 * Trigger: onWithdrawalCreated
 *
 * Fires when a new withdrawal document is created in payment_withdrawals collection.
 * - Logs the creation for audit
 * - Sends notification to user
 * - If automatic mode and below threshold, queues for processing
 * - Sends admin alert if configured
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  WithdrawalRequest,
  PaymentConfig,
  DEFAULT_PAYMENT_CONFIG,
} from "../types";

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
const CONFIG_DOC_PATH = "payment_config/payment_config";

/**
 * Get payment configuration from Firestore
 */
async function getPaymentConfig(): Promise<PaymentConfig> {
  const db = getFirestore();
  const configDoc = await db.doc(CONFIG_DOC_PATH).get();

  if (!configDoc.exists) {
    logger.warn("[onWithdrawalCreated] Payment config not found, using defaults");
    return {
      ...DEFAULT_PAYMENT_CONFIG,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    };
  }

  return configDoc.data() as PaymentConfig;
}

/**
 * Create a notification for the user
 */
async function createUserNotification(
  withdrawal: WithdrawalRequest,
  title: string,
  message: string
): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  // Determine the correct notification collection based on user type
  const notificationCollection = `${withdrawal.userType}_notifications`;

  const notification = {
    id: "",
    [`${withdrawal.userType}Id`]: withdrawal.userId,
    type: "payment",
    title,
    titleTranslations: {
      en: title,
    },
    message,
    messageTranslations: {
      en: message,
    },
    actionUrl: `/${withdrawal.userType}/payments`,
    isRead: false,
    emailSent: false,
    data: {
      withdrawalId: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
    },
    createdAt: now,
  };

  const notificationRef = db.collection(notificationCollection).doc();
  notification.id = notificationRef.id;
  await notificationRef.set(notification);

  logger.info("[onWithdrawalCreated] User notification created", {
    withdrawalId: withdrawal.id,
    notificationId: notification.id,
    collection: notificationCollection,
  });
}

/**
 * Send admin alert for new withdrawal requests
 */
async function sendAdminAlert(
  withdrawal: WithdrawalRequest,
  config: PaymentConfig
): Promise<void> {
  if (!config.notifyOnRequest || config.adminEmails.length === 0) {
    return;
  }

  const db = getFirestore();
  const now = Timestamp.now();

  // Create admin notification in admin_notifications collection
  const adminNotification = {
    id: "",
    type: "withdrawal_request",
    title: `New Withdrawal Request - ${withdrawal.userType}`,
    message: `${withdrawal.userName} requested a withdrawal of $${(withdrawal.amount / 100).toFixed(2)}`,
    data: {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
      methodType: withdrawal.methodType,
    },
    isRead: false,
    priority: withdrawal.amount >= config.autoPaymentThreshold ? "high" : "normal",
    adminEmails: config.adminEmails,
    createdAt: now,
  };

  const notificationRef = db.collection("admin_notifications").doc();
  adminNotification.id = notificationRef.id;
  await notificationRef.set(adminNotification);

  logger.info("[onWithdrawalCreated] Admin notification created", {
    withdrawalId: withdrawal.id,
    notificationId: adminNotification.id,
    adminEmailCount: config.adminEmails.length,
  });
}

/**
 * Queue withdrawal for automatic processing if eligible
 */
async function queueForAutoProcessing(
  withdrawal: WithdrawalRequest,
  config: PaymentConfig
): Promise<boolean> {
  const db = getFirestore();

  // Check if auto-processing is applicable
  const isAutoEligible =
    config.paymentMode === "automatic" ||
    (config.paymentMode === "hybrid" && withdrawal.amount <= config.autoPaymentThreshold);

  if (!isAutoEligible) {
    logger.info("[onWithdrawalCreated] Withdrawal not eligible for auto-processing", {
      withdrawalId: withdrawal.id,
      paymentMode: config.paymentMode,
      amount: withdrawal.amount,
      threshold: config.autoPaymentThreshold,
    });
    return false;
  }

  // Calculate when the withdrawal should be processed (after delay)
  const processAfter = new Date();
  processAfter.setHours(processAfter.getHours() + config.autoPaymentDelayHours);

  // Update withdrawal to queued status
  const withdrawalRef = db.collection(WITHDRAWAL_COLLECTION).doc(withdrawal.id);

  const statusEntry = {
    status: "queued",
    timestamp: new Date().toISOString(),
    actorType: "system",
    note: `Automatically queued for processing after ${config.autoPaymentDelayHours}h delay`,
    metadata: {
      processAfter: processAfter.toISOString(),
      autoPaymentThreshold: config.autoPaymentThreshold,
      paymentMode: config.paymentMode,
    },
  };

  await withdrawalRef.update({
    status: "queued",
    isAutomatic: true,
    statusHistory: FieldValue.arrayUnion(statusEntry),
    queuedAt: new Date().toISOString(),
    processAfter: processAfter.toISOString(),
  });

  logger.info("[onWithdrawalCreated] Withdrawal queued for auto-processing", {
    withdrawalId: withdrawal.id,
    processAfter: processAfter.toISOString(),
    delayHours: config.autoPaymentDelayHours,
  });

  return true;
}

/**
 * Log withdrawal creation to audit log
 */
async function logWithdrawalCreation(withdrawal: WithdrawalRequest): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  const auditLog = {
    id: "",
    action: "withdrawal_created",
    entityType: "withdrawal",
    entityId: withdrawal.id,
    userId: withdrawal.userId,
    userType: withdrawal.userType,
    data: {
      amount: withdrawal.amount,
      sourceCurrency: withdrawal.sourceCurrency,
      targetCurrency: withdrawal.targetCurrency,
      provider: withdrawal.provider,
      methodType: withdrawal.methodType,
      paymentMethodId: withdrawal.paymentMethodId,
    },
    timestamp: now,
    ipAddress: null, // Not available in triggers
    userAgent: null, // Not available in triggers
  };

  const auditRef = db.collection("payment_audit_logs").doc();
  auditLog.id = auditRef.id;
  await auditRef.set(auditLog);

  logger.info("[onWithdrawalCreated] Audit log created", {
    withdrawalId: withdrawal.id,
    auditLogId: auditLog.id,
  });
}

/**
 * Main trigger function
 */
export const paymentOnWithdrawalCreated = onDocumentCreated(
  {
    document: `${WITHDRAWAL_COLLECTION}/{withdrawalId}`,
    region: "europe-west3",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[onWithdrawalCreated] No data in event");
      return;
    }

    const withdrawalId = event.params.withdrawalId;
    const withdrawal = {
      ...snapshot.data(),
      id: withdrawalId,
    } as WithdrawalRequest;

    logger.info("[onWithdrawalCreated] Processing new withdrawal", {
      withdrawalId,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
      methodType: withdrawal.methodType,
      status: withdrawal.status,
    });

    try {
      // 1. Log creation to audit log
      await logWithdrawalCreation(withdrawal);

      // 2. Get payment configuration
      const config = await getPaymentConfig();

      // 3. Send notification to user
      await createUserNotification(
        withdrawal,
        "Withdrawal Request Received",
        `Your withdrawal request for $${(withdrawal.amount / 100).toFixed(2)} has been received and is being processed.`
      );

      // 4. Send admin alert if configured
      await sendAdminAlert(withdrawal, config);

      // 5. Queue for auto-processing if eligible
      const wasQueued = await queueForAutoProcessing(withdrawal, config);

      logger.info("[onWithdrawalCreated] Withdrawal processing complete", {
        withdrawalId,
        wasQueuedForAutoProcessing: wasQueued,
        paymentMode: config.paymentMode,
      });
    } catch (error) {
      logger.error("[onWithdrawalCreated] Error processing withdrawal", {
        withdrawalId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Don't throw - we don't want to retry the trigger
      // The withdrawal was created successfully, just the post-processing failed
    }
  }
);
