/**
 * Tests: registerInfluencer (Influencer)
 *
 * Covers input-validation paths (no DB writes required):
 *  - unauthenticated when no auth context
 *  - invalid-argument when required fields are missing or malformed
 *
 * Deeper paths (role conflicts, code generation, Firestore writes) would
 * require heavy mocking of Firestore + utils — kept out of scope here.
 */

// ============================================================================
// Capture onCall handler
// ============================================================================

const captured = { handler: null as ((req: any) => Promise<any>) | null };

class MockHttpsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "HttpsError";
  }
}

jest.mock("firebase-functions/v2/https", () => ({
  onCall: jest.fn((_config: any, handler: any) => {
    captured.handler = handler;
    return jest.fn();
  }),
  HttpsError: MockHttpsError,
}));

// ============================================================================
// Firestore / Admin mocks
// ============================================================================

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
      })),
    })),
  })),
  Timestamp: { now: jest.fn(() => ({ toDate: () => new Date() })) },
}));

jest.mock("firebase-functions/v2", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("firebase-admin/app", () => ({
  getApps: jest.fn(() => [{ name: "default" }]),
  initializeApp: jest.fn(),
}));

// ============================================================================
// Dependency mocks
// ============================================================================

jest.mock("../../lib/rateLimiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue(undefined),
  RATE_LIMITS: { REGISTRATION: { max: 5, windowSec: 3600 } },
}));

jest.mock("../../lib/functionConfigs", () => ({
  ALLOWED_ORIGINS: ["https://example.com"],
}));

jest.mock("../../lib/secrets", () => ({
  BACKLINK_ENGINE_WEBHOOK_SECRET: "mock-secret",
}));

// ============================================================================
// Load handler (triggers captured.handler assignment)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("../callables/registerInfluencer");

// ============================================================================
// Tests
// ============================================================================

describe("registerInfluencer — input validation", () => {
  const baseInput = {
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    country: "FR",
    language: "fr",
    platforms: ["instagram"],
    acceptedTerms: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws unauthenticated when request has no auth", async () => {
    expect(captured.handler).not.toBeNull();
    await expect(
      captured.handler!({ auth: null, data: baseInput })
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws invalid-argument when firstName is missing", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, firstName: "" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when lastName is missing", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, lastName: "" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when firstName is too short", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, firstName: "A" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when email is malformed", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, email: "not-an-email" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when country code is missing", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, country: "" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when country code is not 2 letters", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, country: "FRA" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when language is unsupported", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, language: "xx" },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when platforms list is empty", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, platforms: [] },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when a platform is invalid", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, platforms: ["myspace" as any] },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("throws invalid-argument when bio exceeds 1000 chars", async () => {
    await expect(
      captured.handler!({
        auth: { uid: "u1" },
        data: { ...baseInput, bio: "a".repeat(1001) },
      })
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });
});
