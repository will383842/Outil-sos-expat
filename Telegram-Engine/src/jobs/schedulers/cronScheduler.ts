import {
  subscriberSyncQueue,
  dailyStatsQueue,
  automationCronQueue,
  scheduledCampaignQueue,
} from "../queue.js";
import { logger } from "../../utils/logger.js";

export async function setupCronJobs(): Promise<void> {
  logger.info("Setting up cron jobs...");

  // Sync subscribers from Firestore every 30 minutes
  await subscriberSyncQueue.upsertJobScheduler(
    "subscriber-sync",
    { pattern: "*/30 * * * *" },
    {
      name: "sync-subscribers",
      data: { type: "sync" },
      opts: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
    }
  );
  logger.info("Scheduled: subscriber sync (every 30 min)");

  // Daily stats aggregation at 23:59 UTC
  await dailyStatsQueue.upsertJobScheduler(
    "daily-stats",
    { pattern: "59 23 * * *" },
    {
      name: "aggregate-daily-stats",
      data: { type: "aggregate" },
      opts: { removeOnComplete: { count: 30 } },
    }
  );
  logger.info("Scheduled: daily stats aggregation (23:59 UTC)");

  // Automation cron — check for due enrollments every minute
  await automationCronQueue.upsertJobScheduler(
    "automation-cron",
    { pattern: "* * * * *" },
    {
      name: "check-due-enrollments",
      data: { type: "automation-cron" },
      opts: { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } },
    }
  );
  logger.info("Scheduled: automation cron (every minute)");

  // Scheduled campaign launcher — check for due campaigns every minute
  await scheduledCampaignQueue.upsertJobScheduler(
    "scheduled-campaign",
    { pattern: "* * * * *" },
    {
      name: "launch-scheduled-campaigns",
      data: { type: "scheduled-campaign" },
      opts: { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } },
    }
  );
  logger.info("Scheduled: scheduled campaign launcher (every minute)");

  logger.info("All cron jobs scheduled");
}
