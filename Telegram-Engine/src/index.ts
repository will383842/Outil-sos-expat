import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { logger } from "./utils/logger.js";
import { prisma, disconnectDatabase } from "./config/database.js";
import { redis, disconnectRedis } from "./config/redis.js";
import { registerJwt } from "./api/middleware/auth.js";
import { setupQueues, closeQueues } from "./jobs/queue.js";
import { setupCronJobs } from "./jobs/schedulers/cronScheduler.js";
import { startCampaignSenderWorker } from "./jobs/workers/campaignSender.js";
import { startSubscriberSyncWorker } from "./jobs/workers/subscriberSync.js";
import { startDailyStatsWorker } from "./jobs/workers/dailyStats.js";
import { startEventProcessorWorker } from "./jobs/workers/eventProcessor.js";
import { startAutomationExecutorWorker } from "./jobs/workers/automationExecutor.js";
import { startAutomationCronWorker } from "./jobs/workers/automationCron.js";
import { startScheduledCampaignWorker } from "./jobs/workers/scheduledCampaignLauncher.js";

// Route plugins
import authRoutes from "./api/routes/auth.js";
import campaignsRoutes from "./api/routes/campaigns.js";
import subscribersRoutes from "./api/routes/subscribers.js";
import tagsRoutes from "./api/routes/tags.js";
import templatesRoutes from "./api/routes/templates.js";
import settingsRoutes from "./api/routes/settings.js";
import dashboardRoutes from "./api/routes/dashboard.js";
import logsRoutes from "./api/routes/logs.js";
import segmentsRoutes from "./api/routes/segments.js";
import automationsRoutes from "./api/routes/automations.js";
import webhookRoutes from "./api/routes/webhooks.js";
import healthRoutes from "./api/routes/health.js";
import openapiRoutes from "./api/openapi.js";

const PORT = Number(process.env["PORT"] ?? 3000);
const HOST = process.env["HOST"] ?? "0.0.0.0";

const app = Fastify({ logger: false, trustProxy: true });

// ─── Plugins ─────────────────────────────────────────────
await app.register(cors, {
  origin: process.env["CORS_ORIGIN"] ?? true,
  credentials: true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  redis,
});

await registerJwt(app);

// ─── Global error handler ────────────────────────────────
app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, _request, reply) => {
  if (error.statusCode === 400) {
    return reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: error.message,
    });
  }

  // Prisma unique constraint violation
  if (error.code === "P2002") {
    return reply.status(409).send({
      statusCode: 409,
      error: "Conflict",
      message: "A record with this data already exists",
    });
  }

  // Prisma record not found
  if (error.code === "P2025") {
    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Record not found",
    });
  }

  logger.error({ err: error }, "Unhandled error");
  return reply.status(500).send({
    statusCode: 500,
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  });
});

// ─── Routes ──────────────────────────────────────────────
// Webhook (API key auth, no JWT)
await app.register(webhookRoutes, { prefix: "/api/webhooks" });

// Public
await app.register(authRoutes, { prefix: "/api/auth" });

// Protected (auth enforced inside each route plugin)
await app.register(campaignsRoutes, { prefix: "/api/campaigns" });
await app.register(subscribersRoutes, { prefix: "/api/subscribers" });
await app.register(tagsRoutes, { prefix: "/api/tags" });
await app.register(templatesRoutes, { prefix: "/api/templates" });
await app.register(settingsRoutes, { prefix: "/api/settings" });
await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
await app.register(logsRoutes, { prefix: "/api/logs" });
await app.register(segmentsRoutes, { prefix: "/api/segments" });
await app.register(automationsRoutes, { prefix: "/api/automations" });

// Health check + API docs (public, no auth)
await app.register(healthRoutes, { prefix: "/api" });
await app.register(openapiRoutes, { prefix: "/api" });

// ─── Graceful shutdown ───────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down...");
  await app.close();
  await closeQueues();
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ─── Startup ─────────────────────────────────────────────
try {
  await prisma.$connect();
  logger.info("Database connected");

  await redis.ping();
  logger.info("Redis connected");

  // BullMQ
  setupQueues();
  await setupCronJobs();
  startCampaignSenderWorker();
  startSubscriberSyncWorker();
  startDailyStatsWorker();
  startEventProcessorWorker();
  startAutomationExecutorWorker();
  startAutomationCronWorker();
  startScheduledCampaignWorker();

  await app.listen({ port: PORT, host: HOST });
  logger.info(`Server listening on http://${HOST}:${PORT}`);
} catch (err) {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
}
