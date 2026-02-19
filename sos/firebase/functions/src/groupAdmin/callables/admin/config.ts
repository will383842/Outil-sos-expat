/**
 * Admin Callables: Configuration Management
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import { GroupAdminConfig, GroupAdminConfigHistoryEntry } from "../../types";
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
async function verifyAdmin(userId: string, authToken?: Record<string, unknown>): Promise<void> {
  // Check custom claims first (faster, no Firestore read)
  const tokenRole = authToken?.role as string | undefined;
  if (tokenRole === "admin" || tokenRole === "dev") {
    return;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }

  const userData = userDoc.data();
  if (!userData || !["admin", "dev"].includes(userData.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

/**
 * Get current GroupAdmin configuration
 */
export const adminGetGroupAdminConfig = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ config: GroupAdminConfig }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

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
  clientDiscountAmount?: number;
  recruitmentCommissionThreshold?: number;
  paymentMode?: "manual" | "automatic";
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
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; config: GroupAdminConfig }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const input = request.data as UpdateConfigInput;

    // Validate numeric values
    if (input.commissionClientAmount !== undefined && input.commissionClientAmount < 0) {
      throw new HttpsError("invalid-argument", "Commission amount cannot be negative");
    }

    if (input.commissionRecruitmentAmount !== undefined && input.commissionRecruitmentAmount < 0) {
      throw new HttpsError("invalid-argument", "Recruitment commission amount cannot be negative");
    }

    if (input.clientDiscountAmount !== undefined && input.clientDiscountAmount < 0) {
      throw new HttpsError("invalid-argument", "Client discount amount cannot be negative");
    }

    if (input.recruitmentCommissionThreshold !== undefined && input.recruitmentCommissionThreshold < 0) {
      throw new HttpsError("invalid-argument", "Recruitment commission threshold cannot be negative");
    }

    if (input.paymentMode !== undefined && !["manual", "automatic"].includes(input.paymentMode)) {
      throw new HttpsError("invalid-argument", "Payment mode must be 'manual' or 'automatic'");
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
      if (input.clientDiscountAmount !== undefined) updates.clientDiscountAmount = input.clientDiscountAmount;
      if (input.recruitmentCommissionThreshold !== undefined) updates.recruitmentCommissionThreshold = input.recruitmentCommissionThreshold;
      if (input.paymentMode !== undefined) updates.paymentMode = input.paymentMode;
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

/**
 * Get GroupAdmin configuration history
 */
export const adminGetGroupAdminConfigHistory = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ history: GroupAdminConfigHistoryEntry[] }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    try {
      const db = getFirestore();
      const configDoc = await db.collection("group_admin_config").doc("current").get();
      if (!configDoc.exists) {
        return { history: [] };
      }
      const data = configDoc.data() || {};
      const history = Array.isArray(data.configHistory) ? data.configHistory : [];
      return { history };
    } catch (error) {
      logger.error("[adminGetGroupAdminConfigHistory] Error", { error });
      throw new HttpsError("internal", "Failed to fetch config history");
    }
  }
);
