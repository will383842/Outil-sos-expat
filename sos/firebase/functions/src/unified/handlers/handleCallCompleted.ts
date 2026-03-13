/**
 * Unified Handler: Call Completed
 *
 * THE most critical handler. Processes a completed call and creates
 * all applicable commissions:
 *   - client_call (direct referral commission)
 *   - recruitment_call / captain_call (N1/N2/N3 cascade)
 *   - activation_bonus (after Nth call by recruit)
 *   - provider_recruitment (if provider was recruited)
 *   - recruit_bonus (one-time for recruiter)
 *
 * Guards:
 *   G1. Call must be paid (isPaid === true)
 *   G2. Duration must be >= 60 seconds
 *   G3. Anti-duplicate via commissionWriter
 *
 * All amounts in CENTS (USD).
 */

import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { CommissionEventCallCompleted, ShadowResult } from "../types";
import { findReferrer, findProviderRecruiter, buildCascadeChain } from "../referralResolver";
import { resolvePlanForUser, resolveAmountByProviderType, resolveAmount } from "../planService";
import { createUnifiedCommission, CreateCommissionInput } from "../commissionWriter";
import { checkFraud, isSelfReferral } from "../fraudDetector";

// Minimum call duration in seconds to earn commission
const MIN_CALL_DURATION_SECONDS = 60;

/**
 * Handle a call_completed event.
 *
 * @param event - The call completed event
 * @returns ShadowResult for comparison with legacy system (if shadowMode)
 */
export async function handleCallCompleted(
  event: CommissionEventCallCompleted
): Promise<ShadowResult> {
  const result: ShadowResult = { commissions: [], totalAmount: 0 };
  const { callSession } = event;

  // ========== GUARDS ==========

  // G1. Call must be paid
  if (!callSession.isPaid) {
    logger.info(`Skipping unpaid call ${callSession.id}`);
    return result;
  }

  // G2. Duration check
  if (callSession.duration < MIN_CALL_DURATION_SECONDS) {
    logger.info(`Skipping short call ${callSession.id}: ${callSession.duration}s < ${MIN_CALL_DURATION_SECONDS}s`);
    return result;
  }

  // ========== DIRECT COMMISSION (client_call) ==========
  const directResult = await processDirectCommission(event, result);

  // ========== CASCADE (recruitment_call / captain_call) ==========
  if (directResult.referrerId) {
    await processCascade(event, directResult.referrerId, result);
  }

  // ========== ACTIVATION BONUS ==========
  if (directResult.referrerId && directResult.referrerOfReferrer) {
    await processActivationBonus(event, directResult, result);
  }

  // ========== PROVIDER RECRUITMENT ==========
  await processProviderRecruitment(event, directResult.referrerId, result);

  logger.info(
    `handleCallCompleted: ${callSession.id} → ${result.commissions.length} commissions, ` +
    `total ${result.totalAmount}¢`
  );

  return result;
}

// ============================================================================
// DIRECT COMMISSION
// ============================================================================

interface DirectResult {
  referrerId: string | null;
  referrerOfReferrer: string | null;
  plan: Awaited<ReturnType<typeof resolvePlanForUser>>;
}

