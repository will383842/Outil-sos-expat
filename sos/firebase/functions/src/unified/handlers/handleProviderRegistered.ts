/**
 * Unified Handler: Provider Registered
 *
 * Processes a new provider registration:
 *   1. Find the recruitment code from unified or legacy fields
 *   2. Resolve the recruiter
 *   3. Create a recruited_providers document (commission tracking window)
 *
 * All amounts in CENTS (USD).
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { CommissionEventProviderRegistered, ShadowResult } from "../types";
import { resolveCode } from "../codeResolver";
import { resolvePlanForUser } from "../planService";

/**
 * Handle a provider_registered event.
 */
export async function handleProviderRegistered(
  event: CommissionEventProviderRegistered
): Promise<ShadowResult> {
  const result: ShadowResult = { commissions: [], totalAmount: 0 };
  const { userId, providerType, shadowMode } = event;

  // ========== 1. Find recruitment code ==========
  const recruitmentCode = findRecruitmentCode(event);
  if (!recruitmentCode) return result;

  // ========== 2. Resolve the recruiter ==========
  const codeResolution = await resolveCode(recruitmentCode);
  if (!codeResolution) {
    logger.info(`Recruitment code "${recruitmentCode}" not found for provider ${userId}`);
    return result;
  }

  // Self-referral guard
  if (codeResolution.userId === userId) {
    logger.info(`Self-referral: provider ${userId} used own recruitment code`);
    return result;
  }

  // ========== 3. Load recruiter's plan for window duration ==========
  const plan = await resolvePlanForUser(
    codeResolution.role,
    codeResolution.commissionPlanId || null
  );

  const windowMonths = plan?.rules.provider_recruitment.enabled
    ? plan.rules.provider_recruitment.windowMonths
    : 6; // default 6 months

  // ========== 4. Create recruited_providers document ==========
  const now = Timestamp.now();
  const windowEnd = Timestamp.fromMillis(
    now.toMillis() + windowMonths * 30 * 24 * 60 * 60 * 1000
  );

  const db = getFirestore();

  // Check for existing entry (idempotence)
  const existing = await db
    .collection("recruited_providers")
    .where("recruiterId", "==", codeResolution.userId)
    .where("providerId", "==", userId)
    .limit(1)
    .get();

  if (!existing.empty) {
    logger.info(`Provider ${userId} already tracked as recruited by ${codeResolution.userId}`);
    return result;
  }

  if (!shadowMode) {
    const docRef = db.collection("recruited_providers").doc();
    await docRef.set({
      id: docRef.id,
      recruiterId: codeResolution.userId,
      recruiterRole: codeResolution.role,
      recruiterCode: codeResolution.affiliateCode,
      commissionPlanId: codeResolution.commissionPlanId || null,
      providerId: userId,
      providerEmail: "", // will be filled by trigger or admin
      providerType,
      providerName: "",
      recruitedAt: now,
      windowEnd,
      isActive: true,
      callsWithCommission: 0,
      totalCommissions: 0,
    });

    // Also write the recruiter reference on the provider's user doc
    await db.collection("users").doc(userId).update({
      recruitedByUserId: codeResolution.userId,
      recruitedByCode: recruitmentCode,
      recruitedAt: now,
    });

    logger.info(
      `Provider ${userId} (${providerType}) recruited by ${codeResolution.userId} ` +
      `(${codeResolution.role}), window until ${windowEnd.toDate().toISOString()}`
    );
  }

  return result;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract the recruitment code from event data.
 * Supports both unified and all legacy field patterns.
 */
function findRecruitmentCode(event: CommissionEventProviderRegistered): string | null {
  // 1. Unified field (preferred)
  if (event.recruitmentCode) return event.recruitmentCode;

  // 2. Legacy: providerRecruitedByChatter (code stored directly)
  if (event.providerRecruitedByChatter) return event.providerRecruitedByChatter;

  // 3. Legacy: providerRecruitedByBlogger
  if (event.providerRecruitedByBlogger) return event.providerRecruitedByBlogger;

  // 4. Legacy: influencer (different pattern! separate boolean + code)
  if (event.recruitedByInfluencer && event.influencerCode) return event.influencerCode;

  // 5. Legacy: providerRecruitedByGroupAdmin
  if (event.providerRecruitedByGroupAdmin) return event.providerRecruitedByGroupAdmin;

  return null;
}
