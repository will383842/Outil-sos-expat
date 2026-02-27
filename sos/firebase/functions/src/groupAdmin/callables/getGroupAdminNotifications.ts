/**
 * Callable: getGroupAdminNotifications
 *
 * Returns paginated notifications for a GroupAdmin.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { GroupAdminNotification } from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export interface GetGroupAdminNotificationsRequest {
  page?: number;
  limit?: number;
}

export interface GetGroupAdminNotificationsResponse {
  notifications: GroupAdminNotification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  unreadCount: number;
}

export const getGroupAdminNotifications = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 5,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetGroupAdminNotificationsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    const input = request.data as GetGroupAdminNotificationsRequest;
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(50, Math.max(1, input.limit || 20));
    const offset = (page - 1) * limit;

    try {
      // Verify user is a GroupAdmin
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();
      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      // Get total count
      const countSnapshot = await db
        .collection("group_admin_notifications")
        .where("groupAdminId", "==", userId)
        .count()
        .get();
      const total = countSnapshot.data().count;

      // Get unread count
      const unreadSnapshot = await db
        .collection("group_admin_notifications")
        .where("groupAdminId", "==", userId)
        .where("isRead", "==", false)
        .count()
        .get();
      const unreadCount = unreadSnapshot.data().count;

      // Get paginated notifications
      const notificationsSnapshot = await db
        .collection("group_admin_notifications")
        .where("groupAdminId", "==", userId)
        .orderBy("createdAt", "desc")
        .offset(offset)
        .limit(limit)
        .get();

      const notifications: GroupAdminNotification[] = notificationsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminNotification
      );

      return {
        notifications,
        total,
        page,
        limit,
        hasMore: offset + notifications.length < total,
        unreadCount,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[getGroupAdminNotifications] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch notifications");
    }
  }
);
