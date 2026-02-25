/**
 * Admin Alerts Daily Digest
 *
 * Sends a daily email summary to admins with:
 * - Unread admin_alerts grouped by priority
 * - Pending transfers status summary
 * - Failed transfers requiring action
 * - Payment anomalies detected
 *
 * Schedule: Every day at 9:00 AM Paris time
 *
 * This addresses the risk of admin_alerts being ignored by
 * sending proactive email notifications.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// ============================================================================
// TYPES
// ============================================================================

interface AlertSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  oldestUnreadDays: number;
  alertsByType: Record<string, number>;
}

interface PendingTransferSummary {
  pendingKyc: number;
  pendingKycAmountEur: number;
  failed: number;
  failedAmountEur: number;
  processing: number;
  oldestPendingDays: number;
  providersAffected: number;
}

interface DigestData {
  alerts: AlertSummary;
  pendingTransfers: PendingTransferSummary;
  recentAlerts: Array<{
    id: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    createdAt: string;
  }>;
  generatedAt: string;
}

interface AdminRecipient {
  uid: string;
  email: string;
  locale: string;
  displayName?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DIGEST_CONFIG = {
  // Only send digest if there are issues to report
  minAlertsToSend: 1,
  // Include alerts from last N hours (for "recent" section)
  recentAlertsHours: 24,
  // Max recent alerts to include in email
  maxRecentAlerts: 10,
  // Cooldown to avoid duplicate digests (in hours)
  cooldownHours: 20,
};

// ============================================================================
// DATA COLLECTION FUNCTIONS
// ============================================================================

/**
 * Get summary of unread admin alerts
 */
async function getAlertsSummary(): Promise<AlertSummary> {
  const db = getDb();
  const now = new Date();

  const unreadSnapshot = await db
    .collection("admin_alerts")
    .where("read", "==", false)
    .get();

  const summary: AlertSummary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
    oldestUnreadDays: 0,
    alertsByType: {},
  };

  unreadSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    summary.total++;

    // Count by priority
    const priority = (data.priority || "medium").toLowerCase();
    if (priority === "critical") summary.critical++;
    else if (priority === "high") summary.high++;
    else if (priority === "medium") summary.medium++;
    else summary.low++;

    // Count by type
    const alertType = data.type || "unknown";
    summary.alertsByType[alertType] = (summary.alertsByType[alertType] || 0) + 1;

    // Track oldest
    const createdAt = data.createdAt?.toDate?.();
    if (createdAt) {
      const daysSinceCreated = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreated > summary.oldestUnreadDays) {
        summary.oldestUnreadDays = daysSinceCreated;
      }
    }
  });

  return summary;
}

/**
 * Get summary of pending transfers
 */
async function getPendingTransfersSummary(): Promise<PendingTransferSummary> {
  const db = getDb();
  const now = new Date();

  const summary: PendingTransferSummary = {
    pendingKyc: 0,
    pendingKycAmountEur: 0,
    failed: 0,
    failedAmountEur: 0,
    processing: 0,
    oldestPendingDays: 0,
    providersAffected: 0,
  };

  const providersSet = new Set<string>();

  // Get pending_kyc transfers
  const pendingKycSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "pending_kyc")
    .get();

  pendingKycSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    summary.pendingKyc++;
    summary.pendingKycAmountEur += (data.providerAmount || 0) / 100;
    providersSet.add(data.providerId);

    const createdAt = data.createdAt?.toDate?.();
    if (createdAt) {
      const daysSinceCreated = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreated > summary.oldestPendingDays) {
        summary.oldestPendingDays = daysSinceCreated;
      }
    }
  });

  // Get failed transfers
  const failedSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "failed")
    .get();

  failedSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    summary.failed++;
    summary.failedAmountEur += (data.providerAmount || 0) / 100;
    providersSet.add(data.providerId);
  });

  // Get processing transfers
  const processingSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "processing")
    .get();

  summary.processing = processingSnapshot.size;
  summary.providersAffected = providersSet.size;

  return summary;
}

/**
 * Get recent alerts for the digest
 */
