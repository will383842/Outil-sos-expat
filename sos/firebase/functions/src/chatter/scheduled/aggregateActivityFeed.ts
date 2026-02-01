/**
 * Scheduled: aggregateActivityFeed
 *
 * Runs every 5 minutes to aggregate recent chatter activities for the live feed.
 * Collects the last 50 commissions, anonymizes names, and stores them in
 * chatter_activity_feed with a 24-hour TTL.
 *
 * Activity types:
 * - commission: When a chatter earns a commission
 * - signup: When a new chatter joins (handled by trigger)
 * - level_up: When a chatter levels up (handled by trigger)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { ChatterCommission, Chatter } from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Activity feed item structure
 */
export interface ActivityFeedItem {
  id: string;
  type: "commission" | "signup" | "level_up";
  chatterName: string; // Anonymized: "Marie D."
  country: string; // ISO country code: "FR"
  amount?: number; // In cents, for commission type
  level?: number; // For level_up type
  createdAt: Timestamp;
  expiresAt: Timestamp; // TTL 24h
}

/**
 * Anonymize full name to "FirstName L." format
 */
function anonymizeName(firstName: string, lastName: string): string {
  const sanitizedFirstName = firstName?.trim() || "User";
  const lastInitial = lastName?.trim()?.charAt(0)?.toUpperCase() || "";
  return lastInitial ? `${sanitizedFirstName} ${lastInitial}.` : sanitizedFirstName;
}

/**
 * Aggregate activity feed from recent commissions
 */
export const chatterAggregateActivityFeed = onSchedule(
  {
    schedule: "*/30 * * * *", // Every 30 minutes (reduced from 5 min to save costs)
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
    retryCount: 2,
  },
  async () => {
    ensureInitialized();
    const db = getFirestore();

    logger.info("[chatterAggregateActivityFeed] Starting aggregation");

    try {
      // Calculate time boundaries
      const now = Timestamp.now();
      const twentyFourHoursAgo = Timestamp.fromMillis(
        now.toMillis() - 24 * 60 * 60 * 1000
      );
      const expiresAt = Timestamp.fromMillis(
        now.toMillis() + 24 * 60 * 60 * 1000
      );

      // Fetch last 50 commissions from the last 24 hours
      const commissionsQuery = await db
        .collection("chatter_commissions")
        .where("createdAt", ">=", twentyFourHoursAgo)
        .where("status", "in", ["pending", "validated", "available", "paid"])
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      logger.info("[chatterAggregateActivityFeed] Found commissions", {
        count: commissionsQuery.size,
      });

      if (commissionsQuery.empty) {
        logger.info("[chatterAggregateActivityFeed] No recent commissions");
        return;
      }

      // Process commissions and get chatter info
      const chatterIds = new Set<string>();
      const commissions: ChatterCommission[] = [];

      commissionsQuery.forEach((doc) => {
        const commission = doc.data() as ChatterCommission;
        commissions.push(commission);
        chatterIds.add(commission.chatterId);
      });

      // Fetch all related chatters in one batch
      const chatterMap = new Map<string, Chatter>();
      const chatterIdArray = Array.from(chatterIds);

      // Firestore limits 'in' queries to 30 items, so batch if needed
      for (let i = 0; i < chatterIdArray.length; i += 30) {
        const batch = chatterIdArray.slice(i, i + 30);
        const chatterDocs = await db
          .collection("chatters")
          .where("__name__", "in", batch)
          .get();

        chatterDocs.forEach((doc) => {
          chatterMap.set(doc.id, doc.data() as Chatter);
        });
      }

      // Build activity feed items
      const activityItems: ActivityFeedItem[] = [];

      for (const commission of commissions) {
        const chatter = chatterMap.get(commission.chatterId);

        if (!chatter) {
          continue; // Skip if chatter not found
        }

        const activityItem: ActivityFeedItem = {
          id: commission.id,
          type: "commission",
          chatterName: anonymizeName(chatter.firstName, chatter.lastName),
          country: chatter.country || "XX",
          amount: commission.amount,
          createdAt: commission.createdAt,
          expiresAt,
        };

        activityItems.push(activityItem);
      }

      // Delete expired items first
      const expiredQuery = await db
        .collection("chatter_activity_feed")
        .where("expiresAt", "<=", now)
        .limit(100)
        .get();

      if (!expiredQuery.empty) {
        const deleteBatch = db.batch();
        expiredQuery.forEach((doc) => {
          deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
        logger.info("[chatterAggregateActivityFeed] Deleted expired items", {
          count: expiredQuery.size,
        });
      }

      // Write new activity items (upsert by commission ID)
      const writeBatch = db.batch();
      let writeCount = 0;

      for (const item of activityItems) {
        const docRef = db.collection("chatter_activity_feed").doc(item.id);
        writeBatch.set(docRef, item, { merge: true });
        writeCount++;
      }

      if (writeCount > 0) {
        await writeBatch.commit();
      }

      logger.info("[chatterAggregateActivityFeed] Aggregation complete", {
        processed: writeCount,
        expired: expiredQuery.size,
      });
    } catch (error) {
      logger.error("[chatterAggregateActivityFeed] Error", { error });
      throw error;
    }
  }
);

// ============================================================================
// HELPER FUNCTION FOR REAL-TIME ADDITIONS (Used by triggers)
// ============================================================================

/**
 * Add a single activity to the feed (called from triggers)
 */
export async function addActivityToFeed(activity: {
  id: string;
  type: "commission" | "signup" | "level_up";
  chatterId: string;
  amount?: number;
  level?: number;
}): Promise<void> {
  const db = getFirestore();

  try {
    // Get chatter info for anonymization
    const chatterDoc = await db.collection("chatters").doc(activity.chatterId).get();

    if (!chatterDoc.exists) {
      logger.warn("[addActivityToFeed] Chatter not found", {
        chatterId: activity.chatterId,
      });
      return;
    }

    const chatter = chatterDoc.data() as Chatter;
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

    const activityItem: ActivityFeedItem = {
      id: activity.id,
      type: activity.type,
      chatterName: anonymizeName(chatter.firstName, chatter.lastName),
      country: chatter.country || "XX",
      amount: activity.amount,
      level: activity.level,
      createdAt: now,
      expiresAt,
    };

    await db.collection("chatter_activity_feed").doc(activity.id).set(activityItem);

    logger.info("[addActivityToFeed] Activity added", {
      id: activity.id,
      type: activity.type,
    });
  } catch (error) {
    logger.error("[addActivityToFeed] Error", { error, activity });
  }
}
