/**
 * Callable: getPartnerCommissions
 *
 * Partner self-access callable with pagination and status filtering.
 * Returns commissions list with total count and hasMore indicator.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { type PartnerCommission, type PartnerCommissionStatus } from "../types";
import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface GetPartnerCommissionsInput {
  status?: "all" | PartnerCommissionStatus;
  limit?: number;
  startAfter?: string; // ISO date string of last commission's createdAt
}

interface GetPartnerCommissionsResponse {
  commissions: PartnerCommission[];
  total: number;
  hasMore: boolean;
}

const VALID_STATUSES: string[] = ["all", "pending", "validated", "available", "paid", "cancelled"];

export const getPartnerCommissions = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 30,
  },
  async (request): Promise<GetPartnerCommissionsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as GetPartnerCommissionsInput;

    const status = input?.status || "all";
    const limit = Math.min(Math.max(input?.limit || 20, 1), 100);

    if (!VALID_STATUSES.includes(status)) {
      throw new HttpsError("invalid-argument", "Invalid status filter");
    }

    try {
      // Verify partner exists
      const partnerDoc = await db.collection("partners").doc(userId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner profile not found");
      }

      // Build query
      let query = db
        .collection("partner_commissions")
        .where("partnerId", "==", userId) as FirebaseFirestore.Query;

      if (status !== "all") {
        query = query.where("status", "==", status);
      }

      query = query.orderBy("createdAt", "desc");

      // Apply cursor pagination
      if (input?.startAfter) {
        const startAfterDate = new Date(input.startAfter);
        query = query.startAfter(Timestamp.fromDate(startAfterDate));
      }

      // Fetch limit + 1 to determine hasMore
      const snap = await query.limit(limit + 1).get();

      const hasMore = snap.docs.length > limit;
      const commissions = snap.docs.slice(0, limit).map((doc) => {
        return doc.data() as PartnerCommission;
      });

      // Get total count
      let countQuery = db
        .collection("partner_commissions")
        .where("partnerId", "==", userId) as FirebaseFirestore.Query;

      if (status !== "all") {
        countQuery = countQuery.where("status", "==", status);
      }

      const countSnap = await countQuery.count().get();
      const total = countSnap.data().count;

      logger.info("[getPartnerCommissions] Commissions returned", {
        partnerId: userId,
        status,
        count: commissions.length,
        total,
      });

      return { commissions, total, hasMore };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[getPartnerCommissions] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get commissions");
    }
  }
);