async function getRecentAlerts(): Promise<DigestData["recentAlerts"]> {
  const db = getDb();
  const cutoffTime = new Date(
    Date.now() - DIGEST_CONFIG.recentAlertsHours * 60 * 60 * 1000
  );

  const recentSnapshot = await db
    .collection("admin_alerts")
    .where("read", "==", false)
    .where("createdAt", ">=", Timestamp.fromDate(cutoffTime))
    .orderBy("createdAt", "desc")
    .limit(DIGEST_CONFIG.maxRecentAlerts)
    .get();

  return recentSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type || "unknown",
      priority: data.priority || "medium",
      title: data.title || "Sans titre",
      message: data.message || "",
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  });
}

/**
 * Get admin recipients for the digest
 */
async function getAdminRecipients(): Promise<AdminRecipient[]> {
  const db = getDb();

  const adminsSnapshot = await db
    .collection("users")
    .where("role", "in", ["admin", "super_admin"])
    .get();

  const recipients: AdminRecipient[] = [];

  adminsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.email) {
      recipients.push({
        uid: doc.id,
        email: data.email,
        locale: data.preferredLanguage || data.locale || "fr",
        displayName: data.displayName || data.firstName || "Admin",
      });
    }
  });

  return recipients;
}

/**
 * Check if digest was recently sent (cooldown)
 */
