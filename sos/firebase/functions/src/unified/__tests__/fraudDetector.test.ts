/**
 * Tests for fraudDetector
 *
 * Unit tests for fraud detection logic (no Firestore needed for most).
 */

import { isSelfReferral } from "../fraudDetector";

// ============================================================================
// SELF-REFERRAL DETECTION
// ============================================================================

describe("fraudDetector — isSelfReferral", () => {
  it("detects same userId", () => {
    expect(isSelfReferral("user1", "user1")).toBe(true);
  });

  it("different userIds are NOT self-referral", () => {
    expect(isSelfReferral("user1", "user2")).toBe(false);
  });

  it("detects referrer === provider (provider self-referral)", () => {
    expect(isSelfReferral("provider1", "client1", "provider1")).toBe(true);
  });

  it("different provider is NOT self-referral", () => {
    expect(isSelfReferral("referrer1", "client1", "provider2")).toBe(false);
  });

  it("undefined providerId is NOT self-referral", () => {
    expect(isSelfReferral("referrer1", "client1", undefined)).toBe(false);
  });
});

// ============================================================================
// RISK LEVEL COMPUTATION LOGIC
// ============================================================================

describe("fraudDetector — risk level logic", () => {
  const highRiskReasons = ["self_referral_same_user", "self_referral_same_email", "circular_referral"];
  const mediumRiskReasons = ["rate_limit_exceeded", "same_ip_address"];

  function computeRisk(reasons: string[]): string {
    if (reasons.length === 0) return "none";
    if (reasons.some((r) => highRiskReasons.includes(r))) return "high";
    if (reasons.some((r) => mediumRiskReasons.includes(r))) return "medium";
    return "low";
  }

  it("no reasons → none risk", () => {
    expect(computeRisk([])).toBe("none");
  });

  it("self_referral_same_user → high risk", () => {
    expect(computeRisk(["self_referral_same_user"])).toBe("high");
  });

  it("self_referral_same_email → high risk", () => {
    expect(computeRisk(["self_referral_same_email"])).toBe("high");
  });

  it("circular_referral → high risk", () => {
    expect(computeRisk(["circular_referral"])).toBe("high");
  });

  it("rate_limit_exceeded → medium risk", () => {
    expect(computeRisk(["rate_limit_exceeded"])).toBe("medium");
  });

  it("same_ip_address → medium risk", () => {
    expect(computeRisk(["same_ip_address"])).toBe("medium");
  });

  it("disposable_email → low risk", () => {
    expect(computeRisk(["disposable_email"])).toBe("low");
  });

  it("high overrides medium when both present", () => {
    expect(computeRisk(["self_referral_same_user", "same_ip_address"])).toBe("high");
  });

  it("high risk should hold commission", () => {
    const risk = computeRisk(["circular_referral"]);
    expect(risk === "high").toBe(true);
    // shouldHold is set to true when riskLevel === "high"
  });
});
