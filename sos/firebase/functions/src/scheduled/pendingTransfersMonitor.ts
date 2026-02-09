/**
 * Pending Transfers Monitor
 *
 * Enhanced monitoring for pending_transfers collection to ensure:
 * 1. No transfers are stuck in "pending_kyc" for too long
 * 2. Failed transfers are detected and alerted
 * 3. Stuck "processing" transfers are recovered
 * 4. Providers are notified and reminded to complete KYC
 *
 * Schedule: Every 6 hours
 *
 * This addresses the risk of pending transfers being ignored
 * by creating proactive alerts and automated reminders.
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
// CONFIGURATION
// ============================================================================

const MONITOR_CONFIG = {
  // Alert thresholds
  alerts: {
    // Alert if total pending_kyc amount exceeds this (in EUR)
    pendingKycAmountThresholdEur: 500,
    // Alert if any transfer is pending_kyc for more than N days
    pendingKycDaysWarning: 7,
    pendingKycDaysCritical: 30,
    // Alert if transfers are stuck in "processing" for more than N hours
    stuckProcessingHours: 2,
    // Alert if failed transfers exceed this count
    failedCountThreshold: 3,
  },

  // KYC reminder schedule (days since first pending transfer)
  kycReminders: {
    days: [1, 3, 7, 14, 30, 60, 90],
    cooldownHours: 24, // Don't send same reminder type within 24h
  },

  // Recovery settings
  recovery: {
    // Auto-reset "processing" transfers older than N hours back to "pending_kyc"
    stuckProcessingResetHours: 4,
    // Max retries before marking as permanently failed
    maxRetries: 3,
  },
};

// ============================================================================
// TYPES
// ============================================================================

interface MonitorStats {
  pendingKyc: {
    count: number;
    totalAmountEur: number;
    oldestDays: number;
    byAge: {
      lessThan7Days: number;
      lessThan30Days: number;
      moreThan30Days: number;
      moreThan90Days: number;
    };
  };
  failed: {
    count: number;
    totalAmountEur: number;
    retriable: number;
    permanent: number;
  };
  processing: {
    count: number;
    stuck: number;
  };
  providersAffected: number;
  totalEscrowEur: number;
}

interface ProviderPendingInfo {
  providerId: string;
  totalAmountEur: number;
  transferCount: number;
  oldestDays: number;
  lastReminderDays: number | null;
  email?: string;
  displayName?: string;
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

/**
 * Get comprehensive stats about pending transfers
 */
async function getMonitorStats(): Promise<MonitorStats> {
  const db = getDb();
  const now = new Date();

  const stats: MonitorStats = {
    pendingKyc: {
      count: 0,
      totalAmountEur: 0,
      oldestDays: 0,
      byAge: {
        lessThan7Days: 0,
        lessThan30Days: 0,
        moreThan30Days: 0,
        moreThan90Days: 0,
      },
    },
    failed: {
      count: 0,
      totalAmountEur: 0,
      retriable: 0,
      permanent: 0,
    },
    processing: {
      count: 0,
      stuck: 0,
    },
    providersAffected: 0,
    totalEscrowEur: 0,
  };

  const providersSet = new Set<string>();

  // Get pending_kyc transfers
  const pendingKycSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "pending_kyc")
    .get();

  pendingKycSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const amountEur = (data.providerAmount || 0) / 100;

    stats.pendingKyc.count++;
    stats.pendingKyc.totalAmountEur += amountEur;
    providersSet.add(data.providerId);

    const createdAt = data.createdAt?.toDate?.() || now;
    const daysSinceCreated = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated > stats.pendingKyc.oldestDays) {
      stats.pendingKyc.oldestDays = daysSinceCreated;
    }

    // Categorize by age
    if (daysSinceCreated < 7) {
      stats.pendingKyc.byAge.lessThan7Days++;
    } else if (daysSinceCreated < 30) {
      stats.pendingKyc.byAge.lessThan30Days++;
    } else if (daysSinceCreated < 90) {
      stats.pendingKyc.byAge.moreThan30Days++;
    } else {
      stats.pendingKyc.byAge.moreThan90Days++;
    }
  });

  // Get failed transfers
  const failedSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "failed")
    .get();

  failedSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const amountEur = (data.providerAmount || 0) / 100;
    const retryCount = data.retryCount || 0;

    stats.failed.count++;
    stats.failed.totalAmountEur += amountEur;
    providersSet.add(data.providerId);

    if (retryCount < MONITOR_CONFIG.recovery.maxRetries) {
      stats.failed.retriable++;
    } else {
      stats.failed.permanent++;
    }
  });

  // Get processing transfers and check for stuck ones
  const processingSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "processing")
    .get();

  const stuckThreshold = new Date(
    now.getTime() - MONITOR_CONFIG.alerts.stuckProcessingHours * 60 * 60 * 1000
  );

  processingSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    stats.processing.count++;
    providersSet.add(data.providerId);

    const processingStartedAt = data.processingStartedAt?.toDate?.() || data.updatedAt?.toDate?.();
    if (processingStartedAt && processingStartedAt < stuckThreshold) {
      stats.processing.stuck++;
    }
  });

  stats.providersAffected = providersSet.size;
  stats.totalEscrowEur = stats.pendingKyc.totalAmountEur + stats.failed.totalAmountEur;

  return stats;
}

