/**
 * Telegram Campaign Processor
 *
 * Scheduled function (every minute, maxInstances: 1) that:
 * 1. Detects campaigns with status "scheduled" whose scheduledAt <= now → starts enqueueing
 * 2. Continues enqueueing for "sending" campaigns that still have users to process
 * 3. Detects campaigns with all messages processed → marks as "completed"
 *
 * C4 fix: Proper cursor-based pagination via lastProcessedUserId on campaign doc
 * Multi-role: targetAudience can be a comma-separated string (e.g. "chatters,bloggers")
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { enqueueTelegramMessage } from "./enqueue";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[CampaignProcessor]";
const CAMPAIGNS_COLLECTION = "telegram_campaigns";
const QUEUE_COLLECTION = "telegram_message_queue";
const BATCH_ENQUEUE_SIZE = 50; // Enqueue 50 users per cycle to avoid timeout

// ============================================================================
// ROLE MAPPING
// ============================================================================

const ROLE_MAP: Record<string, string> = {
  chatters: "chatter",
  influencers: "influencer",
  bloggers: "blogger",
  groupAdmins: "groupAdmin",
};

/**
 * Parse targetAudience string into an array of Firestore role values.
 * Supports: "all", single role ("chatters"), multi-role ("chatters,bloggers")
 */
