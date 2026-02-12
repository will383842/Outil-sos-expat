import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { authenticateUser, parseIdParam } from "../middleware/auth.js";

interface AutomationParams {
  id: string;
}

interface StepInput {
  stepOrder: number;
  type: string; // send_message, wait, condition
  config: Record<string, unknown>;
}

interface CreateAutomationBody {
  name: string;
  triggerEvent: string;
  conditions?: Record<string, unknown>;
  allowReenrollment?: boolean;
  steps: StepInput[];
}

const VALID_STEP_TYPES = ["send_message", "wait", "condition"];
const VALID_PARSE_MODES = ["HTML", "MarkdownV2"];
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

/** Validate automation steps — returns error message or null */
function validateSteps(steps: StepInput[]): string | null {
  for (const step of steps) {
    if (!VALID_STEP_TYPES.includes(step.type)) {
      return `Step ${step.stepOrder}: invalid type "${step.type}". Valid: ${VALID_STEP_TYPES.join(", ")}`;
    }

    if (step.type === "send_message") {
      const messages = step.config["messages"];
      if (!messages || typeof messages !== "object" || Array.isArray(messages)) {
        return `Step ${step.stepOrder}: send_message must have a non-empty "messages" object`;
      }
      const msgObj = messages as Record<string, unknown>;
      if (Object.keys(msgObj).length === 0) {
        return `Step ${step.stepOrder}: send_message must have at least one language message`;
      }
      // Validate each message content
      for (const [lang, content] of Object.entries(msgObj)) {
        if (typeof content !== "string") {
          return `Step ${step.stepOrder}: message for "${lang}" must be a string`;
        }
        if (content.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
          return `Step ${step.stepOrder}: message for "${lang}" exceeds ${TELEGRAM_MAX_MESSAGE_LENGTH} chars`;
        }
      }
      // Validate parseMode
      const parseMode = step.config["parseMode"];
      if (parseMode && !VALID_PARSE_MODES.includes(parseMode as string)) {
        return `Step ${step.stepOrder}: invalid parseMode. Valid: ${VALID_PARSE_MODES.join(", ")}`;
      }
    } else if (step.type === "wait") {
      const delayMinutes = Number(step.config["delayMinutes"]);
      if (!delayMinutes || delayMinutes <= 0) {
        return `Step ${step.stepOrder}: wait must have delayMinutes > 0`;
      }
      if (delayMinutes > 525_600) { // 1 year max
        return `Step ${step.stepOrder}: delayMinutes cannot exceed 525600 (1 year)`;
      }
    } else if (step.type === "condition") {
      if (!step.config["field"] || typeof step.config["field"] !== "string") {
        return `Step ${step.stepOrder}: condition must have a "field" string`;
      }
      if (!step.config["operator"] || typeof step.config["operator"] !== "string") {
        return `Step ${step.stepOrder}: condition must have an "operator" string`;
      }
    }
  }
  return null;
}

/** Normalize step orders to be contiguous 0..n-1 */
function normalizeStepOrders(steps: StepInput[]): StepInput[] {
  return steps
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s, i) => ({ ...s, stepOrder: i }));
}

