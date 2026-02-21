import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

// Types for coupon validation
interface CouponValidationParams {
  readonly code: string;
  readonly userId: string;
  readonly totalAmount: number;
  readonly serviceType: 'lawyer_call' | 'expat_call';
}

interface CouponValidationResult {
  readonly isValid: boolean;
  readonly message: string;
  readonly discountAmount: number;
  readonly discountType: 'fixed' | 'percentage';
  readonly discountValue: number;
  readonly couponId?: string;
  readonly maxDiscount?: number;
}

/**
 * Validates a coupon code via Cloud Function callable.
 * The server validates: code exists, active, dates, service, usage limits.
 */
export const validateCoupon = async (
  params: CouponValidationParams
): Promise<CouponValidationResult> => {
  try {
    const callable = httpsCallable<
      { code: string; serviceType: string; totalAmount: number },
      CouponValidationResult
    >(functions, "validateCouponCallable");

    const result = await callable({
      code: params.code,
      serviceType: params.serviceType,
      totalAmount: params.totalAmount,
    });

    return result.data;
  } catch (error: unknown) {
    console.error("[validateCoupon] Callable failed:", error);

    // Return a user-friendly error instead of throwing
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Erreur lors de la validation du code promo";

    return {
      isValid: false,
      message,
      discountAmount: 0,
      discountType: "fixed",
      discountValue: 0,
    };
  }
};
