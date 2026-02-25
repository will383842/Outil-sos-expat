/**
 * Callable: getGroupAdminCommissions
 *
 * Returns paginated commissions for a GroupAdmin.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { GroupAdminCommission } from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export interface GetGroupAdminCommissionsRequest {
  page?: number;
  limit?: number;
}

export interface GetGroupAdminCommissionsResponse {
  commissions: GroupAdminCommission[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const getGroupAdminCommissions = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetGroupAdminCommissionsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    const input = request.data as GetGroupAdminCommissionsRequest;
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
        .collection("group_admin_commissions")
        .where("groupAdminId", "==", userId)
        .count()
        .get();
      const total = countSnapshot.data().count;

      // Get paginated commissions
      const commissionsSnapshot = await db
        .collection("group_admin_commissions")
        .where("groupAdminId", "==", userId)
        .orderBy("createdAt", "desc")
        .offset(offset)
        .limit(limit)
        .get();

      const commissions: GroupAdminCommission[] = commissionsSnapshot.docs.map(
        (doc) => doc.data() as GroupAdminCommission
      );

      return {
        commissions,
        total,
        page,
        limit,
        hasMore: offset + commissions.length < total,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[getGroupAdminCommissions] Error", { userId, error });
      throw new HttpsError("internal", "Failed to fetch commissions");
    }
  }
);
