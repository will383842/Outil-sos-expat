/**
 * Callable: markPartnerNotificationRead
 *
 * Partner self-access callable that marks a notification as read.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface MarkNotificationReadInput {
  notificationId: string;
}

export const markPartnerNotificationRead = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 10,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as MarkNotificationReadInput;

    if (!input?.notificationId) {
      throw new HttpsError("invalid-argument", "notificationId is required");
    }

    try {
      const notifRef = db.collection("partner_notifications").doc(input.notificationId);
      const notifDoc = await notifRef.get();

      if (!notifDoc.exists) {
        throw new HttpsError("not-found", "Notification not found");
      }

      const notifData = notifDoc.data();
      if (notifData?.partnerId !== userId) {
        throw new HttpsError("permission-denied", "Not your notification");
      }

      await notifRef.update({
        isRead: true,
        readAt: Timestamp.now(),
      });

      logger.info("[markPartnerNotificationRead] Notification marked as read", {
        partnerId: userId,
        notificationId: input.notificationId,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[markPartnerNotificationRead] Error", { userId, error });
      throw new HttpsError("internal", "Failed to mark notification as read");
    }
  }
);