async function processDirectCommission(
  event: CommissionEventCallCompleted,
  result: ShadowResult
): Promise<DirectResult> {
  const { callSession, shadowMode } = event;
  const empty: DirectResult = { referrerId: null, referrerOfReferrer: null, plan: null };

  // 1. Find who referred the client
  const referrer = await findReferrer(callSession.clientId);
  if (!referrer) return empty;

  // 2. Self-referral guard
  if (isSelfReferral(referrer.userId, callSession.clientId, callSession.providerId)) {
    logger.info(`Self-referral detected for call ${callSession.id}, skipping direct commission`);
    return empty;
  }

  // 3. Load referrer's plan
  const plan = await resolvePlanForUser(referrer.role, referrer.commissionPlanId || null);
  if (!plan) {
    logger.warn(`No plan found for referrer ${referrer.userId} (role: ${referrer.role})`);
    return empty;
  }

  // 4. Check if client_call is enabled
  if (!plan.rules.client_call.enabled) return { referrerId: referrer.userId, referrerOfReferrer: null, plan };

  // 5. Calculate amount
  let amount: number;
  let calculationType: "fixed" | "percentage" | "locked_rate";
  let lockedRateUsed = false;
  let baseAmount: number | undefined;
  let rateApplied: number | undefined;

  if (plan.rules.client_call.type === "percentage" && plan.rules.client_call.rate !== undefined) {
    // Percentage-based (e.g., partner 15%)
    const rate = resolveAmount(referrer.lockedRates, "client_call_rate", plan.rules.client_call.rate);
    lockedRateUsed = referrer.lockedRates?.["client_call_rate"] !== undefined;
    amount = Math.round(callSession.amount * rate);
    calculationType = lockedRateUsed ? "locked_rate" : "percentage";
    baseAmount = callSession.amount;
    rateApplied = rate;
  } else {
    // Fixed-amount (default for most roles)
    const planAmounts = plan.rules.client_call.amounts || { lawyer: 0, expat: 0 };
    amount = resolveAmountByProviderType(
      referrer.lockedRates,
      "client_call",
      callSession.providerType,
      planAmounts
    );
    lockedRateUsed = !!(
      referrer.lockedRates &&
      (`client_call_${callSession.providerType}` in referrer.lockedRates ||
        "client_call" in referrer.lockedRates)
    );
    calculationType = lockedRateUsed ? "locked_rate" : "fixed";
    rateApplied = amount;
  }

  // 6. Multipliers permanently disabled — commissions are fixed amounts only

  if (amount <= 0) return { referrerId: referrer.userId, referrerOfReferrer: null, plan };

  // 7. Fraud check
  const fraudResult = await checkFraud({
    referrerId: referrer.userId,
    referrerEmail: referrer.email,
    refereeId: callSession.clientId,
    type: "client_call",
    amount,
  });

  // 8. Determine hold
  const holdHours = fraudResult.shouldHold
    ? Math.max(plan.withdrawal.holdPeriodHours, 72) // fraud = at least 72h hold
    : plan.withdrawal.holdPeriodHours;

  // 9. Create commission
  const input: CreateCommissionInput = {
    referrerId: referrer.userId,
    referrerRole: referrer.role,
    referrerCode: referrer.affiliateCode,
    refereeId: callSession.clientId,
    refereeRole: "client",
    type: "client_call",
    sourceId: callSession.id,
    sourceType: "call_session",
    planId: plan.id,
    planVersion: plan.version,
    calculationType,
    baseAmount,
    rateApplied,
    ...(lockedRateUsed ? { lockedRateUsed: true } : {}),
    multiplierApplied,
    amount,
    holdHours,
  };

  if (!shadowMode) {
    try {
      await createUnifiedCommission(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Duplicate commission")) {
        logger.info(`Duplicate client_call commission for call ${callSession.id}, skipping`);
      } else {
        logger.error(`Failed to create client_call commission: ${msg}`);
      }
      return { referrerId: referrer.userId, referrerOfReferrer: null, plan };
    }
  }

  result.commissions.push({
    referrerId: referrer.userId,
    type: "client_call",
    amount,
  });
  result.totalAmount += amount;

  // Find referrer's referrer for activation bonus
  const referrerOfReferrer = await findReferrerOfReferrer(referrer.userId);

  return { referrerId: referrer.userId, referrerOfReferrer, plan };
}

// ============================================================================
// CASCADE N1/N2/N3
// ============================================================================

