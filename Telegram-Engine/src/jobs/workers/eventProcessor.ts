import { Worker, type Job } from "bullmq";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { getRedisConnection } from "../../config/redis.js";
import { automationExecutorQueue, QUEUE_NAMES } from "../queue.js";
import { logger } from "../../utils/logger.js";

interface EventProcessorJob {
  eventId: number;
}

async function processEvent(job: Job<EventProcessorJob>): Promise<void> {
  const { eventId } = job.data;

  const event = await prisma.incomingEvent.findUnique({
    where: { id: eventId },
  });

  if (!event || event.processed) {
    logger.warn({ eventId }, "Event not found or already processed");
    return;
  }

  const payload = event.payload as Record<string, unknown>;

  // Find subscriber by sosUserId or telegramChatId from payload
  let subscriber = null;
  if (event.sosUserId) {
    subscriber = await prisma.subscriber.findUnique({
      where: { sosUserId: event.sosUserId },
    });
  }
  if (!subscriber && payload["telegramChatId"]) {
    subscriber = await prisma.subscriber.findUnique({
      where: { telegramChatId: String(payload["telegramChatId"]) },
    });
  }

  if (!subscriber) {
    logger.info(
      { eventId, eventType: event.eventType, sosUserId: event.sosUserId },
      "No matching subscriber found — skipping"
    );
    await prisma.incomingEvent.update({
      where: { id: eventId },
      data: { processed: true, processedAt: new Date() },
    });
    return;
  }

  // Find active automations matching this event type
  const automations = await prisma.automation.findMany({
    where: {
      triggerEvent: event.eventType,
      isActive: true,
    },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  let enrolled = 0;

  for (const automation of automations) {
    // Check conditions
    if (automation.conditions && typeof automation.conditions === "object") {
      const conditions = automation.conditions as Record<string, unknown>;
      let conditionsMet = true;

      for (const [field, value] of Object.entries(conditions)) {
        const subscriberValue = (subscriber as Record<string, unknown>)[field];
        const payloadValue = payload[field];
        const actual = subscriberValue ?? payloadValue;

        if (actual !== value) {
          conditionsMet = false;
          break;
        }
      }

      if (!conditionsMet) {
        logger.debug(
          { automationId: automation.id, subscriberId: subscriber.id },
          "Conditions not met — skipping automation"
        );
        continue;
      }
    }

    if (automation.steps.length === 0) {
      continue;
    }

    // Handle re-enrollment: if allowReenrollment is true, delete old completed enrollment first
    if (automation.allowReenrollment) {
      await prisma.automationEnrollment.deleteMany({
        where: {
          automationId: automation.id,
          subscriberId: subscriber.id,
          status: { in: ["completed", "cancelled"] },
        },
      });
    }

    // Create enrollment (skip if already enrolled)
    try {
      const enrollment = await prisma.automationEnrollment.create({
        data: {
          automationId: automation.id,
          subscriberId: subscriber.id,
          currentStep: 0,
          status: "active",
          eventPayload: payload as Prisma.InputJsonValue,
        },
      });

      const firstStep = automation.steps[0];

      if (firstStep && (firstStep.type === "send_message" || firstStep.type === "condition")) {
        await automationExecutorQueue.add("execute-step", {
          enrollmentId: enrollment.id,
        });
      } else if (firstStep && firstStep.type === "wait") {
        const config = firstStep.config as Record<string, unknown>;
        const delayMinutes = Number(config["delayMinutes"]) || 0;
        const nextExecuteAt = new Date(Date.now() + delayMinutes * 60_000);

        await prisma.automationEnrollment.update({
          where: { id: enrollment.id },
          data: { nextExecuteAt },
        });
      }

      enrolled++;
      logger.info(
        {
          automationId: automation.id,
          subscriberId: subscriber.id,
          enrollmentId: enrollment.id,
        },
        "Subscriber enrolled in automation"
      );
    } catch (error) {
      // Unique constraint violation = already actively enrolled
      if ((error as { code?: string }).code === "P2002") {
        logger.debug(
          { automationId: automation.id, subscriberId: subscriber.id },
          "Already actively enrolled — skipping"
        );
      } else {
        throw error;
      }
    }
  }

  // Mark event as processed
  await prisma.incomingEvent.update({
    where: { id: eventId },
    data: { processed: true, processedAt: new Date() },
  });

  logger.info(
    { eventId, eventType: event.eventType, enrolled },
    "Event processed"
  );
}

export function startEventProcessorWorker(): void {
  const worker = new Worker(
    QUEUE_NAMES.EVENT_PROCESSOR,
    processEvent,
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Event processor job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Event processor job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Event processor worker error");
  });

  logger.info("Event processor worker started (concurrency: 5)");
}
