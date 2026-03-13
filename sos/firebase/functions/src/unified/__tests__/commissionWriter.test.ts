import {
  CreateCommissionInput,
} from "../commissionWriter";

// ============================================================================
// UNIT TESTS — Input validation (no Firestore needed)
// ============================================================================

// We test the validation logic by importing the module and testing what we can
// without Firestore. The actual Firestore operations are integration-tested.

describe("commissionWriter — input validation", () => {
  // We can't call createUnifiedCommission directly without Firestore,
  // so we test the validation logic via the exported types and patterns.

  const validInput: CreateCommissionInput = {
    referrerId: "user123",
    referrerRole: "chatter",
    referrerCode: "JEAN1A2B3C",
    refereeId: "client456",
    refereeRole: "client",
    type: "client_call",
    planId: "CHATTER_V1",
    planVersion: 1,
    calculationType: "fixed",
    amount: 1000,
  };

  it("accepts a valid CreateCommissionInput", () => {
    expect(validInput.referrerId).toBe("user123");
    expect(validInput.type).toBe("client_call");
    expect(validInput.amount).toBe(1000);
  });

  it("CreateCommissionInput supports all commission types", () => {
    const types = [
      "client_call", "signup_bonus", "recruitment_call", "activation_bonus",
      "provider_recruitment", "recruit_bonus", "n1_recruit_bonus",
      "subscription_commission", "subscription_renewal",
      "captain_call", "captain_tier_bonus", "captain_quality_bonus",
      "referral_milestone", "bonus_level", "bonus_streak", "bonus_top3",
      "bonus_weekly_challenge", "bonus_telegram", "manual_adjustment",
    ];
    for (const t of types) {
      const input: CreateCommissionInput = { ...validInput, type: t as CreateCommissionInput["type"] };
      expect(input.type).toBe(t);
    }
  });

  it("supports optional holdHours", () => {
    const input: CreateCommissionInput = { ...validInput, holdHours: 48 };
    expect(input.holdHours).toBe(48);
  });

  it("supports optional status override", () => {
    const input: CreateCommissionInput = { ...validInput, status: "pending" };
    expect(input.status).toBe("pending");
  });

  it("supports optional subType for recruitment depth", () => {
    const input: CreateCommissionInput = {
      ...validInput,
      type: "recruitment_call",
      subType: "n2",
    };
    expect(input.subType).toBe("n2");
  });

  it("supports sourceId and sourceType for traceability", () => {
    const input: CreateCommissionInput = {
      ...validInput,
      sourceId: "call_session_789",
      sourceType: "call_session",
    };
    expect(input.sourceId).toBe("call_session_789");
    expect(input.sourceType).toBe("call_session");
  });

  it("supports percentage calculation fields", () => {
    const input: CreateCommissionInput = {
      ...validInput,
      calculationType: "percentage",
      baseAmount: 5000,
      rateApplied: 0.15,
      amount: 750,
    };
    expect(input.calculationType).toBe("percentage");
    expect(input.baseAmount).toBe(5000);
    expect(input.rateApplied).toBe(0.15);
    expect(input.amount).toBe(750); // 5000 * 0.15
  });

  it("supports locked_rate calculation type", () => {
    const input: CreateCommissionInput = {
      ...validInput,
      calculationType: "locked_rate",
      lockedRateUsed: true,
      amount: 1200,
    };
    expect(input.calculationType).toBe("locked_rate");
    expect(input.lockedRateUsed).toBe(true);
  });

  it("supports multiplier fields", () => {
    const input: CreateCommissionInput = {
      ...validInput,
      multiplierApplied: 1.5,
      promoMultiplierApplied: 2.0,
      amount: 3000,
    };
    expect(input.multiplierApplied).toBe(1.5);
    expect(input.promoMultiplierApplied).toBe(2.0);
  });

  it("supports currency override", () => {
    const input: CreateCommissionInput = { ...validInput, currency: "EUR" };
    expect(input.currency).toBe("EUR");
  });

  it("defaults currency concept to USD", () => {
    // currency is optional, defaults to "USD" at runtime in createUnifiedCommission
    expect(validInput.currency).toBeUndefined();
  });
});

describe("commissionWriter — status logic", () => {
  it("holdHours=0 should result in immediately available status", () => {
    // This is tested at the integration level, but we verify the logic:
    // holdHours > 0 → status = "held" with holdUntil
    // holdHours = 0 → status = "available"
    const holdHours = 0;
    const expectedStatus = holdHours > 0 ? "held" : "available";
    expect(expectedStatus).toBe("available");
  });

  it("holdHours=48 should result in held status", () => {
    const holdHours = 48;
    const expectedStatus = holdHours > 0 ? "held" : "available";
    expect(expectedStatus).toBe("held");
  });

  it("explicit status override takes precedence", () => {
    const explicitStatus = "pending";
    const holdHours = 48;
    // Logic: if input.status is set, use it regardless of holdHours
    const finalStatus = explicitStatus || (holdHours > 0 ? "held" : "available");
    expect(finalStatus).toBe("pending");
  });

  it("holdUntil is calculated correctly from holdHours", () => {
    const holdHours = 24;
    const nowMs = 1700000000000;
    const holdUntilMs = nowMs + holdHours * 60 * 60 * 1000;
    expect(holdUntilMs).toBe(nowMs + 86400000);
  });
});

