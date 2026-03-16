/**
 * Scheduled: resetCaptainMonthly
 *
 * Runs on the 1st of every month at 00:05 UTC.
 * For each captain chatter:
 * 1. Determine the tier reached based on captainMonthlyTeamCalls
 * 2. Pay tier bonus if threshold met
 * 3. Pay quality bonus if enabled by admin
 * 4. Archive monthly stats
 * 5. Reset captainMonthlyTeamCalls to 0
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { getChatterConfigCached } from "../utils";
import { createCommission } from "../services/chatterCommissionService";
import { Chatter, DEFAULT_CHATTER_CONFIG } from "../types";

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determine the best tier reached for a given call count
 */
function getBestTier(
  callCount: number,
  tiers: Array<{ name: string; minCalls: number; bonus: number }>
): { name: string; minCalls: number; bonus: number } | null {
  // Sort tiers descending by minCalls to find the highest reached
  const sorted = [...tiers].sort((a, b) => b.minCalls - a.minCalls);
  for (const tier of sorted) {
    if (callCount >= tier.minCalls) {
      return tier;
    }
  }
  return null;
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

export const chatterResetCaptainMonthly = onSchedule(
  {
    schedule: "5 0 1 * *", // 1st of every month at 00:05 UTC
    region: "us-central1",
    timeZone: "UTC",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540,
    retryCount: 2,
  },
  async () => {
    const db = getDb();
    const now = Timestamp.now();

    // Get previous month info for archive
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    logger.info("[resetCaptainMonthly] Starting monthly captain reset", { monthKey });

    // Load config
    let config;
    try {
      config = await getChatterConfigCached();
    } catch {
      config = DEFAULT_CHATTER_CONFIG;
    }

    const tiers = config.captainTiers || DEFAULT_CHATTER_CONFIG.captainTiers!;
    // Quality bonus DISABLED — amount set to 0 in config defaults
    const qualityBonusAmount = config.captainQualityBonusAmount ?? DEFAULT_CHATTER_CONFIG.captainQualityBonusAmount ?? 0;
    const qualityMinRecruits = config.captainQualityBonusMinRecruits ?? DEFAULT_CHATTER_CONFIG.captainQualityBonusMinRecruits ?? 0;
    const qualityMinCommissions = config.captainQualityBonusMinCommissions ?? DEFAULT_CHATTER_CONFIG.captainQualityBonusMinCommissions ?? 0;

    // Query all captains
    const captainsQuery = await db
      .collection("chatters")
      .where("role", "==", "captainChatter")
      .where("status", "==", "active")
      .get();

    logger.info("[resetCaptainMonthly] Found captains", { count: captainsQuery.size });

    let tierBonusesPaid = 0;
    let qualityBonusesPaid = 0;
    let errors = 0;

    for (const doc of captainsQuery.docs) {
      try {
        const captain = doc.data() as Chatter;
        const captainId = doc.id;
        const teamCalls = captain.captainMonthlyTeamCalls || 0;

        // 1. Determine tier
        const bestTier = getBestTier(teamCalls, tiers);

        // 2. Pay tier bonus if reached
        if (bestTier) {
          const tierResult = await createCommission({
            chatterId: captainId,
            type: "captain_tier_bonus",
            source: {
              id: `captain_tier_${captainId}_${monthKey}`,
              type: "bonus",
              details: {
                month: monthKey,
                bonusType: "captain_tier",
                bonusReason: `${bestTier.name} (${teamCalls} appels)`,
              },
            },
            baseAmount: bestTier.bonus,
            description: `Bonus palier ${bestTier.name} (${teamCalls} appels \u00e9quipe) \u2014 ${monthKey}`,
          });

          if (tierResult.success) {
            tierBonusesPaid++;
            logger.info("[resetCaptainMonthly] Tier bonus paid", {
              captainId,
              tier: bestTier.name,
              bonus: bestTier.bonus,
              teamCalls,
            });

            // Notify captain about tier bonus
            await db.collection("chatter_notifications").add({
              chatterId: captainId,
              type: "captain_tier_bonus",
              title: "Bonus palier Capitaine !",
              titleTranslations: {
                fr: "Bonus palier Capitaine !",
                en: "Captain Tier Bonus!",
                es: "Bono de nivel Capitán!",
                de: "Kapitän Stufen-Bonus!",
                pt: "Bónus de nível Capitão!",
                ru: "Бонус уровня Капитана!",
                ar: "مكافأة مستوى القبطان!",
                zh: "队长等级奖金！",
                hi: "कैप्टन टियर बोनस!",
              },
              message: `Palier ${bestTier.name} atteint avec ${teamCalls} appels — bonus de $${(bestTier.bonus / 100).toFixed(0)} !`,
              messageTranslations: {
                fr: `Palier ${bestTier.name} atteint avec ${teamCalls} appels — bonus de $${(bestTier.bonus / 100).toFixed(0)} !`,
                en: `${bestTier.name} tier reached with ${teamCalls} calls — $${(bestTier.bonus / 100).toFixed(0)} bonus!`,
                es: `Nivel ${bestTier.name} alcanzado con ${teamCalls} llamadas — bono de $${(bestTier.bonus / 100).toFixed(0)}!`,
                de: `${bestTier.name}-Stufe erreicht mit ${teamCalls} Anrufen — $${(bestTier.bonus / 100).toFixed(0)} Bonus!`,
                pt: `N\u00edvel ${bestTier.name} alcan\u00e7ado com ${teamCalls} chamadas — b\u00f3nus de $${(bestTier.bonus / 100).toFixed(0)}!`,
                ru: `\u0423\u0440\u043e\u0432\u0435\u043d\u044c ${bestTier.name} \u0434\u043e\u0441\u0442\u0438\u0433\u043d\u0443\u0442 \u0441 ${teamCalls} \u0437\u0432\u043e\u043d\u043a\u0430\u043c\u0438 \u2014 \u0431\u043e\u043d\u0443\u0441 $${(bestTier.bonus / 100).toFixed(0)}!`,
                hi: `${teamCalls} \u0915\u0949\u0932 \u0915\u0947 \u0938\u093e\u0925 ${bestTier.name} \u0938\u094d\u0924\u0930 \u092a\u094d\u0930\u093e\u092a\u094d\u0924 \u2014 $${(bestTier.bonus / 100).toFixed(0)} \u092c\u094b\u0928\u0938!`,
                zh: `${teamCalls} \u6b21\u901a\u8bdd\u8fbe\u5230 ${bestTier.name} \u7b49\u7ea7 \u2014 $${(bestTier.bonus / 100).toFixed(0)} \u5956\u91d1\uff01`,
                ar: `\u062a\u0645 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0645\u0633\u062a\u0648\u0649 ${bestTier.name} \u0628\u0640 ${teamCalls} \u0645\u0643\u0627\u0644\u0645\u0629 \u2014 \u0645\u0643\u0627\u0641\u0623\u0629 $${(bestTier.bonus / 100).toFixed(0)}!`,
              },
              isRead: false,
              createdAt: now,
              data: { amount: bestTier.bonus },
            });
          }
        }

        // 3. Pay quality bonus — DISABLED when qualityBonusAmount is 0
        // HYBRID: automatic criteria OR admin override
        // Criteria: N1 active recruits >= threshold AND monthly captain_call commissions >= threshold
        // Admin veto: captainQualityBonusEnabled can force-enable (admin override)
        const n1CountQuery = await db
          .collection("chatters")
          .where("recruitedBy", "==", captainId)
          .where("status", "==", "active")
          .get();
        const activeN1Count = n1CountQuery.size;

        // Sum captain_call commissions this month
        const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
        const captainCommissionsQuery = await db
          .collection("chatter_commissions")
          .where("chatterId", "==", captainId)
          .where("type", "==", "captain_call")
          .where("createdAt", ">=", Timestamp.fromDate(monthStart))
          .where("createdAt", "<", Timestamp.fromDate(monthEnd))
          .get();
        const monthlyTeamCommissions = captainCommissionsQuery.docs.reduce(
          (sum, doc) => sum + (doc.data().amount || 0), 0
        );

        const criteriaMetN1 = activeN1Count >= qualityMinRecruits;
        const criteriaMetCommissions = monthlyTeamCommissions >= qualityMinCommissions;
        const criteriaMet = criteriaMetN1 && criteriaMetCommissions;
        const adminOverride = captain.captainQualityBonusEnabled === true;
        const shouldPayQualityBonus = qualityBonusAmount > 0 && (criteriaMet || adminOverride);

        if (shouldPayQualityBonus) {
          const reason = criteriaMet
            ? `Automatique (${activeN1Count} recrues, $${(monthlyTeamCommissions / 100).toFixed(0)} commissions)`
            : `Admin override (${activeN1Count}/${qualityMinRecruits} recrues, $${(monthlyTeamCommissions / 100).toFixed(0)}/$${(qualityMinCommissions / 100).toFixed(0)} commissions)`;
          const qualityResult = await createCommission({
            chatterId: captainId,
            type: "captain_quality_bonus",
            source: {
              id: `captain_quality_${captainId}_${monthKey}`,
              type: "bonus",
              details: {
                month: monthKey,
                bonusType: "captain_quality",
                bonusReason: reason,
                criteriaMet,
                adminOverride,
                activeN1Count,
                monthlyTeamCommissions,
              },
            },
            baseAmount: qualityBonusAmount,
            description: `Bonus qualit\u00e9 capitaine \u2014 ${monthKey}`,
          });

          if (qualityResult.success) {
            qualityBonusesPaid++;
            logger.info("[resetCaptainMonthly] Quality bonus paid", {
              captainId, criteriaMet, adminOverride, activeN1Count, monthlyTeamCommissions,
            });

            // Notify captain about quality bonus
            await db.collection("chatter_notifications").add({
              chatterId: captainId,
              type: "captain_quality_bonus",
              title: "Bonus qualité Capitaine !",
              titleTranslations: {
                fr: "Bonus qualité Capitaine !",
                en: "Captain Quality Bonus!",
                es: "Bono de calidad Capitán!",
                de: "Kapitän Qualitäts-Bonus!",
                pt: "Bónus de qualidade Capitão!",
                ru: "Бонус качества Капитана!",
                ar: "مكافأة جودة القبطان!",
                zh: "队长质量奖金！",
                hi: "कैप्टन गुणवत्ता बोनस!",
              },
              message: `Bonus qualité de $${(qualityBonusAmount / 100).toFixed(0)} crédité — ${monthKey}`,
              messageTranslations: {
                fr: `Bonus qualit\u00e9 de $${(qualityBonusAmount / 100).toFixed(0)} cr\u00e9dit\u00e9 \u2014 ${monthKey}`,
                en: `Quality bonus of $${(qualityBonusAmount / 100).toFixed(0)} credited \u2014 ${monthKey}`,
                es: `Bono de calidad de $${(qualityBonusAmount / 100).toFixed(0)} acreditado \u2014 ${monthKey}`,
                de: `Qualit\u00e4tsbonus von $${(qualityBonusAmount / 100).toFixed(0)} gutgeschrieben \u2014 ${monthKey}`,
                pt: `B\u00f3nus de qualidade de $${(qualityBonusAmount / 100).toFixed(0)} creditado \u2014 ${monthKey}`,
                ru: `\u0411\u043e\u043d\u0443\u0441 \u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430 $${(qualityBonusAmount / 100).toFixed(0)} \u0437\u0430\u0447\u0438\u0441\u043b\u0435\u043d \u2014 ${monthKey}`,
                hi: `$${(qualityBonusAmount / 100).toFixed(0)} \u0917\u0941\u0923\u0935\u0924\u094d\u0924\u093e \u092c\u094b\u0928\u0938 \u091c\u092e\u093e \u2014 ${monthKey}`,
                zh: `$${(qualityBonusAmount / 100).toFixed(0)} \u8d28\u91cf\u5956\u91d1\u5df2\u5165\u8d26 \u2014 ${monthKey}`,
                ar: `\u0645\u0643\u0627\u0641\u0623\u0629 \u0627\u0644\u062c\u0648\u062f\u0629 $${(qualityBonusAmount / 100).toFixed(0)} \u062a\u0645 \u0625\u0636\u0627\u0641\u062a\u0647\u0627 \u2014 ${monthKey}`,
              },
              isRead: false,
              createdAt: now,
              data: { amount: qualityBonusAmount },
            });
          }
        }

        // 4. Archive monthly stats
        const archiveId = `${captainId}_${monthKey}`;
        const totalBonus = (bestTier?.bonus || 0) + (shouldPayQualityBonus ? qualityBonusAmount : 0);
        await db.collection("captain_monthly_archives").doc(archiveId).set({
          captainId,
          month: prevMonth.getMonth() + 1,
          year: prevMonth.getFullYear(),
          teamCalls,
          tierName: bestTier?.name || "Aucun",
          bonusAmount: totalBonus,
          tierReached: bestTier?.name || null,
          tierBonus: bestTier?.bonus || 0,
          qualityBonusPaid: shouldPayQualityBonus,
          qualityBonusAmount: shouldPayQualityBonus ? qualityBonusAmount : 0,
          qualityBonusCriteriaMet: criteriaMet,
          qualityBonusAdminOverride: adminOverride,
          activeN1Count,
          monthlyTeamCommissions,
          createdAt: now,
        });

        // 5. Reset monthly counter
        await db.collection("chatters").doc(captainId).update({
          captainMonthlyTeamCalls: 0,
          captainCurrentTier: null,
          updatedAt: now,
        });
      } catch (error) {
        errors++;
        logger.error("[resetCaptainMonthly] Error processing captain", {
          captainId: doc.id,
          error,
        });
      }
    }

    logger.info("[resetCaptainMonthly] Monthly reset complete", {
      monthKey,
      captainsProcessed: captainsQuery.size,
      tierBonusesPaid,
      qualityBonusesPaid,
      errors,
    });
  }
);
