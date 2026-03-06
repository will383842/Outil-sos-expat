/**
 * Admin — Update Partner Config
 *
 * Updates partner_config/current document.
 * Clears config cache after update.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import { clearPartnerConfigCache } from "../../services/partnerConfigService";
import type { PartnerConfig } from "../../types";
import { DEFAULT_PARTNER_CONFIG } from "../../types";

type PartnerConfigUpdate = Partial<Omit<PartnerConfig, "id" | "createdAt" | "updatedAt">>;

export const adminUpdatePartnerConfig = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const updates = request.data as PartnerConfigUpdate;

    if (!updates || Object.keys(updates).length === 0) {
      throw new HttpsError("invalid-argument", "No updates provided");
    }

    const allowedFields: Array<keyof Omit<PartnerConfig, "id" | "createdAt" | "updatedAt">> = [
      "isSystemActive",
      "withdrawalsEnabled",
      "minimumWithdrawalAmount",
      "defaultCommissionPerCallLawyer",
      "defaultCommissionPerCallExpat",
      "defaultHoldPeriodDays",
      "defaultReleaseDelayHours",
      "defaultMinimumCallDuration",
      "attributionWindowDays",
      "isPartnerListingPageVisible",
      "isPartnerFooterLinkVisible",
    ];

    try {
      const configRef = db.collection("partner_config").doc("current");
      const configDoc = await configRef.get();

      // Sanitize: only keep allowed fields
      const sanitized: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          sanitized[field] = updates[field];
        }
      }

      if (Object.keys(sanitized).length === 0) {
        throw new HttpsError("invalid-argument", "No valid fields to update");
      }

      // Validate types
      const booleanFields = [
        "isSystemActive", "withdrawalsEnabled",
        "isPartnerListingPageVisible", "isPartnerFooterLinkVisible",
      ];
      for (const field of booleanFields) {
        if (sanitized[field] !== undefined && typeof sanitized[field] !== "boolean") {
          throw new HttpsError("invalid-argument", `${field} must be a boolean`);
        }
      }

      const numberFields = [
        "minimumWithdrawalAmount", "defaultCommissionPerCallLawyer",
        "defaultCommissionPerCallExpat", "defaultHoldPeriodDays",
        "defaultReleaseDelayHours", "defaultMinimumCallDuration",
        "attributionWindowDays",
      ];
      for (const field of numberFields) {
        if (sanitized[field] !== undefined) {
          if (typeof sanitized[field] !== "number" || (sanitized[field] as number) < 0) {
            throw new HttpsError("invalid-argument", `${field} must be a non-negative number`);
          }
        }
      }

      sanitized.updatedAt = Timestamp.now();

      if (configDoc.exists) {
        await configRef.update(sanitized);
      } else {
        await configRef.set({
          ...DEFAULT_PARTNER_CONFIG,
          ...sanitized,
          createdAt: Timestamp.now(),
        });
      }

      // Clear cache so next read picks up new values
      clearPartnerConfigCache();

      logger.info("[adminUpdatePartnerConfig] Config updated", {
        adminId: request.auth!.uid,
        updatedFields: Object.keys(sanitized).filter((k) => k !== "updatedAt"),
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdatePartnerConfig] Error", { error });
      throw new HttpsError("internal", "Failed to update partner config");
    }
  }
);