export default async function automationsRoutes(
  app: FastifyInstance
): Promise<void> {
  app.addHook("preHandler", authenticateUser);

  // GET / — list automations with enrollment counts
  app.get("/", async (_request, reply) => {
    const automations = await prisma.automation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });
    return reply.send({ data: automations });
  });

  // POST / — create automation (with step validation)
  app.post<{ Body: CreateAutomationBody }>("/", async (request, reply) => {
    const { name, triggerEvent, conditions, allowReenrollment } = request.body;
    let { steps } = request.body;

    if (!name?.trim()) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "name is required",
      });
    }

    if (!triggerEvent?.trim()) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "triggerEvent is required",
      });
    }

    // Normalize and validate steps
    steps = normalizeStepOrders(steps);
    const stepError = validateSteps(steps);
    if (stepError) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: stepError,
      });
    }

    const automation = await prisma.$transaction(async (tx) => {
      const a = await tx.automation.create({
        data: {
          name: name.trim(),
          triggerEvent: triggerEvent.trim(),
          conditions: (conditions as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          isActive: false,
          allowReenrollment: allowReenrollment ?? false,
        },
      });

      if (steps.length > 0) {
        await tx.automationStep.createMany({
          data: steps.map((s) => ({
            automationId: a.id,
            stepOrder: s.stepOrder,
            type: s.type,
            config: s.config as Prisma.InputJsonValue,
          })),
        });
      }

      return a;
    });

    const created = await prisma.automation.findUnique({
      where: { id: automation.id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    return reply.status(201).send({ data: created });
  });

  // GET /:id — detail
  app.get<{ Params: AutomationParams }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);

    const automation = await prisma.automation.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!automation) {
      return reply.status(404).send({
        statusCode: 404,
        error: "Not Found",
        message: `Automation ${id} not found`,
      });
    }

    return reply.send({ data: automation });
  });

  // PUT /:id — update automation (with step validation)
  app.put<{
    Params: AutomationParams;
    Body: Partial<CreateAutomationBody> & { isActive?: boolean };
  }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    const { name, triggerEvent, conditions, isActive, allowReenrollment } = request.body;
    let { steps } = request.body;

    // Validate steps if provided
    if (steps !== undefined) {
      steps = normalizeStepOrders(steps);
      const stepError = validateSteps(steps);
      if (stepError) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: stepError,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData["name"] = name.trim();
      if (triggerEvent !== undefined) updateData["triggerEvent"] = triggerEvent.trim();
      if (conditions !== undefined) updateData["conditions"] = conditions;
      if (isActive !== undefined) updateData["isActive"] = isActive;
      if (allowReenrollment !== undefined) updateData["allowReenrollment"] = allowReenrollment;

      await tx.automation.update({ where: { id }, data: updateData });

      if (steps !== undefined) {
        await tx.automationStep.deleteMany({ where: { automationId: id } });
        if (steps.length > 0) {
          await tx.automationStep.createMany({
            data: steps.map((s) => ({
              automationId: id,
              stepOrder: s.stepOrder,
              type: s.type,
              config: s.config as Prisma.InputJsonValue,
            })),
          });
        }
      }
    });

    const updated = await prisma.automation.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    return reply.send({ data: updated });
  });

  // POST /:id/toggle — toggle active state
  app.post<{ Params: AutomationParams }>(
    "/:id/toggle",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const automation = await prisma.automation.findUnique({
        where: { id },
        include: { steps: true },
      });
      if (!automation) {
        return reply.status(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Automation ${id} not found`,
        });
      }

      // Cannot activate with no steps
      if (!automation.isActive && automation.steps.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Cannot activate an automation with no steps",
        });
      }

      const updated = await prisma.automation.update({
        where: { id },
        data: { isActive: !automation.isActive },
      });

      return reply.send({ data: updated });
    }
  );

  // DELETE /:id
  app.delete<{ Params: AutomationParams }>("/:id", async (request, reply) => {
    const id = parseIdParam(request.params.id);
    await prisma.automation.delete({ where: { id } });
    return reply.status(204).send();
  });

  // GET /:id/enrollments — list enrollments with subscriber info
  app.get<{ Params: AutomationParams; Querystring: { page?: string; limit?: string; status?: string } }>(
    "/:id/enrollments",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? "20", 10)));
      const skip = (page - 1) * limit;
      const statusFilter = request.query.status;

      const where: Record<string, unknown> = { automationId: id };
      if (statusFilter && ["active", "completed", "cancelled"].includes(statusFilter)) {
        where["status"] = statusFilter;
      }

      const [enrollments, total] = await Promise.all([
        prisma.automationEnrollment.findMany({
          where,
          include: {
            subscriber: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telegramUsername: true,
                role: true,
                language: true,
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.automationEnrollment.count({ where }),
      ]);

      return reply.send({
        data: enrollments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );

  // GET /:id/stats — enrollment stats (single query with groupBy)
  app.get<{ Params: AutomationParams }>(
    "/:id/stats",
    async (request, reply) => {
      const id = parseIdParam(request.params.id);

      const groups = await prisma.automationEnrollment.groupBy({
        by: ["status"],
        where: { automationId: id },
        _count: true,
      });

      const stats = { total: 0, active: 0, completed: 0, cancelled: 0 };
      for (const group of groups) {
        const count = group._count;
        stats.total += count;
        if (group.status === "active") stats.active = count;
        else if (group.status === "completed") stats.completed = count;
        else if (group.status === "cancelled") stats.cancelled = count;
      }

      return reply.send({ data: stats });
    }
  );
}
