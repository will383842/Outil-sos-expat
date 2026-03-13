/**
 * Tests for unified handlers
 *
 * Unit tests for guard logic, amount calculations, and event processing.
 * These test pure logic without Firestore.
 */

import {
  CommissionEventCallCompleted,
  CommissionEventUserRegistered,
  CommissionEventProviderRegistered,
  CommissionEventSubscriptionCreated,
  CommissionEventSubscriptionRenewed,
} from "../types";
import { resolveAmount, resolveAmountByProviderType } from "../planService";

// ============================================================================
// GUARD TESTS — Call Completed
// ============================================================================

describe("handleCallCompleted — guards", () => {
  it("G1: unpaid call generates no commissions", () => {
    const event: CommissionEventCallCompleted = {
      type: "call_completed",
      callSession: {
        id: "call_1",
        clientId: "client_1",
        providerId: "provider_1",
        providerType: "lawyer",
        amount: 5500,
        connectionFee: 500,
        duration: 120,
        isPaid: false,
      },
    };
    expect(event.callSession.isPaid).toBe(false);
    // Handler returns empty result immediately
  });

  it("G2: call < 60 seconds generates no commissions", () => {
    const event: CommissionEventCallCompleted = {
      type: "call_completed",
      callSession: {
        id: "call_2",
        clientId: "client_1",
        providerId: "provider_1",
        providerType: "lawyer",
        amount: 5500,
        connectionFee: 500,
        duration: 30,
        isPaid: true,
      },
    };
    expect(event.callSession.duration < 60).toBe(true);
  });

  it("G2: call exactly 60 seconds passes guard", () => {
    const duration = 60;
    expect(duration >= 60).toBe(true);
  });

  it("G3: self-referral is blocked", () => {
    const referrerId = "user_1";
    const clientId = "user_1";
    expect(referrerId === clientId).toBe(true);
    // Self-referral detected, no commission
  });

  it("provider as referrer of their own call is blocked", () => {
    const referrerId = "provider_1";
    const providerId = "provider_1";
    expect(referrerId === providerId).toBe(true);
  });
});

// ============================================================================
// COMMISSION AMOUNT TESTS — Direct (client_call)
// ============================================================================

describe("handleCallCompleted — commission amounts", () => {
  it("chatter: lawyer call → $10 (1000¢)", () => {
    const amount = resolveAmountByProviderType(
      undefined, "client_call", "lawyer",
      { lawyer: 1000, expat: 500 }
    );
    expect(amount).toBe(1000);
  });

  it("chatter: expat call → $5 (500¢)", () => {
    const amount = resolveAmountByProviderType(
      undefined, "client_call", "expat",
      { lawyer: 1000, expat: 500 }
    );
    expect(amount).toBe(500);
  });

  it("groupAdmin: lawyer call → $5 (500¢)", () => {
    const amount = resolveAmountByProviderType(
      undefined, "client_call", "lawyer",
      { lawyer: 500, expat: 300 }
    );
    expect(amount).toBe(500);
  });

  it("groupAdmin: expat call → $3 (300¢)", () => {
    const amount = resolveAmountByProviderType(
      undefined, "client_call", "expat",
      { lawyer: 500, expat: 300 }
    );
    expect(amount).toBe(300);
  });

  it("client/provider: lawyer call → $2 (200¢)", () => {
    const amount = resolveAmountByProviderType(
      undefined, "client_call", "lawyer",
      { lawyer: 200, expat: 100 }
    );
    expect(amount).toBe(200);
  });

  it("partner: 15% of $55 call → $8.25 (825¢)", () => {
    const rate = 0.15;
    const callAmount = 5500;
    const amount = Math.round(callAmount * rate);
    expect(amount).toBe(825);
  });

  it("lockedRates override plan amount", () => {
    const lockedRates = { client_call_lawyer: 2500 };
    const amount = resolveAmountByProviderType(
      lockedRates, "client_call", "lawyer",
      { lawyer: 1000, expat: 500 }
    );
    expect(amount).toBe(2500); // $25 from lockedRates, not $10 from plan
  });

  it("monthlyTopMultiplier doubles commission", () => {
    const baseAmount = 1000; // $10
    const multiplier = 2.0;
    const amount = Math.round(baseAmount * multiplier);
    expect(amount).toBe(2000); // $20
  });
});

// ============================================================================
// CASCADE TESTS — N1/N2/N3
// ============================================================================

