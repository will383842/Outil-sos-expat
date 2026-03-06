/**
 * Scheduled: updatePartnerMonthlyStats
 *
 * Runs daily at 2:00 AM UTC. For each active partner:
 * - Aggregates current month stats from partner_commissions and partner_affiliate_clicks
 * - Writes to partner_monthly_stats/{partnerId}/months/{YYYY-MM}
 * - Resets currentMonthStats on partner doc if month has changed
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import type { Partner, PartnerCommission, PartnerAffiliateClick } from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const BATCH_SIZE = 100;

/**
 * Get current month key in YYYY-MM format
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get start and end timestamps for a given month key
 */
function getMonthBounds(monthKey: string): { start: Timestamp; end: Timestamp } {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  // End = first millisecond of next month
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
}

/**
 * Aggregate stats for a single partner for the current month
 */
async function aggregatePartnerStats(
  partnerId: string,
  monthBounds: { start: Timestamp; end: Timestamp }
): Promise<{
  clicks: number;
  clients: number;
  calls: number;
  earnings: number;
}> {
  const db = getFirestore();

  // Count commissions for this month
  const commissionsSnap = await db
    .collection("partner_commissions")
    .where("partnerId", "==", partnerId)
    .where("createdAt", ">=", monthBounds.start)
    .where("createdAt", "<", monthBounds.end)
    .where("status", "in", ["pending", "validated", "available", "paid"])
    .get();

  let earnings = 0;
  let calls = 0;
  const clientIds = new Set<string>();

  for (const doc of commissionsSnap.docs) {
    const commission = doc.data() as PartnerCommission;
    earnings += commission.amount;
    if (commission.type === "client_referral") {
      calls++;
    }
    if (commission.sourceDetails?.clientId) {
      clientIds.add(commission.sourceDetails.clientId);
    }
  }

  // Count clicks for this month
  const clicksSnap = await db
    .collection("partner_affiliate_clicks")
    .where("partnerId", "==", partnerId)
    .where("clickedAt", ">=", monthBounds.start)
    .where("clickedAt", "<", monthBounds.end)
    .get();

  const clicks = clicksSnap.size;

  // Count unique converted clients from clicks (supplement commission clientIds)
  for (const doc of clicksSnap.docs) {
    const click = doc.data() as PartnerAffiliateClick;
    if (click.converted && click.convertedUserId) {
      clientIds.add(click.convertedUserId);
    }
  }

  return {
    clicks,
    clients: clientIds.size,
    calls,
    earnings,
  };
}

async function processAllPartners(): Promise<{ processed: number; errors: number }> {
  const db = getFirestore();
  const currentMonth = getCurrentMonthKey();
  const monthBounds = getMonthBounds(currentMonth);
  const now = Timestamp.now();

  let processed = 0;
  let errors = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  // Process active partners in batches
  while (true) {
    let query = db
      .collection("partners")
      .where("status", "==", "active")
      .orderBy("createdAt")
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const batch = await query.get();

    if (batch.empty) break;

    for (const partnerDoc of batch.docs) {
      const partner = partnerDoc.data() as Partner;
      const partnerId = partnerDoc.id;

      try {
        // Aggregate current month stats
        const stats = await aggregatePartnerStats(partnerId, monthBounds);

        // Write to monthly stats subcollection
        await db
          .collection("partner_monthly_stats")
          .doc(partnerId)
          .collection("months")
          .doc(currentMonth)
          .set(
            {
              partnerId,
              month: currentMonth,
              clicks: stats.clicks,
              clients: stats.clients,
              calls: stats.calls,
              earnings: stats.earnings,
              conversionRate: stats.clicks > 0
                ? Math.round((stats.clients / stats.clicks) * 10000) / 100
                : 0,
              updatedAt: now,
            },
            { merge: true }
          );

        // Check if month has changed on partner doc and reset if needed
        const partnerMonth = partner.currentMonthStats?.month;
        if (partnerMonth && partnerMonth !== currentMonth) {
          // Month rolled over: reset currentMonthStats
          await db.collection("partners").doc(partnerId).update({
            currentMonthStats: {
              clicks: stats.clicks,
              clients: stats.clients,
              calls: stats.calls,
              earnings: stats.earnings,
              month: currentMonth,
            },
            updatedAt: now,
          });

          logger.info("[updatePartnerMonthlyStats] Month rolled over, stats reset", {
            partnerId,
            previousMonth: partnerMonth,
            newMonth: currentMonth,
          });
        } else {
          // Same month: update with aggregated values
          await db.collection("partners").doc(partnerId).update({
            "currentMonthStats.clicks": stats.clicks,
            "currentMonthStats.clients": stats.clients,
            "currentMonthStats.calls": stats.calls,
            "currentMonthStats.earnings": stats.earnings,
            "currentMonthStats.month": currentMonth,
            updatedAt: now,
          });
        }

        processed++;
      } catch (error) {
        errors++;
        logger.error("[updatePartnerMonthlyStats] Failed to process partner", {
          partnerId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    lastDoc = batch.docs[batch.docs.length - 1];

    if (batch.size < BATCH_SIZE) break;
  }

  return { processed, errors };
}

export const updatePartnerMonthlyStats = onSchedule(
  {
    schedule: "0 2 * * *", // Daily at 2:00 AM UTC
    timeZone: "UTC",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[updatePartnerMonthlyStats] Starting daily stats aggregation", {
      currentMonth: getCurrentMonthKey(),
    });

    try {
      const result = await processAllPartners();

      logger.info("[updatePartnerMonthlyStats] Stats aggregation complete", {
        processed: result.processed,
        errors: result.errors,
        currentMonth: getCurrentMonthKey(),
      });
    } catch (error) {
      logger.error("[updatePartnerMonthlyStats] Fatal error", { error });
      throw error;
    }
  }
);
