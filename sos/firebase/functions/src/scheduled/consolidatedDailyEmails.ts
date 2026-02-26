/**
 * Consolidated Daily Emails (8h Paris)
 *
 * Replaces 3 separate scheduled functions to reduce Cloud Run memory quota in europe-west3:
 * - stopAutoresponders (emailMarketing/functions/stopAutoresponders.ts) - was 8h
 * - sendAnniversaryEmails (emailMarketing/functions/statsEmails.ts) - was 9h
 * - detectInactiveUsers (emailMarketing/functions/inactiveUsers.ts) - was every 24h
 *
 * Each handler runs independently with its own try/catch.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

export const consolidatedDailyEmails = onSchedule(
  {
    schedule: "0 8 * * *", // 8h Paris tous les jours
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540, // 9 min — these handlers process many users
  },
  async () => {
    const startTime = Date.now();
    logger.info("[ConsolidatedDailyEmails] Starting...");

    // 1. Stop autoresponders for users meeting conditions
    try {
      const { stopAutorespondersHandler } = await import(
        "../emailMarketing/functions/stopAutoresponders"
      );
      await stopAutorespondersHandler();
      logger.info("[ConsolidatedDailyEmails] stopAutoresponders completed");
    } catch (error) {
      logger.error("[ConsolidatedDailyEmails] stopAutoresponders failed:", error);
    }

    // 2. Send anniversary emails
    try {
      const { sendAnniversaryEmailsHandler } = await import(
        "../emailMarketing/functions/statsEmails"
      );
      await sendAnniversaryEmailsHandler();
      logger.info("[ConsolidatedDailyEmails] sendAnniversaryEmails completed");
    } catch (error) {
      logger.error("[ConsolidatedDailyEmails] sendAnniversaryEmails failed:", error);
    }

    // 3. Detect inactive users and send re-engagement emails
    try {
      const { detectInactiveUsersHandler } = await import(
        "../emailMarketing/functions/inactiveUsers"
      );
      await detectInactiveUsersHandler();
      logger.info("[ConsolidatedDailyEmails] detectInactiveUsers completed");
    } catch (error) {
      logger.error("[ConsolidatedDailyEmails] detectInactiveUsers failed:", error);
    }

    logger.info(
      `[ConsolidatedDailyEmails] All tasks completed in ${Date.now() - startTime}ms`
    );
  }
);