async function isDigestInCooldown(): Promise<boolean> {
  const db = getDb();
  const cooldownDoc = await db.collection("alert_cooldowns").doc("admin_digest").get();

  if (!cooldownDoc.exists) return false;

  const data = cooldownDoc.data();
  if (!data?.lastSentAt) return false;

  const lastSentAt = data.lastSentAt.toDate();
  const hoursSinceLastDigest = (Date.now() - lastSentAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastDigest < DIGEST_CONFIG.cooldownHours;
}

/**
 * Mark digest as sent
 */
async function markDigestSent(): Promise<void> {
  const db = getDb();
  await db.collection("alert_cooldowns").doc("admin_digest").set({
    lastSentAt: Timestamp.now(),
    type: "admin_alerts_digest",
  });
}

// ============================================================================
// EMAIL GENERATION
// ============================================================================

function generateDigestEmail(data: DigestData, locale: string): { subject: string; html: string; text: string } {
  const isFr = locale !== "en";

  const priorityColors: Record<string, string> = {
    critical: "#dc2626",
    high: "#f97316",
    medium: "#eab308",
    low: "#22c55e",
  };

  const subject = isFr
    ? `[SOS Expat Admin] Digest quotidien - ${data.alerts.total} alerte(s) non lue(s)`
    : `[SOS Expat Admin] Daily Digest - ${data.alerts.total} unread alert(s)`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f9fafb;">
      <div style="background-color: #1e3a5f; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">${isFr ? "Digest Admin Quotidien" : "Daily Admin Digest"}</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.8;">${new Date().toLocaleDateString(isFr ? "fr-FR" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <!-- Alerts Summary -->
      <div style="padding: 20px; background-color: white; border-bottom: 1px solid #e5e7eb;">
        <h2 style="color: #1e3a5f; margin-top: 0;">${isFr ? "Alertes Non Lues" : "Unread Alerts"}</h2>

        ${data.alerts.total === 0 ? `
          <p style="color: #22c55e; font-weight: bold;">
            ${isFr ? "Aucune alerte non lue. Tout est en ordre!" : "No unread alerts. All clear!"}
          </p>
        ` : `
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
            ${data.alerts.critical > 0 ? `<span style="background-color: ${priorityColors.critical}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">${data.alerts.critical} Critical</span>` : ""}
            ${data.alerts.high > 0 ? `<span style="background-color: ${priorityColors.high}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">${data.alerts.high} High</span>` : ""}
            ${data.alerts.medium > 0 ? `<span style="background-color: ${priorityColors.medium}; color: black; padding: 5px 15px; border-radius: 20px;">${data.alerts.medium} Medium</span>` : ""}
            ${data.alerts.low > 0 ? `<span style="background-color: ${priorityColors.low}; color: white; padding: 5px 15px; border-radius: 20px;">${data.alerts.low} Low</span>` : ""}
          </div>

          ${data.alerts.oldestUnreadDays > 7 ? `
            <p style="color: #dc2626; font-weight: bold;">
              ${isFr ? `Alerte la plus ancienne: ${data.alerts.oldestUnreadDays} jours` : `Oldest alert: ${data.alerts.oldestUnreadDays} days old`}
            </p>
          ` : ""}

          <p><strong>${isFr ? "Par type:" : "By type:"}</strong></p>
          <ul style="margin: 0; padding-left: 20px;">
            ${Object.entries(data.alerts.alertsByType).map(([type, count]) =>
              `<li>${type}: ${count}</li>`
            ).join("")}
          </ul>
        `}
      </div>

      <!-- Pending Transfers Summary -->
      <div style="padding: 20px; background-color: ${data.pendingTransfers.pendingKyc > 0 || data.pendingTransfers.failed > 0 ? "#fef3c7" : "white"}; border-bottom: 1px solid #e5e7eb;">
        <h2 style="color: #1e3a5f; margin-top: 0;">${isFr ? "Transferts en Attente" : "Pending Transfers"}</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${isFr ? "En attente KYC:" : "Pending KYC:"}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; ${data.pendingTransfers.pendingKyc > 0 ? "color: #f97316;" : ""}">${data.pendingTransfers.pendingKyc} (${data.pendingTransfers.pendingKycAmountEur.toFixed(2)}€)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${isFr ? "Echoues:" : "Failed:"}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; ${data.pendingTransfers.failed > 0 ? "color: #dc2626;" : ""}">${data.pendingTransfers.failed} (${data.pendingTransfers.failedAmountEur.toFixed(2)}€)</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${isFr ? "En cours:" : "Processing:"}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${data.pendingTransfers.processing}</td>
          </tr>
          <tr>
            <td style="padding: 8px;">${isFr ? "Providers affectes:" : "Providers affected:"}</td>
            <td style="padding: 8px; font-weight: bold;">${data.pendingTransfers.providersAffected}</td>
          </tr>
        </table>

        ${data.pendingTransfers.oldestPendingDays > 30 ? `
          <p style="color: #dc2626; font-weight: bold; margin-top: 15px;">
            ${isFr ? `Transfert le plus ancien: ${data.pendingTransfers.oldestPendingDays} jours!` : `Oldest transfer: ${data.pendingTransfers.oldestPendingDays} days!`}
          </p>
        ` : ""}
      </div>

      <!-- Recent Alerts -->
      ${data.recentAlerts.length > 0 ? `
        <div style="padding: 20px; background-color: white;">
          <h2 style="color: #1e3a5f; margin-top: 0;">${isFr ? "Alertes Recentes (24h)" : "Recent Alerts (24h)"}</h2>

          ${data.recentAlerts.map(alert => `
            <div style="border-left: 4px solid ${priorityColors[alert.priority] || priorityColors.medium}; padding: 10px 15px; margin-bottom: 10px; background-color: #f9fafb;">
              <div style="font-weight: bold; color: ${priorityColors[alert.priority] || "#333"};">${alert.title}</div>
              <div style="font-size: 12px; color: #666; margin: 5px 0;">${alert.type} - ${new Date(alert.createdAt).toLocaleString(isFr ? "fr-FR" : "en-US")}</div>
              <div style="font-size: 14px; color: #333;">${alert.message.substring(0, 200)}${alert.message.length > 200 ? "..." : ""}</div>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <!-- Action Button -->
      <div style="padding: 20px; text-align: center;">
        <a href="https://sos-expat.com/admin/alerts" style="background-color: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          ${isFr ? "Voir le Dashboard Admin" : "View Admin Dashboard"}
        </a>
      </div>

      <div style="padding: 15px; background-color: #e5e7eb; text-align: center; font-size: 12px; color: #666;">
        SOS Expat - ${isFr ? "Digest automatique" : "Automated Digest"} - ${data.generatedAt}
      </div>
    </div>
  `;

  const text = `
${isFr ? "Digest Admin Quotidien SOS Expat" : "SOS Expat Daily Admin Digest"}
${new Date().toLocaleDateString(isFr ? "fr-FR" : "en-US")}

${isFr ? "ALERTES NON LUES" : "UNREAD ALERTS"}: ${data.alerts.total}
- Critical: ${data.alerts.critical}
- High: ${data.alerts.high}
- Medium: ${data.alerts.medium}
- Low: ${data.alerts.low}

${isFr ? "TRANSFERTS EN ATTENTE" : "PENDING TRANSFERS"}:
- ${isFr ? "En attente KYC" : "Pending KYC"}: ${data.pendingTransfers.pendingKyc} (${data.pendingTransfers.pendingKycAmountEur.toFixed(2)}€)
- ${isFr ? "Echoues" : "Failed"}: ${data.pendingTransfers.failed} (${data.pendingTransfers.failedAmountEur.toFixed(2)}€)
- ${isFr ? "En cours" : "Processing"}: ${data.pendingTransfers.processing}
- ${isFr ? "Providers affectes" : "Providers affected"}: ${data.pendingTransfers.providersAffected}

${isFr ? "Voir le dashboard" : "View dashboard"}: https://sos-expat.com/admin/alerts
  `;

  return { subject, html, text };
}

// ============================================================================
// SEND DIGEST
// ============================================================================

async function sendDigestToAdmins(data: DigestData): Promise<number> {
  const db = getDb();
  const recipients = await getAdminRecipients();
  let sentCount = 0;

  for (const recipient of recipients) {
    try {
      const email = generateDigestEmail(data, recipient.locale);

      // Use message_events system for delivery
      await db.collection("message_events").add({
        eventId: "admin.alerts.digest",
        locale: recipient.locale,
        to: { email: recipient.email },
        context: {
          user: {
            uid: recipient.uid,
            email: recipient.email,
          },
        },
        vars: {
          subject: email.subject,
          html: email.html,
          text: email.text,
          alertsTotal: data.alerts.total,
          criticalAlerts: data.alerts.critical,
          pendingTransfers: data.pendingTransfers.pendingKyc + data.pendingTransfers.failed,
        },
        channels: ["email"],
        dedupeKey: `admin_digest_${recipient.uid}_${new Date().toISOString().slice(0, 10)}`,
        createdAt: Timestamp.now(),
      });

      sentCount++;
      logger.info(`[AdminAlertsDigest] Digest queued for ${recipient.email}`);
    } catch (error) {
      logger.error(`[AdminAlertsDigest] Failed to queue digest for ${recipient.email}:`, error);
    }
  }

  return sentCount;
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

/**
 * Daily admin alerts digest - runs at 9 AM Paris time
 */
export const adminAlertsDigestDaily = onSchedule(
  {
    schedule: "0 9 * * *", // Every day at 9:00 AM
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
  },
  async () => {
    ensureInitialized();
    const startTime = Date.now();
    logger.info("[AdminAlertsDigest] Starting daily digest generation...");

    try {
      // Check cooldown
      const inCooldown = await isDigestInCooldown();
      if (inCooldown) {
        logger.info("[AdminAlertsDigest] Digest in cooldown, skipping");
        return;
      }

      // Collect data
      const [alerts, pendingTransfers, recentAlerts] = await Promise.all([
        getAlertsSummary(),
        getPendingTransfersSummary(),
        getRecentAlerts(),
      ]);

      const digestData: DigestData = {
        alerts,
        pendingTransfers,
        recentAlerts,
        generatedAt: new Date().toISOString(),
      };

      // Check if there's anything to report
      const hasIssues =
        alerts.total >= DIGEST_CONFIG.minAlertsToSend ||
        pendingTransfers.pendingKyc > 0 ||
        pendingTransfers.failed > 0;

      if (!hasIssues) {
        logger.info("[AdminAlertsDigest] No issues to report, skipping digest");

        // Still log the check
        await getDb().collection("system_logs").add({
          type: "admin_alerts_digest",
          success: true,
          skipped: true,
          reason: "no_issues",
          stats: { alerts: alerts.total, pendingTransfers: pendingTransfers.pendingKyc + pendingTransfers.failed },
          executionTimeMs: Date.now() - startTime,
          createdAt: Timestamp.now(),
        });
        return;
      }

      // Send digest
      const sentCount = await sendDigestToAdmins(digestData);

      // Mark as sent
      await markDigestSent();

      // Log execution
      await getDb().collection("system_logs").add({
        type: "admin_alerts_digest",
        success: true,
        digestData: {
          alertsTotal: alerts.total,
          alertsCritical: alerts.critical,
          alertsHigh: alerts.high,
          pendingKyc: pendingTransfers.pendingKyc,
          pendingKycAmount: pendingTransfers.pendingKycAmountEur,
          failed: pendingTransfers.failed,
          failedAmount: pendingTransfers.failedAmountEur,
        },
        recipientsSent: sentCount,
        executionTimeMs: Date.now() - startTime,
        createdAt: Timestamp.now(),
      });

      logger.info(
        `[AdminAlertsDigest] Completed in ${Date.now() - startTime}ms. ` +
        `Sent to ${sentCount} recipients. ` +
        `Alerts: ${alerts.total}, Pending transfers: ${pendingTransfers.pendingKyc + pendingTransfers.failed}`
      );

    } catch (error) {
      logger.error("[AdminAlertsDigest] Error generating digest:", error);

      await getDb().collection("system_logs").add({
        type: "admin_alerts_digest",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTimeMs: Date.now() - startTime,
        createdAt: Timestamp.now(),
      });

      throw error;
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION - Manual Trigger
// ============================================================================

/**
 * Manually trigger the admin alerts digest (for testing or urgent situations)
 */
export const triggerAdminAlertsDigest = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const adminId = request.auth.uid;
    const db = getDb();

    // Check admin role
    const userDoc = await db.collection("users").doc(adminId).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "super_admin"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    logger.info(`[AdminAlertsDigest] Manual trigger by ${adminId}`);

    try {
      // Force generate (ignore cooldown for manual trigger)
      const [alerts, pendingTransfers, recentAlerts] = await Promise.all([
        getAlertsSummary(),
        getPendingTransfersSummary(),
        getRecentAlerts(),
      ]);

      const digestData: DigestData = {
        alerts,
        pendingTransfers,
        recentAlerts,
        generatedAt: new Date().toISOString(),
      };

      const sentCount = await sendDigestToAdmins(digestData);

      // Log the manual trigger
      await db.collection("admin_actions_log").add({
        action: "admin_alerts_digest_manual",
        adminId,
        adminEmail: userData.email,
        digestStats: {
          alertsTotal: alerts.total,
          pendingTransfers: pendingTransfers.pendingKyc + pendingTransfers.failed,
        },
        recipientsSent: sentCount,
        timestamp: Timestamp.now(),
      });

      return {
        success: true,
        sentTo: sentCount,
        stats: {
          alerts: alerts.total,
          pendingKyc: pendingTransfers.pendingKyc,
          failed: pendingTransfers.failed,
        },
      };

    } catch (error) {
      logger.error("[AdminAlertsDigest] Manual trigger failed:", error);
      throw new HttpsError("internal", error instanceof Error ? error.message : "Unknown error");
    }
  }
);

/**
 * Get current digest data without sending (for dashboard preview)
 */
export const getAdminAlertsDigestPreview = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const adminId = request.auth.uid;
    const db = getDb();

    // Check admin role
    const userDoc = await db.collection("users").doc(adminId).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "super_admin"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const [alerts, pendingTransfers, recentAlerts] = await Promise.all([
        getAlertsSummary(),
        getPendingTransfersSummary(),
        getRecentAlerts(),
      ]);

      return {
        success: true,
        data: {
          alerts,
          pendingTransfers,
          recentAlerts,
          generatedAt: new Date().toISOString(),
        },
      };

    } catch (error) {
      logger.error("[AdminAlertsDigest] Preview failed:", error);
      throw new HttpsError("internal", error instanceof Error ? error.message : "Unknown error");
    }
  }
);
