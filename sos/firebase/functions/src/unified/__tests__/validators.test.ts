import { validateCommissionPlan } from "../validators";
import {
  ALL_DEFAULT_PLANS,
  CLIENT_V1,
  CHATTER_V1,
  CAPTAIN_V1,
  INFLUENCER_V1,
  PARTNER_V1,
  GROUPADMIN_V1,
} from "../defaultPlans";

describe("validateCommissionPlan", () => {
  // ─── All 8 default plans must pass ───────────────────────────────
  describe("default plans", () => {
    for (const plan of ALL_DEFAULT_PLANS) {
      it(`${plan.id} passes validation`, () => {
        const result = validateCommissionPlan(plan);
        expect(result).toEqual({ valid: true, errors: [] });
      });
    }
  });

  // ─── Required fields ─────────────────────────────────────────────
  describe("required fields", () => {
    it("rejects empty name", () => {
      const result = validateCommissionPlan({ ...CLIENT_V1, name: "" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name is required");
    });

    it("rejects empty targetRoles", () => {
      const result = validateCommissionPlan({ ...CLIENT_V1, targetRoles: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("targetRoles must contain at least 1 role");
    });
  });

  // ─── Rules validation ────────────────────────────────────────────
  describe("rules", () => {
    it("rejects negative signup_bonus amount", () => {
      const plan = {
        ...CLIENT_V1,
        rules: { ...CLIENT_V1.rules, signup_bonus: { enabled: true, amount: -100 } },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("rules.signup_bonus.amount must be >= 0");
    });

    it("rejects client_call rate out of range", () => {
      const plan = {
        ...PARTNER_V1,
        rules: {
          ...PARTNER_V1.rules,
          client_call: { enabled: true, type: "percentage" as const, rate: 1.5 },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("rules.client_call.rate must be between 0 and 1");
    });

    it("rejects negative client_call fixed amounts", () => {
      const plan = {
        ...CLIENT_V1,
        rules: {
          ...CLIENT_V1.rules,
          client_call: { enabled: true, type: "fixed" as const, amounts: { lawyer: -1, expat: 100 } },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("rules.client_call.amounts.lawyer must be >= 0");
    });

    it("rejects recruitment_call depth > 5", () => {
      const plan = {
        ...CHATTER_V1,
        rules: {
          ...CHATTER_V1.rules,
          recruitment_call: { enabled: true, depth: 6, depthAmounts: [100, 50, 25, 10, 5, 1] },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("rules.recruitment_call.depth must be between 0 and 5");
    });

    it("rejects depthAmounts length mismatch", () => {
      const plan = {
        ...CHATTER_V1,
        rules: {
          ...CHATTER_V1.rules,
          recruitment_call: { enabled: true, depth: 2, depthAmounts: [100] },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/depthAmounts must have exactly 2 entries/);
    });

    it("rejects activation_bonus afterNthCall < 1", () => {
      const plan = {
        ...CHATTER_V1,
        rules: {
          ...CHATTER_V1.rules,
          activation_bonus: { enabled: true, amount: 500, afterNthCall: 0 },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("rules.activation_bonus.afterNthCall must be >= 1");
    });

    it("rejects provider_recruitment windowMonths out of range", () => {
      const plan = {
        ...CHATTER_V1,
        rules: {
          ...CHATTER_V1.rules,
          provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 30 },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("rules.provider_recruitment.windowMonths must be between 1 and 24");
    });

    it("rejects unsorted milestones", () => {
      const plan = {
        ...CHATTER_V1,
        rules: {
          ...CHATTER_V1.rules,
          referral_milestones: {
            enabled: true,
            qualificationThreshold: 2000,
            milestones: [
              { minQualifiedReferrals: 10, bonusAmount: 3500 },
              { minQualifiedReferrals: 5, bonusAmount: 1500 },
            ],
          },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "rules.referral_milestones.milestones must be sorted by minQualifiedReferrals ascending"
      );
    });

    it("rejects unsorted captain tiers", () => {
      const plan = {
        ...CAPTAIN_V1,
        rules: {
          ...CAPTAIN_V1.rules,
          captain_bonus: {
            ...CAPTAIN_V1.rules.captain_bonus,
            tiers: [
              { name: "Or", minTeamCalls: 200, bonusAmount: 10000 },
              { name: "Bronze", minTeamCalls: 50, bonusAmount: 2500 },
            ],
          },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("rules.captain_bonus.tiers must be sorted by minTeamCalls ascending");
    });
  });

  // ─── Bonuses validation ──────────────────────────────────────────
  describe("bonuses", () => {
    it("rejects top3 cash with wrong length", () => {
      const plan = {
        ...CHATTER_V1,
        bonuses: {
          ...CHATTER_V1.bonuses,
          top3: { enabled: true, type: "cash" as const, cashAmounts: [20000, 10000] },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("bonuses.top3.cashAmounts must have exactly 3 values");
    });

    it("rejects multiplier < 1", () => {
      const plan = {
        ...INFLUENCER_V1,
        bonuses: {
          ...INFLUENCER_V1.bonuses,
          top3: { enabled: true, type: "multiplier" as const, multipliers: [2.0, 0.5, 1.15] },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/multipliers\[1\] must be >= 1/);
    });

    it("rejects negative telegram bonus amount", () => {
      const plan = {
        ...CHATTER_V1,
        bonuses: {
          ...CHATTER_V1.bonuses,
          telegramBonus: { enabled: true, amount: -1, unlockThreshold: 15000 },
        },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("bonuses.telegramBonus.amount must be >= 0");
    });
  });

  // ─── Discount validation ─────────────────────────────────────────
  describe("discount", () => {
    it("rejects percentage > 100", () => {
      const plan = {
        ...INFLUENCER_V1,
        discount: { enabled: true, type: "percentage" as const, value: 150 },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("discount.value must be between 0 and 100 for percentage type");
    });

    it("rejects negative fixed discount", () => {
      const plan = {
        ...GROUPADMIN_V1,
        discount: { enabled: true, type: "fixed" as const, value: -500 },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("discount.value must be >= 0 for fixed type");
    });
  });

  // ─── Withdrawal validation ───────────────────────────────────────
  describe("withdrawal", () => {
    it("rejects holdPeriodHours > 720", () => {
      const plan = {
        ...CLIENT_V1,
        withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 800 },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("withdrawal.holdPeriodHours must be between 0 and 720");
    });

    it("rejects negative fee", () => {
      const plan = {
        ...CLIENT_V1,
        withdrawal: { minimumAmount: 3000, fee: -100, holdPeriodHours: 24 },
      };
      const result = validateCommissionPlan(plan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("withdrawal.fee must be >= 0");
    });
  });

  // ─── Version ─────────────────────────────────────────────────────
  it("rejects negative version", () => {
    const result = validateCommissionPlan({ ...CLIENT_V1, version: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("version must be >= 0");
  });

  // ─── Partial plan (no rules/bonuses) passes ──────────────────────
  it("accepts minimal valid plan", () => {
    const result = validateCommissionPlan({ name: "Test", targetRoles: ["client"] });
    expect(result).toEqual({ valid: true, errors: [] });
  });
});
