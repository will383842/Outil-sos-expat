/**
 * Trigger: onWithdrawalStatusChanged
 *
 * Fires when a withdrawal document is updated in payment_withdrawals collection.
 * - Checks if status changed
 * - Sends appropriate notification based on new status
 * - Logs status change to audit log
 * - Handles specific status transitions (e.g., approved -> processing)
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  WithdrawalRequest,
  WithdrawalStatus,
  PaymentConfig,
  PaymentUserType,
  DEFAULT_PAYMENT_CONFIG,
} from "../types";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";
import { getTelegramBotToken } from "../../lib/secrets";

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
 * Status messages for notifications
 */
const STATUS_MESSAGES: Record<WithdrawalStatus, { title: string; message: string }> = {
  pending: {
    title: "Withdrawal Pending",
    message: "Your withdrawal request is pending review.",
  },
  validating: {
    title: "Withdrawal Being Validated",
    message: "Your withdrawal request is being validated.",
  },
  approved: {
    title: "Withdrawal Approved",
    message: "Your withdrawal request has been approved and will be processed soon.",
  },
  queued: {
    title: "Withdrawal Queued",
    message: "Your withdrawal is queued for automatic processing.",
  },
  processing: {
    title: "Withdrawal Processing",
    message: "Your withdrawal is currently being processed by our payment provider.",
  },
  sent: {
    title: "Withdrawal Sent",
    message: "Your withdrawal has been sent! Funds should arrive within 1-3 business days.",
  },
  completed: {
    title: "Withdrawal Completed",
    message: "Your withdrawal has been completed successfully. Funds should now be in your account.",
  },
  failed: {
    title: "Withdrawal Failed",
    message: "Unfortunately, your withdrawal could not be processed. Please contact support.",
  },
  rejected: {
    title: "Withdrawal Rejected",
    message: "Your withdrawal request has been rejected. Please check your payment details.",
  },
  cancelled: {
    title: "Withdrawal Cancelled",
    message: "Your withdrawal request has been cancelled.",
  },
};

/**
 * Get payment configuration from Firestore
 */
async function getPaymentConfig(): Promise<PaymentConfig> {
  const db = getFirestore();
  const configDoc = await db.doc(CONFIG_DOC_PATH).get();

  if (!configDoc.exists) {
    logger.warn("[onWithdrawalStatusChanged] Payment config not found, using defaults");
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
  message: string,
  additionalData?: Record<string, unknown>
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
      ...additionalData,
    },
    createdAt: now,
  };

  const notificationRef = db.collection(notificationCollection).doc();
  notification.id = notificationRef.id;
  await notificationRef.set(notification);

  logger.info("[onWithdrawalStatusChanged] User notification created", {
    withdrawalId: withdrawal.id,
    notificationId: notification.id,
    status: withdrawal.status,
  });
}

/**
 * Send email + Telegram to user when their withdrawal fails
 */
