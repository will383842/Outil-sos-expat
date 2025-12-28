/**
 * =============================================================================
 * TESTS - Subscription Module
 * =============================================================================
 */

import { describe, it, expect } from "vitest";
import { isSubscriptionActive } from "../subscription";

// =============================================================================
// TESTS: isSubscriptionActive
// =============================================================================

describe("isSubscriptionActive", () => {
  it("should return true for active status", () => {
    expect(isSubscriptionActive("active")).toBe(true);
  });

  it("should return true for trialing status", () => {
    expect(isSubscriptionActive("trialing")).toBe(true);
  });

  it("should return true for past_due status (grace period)", () => {
    expect(isSubscriptionActive("past_due")).toBe(true);
  });

  it("should return false for canceled status", () => {
    expect(isSubscriptionActive("canceled")).toBe(false);
  });

  it("should return false for unpaid status", () => {
    expect(isSubscriptionActive("unpaid")).toBe(false);
  });

  it("should return false for expired status", () => {
    expect(isSubscriptionActive("expired")).toBe(false);
  });

  it("should return false for paused status", () => {
    expect(isSubscriptionActive("paused")).toBe(false);
  });
});

// =============================================================================
// TESTS: Subscription Status Coverage
// =============================================================================

describe("Subscription Status Types", () => {
  it("should cover all active statuses", () => {
    const activeStatuses = ["active", "trialing", "past_due"] as const;
    for (const status of activeStatuses) {
      expect(isSubscriptionActive(status)).toBe(true);
    }
  });

  it("should cover all inactive statuses", () => {
    const inactiveStatuses = ["canceled", "unpaid", "expired", "paused"] as const;
    for (const status of inactiveStatuses) {
      expect(isSubscriptionActive(status)).toBe(false);
    }
  });
});
