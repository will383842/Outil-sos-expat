/**
 * Telegram Campaign Processor
 *
 * Scheduled function (every minute, maxInstances: 1) that:
 * 1. Detects campaigns with status "scheduled" whose scheduledAt <= now
 * 2. Enqueues messages for each target user with priority "campaign"
 * 3. Detects campaigns with status "sending" that are complete
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
// SCHEDULED FUNCTION
// ============================================================================

export const processTelegramCampaigns = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
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
        // Get target users
        const usersQuery = buildAudienceQuery(db, campaign.targetAudience);
        const usersSnap = await usersQuery.limit(BATCH_ENQUEUE_SIZE).get();

        let enqueued = 0;
        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          const chatId = userData.telegram_id;
          if (!chatId) continue;

          try {
            await enqueueTelegramMessage(chatId, campaign.message, {
              parseMode: "Markdown",
              priority: "campaign",
              campaignId: doc.id,
            });
            enqueued++;
          } catch (err) {
            console.error(`${LOG_PREFIX} Failed to enqueue for user ${userDoc.id}:`, err);
          }
        }

        // If we enqueued all users in one batch, mark as sending directly
        // Otherwise, we'll continue in subsequent cycles
        const isComplete = usersSnap.docs.length < BATCH_ENQUEUE_SIZE;

        await doc.ref.update({
          status: "sending",
          startedAt: admin.firestore.Timestamp.now(),
          sentCount: admin.firestore.FieldValue.increment(enqueued),
        });

        console.log(`${LOG_PREFIX} Campaign ${doc.id}: enqueued ${enqueued} messages (complete batch: ${isComplete})`);
      } catch (err) {
        console.error(`${LOG_PREFIX} Error starting campaign ${doc.id}:`, err);
      }
    }

    // ========================================================================
    // STEP 2: Check sending campaigns for completion
    // ========================================================================
    const sendingSnap = await db
      .collection(CAMPAIGNS_COLLECTION)
      .where("status", "==", "sending")
      .limit(10)
      .get();

    for (const doc of sendingSnap.docs) {
      try {
        // Check if there are still pending messages in queue for this campaign
        const pendingSnap = await db
          .collection(QUEUE_COLLECTION)
          .where("campaignId", "==", doc.id)
          .where("status", "in", ["pending", "sending"])
          .limit(1)
          .get();

        if (pendingSnap.empty) {
          // All messages processed - count results
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
        console.error(`${LOG_PREFIX} Error checking campaign ${doc.id}:`, err);
      }
    }
  }
);

// ============================================================================
// HELPERS
// ============================================================================

function buildAudienceQuery(
  db: admin.firestore.Firestore,
  targetAudience: string
) {
  const usersRef = db.collection("users");

  if (targetAudience === "all") {
    return usersRef.where("telegram_id", "!=", "");
  }

  const roleMap: Record<string, string> = {
    chatters: "chatter",
    influencers: "influencer",
    bloggers: "blogger",
    groupAdmins: "groupAdmin",
  };

  const role = roleMap[targetAudience] || targetAudience;
  return usersRef
    .where("telegram_id", "!=", "")
    .where("role", "==", role);
}
