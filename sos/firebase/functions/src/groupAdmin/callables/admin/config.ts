/**
 * Admin Callables: Configuration Management
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { GroupAdminConfig } from "../../types";
import { updateGroupAdminConfig, refreshConfigCache } from "../../groupAdminConfig";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify the caller is an admin
 */
async function verifyAdmin(userId: string): Promise<void> {
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }

  const userData = userDoc.data();
  if (userData?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

/**
 * Get current GroupAdmin configuration
 */
export const adminGetGroupAdminConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ config: GroupAdminConfig }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid);

    try {
      // Force refresh to get latest
      const config = await refreshConfigCache();
      return { config };
    } catch (error) {
      logger.error("[adminGetGroupAdminConfig] Error", { error });
      throw new HttpsError("internal", "Failed to fetch configuration");
    }
  }
);

interface UpdateConfigInput {
  isSystemActive?: boolean;
  newRegistrationsEnabled?: boolean;
  withdrawalsEnabled?: boolean;
  commissionClientAmount?: number;
  commissionRecruitmentAmount?: number;
  clientDiscountPercent?: number;
  recruitmentWindowMonths?: number;
  attributionWindowDays?: number;
  validationHoldPeriodDays?: number;
  releaseDelayHours?: number;
  minimumWithdrawalAmount?: number;
  leaderboardSize?: number;
}

/**
 * Update GroupAdmin configuration
 */
export const adminUpdateGroupAdminConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; config: GroupAdminConfig }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid);

    const input = request.data as UpdateConfigInput;

    // Validate numeric values
    if (input.commissionClientAmount !== undefined && input.commissionClientAmount < 0) {
      throw new HttpsError("invalid-argument", "Commission amount cannot be negative");
    }

    if (input.commissionRecruitmentAmount !== undefined && input.commissionRecruitmentAmount < 0) {
      throw new HttpsError("invalid-argument", "Recruitment commission amount cannot be negative");
    }

    if (input.clientDiscountPercent !== undefined && (input.clientDiscountPercent < 0 || input.clientDiscountPercent > 100)) {
      throw new HttpsError("invalid-argument", "Client discount percent must be between 0 and 100");
    }

    if (input.recruitmentWindowMonths !== undefined && input.recruitmentWindowMonths < 1) {
      throw new HttpsError("invalid-argument", "Recruitment window must be at least 1 month");
    }

    if (input.minimumWithdrawalAmount !== undefined && input.minimumWithdrawalAmount < 100) {
      throw new HttpsError("invalid-argument", "Minimum withdrawal must be at least $1.00");
    }

    if (input.leaderboardSize !== undefined && (input.leaderboardSize < 3 || input.leaderboardSize > 100)) {
      throw new HttpsError("invalid-argument", "Leaderboard size must be between 3 and 100");
    }

    try {
      const updates: Partial<GroupAdminConfig> = {};

      if (input.isSystemActive !== undefined) updates.isSystemActive = input.isSystemActive;
      if (input.newRegistrationsEnabled !== undefined) updates.newRegistrationsEnabled = input.newRegistrationsEnabled;
      if (input.withdrawalsEnabled !== undefined) updates.withdrawalsEnabled = input.withdrawalsEnabled;
      if (input.commissionClientAmount !== undefined) updates.commissionClientAmount = input.commissionClientAmount;
      if (input.commissionRecruitmentAmount !== undefined) updates.commissionRecruitmentAmount = input.commissionRecruitmentAmount;
      if (input.clientDiscountPercent !== undefined) updates.clientDiscountPercent = input.clientDiscountPercent;
      if (input.recruitmentWindowMonths !== undefined) updates.recruitmentWindowMonths = input.recruitmentWindowMonths;
      if (input.attributionWindowDays !== undefined) updates.attributionWindowDays = input.attributionWindowDays;
      if (input.validationHoldPeriodDays !== undefined) updates.validationHoldPeriodDays = input.validationHoldPeriodDays;
      if (input.releaseDelayHours !== undefined) updates.releaseDelayHours = input.releaseDelayHours;
      if (input.minimumWithdrawalAmount !== undefined) updates.minimumWithdrawalAmount = input.minimumWithdrawalAmount;
      if (input.leaderboardSize !== undefined) updates.leaderboardSize = input.leaderboardSize;

      const updatedConfig = await updateGroupAdminConfig(updates, request.auth.uid);

      logger.info("[adminUpdateGroupAdminConfig] Configuration updated", {
        adminId: request.auth.uid,
        updatedFields: Object.keys(updates),
        newVersion: updatedConfig.version,
      });

      return {
        success: true,
        config: updatedConfig,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateGroupAdminConfig] Error", { error });
      throw new HttpsError("internal", "Failed to update configuration");
    }
  }
);
