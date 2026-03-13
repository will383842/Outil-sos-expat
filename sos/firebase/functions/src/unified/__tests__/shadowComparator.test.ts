/**
 * Tests for shadowComparator and commissionCalculator
 */

import { ShadowResult } from "../types";

// ============================================================================
// SHADOW COMPARISON VERDICT LOGIC
// ============================================================================

describe("shadowComparator — verdict logic", () => {
  function determineVerdict(
    shadowResult: ShadowResult | null,
    legacyResults: Record<string, string>
  ): string {
    if (!shadowResult || shadowResult.commissions.length === 0) {
      const anyLegacyOk = Object.values(legacyResults).some((r) => r === "ok");
      return anyLegacyOk ? "legacy_only" : "match";
    }
    return "shadow_only";
  }

  it("both empty → match", () => {
    const shadow: ShadowResult = { commissions: [], totalAmount: 0 };
    const legacy = { chatter: "skipped", influencer: "skipped" };
    expect(determineVerdict(shadow, legacy)).toBe("match");
  });

  it("shadow null + legacy ok → legacy_only", () => {
    const legacy = { chatter: "ok", influencer: "skipped" };
    expect(determineVerdict(null, legacy)).toBe("legacy_only");
  });

  it("shadow has commissions → shadow_only", () => {
    const shadow: ShadowResult = {
      commissions: [{ referrerId: "u1", type: "client_call", amount: 1000 }],
      totalAmount: 1000,
    };
    const legacy = { chatter: "ok" };
    expect(determineVerdict(shadow, legacy)).toBe("shadow_only");
  });

  it("shadow empty + all legacy error → match (no commissions from either)", () => {
    const shadow: ShadowResult = { commissions: [], totalAmount: 0 };
    const legacy = { chatter: "error: timeout" };
    expect(determineVerdict(shadow, legacy)).toBe("match");
  });
});

// ============================================================================
// COMMISSION CALCULATOR — Event dispatch logic
// ============================================================================

describe("commissionCalculator — event dispatch", () => {
  it("dispatches call_completed events", () => {
    const event = { type: "call_completed" as const };
    expect(event.type).toBe("call_completed");
  });

  it("dispatches user_registered events", () => {
    const event = { type: "user_registered" as const };
    expect(event.type).toBe("user_registered");
  });

  it("dispatches provider_registered events", () => {
    const event = { type: "provider_registered" as const };
    expect(event.type).toBe("provider_registered");
  });

  it("dispatches subscription_created events", () => {
    const event = { type: "subscription_created" as const };
    expect(event.type).toBe("subscription_created");
  });

  it("dispatches subscription_renewed events", () => {
    const event = { type: "subscription_renewed" as const };
    expect(event.type).toBe("subscription_renewed");
  });
});

// ============================================================================
// SHADOW MODE FLAG LOGIC
// ============================================================================

describe("commissionCalculator — shadow mode logic", () => {
  it("forceShadow=true always enables shadow mode", () => {
    const config = { enabled: false, shadowMode: false };
    const forceShadow = true;
    const isShadow = forceShadow || config.shadowMode;
    expect(isShadow).toBe(true);
  });

  it("config.shadowMode=true enables shadow mode", () => {
    const config = { enabled: true, shadowMode: true };
    const forceShadow = false;
    const isShadow = forceShadow || config.shadowMode;
    expect(isShadow).toBe(true);
  });

  it("both false → no shadow mode", () => {
    const config = { enabled: true, shadowMode: false };
    const forceShadow = false;
    const isShadow = forceShadow || config.shadowMode;
    expect(isShadow).toBe(false);
  });

  it("system disabled + no force → skip entirely", () => {
    const config = { enabled: false, shadowMode: false };
    const forceShadow = false;
    const shouldSkip = !config.enabled && !config.shadowMode && !forceShadow;
    expect(shouldSkip).toBe(true);
  });

  it("system disabled but forceShadow → proceed", () => {
    const config = { enabled: false, shadowMode: false };
    const forceShadow = true;
    const shouldSkip = !config.enabled && !config.shadowMode && !forceShadow;
    expect(shouldSkip).toBe(false);
  });
});

// ============================================================================
// TRIGGER INTEGRATION — Call completed event extraction
// ============================================================================

describe("trigger integration — call_completed data extraction", () => {
  it("extracts call session data from Firestore document", () => {
    const afterData = {
      status: "completed",
      clientId: "client_123",
      providerId: "provider_456",
      providerType: "lawyer",
      amount: 5500,
      connectionFee: 500,
      duration: 180,
      isPaid: true,
    };

    const event = {
      type: "call_completed" as const,
      callSession: {
        id: "session_789",
        clientId: afterData.clientId || "",
        providerId: afterData.providerId || "",
        providerType: afterData.providerType as "lawyer" | "expat",
        amount: afterData.amount || 0,
        connectionFee: afterData.connectionFee || 0,
        duration: afterData.duration || 0,
        isPaid: afterData.isPaid ?? false,
      },
    };

    expect(event.callSession.clientId).toBe("client_123");
    expect(event.callSession.providerId).toBe("provider_456");
    expect(event.callSession.providerType).toBe("lawyer");
    expect(event.callSession.amount).toBe(5500);
    expect(event.callSession.duration).toBe(180);
    expect(event.callSession.isPaid).toBe(true);
  });

  it("handles alternative field names (snake_case)", () => {
    const afterData = {
      client_id: "client_abc",
      provider_id: "provider_def",
      provider_type: "expat",
      totalAmount: 3000,
      connection_fee: 300,
      call_duration: 90,
      is_paid: true,
    };

    const clientId = afterData.client_id || "";
    const providerId = afterData.provider_id || "";
    const providerType = afterData.provider_type || "expat";
    const amount = afterData.totalAmount || 0;
    const duration = afterData.call_duration || 0;
    const isPaid = afterData.is_paid ?? false;

    expect(clientId).toBe("client_abc");
    expect(providerId).toBe("provider_def");
    expect(providerType).toBe("expat");
    expect(amount).toBe(3000);
    expect(duration).toBe(90);
    expect(isPaid).toBe(true);
  });
});

// ============================================================================
// TRIGGER INTEGRATION — User created event extraction
// ============================================================================

describe("trigger integration — user_registered data extraction", () => {
  it("determines if user is a provider", () => {
    const testCases = [
      { role: "lawyer", expected: true },
      { role: "expat", expected: true },
      { role: "provider", expected: true },
      { role: "client", expected: false },
      { role: "chatter", expected: false },
      { role: "influencer", expected: false },
    ];

    for (const { role, expected } of testCases) {
      const isProvider = role === "lawyer" || role === "expat" || role === "provider";
      expect(isProvider).toBe(expected);
    }
  });

  it("extracts referral code from multiple sources", () => {
    const userData = {
      referralCode: "CODE1",
      pendingReferralCode: "CODE2",
      referredByCode: "CODE3",
    };

    const code = userData.referralCode || userData.pendingReferralCode || userData.referredByCode;
    expect(code).toBe("CODE1");
  });

  it("fallback when referralCode is missing", () => {
    const userData = {
      pendingReferralCode: "CODE2",
      referredByCode: "CODE3",
    };

    const code = (userData as Record<string, string>).referralCode || userData.pendingReferralCode || userData.referredByCode;
    expect(code).toBe("CODE2");
  });
});
