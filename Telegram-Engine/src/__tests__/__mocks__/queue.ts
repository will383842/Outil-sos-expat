import { vi } from "vitest";

function makeMockQueue() {
  return {
    add: vi.fn().mockResolvedValue({ id: "mock-job-1" }),
    close: vi.fn(),
  };
}

export const QUEUE_NAMES = {
  CAMPAIGN_SENDER: "campaign-sender",
  SUBSCRIBER_SYNC: "subscriber-sync",
  DAILY_STATS: "daily-stats",
  EVENT_PROCESSOR: "event-processor",
  AUTOMATION_EXECUTOR: "automation-executor",
  AUTOMATION_CRON: "automation-cron",
  SCHEDULED_CAMPAIGN: "scheduled-campaign",
} as const;

export const campaignSenderQueue = makeMockQueue();
export const subscriberSyncQueue = makeMockQueue();
export const dailyStatsQueue = makeMockQueue();
export const eventProcessorQueue = makeMockQueue();
export const automationExecutorQueue = makeMockQueue();
export const automationCronQueue = makeMockQueue();
export const scheduledCampaignQueue = makeMockQueue();

export function setupQueues(): void {
  // no-op in tests
}

export async function closeQueues(): Promise<void> {
  // no-op in tests
}