async function notifyUserWithdrawalFailed(withdrawal: WithdrawalRequest): Promise<void> {
  const amountFormatted = `$${(withdrawal.amount / 100).toFixed(2)}`;
  const errorReason = withdrawal.errorMessage || "Erreur inconnue";

  // 1. Email via Zoho SMTP
  try {
    const subject = `Votre retrait de ${amountFormatted} n'a pas pu être traité`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e53e3e;">❌ Retrait échoué</h2>
        <p>Bonjour ${withdrawal.userName},</p>
        <p>Malheureusement, votre retrait de <strong>${amountFormatted}</strong> n'a pas pu être traité.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #666;">Montant :</td><td style="padding: 8px;"><strong>${amountFormatted}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Méthode :</td><td style="padding: 8px;">${withdrawal.provider}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Raison :</td><td style="padding: 8px; color: #e53e3e;">${errorReason}</td></tr>
        </table>
        <p style="color: #276749; font-weight: bold;">✅ Votre solde a été restauré automatiquement.</p>
        <p>
          <a href="https://sos-expat.com/${withdrawal.userType}/payments"
             style="display: inline-block; background: #e53e3e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Réessayer le retrait
          </a>
        </p>
        <p>Si le problème persiste, contactez notre support.</p>
        <p style="color: #999; font-size: 12px;">— L'équipe SOS Expat</p>
      </div>
    `;
    await sendZoho(withdrawal.userEmail, subject, html);
    logger.info("[onWithdrawalStatusChanged] Failure email sent", { withdrawalId: withdrawal.id, to: withdrawal.userEmail });
  } catch (emailErr) {
    logger.error("[onWithdrawalStatusChanged] Failed to send failure email", { error: emailErr });
  }

  // 2. Telegram direct message if user has telegramId
  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(withdrawal.userId).get();
    const telegramId = userDoc.data()?.telegramId as number | undefined;

    if (telegramId) {
      const botToken = getTelegramBotToken();
      const text = `❌ Votre retrait de *${amountFormatted}* a échoué.\n✅ Votre solde a été restauré.\nContactez le support si besoin.`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegramId, text, parse_mode: "Markdown" }),
      });
      logger.info("[onWithdrawalStatusChanged] Failure Telegram sent", { withdrawalId: withdrawal.id, telegramId });
    }
  } catch (tgErr) {
    logger.error("[onWithdrawalStatusChanged] Failed to send Telegram failure notification", { error: tgErr });
  }
}

/**
 * Send admin notification for specific status changes
 */
async function sendAdminNotification(
  withdrawal: WithdrawalRequest,
  oldStatus: WithdrawalStatus,
  newStatus: WithdrawalStatus,
  config: PaymentConfig
): Promise<void> {
  // Only notify admins for certain transitions
  const notifiableStatuses: WithdrawalStatus[] = ["failed", "completed"];

  if (!notifiableStatuses.includes(newStatus)) {
    return;
  }

  // Check config for notification settings
  if (newStatus === "completed" && !config.notifyOnCompletion) {
    return;
  }
  if (newStatus === "failed" && !config.notifyOnFailure) {
    return;
  }

  if (config.adminEmails.length === 0) {
    return;
  }

  const db = getFirestore();
  const now = Timestamp.now();

  const adminNotification = {
    id: "",
    type: `withdrawal_${newStatus}`,
    title: `Withdrawal ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} - ${withdrawal.userType}`,
    message: `${withdrawal.userName}'s withdrawal of $${(withdrawal.amount / 100).toFixed(2)} is now ${newStatus}`,
    data: {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
      oldStatus,
      newStatus,
      errorMessage: withdrawal.errorMessage,
      errorCode: withdrawal.errorCode,
    },
    isRead: false,
    priority: newStatus === "failed" ? "high" : "normal",
    adminEmails: config.adminEmails,
    createdAt: now,
  };

  const notificationRef = db.collection("admin_notifications").doc();
  adminNotification.id = notificationRef.id;
  await notificationRef.set(adminNotification);

  logger.info("[onWithdrawalStatusChanged] Admin notification created", {
    withdrawalId: withdrawal.id,
    notificationId: adminNotification.id,
    newStatus,
  });
}

/**
 * Log status change to audit log
 */
async function logStatusChange(
  withdrawal: WithdrawalRequest,
  oldStatus: WithdrawalStatus,
  newStatus: WithdrawalStatus
): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  const auditLog = {
    id: "",
    action: "withdrawal_status_changed",
    entityType: "withdrawal",
    entityId: withdrawal.id,
    userId: withdrawal.userId,
    userType: withdrawal.userType,
    data: {
      oldStatus,
      newStatus,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
      providerTransactionId: withdrawal.providerTransactionId,
      processedBy: withdrawal.processedBy,
      errorCode: withdrawal.errorCode,
      errorMessage: withdrawal.errorMessage,
    },
    timestamp: now,
    ipAddress: null,
    userAgent: null,
  };

  const auditRef = db.collection("payment_audit_logs").doc();
  auditLog.id = auditRef.id;
  await auditRef.set(auditLog);

  logger.info("[onWithdrawalStatusChanged] Audit log created", {
    withdrawalId: withdrawal.id,
    auditLogId: auditLog.id,
    oldStatus,
    newStatus,
  });
}

/**
 * Update user statistics on withdrawal completion
 */