function parseTargetAudience(targetAudience: string): string[] | "all" {
  if (targetAudience === "all") return "all";

  const parts = targetAudience.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.map((part) => ROLE_MAP[part] || part);
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

export const processTelegramCampaigns = onSchedule(
  {
    schedule: "*/5 * * * *", // Every 5 minutes (optimized from every minute - saves ~80% invocations)
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 240, // Increased to process larger batches per run
    maxInstances: 1,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // ========================================================================
    // STEP 1: Start scheduled campaigns whose time has come
    // ========================================================================
    const scheduledSnap = await db
      .collection(CAMPAIGNS_COLLECTION)
      .where("status", "==", "scheduled")
      .where("scheduledAt", "<=", now)
      .limit(5)
      .get();

    for (const doc of scheduledSnap.docs) {
      const campaign = doc.data();
      console.log(`${LOG_PREFIX} Starting campaign ${doc.id}: "${campaign.name}"`);

      try {
        const { enqueued, lastUserId, isComplete } = await enqueueNextBatch(
          db,
          doc.id,
          campaign.message,
          campaign.targetAudience,
          null // No cursor yet — first batch
        );

        await doc.ref.update({
          status: "sending",
          startedAt: admin.firestore.Timestamp.now(),
          sentCount: admin.firestore.FieldValue.increment(enqueued),
          lastProcessedUserId: lastUserId || null,
          enqueuingComplete: isComplete,
        });

        console.log(
          `${LOG_PREFIX} Campaign ${doc.id}: enqueued ${enqueued} messages (complete: ${isComplete})`
        );
      } catch (err) {
        console.error(`${LOG_PREFIX} Error starting campaign ${doc.id}:`, err);
      }
    }

    // ========================================================================
    // STEP 2: Continue enqueueing for campaigns still in progress
    // ========================================================================
    const sendingSnap = await db
      .collection(CAMPAIGNS_COLLECTION)
      .where("status", "==", "sending")
      .limit(10)
      .get();

    for (const doc of sendingSnap.docs) {
      const campaign = doc.data();

      try {
        // If enqueueing is not complete, continue with next batch
        if (campaign.enqueuingComplete !== true && campaign.lastProcessedUserId) {
          const { enqueued, lastUserId, isComplete } = await enqueueNextBatch(
            db,
            doc.id,
            campaign.message,
            campaign.targetAudience,
            campaign.lastProcessedUserId
          );

          const updateData: Record<string, unknown> = {
            sentCount: admin.firestore.FieldValue.increment(enqueued),
            enqueuingComplete: isComplete,
          };
          if (lastUserId) {
            updateData.lastProcessedUserId = lastUserId;
          }

          await doc.ref.update(updateData);

          console.log(
            `${LOG_PREFIX} Campaign ${doc.id}: continued batch, enqueued ${enqueued} (complete: ${isComplete})`
          );

          // Don't check for completion yet if we just enqueued more
          if (!isComplete) continue;
        }

        // Check if all enqueued messages have been processed
        const pendingSnap = await db
          .collection(QUEUE_COLLECTION)
          .where("campaignId", "==", doc.id)
          .where("status", "in", ["pending", "sending"])
          .limit(1)
          .get();

        if (pendingSnap.empty && campaign.enqueuingComplete === true) {
          // All messages processed - count final results
          const sentSnap = await db
            .collection(QUEUE_COLLECTION)
            .where("campaignId", "==", doc.id)
            .where("status", "==", "sent")
            .count()
            .get();
          const failedSnap = await db
            .collection(QUEUE_COLLECTION)
            .where("campaignId", "==", doc.id)
            .where("status", "in", ["failed", "dead"])
            .count()
            .get();

          await doc.ref.update({
            status: "completed",
            completedAt: admin.firestore.Timestamp.now(),
            sentCount: sentSnap.data().count,
            failedCount: failedSnap.data().count,
          });

          console.log(
            `${LOG_PREFIX} Campaign ${doc.id} completed: ${sentSnap.data().count} sent, ${failedSnap.data().count} failed`
          );
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} Error processing campaign ${doc.id}:`, err);
      }
    }
  }
);

// ============================================================================
// BATCH ENQUEUE WITH CURSOR PAGINATION (C4 fix)
// ============================================================================

async function enqueueNextBatch(
  db: admin.firestore.Firestore,
  campaignId: string,
  message: string,
  targetAudience: string,
  lastProcessedUserId: string | null
): Promise<{ enqueued: number; lastUserId: string | null; isComplete: boolean }> {
  const roles = parseTargetAudience(targetAudience);
  let allUserDocs: admin.firestore.QueryDocumentSnapshot[] = [];

  if (roles === "all") {
    // All users with telegram_id
    let q = db
      .collection("users")
      .where("telegram_id", "!=", "")
      .orderBy("telegram_id")
      .orderBy(admin.firestore.FieldPath.documentId());

    if (lastProcessedUserId) {
      const cursorDoc = await db.collection("users").doc(lastProcessedUserId).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snap = await q.limit(BATCH_ENQUEUE_SIZE).get();
    allUserDocs = snap.docs;
  } else {
    // Multi-role support: query each role separately and merge
    const perRoleLimit = Math.ceil(BATCH_ENQUEUE_SIZE / roles.length);

    for (const role of roles) {
      let q = db
        .collection("users")
        .where("telegram_id", "!=", "")
        .where("role", "==", role)
        .orderBy("telegram_id")
        .orderBy(admin.firestore.FieldPath.documentId());

      if (lastProcessedUserId) {
        const cursorDoc = await db.collection("users").doc(lastProcessedUserId).get();
        if (cursorDoc.exists) {
          q = q.startAfter(cursorDoc);
        }
      }

      const snap = await q.limit(perRoleLimit).get();
      allUserDocs.push(...snap.docs);
    }

    // Deduplicate (in case a user appears in multiple role queries)
    const seen = new Set<string>();
    allUserDocs = allUserDocs.filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });
  }

  let enqueued = 0;
  let lastUserId: string | null = null;

  for (const userDoc of allUserDocs) {
    const userData = userDoc.data();
    const chatId = userData.telegram_id;
    if (!chatId) continue;

    try {
      await enqueueTelegramMessage(chatId, message, {
        parseMode: "Markdown",
        priority: "campaign",
        campaignId,
      });
      enqueued++;
      lastUserId = userDoc.id;
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to enqueue for user ${userDoc.id}:`, err);
      lastUserId = userDoc.id; // Still advance cursor past failed user
    }
  }

  const isComplete = allUserDocs.length < BATCH_ENQUEUE_SIZE;

  return { enqueued, lastUserId, isComplete };
}
