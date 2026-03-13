/**
 * Monthly Top 3 Rewards Scheduled Function (Influencer)
 *
 * Runs on the 1st of each month at 00:45 UTC.
 * Calculates rankings from the previous month and awards
 * CASH BONUSES to the top 3 influencers.
 *
 * Top 1: $200 cash bonus
 * Top 2: $100 cash bonus
 * Top 3: $50 cash bonus
 *
 * Eligibility: minimum $200 in MONTHLY earnings (current month only)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Influencer } from "../types";
import { getInfluencerConfigCached } from "../utils/influencerConfigService";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/** Cash bonus amounts for Top 3 (in cents) */
const MONTHLY_TOP3_CASH_BONUS: Record<number, number> = {
  1: 20000, // $200
  2: 10000, // $100
  3: 5000,  // $50
};

/** Minimum MONTHLY earnings in cents to be eligible for Top 3 bonus */
const MONTHLY_TOP3_MIN_ELIGIBILITY = 20000; // $200

/**
 * Calculate and apply monthly Top 3 rewards
 * Cron: 45 0 1 * * (1st of each month, 00:45 UTC)
 */
export const influencerMonthlyTop3Rewards = onSchedule(
  {
    schedule: "45 0 1 * *",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();

    const db = getFirestore();
    const config = await getInfluencerConfigCached();

    if (!config.isSystemActive) {
      logger.info("[influencerMonthlyTop3Rewards] System not active, skipping");
      return;
    }

    // Calculate previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthStr = prevMonth.toISOString().substring(0, 7); // YYYY-MM

    logger.info("[influencerMonthlyTop3Rewards] Processing", {
      previousMonth: previousMonthStr,
    });

    try {
      // 1. Get all active influencers with earnings in the previous month
      const influencersSnapshot = await db
        .collection("influencers")
        .where("status", "==", "active")
        .get();

      const rankedInfluencers: {
        id: string;
        name: string;
        earnings: number;
        clients: number;
      }[] = [];

      for (const doc of influencersSnapshot.docs) {
        const influencer = doc.data() as Influencer;

        if (
          influencer.currentMonthStats &&
          influencer.currentMonthStats.month === previousMonthStr &&
          influencer.currentMonthStats.earnings > 0
        ) {
          rankedInfluencers.push({
            id: doc.id,
            name: `${influencer.firstName} ${influencer.lastName}`,
            earnings: influencer.currentMonthStats.earnings,
            clients: influencer.currentMonthStats.clients,
          });
        }
      }

      // 2. Sort by earnings (desc), then by clients (desc) as tiebreaker
      rankedInfluencers.sort((a, b) => {
        if (b.earnings !== a.earnings) return b.earnings - a.earnings;
        return b.clients - a.clients;
      });

      // 3. Store rankings
      const rankingRef = db
        .collection("influencer_monthly_rankings")
        .doc(previousMonthStr);

      await rankingRef.set({
        month: previousMonthStr,
        rankings: rankedInfluencers.slice(0, 10).map((inf, index) => ({
          rank: index + 1,
          influencerId: inf.id,
          name: inf.name,
          earnings: inf.earnings,
          clients: inf.clients,
        })),
        totalParticipants: rankedInfluencers.length,
        calculatedAt: Timestamp.now(),
      });

      // 4. Award CASH BONUSES to top 3 (no multipliers)
      for (let i = 0; i < Math.min(3, rankedInfluencers.length); i++) {
        const ranked = rankedInfluencers[i];
        const rank = i + 1;
        const bonusAmount = MONTHLY_TOP3_CASH_BONUS[rank];

        if (!bonusAmount) continue;

        // Check eligibility: minimum $200 in MONTHLY earnings
        if (ranked.earnings < MONTHLY_TOP3_MIN_ELIGIBILITY) {
          logger.info("[influencerMonthlyTop3Rewards] Not eligible (monthly earnings below minimum)", {
            rank,
            influencerId: ranked.id,
            monthlyEarnings: ranked.earnings,
            minRequired: MONTHLY_TOP3_MIN_ELIGIBILITY,
          });
          continue;
        }

        const bonusDollars = (bonusAmount / 100).toFixed(0);

        // Create cash bonus commission
        const commissionRef = db.collection("influencer_commissions").doc();
        await commissionRef.set({
          id: commissionRef.id,
          influencerId: ranked.id,
          type: "bonus_top3",
          sourceType: "bonus",
          sourceDetails: {
            bonusType: "monthly_top3",
            bonusReason: `Top ${rank} du mois ${previousMonthStr} — prime de $${bonusDollars}`,
            rank,
            month: previousMonthStr,
          },
          baseAmount: bonusAmount,
          amount: bonusAmount,
          description: `Prime mensuelle Top ${rank} — $${bonusDollars}`,
          calculationDetails: `Prime Top ${rank}: $${bonusDollars}`,
          currency: "USD",
          status: "available",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          availableAt: Timestamp.now(),
        });

        // Credit balance immediately
        await db.collection("influencers").doc(ranked.id).update({
          availableBalance: FieldValue.increment(bonusAmount),
          totalEarned: FieldValue.increment(bonusAmount),
          currentMonthRank: rank,
          updatedAt: Timestamp.now(),
        });

        // Create notification
        const notificationRef = db.collection("influencer_notifications").doc();
        const rankLabel = rank === 1 ? "1er" : `${rank}ème`;

        await notificationRef.set({
          id: notificationRef.id,
          influencerId: ranked.id,
          type: "top3_reward",
          title: `Top ${rank} du mois — $${bonusDollars} !`,
          titleTranslations: { en: `Monthly Top ${rank} — $${bonusDollars}!` },
          message: `Félicitations ! Vous êtes ${rankLabel} du classement de ${previousMonthStr}. Une prime de $${bonusDollars} a été créditée sur votre solde !`,
          messageTranslations: {
            en: `Congratulations! You ranked #${rank} in ${previousMonthStr}. A $${bonusDollars} bonus has been credited to your balance!`,
          },
          actionUrl: "/influencer/classement",
          isRead: false,
          emailSent: false,
          data: { rank, month: previousMonthStr, bonusAmount },
          createdAt: Timestamp.now(),
        });

        logger.info("[influencerMonthlyTop3Rewards] Cash bonus awarded", {
          rank,
          influencerId: ranked.id,
          bonusAmount,
        });
      }

      // 5. Reset currentMonthRank for non-top-3
      const batch = db.batch();
      let resetCount = 0;

      for (const doc of influencersSnapshot.docs) {
        const influencer = doc.data() as Influencer;
        const isTop3 = rankedInfluencers.slice(0, 3).some((r) => r.id === doc.id);

        if (!isTop3 && influencer.currentMonthRank) {
          batch.update(doc.ref, {
            currentMonthRank: null,
            updatedAt: Timestamp.now(),
          });
          resetCount++;
        }
      }

      if (resetCount > 0) {
        await batch.commit();
      }

      logger.info("[influencerMonthlyTop3Rewards] Complete", {
        month: previousMonthStr,
        totalParticipants: rankedInfluencers.length,
        top3Applied: Math.min(3, rankedInfluencers.length),
        ranksReset: resetCount,
      });
    } catch (error) {
      logger.error("[influencerMonthlyTop3Rewards] Error", { error });
    }
  }
);
