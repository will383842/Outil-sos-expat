/**
 * resolveAffiliateDiscountCallable — Phase 7.4
 *
 * Exposes the unified discount resolver to the frontend.
 * Replaces 3 separate Firestore reads (groupAdmin, influencer, partner)
 * with 1 callable that returns the discount preview for checkout display.
 *
 * NOTE: The actual discount is still applied server-side in createPaymentIntent.
 * This callable is for display purposes only (checkout preview).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { resolveAffiliateDiscount } from "../discountResolver";

interface ResolveDiscountInput {
  clientId: string;
  originalPrice: number; // in cents (e.g. 5500 = $55.00)
  serviceType?: string;  // e.g. "lawyer_call", "expat_call"
}

interface ResolveDiscountOutput {
  hasDiscount: boolean;
  discountAmount: number;    // in cents
  originalPrice: number;     // in cents
  finalPrice: number;        // in cents
  label?: string;
  labelTranslations?: Record<string, string>;
  referrerCode?: string;
  discountType?: "fixed" | "percentage";
  discountValue?: number;    // cents (fixed) or percentage
}

export const resolveAffiliateDiscountCallable = onCall<
  ResolveDiscountInput,
  Promise<ResolveDiscountOutput>
>(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
  },
  async (request) => {
    // Auth required
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { clientId, originalPrice, serviceType } = request.data;

    if (!clientId || typeof originalPrice !== "number" || originalPrice <= 0) {
      throw new HttpsError("invalid-argument", "clientId and positive originalPrice required");
    }

    // Security: only allow users to query their own discount
    if (request.auth.uid !== clientId) {
      // Allow admin override
      const isAdmin = request.auth.token?.admin === true || request.auth.token?.role === "admin";
      if (!isAdmin) {
        throw new HttpsError("permission-denied", "You can only query your own discount");
      }
    }

    const result = await resolveAffiliateDiscount(
      clientId,
      originalPrice,
      serviceType
    );

    return {
      hasDiscount: result.hasDiscount,
      discountAmount: result.discountAmount,
      originalPrice: result.originalPrice,
      finalPrice: result.finalPrice,
      label: result.label,
      labelTranslations: result.labelTranslations,
      referrerCode: result.referrerCode,
      discountType: result.discountType,
      discountValue: result.discountValue,
    };
  }
);
