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
import { enqueueTelegramMessage } from "../../telegram/queue/enqueue";
import { TelegramAdminConfig } from "../../telegram/types";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";

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
 * Get human-readable label for user type
 */
function getUserTypeLabel(userType: string): string {
  const labels: Record<string, string> = {
    chatter: "Chatter",
    influencer: "Influencer",
    blogger: "Blogger",
    group_admin: "GroupAdmin",
    affiliate: "Affiliate",
    partner: "Partner",
    client: "Client",
    lawyer: "Avocat",
    expat: "Expat",
  };
  return labels[userType] || userType.charAt(0).toUpperCase() + userType.slice(1);
}

/**
 * Get the notification collection for a user type
 */
function getNotificationCollection(userType: string): string {
  switch (userType) {
    case 'chatter': return 'chatter_notifications';
    case 'influencer': return 'influencer_notifications';
    case 'blogger': return 'blogger_notifications';
    case 'group_admin': return 'group_admin_notifications';
    case 'affiliate': return 'affiliate_notifications';
    case 'partner': return 'partner_notifications';
    case 'client': return 'inapp_notifications';
    case 'lawyer': return 'inapp_notifications';
    case 'expat': return 'inapp_notifications';
    default: return `${userType}_notifications`;
  }
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
  const notificationCollection = getNotificationCollection(withdrawal.userType);

  const notification = {
    id: "",
    [`${withdrawal.userType}Id`]: withdrawal.userId,
    type: "payment",
    title,
    titleTranslations: {
      en: title,
      fr: "Demande de retrait reçue",
      es: "Solicitud de retiro recibida",
      de: "Auszahlungsanfrage erhalten",
      pt: "Pedido de saque recebido",
      ru: "Запрос на вывод получен",
      ar: "تم استلام طلب السحب",
      zh: "提款请求已收到",
      hi: "निकासी अनुरोध प्राप्त",
    },
    message,
    messageTranslations: {
      en: message,
      fr: `Votre demande de retrait de $${(withdrawal.amount / 100).toFixed(2)} a été reçue et est en cours de traitement.`,
      es: `Su solicitud de retiro de $${(withdrawal.amount / 100).toFixed(2)} ha sido recibida y está siendo procesada.`,
      de: `Ihre Auszahlungsanfrage über $${(withdrawal.amount / 100).toFixed(2)} wurde erhalten und wird bearbeitet.`,
      pt: `O seu pedido de saque de $${(withdrawal.amount / 100).toFixed(2)} foi recebido e está a ser processado.`,
      ru: `Ваш запрос на вывод $${(withdrawal.amount / 100).toFixed(2)} получен и обрабатывается.`,
      ar: `تم استلام طلب السحب الخاص بك بقيمة $${(withdrawal.amount / 100).toFixed(2)} وجاري معالجته.`,
      zh: `您的 $${(withdrawal.amount / 100).toFixed(2)} 提款请求已收到并正在处理中。`,
      hi: `आपका $${(withdrawal.amount / 100).toFixed(2)} निकासी अनुरोध प्राप्त हुआ और संसाधित किया जा रहा है।`,
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
 * Send Telegram notification to admin when a withdrawal is requested.
 * Reads config from telegram_admin_config/settings.
 * Non-blocking: never fails the trigger if Telegram is unavailable.
 */
async function sendAdminTelegramAlert(withdrawal: WithdrawalRequest): Promise<void> {
  try {
    const db = getFirestore();
    const configDoc = await db.collection("telegram_admin_config").doc("settings").get();

    if (!configDoc.exists) {
      logger.info("[onWithdrawalCreated] No Telegram admin config found, skipping Telegram alert");
      return;
    }

    const adminConfig = configDoc.data() as TelegramAdminConfig;

    if (!adminConfig.notifications?.withdrawalRequest || !adminConfig.recipientChatId) {
      logger.info("[onWithdrawalCreated] Telegram withdrawal notifications disabled or no chat ID");
      return;
    }

    const amountFormatted = `$${(withdrawal.amount / 100).toFixed(2)}`;
    const userTypeLabel = getUserTypeLabel(withdrawal.userType);

    const text = [
      `💰 *Nouvelle demande de retrait*`,
      ``,
      `👤 *${withdrawal.userName}* (${userTypeLabel})`,
      `💵 Montant : *${amountFormatted}*`,
      `🏦 Méthode : ${withdrawal.provider}${withdrawal.methodType ? ` (${withdrawal.methodType})` : ""}`,
      `📋 ID : \`${withdrawal.id}\``,
      ``,
      `➡️ Action requise dans la console d'admin`,
    ].join("\n");

    await enqueueTelegramMessage(
      Number(adminConfig.recipientChatId),
      text,
      {
        parseMode: "Markdown",
        priority: "realtime",
        sourceEventType: "withdrawal_request_admin",
      }
    );

    logger.info("[onWithdrawalCreated] Admin Telegram alert sent", {
      withdrawalId: withdrawal.id,
      chatId: adminConfig.recipientChatId,
    });
  } catch (tgError) {
    // Non-blocking: log and continue
    logger.error("[onWithdrawalCreated] Failed to send Telegram admin alert", {
      withdrawalId: withdrawal.id,
      error: tgError instanceof Error ? tgError.message : String(tgError),
    });
  }
}

/**
 * Send confirmation email to user when withdrawal is created.
 * Non-blocking: never fails the trigger.
 */
async function sendUserConfirmationEmail(withdrawal: WithdrawalRequest): Promise<void> {
  try {
    const amountFormatted = `$${(withdrawal.amount / 100).toFixed(2)}`;
    const feesFormatted = withdrawal.withdrawalFee ? `$${((withdrawal.withdrawalFee) / 100).toFixed(2)}` : "$3.00";
    const totalFormatted = withdrawal.totalDebited ? `$${((withdrawal.totalDebited) / 100).toFixed(2)}` : amountFormatted;

    const subject = `📩 Demande de retrait reçue — ${amountFormatted}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2b6cb0;">📩 Demande de retrait reçue</h2>
        <p>Bonjour ${withdrawal.userName},</p>
        <p>Nous avons bien reçu votre demande de retrait. Voici le récapitulatif :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; border-radius: 8px;">
          <tr style="background: #f7fafc;"><td style="padding: 12px; color: #666; border-bottom: 1px solid #e2e8f0;">Montant :</td><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${amountFormatted}</td></tr>
          <tr><td style="padding: 12px; color: #666; border-bottom: 1px solid #e2e8f0;">Frais SOS :</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${feesFormatted}</td></tr>
          <tr style="background: #f7fafc;"><td style="padding: 12px; color: #666; border-bottom: 1px solid #e2e8f0;">Total débité :</td><td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${totalFormatted}</td></tr>
          <tr><td style="padding: 12px; color: #666;">Méthode :</td><td style="padding: 12px;">${withdrawal.provider}${withdrawal.methodType ? ` (${withdrawal.methodType})` : ""}</td></tr>
        </table>
        <p style="color: #4a5568;">Votre demande sera examinée et traitée dans les plus brefs délais. Vous recevrez une notification à chaque étape.</p>
        <p>
          <a href="https://sos-expat.com/${withdrawal.userType}/payments"
             style="display: inline-block; background: #2b6cb0; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Suivre mon retrait
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">— L'équipe SOS Expat</p>
      </div>
    `;
    await sendZoho(withdrawal.userEmail, subject, html, undefined, {
      skipUnsubscribeFooter: true,
    });
    logger.info("[onWithdrawalCreated] Confirmation email sent", {
      withdrawalId: withdrawal.id,
      to: withdrawal.userEmail,
    });
  } catch (emailErr) {
    // Non-blocking
    logger.error("[onWithdrawalCreated] Failed to send confirmation email", {
      withdrawalId: withdrawal.id,
      error: emailErr instanceof Error ? emailErr.message : String(emailErr),
    });
  }
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
    memory: "256MiB",
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

      // 4b. Send Telegram notification to admin
      await sendAdminTelegramAlert(withdrawal);

      // 4c. Send confirmation email to user
      await sendUserConfirmationEmail(withdrawal);

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
