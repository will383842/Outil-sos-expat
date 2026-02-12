import { Worker, type Job } from "bullmq";
import { prisma } from "../../config/database.js";
import { getRedisConnection } from "../../config/redis.js";
import { sendMessage } from "../../services/telegram.js";
import { automationExecutorQueue, QUEUE_NAMES } from "../queue.js";
import { logger } from "../../utils/logger.js";

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

interface AutomationExecutorJob {
  enrollmentId: number;
}

/**
 * Pick the right language message for a subscriber.
 * Fallback: subscriber language → EN → first available.
 */
function pickMessage(
  messages: Record<string, string>,
  subscriberLanguage: string
): string | null {
  return (
    messages[subscriberLanguage] ??
    messages["en"] ??
    Object.values(messages)[0] ??
    null
  );
}

/**
 * Replace {{variables}} in a message template with actual values.
 * Logs warnings for missing variables.
 */
function replaceVariables(
  template: string,
  data: Record<string, unknown>,
  enrollmentId: number
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null) {
      logger.debug({ enrollmentId, variable: key }, "Template variable not found — replaced with empty");
      return "";
    }
    return String(value);
  });
}

/**
 * Find step by index, matching by sorted array position (not by stepOrder value).
 * This handles non-contiguous step orders.
 */
function getStepAtIndex(
  steps: Array<{ stepOrder: number; type: string; config: unknown }>,
  index: number
) {
  // Steps are already sorted by stepOrder ASC from Prisma query
  return steps[index] ?? null;
}

