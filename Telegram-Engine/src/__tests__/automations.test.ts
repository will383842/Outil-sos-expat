import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import automationsRoutes from "../api/routes/automations.js";
import { prisma } from "./__mocks__/database.js";

// ─── Fastify test instance ───────────────────────────────────────────────────

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(automationsRoutes, { prefix: "/api/automations" });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Welcome Flow",
    triggerEvent: "new_registration",
    steps: [
      {
        stepOrder: 0,
        type: "send_message",
        config: { messages: { en: "Hello!", fr: "Bonjour!" } },
      },
      {
        stepOrder: 1,
        type: "wait",
        config: { delayMinutes: 60 },
      },
    ],
    ...overrides,
  };
}

// ─── CREATE tests ────────────────────────────────────────────────────────────

describe("POST /api/automations", () => {
  it("creates an automation with valid steps", async () => {
    const fakeAutomation = {
      id: 1,
      name: "Welcome Flow",
      triggerEvent: "new_registration",
      isActive: false,
      allowReenrollment: false,
    };
    const fakeWithSteps = {
      ...fakeAutomation,
      steps: [
        { id: 1, automationId: 1, stepOrder: 0, type: "send_message", config: { messages: { en: "Hello!" } } },
        { id: 2, automationId: 1, stepOrder: 1, type: "wait", config: { delayMinutes: 60 } },
      ],
    };

    // $transaction runs the callback with prisma as tx
    prisma.automation.create.mockResolvedValueOnce(fakeAutomation);
    prisma.automationStep.createMany.mockResolvedValueOnce({ count: 2 });
    prisma.automation.findUnique.mockResolvedValueOnce(fakeWithSteps);

    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody(),
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe("Welcome Flow");
    expect(body.data.steps).toHaveLength(2);

    // Verify create was called
    expect(prisma.automation.create).toHaveBeenCalledOnce();
    const createData = prisma.automation.create.mock.calls[0][0].data;
    expect(createData.name).toBe("Welcome Flow");
    expect(createData.isActive).toBe(false); // created as inactive

    // Verify steps were batch-created
    expect(prisma.automationStep.createMany).toHaveBeenCalledOnce();
  });

  it("rejects an invalid step type with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody({
        steps: [
          { stepOrder: 0, type: "launch_missiles", config: {} },
        ],
      }),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("invalid type");
    expect(body.message).toContain("launch_missiles");

    // Nothing should be persisted
    expect(prisma.automation.create).not.toHaveBeenCalled();
  });

  it("rejects send_message step without messages object", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody({
        steps: [
          { stepOrder: 0, type: "send_message", config: { text: "oops" } },
        ],
      }),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("messages");
  });

  it("rejects wait step with invalid delayMinutes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody({
        steps: [
          { stepOrder: 0, type: "wait", config: { delayMinutes: -5 } },
        ],
      }),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("delayMinutes");
  });

  it("rejects condition step without required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody({
        steps: [
          { stepOrder: 0, type: "condition", config: {} },
        ],
      }),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("field");
  });

  it("rejects missing name with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody({ name: "" }),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("name");
  });

  it("rejects missing triggerEvent with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody({ triggerEvent: "" }),
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("triggerEvent");
  });

  it("normalizes step orders to be contiguous 0..n-1", async () => {
    // Steps with gaps: 5, 10, 20 should become 0, 1, 2
    const stepsWithGaps = [
      { stepOrder: 20, type: "wait", config: { delayMinutes: 30 } },
      { stepOrder: 5, type: "send_message", config: { messages: { en: "Hi" } } },
      { stepOrder: 10, type: "wait", config: { delayMinutes: 10 } },
    ];

    prisma.automation.create.mockResolvedValueOnce({ id: 2, name: "Gap Flow" });
    prisma.automationStep.createMany.mockResolvedValueOnce({ count: 3 });
    prisma.automation.findUnique.mockResolvedValueOnce({
      id: 2,
      name: "Gap Flow",
      steps: [
        { stepOrder: 0, type: "send_message" },
        { stepOrder: 1, type: "wait" },
        { stepOrder: 2, type: "wait" },
      ],
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: validCreateBody({ steps: stepsWithGaps }),
    });

    expect(res.statusCode).toBe(201);

    // Verify the createMany call received normalized step orders
    const createManyArg = prisma.automationStep.createMany.mock.calls[0][0];
    const orders = createManyArg.data.map((s: { stepOrder: number }) => s.stepOrder);
    expect(orders).toEqual([0, 1, 2]);

    // Verify order: stepOrder 5 (send_message) sorted first, then 10, then 20
    const types = createManyArg.data.map((s: { type: string }) => s.type);
    expect(types).toEqual(["send_message", "wait", "wait"]);
  });
});

// ─── TOGGLE tests ────────────────────────────────────────────────────────────

describe("POST /api/automations/:id/toggle", () => {
  it("toggles an inactive automation to active", async () => {
    prisma.automation.findUnique.mockResolvedValueOnce({
      id: 1,
      isActive: false,
      steps: [{ id: 1, type: "send_message" }],
    });
    prisma.automation.update.mockResolvedValueOnce({
      id: 1,
      isActive: true,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/automations/1/toggle",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.isActive).toBe(true);
  });

  it("toggles an active automation to inactive", async () => {
    prisma.automation.findUnique.mockResolvedValueOnce({
      id: 1,
      isActive: true,
      steps: [{ id: 1, type: "send_message" }],
    });
    prisma.automation.update.mockResolvedValueOnce({
      id: 1,
      isActive: false,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/automations/1/toggle",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.isActive).toBe(false);
  });

  it("cannot activate an automation with 0 steps", async () => {
    prisma.automation.findUnique.mockResolvedValueOnce({
      id: 2,
      isActive: false,
      steps: [], // no steps
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/automations/2/toggle",
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain("no steps");

    // update should NOT be called
    expect(prisma.automation.update).not.toHaveBeenCalled();
  });

  it("returns 404 for non-existent automation", async () => {
    prisma.automation.findUnique.mockResolvedValueOnce(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/automations/999/toggle",
    });

    expect(res.statusCode).toBe(404);
  });
});
