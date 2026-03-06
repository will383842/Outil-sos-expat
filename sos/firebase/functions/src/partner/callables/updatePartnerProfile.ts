/**
 * Callable: updatePartnerProfile
 *
 * Allows a partner to update their own profile.
 * Restricted fields (email, affiliateCode, websiteUrl) can only be changed by admin.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { type Partner } from "../types";
import { partnerConfig } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface UpdatePartnerProfileInput {
  phone?: string;
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  companyAddress?: string;
  preferredPaymentMethod?: "wise" | "bank_transfer" | "mobile_money";
}

export const updatePartnerProfile = onCall(
  {
    ...partnerConfig,
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const input = request.data as UpdatePartnerProfileInput;

    if (!input || Object.keys(input).length === 0) {
      throw new HttpsError("invalid-argument", "No fields to update");
    }

    try {
      // 1. Verify partner exists
      const partnerDoc = await db.collection("partners").doc(userId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner profile not found");
      }

      const partner = partnerDoc.data() as Partner;

      if (partner.status === "banned") {
        throw new HttpsError("permission-denied", "Account is banned");
      }

      // 2. Build update object (only allowed fields)
      const partnerUpdates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };
      const userUpdates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (input.phone !== undefined) {
        if (input.phone) {
          const phoneDigits = input.phone.replace(/\D/g, "").length;
          if (phoneDigits < 8 || phoneDigits > 15) {
            throw new HttpsError("invalid-argument", "Phone number must be 8-15 digits");
          }
        }
        partnerUpdates.phone = input.phone?.trim() || null;
      }

      if (input.contactName !== undefined) {
        partnerUpdates.contactName = input.contactName?.trim() || null;
      }

      if (input.contactEmail !== undefined) {
        if (input.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) {
          throw new HttpsError("invalid-argument", "Invalid contact email format");
        }
        partnerUpdates.contactEmail = input.contactEmail?.trim() || null;
      }

      if (input.companyName !== undefined) {
        partnerUpdates.companyName = input.companyName?.trim() || null;
      }

      if (input.companyAddress !== undefined) {
        partnerUpdates.companyAddress = input.companyAddress?.trim() || null;
      }

      if (input.preferredPaymentMethod !== undefined) {
        if (!["wise", "bank_transfer", "mobile_money"].includes(input.preferredPaymentMethod)) {
          throw new HttpsError("invalid-argument", "Invalid payment method");
        }
        partnerUpdates.preferredPaymentMethod = input.preferredPaymentMethod;
      }

      // 3. Update both collections
      const batch = db.batch();
      batch.update(db.collection("partners").doc(userId), partnerUpdates);

      // Sync relevant fields to users doc
      if (input.phone !== undefined) {
        userUpdates.phone = partnerUpdates.phone;
      }
      batch.update(db.collection("users").doc(userId), userUpdates);

      await batch.commit();

      logger.info("[updatePartnerProfile] Profile updated", {
        partnerId: userId,
        updatedFields: Object.keys(partnerUpdates).filter((k) => k !== "updatedAt"),
      });

      return {
        success: true,
        message: "Profile updated successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[updatePartnerProfile] Error", { userId, error });
      throw new HttpsError("internal", "Failed to update profile");
    }
  }
);
