import {
  resolveAmount,
  resolveAmountByProviderType,
  clearUnifiedPlanCache,
  computeDiscount,
  isDiscountExpired,
} from "../planService";

describe("planService", () => {
  beforeEach(() => {
    clearUnifiedPlanCache();
  });

  // ─── resolveAmount ───────────────────────────────────────────────
  describe("resolveAmount", () => {
    it("returns plan amount when no lockedRates", () => {
      expect(resolveAmount(undefined, "signup_bonus", 200)).toBe(200);
      expect(resolveAmount(null, "signup_bonus", 200)).toBe(200);
    });

    it("returns plan amount when key not in lockedRates", () => {
      const locked = { other_key: 500 };
      expect(resolveAmount(locked, "signup_bonus", 200)).toBe(200);
    });

    it("returns locked rate when key exists (priority over plan)", () => {
      const locked = { signup_bonus: 999 };
      expect(resolveAmount(locked, "signup_bonus", 200)).toBe(999);
    });

    it("returns locked rate even if 0 (explicitly set)", () => {
      const locked = { signup_bonus: 0 };
      expect(resolveAmount(locked, "signup_bonus", 200)).toBe(0);
    });
  });

  // ─── resolveAmountByProviderType ─────────────────────────────────
  describe("resolveAmountByProviderType", () => {
    const planAmounts = { lawyer: 1000, expat: 500 };

    it("returns plan lawyer amount when no lockedRates", () => {
      expect(resolveAmountByProviderType(null, "client_call", "lawyer", planAmounts)).toBe(1000);
    });

    it("returns plan expat amount when no lockedRates", () => {
      expect(resolveAmountByProviderType(null, "client_call", "expat", planAmounts)).toBe(500);
    });

    it("uses specific locked rate (client_call_lawyer)", () => {
      const locked = { client_call_lawyer: 1500, client_call_expat: 800 };
      expect(resolveAmountByProviderType(locked, "client_call", "lawyer", planAmounts)).toBe(1500);
      expect(resolveAmountByProviderType(locked, "client_call", "expat", planAmounts)).toBe(800);
    });

    it("falls back to generic locked rate (client_call)", () => {
      const locked = { client_call: 777 };
      expect(resolveAmountByProviderType(locked, "client_call", "lawyer", planAmounts)).toBe(777);
      expect(resolveAmountByProviderType(locked, "client_call", "expat", planAmounts)).toBe(777);
    });

    it("prefers specific over generic locked rate", () => {
      const locked = { client_call: 777, client_call_lawyer: 1500 };
      expect(resolveAmountByProviderType(locked, "client_call", "lawyer", planAmounts)).toBe(1500);
      expect(resolveAmountByProviderType(locked, "client_call", "expat", planAmounts)).toBe(777);
    });
  });

  // ─── computeDiscount ─────────────────────────────────────────────
  describe("computeDiscount", () => {
    it("computes fixed discount correctly", () => {
      const result = computeDiscount(10000, { type: "fixed", value: 500 });
      expect(result.hasDiscount).toBe(true);
      expect(result.discountAmount).toBe(500);
      expect(result.finalPrice).toBe(9500);
      expect(result.discountType).toBe("fixed");
    });

    it("computes percentage discount correctly", () => {
      const result = computeDiscount(10000, { type: "percentage", value: 5 });
      expect(result.hasDiscount).toBe(true);
      expect(result.discountAmount).toBe(500); // 5% of 10000
      expect(result.finalPrice).toBe(9500);
    });

    it("caps discount at maxDiscountCents", () => {
      const result = computeDiscount(100000, { type: "percentage", value: 50, maxDiscountCents: 5000 });
      expect(result.discountAmount).toBe(5000); // capped, not 50000
      expect(result.finalPrice).toBe(95000);
    });

    it("never exceeds original price", () => {
      const result = computeDiscount(300, { type: "fixed", value: 500 });
      expect(result.discountAmount).toBe(300);
      expect(result.finalPrice).toBe(0);
    });

    it("returns hasDiscount=false when discount is 0", () => {
      const result = computeDiscount(10000, { type: "fixed", value: 0 });
      expect(result.hasDiscount).toBe(false);
      expect(result.discountAmount).toBe(0);
    });

    it("includes label and translations", () => {
      const result = computeDiscount(10000, {
        type: "fixed",
        value: 500,
        label: "Remise",
        labelTranslations: { fr: "5$ de remise" },
      });
      expect(result.label).toBe("Remise");
      expect(result.labelTranslations).toEqual({ fr: "5$ de remise" });
    });

    it("rounds percentage discount to nearest cent", () => {
      // 7% of 999 = 69.93 → should round to 70
      const result = computeDiscount(999, { type: "percentage", value: 7 });
      expect(result.discountAmount).toBe(70);
      expect(result.finalPrice).toBe(929);
    });
  });

  // ─── isDiscountExpired ────────────────────────────────────────────
  describe("isDiscountExpired", () => {
    it("returns false when no expiresAfterDays", () => {
      expect(isDiscountExpired(undefined, new Date())).toBe(false);
      expect(isDiscountExpired(0, new Date())).toBe(false);
    });

    it("returns false when no clientRegisteredAt", () => {
      expect(isDiscountExpired(30, null)).toBe(false);
      expect(isDiscountExpired(30, undefined)).toBe(false);
    });

    it("returns false when discount has not expired", () => {
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      expect(isDiscountExpired(30, recentDate)).toBe(false);
    });

    it("returns true when discount has expired", () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      expect(isDiscountExpired(30, oldDate)).toBe(true);
    });

    it("returns false for negative expiresAfterDays", () => {
      expect(isDiscountExpired(-1, new Date())).toBe(false);
    });
  });
});
