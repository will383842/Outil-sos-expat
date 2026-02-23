/**
 * Budget Alert Notifications Scheduled Function
 *
 * Runs periodically to check budget thresholds and send email notifications
 * to admins when costs exceed configured limits.
 *
 * - Warning email at 80% of budget
 * - Urgent email at 100% of budget
 *
 * Schedule: Runs every 6 hours to balance monitoring with cost efficiency
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import {
  checkAllBudgetsAndAlert,
  checkBudgetAndAlert,
  BudgetServiceType,
} from "../notificationPipeline/budgetAlerts";

// CRITICAL: Lazy initialization to avoid deployment timeout
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
// SCHEDULED FUNCTION - Check All Budgets
// ============================================================================

/**
 * Scheduled function that checks all budget thresholds and sends email alerts
 * Runs every 6 hours: 00:00, 06:00, 12:00, 18:00 (Paris time)
 */
export const checkBudgetAlertsScheduled = onSchedule(
  {
    schedule: "0 0,6,12,18 * * *", // Every 6 hours
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 120,
  },
  async () => {
    ensureInitialized();
    const startTime = Date.now();
    logger.info("[BudgetAlertScheduled] Starting budget alert check...");

    try {
      // Check all budgets and send alerts
      const results = await checkAllBudgetsAndAlert();

      // Count alerts sent
      let totalAlerts = 0;
      let criticalAlerts = 0;
      let warningAlerts = 0;

      for (const [service, result] of Object.entries(results)) {
        if (result.notificationsSent > 0) {
          totalAlerts += result.notificationsSent;
          if (result.alertLevel === "critical") {
            criticalAlerts += result.notificationsSent;
          } else if (result.alertLevel === "warning") {
            warningAlerts += result.notificationsSent;
          }
          logger.info(`[BudgetAlertScheduled] ${service}: ${result.alertLevel} alert - ${result.notificationsSent} notifications sent`);
        }
      }

      // Log execution to system_logs
      await getDb().collection("system_logs").add({
        type: "budget_alert_check",
        success: true,
        totalAlertsQueued: totalAlerts,
        criticalAlerts,
        warningAlerts,
        results: Object.fromEntries(
          Object.entries(results).map(([k, v]) => [k, {
            alertLevel: v.alertLevel,
            notificationsSent: v.notificationsSent,
          }])
        ),
        executionTimeMs: Date.now() - startTime,
        createdAt: admin.firestore.Timestamp.now(),
      });

      logger.info(
        `[BudgetAlertScheduled] Completed in ${Date.now() - startTime}ms. ` +
        `Alerts sent: ${totalAlerts} (${criticalAlerts} critical, ${warningAlerts} warning)`
      );

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[BudgetAlertScheduled] Budget check failed:", err);

      // Log error
      await getDb().collection("system_logs").add({
        type: "budget_alert_check",
        success: false,
        error: err.message,
        executionTimeMs: Date.now() - startTime,
        createdAt: admin.firestore.Timestamp.now(),
      });

      throw error;
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION - Manual Budget Alert Check
// ============================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";

/**
 * Callable function to manually trigger a budget alert check
 * Requires admin authentication
 */
export const triggerBudgetAlertCheck = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 60,
  },
  async (request) => {
    ensureInitialized();
    // Verify admin authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const adminId = request.auth.uid;

    // Check if user is admin
    const userDoc = await getDb().collection("users").doc(adminId).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "super_admin"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    logger.info(`[BudgetAlertManual] Manual check triggered by admin ${adminId}`);

    try {
      const results = await checkAllBudgetsAndAlert();

      // Count results
      const summary = {
        success: true,
        triggeredBy: adminId,
        timestamp: new Date().toISOString(),
        services: {} as Record<string, { alertLevel: string | null; notificationsSent: number }>,
        totalAlerts: 0,
      };

      for (const [service, result] of Object.entries(results)) {
        summary.services[service] = {
          alertLevel: result.alertLevel,
          notificationsSent: result.notificationsSent,
        };
        summary.totalAlerts += result.notificationsSent;
      }

      // Log the manual trigger
      await getDb().collection("admin_actions_log").add({
        action: "budget_alert_check",
        adminId,
        adminEmail: userData.email,
        results: summary.services,
        totalAlerts: summary.totalAlerts,
        timestamp: admin.firestore.Timestamp.now(),
      });

      return summary;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[BudgetAlertManual] Manual check failed:", err);
      throw new HttpsError("internal", err.message);
    }
  }
);

/**
 * Callable function to check a specific service budget
 * Useful for testing or targeted checks
 */
export const checkSingleServiceBudget = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 60,
  },
  async (request) => {
    ensureInitialized();
    // Verify admin authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { service, currentCost, budgetAmount, currency } = request.data as {
      service: BudgetServiceType;
      currentCost: number;
      budgetAmount: number;
      currency?: string;
    };

    if (!service || currentCost === undefined || budgetAmount === undefined) {
      throw new HttpsError("invalid-argument", "Missing required parameters: service, currentCost, budgetAmount");
    }

    const validServices: BudgetServiceType[] = ["twilio", "firestore", "functions", "storage", "total"];
    if (!validServices.includes(service)) {
      throw new HttpsError("invalid-argument", `Invalid service. Must be one of: ${validServices.join(", ")}`);
    }

    const adminId = request.auth.uid;

    // Check if user is admin
    const userDoc = await getDb().collection("users").doc(adminId).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "super_admin"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    logger.info(`[BudgetAlertSingle] Checking ${service} budget: ${currentCost}/${budgetAmount} ${currency || "EUR"}`);

    try {
      const period = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const result = await checkBudgetAndAlert(
        service,
        currentCost,
        budgetAmount,
        currency || "EUR",
        period
      );

      return {
        success: result.success,
        service,
        alertLevel: result.alertLevel,
        notificationsSent: result.notificationsSent,
        percentUsed: budgetAmount > 0 ? (currentCost / budgetAmount) * 100 : 0,
        error: result.error,
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[BudgetAlertSingle] Check failed:", err);
      throw new HttpsError("internal", err.message);
    }
  }
);

// ============================================================================
// INTEGRATION WITH EXISTING COST METRICS
// ============================================================================

/**
 * Hook function to be called from aggregateCostMetrics after cost calculation
 * This sends email notifications when budget thresholds are exceeded
 */
export async function sendBudgetAlertEmails(params: {
  smsCost: number;
  voiceCost: number;
  totalCost: number;
  smsBudget: number;
  voiceBudget: number;
  totalBudget: number;
}): Promise<void> {
  const { smsCost, voiceCost: _voiceCost, totalCost, smsBudget, voiceBudget: _voiceBudget, totalBudget } = params;
  const period = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  logger.info("[BudgetAlertEmails] Checking budget thresholds for email notifications...");

  // Check Twilio SMS
  if (smsBudget > 0) {
    await checkBudgetAndAlert("twilio", smsCost, smsBudget, "EUR", period);
  }

  // Note: For voice costs, we'd need a separate service type or combined check
  // For now, the "total" check covers combined Twilio costs

  // Check total budget
  if (totalBudget > 0) {
    await checkBudgetAndAlert("total", totalCost, totalBudget, "EUR", period);
  }
}
