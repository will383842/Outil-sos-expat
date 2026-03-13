/**
 * Unified Handler: Subscription Events
 *
 * Processes subscription events:
 *   - subscription_created: First month commission
 *   - subscription_renewed: Monthly renewal commission
 *
 * All amounts in CENTS (USD).
 */

import { logger } from "firebase-functions/v2";
import {
  CommissionEventSubscriptionCreated,
  CommissionEventSubscriptionRenewed,
  ShadowResult,
} from "../types";
import { findReferrer } from "../referralResolver";
import { resolvePlanForUser, resolveAmount } from "../planService";
import { createUnifiedCommission } from "../commissionWriter";

/**
 * Handle a subscription_created event.
 */
export async function handleSubscriptionCreated(
  event: CommissionEventSubscriptionCreated
): Promise<ShadowResult> {
  const result: ShadowResult = { commissions: [], totalAmount: 0 };
  const { subscriptionId, providerId, amount: subAmount, shadowMode } = event;

  // 1. Find who referred this provider
  const referrer = await findReferrer(providerId);
  if (!referrer) return result;

  // 2. Load referrer's plan
  const plan = await resolvePlanForUser(referrer.role, referrer.commissionPlanId || null);
  if (!plan || !plan.rules.subscription_commission.enabled) return result;

  // 3. Calculate commission amount
  let commissionAmount: number;
  let calculationType: "fixed" | "percentage" | "locked_rate";
  let baseAmount: number | undefined;
  let rateApplied: number | undefined;

  const subRules = plan.rules.subscription_commission;

  if (subRules.type === "percentage" && subRules.rate !== undefined) {
    const rate = resolveAmount(referrer.lockedRates, "subscription_rate", subRules.rate);
    commissionAmount = Math.round(subAmount * rate);
    calculationType = referrer.lockedRates?.subscription_rate !== undefined ? "locked_rate" : "percentage";
    baseAmount = subAmount;
    rateApplied = rate;
  } else {
    const planAmount = subRules.firstMonthAmount || 0;
    commissionAmount = resolveAmount(referrer.lockedRates, "subscription_first_month", planAmount);
    calculationType = referrer.lockedRates?.subscription_first_month !== undefined ? "locked_rate" : "fixed";
    rateApplied = commissionAmount;
  }

  if (commissionAmount <= 0) return result;

  // 4. Create commission
  if (!shadowMode) {
    try {
      await createUnifiedCommission({
        referrerId: referrer.userId,
        referrerRole: referrer.role,
        referrerCode: referrer.affiliateCode,
        refereeId: providerId,
        refereeRole: "provider",
        type: "subscription_commission",
        sourceId: subscriptionId,
        sourceType: "subscription",
        planId: plan.id,
        planVersion: plan.version,
        calculationType,
        baseAmount,
        rateApplied,
        ...(calculationType === "locked_rate" ? { lockedRateUsed: true } : {}),
        amount: commissionAmount,
        holdHours: plan.withdrawal.holdPeriodHours,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Duplicate")) {
        logger.error(`Failed to create subscription_commission: ${msg}`);
      }
      return result;
    }
  }

  result.commissions.push({
    referrerId: referrer.userId,
    type: "subscription_commission",
    amount: commissionAmount,
  });
  result.totalAmount += commissionAmount;

  return result;
}

/**
 * Handle a subscription_renewed event.
 */
export async function handleSubscriptionRenewed(
  event: CommissionEventSubscriptionRenewed
): Promise<ShadowResult> {
  const result: ShadowResult = { commissions: [], totalAmount: 0 };
  const { subscriptionId, providerId, renewalMonth, amount: subAmount, shadowMode } = event;

  // 1. Find who referred this provider
  const referrer = await findReferrer(providerId);
  if (!referrer) return result;

  // 2. Load referrer's plan
  const plan = await resolvePlanForUser(referrer.role, referrer.commissionPlanId || null);
  if (!plan || !plan.rules.subscription_commission.enabled) return result;

  // 3. Check maxMonths
  const maxMonths = plan.rules.subscription_commission.maxMonths || 0;
  if (maxMonths > 0 && renewalMonth > maxMonths) {
    logger.info(`Subscription renewal ${renewalMonth} exceeds maxMonths ${maxMonths}, skipping`);
    return result;
  }

  // 4. Calculate commission amount
  let commissionAmount: number;
  let calculationType: "fixed" | "percentage" | "locked_rate";
  let baseAmount: number | undefined;
  let rateApplied: number | undefined;

  const subRules = plan.rules.subscription_commission;

  if (subRules.type === "percentage" && subRules.rate !== undefined) {
    const rate = resolveAmount(referrer.lockedRates, "subscription_rate", subRules.rate);
    commissionAmount = Math.round(subAmount * rate);
    calculationType = referrer.lockedRates?.subscription_rate !== undefined ? "locked_rate" : "percentage";
    baseAmount = subAmount;
    rateApplied = rate;
  } else {
    const planAmount = subRules.renewalAmount || 0;
    commissionAmount = resolveAmount(referrer.lockedRates, "subscription_renewal", planAmount);
    calculationType = referrer.lockedRates?.subscription_renewal !== undefined ? "locked_rate" : "fixed";
    rateApplied = commissionAmount;
  }

  if (commissionAmount <= 0) return result;

  // 5. Create commission (sourceId includes renewal period for anti-duplicate)
  const sourceId = `${subscriptionId}_renewal_${renewalMonth}`;

  if (!shadowMode) {
    try {
      await createUnifiedCommission({
        referrerId: referrer.userId,
        referrerRole: referrer.role,
        referrerCode: referrer.affiliateCode,
        refereeId: providerId,
        refereeRole: "provider",
        type: "subscription_renewal",
        sourceId,
        sourceType: "subscription",
        planId: plan.id,
        planVersion: plan.version,
        calculationType,
        baseAmount,
        rateApplied,
        ...(calculationType === "locked_rate" ? { lockedRateUsed: true } : {}),
        amount: commissionAmount,
        holdHours: plan.withdrawal.holdPeriodHours,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Duplicate")) {
        logger.error(`Failed to create subscription_renewal: ${msg}`);
      }
      return result;
    }
  }

  result.commissions.push({
    referrerId: referrer.userId,
    type: "subscription_renewal",
    amount: commissionAmount,
  });
  result.totalAmount += commissionAmount;

  return result;
}
