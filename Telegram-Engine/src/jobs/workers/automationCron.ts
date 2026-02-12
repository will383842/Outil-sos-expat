import { Worker, type Job } from "bullmq";
import { prisma } from "../../config/database.js";
import { getRedisConnection } from "../../config/redis.js";
import { automationExecutorQueue, QUEUE_NAMES } from "../queue.js";
import { logger } from "../../utils/logger.js";

const BATCH_SIZE = 500; // Max enrollments to process per cron tick

async function processAutomationCron(_job: Job): Promise<void> {
  // Find due enrollments in batches to avoid overwhelming the queue
  const dueEnrollments = await prisma.automationEnrollment.findMany({
    where: {
      status: "active",
      nextExecuteAt: { lte: new Date() },
    },
    select: { id: true },
    take: BATCH_SIZE,
    orderBy: { nextExecuteAt: "asc" }, // Oldest first
  });

  if (dueEnrollments.length === 0) return;

  logger.info(
    { count: dueEnrollments.length },
    "Automation cron: found due enrollments"
  );

  // Atomically clear nextExecuteAt for all picked enrollments to prevent re-pickup
  const ids = dueEnrollments.map((e) => e.id);
  await prisma.automationEnrollment.updateMany({
    where: { id: { in: ids }, nextExecuteAt: { not: null } },
    data: { nextExecuteAt: null },
  });

  // Queue each for execution
  for (const enrollment of dueEnrollments) {
    await automationExecutorQueue.add("execute-step", {
      enrollmentId: enrollment.id,
    });
  }

  logger.info(
    { queued: dueEnrollments.length },
    "Automation cron: queued enrollments for execution"
  );
}

export function startAutomationCronWorker(): void {
  const worker = new Worker(
    QUEUE_NAMES.AUTOMATION_CRON,
    processAutomationCron,
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Automation cron job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Automation cron job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Automation cron worker error");
  });

  logger.info("Automation cron worker started");
}
