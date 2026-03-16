/**
 * Cross-Role Monthly Top 3 Competition
 *
 * Single leaderboard across ALL affiliate roles (chatter, influencer, blogger, groupAdmin, generic affiliate).
 * Cash prizes: 1st=$200, 2nd=$100, 3rd=$50 (no multipliers).
 *
 * Conditions to receive the prize:
 * - Minimum $50 in team commissions (N1+N2) during the month
 * - Minimum 3 new recruitments during the month
 *
 * Runs on the 1st of each month at 01:00 UTC.
 * Stores results in cross_role_monthly_rankings/{YYYY-MM}
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

// ============================================================================
// CONFIG
// ============================================================================

const PRIZES = [
  { place: 1, amount: 20000 }, // $200
  { place: 2, amount: 10000 }, // $100
  { place: 3, amount: 5000 },  // $50
];

const MIN_TEAM_COMMISSIONS = 5000;  // $50 minimum in N1+N2 commissions
const MIN_RECRUITMENTS = 3;         // minimum 3 new recruits in the month

// ============================================================================
// TYPES
// ============================================================================

interface AffiliateEntry {
  id: string;
  role: string;
  collection: string;
  commissionCollection: string;
  totalClientCommissions: number;  // cents
  totalN1Commissions: number;      // cents
  totalN2Commissions: number;      // cents
  totalTeamCommissions: number;    // N1 + N2
  totalAll: number;                // client + N1 + N2
  newRecruits: number;
  meetsConditions: boolean;
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

export const crossRoleMonthlyTop3 = onSchedule(
  {
    schedule: "0 1 1 * *", // 1st of month at 01:00 UTC
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const now = new Date();

    // Calculate previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStart = Timestamp.fromDate(prevMonth);
    const monthEnd = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

    logger.info("[crossRoleTop3] Starting for month", { monthKey });

    // Check if already processed
    const existingDoc = await db.doc(`cross_role_monthly_rankings/${monthKey}`).get();
    if (existingDoc.exists && existingDoc.data()?.processed) {
      logger.info("[crossRoleTop3] Already processed for month", { monthKey });
      return;
    }

    // Collect all affiliates
    const allEntries: AffiliateEntry[] = [];

    // Role definitions: { collection, commissionCollection, idField }
    const roles = [
      { role: "chatter", collection: "chatters", commissionCollection: "chatter_commissions", idField: "chatterId" },
      { role: "influencer", collection: "influencers", commissionCollection: "influencer_commissions", idField: "influencerId" },
      { role: "blogger", collection: "bloggers", commissionCollection: "blogger_commissions", idField: "bloggerId" },
      { role: "groupAdmin", collection: "group_admins", commissionCollection: "group_admin_commissions", idField: "groupAdminId" },
    ];

    for (const roleDef of roles) {
      try {
        // Get all active affiliates for this role
        const affiliatesSnap = await db.collection(roleDef.collection)
          .where("status", "==", "active")
          .get();

        for (const doc of affiliatesSnap.docs) {
          // Get commissions for this month
          const commissionsSnap = await db.collection(roleDef.commissionCollection)
            .where(roleDef.idField, "==", doc.id)
            .where("createdAt", ">=", monthStart)
            .where("createdAt", "<", monthEnd)
            .get();

          let clientTotal = 0;
          let n1Total = 0;
          let n2Total = 0;

          for (const commDoc of commissionsSnap.docs) {
            const comm = commDoc.data();
            if (comm.status === "cancelled" || comm.status === "rejected") continue;

            const type = comm.type;
            const amount = comm.amount || 0;

            if (type === "client_call" || type === "client_referral") {
              clientTotal += amount;
            } else if (type === "n1_call") {
              n1Total += amount;
            } else if (type === "n2_call") {
              n2Total += amount;
            }
          }

          // Count new recruits this month
          let newRecruits = 0;
          const recruitsSnap = await db.collection(roleDef.collection)
            .where("recruitedBy", "==", doc.id)
            .where("createdAt", ">=", monthStart)
            .where("createdAt", "<", monthEnd)
            .get();
          newRecruits = recruitsSnap.size;

          const teamTotal = n1Total + n2Total;
          const total = clientTotal + teamTotal;

          if (total > 0) {
            allEntries.push({
              id: doc.id,
              role: roleDef.role,
              collection: roleDef.collection,
              commissionCollection: roleDef.commissionCollection,
              totalClientCommissions: clientTotal,
              totalN1Commissions: n1Total,
              totalN2Commissions: n2Total,
              totalTeamCommissions: teamTotal,
              totalAll: total,
              newRecruits,
              meetsConditions: teamTotal >= MIN_TEAM_COMMISSIONS && newRecruits >= MIN_RECRUITMENTS,
            });
          }
        }
      } catch (error) {
        logger.error(`[crossRoleTop3] Error processing role ${roleDef.role}`, { error });
      }
    }

    // Also process generic affiliates (users with affiliateCode)
    try {
      const usersSnap = await db.collection("users")
        .where("affiliateCode", "!=", null)
        .get();

      for (const doc of usersSnap.docs) {
        // Skip users who are already counted in a specific role
        const userId = doc.id;
        if (allEntries.some(e => e.id === userId)) continue;

        const commissionsSnap = await db.collection("affiliate_commissions")
          .where("referrerId", "==", userId)
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<", monthEnd)
          .get();

        let clientTotal = 0;
        let n1Total = 0;
        let n2Total = 0;

        for (const commDoc of commissionsSnap.docs) {
          const comm = commDoc.data();
          if (comm.status === "cancelled" || comm.status === "rejected") continue;
          const type = comm.type;
          const amount = comm.amount || 0;
          if (type === "referral_first_call" || type === "referral_recurring_call") clientTotal += amount;
          else if (type === "n1_call") n1Total += amount;
          else if (type === "n2_call") n2Total += amount;
        }

        // Count referrals this month
        const referralsSnap = await db.collection("users")
          .where("referredBy", "==", userId)
          .where("createdAt", ">=", monthStart)
          .where("createdAt", "<", monthEnd)
          .get();

        const teamTotal = n1Total + n2Total;
        const total = clientTotal + teamTotal;

        if (total > 0) {
          allEntries.push({
            id: userId,
            role: "affiliate",
            collection: "users",
            commissionCollection: "affiliate_commissions",
            totalClientCommissions: clientTotal,
            totalN1Commissions: n1Total,
            totalN2Commissions: n2Total,
            totalTeamCommissions: teamTotal,
            totalAll: total,
            newRecruits: referralsSnap.size,
            meetsConditions: teamTotal >= MIN_TEAM_COMMISSIONS && referralsSnap.size >= MIN_RECRUITMENTS,
          });
        }
      }
    } catch (error) {
      logger.error("[crossRoleTop3] Error processing generic affiliates", { error });
    }

    // Sort by total (all commissions) descending
    allEntries.sort((a, b) => b.totalAll - a.totalAll);

    // Find top 3 who meet conditions
    const winners: AffiliateEntry[] = [];
    for (const entry of allEntries) {
      if (winners.length >= 3) break;
      if (entry.meetsConditions) {
        winners.push(entry);
      }
    }

    logger.info("[crossRoleTop3] Results", {
      monthKey,
      totalEntries: allEntries.length,
      eligibleEntries: allEntries.filter(e => e.meetsConditions).length,
      winners: winners.map(w => ({ id: w.id, role: w.role, total: w.totalAll })),
    });

    // Pay prizes
    const batch = db.batch();
    const prizeResults: Array<{
      place: number;
      affiliateId: string;
      role: string;
      amount: number;
      totalCommissions: number;
    }> = [];

    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const prize = PRIZES[i];

      // Create commission in the winner's commission collection
      const commRef = db.collection(winner.commissionCollection).doc();
      const idField = winner.role === "affiliate" ? "referrerId" : `${winner.role}Id`;

      batch.set(commRef, {
        id: commRef.id,
        [idField]: winner.id,
        type: "bonus_top3",
        amount: prize.amount,
        status: "validated",
        source: {
          id: null,
          type: "competition",
          details: {
            monthKey,
            place: prize.place,
            totalCommissions: winner.totalAll,
            teamCommissions: winner.totalTeamCommissions,
            newRecruits: winner.newRecruits,
            crossRole: true,
          },
        },
        description: `Top 3 mensuel cross-rôle — ${prize.place}${prize.place === 1 ? "er" : "e"} place ($${prize.amount / 100})`,
        createdAt: Timestamp.now(),
        validatedAt: Timestamp.now(),
        availableAt: Timestamp.now(),
      });

      // Credit winner's balance
      batch.update(db.collection(winner.collection).doc(winner.id), {
        availableBalance: FieldValue.increment(prize.amount),
        totalEarned: FieldValue.increment(prize.amount),
      });

      prizeResults.push({
        place: prize.place,
        affiliateId: winner.id,
        role: winner.role,
        amount: prize.amount,
        totalCommissions: winner.totalAll,
      });
    }

    // Store ranking document
    batch.set(db.doc(`cross_role_monthly_rankings/${monthKey}`), {
      monthKey,
      processed: true,
      processedAt: Timestamp.now(),
      totalParticipants: allEntries.length,
      eligibleParticipants: allEntries.filter(e => e.meetsConditions).length,
      conditions: {
        minTeamCommissions: MIN_TEAM_COMMISSIONS,
        minRecruitments: MIN_RECRUITMENTS,
      },
      prizes: PRIZES,
      winners: prizeResults,
      // Top 10 for leaderboard display
      leaderboard: allEntries.slice(0, 10).map((e, idx) => ({
        rank: idx + 1,
        affiliateId: e.id,
        role: e.role,
        totalAll: e.totalAll,
        totalTeam: e.totalTeamCommissions,
        newRecruits: e.newRecruits,
        meetsConditions: e.meetsConditions,
      })),
    });

    await batch.commit();

    logger.info("[crossRoleTop3] Completed", {
      monthKey,
      winnersCount: prizeResults.length,
      totalPrizesPaid: prizeResults.reduce((sum, p) => sum + p.amount, 0),
    });
  }
);
