export interface AmountSet {
  total: number;
  commission: number; // connectionFeeAmount from admin_config/pricing
  provider: number;
}

/**
 * Validates payment amounts for coherence.
 *
 * Commission amounts (connectionFeeAmount) are now defined in admin_config/pricing
 * as fixed amounts, not percentages. The actual rates vary by service type:
 * - Lawyer: ~39% (19 EUR of 49 EUR total)
 * - Expat: ~47% (9 EUR of 19 EUR total)
 *
 * This validator checks for amount coherence, not percentage compliance.
 */
export const validateAmounts = (amounts: AmountSet): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Coherence check: total must equal commission + provider
  const calculatedTotal = amounts.commission + amounts.provider;
  if (Math.abs(amounts.total - calculatedTotal) > 0.01) {
    errors.push(`Total incohérent: ${amounts.total} ≠ ${calculatedTotal}`);
  }

  // Amount limits
  if (amounts.total < 5) errors.push('Montant minimum: 5 EUR');
  if (amounts.total > 500) errors.push('Montant maximum: 500 EUR');

  // Commission sanity check: must be positive and less than total
  if (amounts.commission < 0) {
    errors.push('Commission ne peut pas être négative');
  }
  if (amounts.commission >= amounts.total) {
    errors.push('Commission ne peut pas être supérieure ou égale au total');
  }

  // Provider amount sanity check
  if (amounts.provider < 0) {
    errors.push('Montant prestataire ne peut pas être négatif');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};