async function processCascade(
  event: CommissionEventCallCompleted,
  directReferrerId: string,
  result: ShadowResult
): Promise<void> {
  const { callSession, shadowMode } = event;

  // Load the direct referrer's plan for cascade config
  const db = getFirestore();
  const referrerSnap = await db.collection("users").doc(directReferrerId).get();
  if (!referrerSnap.exists) return;

  const referrerData = referrerSnap.data()!;
  const referrerRole = (referrerData.affiliateRole || referrerData.role || "unknown") as string;
  const referrerPlanId = referrerData.commissionPlanId as string | undefined;

  const plan = await resolvePlanForUser(referrerRole, referrerPlanId || null);
  if (!plan || !plan.rules.recruitment_call.enabled || plan.rules.recruitment_call.depth === 0) return;

  // Build cascade chain: [A=directReferrer, B=A's referrer, C=B's referrer, ...]
  // A (chain[0]) already got client_call → skip.
  // B (chain[1]) gets N1 recruitment_call (depthAmounts[0]).
  // C (chain[2]) gets N2 recruitment_call (depthAmounts[1]).
  const chain = await buildCascadeChain(directReferrerId, plan.rules.recruitment_call.depth);

  for (let i = 1; i < chain.length; i++) {
    const node = chain[i];
    const nLevel = i; // N1=1, N2=2, N3=3...
    const depthIndex = nLevel - 1;

    if (depthIndex >= plan.rules.recruitment_call.depthAmounts.length) break;

    let commissionType: "recruitment_call" | "captain_call";
    let amount: number;
    let subType: string | undefined;

    if (node.isCaptain && plan.rules.captain_bonus.enabled) {
      // Captain gets captain_call instead of recruitment_call
      commissionType = "captain_call";
      amount = resolveAmount(node.lockedRates, "captain_call", plan.rules.captain_bonus.callAmount);
    } else {
      commissionType = "recruitment_call";
      subType = `n${nLevel}`;
      const rateKey = `recruitment_n${nLevel}`;
      amount = resolveAmount(node.lockedRates, rateKey, plan.rules.recruitment_call.depthAmounts[depthIndex]);
    }

    if (amount <= 0) continue;

    const lockedRateUsed = !!(node.lockedRates && (
      (commissionType === "captain_call" && "captain_call" in node.lockedRates) ||
      (commissionType === "recruitment_call" && `recruitment_n${nLevel}` in node.lockedRates)
    ));

    if (!shadowMode) {
      try {
        await createUnifiedCommission({
          referrerId: node.userId,
          referrerRole: node.role,
          referrerCode: node.affiliateCode,
          refereeId: callSession.clientId,
          refereeRole: "client",
          type: commissionType,
          subType,
          sourceId: callSession.id,
          sourceType: "call_session",
          planId: plan.id,
          planVersion: plan.version,
          calculationType: lockedRateUsed ? "locked_rate" : "fixed",
          rateApplied: amount,
          ...(lockedRateUsed ? { lockedRateUsed: true } : {}),
          amount,
          holdHours: plan.withdrawal.holdPeriodHours,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Duplicate")) {
          logger.error(`Failed to create ${commissionType} for ${node.userId}: ${msg}`);
        }
        continue;
      }
    }

    result.commissions.push({
      referrerId: node.userId,
      type: commissionType,
      subType,
      amount,
    });
    result.totalAmount += amount;
  }
}

// ============================================================================
// ACTIVATION BONUS
// ============================================================================

async function processActivationBonus(
  event: CommissionEventCallCompleted,
  directResult: DirectResult,
  result: ShadowResult
): Promise<void> {
  const { callSession, shadowMode } = event;
  const { referrerId, referrerOfReferrer, plan } = directResult;

  if (!referrerId || !plan || !plan.rules.activation_bonus.enabled) return;

  const db = getFirestore();

  // Count how many client_call commissions the referee (client) has generated
  // for this referrer in the unified system
  const commissionCount = await db
    .collection("commissions")
    .where("referrerId", "==", referrerId)
    .where("refereeId", "==", callSession.clientId)
    .where("type", "==", "client_call")
    .get();

  const count = commissionCount.size; // includes the one just created

  if (count !== plan.rules.activation_bonus.afterNthCall) return;

  // Load referrer's profile for amount resolution
  const referrerSnap = await db.collection("users").doc(referrerId).get();
  if (!referrerSnap.exists) return;

  const referrerData = referrerSnap.data()!;
  const lockedRates = referrerData.lockedRates as Record<string, number> | undefined;
  const amount = resolveAmount(lockedRates, "activation_bonus", plan.rules.activation_bonus.amount);

  if (amount <= 0) return;

  if (!shadowMode) {
    // Use transaction to prevent race condition: check flag + create commission + set flag atomically
    const clientRef = db.collection("users").doc(callSession.clientId);
    let bonusCreated = false;

    try {
      await db.runTransaction(async (tx) => {
        const clientSnap = await tx.get(clientRef);
        if (!clientSnap.exists) return;

        const clientData = clientSnap.data()!;
        if (clientData.activationBonusPaid) return;

        // Create commission outside transaction (commissionWriter has its own dedup)
        // but set flag inside transaction to prevent concurrent bonus creation
        await createUnifiedCommission({
          referrerId,
          referrerRole: (referrerData.affiliateRole || referrerData.role || "unknown") as string,
          referrerCode: (referrerData.affiliateCode || "") as string,
          refereeId: callSession.clientId,
          refereeRole: "client",
          type: "activation_bonus",
          sourceId: `${callSession.id}_activation`,
          sourceType: "call_session",
          planId: plan.id,
          planVersion: plan.version,
          calculationType: lockedRates?.activation_bonus !== undefined ? "locked_rate" : "fixed",
          rateApplied: amount,
          ...(lockedRates?.activation_bonus !== undefined ? { lockedRateUsed: true } : {}),
          amount,
          holdHours: plan.withdrawal.holdPeriodHours,
        });

        // Set idempotence flag atomically
        tx.update(clientRef, { activationBonusPaid: true });
        bonusCreated = true;
      });

      if (!bonusCreated) return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Duplicate")) {
        logger.error(`Failed to create activation_bonus: ${msg}`);
      }
      return;
    }
  } else {
    // Shadow mode: just check flag without transaction
    const clientSnap = await db.collection("users").doc(callSession.clientId).get();
    if (!clientSnap.exists) return;
    if (clientSnap.data()!.activationBonusPaid) return;
  }

  result.commissions.push({
    referrerId,
    type: "activation_bonus",
    amount,
  });
  result.totalAmount += amount;

  // N1 recruit bonus for the referrer's referrer
  if (referrerOfReferrer && plan.rules.n1_recruit_bonus.enabled) {
    const n1Snap = await db.collection("users").doc(referrerOfReferrer).get();
    if (n1Snap.exists) {
      const n1Data = n1Snap.data()!;
      const n1LockedRates = n1Data.lockedRates as Record<string, number> | undefined;
      const n1Amount = resolveAmount(n1LockedRates, "n1_recruit_bonus", plan.rules.n1_recruit_bonus.amount);

      if (n1Amount > 0 && !shadowMode) {
        try {
          await createUnifiedCommission({
            referrerId: referrerOfReferrer,
            referrerRole: (n1Data.affiliateRole || n1Data.role || "unknown") as string,
            referrerCode: (n1Data.affiliateCode || "") as string,
            refereeId: callSession.clientId,
            refereeRole: "client",
            type: "n1_recruit_bonus",
            sourceId: `${callSession.id}_n1_recruit`,
            sourceType: "call_session",
            planId: plan.id,
            planVersion: plan.version,
            calculationType: n1LockedRates?.n1_recruit_bonus !== undefined ? "locked_rate" : "fixed",
            rateApplied: n1Amount,
            amount: n1Amount,
            holdHours: plan.withdrawal.holdPeriodHours,
          });

          result.commissions.push({
            referrerId: referrerOfReferrer,
            type: "n1_recruit_bonus",
            amount: n1Amount,
          });
          result.totalAmount += n1Amount;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("Duplicate")) {
            logger.error(`Failed to create n1_recruit_bonus: ${msg}`);
          }
        }
      }
    }
  }
}