async function updateUserStats(withdrawal: WithdrawalRequest): Promise<void> {
  const db = getFirestore();

  // Collection for user withdrawal stats
  const userStatsRef = db.collection("payment_user_stats").doc(withdrawal.userId);
  const userStatsDoc = await userStatsRef.get();

  const now = new Date().toISOString();
  const amountInCents = withdrawal.amount;

  if (!userStatsDoc.exists) {
    // Create new stats document
    await userStatsRef.set({
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      totalWithdrawn: amountInCents,
      withdrawalCount: 1,
      pendingAmount: 0,
      lastWithdrawalAt: now,
      isAutoPaymentEligible: true,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // Update existing stats
    const currentStats = userStatsDoc.data()!;
    await userStatsRef.update({
      totalWithdrawn: (currentStats.totalWithdrawn || 0) + amountInCents,
      withdrawalCount: (currentStats.withdrawalCount || 0) + 1,
      lastWithdrawalAt: now,
      updatedAt: now,
    });
  }

  logger.info("[onWithdrawalStatusChanged] User stats updated", {
    userId: withdrawal.userId,
    amount: amountInCents,
  });
}

/**
 * Map userType to Firestore collection name
 */
function getUserCollection(userType: PaymentUserType): string {
  switch (userType) {
    case 'chatter': return 'chatters';
    case 'influencer': return 'influencers';
    case 'blogger': return 'bloggers';
    case 'group_admin': return 'group_admins';
    default: return `${userType}s`;
  }
}

/**
 * Terminal statuses where pendingWithdrawalId should be cleared
 */
const TERMINAL_STATUSES: WithdrawalStatus[] = [
  "completed", "sent", "rejected", "cancelled",
];

/**
 * Clear pendingWithdrawalId on the user doc when withdrawal reaches a terminal state.
 * For "failed", only clear if no more retries are possible.
 */
async function clearPendingWithdrawalId(
  withdrawal: WithdrawalRequest,
  newStatus: WithdrawalStatus
): Promise<void> {
  const isTerminal = TERMINAL_STATUSES.includes(newStatus);
  const isFailedNoRetry = newStatus === "failed" &&
    withdrawal.retryCount >= withdrawal.maxRetries;

  if (!isTerminal && !isFailedNoRetry) {
    return;
  }

  const db = getFirestore();
  const userCollection = getUserCollection(withdrawal.userType as PaymentUserType);
  const userRef = db.collection(userCollection).doc(withdrawal.userId);

  try {
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      logger.warn("[onWithdrawalStatusChanged] User doc not found for pendingWithdrawalId cleanup", {
        userId: withdrawal.userId,
        userType: withdrawal.userType,
        collection: userCollection,
      });
      return;
    }

    const userData = userDoc.data()!;
    // Only clear if the pendingWithdrawalId matches this withdrawal
    if (userData.pendingWithdrawalId === withdrawal.id) {
      await userRef.update({
        pendingWithdrawalId: null,
        updatedAt: Timestamp.now(),
      });

      logger.info("[onWithdrawalStatusChanged] Cleared pendingWithdrawalId", {
        userId: withdrawal.userId,
        withdrawalId: withdrawal.id,
        newStatus,
        collection: userCollection,
      });
    }
  } catch (error) {
    logger.error("[onWithdrawalStatusChanged] Failed to clear pendingWithdrawalId", {
      userId: withdrawal.userId,
      withdrawalId: withdrawal.id,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

/**
 * Rollback GroupAdmin commissions when a withdrawal permanently fails.
 * Reverts commissions from "paid" back to "available" so the GroupAdmin can
 * include them in a future withdrawal.
 */
async function rollbackGroupAdminCommissions(
  withdrawal: WithdrawalRequest
): Promise<void> {
  if (withdrawal.userType !== "group_admin") {
    return;
  }

  const db = getFirestore();

  try {
    // Find commissions tied to this withdrawal that were marked "paid"
    const commissionsSnapshot = await db
      .collection("group_admin_commissions")
      .where("withdrawalId", "==", withdrawal.id)
      .where("status", "==", "paid")
      .get();

    if (commissionsSnapshot.empty) {
      logger.info("[onWithdrawalStatusChanged] No commissions to rollback", {
        withdrawalId: withdrawal.id,
      });
      return;
    }

    // Batch update all commissions back to "available"
    const batch = db.batch();
    const now = Timestamp.now();

    for (const doc of commissionsSnapshot.docs) {
      batch.update(doc.ref, {
        status: "available",
        withdrawalId: null,
        paidAt: null,
        rolledBackAt: now,
        rolledBackReason: `Withdrawal ${withdrawal.id} permanently failed`,
        updatedAt: now,
      });
    }

    await batch.commit();

    logger.info("[onWithdrawalStatusChanged] GroupAdmin commissions rolled back", {
      withdrawalId: withdrawal.id,
      groupAdminId: withdrawal.userId,
      commissionsRolledBack: commissionsSnapshot.size,
    });
  } catch (error) {
    logger.error("[onWithdrawalStatusChanged] Failed to rollback commissions", {
      withdrawalId: withdrawal.id,
      groupAdminId: withdrawal.userId,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

/**
 * Handle specific status transitions
 */
async function handleStatusTransition(
  withdrawal: WithdrawalRequest,
  oldStatus: WithdrawalStatus,
  newStatus: WithdrawalStatus
): Promise<void> {
  // Handle approved -> processing transition
  if (oldStatus === "approved" && newStatus === "processing") {
    logger.info("[onWithdrawalStatusChanged] Withdrawal approved and processing", {
      withdrawalId: withdrawal.id,
      isAutomatic: withdrawal.isAutomatic,
    });
  }

  // Handle completed/sent withdrawal - update user stats
  if (newStatus === "completed" || newStatus === "sent") {
    await updateUserStats(withdrawal);
  }

  // Handle failed withdrawal - check if retry is possible
  if (newStatus === "failed" && withdrawal.retryCount < withdrawal.maxRetries) {
    const db = getFirestore();
    const retryDelay = 60 * 60 * 1000; // 1 hour in milliseconds
    const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

    await db.collection(WITHDRAWAL_COLLECTION).doc(withdrawal.id).update({
      canRetry: true,
      nextRetryAt,
    });

    logger.info("[onWithdrawalStatusChanged] Withdrawal marked for retry", {
      withdrawalId: withdrawal.id,
      retryCount: withdrawal.retryCount,
      maxRetries: withdrawal.maxRetries,
      nextRetryAt,
    });
  }

  // Handle permanent failure — rollback GroupAdmin commissions
  if (newStatus === "failed" && withdrawal.retryCount >= withdrawal.maxRetries) {
    await rollbackGroupAdminCommissions(withdrawal);
  }
  if (newStatus === "rejected" || newStatus === "cancelled") {
    await rollbackGroupAdminCommissions(withdrawal);
  }

  // Clear pendingWithdrawalId on terminal states
  await clearPendingWithdrawalId(withdrawal, newStatus);
}

/**
 * Main trigger function
 */
export const paymentOnWithdrawalStatusChanged = onDocumentUpdated(
  {
    document: `${WITHDRAWAL_COLLECTION}/{withdrawalId}`,
    region: "europe-west3",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) {
      logger.warn("[onWithdrawalStatusChanged] Missing before or after data");
      return;
    }

    const withdrawalId = event.params.withdrawalId;
    const oldStatus = beforeData.status as WithdrawalStatus;
    const newStatus = afterData.status as WithdrawalStatus;

    // Only proceed if status actually changed
    if (oldStatus === newStatus) {
      logger.debug("[onWithdrawalStatusChanged] Status unchanged, skipping", {
        withdrawalId,
        status: oldStatus,
      });
      return;
    }

    const withdrawal = {
      ...afterData,
      id: withdrawalId,
    } as WithdrawalRequest;

    logger.info("[onWithdrawalStatusChanged] Processing status change", {
      withdrawalId,
      oldStatus,
      newStatus,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
    });

    try {
      // 1. Log status change to audit log
      await logStatusChange(withdrawal, oldStatus, newStatus);

      // 2. Get payment configuration
      const config = await getPaymentConfig();

      // 3. Send user notification for the new status
      const statusMessage = STATUS_MESSAGES[newStatus];
      if (statusMessage) {
        // Add amount to the message
        const formattedAmount = `$${(withdrawal.amount / 100).toFixed(2)}`;
        const personalizedMessage = statusMessage.message.replace(
          "Your withdrawal",
          `Your withdrawal of ${formattedAmount}`
        );

        await createUserNotification(
          withdrawal,
          statusMessage.title,
          personalizedMessage,
          {
            oldStatus,
            newStatus,
            providerTransactionId: withdrawal.providerTransactionId,
          }
        );
      }

      // 4. Send admin notification if applicable
      await sendAdminNotification(withdrawal, oldStatus, newStatus, config);

      // 4b. Notify user via email + Telegram on failure
      if (newStatus === "failed") {
        await notifyUserWithdrawalFailed(withdrawal);
      }

      // 5. Handle specific status transitions
      await handleStatusTransition(withdrawal, oldStatus, newStatus);

      logger.info("[onWithdrawalStatusChanged] Status change processing complete", {
        withdrawalId,
        oldStatus,
        newStatus,
      });
    } catch (error) {
      logger.error("[onWithdrawalStatusChanged] Error processing status change", {
        withdrawalId,
        oldStatus,
        newStatus,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Don't throw - we don't want to retry the trigger
    }
  }
);
