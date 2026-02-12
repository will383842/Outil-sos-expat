import { vi } from "vitest";

/**
 * Deep-mock of PrismaClient. Each model exposes the standard Prisma methods
 * (findUnique, findMany, create, update, delete, count, groupBy, createMany, deleteMany)
 * as vi.fn() stubs so tests can control return values per-call.
 */
function makePrismaModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    upsert: vi.fn(),
  };
}

export const prisma = {
  incomingEvent: makePrismaModelMock(),
  automation: makePrismaModelMock(),
  automationStep: makePrismaModelMock(),
  automationEnrollment: makePrismaModelMock(),
  campaign: makePrismaModelMock(),
  campaignMessage: makePrismaModelMock(),
  subscriber: makePrismaModelMock(),
  messageDelivery: makePrismaModelMock(),
  template: makePrismaModelMock(),
  notificationLog: makePrismaModelMock(),
  tag: makePrismaModelMock(),
  subscriberTag: makePrismaModelMock(),
  segment: makePrismaModelMock(),
  dailyStats: makePrismaModelMock(),
  appSetting: makePrismaModelMock(),
  user: makePrismaModelMock(),

  // Transaction helper — runs callback with `prisma` as the tx client
  $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
    return fn(prisma);
  }),

  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

export async function disconnectDatabase(): Promise<void> {
  // no-op in tests
}