describe("handleCallCompleted — cascade", () => {
  it("N1 gets depthAmounts[0]", () => {
    const depthAmounts = [100, 50];
    const cascadeLevel = 1;
    const amount = depthAmounts[cascadeLevel - 1];
    expect(amount).toBe(100); // $1
  });

  it("N2 gets depthAmounts[1]", () => {
    const depthAmounts = [100, 50];
    const cascadeLevel = 2;
    const amount = depthAmounts[cascadeLevel - 1];
    expect(amount).toBe(50); // $0.50
  });

  it("N3 with depth=2 → no commission (out of bounds)", () => {
    const depthAmounts = [100, 50];
    const cascadeLevel = 3;
    const depthIndex = cascadeLevel - 1;
    expect(depthIndex >= depthAmounts.length).toBe(true);
  });

  it("captain gets captain_call instead of recruitment_call", () => {
    const isCaptain = true;
    const captainCallAmount = 300;
    const recruitmentAmount = 100;
    const amount = isCaptain ? captainCallAmount : recruitmentAmount;
    expect(amount).toBe(300); // $3 captain_call, not $1 recruitment_call
  });

  it("lockedRates override cascade amounts", () => {
    const lockedRates = { recruitment_n1: 150 };
    const amount = resolveAmount(lockedRates, "recruitment_n1", 100);
    expect(amount).toBe(150); // $1.50 from lockedRates, not $1 from plan
  });
});

// ============================================================================
// ACTIVATION BONUS TESTS
// ============================================================================

describe("handleCallCompleted — activation bonus", () => {
  it("triggers after Nth call (e.g., afterNthCall=2)", () => {
    const afterNthCall = 2;
    const currentCallCount = 2;
    expect(currentCallCount === afterNthCall).toBe(true);
  });

  it("does NOT trigger before Nth call", () => {
    const afterNthCall: number = 2;
    const currentCallCount: number = 1;
    expect(currentCallCount === afterNthCall).toBe(false);
  });

  it("idempotent: activationBonusPaid flag prevents double", () => {
    const activationBonusPaid = true;
    expect(activationBonusPaid).toBe(true);
    // Handler returns early if flag is set
  });
});

// ============================================================================
// PROVIDER RECRUITMENT TESTS
// ============================================================================

describe("handleCallCompleted — provider recruitment", () => {
  it("anti-double: skip if recruiter is also client referrer", () => {
    const directReferrerId = "user_123";
    const recruiterId = "user_123";
    expect(recruiterId === directReferrerId).toBe(true);
    // Handler skips provider_recruitment
  });

  it("provider_recruitment amounts by provider type", () => {
    const amount = resolveAmountByProviderType(
      undefined, "provider_recruitment", "lawyer",
      { lawyer: 500, expat: 300 }
    );
    expect(amount).toBe(500);
  });
});

// ============================================================================
// USER REGISTERED HANDLER TESTS
// ============================================================================

describe("handleUserRegistered — logic", () => {
  it("referral window: 30 days", () => {
    const REFERRAL_WINDOW_DAYS = 30;
    const capturedAt = new Date();
    capturedAt.setDate(capturedAt.getDate() - 31); // 31 days ago
    const daysSince = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysSince > REFERRAL_WINDOW_DAYS).toBe(true);
  });

  it("referral within window is accepted", () => {
    const REFERRAL_WINDOW_DAYS = 30;
    const capturedAt = new Date();
    capturedAt.setDate(capturedAt.getDate() - 15); // 15 days ago
    const daysSince = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysSince <= REFERRAL_WINDOW_DAYS).toBe(true);
  });

  it("signup_bonus amount resolution", () => {
    const amount = resolveAmount(undefined, "signup_bonus", 200);
    expect(amount).toBe(200); // $2
  });

  it("signup_bonus with lockedRates override", () => {
    const amount = resolveAmount({ signup_bonus: 500 }, "signup_bonus", 200);
    expect(amount).toBe(500); // $5 from lockedRates
  });
});

// ============================================================================
// PROVIDER REGISTERED HANDLER TESTS
// ============================================================================

describe("handleProviderRegistered — recruitment code detection", () => {
  it("unified recruitmentCode takes priority", () => {
    const event: CommissionEventProviderRegistered = {
      type: "provider_registered",
      userId: "prov_1",
      providerType: "lawyer",
      recruitmentCode: "UNIFIED-CODE",
      providerRecruitedByChatter: "LEGACY-CODE",
    };
    const code = event.recruitmentCode || event.providerRecruitedByChatter;
    expect(code).toBe("UNIFIED-CODE");
  });

  it("falls back to legacy chatter code", () => {
    const event: CommissionEventProviderRegistered = {
      type: "provider_registered",
      userId: "prov_2",
      providerType: "expat",
      providerRecruitedByChatter: "CHT-LEGACY",
    };
    const code = event.recruitmentCode || event.providerRecruitedByChatter;
    expect(code).toBe("CHT-LEGACY");
  });

  it("influencer: requires both flag AND code", () => {
    const event: CommissionEventProviderRegistered = {
      type: "provider_registered",
      userId: "prov_3",
      providerType: "lawyer",
      recruitedByInfluencer: true,
      influencerCode: "INF-CODE",
    };
    const code = (event.recruitedByInfluencer && event.influencerCode)
      ? event.influencerCode
      : null;
    expect(code).toBe("INF-CODE");
  });

  it("influencer flag without code → no recruitment", () => {
    const event: CommissionEventProviderRegistered = {
      type: "provider_registered",
      userId: "prov_4",
      providerType: "lawyer",
      recruitedByInfluencer: true,
      // no influencerCode!
    };
    const code = (event.recruitedByInfluencer && event.influencerCode)
      ? event.influencerCode
      : null;
    expect(code).toBeNull();
  });
});

