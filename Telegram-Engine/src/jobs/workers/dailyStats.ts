import { Worker } from "bullmq";
import { prisma } from "../../config/database.js";
import { getRedisConnection } from "../../config/redis.js";
import { QUEUE_NAMES } from "../queue.js";
import { logger } from "../../utils/logger.js";

export function startDailyStatsWorker(): void {
  const worker = new Worker(
    QUEUE_NAMES.DAILY_STATS,
    async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [sent, failed, newSubs, unsubs] = await Promise.all([
        prisma.messageDelivery.count({
          where: {
            status: "sent",
            sentAt: { gte: today, lt: tomorrow },
          },
        }),
        prisma.messageDelivery.count({
          where: {
            status: "failed",
            createdAt: { gte: today, lt: tomorrow },
          },
        }),
        prisma.subscriber.count({
          where: { subscribedAt: { gte: today, lt: tomorrow } },
        }),
        // Count subscribers whose status changed to unsubscribed today
        // Uses updatedAt as proxy since Subscriber has no dedicated unsubscribedAt field
        prisma.subscriber.count({
          where: {
            status: "unsubscribed",
            lastMessageAt: { gte: today, lt: tomorrow },
          },
        }),
      ]);

      await prisma.dailyStats.upsert({
        where: { date: today },
        create: {
          date: today,
          sent,
          failed,
          newSubscribers: newSubs,
          unsubscribed: unsubs,
        },
        update: { sent, failed, newSubscribers: newSubs, unsubscribed: unsubs },
      });

      logger.info(
        { date: today.toISOString(), sent, failed, newSubs, unsubs },
        "Daily stats aggregated"
      );
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Daily stats job failed");
  });

  logger.info("Daily stats worker started");
}
