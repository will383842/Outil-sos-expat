/**
 * Callable: getPartnerNotifications
 *
 * Partner self-access callable with pagination.
 * Returns partner_notifications ordered by createdAt DESC.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { type PartnerNotification } from "../types";
import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface GetPartnerNotificationsInput {
  limit?: number;
  startAfter?: string; // ISO date string of last notification's createdAt
}

interface GetPartnerNotificationsResponse {
  notifications: PartnerNotification[];
  hasMore: boolean;
  unreadCount: number;
}

export const getPartnerNotifications = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 15,
  },
  async (request): Promise<GetPartnerNotificationsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as GetPartnerNotificationsInput;

    const limit = Math.min(Math.max(input?.limit || 20, 1), 100);

    try {
      // Verify partner exists
      const partnerDoc = await db.collection("partners").doc(userId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner profile not found");
      }

      // Build query
      let query = db
        .collection("partner_notifications")
        .where("partnerId", "==", userId)
        .orderBy("createdAt", "desc") as FirebaseFirestore.Query;

      if (input?.startAfter) {
        const startAfterDate = new Date(input.startAfter);
        query = query.startAfter(Timestamp.fromDate(startAfterDate));
      }

      // Fetch limit + 1 to determine hasMore
      const snap = await query.limit(limit + 1).get();
      const hasMore = snap.docs.length > limit;

      const notifications = snap.docs.slice(0, limit).map((doc) => {
        return doc.data() as PartnerNotification;
      });

      // Get unread count
      const unreadSnap = await db
        .collection("partner_notifications")
        .where("partnerId", "==", userId)
        .where("isRead", "==", false)
        .count()
        .get();

      const unreadCount = unreadSnap.data().count;

      logger.info("[getPartnerNotifications] Notifications returned", {
        partnerId: userId,
        count: notifications.length,
        unreadCount,
      });

      return { notifications, hasMore, unreadCount };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[getPartnerNotifications] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get notifications");
    }
  }
);
