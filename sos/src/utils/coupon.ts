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
}

/**
 * Validates a coupon code.
 *
 * TODO: Replace with a Firebase callable function.
 * The previous implementation tried to read Firestore directly from the
 * frontend, which is blocked by security rules and always failed.
 */
export const validateCoupon = async (
  _params: CouponValidationParams
): Promise<CouponValidationResult> => {
  console.warn(
    'validateCoupon: coupon validation is not yet implemented via callable. ' +
    'The previous direct-Firestore approach was blocked by security rules.'
  );

  return {
    isValid: false,
    message: 'La validation des codes promo est temporairement indisponible',
    discountAmount: 0,
    discountType: 'fixed',
    discountValue: 0,
  };
};
