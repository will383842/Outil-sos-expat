/**
 * Admin callables for managing chatter drip messages
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { chatterAdminConfig as adminConfig } from "../../lib/functionConfigs";
import { sendDripMessageManual } from "../triggers/sendDripMessage";

/**
 * Manually send a drip message to a specific chatter (admin only)
 */
export const chatter_sendDripMessage = onCall(
  adminConfig,
  async (request): Promise<{ success: boolean; error?: string }> => {
    // Check admin auth
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { chatterId, day } = request.data as { chatterId: string; day: number };

    if (!chatterId || day === undefined) {
      throw new HttpsError("invalid-argument", "chatterId and day are required");
    }

    if (day < 0 || day > 90) {
      throw new HttpsError("invalid-argument", "day must be between 0 and 90");
    }

    try {
      const result = await sendDripMessageManual(chatterId, day);
      return result;
    } catch (error) {
      logger.error("[chatter_sendDripMessage] Error:", error);
      throw new HttpsError("internal", "Failed to send drip message");
    }
  }
);

/**
 * Get drip message stats for a chatter
 */
export const chatter_getDripStats = onCall(
  adminConfig,
  async (request): Promise<{
    success: boolean;
    currentDay?: number;
    lastDripDay?: number;
    totalMessages?: number;
  }> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { chatterId } = request.data as { chatterId: string };

    if (!chatterId) {
      throw new HttpsError("invalid-argument", "chatterId is required");
    }

    const db = getFirestore();

    try {
      const chatterDoc = await db.collection("chatters").doc(chatterId).get();
      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter not found");
      }

      const chatter = chatterDoc.data();
      const registeredAt = chatter?.registeredAt?.toDate();

      if (!registeredAt) {
        return { success: true, currentDay: 0, lastDripDay: -1, totalMessages: 0 };
      }

      const now = new Date();
      const currentDay = Math.floor((now.getTime() - registeredAt.getTime()) / (1000 * 60 * 60 * 24));

      // Count how many drip messages exist
      const messagesSnapshot = await db.collection("chatter_drip_messages").get();

      return {
        success: true,
        currentDay: Math.min(currentDay, 90),
        lastDripDay: chatter?.lastDripMessageDay ?? -1,
        totalMessages: messagesSnapshot.size,
      };
    } catch (error) {
      logger.error("[chatter_getDripStats] Error:", error);
      throw new HttpsError("internal", "Failed to get drip stats");
    }
  }
);

/**
 * Preview a drip message without sending it
 */
export const chatter_previewDripMessage = onCall(
  adminConfig,
  async (request): Promise<{
    success: boolean;
    message?: string;
    day?: number;
    language?: string;
  }> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { day, language = "fr" } = request.data as { day: number; language?: string };

    if (day === undefined || day < 0 || day > 90) {
      throw new HttpsError("invalid-argument", "day must be between 0 and 90");
    }

    const db = getFirestore();

    try {
      const messageDoc = await db.collection("chatter_drip_messages").doc(`day_${day}`).get();

      if (!messageDoc.exists) {
        throw new HttpsError("not-found", `No message found for day ${day}`);
      }

      const dripMessage = messageDoc.data();
      const messageText = dripMessage?.messages?.[language] || dripMessage?.messages?.fr;

      if (!messageText) {
        throw new HttpsError("not-found", `No message found for language ${language}`);
      }

      return {
        success: true,
        message: messageText,
        day,
        language,
      };
    } catch (error) {
      logger.error("[chatter_previewDripMessage] Error:", error);
      throw new HttpsError("internal", "Failed to preview message");
    }
  }
);
