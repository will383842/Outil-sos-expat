/**
 * Unified Discount Resolver
 *
 * Resolves the discount to apply to a client during payment.
 * Replaces 3 separate lookups (groupAdmin $5, influencer 5%, partner custom)
 * with 1 unified call.
 *
 * All amounts in CENTS (USD).
 */

import { logger } from "firebase-functions/v2";
import { DiscountResult } from "./types";
import { findReferrer } from "./referralResolver";
import { resolvePlanForUser, resolveDiscount } from "./planService";

/**
 * Resolve the affiliate discount for a client during payment.
 *
 * @param clientId - The client making the payment
 * @param originalPrice - Original price in CENTS
 * @param serviceType - Service type (for appliesToServices filtering)
 * @param clientRegisteredAt - When the client registered (for expiration check)
 * @returns DiscountResult with computed discount
 */
export async function resolveAffiliateDiscount(
  clientId: string,
  originalPrice: number,
  serviceType?: string,
  clientRegisteredAt?: Date | null
): Promise<DiscountResult> {
  const noDiscount: DiscountResult = {
    hasDiscount: false,
    discountAmount: 0,
    originalPrice,
    finalPrice: originalPrice,
  };

  if (!clientId || originalPrice <= 0) return noDiscount;

  try {
    // 1. Find who referred this client (loads discountConfig from user doc)
    const referrer = await findReferrer(clientId);
    if (!referrer) return noDiscount;

    // 2. Resolve the referrer's plan
    const plan = await resolvePlanForUser(referrer.role, referrer.commissionPlanId || null);
    if (!plan) return noDiscount;

    // 3. Check appliesToServices filter
    if (
      plan.discount?.enabled &&
      plan.discount.appliesToServices?.length &&
      serviceType &&
      !plan.discount.appliesToServices.includes(serviceType)
    ) {
      return noDiscount;
    }

    // 4. Use discountConfig already loaded by findReferrer (no extra Firestore read)
    const referrerDiscountConfig = referrer.discountConfig || null;

    // 5. Use planService.resolveDiscount (handles priority: individual > plan)
    const result = await resolveDiscount(
      referrer.role,
      originalPrice,
      referrer.commissionPlanId || null,
      referrerDiscountConfig,
      clientRegisteredAt
    );

    return {
      hasDiscount: result.hasDiscount,
      discountAmount: result.discountAmount,
      originalPrice,
      finalPrice: result.finalPrice,
      label: result.label,
      labelTranslations: result.labelTranslations,
      referrerCode: referrer.affiliateCode,
      referrerId: referrer.userId,
      planId: plan.id,
      discountType: result.discountType,
      discountValue: result.discountValue,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`resolveAffiliateDiscount failed for client ${clientId}: ${msg}`);
    return noDiscount;
  }
}
