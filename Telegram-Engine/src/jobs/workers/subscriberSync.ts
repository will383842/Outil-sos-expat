import { Worker } from "bullmq";
import { getRedisConnection } from "../../config/redis.js";
import { syncSubscribersFromFirestore } from "../../services/firebaseSync.js";
import { QUEUE_NAMES } from "../queue.js";
import { logger } from "../../utils/logger.js";

export function startSubscriberSyncWorker(): void {
  const worker = new Worker(
    QUEUE_NAMES.SUBSCRIBER_SYNC,
    async () => {
      logger.info("Starting subscriber sync job");
      const result = await syncSubscribersFromFirestore();
      logger.info(result, "Subscriber sync job done");
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Subscriber sync completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Subscriber sync failed");
  });

  logger.info("Subscriber sync worker started");
}
