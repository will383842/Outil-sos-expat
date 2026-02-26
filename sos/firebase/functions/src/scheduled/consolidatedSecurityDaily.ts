/**
 * Consolidated Security Daily (3h Paris)
 *
 * Replaces 3 separate scheduled functions to reduce Cloud Run memory quota in europe-west3:
 * - securityDailyCleanup (securityAlerts/triggers.ts) - was 3h
 * - processSecurityEscalations (securityAlerts/triggers.ts) - was 8h
 * - securityDailyReport (securityAlerts/triggers.ts) - was 8h
 *
 * Order: cleanup first, then escalations, then report (report uses clean data).
 * Each handler runs independently with its own try/catch.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

export const consolidatedSecurityDaily = onSchedule(
  {
    schedule: "0 3 * * *", // 3h Paris tous les jours
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    const startTime = Date.now();
    logger.info("[ConsolidatedSecurityDaily] Starting...");

    // 1. Security cleanup (rate limits, old resolved alerts)
    try {
      const { securityDailyCleanupHandler } = await import(
        "../securityAlerts/triggers"
      );
      await securityDailyCleanupHandler();
      logger.info("[ConsolidatedSecurityDaily] securityDailyCleanup completed");
    } catch (error) {
      logger.error("[ConsolidatedSecurityDaily] securityDailyCleanup failed:", error);
    }

    // 2. Process pending escalations
    try {
      const { processSecurityEscalationsHandler } = await import(
        "../securityAlerts/triggers"
      );
      await processSecurityEscalationsHandler();
      logger.info("[ConsolidatedSecurityDaily] processSecurityEscalations completed");
    } catch (error) {
      logger.error("[ConsolidatedSecurityDaily] processSecurityEscalations failed:", error);
    }

    // 3. Generate daily security report
    try {
      const { securityDailyReportHandler } = await import(
        "../securityAlerts/triggers"
      );
      await securityDailyReportHandler();
      logger.info("[ConsolidatedSecurityDaily] securityDailyReport completed");
    } catch (error) {
      logger.error("[ConsolidatedSecurityDaily] securityDailyReport failed:", error);
    }

    logger.info(
      `[ConsolidatedSecurityDaily] All tasks completed in ${Date.now() - startTime}ms`
    );
  }
);