/**
 * Get providers with pending transfers for KYC reminders
 */
async function getProvidersWithPendingTransfers(): Promise<ProviderPendingInfo[]> {
  const db = getDb();
  const now = new Date();

  // Get all pending_kyc transfers
  const pendingSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "pending_kyc")
    .get();

  // Group by provider
  const providerMap = new Map<string, ProviderPendingInfo>();

  pendingSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const providerId = data.providerId;
    const amountEur = (data.providerAmount || 0) / 100;
    const createdAt = data.createdAt?.toDate?.() || now;
    const daysSinceCreated = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (!providerMap.has(providerId)) {
      providerMap.set(providerId, {
        providerId,
        totalAmountEur: 0,
        transferCount: 0,
        oldestDays: 0,
        lastReminderDays: null,
      });
    }

    const info = providerMap.get(providerId)!;
    info.totalAmountEur += amountEur;
    info.transferCount++;
    if (daysSinceCreated > info.oldestDays) {
      info.oldestDays = daysSinceCreated;
    }
  });

  // Get provider details and last reminder info
  const providers: ProviderPendingInfo[] = [];

  for (const [providerId, info] of providerMap) {
    // Get provider details
    const providerDoc = await db.collection("users").doc(providerId).get();
    const providerData = providerDoc.data();

    info.email = providerData?.email;
    info.displayName = providerData?.displayName || providerData?.firstName;

    // Check last reminder
    const lastReminderDoc = await db
      .collection("pending_transfer_reminders")
      .where("providerId", "==", providerId)
      .orderBy("sentAt", "desc")
      .limit(1)
      .get();

    if (!lastReminderDoc.empty) {
      const lastSentAt = lastReminderDoc.docs[0].data().sentAt?.toDate?.();
      if (lastSentAt) {
        info.lastReminderDays = Math.floor(
          (now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    providers.push(info);
  }

  return providers;
}

// ============================================================================
// ALERT CREATION
// ============================================================================

/**
 * Create alerts based on monitor stats
 */
async function createAlertsFromStats(stats: MonitorStats): Promise<number> {
  const db = getDb();
  let alertsCreated = 0;

  // Alert: Total pending amount exceeds threshold
  if (stats.pendingKyc.totalAmountEur > MONITOR_CONFIG.alerts.pendingKycAmountThresholdEur) {
    const existingAlert = await db
      .collection("admin_alerts")
      .where("type", "==", "pending_transfers_amount_high")
      .where("read", "==", false)
      .limit(1)
      .get();

    if (existingAlert.empty) {
      await db.collection("admin_alerts").add({
        type: "pending_transfers_amount_high",
        priority: "high",
        title: "Montant eleve en attente de KYC",
        message: `${stats.pendingKyc.totalAmountEur.toFixed(2)}EUR en attente de KYC ` +
          `(${stats.pendingKyc.count} transferts, ${stats.providersAffected} providers). ` +
          `Seuil: ${MONITOR_CONFIG.alerts.pendingKycAmountThresholdEur}EUR.`,
        data: {
          totalAmountEur: stats.pendingKyc.totalAmountEur,
          transferCount: stats.pendingKyc.count,
          providersAffected: stats.providersAffected,
          threshold: MONITOR_CONFIG.alerts.pendingKycAmountThresholdEur,
        },
        read: false,
        requiresAction: true,
        createdAt: Timestamp.now(),
      });
      alertsCreated++;
      logger.info(`[PendingTransfersMonitor] Alert created: pending amount high (${stats.pendingKyc.totalAmountEur}EUR)`);
    }
  }

  // Alert: Old pending transfers (> 30 days)
  if (stats.pendingKyc.byAge.moreThan30Days > 0) {
    const existingAlert = await db
      .collection("admin_alerts")
      .where("type", "==", "pending_transfers_old")
      .where("read", "==", false)
      .limit(1)
      .get();

    if (existingAlert.empty) {
      await db.collection("admin_alerts").add({
        type: "pending_transfers_old",
        priority: stats.pendingKyc.byAge.moreThan90Days > 0 ? "critical" : "high",
        title: "Transferts en attente depuis longtemps",
        message: `${stats.pendingKyc.byAge.moreThan30Days} transferts en attente depuis >30 jours, ` +
          `${stats.pendingKyc.byAge.moreThan90Days} depuis >90 jours. ` +
          `Le plus ancien: ${stats.pendingKyc.oldestDays} jours. ` +
          `Contacter les providers pour completer leur KYC.`,
        data: {
          moreThan30Days: stats.pendingKyc.byAge.moreThan30Days,
          moreThan90Days: stats.pendingKyc.byAge.moreThan90Days,
          oldestDays: stats.pendingKyc.oldestDays,
        },
        read: false,
        requiresAction: true,
        createdAt: Timestamp.now(),
      });
      alertsCreated++;
      logger.info(`[PendingTransfersMonitor] Alert created: old pending transfers`);
    }
  }

  // Alert: Failed transfers
  if (stats.failed.count >= MONITOR_CONFIG.alerts.failedCountThreshold) {
    const existingAlert = await db
      .collection("admin_alerts")
      .where("type", "==", "pending_transfers_failed")
      .where("read", "==", false)
      .limit(1)
      .get();

    if (existingAlert.empty) {
      await db.collection("admin_alerts").add({
        type: "pending_transfers_failed",
        priority: "critical",
        title: "Transferts echoues necessitant attention",
        message: `${stats.failed.count} transferts echoues (${stats.failed.totalAmountEur.toFixed(2)}EUR). ` +
          `${stats.failed.retriable} peuvent etre reessayes, ` +
          `${stats.failed.permanent} ont atteint le max de tentatives.`,
        data: {
          failedCount: stats.failed.count,
          totalAmountEur: stats.failed.totalAmountEur,
          retriable: stats.failed.retriable,
          permanent: stats.failed.permanent,
        },
        read: false,
        requiresAction: true,
        createdAt: Timestamp.now(),
      });
      alertsCreated++;
      logger.info(`[PendingTransfersMonitor] Alert created: failed transfers (${stats.failed.count})`);
    }
  }

  // Alert: Stuck processing
  if (stats.processing.stuck > 0) {
    await db.collection("admin_alerts").add({
      type: "pending_transfers_stuck_processing",
      priority: "high",
      title: "Transferts bloques en processing",
      message: `${stats.processing.stuck} transferts sont bloques en status "processing" ` +
        `depuis plus de ${MONITOR_CONFIG.alerts.stuckProcessingHours}h. ` +
        `Ils seront automatiquement remis en pending_kyc.`,
      data: {
        stuckCount: stats.processing.stuck,
        stuckThresholdHours: MONITOR_CONFIG.alerts.stuckProcessingHours,
      },
      read: false,
      createdAt: Timestamp.now(),
    });
    alertsCreated++;
    logger.info(`[PendingTransfersMonitor] Alert created: stuck processing (${stats.processing.stuck})`);
  }

  return alertsCreated;
}

// ============================================================================
// KYC REMINDERS
// ============================================================================

/**
 * Send KYC reminders to providers with pending transfers
 */
async function sendKycReminders(providers: ProviderPendingInfo[]): Promise<number> {
  const db = getDb();
  let remindersSent = 0;

  for (const provider of providers) {
    // Determine which reminder milestone applies
    const applicableMilestone = MONITOR_CONFIG.kycReminders.days.find(
      (days) => provider.oldestDays >= days
    );

    if (!applicableMilestone) continue;

    // Check if we already sent a reminder for this milestone recently
    const recentReminder = await db
      .collection("pending_transfer_reminders")
      .where("providerId", "==", provider.providerId)
      .where("milestone", "==", applicableMilestone)
      .where("sentAt", ">=", Timestamp.fromDate(
        new Date(Date.now() - MONITOR_CONFIG.kycReminders.cooldownHours * 60 * 60 * 1000)
      ))
      .limit(1)
      .get();

    if (!recentReminder.empty) continue;

    // Determine urgency level
    const isUrgent = provider.oldestDays >= 30;
    const isCritical = provider.oldestDays >= 90;

    try {
      // Create in-app notification
      await db.collection("inapp_notifications").add({
        uid: provider.providerId,
        type: "kyc_reminder_pending_transfer",
        title: isCritical
          ? "URGENT: Completez votre KYC pour recevoir vos paiements"
          : isUrgent
          ? "Rappel: Paiements en attente de votre KYC"
          : "Configurez vos paiements pour recevoir vos gains",
        message: `Vous avez ${provider.transferCount} paiement(s) en attente pour un total de ` +
          `${provider.totalAmountEur.toFixed(2)}EUR. ` +
          `Completez votre verification d'identite (KYC) pour recevoir ces fonds.`,
        priority: isCritical ? "critical" : isUrgent ? "high" : "medium",
        data: {
          pendingAmountEur: provider.totalAmountEur,
          transferCount: provider.transferCount,
          daysPending: provider.oldestDays,
        },
        actionUrl: "/settings/payments",
        read: false,
        createdAt: Timestamp.now(),
      });

      // Queue email reminder if we have email
      if (provider.email) {
        await db.collection("message_events").add({
          eventId: "pending_transfer.kyc_reminder",
          locale: "fr",
          to: { email: provider.email },
          context: {
            user: {
              uid: provider.providerId,
              email: provider.email,
            },
          },
          vars: {
            displayName: provider.displayName || "Prestataire",
            pendingAmountEur: provider.totalAmountEur.toFixed(2),
            transferCount: provider.transferCount,
            daysPending: provider.oldestDays,
            isUrgent,
            isCritical,
            kycUrl: "https://sos-expat.com/settings/payments",
          },
          channels: ["email"],
          dedupeKey: `kyc_reminder_${provider.providerId}_${applicableMilestone}_${new Date().toISOString().slice(0, 10)}`,
          createdAt: Timestamp.now(),
        });
      }

      // Log the reminder
      await db.collection("pending_transfer_reminders").add({
        providerId: provider.providerId,
        milestone: applicableMilestone,
        pendingAmountEur: provider.totalAmountEur,
        transferCount: provider.transferCount,
        daysPending: provider.oldestDays,
        sentAt: Timestamp.now(),
      });

      remindersSent++;
      logger.info(
        `[PendingTransfersMonitor] KYC reminder sent to ${provider.providerId} ` +
        `(${provider.totalAmountEur.toFixed(2)}EUR, ${provider.oldestDays} days)`
      );

    } catch (error) {
      logger.error(`[PendingTransfersMonitor] Failed to send reminder to ${provider.providerId}:`, error);
    }
  }

  return remindersSent;
}

// ============================================================================
// RECOVERY
// ============================================================================

/**
 * Reset stuck "processing" transfers back to "pending_kyc"
 */
async function recoverStuckTransfers(): Promise<number> {
  const db = getDb();
  const resetThreshold = new Date(
    Date.now() - MONITOR_CONFIG.recovery.stuckProcessingResetHours * 60 * 60 * 1000
  );

  const stuckSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "processing")
    .where("processingStartedAt", "<", Timestamp.fromDate(resetThreshold))
    .get();

  let recovered = 0;

  const batch = db.batch();

  stuckSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "pending_kyc",
      processingStartedAt: admin.firestore.FieldValue.delete(),
      recoveredFromStuck: true,
      recoveredAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    recovered++;
  });

  if (recovered > 0) {
    await batch.commit();
    logger.info(`[PendingTransfersMonitor] Recovered ${recovered} stuck transfers`);
  }

  return recovered;
}

