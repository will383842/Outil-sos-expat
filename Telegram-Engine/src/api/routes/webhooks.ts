import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { eventProcessorQueue } from "../../jobs/queue.js";
import { logger } from "../../utils/logger.js";

const VALID_EVENT_TYPES = [
  "welcome",
  "new_registration",
  "call_completed",
  "payment_received",
  "daily_report",
  "new_provider",
  "new_contact_message",
  "negative_review",
  "security_alert",
  "withdrawal_request",
] as const;

interface EventBody {
  eventType: string;
  sosUserId?: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

/** Generate a dedup signature from event data */
function computeEventSignature(
  eventType: string,
  sosUserId: string | undefined,
  idempotencyKey: string | undefined,
  payload: Record<string, unknown>
): string {
  // If caller provides an idempotency key, use it directly
  if (idempotencyKey) {
    return createHash("sha256").update(idempotencyKey).digest("hex");
  }
  // Otherwise hash the full event
  const raw = JSON.stringify({ eventType, sosUserId, payload });
  return createHash("sha256").update(raw).digest("hex");
}

export default async function webhookRoutes(
  app: FastifyInstance
): Promise<void> {
  // API key auth — no JWT
  app.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const apiKey = request.headers["x-api-key"];
      const expected = process.env["WEBHOOK_API_KEY"];

      if (!expected) {
        logger.error("WEBHOOK_API_KEY env var not set — rejecting all webhook requests");
        return reply.status(503).send({ error: "Webhook endpoint not configured" });
      }

      if (typeof apiKey !== "string" || apiKey.length < 16 || apiKey !== expected) {
        return reply.status(401).send({ error: "Invalid API key" });
      }
    }
  );

  // POST /api/webhooks/event — receive events from SOS
  app.post<{ Body: EventBody }>("/event", async (request, reply) => {
    const { eventType, sosUserId, payload, idempotencyKey } = request.body;

    // Validate required fields
    if (!eventType || typeof eventType !== "string") {
      return reply.status(400).send({ error: "eventType is required and must be a string" });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return reply.status(400).send({ error: "payload is required and must be an object" });
    }

    // Validate event type
    if (!VALID_EVENT_TYPES.includes(eventType as typeof VALID_EVENT_TYPES[number])) {
      return reply.status(400).send({
        error: `Unknown eventType "${eventType}". Valid: ${VALID_EVENT_TYPES.join(", ")}`,
      });
    }

    // Compute dedup signature
    const eventSignature = computeEventSignature(eventType, sosUserId, idempotencyKey, payload);

    // Store in DB for audit trail (dedup via unique eventSignature)
    try {
      const event = await prisma.incomingEvent.create({
        data: {
          eventType,
          sosUserId: sosUserId ?? null,
          payload: payload as Prisma.InputJsonValue,
          eventSignature,
        },
      });

      // Queue for async processing
      await eventProcessorQueue.add("process-event", {
        eventId: event.id,
      });

      logger.info({ eventId: event.id, eventType, sosUserId }, "Incoming event queued");

      return reply.status(202).send({ ok: true, eventId: event.id });
    } catch (error) {
      // Duplicate event (unique constraint on eventSignature)
      if ((error as { code?: string }).code === "P2002") {
        logger.info({ eventType, sosUserId, eventSignature }, "Duplicate event — already processed");
        return reply.status(200).send({ ok: true, duplicate: true });
      }
      throw error;
    }
  });
}