async function executeStep(
  job: Job<AutomationExecutorJob>
): Promise<void> {
  const { enrollmentId } = job.data;

  const enrollment = await prisma.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      automation: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
      subscriber: true,
    },
  });

  if (!enrollment || enrollment.status !== "active") {
    logger.warn({ enrollmentId }, "Enrollment not found or not active");
    return;
  }

  // Check subscriber is still active
  if (enrollment.subscriber.status !== "active") {
    await prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "cancelled", completedAt: new Date(), nextExecuteAt: null },
    });
    logger.info(
      { enrollmentId, subscriberStatus: enrollment.subscriber.status },
      "Subscriber no longer active — enrollment cancelled"
    );
    return;
  }

  const { automation, subscriber } = enrollment;
  const steps = automation.steps;
  const currentStepIndex = enrollment.currentStep;
  const step = getStepAtIndex(steps, currentStepIndex);

  if (!step) {
    // No more steps — complete
    await prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "completed", completedAt: new Date(), nextExecuteAt: null },
    });
    logger.info({ enrollmentId }, "Automation enrollment completed (no more steps)");
    return;
  }

  const config = step.config as Record<string, unknown>;

  // Build variable data from subscriber + eventPayload
  const variableData: Record<string, unknown> = {
    firstName: subscriber.firstName,
    lastName: subscriber.lastName,
    telegramUsername: subscriber.telegramUsername,
    role: subscriber.role,
    language: subscriber.language,
    country: subscriber.country,
    ...(enrollment.eventPayload as Record<string, unknown> ?? {}),
  };

  if (step.type === "send_message") {
    const messages = config["messages"] as Record<string, string> | undefined;
    if (!messages || typeof messages !== "object") {
      logger.error(
        { enrollmentId, stepOrder: step.stepOrder },
        "send_message step has no messages config — skipping"
      );
      await advanceToNextStep(enrollmentId, currentStepIndex, steps.length, enrollment.version);
      return;
    }

    const parseMode = (config["parseMode"] as string) || "HTML";
    // Validate parseMode
    const validParseModes = ["HTML", "MarkdownV2"];
    const safeParsMode = validParseModes.includes(parseMode) ? parseMode : "HTML";

    const rawText = pickMessage(messages, subscriber.language);

    if (!rawText) {
      logger.error(
        { enrollmentId, stepOrder: step.stepOrder },
        "No message variant available — skipping"
      );
      await advanceToNextStep(enrollmentId, currentStepIndex, steps.length, enrollment.version);
      return;
    }

    const text = replaceVariables(rawText, variableData, enrollmentId);

    // Validate message length
    if (text.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
      logger.warn(
        { enrollmentId, stepOrder: step.stepOrder, length: text.length },
        `Message exceeds Telegram limit (${TELEGRAM_MAX_MESSAGE_LENGTH} chars) — truncating`
      );
    }
    const finalText = text.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);

    // Send via Telegram
    const result = await sendMessage(subscriber.telegramChatId, finalText, safeParsMode);

    // Create delivery record for tracking
    await prisma.messageDelivery.create({
      data: {
        automationId: automation.id,
        enrollmentId,
        subscriberId: subscriber.id,
        telegramChatId: subscriber.telegramChatId,
        content: finalText,
        status: result.ok ? "sent" : (result.retryAfter ? "rate_limited" : "failed"),
        telegramMsgId: result.messageId ? String(result.messageId) : null,
        errorMessage: result.error ?? null,
        sentAt: result.ok ? new Date() : null,
      },
    });

    if (result.ok) {
      logger.info(
        { enrollmentId, stepOrder: step.stepOrder, lang: subscriber.language },
        "Automation message sent"
      );
    } else {
      logger.warn(
        { enrollmentId, stepOrder: step.stepOrder, error: result.error },
        "Failed to send automation message"
      );
    }

    // Advance regardless of send result
    await advanceToNextStep(enrollmentId, currentStepIndex, steps.length, enrollment.version);
  } else if (step.type === "condition") {
    const field = config["field"] as string;
    const operator = config["operator"] as string;
    const value = config["value"];

    if (!field || !operator) {
      logger.error(
        { enrollmentId, stepOrder: step.stepOrder },
        "Condition step missing field or operator — cancelling"
      );
      await prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { status: "cancelled", completedAt: new Date(), nextExecuteAt: null },
      });
      return;
    }

    const actual = variableData[field];
    let conditionMet = false;

    switch (operator) {
      case "eq":
        conditionMet = String(actual) === String(value);
        break;
      case "neq":
        conditionMet = String(actual) !== String(value);
        break;
      case "contains":
        conditionMet =
          typeof actual === "string" &&
          typeof value === "string" &&
          actual.toLowerCase().includes(value.toLowerCase());
        break;
      case "gt":
        conditionMet =
          actual !== undefined && actual !== null &&
          value !== undefined && value !== null &&
          Number(actual) > Number(value);
        break;
      case "lt":
        conditionMet =
          actual !== undefined && actual !== null &&
          value !== undefined && value !== null &&
          Number(actual) < Number(value);
        break;
      default:
        logger.warn(
          { enrollmentId, operator },
          "Unknown condition operator — treating as eq"
        );
        conditionMet = String(actual) === String(value);
    }

    if (!conditionMet) {
      await prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: { status: "cancelled", completedAt: new Date(), nextExecuteAt: null },
      });
      logger.info(
        { enrollmentId, field, operator, value, actual },
        "Condition not met — enrollment cancelled"
      );
      return;
    }

    logger.info(
      { enrollmentId, field, operator, value, actual },
      "Condition met — advancing"
    );
    await advanceToNextStep(enrollmentId, currentStepIndex, steps.length, enrollment.version);
  } else if (step.type === "wait") {
    const delayMinutes = Number(config["delayMinutes"]) || 0;
    if (delayMinutes <= 0) {
      logger.warn(
        { enrollmentId, stepOrder: step.stepOrder },
        "Wait step with delayMinutes <= 0 — advancing immediately"
      );
      await advanceToNextStep(enrollmentId, currentStepIndex, steps.length, enrollment.version);
      return;
    }

    const nextExecuteAt = new Date(Date.now() + delayMinutes * 60_000);

    // Optimistic lock: only update if version matches
    const updated = await prisma.automationEnrollment.updateMany({
      where: { id: enrollmentId, version: enrollment.version },
      data: {
        currentStep: currentStepIndex + 1,
        nextExecuteAt,
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      logger.warn({ enrollmentId }, "Optimistic lock conflict on wait step — skipping");
      return;
    }

    logger.info(
      { enrollmentId, delayMinutes, nextExecuteAt },
      "Wait step — scheduled next execution"
    );
  } else {
    logger.error(
      { enrollmentId, stepType: step.type, stepOrder: step.stepOrder },
      "Unknown step type — skipping"
    );
    await advanceToNextStep(enrollmentId, currentStepIndex, steps.length, enrollment.version);
  }
}

async function advanceToNextStep(
  enrollmentId: number,
  currentStepIndex: number,
  totalSteps: number,
  currentVersion: number
): Promise<void> {
  const nextIndex = currentStepIndex + 1;

  if (nextIndex >= totalSteps) {
    // No more steps — complete (optimistic lock)
    const updated = await prisma.automationEnrollment.updateMany({
      where: { id: enrollmentId, version: currentVersion },
      data: {
        currentStep: nextIndex,
        status: "completed",
        completedAt: new Date(),
        nextExecuteAt: null,
        version: { increment: 1 },
      },
    });
    if (updated.count > 0) {
      logger.info({ enrollmentId }, "Automation enrollment completed");
    }
    return;
  }

  // Update step counter (optimistic lock)
  const updated = await prisma.automationEnrollment.updateMany({
    where: { id: enrollmentId, version: currentVersion },
    data: {
      currentStep: nextIndex,
      nextExecuteAt: null,
      version: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    logger.warn({ enrollmentId }, "Optimistic lock conflict on advance — skipping");
    return;
  }

  // Re-fetch to check next step
  const enrollment = await prisma.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      automation: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
    },
  });

  if (!enrollment || enrollment.status !== "active") return;

  const nextStep = getStepAtIndex(enrollment.automation.steps, nextIndex);

  if (nextStep && (nextStep.type === "send_message" || nextStep.type === "condition")) {
    // Execute immediately via queue
    await automationExecutorQueue.add("execute-step", { enrollmentId });
  } else if (nextStep && nextStep.type === "wait") {
    const config = nextStep.config as Record<string, unknown>;
    const delayMinutes = Number(config["delayMinutes"]) || 0;

    if (delayMinutes <= 0) {
      // No wait — advance again immediately
      await automationExecutorQueue.add("execute-step", { enrollmentId });
    } else {
      const nextExecuteAt = new Date(Date.now() + delayMinutes * 60_000);
      await prisma.automationEnrollment.updateMany({
        where: { id: enrollmentId, version: enrollment.version },
        data: {
          currentStep: nextIndex + 1,
          nextExecuteAt,
          version: { increment: 1 },
        },
      });
    }
  }
}

export function startAutomationExecutorWorker(): void {
  const worker = new Worker(
    QUEUE_NAMES.AUTOMATION_EXECUTOR,
    executeStep,
    {
      connection: getRedisConnection(),
      concurrency: 10,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Automation executor job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Automation executor job failed");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Automation executor worker error");
  });

  logger.info("Automation executor worker started (concurrency: 10)");
}
