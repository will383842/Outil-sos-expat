import { Queue } from "bullmq";
import { getRedisConnection } from "../config/redis.js";
import { logger } from "../utils/logger.js";

export const QUEUE_NAMES = {
  CAMPAIGN_SENDER: "campaign-sender",
  SUBSCRIBER_SYNC: "subscriber-sync",
  DAILY_STATS: "daily-stats",
  EVENT_PROCESSOR: "event-processor",
  AUTOMATION_EXECUTOR: "automation-executor",
  AUTOMATION_CRON: "automation-cron",
  SCHEDULED_CAMPAIGN: "scheduled-campaign",
} as const;

export let campaignSenderQueue: Queue;
export let subscriberSyncQueue: Queue;
export let dailyStatsQueue: Queue;
export let eventProcessorQueue: Queue;
export let automationExecutorQueue: Queue;
export let automationCronQueue: Queue;
export let scheduledCampaignQueue: Queue;

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 3600 }, // Keep completed jobs for 1 hour
  removeOnFail: { age: 604_800 }, // Keep failed jobs for 7 days
};

export function setupQueues(): void {
  const connection = getRedisConnection();

  campaignSenderQueue = new Queue(QUEUE_NAMES.CAMPAIGN_SENDER, {
    connection,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 3 },
  });

  subscriberSyncQueue = new Queue(QUEUE_NAMES.SUBSCRIBER_SYNC, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  dailyStatsQueue = new Queue(QUEUE_NAMES.DAILY_STATS, {
    connection,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
  });

  eventProcessorQueue = new Queue(QUEUE_NAMES.EVENT_PROCESSOR, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  automationExecutorQueue = new Queue(QUEUE_NAMES.AUTOMATION_EXECUTOR, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  automationCronQueue = new Queue(QUEUE_NAMES.AUTOMATION_CRON, {
    connection,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
  });

  scheduledCampaignQueue = new Queue(QUEUE_NAMES.SCHEDULED_CAMPAIGN, {
    connection,
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
  });

  logger.info("All BullMQ queues initialized");
}

export async function closeQueues(): Promise<void> {
  logger.info("Closing BullMQ queues...");
  await Promise.all([
    campaignSenderQueue?.close(),
    subscriberSyncQueue?.close(),
    dailyStatsQueue?.close(),
    eventProcessorQueue?.close(),
    automationExecutorQueue?.close(),
    automationCronQueue?.close(),
    scheduledCampaignQueue?.close(),
  ]);
  logger.info("All BullMQ queues closed");
}
