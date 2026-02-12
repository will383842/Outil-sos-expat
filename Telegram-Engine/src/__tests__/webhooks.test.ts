import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import webhookRoutes from "../api/routes/webhooks.js";
import { prisma } from "./__mocks__/database.js";
import { eventProcessorQueue } from "./__mocks__/queue.js";

// ─── Test helpers ────────────────────────────────────────────────────────────

const VALID_API_KEY = process.env["WEBHOOK_API_KEY"]!;

function buildHeaders(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (apiKey !== undefined) h["x-api-key"] = apiKey;
  return h;
}

function validEventBody(overrides: Record<string, unknown> = {}) {
  return {
    eventType: "new_registration",
    sosUserId: "user_123",
    payload: { name: "Alice", language: "fr" },
    ...overrides,
  };
}

// ─── Fastify test instance ───────────────────────────────────────────────────

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(webhookRoutes, { prefix: "/api/webhooks" });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/event", () => {
  it("accepts a valid event and returns 202", async () => {
    const fakeEvent = { id: 42, eventType: "new_registration" };
    prisma.incomingEvent.create.mockResolvedValueOnce(fakeEvent);

    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: buildHeaders(VALID_API_KEY),
      payload: validEventBody(),
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.eventId).toBe(42);

    // Verify the event was persisted
    expect(prisma.incomingEvent.create).toHaveBeenCalledOnce();
    const createArg = prisma.incomingEvent.create.mock.calls[0][0];
    expect(createArg.data.eventType).toBe("new_registration");
    expect(createArg.data.sosUserId).toBe("user_123");

    // Verify the event was queued for processing
    expect(eventProcessorQueue.add).toHaveBeenCalledOnce();
    expect(eventProcessorQueue.add).toHaveBeenCalledWith("process-event", {
      eventId: 42,
    });
  });

  it("rejects an invalid event type with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: buildHeaders(VALID_API_KEY),
      payload: validEventBody({ eventType: "totally_invalid_event" }),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Unknown eventType");
    expect(body.error).toContain("totally_invalid_event");

    // Nothing should be persisted
    expect(prisma.incomingEvent.create).not.toHaveBeenCalled();
  });

  it("rejects missing eventType with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: buildHeaders(VALID_API_KEY),
      payload: { payload: { some: "data" } },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("eventType");
  });

  it("rejects missing payload with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: buildHeaders(VALID_API_KEY),
      payload: { eventType: "welcome" },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("payload");
  });

  it("deduplicates events and returns 200 with duplicate flag", async () => {
    // Simulate Prisma unique constraint violation (P2002)
    const uniqueError = new Error("Unique constraint failed") as Error & {
      code: string;
    };
    uniqueError.code = "P2002";
    prisma.incomingEvent.create.mockRejectedValueOnce(uniqueError);

    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: buildHeaders(VALID_API_KEY),
      payload: validEventBody({ idempotencyKey: "same-key-twice" }),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.duplicate).toBe(true);

    // Queue should NOT be called for duplicates
    expect(eventProcessorQueue.add).not.toHaveBeenCalled();
  });

  it("rejects requests with missing API key (401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: { "content-type": "application/json" }, // no x-api-key
      payload: validEventBody(),
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Invalid API key");
  });

  it("rejects requests with wrong API key (401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: buildHeaders("wrong-key-but-long-enough"),
      payload: validEventBody(),
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Invalid API key");
  });

  it("rejects requests with too-short API key (401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/webhooks/event",
      headers: buildHeaders("short"),
      payload: validEventBody(),
    });

    expect(res.statusCode).toBe(401);
  });

  it("accepts all valid event types", async () => {
    const validTypes = [
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
    ];

    for (const eventType of validTypes) {
      prisma.incomingEvent.create.mockResolvedValueOnce({
        id: 100,
        eventType,
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/webhooks/event",
        headers: buildHeaders(VALID_API_KEY),
        payload: validEventBody({ eventType }),
      });

      expect(res.statusCode).toBe(202);
    }
  });
});