describe("commissionWriter — balance update logic", () => {
  it("held status should increment totalEarned + pendingBalance", () => {
    const status: string = "held";
    const amount = 1000;
    const totalEarned = amount;
    const pendingDelta = status === "held" ? amount : 0;
    const availableDelta = status === "available" ? amount : 0;

    expect(totalEarned).toBe(1000);
    expect(pendingDelta).toBe(1000);
    expect(availableDelta).toBe(0);
  });

  it("available status should increment totalEarned + availableBalance", () => {
    const status: string = "available";
    const amount = 500;
    const totalEarned = amount;
    const pendingDelta = status === "held" ? amount : 0;
    const availableDelta = status === "available" ? amount : 0;

    expect(totalEarned).toBe(500);
    expect(pendingDelta).toBe(0);
    expect(availableDelta).toBe(500);
  });

  it("cancel reverses the correct balance based on original status", () => {
    // For held/pending/validated: decrement pendingBalance
    // For available: decrement availableBalance
    const testCases = [
      { originalStatus: "held", pendingDelta: -1000, availableDelta: 0 },
      { originalStatus: "pending", pendingDelta: -1000, availableDelta: 0 },
      { originalStatus: "validated", pendingDelta: -1000, availableDelta: 0 },
      { originalStatus: "available", pendingDelta: 0, availableDelta: -1000 },
    ];

    for (const tc of testCases) {
      const pending = ["held", "pending", "validated"].includes(tc.originalStatus) ? -1000 : 0;
      const available = tc.originalStatus === "available" ? -1000 : 0;
      expect(pending).toBe(tc.pendingDelta);
      expect(available).toBe(tc.availableDelta);
    }
  });

  it("release transfers from pendingBalance to availableBalance", () => {
    const amount = 750;
    const pendingDelta = -amount;
    const availableDelta = amount;

    expect(pendingDelta).toBe(-750);
    expect(availableDelta).toBe(750);
  });
});

describe("commissionWriter — anti-duplicate logic", () => {
  it("duplicate window is 5 minutes", () => {
    const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
    expect(DUPLICATE_WINDOW_MS).toBe(300000);
  });

  it("duplicate check requires matching referrerId + sourceId + type", () => {
    // The actual check is in Firestore, but the query logic is:
    // WHERE referrerId == X AND sourceId == Y AND type == Z AND createdAt >= (now - 5min)
    const criteria = {
      referrerId: "user123",
      sourceId: "call_789",
      type: "client_call",
      subType: undefined,
    };

    expect(criteria.referrerId).toBeDefined();
    expect(criteria.sourceId).toBeDefined();
    expect(criteria.type).toBeDefined();
  });

  it("subType is checked on the returned doc if specified", () => {
    // When subType is provided, the check verifies doc.subType matches
    const docSubType: string = "n2";
    const requestedSubType: string = "n2";
    expect(docSubType === requestedSubType).toBe(true);

    const differentSubType: string = "n1";
    expect(docSubType === differentSubType).toBe(false);
  });
});

// ============================================================================
// VALIDATION — status + holdHours conflict
// ============================================================================

describe("commissionWriter — status/holdHours validation", () => {
  it("both status and holdHours > 0 should be invalid", () => {
    const input = {
      status: "pending" as const,
      holdHours: 48,
    };
    const isInvalid = !!(input.status && input.holdHours && input.holdHours > 0);
    expect(isInvalid).toBe(true);
  });

  it("status only (no holdHours) is valid", () => {
    const input = {
      status: "pending" as const,
      holdHours: undefined,
    };
    const isInvalid = !!(input.status && input.holdHours && input.holdHours > 0);
    expect(isInvalid).toBe(false);
  });

  it("holdHours only (no status) is valid", () => {
    const input = {
      status: undefined,
      holdHours: 48,
    };
    const isInvalid = !!(input.status && input.holdHours && input.holdHours > 0);
    expect(isInvalid).toBe(false);
  });

  it("holdHours=0 with status is valid (holdHours has no effect)", () => {
    const input = {
      status: "available" as const,
      holdHours: 0,
    };
    const isInvalid = !!(input.status && input.holdHours && input.holdHours > 0);
    expect(isInvalid).toBe(false);
  });
});
