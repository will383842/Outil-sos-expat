import type { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";
import {
  campaignSenderQueue,
  eventProcessorQueue,
  automationExecutorQueue,
  automationCronQueue,
  scheduledCampaignQueue,
} from "../../jobs/queue.js";
import { authenticateUser } from "../middleware/auth.js";
import { logger } from "../../utils/logger.js";

interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
}

async function getQueueHealth(queue: { name: string; getJobCounts: () => Promise<Record<string, number>> }): Promise<QueueHealth> {
  try {
    const counts = await queue.getJobCounts();
    return {
      name: queue.name,
      waiting: counts["waiting"] ?? 0,
      active: counts["active"] ?? 0,
      delayed: counts["delayed"] ?? 0,
      failed: counts["failed"] ?? 0,
    };
  } catch {
    return { name: queue.name, waiting: -1, active: -1, delayed: -1, failed: -1 };
  }
}

export default async function healthRoutes(
  app: FastifyInstance
): Promise<void> {
  // GET /health — public health check (no auth)
  app.get("/health", async (_request, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Database check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks["database"] = { status: "ok", latencyMs: Date.now() - dbStart };
    } catch (err) {
      checks["database"] = {
        status: "error",
        latencyMs: Date.now() - dbStart,
        error: err instanceof Error ? err.message : "Unknown",
      };
    }

    // Redis check
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks["redis"] = { status: "ok", latencyMs: Date.now() - redisStart };
    } catch (err) {
      checks["redis"] = {
        status: "error",
        latencyMs: Date.now() - redisStart,
        error: err instanceof Error ? err.message : "Unknown",
      };
    }

    // Queue health
    const queues = await Promise.all([
      getQueueHealth(campaignSenderQueue),
      getQueueHealth(eventProcessorQueue),
      getQueueHealth(automationExecutorQueue),
      getQueueHealth(automationCronQueue),
      getQueueHealth(scheduledCampaignQueue),
    ]);

    const totalFailed = queues.reduce((sum, q) => sum + Math.max(0, q.failed), 0);
    const totalWaiting = queues.reduce((sum, q) => sum + Math.max(0, q.waiting), 0);

    const allOk = Object.values(checks).every((c) => c.status === "ok");

    // Alert thresholds
    const alerts: string[] = [];
    if (totalFailed > 50) alerts.push(`High failed job count: ${totalFailed}`);
    if (totalWaiting > 1000) alerts.push(`Queue backlog detected: ${totalWaiting} waiting`);
    if (!allOk) alerts.push("Infrastructure degraded");

    if (alerts.length > 0) {
      logger.warn({ alerts, queues }, "Health check alerts triggered");
    }

    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      queues,
      alerts,
    });
  });

  // GET /health/queues — detailed queue info (auth required)
  app.get("/health/queues", { preHandler: [authenticateUser] }, async (_request, reply) => {
    const queues = await Promise.all([
      getQueueHealth(campaignSenderQueue),
      getQueueHealth(eventProcessorQueue),
      getQueueHealth(automationExecutorQueue),
      getQueueHealth(automationCronQueue),
      getQueueHealth(scheduledCampaignQueue),
    ]);

    return reply.send({ data: queues });
  });
}
