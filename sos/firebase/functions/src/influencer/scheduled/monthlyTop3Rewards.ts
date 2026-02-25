/**
 * Monthly Top 3 Rewards Scheduled Function
 *
 * Runs on the 1st of each month at 00:45 UTC.
 * Calculates rankings from the previous month and awards
 * commission multipliers to the top 3 influencers.
 *
 * Top 1: 2.00x multiplier for the next month
 * Top 2: 1.50x multiplier for the next month
 * Top 3: 1.15x multiplier for the next month
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Influencer } from "../types";
import { getInfluencerConfigCached } from "../utils/influencerConfigService";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Calculate and apply monthly Top 3 rewards
 * Cron: 45 0 1 * * (1st of each month, 00:45 UTC)
 */
export const influencerMonthlyTop3Rewards = onSchedule(
  {
    schedule: "45 0 1 * *",
    region: "europe-west3",
    memory: "128MiB",
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
    const currentMonthStr = now.toISOString().substring(0, 7);

    logger.info("[influencerMonthlyTop3Rewards] Processing", {
      previousMonth: previousMonthStr,
      currentMonth: currentMonthStr,
    });

    try {
      // 1. Get all active influencers with earnings in the previous month
      const influencersSnapshot = await db
        .collection("influencers")
        .where("status", "==", "active")
        .get();

      // Filter influencers who had earnings in the previous month
      const rankedInfluencers: {
        id: string;
        name: string;
        earnings: number;
        clients: number;
      }[] = [];

      for (const doc of influencersSnapshot.docs) {
        const influencer = doc.data() as Influencer;

        // Check if their currentMonthStats match the previous month
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

      // 4. Apply multipliers to top 3
      const multipliers = [
        config.top1BonusMultiplier,
        config.top2BonusMultiplier,
        config.top3BonusMultiplier,
      ];

      for (let i = 0; i < Math.min(3, rankedInfluencers.length); i++) {
        const ranked = rankedInfluencers[i];
        const multiplier = multipliers[i];

        await db.collection("influencers").doc(ranked.id).update({
          monthlyTopMultiplier: multiplier,
          monthlyTopMultiplierMonth: currentMonthStr,
          currentMonthRank: i + 1,
          bestRank: i + 1, // Will be min'd with existing on read
          updatedAt: Timestamp.now(),
        });

        // Create notification
        const notificationRef = db.collection("influencer_notifications").doc();
        const rankLabel = i === 0 ? "1er" : i === 1 ? "2ème" : "3ème";

        await notificationRef.set({
          id: notificationRef.id,
          influencerId: ranked.id,
          type: "top3_reward",
          title: `Top ${i + 1} du mois !`,
          titleTranslations: { en: `Monthly Top ${i + 1}!` },
          message: `Félicitations ! Vous êtes ${rankLabel} du classement de ${previousMonthStr}. Vous bénéficiez d'un bonus x${multiplier.toFixed(2)} sur vos commissions ce mois-ci.`,
          messageTranslations: {
            en: `Congratulations! You ranked #${i + 1} in ${previousMonthStr}. You receive a x${multiplier.toFixed(2)} bonus on your commissions this month.`,
          },
          actionUrl: "/influencer/classement",
          isRead: false,
          emailSent: false,
          data: {
            rank: i + 1,
            month: previousMonthStr,
            multiplier,
            earnings: ranked.earnings,
          },
          createdAt: Timestamp.now(),
        });

        logger.info("[influencerMonthlyTop3Rewards] Reward applied", {
          rank: i + 1,
          influencerId: ranked.id,
          multiplier,
          earnings: ranked.earnings,
        });
      }

      // 5. Reset monthlyTopMultiplier for all OTHER influencers
      // (those who were top 3 last month but not this month)
      const batch = db.batch();
      let resetCount = 0;

      for (const doc of influencersSnapshot.docs) {
        const influencer = doc.data() as Influencer;
        const isTop3ThisMonth = rankedInfluencers
          .slice(0, 3)
          .some((r) => r.id === doc.id);

        if (
          !isTop3ThisMonth &&
          influencer.monthlyTopMultiplier &&
          influencer.monthlyTopMultiplier > 1.0
        ) {
          batch.update(doc.ref, {
            monthlyTopMultiplier: 1.0,
            monthlyTopMultiplierMonth: null,
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
        multiplierResets: resetCount,
      });
    } catch (error) {
      logger.error("[influencerMonthlyTop3Rewards] Error", { error });
    }
  }
);
