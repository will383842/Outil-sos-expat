/**
 * Influencer Recruitment Service
 *
 * Harmonized recruitment commission system (mirrors GroupAdmin):
 * $5 ONE-TIME when the recruited influencer reaches $50 in client earnings.
 *
 * Uses atomic Firestore transaction to prevent double payment.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Influencer, InfluencerRecruitedInfluencer } from "../types";
import { getInfluencerConfigCached } from "../utils/influencerConfigService";

/**
 * Check if a recruited influencer has reached the earning threshold
 * and pay the recruiter a one-time $5 commission.
 *
 * Should be called after each client_referral commission is created.
 */
export async function checkAndPayRecruitmentCommission(influencerId: string): Promise<void> {
  const db = getFirestore();

  try {
    // 1. Get influencer data
    const influencerDoc = await db.collection("influencers").doc(influencerId).get();
    if (!influencerDoc.exists) return;

    const influencer = influencerDoc.data() as Influencer;
    if (!influencer.recruitedBy) return;

    // 2. Find the recruitment tracking record
    const recruitQuery = await db
      .collection("influencer_recruited_influencers")
      .where("recruiterId", "==", influencer.recruitedBy)
      .where("recruitedId", "==", influencerId)
      .limit(1)
      .get();

    if (recruitQuery.empty) return;

    const recruitDoc = recruitQuery.docs[0];
    const recruit = recruitDoc.data() as InfluencerRecruitedInfluencer;

    // Already paid — skip
    if (recruit.commissionPaid) return;

    // Check commission window
    if (recruit.commissionWindowEnd.toDate() < new Date()) {
      logger.info("[InfluencerRecruitment] Window expired, skipping", {
        recruitedId: influencerId,
        recruiterId: influencer.recruitedBy,
      });
      return;
    }

    // 3. Sum all non-cancelled client_referral commissions for the recruited influencer
    const commissionsSnapshot = await db
      .collection("influencer_commissions")
      .where("influencerId", "==", influencerId)
      .where("type", "==", "client_referral")
      .get();

    let totalEarnedFromCommissions = 0;
    for (const doc of commissionsSnapshot.docs) {
      const c = doc.data();
      if (c.status !== "cancelled") {
        totalEarnedFromCommissions += c.amount;
      }
    }

    // 4. Check threshold
    const config = await getInfluencerConfigCached();
    const threshold = config.recruitmentCommissionThreshold;

    if (totalEarnedFromCommissions < threshold) return;

    logger.info("[InfluencerRecruitment] Threshold reached, paying recruiter", {
      recruitedId: influencerId,
      recruiterId: influencer.recruitedBy,
      totalEarned: totalEarnedFromCommissions,
      threshold,
    });

    // 5. Atomic transaction: mark recruit as paid + create commission
    const recruitRef = recruitDoc.ref;
    const recruiterRef = db.collection("influencers").doc(influencer.recruitedBy);
    const amount = config.recruitmentCommissionAmount ?? 500; // from config, fallback $5

    await db.runTransaction(async (tx) => {
      // Re-read inside transaction to guard against concurrent writes
      const freshRecruit = await tx.get(recruitRef);
      if (!freshRecruit.exists || freshRecruit.data()?.commissionPaid === true) {
        return; // Already paid by another process
      }

      // Verify recruiter is still active
      const recruiterSnap = await tx.get(recruiterRef);
      if (!recruiterSnap.exists || (recruiterSnap.data() as Influencer).status !== "active") {
        return;
      }

      const recruiter = recruiterSnap.data() as Influencer;

      // Create commission document
      const commissionRef = db.collection("influencer_commissions").doc();
      const now = Timestamp.now();
      const currentMonth = new Date().toISOString().substring(0, 7);

      const commission = {
        id: commissionRef.id,
        influencerId: influencer.recruitedBy!,
        type: "recruitment",
        status: "pending",
        amount,
        baseAmount: amount,
        currency: "USD",
        description: `Commission recrutement — ${influencer.firstName} ${influencer.lastName} a atteint $${(threshold / 100).toFixed(0)}`,
        source: {
          id: influencerId,
          type: "recruitment",
          details: {
            recruitedId: influencerId,
            recruitedEmail: influencer.email,
            recruitedName: `${influencer.firstName} ${influencer.lastName}`,
            totalEarned: totalEarnedFromCommissions,
            threshold,
          },
        },
        createdAt: now,
        updatedAt: now,
      };

      tx.set(commissionRef, commission);

      // Mark recruitment record as paid
      tx.update(recruitRef, {
        commissionPaid: true,
        commissionId: commissionRef.id,
        commissionPaidAt: now,
      });

      // Update recruiter stats
      tx.update(recruiterRef, {
        totalRecruits: FieldValue.increment(1),
        totalCommissions: FieldValue.increment(1),
        pendingBalance: FieldValue.increment(amount),
        "currentMonthStats.recruits": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(1)
          : 1,
        "currentMonthStats.earnings": recruiter.currentMonthStats.month === currentMonth
          ? FieldValue.increment(amount)
          : amount,
        "currentMonthStats.month": currentMonth,
        updatedAt: now,
      });

      logger.info("[InfluencerRecruitment] Commission created (transaction)", {
        recruiterId: influencer.recruitedBy,
        commissionId: commissionRef.id,
        amount,
        recruitedId: influencerId,
      });
    });
  } catch (error) {
    logger.error("[InfluencerRecruitment] Error checking recruitment threshold", {
      influencerId,
      error,
    });
  }
}
