/**
 * Callable: trackPartnerClick
 *
 * PUBLIC callable (no auth required) for tracking affiliate link clicks.
 * Rate limited to prevent abuse.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { type PartnerAffiliateClick } from "../types";
import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface TrackPartnerClickInput {
  partnerCode: string;
  userAgent?: string;
  referrerUrl?: string;
  landingPage?: string;
  ipHash?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export const trackPartnerClick = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 10,
  },
  async (request): Promise<{ success: boolean; clickId: string }> => {
    ensureInitialized();

    // No auth required — public endpoint
    const db = getFirestore();
    const input = request.data as TrackPartnerClickInput;

    if (!input?.partnerCode || typeof input.partnerCode !== "string") {
      throw new HttpsError("invalid-argument", "partnerCode is required");
    }

    const normalizedCode = input.partnerCode.toUpperCase().trim();

    try {
      // 1. Rate limiting by IP hash (max 30 clicks per minute per IP)
      if (input.ipHash) {
        const rateLimitRef = db.collection("rate_limits").doc(`partner_click_${input.ipHash}`);
        const rateLimitDoc = await rateLimitRef.get();

        if (rateLimitDoc.exists) {
          const data = rateLimitDoc.data();
          const lastReset = data?.lastReset?.toDate?.() || new Date(0);
          const now = new Date();
          const elapsed = now.getTime() - lastReset.getTime();

          if (elapsed < 60000) {
            // Within 1-minute window
            if ((data?.count || 0) >= 30) {
              throw new HttpsError("resource-exhausted", "Rate limit exceeded");
            }
            await rateLimitRef.update({ count: FieldValue.increment(1) });
          } else {
            // Reset window
            await rateLimitRef.set({ count: 1, lastReset: Timestamp.now() });
          }
        } else {
          await rateLimitRef.set({ count: 1, lastReset: Timestamp.now() });
        }
      }

      // 2. Validate partner exists and is active
      const partnerSnap = await db
        .collection("partners")
        .where("affiliateCode", "==", normalizedCode)
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (partnerSnap.empty) {
        throw new HttpsError("not-found", "Partner not found or inactive");
      }

      const partnerDoc = partnerSnap.docs[0];
      const partnerId = partnerDoc.id;
      const now = Timestamp.now();

      // 3. Create click document
      const clickRef = db.collection("partner_affiliate_clicks").doc();
      const click: PartnerAffiliateClick = {
        id: clickRef.id,
        partnerId,
        partnerCode: normalizedCode,
        clickedAt: now,
        converted: false,
        userAgent: input.userAgent?.substring(0, 500),
        referrerUrl: input.referrerUrl?.substring(0, 2000),
        landingPage: input.landingPage?.substring(0, 2000),
        ipHash: input.ipHash?.substring(0, 64),
        utmSource: input.utmSource?.substring(0, 100),
        utmMedium: input.utmMedium?.substring(0, 100),
        utmCampaign: input.utmCampaign?.substring(0, 200),
      };

      await clickRef.set(click);

      // 4. Increment counters on partner doc
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const partnerData = partnerDoc.data();
      const storedMonth = partnerData?.currentMonthStats?.month;

      if (storedMonth === currentMonth) {
        // Same month — increment
        await partnerDoc.ref.update({
          totalClicks: FieldValue.increment(1),
          "currentMonthStats.clicks": FieldValue.increment(1),
          updatedAt: now,
        });
      } else {
        // New month — reset monthly stats
        await partnerDoc.ref.update({
          totalClicks: FieldValue.increment(1),
          currentMonthStats: {
            clicks: 1,
            clients: 0,
            calls: 0,
            earnings: 0,
            month: currentMonth,
          },
          updatedAt: now,
        });
      }

      logger.info("[trackPartnerClick] Click tracked", {
        clickId: clickRef.id,
        partnerId,
        partnerCode: normalizedCode,
      });

      return { success: true, clickId: clickRef.id };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[trackPartnerClick] Error", { partnerCode: normalizedCode, error });
      throw new HttpsError("internal", "Failed to track click");
    }
  }
);
