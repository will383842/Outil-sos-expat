/**
 * Consolidated Weekly Cleanup (Sunday 3h Paris)
 *
 * Replaces 3 separate scheduled functions to reduce Cloud Run memory quota in europe-west3:
 * - cleanupOldPaymentAlerts (monitoring/paymentMonitoring.ts) - was Sunday 3h
 * - cleanupFunctionalData (monitoring/functionalMonitoring.ts) - was Sunday 4h
 * - cleanupOldAlerts (monitoring/criticalAlerts.ts) - was 1st of month 5h (safe to run weekly)
 *
 * Each handler runs independently with its own try/catch.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

export const consolidatedWeeklyCleanup = onSchedule(
  {
    schedule: "0 3 * * 0", // Dimanche 3h Paris
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    const startTime = Date.now();
    logger.info("[ConsolidatedWeeklyCleanup] Starting...");

    // 1. Payment alerts cleanup
    try {
      const { cleanupOldPaymentAlertsHandler } = await import(
        "../monitoring/paymentMonitoring"
      );
      await cleanupOldPaymentAlertsHandler();
      logger.info("[ConsolidatedWeeklyCleanup] cleanupOldPaymentAlerts completed");
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] cleanupOldPaymentAlerts failed:", error);
    }

    // 2. Functional data cleanup
    try {
      const { cleanupFunctionalDataHandler } = await import(
        "../monitoring/functionalMonitoring"
      );
      await cleanupFunctionalDataHandler();
      logger.info("[ConsolidatedWeeklyCleanup] cleanupFunctionalData completed");
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] cleanupFunctionalData failed:", error);
    }

    // 3. Old monitoring alerts cleanup (was monthly, safe to run weekly)
    try {
      const { cleanupOldAlertsHandler } = await import(
        "../monitoring/criticalAlerts"
      );
      await cleanupOldAlertsHandler();
      logger.info("[ConsolidatedWeeklyCleanup] cleanupOldAlerts completed");
    } catch (error) {
      logger.error("[ConsolidatedWeeklyCleanup] cleanupOldAlerts failed:", error);
    }

    logger.info(
      `[ConsolidatedWeeklyCleanup] All tasks completed in ${Date.now() - startTime}ms`
    );
  }
);
