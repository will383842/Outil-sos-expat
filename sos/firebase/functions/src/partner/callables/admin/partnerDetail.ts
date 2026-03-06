/**
 * Admin — Partner Detail
 *
 * Returns full partner data + recent commissions + recent clicks + recent withdrawals.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import type { Partner, PartnerCommission, PartnerAffiliateClick } from "../../types";

interface PartnerDetailInput {
  partnerId: string;
}

interface PartnerDetailResponse {
  partner: Partner;
  recentCommissions: Array<PartnerCommission & { createdAt: string }>;
  recentClicks: Array<PartnerAffiliateClick & { clickedAt: string }>;
  recentWithdrawals: Array<Record<string, unknown>>;
}

export const adminPartnerDetail = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<PartnerDetailResponse> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const { partnerId } = request.data as PartnerDetailInput;

    if (!partnerId) {
      throw new HttpsError("invalid-argument", "partnerId is required");
    }

    try {
      // Get partner
      const partnerDoc = await db.collection("partners").doc(partnerId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner not found");
      }
      const partner = { id: partnerDoc.id, ...partnerDoc.data() } as Partner;

      // Get recent commissions
      const commissionsSnap = await db
        .collection("partner_commissions")
        .where("partnerId", "==", partnerId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const recentCommissions = commissionsSnap.docs.map((doc) => {
        const data = doc.data() as PartnerCommission;
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.().toISOString() || "",
        };
      }) as Array<PartnerCommission & { createdAt: string }>;

      // Get recent clicks
      const clicksSnap = await db
        .collection("partner_affiliate_clicks")
        .where("partnerId", "==", partnerId)
        .orderBy("clickedAt", "desc")
        .limit(50)
        .get();

      const recentClicks = clicksSnap.docs.map((doc) => {
        const data = doc.data() as PartnerAffiliateClick;
        return {
          ...data,
          id: doc.id,
          clickedAt: data.clickedAt?.toDate?.().toISOString() || "",
        };
      }) as Array<PartnerAffiliateClick & { clickedAt: string }>;

      // Get recent withdrawals (centralized payment system)
      const withdrawalsSnap = await db
        .collection("payment_withdrawals")
        .where("userId", "==", partnerId)
        .where("userType", "==", "partner")
        .orderBy("requestedAt", "desc")
        .limit(20)
        .get();

      const recentWithdrawals = withdrawalsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          requestedAt: data.requestedAt?.toDate?.().toISOString() || "",
        };
      });

      logger.info("[adminPartnerDetail] Detail fetched", {
        partnerId,
        commissions: recentCommissions.length,
        clicks: recentClicks.length,
        withdrawals: recentWithdrawals.length,
      });

      return {
        partner,
        recentCommissions,
        recentClicks,
        recentWithdrawals,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminPartnerDetail] Error", { partnerId, error });
      throw new HttpsError("internal", "Failed to fetch partner detail");
    }
  }
);
