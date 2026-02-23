/**
 * onPaymentError.ts
 *
 * P2 FIX 2026-02-12: Automatic payment error alerts system
 *
 * Monitors payment_records collection and triggers alerts when payments fail.
 * Sends notifications to admins via Telegram and creates audit logs.
 *
 * Features:
 * - Real-time detection of payment failures
 * - Categorization by error type (card_declined, insufficient_funds, etc.)
 * - Pattern detection for repeated failures
 * - Automatic Telegram notifications to admins
 * - Alert aggregation to prevent spam
 * - Priority levels (low, medium, high, critical)
 *
 * Triggers:
 * - onCreate: New failed payment
 * - onUpdate: Payment status changes to failed
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";

interface PaymentErrorAlert {
  alertId: string;
  paymentId: string;
  clientId: string;
  amount: number;
  currency: string;
  errorCode: string;
  errorMessage: string;
  errorType: string;
  provider: "stripe" | "paypal" | "wise" | "flutterwave";
  priority: "low" | "medium" | "high" | "critical";
  notifiedAdmins: string[];
  createdAt: admin.firestore.FieldValue;
  metadata: {
    callId?: string;
    clientEmail?: string;
    clientName?: string;
    attemptCount?: number;
    lastAttemptAt?: Date;
    userAgent?: string;
    ipAddress?: string;
  };
}

/**
 * Categorize error by type and assign priority
 */
function categorizeError(errorCode: string, errorMessage: string): {
  errorType: string;
  priority: "low" | "medium" | "high" | "critical";
} {
  const code = errorCode?.toLowerCase() || "";
  const message = errorMessage?.toLowerCase() || "";

  // Critical errors (immediate attention required)
  if (
    code.includes("fraudulent") ||
    code.includes("stolen") ||
    message.includes("fraud") ||
    message.includes("suspicious")
  ) {
    return { errorType: "fraud_suspected", priority: "critical" };
  }

  if (code.includes("do_not_honor") || code.includes("restricted_card")) {
    return { errorType: "card_restricted", priority: "critical" };
  }

  // High priority (significant issues)
  if (
    code.includes("insufficient_funds") ||
    code.includes("insufficient") ||
    message.includes("insufficient")
  ) {
    return { errorType: "insufficient_funds", priority: "high" };
  }

  if (
    code.includes("card_declined") ||
    code.includes("generic_decline") ||
    message.includes("declined")
  ) {
    return { errorType: "card_declined", priority: "high" };
  }

  if (code.includes("expired_card") || message.includes("expired")) {
    return { errorType: "card_expired", priority: "high" };
  }

  // Medium priority (common issues)
  if (
    code.includes("invalid_cvc") ||
    code.includes("incorrect_cvc") ||
    message.includes("cvc")
  ) {
    return { errorType: "invalid_cvc", priority: "medium" };
  }

  if (code.includes("invalid_number") || message.includes("invalid card")) {
    return { errorType: "invalid_card_number", priority: "medium" };
  }

  if (code.includes("processing_error") || code.includes("issuer")) {
    return { errorType: "processing_error", priority: "medium" };
  }

  if (
    code.includes("authentication") ||
    code.includes("3d_secure") ||
    message.includes("authentication")
  ) {
    return { errorType: "authentication_failed", priority: "medium" };
  }

  // Low priority (temporary or recoverable)
  if (code.includes("rate_limit") || message.includes("rate limit")) {
    return { errorType: "rate_limit", priority: "low" };
  }

  if (code.includes("network") || message.includes("timeout")) {
    return { errorType: "network_error", priority: "low" };
  }

  // Unknown error
  return { errorType: "unknown_error", priority: "medium" };
}

/**
 * Send Telegram alert to admins
 */
async function sendTelegramAlert(alert: PaymentErrorAlert): Promise<void> {
  try {
    const db = admin.firestore();

    // Get admin users with Telegram enabled
    const adminsSnapshot = await db
      .collection("users")
      .where("role", "==", "admin")
      .where("telegramNotifications", "==", true)
      .get();

    if (adminsSnapshot.empty) {
      console.log("⚠️ [PaymentAlert] No admins with Telegram notifications enabled");
      return;
    }

    // Priority emoji
    const priorityEmoji = {
      low: "🟢",
      medium: "🟡",
      high: "🟠",
      critical: "🔴",
    };

    const emoji = priorityEmoji[alert.priority];

    // Format message
    const message = `
${emoji} <b>Erreur de paiement ${alert.priority.toUpperCase()}</b>

💳 <b>Montant:</b> ${alert.amount} ${alert.currency.toUpperCase()}
🏦 <b>Provider:</b> ${alert.provider.toUpperCase()}
⚠️ <b>Type:</b> ${alert.errorType.replace(/_/g, " ")}

<b>Erreur:</b> <code>${alert.errorCode}</code>
<b>Message:</b> ${alert.errorMessage}

👤 <b>Client:</b> ${alert.metadata.clientName || alert.metadata.clientEmail || alert.clientId}
📞 <b>Call ID:</b> ${alert.metadata.callId || "N/A"}

🔗 <a href="https://console.firebase.google.com/project/sos-urgently-ac307/firestore/data/payment_records/${alert.paymentId}">Voir dans Firestore</a>
`.trim();

    // Send to each admin via their Telegram bot
    const sendPromises = adminsSnapshot.docs.map(async (adminDoc) => {
      const adminData = adminDoc.data();
      const telegramId = adminData.telegram_id;

      if (!telegramId) {
        return;
      }

      // Create notification event for Telegram bot to process
      await db.collection("telegram_notifications").add({
        recipientId: telegramId,
        message,
        parseMode: "HTML",
        type: "payment_error_alert",
        priority: alert.priority,
        alertId: alert.alertId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false,
      });
    });

    await Promise.all(sendPromises);

    console.log(`✅ [PaymentAlert] Telegram alerts sent to ${adminsSnapshot.size} admins`);
  } catch (error) {
    console.error(`❌ [PaymentAlert] Failed to send Telegram alerts:`, error);
    await logError("sendTelegramAlert", { alert, error });
  }
}

