/**
 * Chatter Drip Messages - Automated Motivation Campaign via Telegram
 *
 * Sends 62 motivation messages over 90 days to chatters via Telegram
 * to onboard, train, and motivate them to maximize their earnings.
 *
 * Schedule: Daily at 10:00 AM Europe/Paris
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { scheduledConfig } from "../../lib/functionConfigs";
import { enqueueTelegramMessage } from "../../telegram/queue/enqueue";

// Import drip messages data
// Note: This will be loaded from Firestore collection 'chatter_drip_messages'

interface DripMessage {
  day: number;
  messages: Record<string, string>;
}

interface Chatter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telegramId?: number;
  language?: string;
  registeredAt: Timestamp;
  lastDripMessageDay?: number;
}

/**
 * Send drip messages daily to chatters based on their registration date
 * Runs every day at 10:00 AM Europe/Paris
 */
export const sendChatterDripMessages = onSchedule(
  {
    ...scheduledConfig,
    region: "europe-west3" as const, // FIX: match deployed region (chatter scheduled functions are in west3)
    memory: "256MiB" as const,
    schedule: "0 10 * * *", // Every day at 10:00 AM
    timeZone: "Europe/Paris",
    timeoutSeconds: 540, // 9 minutes (lots of chatters to process)
  },
  async () => {
    const db = getFirestore();

    try {
      logger.info("[sendChatterDripMessages] Starting daily drip message job");

      // 1. Get all active chatters with Telegram connected
      const chattersSnapshot = await db
        .collection("chatters")
        .where("status", "==", "active")
        .where("telegramId", "!=", null)
        .get();

      if (chattersSnapshot.empty) {
        logger.info("[sendChatterDripMessages] No chatters with Telegram found");
        return;
      }

      logger.info(`[sendChatterDripMessages] Processing ${chattersSnapshot.size} chatters`);

      let messagesSent = 0;
      let messagesSkipped = 0;
      const errors: string[] = [];

      // 2. For each chatter, calculate which day they are on
      for (const chatterDoc of chattersSnapshot.docs) {
        const chatter = { id: chatterDoc.id, ...chatterDoc.data() } as Chatter;

        try {
          // Calculate days since registration
          const registeredAt = chatter.registeredAt?.toDate();
          if (!registeredAt) {
            logger.warn(`[sendChatterDripMessages] Chatter ${chatter.id} has no registeredAt`);
            messagesSkipped++;
            continue;
          }

          const now = new Date();
          const daysSinceRegistration = Math.floor(
            (now.getTime() - registeredAt.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Only send messages for days 0-90
          if (daysSinceRegistration > 90) {
            messagesSkipped++;
            continue;
          }

          // Check if we already sent today's message
          const lastDripDay = chatter.lastDripMessageDay ?? -1;
          if (lastDripDay >= daysSinceRegistration) {
            messagesSkipped++;
            continue; // Already sent today's message
          }

          // 3. Get the message for this day
          const messageDoc = await db
            .collection("chatter_drip_messages")
            .doc(`day_${daysSinceRegistration}`)
            .get();

          if (!messageDoc.exists) {
            // No message scheduled for this day
            messagesSkipped++;
            continue;
          }

          const dripMessage = messageDoc.data() as DripMessage;

          // 4. Get message in chatter's language (default to French)
          const chatterLang = chatter.language || "fr";
          const messageText = dripMessage.messages[chatterLang] || dripMessage.messages.fr;

          if (!messageText) {
            logger.warn(`[sendChatterDripMessages] No message found for day ${daysSinceRegistration}`);
            messagesSkipped++;
            continue;
          }

          // 5. Replace variables in message
          const personalizedMessage = messageText.replace(/\{\{firstName\}\}/g, chatter.firstName);

          // 6. Send via Telegram global queue (rate-limited, with retries)
          await enqueueTelegramMessage(chatter.telegramId!, personalizedMessage, {
            parseMode: "HTML",
            priority: "campaign",
            sourceEventType: `chatter_drip_day_${daysSinceRegistration}`,
          });

          // 7. Update chatter's lastDripMessageDay
          await db.collection("chatters").doc(chatter.id).update({
            lastDripMessageDay: daysSinceRegistration,
            updatedAt: Timestamp.now(),
          });

          messagesSent++;
          logger.info(
            `[sendChatterDripMessages] Sent day ${daysSinceRegistration} message to ${chatter.firstName} (${chatter.id})`
          );
        } catch (error) {
          const errorMsg = `Error processing chatter ${chatter.id}: ${error}`;
          logger.error(`[sendChatterDripMessages] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      logger.info(
        `[sendChatterDripMessages] Job complete: ${messagesSent} sent, ${messagesSkipped} skipped, ${errors.length} errors`
      );

      if (errors.length > 0) {
        logger.error(`[sendChatterDripMessages] Errors encountered:`, errors);
      }
    } catch (error) {
      logger.error("[sendChatterDripMessages] Fatal error:", error);
      throw error;
    }
  }
);

/**
 * Manual callable to send a specific drip message to a chatter (for testing)
 */
export const sendDripMessageManual = async (
  chatterId: string,
  day: number
): Promise<{ success: boolean; error?: string }> => {
  const db = getFirestore();

  try {
    // Get chatter
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) {
      return { success: false, error: "Chatter not found" };
    }

    const chatter = { id: chatterDoc.id, ...chatterDoc.data() } as Chatter;

    if (!chatter.telegramId) {
      return { success: false, error: "Chatter has no Telegram connected" };
    }

    // Get message
    const messageDoc = await db.collection("chatter_drip_messages").doc(`day_${day}`).get();
    if (!messageDoc.exists) {
      return { success: false, error: `No message found for day ${day}` };
    }

    const dripMessage = messageDoc.data() as DripMessage;
    const chatterLang = chatter.language || "fr";
    const messageText = dripMessage.messages[chatterLang] || dripMessage.messages.fr;

    if (!messageText) {
      return { success: false, error: "Message text not found" };
    }

    const personalizedMessage = messageText.replace(/\{\{firstName\}\}/g, chatter.firstName);

    // Queue message via global Telegram queue
    await enqueueTelegramMessage(chatter.telegramId!, personalizedMessage, {
      parseMode: "HTML",
      priority: "realtime",
      sourceEventType: `chatter_drip_manual_day_${day}`,
    });

    return { success: true };
  } catch (error) {
    logger.error("[sendDripMessageManual] Error:", error);
    return { success: false, error: String(error) };
  }
};
