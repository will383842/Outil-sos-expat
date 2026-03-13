/**
 * Unified Handler: User Registered
 *
 * Processes a new user registration:
 *   1. Generate unified affiliate code
 *   2. Snapshot lockedRates from the default plan
 *   3. Process referral code (if any) to link referrer
 *   4. Create signup_bonus commission for the referrer
 *
 * All amounts in CENTS (USD).
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { CommissionEventUserRegistered, ShadowResult } from "../types";
import { generateUnifiedAffiliateCode } from "../codeGenerator";
import { snapshotLockedRatesUnified, resolvePlanForUser, resolveAmount } from "../planService";
import { resolveCode } from "../codeResolver";
import { createUnifiedCommission } from "../commissionWriter";
import { isSelfReferral } from "../fraudDetector";

// Referral link is valid for 30 days after capture
const REFERRAL_WINDOW_DAYS = 30;

/**
 * Handle a user_registered event.
 */
export async function handleUserRegistered(
  event: CommissionEventUserRegistered
): Promise<ShadowResult> {
  const result: ShadowResult = { commissions: [], totalAmount: 0 };
  const { userId, role, shadowMode } = event;
  const db = getFirestore();

  // ========== 1. Generate affiliate code ==========
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    logger.error(`handleUserRegistered: user ${userId} not found`);
    return result;
  }

  const userData = userSnap.data()!;
  const firstName = (userData.firstName || "") as string;

  // Skip if user already has a unified affiliate code
  if (!userData.affiliateCode) {
    const affiliateCode = generateUnifiedAffiliateCode(firstName, userId);

    // ========== 2. Snapshot locked rates ==========
    const rateSnapshot = await snapshotLockedRatesUnified(role);

    const updateData: Record<string, unknown> = {
      affiliateCode,
      affiliateRole: role,
    };

    if (rateSnapshot) {
      updateData.commissionPlanId = rateSnapshot.commissionPlanId;
      updateData.commissionPlanName = rateSnapshot.commissionPlanName;
      updateData.lockedRates = rateSnapshot.lockedRates;
      updateData.rateLockDate = rateSnapshot.rateLockDate;
    }

    if (!shadowMode) {
      await db.collection("users").doc(userId).update(updateData);
    }
  }

  // ========== 3. Process referral code ==========
  const referralCode = event.referralCode || (userData.pendingReferralCode as string) || null;

  if (!referralCode) return result;

  // Check referral window (30 days)
  if (event.referralCapturedAt) {
    const capturedAt = new Date(event.referralCapturedAt);
    const now = new Date();
    const daysSinceCapture = (now.getTime() - capturedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCapture > REFERRAL_WINDOW_DAYS) {
      logger.info(`Referral code expired: captured ${daysSinceCapture.toFixed(1)} days ago`);
      return result;
    }
  }

  // Resolve the referral code
  const codeResolution = await resolveCode(referralCode);
  if (!codeResolution) {
    logger.info(`Referral code "${referralCode}" not found for user ${userId}`);
    return result;
  }

  // Self-referral guard
  if (isSelfReferral(codeResolution.userId, userId)) {
    logger.info(`Self-referral detected: user ${userId} tried to use own code`);
    return result;
  }

  // Write referral link
  if (!shadowMode) {
    await db.collection("users").doc(userId).update({
      referredByUserId: codeResolution.userId,
      referredByCode: referralCode,
      referredAt: Timestamp.now(),
    });
  }

  // ========== 4. Signup bonus ==========
  const referrerPlan = await resolvePlanForUser(
    codeResolution.role,
    codeResolution.commissionPlanId || null
  );

  if (!referrerPlan || !referrerPlan.rules.signup_bonus.enabled) return result;

  const amount = resolveAmount(
    codeResolution.lockedRates,
    "signup_bonus",
    referrerPlan.rules.signup_bonus.amount
  );

  if (amount <= 0) return result;

  const lockedRateUsed = codeResolution.lockedRates?.signup_bonus !== undefined;

  if (!shadowMode) {
    try {
      await createUnifiedCommission({
        referrerId: codeResolution.userId,
        referrerRole: codeResolution.role,
        referrerCode: codeResolution.affiliateCode,
        refereeId: userId,
        refereeRole: role,
        type: "signup_bonus",
        sourceId: userId,
        sourceType: "user_registration",
        planId: referrerPlan.id,
        planVersion: referrerPlan.version,
        calculationType: lockedRateUsed ? "locked_rate" : "fixed",
        rateApplied: amount,
        ...(lockedRateUsed ? { lockedRateUsed: true } : {}),
        amount,
        holdHours: referrerPlan.withdrawal.holdPeriodHours,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Duplicate")) {
        logger.error(`Failed to create signup_bonus: ${msg}`);
      }
      return result;
    }
  }

  result.commissions.push({
    referrerId: codeResolution.userId,
    type: "signup_bonus",
    amount,
  });
  result.totalAmount += amount;

  return result;
}
