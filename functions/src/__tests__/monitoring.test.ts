/**
 * =============================================================================
 * TESTS - Monitoring Module
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logStructured,
  createPerformanceTracker,
  ALERT_THRESHOLDS,
} from "../monitoring";

// =============================================================================
// MOCKS
// =============================================================================

// Mock firebase-functions logger
vi.mock("firebase-functions", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock firebase-admin
vi.mock("firebase-admin", () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      add: vi.fn().mockResolvedValue({ id: "mock-id" }),
      doc: vi.fn(() => ({
        set: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  })),
}));

// =============================================================================
// TESTS: logStructured
// =============================================================================

describe("logStructured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log info level messages", async () => {
    const { logger } = await import("firebase-functions");
    logStructured("info", "Test info message", { key: "value" });

    expect(logger.info).toHaveBeenCalled();
    const call = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("Test info message");
    expect(call[1]).toMatchObject({
      message: "Test info message",
      key: "value",
    });
  });

  it("should log warn level messages", async () => {
    const { logger } = await import("firebase-functions");
    logStructured("warn", "Test warning message", { code: 123 });

    expect(logger.warn).toHaveBeenCalled();
    const call = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("Test warning message");
  });

  it("should log error level messages", async () => {
    const { logger } = await import("firebase-functions");
    logStructured("error", "Test error message", { error: "details" });

    expect(logger.error).toHaveBeenCalled();
    const call = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("Test error message");
  });

  it("should include timestamp in log data", async () => {
    const { logger } = await import("firebase-functions");
    logStructured("info", "Test message");

    const call = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1].timestamp).toBeDefined();
    expect(typeof call[1].timestamp).toBe("string");
  });
});

// =============================================================================
// TESTS: createPerformanceTracker
// =============================================================================

describe("createPerformanceTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track operation duration", async () => {
    const tracker = createPerformanceTracker("test_operation");

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 50));

    const metric = tracker.end();

    expect(metric.operation).toBe("test_operation");
    expect(metric.durationMs).toBeGreaterThanOrEqual(50);
    expect(metric.success).toBe(true);
  });

  it("should track failed operations", () => {
    const tracker = createPerformanceTracker("test_operation");
    const metric = tracker.end(false, { reason: "test failure" });

    expect(metric.success).toBe(false);
    expect(metric.metadata).toEqual({ reason: "test failure" });
  });

  it("should provide elapsed time without ending", async () => {
    const tracker = createPerformanceTracker("test_operation");

    await new Promise((resolve) => setTimeout(resolve, 30));
    const elapsed1 = tracker.elapsed();

    await new Promise((resolve) => setTimeout(resolve, 30));
    const elapsed2 = tracker.elapsed();

    expect(elapsed2).toBeGreaterThan(elapsed1);
    expect(elapsed1).toBeGreaterThanOrEqual(30);
    expect(elapsed2).toBeGreaterThanOrEqual(60);
  });

  it("should include metadata in metrics", () => {
    const tracker = createPerformanceTracker("test_operation");
    const metric = tracker.end(true, { userId: "123", action: "test" });

    expect(metric.metadata).toEqual({ userId: "123", action: "test" });
  });
});

// =============================================================================
// TESTS: ALERT_THRESHOLDS
// =============================================================================

describe("ALERT_THRESHOLDS", () => {
  it("should have all expected threshold values", () => {
    expect(ALERT_THRESHOLDS.AI_RESPONSE_WARNING).toBe(10000);
    expect(ALERT_THRESHOLDS.AI_RESPONSE_CRITICAL).toBe(30000);
    expect(ALERT_THRESHOLDS.API_RESPONSE_WARNING).toBe(5000);
    expect(ALERT_THRESHOLDS.API_RESPONSE_CRITICAL).toBe(15000);
    expect(ALERT_THRESHOLDS.ERROR_RATE_WARNING).toBe(10);
    expect(ALERT_THRESHOLDS.ERROR_RATE_CRITICAL).toBe(50);
    expect(ALERT_THRESHOLDS.QUOTA_WARNING_PERCENT).toBe(80);
    expect(ALERT_THRESHOLDS.QUOTA_CRITICAL_PERCENT).toBe(95);
  });

  it("should have warning thresholds lower than critical", () => {
    expect(ALERT_THRESHOLDS.AI_RESPONSE_WARNING).toBeLessThan(
      ALERT_THRESHOLDS.AI_RESPONSE_CRITICAL
    );
    expect(ALERT_THRESHOLDS.API_RESPONSE_WARNING).toBeLessThan(
      ALERT_THRESHOLDS.API_RESPONSE_CRITICAL
    );
    expect(ALERT_THRESHOLDS.ERROR_RATE_WARNING).toBeLessThan(
      ALERT_THRESHOLDS.ERROR_RATE_CRITICAL
    );
    expect(ALERT_THRESHOLDS.QUOTA_WARNING_PERCENT).toBeLessThan(
      ALERT_THRESHOLDS.QUOTA_CRITICAL_PERCENT
    );
  });
});