/**
 * Retry failed transfers that haven't exceeded max retries
 */
async function retryFailedTransfers(): Promise<number> {
  const db = getDb();

  const failedSnapshot = await db
    .collection("pending_transfers")
    .where("status", "==", "failed")
    .where("retryCount", "<", MONITOR_CONFIG.recovery.maxRetries)
    .limit(10) // Process in batches
    .get();

  let queued = 0;

  for (const doc of failedSnapshot.docs) {
    const data = doc.data();

    // Reset to pending_kyc for reprocessing when provider completes KYC
    await doc.ref.update({
      status: "pending_kyc",
      retryCount: (data.retryCount || 0) + 1,
      lastRetryAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    queued++;
    logger.info(`[PendingTransfersMonitor] Queued failed transfer ${doc.id} for retry`);
  }

  return queued;
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

/**
 * Main monitoring function - runs every 6 hours
 */
export const pendingTransfersMonitorScheduled = onSchedule(
  {
    schedule: "0 */6 * * *", // Every 6 hours
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 180,
  },
  async () => {
    ensureInitialized();
    const startTime = Date.now();
    logger.info("[PendingTransfersMonitor] Starting scheduled monitoring...");

    const db = getDb();

    try {
      // 1. Get comprehensive stats
      const stats = await getMonitorStats();
      logger.info("[PendingTransfersMonitor] Stats collected:", JSON.stringify(stats));

      // 2. Create alerts based on stats
      const alertsCreated = await createAlertsFromStats(stats);

      // 3. Get providers and send KYC reminders
      const providers = await getProvidersWithPendingTransfers();
      const remindersSent = await sendKycReminders(providers);

      // 4. Recover stuck transfers
      const stuckRecovered = await recoverStuckTransfers();

      // 5. Queue failed transfers for retry
      const failedQueued = await retryFailedTransfers();

      // 6. Log execution
      await db.collection("system_logs").add({
        type: "pending_transfers_monitor",
        success: true,
        stats: {
          pendingKycCount: stats.pendingKyc.count,
          pendingKycAmountEur: stats.pendingKyc.totalAmountEur,
          failedCount: stats.failed.count,
          stuckCount: stats.processing.stuck,
          providersAffected: stats.providersAffected,
        },
        actions: {
          alertsCreated,
          remindersSent,
          stuckRecovered,
          failedQueued,
        },
        executionTimeMs: Date.now() - startTime,
        createdAt: Timestamp.now(),
      });

      logger.info(
        `[PendingTransfersMonitor] Completed in ${Date.now() - startTime}ms. ` +
        `Alerts: ${alertsCreated}, Reminders: ${remindersSent}, Recovered: ${stuckRecovered}, Queued: ${failedQueued}`
      );

    } catch (error) {
      logger.error("[PendingTransfersMonitor] Error:", error);

      await db.collection("system_logs").add({
        type: "pending_transfers_monitor",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTimeMs: Date.now() - startTime,
        createdAt: Timestamp.now(),
      });

      // Create critical alert for monitoring failure
      await db.collection("admin_alerts").add({
        type: "pending_transfers_monitor_failed",
        priority: "critical",
        title: "ERREUR: Monitoring des transferts echoue",
        message: `Le monitoring des pending_transfers a echoue: ${error instanceof Error ? error.message : "Unknown"}`,
        read: false,
        createdAt: Timestamp.now(),
      });

      throw error;
    }
  }
);

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Get detailed pending transfers stats (for admin dashboard)
 * Note: Different from getPendingTransfersStats in PendingTransferProcessor.ts
 * This provides more detailed stats including age breakdown and provider list
 */
export const getDetailedPendingTransfersStats = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = getDb();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "super_admin"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const stats = await getMonitorStats();
      const providers = await getProvidersWithPendingTransfers();

      return {
        success: true,
        stats,
        providers: providers.map((p) => ({
          providerId: p.providerId,
          displayName: p.displayName,
          totalAmountEur: p.totalAmountEur,
          transferCount: p.transferCount,
          oldestDays: p.oldestDays,
        })),
      };

    } catch (error) {
      logger.error("[PendingTransfersMonitor] Stats fetch failed:", error);
      throw new HttpsError("internal", error instanceof Error ? error.message : "Unknown error");
    }
  }
);

