/**
 * Blogger Recruitment Service
 *
 * Harmonized recruitment commission system (mirrors GroupAdmin):
 * $5 ONE-TIME when the recruited blogger reaches $50 in client earnings.
 *
 * Uses atomic Firestore transaction to prevent double payment.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger, BloggerRecruitedBlogger } from "../types";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";

/**
 * Check if a recruited blogger has reached the earning threshold
 * and pay the recruiter a one-time $5 commission.
 *
 * Should be called after each client_referral commission is created.
 */
export async function checkAndPayRecruitmentCommission(bloggerId: string): Promise<void> {
  const db = getFirestore();

  try {
    // 1. Get blogger data
    const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();
    if (!bloggerDoc.exists) return;

    const blogger = bloggerDoc.data() as Blogger;
    if (!blogger.recruitedBy) return;

    // 2. Find the recruitment tracking record
    const recruitQuery = await db
      .collection("blogger_recruited_bloggers")
      .where("recruiterId", "==", blogger.recruitedBy)
      .where("recruitedId", "==", bloggerId)
      .limit(1)
      .get();

    if (recruitQuery.empty) return;

    const recruitDoc = recruitQuery.docs[0];
    const recruit = recruitDoc.data() as BloggerRecruitedBlogger;

    // Already paid — skip
    if (recruit.commissionPaid) return;

    // Check commission window
    if (recruit.commissionWindowEnd.toDate() < new Date()) {
      logger.info("[BloggerRecruitment] Window expired, skipping", {
        recruitedId: bloggerId,
        recruiterId: blogger.recruitedBy,
      });
      return;
    }

    // 3. Sum all non-cancelled client_referral commissions for the recruited blogger
    const commissionsSnapshot = await db
      .collection("blogger_commissions")
      .where("bloggerId", "==", bloggerId)
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
    const config = await getBloggerConfigCached();
    const threshold = config.recruitmentCommissionThreshold;

    if (totalEarnedFromCommissions < threshold) return;

    logger.info("[BloggerRecruitment] Threshold reached, paying recruiter", {
      recruitedId: bloggerId,
      recruiterId: blogger.recruitedBy,
      totalEarned: totalEarnedFromCommissions,
      threshold,
    });

    // 5. Atomic transaction: mark recruit as paid + create commission
    const recruitRef = recruitDoc.ref;
    const recruiterRef = db.collection("bloggers").doc(blogger.recruitedBy);
    const amount = 500; // $5 fixed

    await db.runTransaction(async (tx) => {
      // Re-read inside transaction to guard against concurrent writes
      const freshRecruit = await tx.get(recruitRef);
      if (!freshRecruit.exists || freshRecruit.data()?.commissionPaid === true) {
        return; // Already paid by another process
      }

      // Verify recruiter is still active
      const recruiterSnap = await tx.get(recruiterRef);
      if (!recruiterSnap.exists || (recruiterSnap.data() as Blogger).status !== "active") {
        return;
      }

      // Create commission document
      const commissionRef = db.collection("blogger_commissions").doc();
      const now = Timestamp.now();
      const currentMonth = new Date().toISOString().substring(0, 7);

      const commission = {
        id: commissionRef.id,
        bloggerId: blogger.recruitedBy!,
        type: "recruitment",
        status: "pending",
        amount,
        baseAmount: amount,
        currency: "USD",
        description: `Commission recrutement — ${blogger.firstName} ${blogger.lastName} a atteint $${(threshold / 100).toFixed(0)}`,
        source: {
          id: bloggerId,
          type: "recruitment",
          details: {
            recruitedId: bloggerId,
            recruitedEmail: blogger.email,
            recruitedName: `${blogger.firstName} ${blogger.lastName}`,
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
      const recruiter = recruiterSnap.data() as Blogger;
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

      logger.info("[BloggerRecruitment] Commission created (transaction)", {
        recruiterId: blogger.recruitedBy,
        commissionId: commissionRef.id,
        amount,
        recruitedId: bloggerId,
      });
    });
  } catch (error) {
    logger.error("[BloggerRecruitment] Error checking recruitment threshold", {
      bloggerId,
      error,
    });
  }
}
