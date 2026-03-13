/**
 * Tests for discountResolver
 *
 * Tests discount computation logic using planService.computeDiscount directly
 * (no Firestore needed for unit tests).
 */

import { computeDiscount, isDiscountExpired } from "../planService";

// ============================================================================
// DISCOUNT COMPUTATION
// ============================================================================

describe("discountResolver — computeDiscount", () => {
  it("fixed discount: $5 off $50", () => {
    const result = computeDiscount(5000, {
      type: "fixed",
      value: 500,
    });

    expect(result.hasDiscount).toBe(true);
    expect(result.discountAmount).toBe(500);
    expect(result.finalPrice).toBe(4500);
    expect(result.discountType).toBe("fixed");
  });

  it("percentage discount: 5% off $100", () => {
    const result = computeDiscount(10000, {
      type: "percentage",
      value: 5,
    });

    expect(result.hasDiscount).toBe(true);
    expect(result.discountAmount).toBe(500); // 5% of 10000
    expect(result.finalPrice).toBe(9500);
    expect(result.discountType).toBe("percentage");
  });

  it("percentage discount respects maxDiscountCents", () => {
    const result = computeDiscount(50000, {
      type: "percentage",
      value: 20,
      maxDiscountCents: 5000, // cap at $50
    });

    // 20% of $500 = $100, but capped at $50
    expect(result.discountAmount).toBe(5000);
    expect(result.finalPrice).toBe(45000);
  });

  it("discount cannot exceed original price", () => {
    const result = computeDiscount(300, {
      type: "fixed",
      value: 500, // $5 off a $3 item
    });

    expect(result.discountAmount).toBe(300); // capped at original price
    expect(result.finalPrice).toBe(0);
  });

  it("zero discount returns hasDiscount=false", () => {
    const result = computeDiscount(5000, {
      type: "fixed",
      value: 0,
    });

    expect(result.hasDiscount).toBe(false);
    expect(result.discountAmount).toBe(0);
    expect(result.finalPrice).toBe(5000);
  });

  it("label and translations are passed through", () => {
    const result = computeDiscount(5000, {
      type: "fixed",
      value: 500,
      label: "Remise groupe",
      labelTranslations: { fr: "5$ de remise", en: "$5 discount" },
    });

    expect(result.label).toBe("Remise groupe");
    expect(result.labelTranslations?.fr).toBe("5$ de remise");
  });
});

// ============================================================================
// DISCOUNT EXPIRATION
// ============================================================================

describe("discountResolver — isDiscountExpired", () => {
  it("no expiresAfterDays → never expires", () => {
    expect(isDiscountExpired(undefined, new Date("2025-01-01"))).toBe(false);
  });

  it("expiresAfterDays=0 → never expires", () => {
    expect(isDiscountExpired(0, new Date("2025-01-01"))).toBe(false);
  });

  it("no clientRegisteredAt → not expired", () => {
    expect(isDiscountExpired(30, null)).toBe(false);
  });

  it("within window → not expired", () => {
    const registeredAt = new Date();
    registeredAt.setDate(registeredAt.getDate() - 10); // 10 days ago
    expect(isDiscountExpired(30, registeredAt)).toBe(false);
  });

  it("past window → expired", () => {
    const registeredAt = new Date();
    registeredAt.setDate(registeredAt.getDate() - 60); // 60 days ago
    expect(isDiscountExpired(30, registeredAt)).toBe(true);
  });
});
