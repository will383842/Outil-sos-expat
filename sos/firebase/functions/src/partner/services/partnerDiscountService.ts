/**
 * Partner Discount Service
 *
 * Calculates and validates discounts offered by partners to their community.
 * Called during payment intent creation to apply the discount to the client's bill.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { Partner } from "../types";

export interface DiscountResult {
  /** Whether a discount applies */
  hasDiscount: boolean;
  /** Discount amount in the same unit as the price (e.g. EUR or USD, NOT cents) */
  discountAmount: number;
  /** Original price before discount */
  originalPrice: number;
  /** Final price after discount */
  finalPrice: number;
  /** Label to display to the client */
  label: string | null;
  /** Partner ID that provides the discount */
  partnerId: string | null;
  /** Partner code for tracking */
  partnerCode: string | null;
}

const NO_DISCOUNT: DiscountResult = {
  hasDiscount: false,
  discountAmount: 0,
  originalPrice: 0,
  finalPrice: 0,
  label: null,
  partnerId: null,
  partnerCode: null,
};

/**
 * Check if a client is eligible for a partner discount and calculate the amount.
 *
 * @param clientUid - The client's Firebase UID
 * @param originalPrice - The original call price (in currency units, e.g. 49 for 49 EUR)
 * @returns DiscountResult with the calculated discount
 */
export async function getPartnerDiscount(
  clientUid: string,
  originalPrice: number
): Promise<DiscountResult> {
  const db = getFirestore();

  try {
    // 1. Check if client was referred by a partner
    const userDoc = await db.collection("users").doc(clientUid).get();
    if (!userDoc.exists) {
      return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
    }

    const userData = userDoc.data();
    const partnerReferredById = userData?.partnerReferredById;

    if (!partnerReferredById) {
      return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
    }

    // 2. Get the partner's discount config
    const partnerDoc = await db.collection("partners").doc(partnerReferredById).get();
    if (!partnerDoc.exists) {
      return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
    }

    const partner = partnerDoc.data() as Partner;
    const discountConfig = partner.discountConfig;

    // 3. Validate discount is active and not expired
    if (!discountConfig || !discountConfig.isActive) {
      return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
    }

    if (partner.status !== "active") {
      return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
    }

    if (discountConfig.expiresAt) {
      const expiresAt = discountConfig.expiresAt as Timestamp;
      if (expiresAt.toMillis() < Date.now()) {
        logger.info("[getPartnerDiscount] Discount expired", {
          partnerId: partner.id,
          expiresAt: expiresAt.toDate().toISOString(),
        });
        return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
      }
    }

    // 4. Calculate discount amount
    // originalPrice is in currency units (e.g. 49 EUR, 55 USD)
    // discountConfig.value is in cents (for fixed) or percentage (for percentage)
    let discountAmount: number;

    if (discountConfig.type === "fixed") {
      // Fixed discount: value is in cents, convert to currency units
      discountAmount = discountConfig.value / 100;
    } else {
      // Percentage discount
      discountAmount = (originalPrice * discountConfig.value) / 100;

      // Apply max cap if set (maxDiscountCents is in cents)
      if (discountConfig.maxDiscountCents && discountConfig.maxDiscountCents > 0) {
        const maxDiscount = discountConfig.maxDiscountCents / 100;
        discountAmount = Math.min(discountAmount, maxDiscount);
      }
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    // Ensure discount doesn't exceed the original price
    discountAmount = Math.min(discountAmount, originalPrice);

    // Ensure discount is positive
    if (discountAmount <= 0) {
      return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
    }

    const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100;

    logger.info("[getPartnerDiscount] Discount applied", {
      clientUid,
      partnerId: partner.id,
      partnerCode: partner.affiliateCode,
      discountType: discountConfig.type,
      discountValue: discountConfig.value,
      originalPrice,
      discountAmount,
      finalPrice,
    });

    return {
      hasDiscount: true,
      discountAmount,
      originalPrice,
      finalPrice,
      label: discountConfig.label || null,
      partnerId: partner.id,
      partnerCode: partner.affiliateCode,
    };
  } catch (error) {
    logger.error("[getPartnerDiscount] Error calculating discount", {
      clientUid,
      error: error instanceof Error ? error.message : String(error),
    });
    // On error, return no discount (fail-safe, don't block the payment)
    return { ...NO_DISCOUNT, originalPrice, finalPrice: originalPrice };
  }
}

/**
 * Get discount info for display purposes (e.g. on partner landing page or client checkout).
 * Does NOT require a client UID — just returns the partner's discount config.
 */
export async function getPartnerDiscountInfo(
  partnerCode: string
): Promise<{
  hasDiscount: boolean;
  type?: "fixed" | "percentage";
  value?: number;
  maxDiscountCents?: number;
  label?: string;
}> {
  const db = getFirestore();

  try {
    const codeDoc = await db.collection("affiliate_codes").doc(partnerCode.toUpperCase()).get();
    if (!codeDoc.exists || codeDoc.data()?.userType !== "partner") {
      return { hasDiscount: false };
    }

    const partnerId = codeDoc.data()!.userId;
    const partnerDoc = await db.collection("partners").doc(partnerId).get();
    if (!partnerDoc.exists) return { hasDiscount: false };

    const partner = partnerDoc.data() as Partner;
    const dc = partner.discountConfig;

    if (!dc || !dc.isActive || partner.status !== "active") {
      return { hasDiscount: false };
    }

    // Check expiry
    if (dc.expiresAt) {
      const expiresAt = dc.expiresAt as Timestamp;
      if (expiresAt.toMillis() < Date.now()) {
        return { hasDiscount: false };
      }
    }

    return {
      hasDiscount: true,
      type: dc.type,
      value: dc.value,
      maxDiscountCents: dc.maxDiscountCents,
      label: dc.label,
    };
  } catch {
    return { hasDiscount: false };
  }
}
