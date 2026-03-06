/**
 * Admin — Toggle Partner Visibility
 *
 * Toggles partners/{partnerId}.isVisible
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";

interface ToggleVisibilityInput {
  partnerId: string;
  isVisible: boolean;
}

export const adminTogglePartnerVisibility = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; partnerId: string; isVisible: boolean }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const input = request.data as ToggleVisibilityInput;

    if (!input?.partnerId) {
      throw new HttpsError("invalid-argument", "partnerId is required");
    }
    if (typeof input.isVisible !== "boolean") {
      throw new HttpsError("invalid-argument", "isVisible must be a boolean");
    }

    try {
      const partnerRef = db.collection("partners").doc(input.partnerId);
      const partnerDoc = await partnerRef.get();

      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner not found");
      }

      await partnerRef.update({
        isVisible: input.isVisible,
        updatedAt: Timestamp.now(),
      });

      logger.info("[adminTogglePartnerVisibility] Visibility updated", {
        partnerId: input.partnerId,
        isVisible: input.isVisible,
        adminId: request.auth!.uid,
      });

      return {
        success: true,
        partnerId: input.partnerId,
        isVisible: input.isVisible,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminTogglePartnerVisibility] Error", { error });
      throw new HttpsError("internal", "Failed to toggle partner visibility");
    }
  }
);
