/**
 * Vitest global setup file.
 *
 * Runs before every test file.  Its main jobs:
 *  1. Set environment variables that the production modules would
 *     crash without (DATABASE_URL, REDIS_URL, TELEGRAM_BOT_TOKEN, etc.).
 *  2. Reset all mocks between tests so state does not leak.
 *
 * The actual modules (Prisma, Redis, BullMQ, Telegram HTTP calls) are
 * never instantiated — vitest.config.ts aliases redirect every import to
 * the lightweight stubs in __mocks__/.
 */

import { beforeEach, vi } from "vitest";

// ─── Environment variables (must be set BEFORE any import that reads them) ───
process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test_db";
process.env["REDIS_URL"] = "redis://localhost:6379/0";
process.env["TELEGRAM_BOT_TOKEN"] = "123456:FAKE_TOKEN_FOR_TESTS";
process.env["WEBHOOK_API_KEY"] = "test-webhook-api-key-at-least-16-chars";
process.env["JWT_SECRET"] = "a]very]secret]key]for]testing]that]is]long]enough";
process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "silent";

// ─── Reset every mock between tests ──────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});
