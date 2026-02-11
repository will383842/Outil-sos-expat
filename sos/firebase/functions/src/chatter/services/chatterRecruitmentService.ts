/**
 * Chatter Recruitment Service
 *
 * Harmonized recruitment commission system (mirrors GroupAdmin):
 * $5 ONE-TIME when the recruited chatter reaches $50 in client earnings.
 *
 * Uses atomic Firestore transaction to prevent double payment.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Chatter, ChatterRecruitedChatter } from "../types";
import { getChatterConfigCached } from "../utils/chatterConfigService";

/**
 * Check if a recruited chatter has reached the earning threshold
 * and pay the recruiter a one-time $5 commission.
 *
 * Should be called after each client_call commission is created.
 */
export async function checkAndPayRecruitmentCommission(chatterId: string): Promise<void> {
  const db = getFirestore();

  try {
    // 1. Get chatter data
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return;

    const chatter = chatterDoc.data() as Chatter;
    if (!chatter.recruitedBy) return;

    // 2. Find the recruitment tracking record
    const recruitQuery = await db
      .collection("chatter_recruited_chatters")
      .where("recruiterId", "==", chatter.recruitedBy)
      .where("recruitedId", "==", chatterId)
      .limit(1)
      .get();

    if (recruitQuery.empty) return;

    const recruitDoc = recruitQuery.docs[0];
    const recruit = recruitDoc.data() as ChatterRecruitedChatter;

    // Already paid — skip
    if (recruit.commissionPaid) return;

    // Check commission window
    if (recruit.commissionWindowEnd.toDate() < new Date()) {
      logger.info("[ChatterRecruitment] Window expired, skipping", {
        recruitedId: chatterId,
        recruiterId: chatter.recruitedBy,
      });
      return;
    }

    // 3. Sum all non-cancelled client_call commissions for the recruited chatter
    const commissionsSnapshot = await db
      .collection("chatter_commissions")
      .where("chatterId", "==", chatterId)
      .where("type", "==", "client_call")
      .get();

    let totalEarnedFromCommissions = 0;
    for (const doc of commissionsSnapshot.docs) {
      const c = doc.data();
      if (c.status !== "cancelled") {
        totalEarnedFromCommissions += c.amount;
      }
    }

    // 4. Check threshold
    const config = await getChatterConfigCached();
    const threshold = config.recruitmentCommissionThreshold;

    if (totalEarnedFromCommissions < threshold) return;

    logger.info("[ChatterRecruitment] Threshold reached, paying recruiter", {
      recruitedId: chatterId,
      recruiterId: chatter.recruitedBy,
      totalEarned: totalEarnedFromCommissions,
      threshold,
    });

    // 5. Atomic transaction: mark recruit as paid + create commission
    const recruitRef = recruitDoc.ref;
    const recruiterRef = db.collection("chatters").doc(chatter.recruitedBy);
    const amount = 500; // $5 fixed

    await db.runTransaction(async (tx) => {
      // Re-read inside transaction to guard against concurrent writes
      const freshRecruit = await tx.get(recruitRef);
      if (!freshRecruit.exists || freshRecruit.data()?.commissionPaid === true) {
        return; // Already paid by another process
      }

      // Verify recruiter is still active
      const recruiterSnap = await tx.get(recruiterRef);
      if (!recruiterSnap.exists || (recruiterSnap.data() as Chatter).status !== "active") {
        return;
      }

      // Create commission document
      const commissionRef = db.collection("chatter_commissions").doc();
      const now = Timestamp.now();

      const commission = {
        id: commissionRef.id,
        chatterId: chatter.recruitedBy!,
        type: "recruitment",
        status: "pending",
        amount,
        baseAmount: amount,
        currency: "USD",
        description: `Commission recrutement — ${chatter.firstName} ${chatter.lastName} a atteint $${(threshold / 100).toFixed(0)}`,
        source: {
          id: chatterId,
          type: "recruitment",
          details: {
            recruitedId: chatterId,
            recruitedEmail: chatter.email,
            recruitedName: `${chatter.firstName} ${chatter.lastName}`,
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
        updatedAt: now,
      });

      logger.info("[ChatterRecruitment] Commission created (transaction)", {
        recruiterId: chatter.recruitedBy,
        commissionId: commissionRef.id,
        amount,
        recruitedId: chatterId,
      });
    });
  } catch (error) {
    logger.error("[ChatterRecruitment] Error checking recruitment threshold", {
      chatterId,
      error,
    });
  }
}
