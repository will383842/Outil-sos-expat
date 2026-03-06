/**
 * Admin — List Partner Applications
 *
 * Lists partner_applications with filter by status.
 * Pagination with limit + startAfter.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import type { PartnerApplication } from "../../types";

interface ApplicationsListInput {
  status?: "all" | "pending" | "contacted" | "accepted" | "rejected";
  limit?: number;
  startAfter?: string; // applicationId
}

interface ApplicationsListResponse {
  applications: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    country: string;
    language: string;
    websiteUrl: string;
    websiteName: string;
    websiteCategory: string;
    websiteTraffic?: string;
    websiteDescription?: string;
    message?: string;
    status: string;
    adminNotes?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    convertedToPartnerId?: string;
    createdAt: string;
  }>;
  total: number;
  hasMore: boolean;
}

export const adminPartnerApplicationsList = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<ApplicationsListResponse> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const input = (request.data as ApplicationsListInput) || {};
    const {
      status = "all",
      limit: queryLimit = 50,
      startAfter,
    } = input;

    try {
      let query: FirebaseFirestore.Query = db.collection("partner_applications");

      if (status && status !== "all") {
        query = query.where("status", "==", status);
      }

      query = query.orderBy("createdAt", "desc");

      // Total count
      const countSnap = await query.count().get();
      const total = countSnap.data().count;

      // Cursor-based pagination
      if (startAfter) {
        const startDoc = await db.collection("partner_applications").doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      query = query.limit(queryLimit);
      const snapshot = await query.get();

      const applications = snapshot.docs.map((doc) => {
        const data = doc.data() as PartnerApplication;
        return {
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          country: data.country,
          language: data.language,
          websiteUrl: data.websiteUrl,
          websiteName: data.websiteName,
          websiteCategory: data.websiteCategory,
          websiteTraffic: data.websiteTraffic,
          websiteDescription: data.websiteDescription,
          message: data.message,
          status: data.status,
          adminNotes: data.adminNotes,
          reviewedBy: data.reviewedBy,
          reviewedAt: data.reviewedAt?.toDate?.().toISOString(),
          convertedToPartnerId: data.convertedToPartnerId,
          createdAt: data.createdAt?.toDate?.().toISOString() || "",
        };
      });

      logger.info("[adminPartnerApplicationsList] List fetched", {
        total,
        returned: applications.length,
        statusFilter: status,
      });

      return {
        applications,
        total,
        hasMore: snapshot.docs.length === queryLimit,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminPartnerApplicationsList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch partner applications");
    }
  }
);
