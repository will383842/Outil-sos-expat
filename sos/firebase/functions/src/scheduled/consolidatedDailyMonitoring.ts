/**
 * Consolidated Daily Monitoring (8h Paris)
 *
 * Replaces 3 separate scheduled functions to reduce Cloud Run memory quota in europe-west3:
 * - runSystemHealthCheck (monitoring/criticalAlerts.ts)
 * - aggregateCostMetrics (scheduled/aggregateCostMetrics.ts)
 * - saveAgentMetricsHistory (monitoring/getAgentMetrics.ts)
 *
 * Each handler runs independently with its own try/catch.
 * If one fails, the others still execute.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

export const consolidatedDailyMonitoring = onSchedule(
  {
    schedule: "0 8 * * *", // 8h Paris tous les jours
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300, // 5 min total for all handlers
  },
  async () => {
    const startTime = Date.now();
    logger.info("[ConsolidatedDailyMonitoring] Starting...");

    // 1. System Health Check
    try {
      const { runSystemHealthCheckHandler } = await import(
        "../monitoring/criticalAlerts"
      );
      await runSystemHealthCheckHandler();
      logger.info("[ConsolidatedDailyMonitoring] runSystemHealthCheck completed");
    } catch (error) {
      logger.error("[ConsolidatedDailyMonitoring] runSystemHealthCheck failed:", error);
    }

    // 2. Cost Metrics Aggregation
    try {
      const { aggregateCostMetricsHandler } = await import(
        "./aggregateCostMetrics"
      );
      await aggregateCostMetricsHandler();
      logger.info("[ConsolidatedDailyMonitoring] aggregateCostMetrics completed");
    } catch (error) {
      logger.error("[ConsolidatedDailyMonitoring] aggregateCostMetrics failed:", error);
    }

    // 3. Agent Metrics History
    try {
      const { saveAgentMetricsHistoryHandler } = await import(
        "../monitoring/getAgentMetrics"
      );
      await saveAgentMetricsHistoryHandler();
      logger.info("[ConsolidatedDailyMonitoring] saveAgentMetricsHistory completed");
    } catch (error) {
      logger.error("[ConsolidatedDailyMonitoring] saveAgentMetricsHistory failed:", error);
    }

    logger.info(
      `[ConsolidatedDailyMonitoring] All tasks completed in ${Date.now() - startTime}ms`
    );
  }
);
