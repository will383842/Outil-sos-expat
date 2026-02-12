import { Worker, type Job } from "bullmq";
import { prisma } from "../../config/database.js";
import { getRedisConnection } from "../../config/redis.js";
import { campaignSenderQueue, QUEUE_NAMES } from "../queue.js";
import { logger } from "../../utils/logger.js";

async function processScheduledCampaigns(_job: Job): Promise<void> {
  // Find campaigns that are scheduled and due
  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true, name: true },
  });

  if (dueCampaigns.length === 0) return;

  logger.info(
    { count: dueCampaigns.length },
    "Scheduled campaign launcher: found due campaigns"
  );

  for (const campaign of dueCampaigns) {
    // Update status to sending
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sending", startedAt: new Date() },
    });

    // Queue for campaign sender
    await campaignSenderQueue.add("send-campaign", {
      campaignId: campaign.id,
    });

    logger.info(
      { campaignId: campaign.id, name: campaign.name },
      "Scheduled campaign launched"
    );
  }
}

export function startScheduledCampaignWorker(): void {
  const worker = new Worker(
    QUEUE_NAMES.SCHEDULED_CAMPAIGN,
    processScheduledCampaigns,
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Scheduled campaign launcher job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Scheduled campaign launcher job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Scheduled campaign launcher worker error");
  });

  logger.info("Scheduled campaign launcher worker started");
}
