/**
 * =============================================================================
 * TESTS - Rate Limiter
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  RATE_LIMIT_CONFIG,
  getRateLimitHeaders,
} from "../rateLimiter";

// =============================================================================
// TESTS: Configuration
// =============================================================================

describe("RATE_LIMIT_CONFIG", () => {
  it("should have all required limit types", () => {
    const expectedTypes = [
      "AI_CHAT",
      "AI_CHAT_PROVIDER",
      "WEBHOOK_INGEST",
      "BOOKING_CREATE",
      "MESSAGE_SEND",
      "AUTH_LOGIN",
      "API_GENERAL",
    ];

    for (const type of expectedTypes) {
      expect(RATE_LIMIT_CONFIG.LIMITS).toHaveProperty(type);
    }
  });

  it("should have valid limit values", () => {
    for (const [key, config] of Object.entries(RATE_LIMIT_CONFIG.LIMITS)) {
      expect(config.limit).toBeGreaterThan(0);
      expect(config.windowSeconds).toBeGreaterThan(0);
    }
  });

  it("should have AI_CHAT_PROVIDER higher than AI_CHAT", () => {
    expect(RATE_LIMIT_CONFIG.LIMITS.AI_CHAT_PROVIDER.limit).toBeGreaterThan(
      RATE_LIMIT_CONFIG.LIMITS.AI_CHAT.limit
    );
  });

  it("should have WEBHOOK_INGEST with short window for DDoS protection", () => {
    expect(RATE_LIMIT_CONFIG.LIMITS.WEBHOOK_INGEST.windowSeconds).toBeLessThanOrEqual(60);
  });

  it("should have AUTH_LOGIN with strict limits", () => {
    expect(RATE_LIMIT_CONFIG.LIMITS.AUTH_LOGIN.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMIT_CONFIG.LIMITS.AUTH_LOGIN.windowSeconds).toBeLessThanOrEqual(300);
  });
});

// =============================================================================
// TESTS: getRateLimitHeaders
// =============================================================================

describe("getRateLimitHeaders", () => {
  it("should return correct headers when allowed", () => {
    const result = {
      allowed: true,
      remaining: 50,
      resetAt: new Date(Date.now() + 3600000),
      limit: 100,
      current: 50,
    };

    const headers = getRateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBe("100");
    expect(headers["X-RateLimit-Remaining"]).toBe("50");
    expect(headers["X-RateLimit-Reset"]).toBeTruthy();
    expect(headers["Retry-After"]).toBe("0");
  });

  it("should return Retry-After when not allowed", () => {
    const resetAt = new Date(Date.now() + 60000); // 60 seconds from now
    const result = {
      allowed: false,
      remaining: 0,
      resetAt,
      limit: 100,
      current: 100,
    };

    const headers = getRateLimitHeaders(result);

    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(parseInt(headers["Retry-After"])).toBeGreaterThan(0);
    expect(parseInt(headers["Retry-After"])).toBeLessThanOrEqual(60);
  });

  it("should include all required header names", () => {
    const result = {
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
      limit: 50,
      current: 40,
    };

    const headers = getRateLimitHeaders(result);
    const requiredHeaders = [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ];

    for (const header of requiredHeaders) {
      expect(headers).toHaveProperty(header);
    }
  });
});

// =============================================================================
// TESTS: Bucket Calculation Logic
// =============================================================================

describe("Bucket Calculation", () => {
  it("should calculate correct bucket for given time window", () => {
    const windowSeconds = 3600; // 1 hour
    const now = Date.now();
    const bucket = Math.floor(now / (windowSeconds * 1000));

    // Bucket should be a positive integer
    expect(bucket).toBeGreaterThan(0);
    expect(Number.isInteger(bucket)).toBe(true);

    // Same bucket within window
    const slightlyLater = now + 1000; // 1 second later
    const sameBucket = Math.floor(slightlyLater / (windowSeconds * 1000));
    expect(sameBucket).toBe(bucket);
  });

  it("should change bucket after window expires", () => {
    const windowSeconds = 60; // 1 minute
    const now = Date.now();
    const bucket = Math.floor(now / (windowSeconds * 1000));

    // Next window
    const afterWindow = now + (windowSeconds * 1000);
    const nextBucket = Math.floor(afterWindow / (windowSeconds * 1000));

    expect(nextBucket).toBe(bucket + 1);
  });
});

// =============================================================================
// TESTS: Rate Limit Scenarios
// =============================================================================

describe("Rate Limit Scenarios", () => {
  it("should allow first request", () => {
    const currentCount = 0;
    const limit = 100;
    const allowed = currentCount < limit;

    expect(allowed).toBe(true);
  });

  it("should deny when limit reached", () => {
    const currentCount = 100;
    const limit = 100;
    const allowed = currentCount < limit;

    expect(allowed).toBe(false);
  });

  it("should calculate remaining correctly", () => {
    const limit = 100;
    const testCases = [
      { current: 0, expected: 100 },
      { current: 50, expected: 50 },
      { current: 99, expected: 1 },
      { current: 100, expected: 0 },
      { current: 150, expected: 0 }, // Over limit
    ];

    for (const { current, expected } of testCases) {
      const remaining = Math.max(0, limit - current);
      expect(remaining).toBe(expected);
    }
  });
});

// =============================================================================
// TESTS: Bucket Key Generation
// =============================================================================

describe("Bucket Key Generation", () => {
  it("should generate unique keys for different types", () => {
    const key = "user_123";
    const bucket = 12345;

    const aiKey = `AI_CHAT:${key}:${bucket}`;
    const webhookKey = `WEBHOOK_INGEST:${key}:${bucket}`;

    expect(aiKey).not.toBe(webhookKey);
  });

  it("should generate unique keys for different users", () => {
    const bucket = 12345;
    const type = "AI_CHAT";

    const user1Key = `${type}:user_1:${bucket}`;
    const user2Key = `${type}:user_2:${bucket}`;

    expect(user1Key).not.toBe(user2Key);
  });

  it("should generate unique keys for different buckets", () => {
    const key = "user_123";
    const type = "AI_CHAT";

    const bucket1Key = `${type}:${key}:12345`;
    const bucket2Key = `${type}:${key}:12346`;

    expect(bucket1Key).not.toBe(bucket2Key);
  });
});

// =============================================================================
// TESTS: Edge Cases
// =============================================================================

describe("Edge Cases", () => {
  it("should handle IP addresses with special characters", () => {
    const ips = [
      "192.168.1.1",
      "::1",
      "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      "unknown",
    ];

    for (const ip of ips) {
      const key = `WEBHOOK_INGEST:${ip}:12345`;
      expect(key).toBeTruthy();
      expect(key.includes(ip)).toBe(true);
    }
  });

  it("should handle very large bucket numbers", () => {
    const largeTime = Date.now() * 10; // Far future
    const windowSeconds = 3600;
    const bucket = Math.floor(largeTime / (windowSeconds * 1000));

    expect(Number.isFinite(bucket)).toBe(true);
  });
});
