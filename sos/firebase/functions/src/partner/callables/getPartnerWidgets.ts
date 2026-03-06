/**
 * Callable: getPartnerWidgets
 *
 * Partner self-access callable that returns active promo widgets.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { type PartnerPromoWidget } from "../types";
import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const getPartnerWidgets = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 15,
  },
  async (request): Promise<{ widgets: PartnerPromoWidget[] }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // Verify partner exists
      const partnerDoc = await db.collection("partners").doc(userId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner profile not found");
      }

      // Get active widgets
      const widgetsSnap = await db
        .collection("partner_promo_widgets")
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      const widgets = widgetsSnap.docs.map((doc) => {
        const data = doc.data() as PartnerPromoWidget;
        // Inject partner's affiliate code into widget HTML template
        const partner = partnerDoc.data()!;
        return {
          ...data,
          htmlTemplate: data.htmlTemplate
            .replace(/\{affiliateCode\}/g, partner.affiliateCode)
            .replace(/\{affiliateLink\}/g, partner.affiliateLink),
        };
      });

      logger.info("[getPartnerWidgets] Widgets returned", {
        partnerId: userId,
        count: widgets.length,
      });

      return { widgets };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[getPartnerWidgets] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get widgets");
    }
  }
);