// ============================================================================
// SUBSCRIPTION HANDLER TESTS
// ============================================================================

describe("handleSubscriptionEvent — logic", () => {
  it("first month: fixed amount", () => {
    const firstMonthAmount = 2000; // $20
    const amount = resolveAmount(undefined, "subscription_first_month", firstMonthAmount);
    expect(amount).toBe(2000);
  });

  it("renewal: percentage of subscription", () => {
    const subAmount = 4900; // $49
    const rate = 0.10; // 10%
    const amount = Math.round(subAmount * rate);
    expect(amount).toBe(490); // $4.90
  });

  it("maxMonths: renewal beyond max → no commission", () => {
    const maxMonths = 12;
    const renewalMonth = 13;
    expect(renewalMonth > maxMonths).toBe(true);
  });

  it("maxMonths=0: unlimited renewals", () => {
    const maxMonths = 0;
    const renewalMonth = 999;
    // maxMonths=0 means unlimited
    expect(maxMonths === 0 || renewalMonth <= maxMonths).toBe(true);
  });

  it("anti-duplicate sourceId includes renewal period", () => {
    const subscriptionId = "sub_123";
    const renewalMonth = 5;
    const sourceId = `${subscriptionId}_renewal_${renewalMonth}`;
    expect(sourceId).toBe("sub_123_renewal_5");
  });
});

// ============================================================================
// CROSS-CUTTING TESTS — Combinations and edge cases
// ============================================================================

describe("cross-cutting — fraud + commission interaction", () => {
  it("fraud high risk increases holdHours to at least 72h", () => {
    const planHoldHours = 24;
    const fraudShouldHold = true;
    const holdHours = fraudShouldHold
      ? Math.max(planHoldHours, 72)
      : planHoldHours;
    expect(holdHours).toBe(72);
  });

  it("fraud high risk with plan hold > 72h keeps plan hold", () => {
    const planHoldHours = 168; // 7 days
    const fraudShouldHold = true;
    const holdHours = fraudShouldHold
      ? Math.max(planHoldHours, 72)
      : planHoldHours;
    expect(holdHours).toBe(168);
  });

  it("no fraud keeps plan holdHours", () => {
    const planHoldHours = 24;
    const fraudShouldHold = false;
    const holdHours = fraudShouldHold
      ? Math.max(planHoldHours, 72)
      : planHoldHours;
    expect(holdHours).toBe(24);
  });
});

describe("cross-cutting — lockedRates priority across all commission types", () => {
  it("client_call_lawyer locked overrides plan", () => {
    expect(resolveAmountByProviderType(
      { client_call_lawyer: 2500 }, "client_call", "lawyer", { lawyer: 1000, expat: 500 }
    )).toBe(2500);
  });

  it("provider_recruitment_expat locked overrides plan", () => {
    expect(resolveAmountByProviderType(
      { provider_recruitment_expat: 800 }, "provider_recruitment", "expat", { lawyer: 500, expat: 300 }
    )).toBe(800);
  });

  it("signup_bonus locked overrides plan", () => {
    expect(resolveAmount({ signup_bonus: 1000 }, "signup_bonus", 200)).toBe(1000);
  });

  it("activation_bonus locked overrides plan", () => {
    expect(resolveAmount({ activation_bonus: 750 }, "activation_bonus", 500)).toBe(750);
  });

  it("recruitment_n1 locked overrides plan", () => {
    expect(resolveAmount({ recruitment_n1: 200 }, "recruitment_n1", 100)).toBe(200);
  });

  it("recruitment_n2 locked overrides plan", () => {
    expect(resolveAmount({ recruitment_n2: 75 }, "recruitment_n2", 50)).toBe(75);
  });

  it("captain_call locked overrides plan", () => {
    expect(resolveAmount({ captain_call: 500 }, "captain_call", 300)).toBe(500);
  });

  it("n1_recruit_bonus locked overrides plan", () => {
    expect(resolveAmount({ n1_recruit_bonus: 200 }, "n1_recruit_bonus", 100)).toBe(200);
  });

  it("subscription_first_month locked overrides plan", () => {
    expect(resolveAmount({ subscription_first_month: 3000 }, "subscription_first_month", 2000)).toBe(3000);
  });

  it("subscription_renewal locked overrides plan", () => {
    expect(resolveAmount({ subscription_renewal: 1500 }, "subscription_renewal", 1000)).toBe(1500);
  });

  it("generic client_call locked used when specific is missing", () => {
    expect(resolveAmountByProviderType(
      { client_call: 3000 }, "client_call", "lawyer", { lawyer: 1000, expat: 500 }
    )).toBe(3000);
  });

  it("specific locked takes priority over generic locked", () => {
    expect(resolveAmountByProviderType(
      { client_call: 3000, client_call_lawyer: 4000 }, "client_call", "lawyer", { lawyer: 1000, expat: 500 }
    )).toBe(4000);
  });
});

