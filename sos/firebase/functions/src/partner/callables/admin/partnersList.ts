/**
 * Admin — List Partners
 *
 * Filters: status, search text (name, email, websiteName)
 * Pagination: limit + startAfter
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import type { Partner } from "../../types";

interface PartnersListInput {
  status?: "all" | "active" | "suspended" | "banned";
  search?: string;
  limit?: number;
  startAfter?: string; // partnerId to start after
}

interface PartnersListResponse {
  partners: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    websiteName: string;
    websiteUrl: string;
    websiteCategory: string;
    affiliateCode: string;
    status: string;
    isVisible: boolean;
    totalEarned: number;
    totalClicks: number;
    totalCalls: number;
    availableBalance: number;
    createdAt: string;
  }>;
  total: number;
  hasMore: boolean;
}

export const adminPartnersList = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<PartnersListResponse> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const input = (request.data as PartnersListInput) || {};
    const {
      status = "all",
      search,
      limit: queryLimit = 50,
      startAfter,
    } = input;

    try {
      let query: FirebaseFirestore.Query = db.collection("partners");

      // Filter by status
      if (status && status !== "all") {
        query = query.where("status", "==", status);
      }

      query = query.orderBy("createdAt", "desc");

      // Get total count
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Cursor-based pagination
      if (startAfter) {
        const startDoc = await db.collection("partners").doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      // Fetch a page larger than limit to allow client-side search filtering
      const fetchLimit = search ? Math.min(queryLimit * 3, 200) : queryLimit;
      query = query.limit(fetchLimit);

      const snapshot = await query.get();

      let partners = snapshot.docs.map((doc) => {
        const data = doc.data() as Partner;
        return {
          id: doc.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          websiteName: data.websiteName,
          websiteUrl: data.websiteUrl,
          websiteCategory: data.websiteCategory,
          affiliateCode: data.affiliateCode,
          status: data.status,
          isVisible: data.isVisible,
          totalEarned: data.totalEarned,
          totalClicks: data.totalClicks,
          totalCalls: data.totalCalls,
          availableBalance: data.availableBalance,
          createdAt: data.createdAt?.toDate?.().toISOString() || "",
        };
      });

      // Client-side search filter
      if (search) {
        const searchLower = search.toLowerCase();
        partners = partners.filter(
          (p) =>
            p.firstName.toLowerCase().includes(searchLower) ||
            p.lastName.toLowerCase().includes(searchLower) ||
            p.email.toLowerCase().includes(searchLower) ||
            p.websiteName.toLowerCase().includes(searchLower)
        );
      }

      // Trim to requested limit
      const trimmed = partners.slice(0, queryLimit);

      logger.info("[adminPartnersList] List fetched", {
        total,
        returned: trimmed.length,
        filters: { status, search },
      });

      return {
        partners: trimmed,
        total,
        hasMore: search ? partners.length > queryLimit : snapshot.docs.length === fetchLimit,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminPartnersList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch partners list");
    }
  }
);