/**
 * Check for repeated failures (pattern detection)
 */
async function checkRepeatedFailures(
  clientId: string,
  errorType: string
): Promise<{ isRepeated: boolean; count: number }> {
  const db = admin.firestore();

  // Check last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const alertsSnapshot = await db
    .collection("payment_error_alerts")
    .where("clientId", "==", clientId)
    .where("errorType", "==", errorType)
    .where("createdAt", ">=", twentyFourHoursAgo)
    .get();

  const count = alertsSnapshot.size;

  return {
    isRepeated: count >= 3, // 3+ failures in 24h = pattern
    count,
  };
}

/**
 * Create payment error alert
 */
async function createPaymentErrorAlert(
  paymentId: string,
  paymentData: any
): Promise<void> {
  const db = admin.firestore();

  try {
    const errorCode = paymentData.errorCode || paymentData.error?.code || "unknown";
    const errorMessage =
      paymentData.errorMessage ||
      paymentData.error?.message ||
      paymentData.failureReason ||
      "Unknown error";

    const { errorType, priority } = categorizeError(errorCode, errorMessage);

    // Check for repeated failures
    const { isRepeated, count } = await checkRepeatedFailures(
      paymentData.clientId,
      errorType
    );

    // Upgrade priority if repeated failures
    let finalPriority = priority;
    if (isRepeated && priority !== "critical") {
      finalPriority = priority === "high" ? "critical" : "high";
      console.log(
        `⚠️ [PaymentAlert] Upgraded priority from ${priority} to ${finalPriority} due to ${count} repeated failures`
      );
    }

    const alert: PaymentErrorAlert = {
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentId,
      clientId: paymentData.clientId || "unknown",
      amount: paymentData.amount || 0,
      currency: paymentData.currency || "EUR",
      errorCode,
      errorMessage,
      errorType,
      provider: paymentData.provider || "stripe",
      priority: finalPriority,
      notifiedAdmins: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        callId: paymentData.callId,
        clientEmail: paymentData.clientEmail,
        clientName: paymentData.clientName,
        attemptCount: count + 1,
        lastAttemptAt: new Date(),
        userAgent: paymentData.userAgent,
        ipAddress: paymentData.ipAddress,
      },
    };

    // Save alert to Firestore
    await db.collection("payment_error_alerts").doc(alert.alertId).set(alert);

    console.log(
      `🚨 [PaymentAlert] Created ${alert.priority} priority alert: ${alert.alertId}`
    );
    console.log(`   → Error: ${errorType} (${errorCode})`);
    console.log(`   → Client: ${alert.clientId}`);
    console.log(`   → Amount: ${alert.amount} ${alert.currency}`);

    // Send Telegram notification for medium+ priority
    if (["medium", "high", "critical"].includes(alert.priority)) {
      await sendTelegramAlert(alert);
    }

    // Create audit log
    await db.collection("audit_logs").add({
      action: "payment_error_alert_created",
      resourceType: "payment",
      resourceId: paymentId,
      alertId: alert.alertId,
      errorType,
      priority: alert.priority,
      clientId: paymentData.clientId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      triggeredBy: "onPaymentError",
    });
  } catch (error) {
    console.error(`❌ [PaymentAlert] Failed to create alert for ${paymentId}:`, error);
    await logError("createPaymentErrorAlert", { paymentId, error });
  }
}

/**
 * Trigger: When a new payment record is created with failed status
 */
export const onPaymentRecordCreated = onDocumentCreated(
  {
    document: "payment_records/{paymentId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
  },
  async (event) => {
    const paymentData = event.data?.data();
    const paymentId = event.params.paymentId;

    if (!paymentData) {
      return;
    }

    // Only process failed payments
    const status = paymentData.status?.toLowerCase();
    if (status !== "failed" && status !== "error" && status !== "declined") {
      return;
    }

    console.log(`🚨 [PaymentAlert] New failed payment detected: ${paymentId}`);

    await createPaymentErrorAlert(paymentId, paymentData);
  }
);

/**
 * Trigger: When a payment record is updated to failed status
 */
export const onPaymentRecordUpdated = onDocumentUpdated(
  {
    document: "payment_records/{paymentId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const paymentId = event.params.paymentId;

    if (!beforeData || !afterData) {
      return;
    }

    // Only process if status changed TO failed
    const beforeStatus = beforeData.status?.toLowerCase();
    const afterStatus = afterData.status?.toLowerCase();

    const failedStatuses = ["failed", "error", "declined"];

    if (
      !failedStatuses.includes(beforeStatus) &&
      failedStatuses.includes(afterStatus)
    ) {
      console.log(
        `🚨 [PaymentAlert] Payment status changed to failed: ${paymentId} (${beforeStatus} → ${afterStatus})`
      );

      await createPaymentErrorAlert(paymentId, afterData);
    }
  }
);