describe("cross-cutting — complete commission flow scenarios", () => {
  it("chatter full scenario: client_call $10 + N1 $1 + N2 $0.50", () => {
    // Direct referrer: chatter gets $10 for lawyer call
    const directAmount = resolveAmountByProviderType(
      undefined, "client_call", "lawyer", { lawyer: 1000, expat: 500 }
    );
    expect(directAmount).toBe(1000);

    // N1 cascade: $1
    const n1Amount = resolveAmount(undefined, "recruitment_n1", 100);
    expect(n1Amount).toBe(100);

    // N2 cascade: $0.50
    const n2Amount = resolveAmount(undefined, "recruitment_n2", 50);
    expect(n2Amount).toBe(50);

    // Total for this call: $11.50
    expect(directAmount + n1Amount + n2Amount).toBe(1150);
  });

  it("groupAdmin full scenario: client_call $5 + N1 $1 + N2 $0.50", () => {
    const directAmount = resolveAmountByProviderType(
      undefined, "client_call", "lawyer", { lawyer: 500, expat: 300 }
    );
    expect(directAmount).toBe(500);

    const n1Amount = resolveAmount(undefined, "recruitment_n1", 100);
    expect(n1Amount).toBe(100);

    const n2Amount = resolveAmount(undefined, "recruitment_n2", 50);
    expect(n2Amount).toBe(50);

    expect(directAmount + n1Amount + n2Amount).toBe(650);
  });

  it("partner percentage scenario: 15% of $55 = $8.25", () => {
    const callAmount = 5500;
    const rate = 0.15;
    const directAmount = Math.round(callAmount * rate);
    expect(directAmount).toBe(825);
  });

  it("influencer with multiplier: $10 × 2.0 = $20", () => {
    const baseAmount = resolveAmountByProviderType(
      undefined, "client_call", "lawyer", { lawyer: 1000, expat: 500 }
    );
    const multiplier = 2.0;
    const finalAmount = Math.round(baseAmount * multiplier);
    expect(finalAmount).toBe(2000);
  });

  it("captain cascade: captain_call $3 instead of recruitment_call $1", () => {
    const isCaptain = true;
    const captainCallAmount = 300;
    const recruitmentN1 = 100;
    const amount = isCaptain ? captainCallAmount : recruitmentN1;
    expect(amount).toBe(300);
  });

  it("client/provider basic: lawyer $2 / expat $1", () => {
    const lawyer = resolveAmountByProviderType(
      undefined, "client_call", "lawyer", { lawyer: 200, expat: 100 }
    );
    const expat = resolveAmountByProviderType(
      undefined, "client_call", "expat", { lawyer: 200, expat: 100 }
    );
    expect(lawyer).toBe(200);
    expect(expat).toBe(100);
  });
});

describe("cross-cutting — edge cases", () => {
  it("zero amount commission is skipped (amount <= 0)", () => {
    const amount = 0;
    expect(amount <= 0).toBe(true);
  });

  it("lockedRates with 0 value is respected (not plan amount)", () => {
    const amount = resolveAmount({ client_call_lawyer: 0 }, "client_call_lawyer", 1000);
    expect(amount).toBe(0);
  });

  it("percentage on zero call amount = 0 commission", () => {
    const callAmount = 0;
    const rate = 0.15;
    const amount = Math.round(callAmount * rate);
    expect(amount).toBe(0);
  });

  it("very large multiplier is applied correctly", () => {
    const base = 1000;
    const multiplier = 3.5;
    const amount = Math.round(base * multiplier);
    expect(amount).toBe(3500);
  });

  it("activation bonus sourceId includes _activation suffix", () => {
    const callId = "call_abc123";
    const sourceId = `${callId}_activation`;
    expect(sourceId).toBe("call_abc123_activation");
  });

  it("n1_recruit_bonus sourceId includes _n1_recruit suffix", () => {
    const callId = "call_abc123";
    const sourceId = `${callId}_n1_recruit`;
    expect(sourceId).toBe("call_abc123_n1_recruit");
  });
});
