/**
 * Admin — Update Partner Commission Config
 *
 * Updates a specific partner's commissionConfig fields.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import type { PartnerCommissionConfig, PartnerDiscountConfig } from "../../types";

interface UpdateCommissionConfigInput {
  partnerId: string;
  commissionPerCallLawyer?: number;
  commissionPerCallExpat?: number;
  usePercentage?: boolean;
  commissionPercentage?: number;
  holdPeriodDays?: number;
  releaseDelayHours?: number;
  minimumCallDuration?: number;
  // Discount for partner's community
  discountConfig?: Partial<PartnerDiscountConfig>;
}

export const adminUpdatePartnerCommissionConfig = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const input = request.data as UpdateCommissionConfigInput;

    if (!input?.partnerId) {
      throw new HttpsError("invalid-argument", "partnerId is required");
    }

    try {
      const partnerRef = db.collection("partners").doc(input.partnerId);
      const partnerDoc = await partnerRef.get();

      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner not found");
      }

      const currentConfig = (partnerDoc.data()?.commissionConfig || {}) as PartnerCommissionConfig;

      // Build updated config — only override provided fields
      const updatedConfig: PartnerCommissionConfig = {
        commissionPerCallLawyer:
          input.commissionPerCallLawyer ?? currentConfig.commissionPerCallLawyer,
        commissionPerCallExpat:
          input.commissionPerCallExpat ?? currentConfig.commissionPerCallExpat,
        usePercentage:
          input.usePercentage ?? currentConfig.usePercentage,
        commissionPercentage:
          input.commissionPercentage ?? currentConfig.commissionPercentage,
        holdPeriodDays:
          input.holdPeriodDays ?? currentConfig.holdPeriodDays,
        releaseDelayHours:
          input.releaseDelayHours ?? currentConfig.releaseDelayHours,
        minimumCallDuration:
          input.minimumCallDuration ?? currentConfig.minimumCallDuration,
      };

      // Validate numbers
      const numericFields: Array<keyof PartnerCommissionConfig> = [
        "commissionPerCallLawyer", "commissionPerCallExpat",
        "holdPeriodDays", "releaseDelayHours", "minimumCallDuration",
      ];
      for (const field of numericFields) {
        const val = updatedConfig[field];
        if (typeof val === "number" && val < 0) {
          throw new HttpsError("invalid-argument", `${field} must be non-negative`);
        }
      }

      if (updatedConfig.usePercentage && updatedConfig.commissionPercentage !== undefined) {
        if (updatedConfig.commissionPercentage < 0 || updatedConfig.commissionPercentage > 100) {
          throw new HttpsError("invalid-argument", "commissionPercentage must be between 0 and 100");
        }
      }

      const updatePayload: Record<string, unknown> = {
        commissionConfig: updatedConfig,
        updatedAt: Timestamp.now(),
      };

      // Handle discount config update
      if (input.discountConfig !== undefined) {
        const currentDiscount = partnerDoc.data()?.discountConfig;
        if (input.discountConfig === null) {
          // Remove discount
          updatePayload.discountConfig = null;
        } else {
          const disc = input.discountConfig;
          // Validate discount
          if (disc.type && !["fixed", "percentage"].includes(disc.type)) {
            throw new HttpsError("invalid-argument", "discountConfig.type must be 'fixed' or 'percentage'");
          }
          if (disc.value !== undefined && (typeof disc.value !== "number" || disc.value < 0)) {
            throw new HttpsError("invalid-argument", "discountConfig.value must be a non-negative number");
          }
          if (disc.type === "percentage" && disc.value !== undefined && disc.value > 100) {
            throw new HttpsError("invalid-argument", "Percentage discount cannot exceed 100%");
          }

          updatePayload.discountConfig = {
            isActive: disc.isActive ?? currentDiscount?.isActive ?? true,
            type: disc.type ?? currentDiscount?.type ?? "fixed",
            value: disc.value ?? currentDiscount?.value ?? 0,
            maxDiscountCents: disc.maxDiscountCents ?? currentDiscount?.maxDiscountCents ?? null,
            label: disc.label ?? currentDiscount?.label ?? null,
            labelTranslations: disc.labelTranslations ?? currentDiscount?.labelTranslations ?? {},
            expiresAt: disc.expiresAt ?? currentDiscount?.expiresAt ?? null,
          };
        }
      }

      await partnerRef.update(updatePayload);

      logger.info("[adminUpdatePartnerCommissionConfig] Config updated", {
        partnerId: input.partnerId,
        adminId: request.auth!.uid,
        updatedConfig,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdatePartnerCommissionConfig] Error", { error });
      throw new HttpsError("internal", "Failed to update partner commission config");
    }
  }
);
