/**
 * Admin Callable: updateAffiliateConfig
 *
 * Updates the affiliate configuration.
 * - Admin only
 * - Records change history
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import { AdminUpdateConfigInput, AffiliateConfig } from "../../types";
import { updateAffiliateConfig, clearConfigCache } from "../../utils/configService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Check if user is admin
 */
async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Check custom claims first
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") {
    return uid;
  }

  // Check Firestore
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

export const adminUpdateAffiliateConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; config: AffiliateConfig }> => {
    ensureInitialized();

    const adminId = await assertAdmin(request);
    const input = request.data as AdminUpdateConfigInput;

    logger.info("[adminUpdateAffiliateConfig] Processing request", {
      adminId,
      reason: input.reason,
    });

    try {
      // Get admin email
      const db = getFirestore();
      const adminDoc = await db.collection("users").doc(adminId).get();
      const adminEmail = adminDoc.data()?.email || "unknown";

      // Update config
      const updatedConfig = await updateAffiliateConfig(
        input.config,
        adminId,
        adminEmail,
        input.reason
      );

      // Clear cache
      clearConfigCache();

      logger.info("[adminUpdateAffiliateConfig] Config updated", {
        adminId,
        version: updatedConfig.version,
      });

      return {
        success: true,
        config: updatedConfig,
      };
    } catch (error) {
      logger.error("[adminUpdateAffiliateConfig] Error", { adminId, error });
      throw new HttpsError("internal", "Failed to update configuration");
    }
  }
);