/**
 * Manually trigger monitoring (for testing)
 */
export const triggerPendingTransfersMonitor = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = getDb();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "super_admin"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    logger.info(`[PendingTransfersMonitor] Manual trigger by ${request.auth.uid}`);

    try {
      const stats = await getMonitorStats();
      const alertsCreated = await createAlertsFromStats(stats);
      const providers = await getProvidersWithPendingTransfers();
      const remindersSent = await sendKycReminders(providers);
      const stuckRecovered = await recoverStuckTransfers();
      const failedQueued = await retryFailedTransfers();

      // Log the manual trigger
      await db.collection("admin_actions_log").add({
        action: "pending_transfers_monitor_manual",
        adminId: request.auth.uid,
        adminEmail: userData.email,
        stats,
        actions: { alertsCreated, remindersSent, stuckRecovered, failedQueued },
        timestamp: Timestamp.now(),
      });

      return {
        success: true,
        stats,
        actions: {
          alertsCreated,
          remindersSent,
          stuckRecovered,
          failedQueued,
        },
      };

    } catch (error) {
      logger.error("[PendingTransfersMonitor] Manual trigger failed:", error);
      throw new HttpsError("internal", error instanceof Error ? error.message : "Unknown error");
    }
  }
);

/**
 * Force retry a specific failed transfer (admin action)
 */
export const forceRetryPendingTransfer = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { transferId } = request.data as { transferId: string };
    if (!transferId) {
      throw new HttpsError("invalid-argument", "transferId is required");
    }

    const db = getDb();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "super_admin"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const transferDoc = await db.collection("pending_transfers").doc(transferId).get();
    if (!transferDoc.exists) {
      throw new HttpsError("not-found", "Transfer not found");
    }

    const transferData = transferDoc.data()!;

    // Reset to pending_kyc for reprocessing
    await transferDoc.ref.update({
      status: "pending_kyc",
      adminForceRetry: true,
      adminForceRetryBy: request.auth.uid,
      adminForceRetryAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Log the action
    await db.collection("admin_actions_log").add({
      action: "pending_transfer_force_retry",
      adminId: request.auth.uid,
      adminEmail: userData.email,
      transferId,
      providerId: transferData.providerId,
      amount: transferData.providerAmount,
      timestamp: Timestamp.now(),
    });

    logger.info(`[PendingTransfersMonitor] Force retry triggered for ${transferId} by ${request.auth.uid}`);

    return { success: true, transferId };
  }
);
