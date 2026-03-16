/**
 * Commission Calculator
 *
 * Calculates affiliate commissions based on:
 * - Commission rules (fixed, percentage, hybrid)
 * - User's captured rates (frozen at signup)
 * - Action-specific parameters
 */

import { logger } from "firebase-functions/v2";
import {
  CommissionType,
  CommissionRule,
  CapturedRates,
  CommissionActionType,
} from "../types";

/**
 * Commission calculation result
 */
export interface CommissionCalculationResult {
  /** Final commission amount (cents) */
  amount: number;

  /** Calculation type used */
  calculationType: CommissionType;

  /** Base amount used for percentage calculation */
  baseAmount: number | null;

  /** Rate applied */
  rateApplied: number | null;

  /** Fixed amount component */
  fixedAmount: number | null;

  /** Human-readable explanation */
  calculationDetails: string;

  /** Whether the calculation was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Calculate commission based on rule and base amount
 */
export function calculateCommission(
  rule: CommissionRule,
  baseAmountCents: number,
  capturedRates?: CapturedRates,
  actionType?: CommissionActionType,
  providerType?: 'lawyer' | 'expat',
  lockedRates?: Record<string, number> | null,
  individualRates?: Record<string, number> | null
): CommissionCalculationResult {
  if (!rule.enabled) {
    return {
      amount: 0,
      calculationType: rule.type,
      baseAmount: null,
      rateApplied: null,
      fixedAmount: null,
      calculationDetails: "Rule is disabled",
      success: false,
      error: "Commission rule is disabled",
    };
  }

  // PRIORITY 1: Individual admin overrides (highest priority)
  if (individualRates && providerType && actionType) {
    const individualAmount = getIndividualOrLockedAmount(individualRates, actionType, providerType);
    if (individualAmount != null) {
      return {
        success: true,
        amount: individualAmount,
        calculationType: 'fixed',
        baseAmount: baseAmountCents,
        fixedAmount: individualAmount,
        rateApplied: null,
        calculationDetails: `Taux individuel admin: ${formatCents(individualAmount)}`,
      };
    }
  }

  // PRIORITY 2: Locked rates from commission plan at registration (lifetime lock)
  if (lockedRates && providerType && actionType) {
    const lockedAmount = getIndividualOrLockedAmount(lockedRates, actionType, providerType);
    if (lockedAmount != null) {
      return {
        success: true,
        amount: lockedAmount,
        calculationType: 'fixed',
        baseAmount: baseAmountCents,
        fixedAmount: lockedAmount,
        rateApplied: null,
        calculationDetails: `Taux plan verrouillé: ${formatCents(lockedAmount)}`,
      };
    }
  }

  // PRIORITY 3: Rule-level provider type split (global config)
  if (providerType === 'lawyer' && rule.fixedAmountLawyer != null) {
    return {
      success: true,
      amount: rule.fixedAmountLawyer,
      calculationType: 'fixed',
      baseAmount: baseAmountCents,
      fixedAmount: rule.fixedAmountLawyer,
      rateApplied: null,
      calculationDetails: `Montant fixe avocat: ${formatCents(rule.fixedAmountLawyer)}`,
    };
  }
  if (providerType === 'expat' && rule.fixedAmountExpat != null) {
    return {
      success: true,
      amount: rule.fixedAmountExpat,
      calculationType: 'fixed',
      baseAmount: baseAmountCents,
      fixedAmount: rule.fixedAmountExpat,
      rateApplied: null,
      calculationDetails: `Montant fixe expatrié: ${formatCents(rule.fixedAmountExpat)}`,
    };
  }

  try {
    let amount = 0;
    let calculationDetails = "";

    // PRIORITY 4: capturedRates (legacy) > rule defaults
    const effectiveRate = getEffectiveRate(rule, capturedRates, actionType);

    switch (rule.type) {
      case "fixed":
        amount = effectiveRate.fixedAmount;
        calculationDetails = `Montant fixe: ${formatCents(amount)}`;
        return {
          amount,
          calculationType: "fixed",
          baseAmount: null,
          rateApplied: null,
          fixedAmount: amount,
          calculationDetails,
          success: true,
        };

      case "percentage":
        if (baseAmountCents <= 0) {
          return {
            amount: 0,
            calculationType: "percentage",
            baseAmount: baseAmountCents,
            rateApplied: effectiveRate.percentageRate,
            fixedAmount: null,
            calculationDetails: "Base amount is zero or negative",
            success: false,
            error: "Cannot calculate percentage of zero or negative amount",
          };
        }

        amount = Math.round(baseAmountCents * effectiveRate.percentageRate);
        calculationDetails = `${(effectiveRate.percentageRate * 100).toFixed(0)}% de ${formatCents(baseAmountCents)} = ${formatCents(amount)}`;
        return {
          amount,
          calculationType: "percentage",
          baseAmount: baseAmountCents,
          rateApplied: effectiveRate.percentageRate,
          fixedAmount: null,
          calculationDetails,
          success: true,
        };

      case "hybrid":
        const percentageAmount =
          baseAmountCents > 0
            ? Math.round(baseAmountCents * effectiveRate.percentageRate)
            : 0;
        amount = effectiveRate.fixedAmount + percentageAmount;
        calculationDetails = `${formatCents(effectiveRate.fixedAmount)} + ${(effectiveRate.percentageRate * 100).toFixed(0)}% de ${formatCents(baseAmountCents)} = ${formatCents(amount)}`;
        return {
          amount,
          calculationType: "hybrid",
          baseAmount: baseAmountCents,
          rateApplied: effectiveRate.percentageRate,
          fixedAmount: effectiveRate.fixedAmount,
          calculationDetails,
          success: true,
        };

      default:
        return {
          amount: 0,
          calculationType: rule.type,
          baseAmount: null,
          rateApplied: null,
          fixedAmount: null,
          calculationDetails: `Unknown commission type: ${rule.type}`,
          success: false,
          error: `Unknown commission type: ${rule.type}`,
        };
    }
  } catch (error) {
    logger.error("[CommissionCalculator] Calculation error", { error, rule });
    return {
      amount: 0,
      calculationType: rule.type,
      baseAmount: baseAmountCents,
      rateApplied: null,
      fixedAmount: null,
      calculationDetails: "Calculation error",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get effective rate: capturedRates (legacy) > rule defaults
 * Note: individualRates and lockedRates are handled earlier in calculateCommission()
 */
function getEffectiveRate(
  rule: CommissionRule,
  capturedRates?: CapturedRates,
  actionType?: CommissionActionType
): { fixedAmount: number; percentageRate: number } {
  if (!actionType) {
    return {
      fixedAmount: rule.fixedAmount,
      percentageRate: rule.percentageRate,
    };
  }

  // Map action type to rate keys
  switch (actionType) {
    case "referral_signup":
      return {
        fixedAmount: capturedRates?.signupBonus ?? rule.fixedAmount,
        percentageRate: 0,
      };

    case "referral_first_call":
    case "referral_recurring_call":
      return {
        fixedAmount: capturedRates?.callFixedBonus ?? rule.fixedAmount,
        percentageRate: capturedRates?.callCommissionRate ?? rule.percentageRate,
      };

    case "referral_subscription":
    case "referral_subscription_renewal":
      return {
        fixedAmount: capturedRates?.subscriptionFixedBonus ?? rule.fixedAmount,
        percentageRate: capturedRates?.subscriptionRate ?? rule.percentageRate,
      };

    case "referral_provider_validated":
      return {
        fixedAmount: capturedRates?.providerValidationBonus ?? rule.fixedAmount,
        percentageRate: 0,
      };

    case "manual_adjustment":
      return {
        fixedAmount: rule.fixedAmount,
        percentageRate: rule.percentageRate,
      };

    default:
      return {
        fixedAmount: rule.fixedAmount,
        percentageRate: rule.percentageRate,
      };
  }
}

/**
 * Check individualRates or lockedRates for a provider-type-specific amount.
 * Maps action types to their corresponding rate keys.
 */
function getIndividualOrLockedAmount(
  rates: Record<string, number>,
  actionType: CommissionActionType,
  providerType: 'lawyer' | 'expat'
): number | null {
  // Map action types to rate key prefixes
  const keyMap: Record<string, { lawyer: string; expat: string; generic: string }> = {
    referral_first_call: { lawyer: 'callFixedBonusLawyer', expat: 'callFixedBonusExpat', generic: 'callFixedBonus' },
    referral_recurring_call: { lawyer: 'callFixedBonusLawyer', expat: 'callFixedBonusExpat', generic: 'callFixedBonus' },
    referral_signup: { lawyer: 'signupBonus', expat: 'signupBonus', generic: 'signupBonus' },
    referral_provider_validated: { lawyer: 'providerValidationBonus', expat: 'providerValidationBonus', generic: 'providerValidationBonus' },
  };

  const keys = keyMap[actionType];
  if (!keys) return null;

  const specificKey = providerType === 'lawyer' ? keys.lawyer : keys.expat;
  if (specificKey in rates && rates[specificKey] != null) {
    return rates[specificKey];
  }
  if (keys.generic in rates && rates[keys.generic] != null) {
    return rates[keys.generic];
  }
  return null;
}

/**
 * Format cents to currency string (USD by default)
 */
export function formatCents(cents: number, currency = "USD"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Validate commission amount
 */
export function validateCommissionAmount(
  amount: number,
  minAmount = 0,
  maxAmount = 1000000 // 10,000€ max
): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount)) {
    return { valid: false, error: "Amount is not a valid number" };
  }

  if (amount < minAmount) {
    return {
      valid: false,
      error: `Amount ${formatCents(amount)} is below minimum ${formatCents(minAmount)}`,
    };
  }

  if (amount > maxAmount) {
    return {
      valid: false,
      error: `Amount ${formatCents(amount)} exceeds maximum ${formatCents(maxAmount)}`,
    };
  }

  return { valid: true };
}

/**
 * Check if a commission should be created based on conditions
 */
export function shouldCreateCommission(
  rule: CommissionRule,
  context: {
    isEmailVerified?: boolean;
    accountAgeDays?: number;
    callDuration?: number;
    providerType?: "lawyer" | "expat";
    isFirstCall?: boolean;
    callsThisMonth?: number;
    lifetimeCommissions?: number;
    planType?: string;
    isFirstSubscription?: boolean;
    renewalMonth?: number;
    isKYCComplete?: boolean;
    hasFirstCall?: boolean;
  }
): { allowed: boolean; reason?: string } {
  if (!rule.enabled) {
    return { allowed: false, reason: "Rule is disabled" };
  }

  const conditions = rule.conditions;

  // Email verification
  if (
    conditions.requireEmailVerification &&
    context.isEmailVerified === false
  ) {
    return { allowed: false, reason: "Email not verified" };
  }

  // Account age
  if (
    conditions.minAccountAgeDays !== undefined &&
    conditions.minAccountAgeDays > 0 &&
    context.accountAgeDays !== undefined &&
    context.accountAgeDays < conditions.minAccountAgeDays
  ) {
    return {
      allowed: false,
      reason: `Account must be at least ${conditions.minAccountAgeDays} days old`,
    };
  }

  // Call duration
  if (
    conditions.minCallDuration !== undefined &&
    context.callDuration !== undefined &&
    context.callDuration < conditions.minCallDuration
  ) {
    return {
      allowed: false,
      reason: `Call duration (${context.callDuration}s) below minimum (${conditions.minCallDuration}s)`,
    };
  }

  // Provider type
  if (
    conditions.providerTypes &&
    conditions.providerTypes.length > 0 &&
    context.providerType &&
    !conditions.providerTypes.includes(context.providerType)
  ) {
    return {
      allowed: false,
      reason: `Provider type ${context.providerType} not eligible`,
    };
  }

  // Monthly call limit
  if (
    conditions.maxCallsPerMonth !== undefined &&
    conditions.maxCallsPerMonth > 0 &&
    context.callsThisMonth !== undefined &&
    context.callsThisMonth >= conditions.maxCallsPerMonth
  ) {
    return {
      allowed: false,
      reason: `Monthly call limit (${conditions.maxCallsPerMonth}) reached`,
    };
  }

  // Lifetime limit
  if (
    conditions.lifetimeLimit !== undefined &&
    conditions.lifetimeLimit > 0 &&
    context.lifetimeCommissions !== undefined &&
    context.lifetimeCommissions >= conditions.lifetimeLimit
  ) {
    return {
      allowed: false,
      reason: `Lifetime limit (${conditions.lifetimeLimit}) reached`,
    };
  }

  // Plan type
  if (
    conditions.planTypes &&
    conditions.planTypes.length > 0 &&
    context.planType &&
    !conditions.planTypes.includes(context.planType)
  ) {
    return {
      allowed: false,
      reason: `Plan type ${context.planType} not eligible`,
    };
  }

  // First subscription only
  if (conditions.onlyFirstSubscription && !context.isFirstSubscription) {
    return { allowed: false, reason: "Only first subscription is eligible" };
  }

  // Renewal month limit
  if (
    conditions.maxMonths !== undefined &&
    conditions.maxMonths > 0 &&
    context.renewalMonth !== undefined &&
    context.renewalMonth > conditions.maxMonths
  ) {
    return {
      allowed: false,
      reason: `Renewal month (${context.renewalMonth}) exceeds maximum (${conditions.maxMonths})`,
    };
  }

  // KYC requirement
  if (conditions.requireKYCComplete && !context.isKYCComplete) {
    return { allowed: false, reason: "KYC not completed" };
  }

  // First call requirement
  if (conditions.requireFirstCall && !context.hasFirstCall) {
    return { allowed: false, reason: "Provider has not completed first call" };
  }

  return { allowed: true };
}

/**
 * Get the base amount for commission calculation based on the rule's applyTo field
 */
export function getBaseAmountForRule(
  rule: CommissionRule,
  amounts: {
    connectionFee?: number;
    totalAmount?: number;
    firstMonth?: number;
    annualValue?: number;
  }
): number {
  if (rule.type === "fixed") {
    return 0; // Fixed commissions don't need a base amount
  }

  switch (rule.applyTo) {
    case "connection_fee":
      return amounts.connectionFee || 0;

    case "total_amount":
      return amounts.totalAmount || 0;

    case "first_month":
      return amounts.firstMonth || 0;

    case "annual_value":
      return amounts.annualValue || 0;

    default:
      // Default to total amount
      return amounts.totalAmount || amounts.connectionFee || 0;
  }
}