// ============================================================================
// PROVIDER RECRUITMENT
// ============================================================================

async function processProviderRecruitment(
  event: CommissionEventCallCompleted,
  directReferrerId: string | null,
  result: ShadowResult
): Promise<void> {
  const { callSession, shadowMode } = event;

  const recruiter = await findProviderRecruiter(callSession.providerId);
  if (!recruiter) return;

  // Guard: skip if recruiter is also the client's referrer (anti-double)
  if (directReferrerId && recruiter.recruiterId === directReferrerId) {
    logger.info(`Skipping provider_recruitment: recruiter ${recruiter.recruiterId} is also client referrer`);
    return;
  }

  // Load recruiter's plan
  const plan = await resolvePlanForUser(recruiter.recruiterRole, recruiter.commissionPlanId || null);
  if (!plan || !plan.rules.provider_recruitment.enabled) return;

  // Calculate amount
  const amount = resolveAmountByProviderType(
    recruiter.lockedRates,
    "provider_recruitment",
    recruiter.providerType,
    plan.rules.provider_recruitment.amounts
  );

  if (amount <= 0) return;

  const lockedRateUsed = !!(
    recruiter.lockedRates &&
    (`provider_recruitment_${recruiter.providerType}` in recruiter.lockedRates ||
      "provider_recruitment" in recruiter.lockedRates)
  );

  if (!shadowMode) {
    try {
      await createUnifiedCommission({
        referrerId: recruiter.recruiterId,
        referrerRole: recruiter.recruiterRole,
        referrerCode: recruiter.recruiterCode,
        refereeId: callSession.providerId,
        refereeRole: "provider",
        type: "provider_recruitment",
        sourceId: callSession.id,
        sourceType: "call_session",
        planId: plan.id,
        planVersion: plan.version,
        calculationType: lockedRateUsed ? "locked_rate" : "fixed",
        rateApplied: amount,
        ...(lockedRateUsed ? { lockedRateUsed: true } : {}),
        amount,
        holdHours: plan.withdrawal.holdPeriodHours,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Duplicate")) {
        logger.error(`Failed to create provider_recruitment: ${msg}`);
      }
      return;
    }
  }

  result.commissions.push({
    referrerId: recruiter.recruiterId,
    type: "provider_recruitment",
    amount,
  });
  result.totalAmount += amount;
}

// ============================================================================
// HELPERS
// ============================================================================

async function findReferrerOfReferrer(referrerId: string): Promise<string | null> {
  const referrer = await findReferrer(referrerId);
  return referrer?.userId || null;
}
