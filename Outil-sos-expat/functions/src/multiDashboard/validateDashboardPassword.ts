/**
 * =============================================================================
 * MULTI DASHBOARD - Password Validation
 * =============================================================================
 *
 * Callable function to validate dashboard password securely.
 * Password is stored in Google Cloud Secret Manager for security.
 * Returns a session token on success.
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// Secret for dashboard password (stored in Google Cloud Secret Manager)
const MULTI_DASHBOARD_PASSWORD = defineSecret("MULTI_DASHBOARD_PASSWORD");

// =============================================================================
// TYPES
// =============================================================================

interface ValidatePasswordRequest {
  password: string;
}

interface ValidatePasswordResponse {
  success: boolean;
  token?: string;
  expiresAt?: number;
  error?: string;
}

// =============================================================================
// CALLABLE FUNCTION
// =============================================================================

/**
 * Validates the multi-dashboard password.
 *
 * Security:
 * - Rate limited by Cloud Functions
 * - Password compared securely (future: bcrypt)
 * - Returns session token with expiration
 */
export const validateDashboardPassword = onCall<
  ValidatePasswordRequest,
  Promise<ValidatePasswordResponse>
>(
  {
    region: "europe-west1",
    timeoutSeconds: 30,
    maxInstances: 10,
    secrets: [MULTI_DASHBOARD_PASSWORD], // Use secret from Secret Manager
  },
  async (request) => {
    const { password } = request.data;
    const clientIp = request.rawRequest?.ip || "unknown";

    logger.info("[validateDashboardPassword] Attempt", {
      ip: clientIp,
      passwordLength: password?.length || 0,
    });

    // Validate input
    if (!password || typeof password !== "string") {
      throw new HttpsError("invalid-argument", "Password is required");
    }

    try {
      const db = admin.firestore();

      // Get dashboard config (for enabled flag only)
      const configDoc = await db.doc("admin_config/multi_dashboard").get();
      const config = configDoc.exists ? configDoc.data() : { enabled: true };

      // Check if dashboard is enabled
      if (!config?.enabled) {
        logger.warn("[validateDashboardPassword] Dashboard disabled");
        throw new HttpsError("unavailable", "Dashboard is disabled");
      }

      // Compare password with secret from Secret Manager
      const storedPassword = MULTI_DASHBOARD_PASSWORD.value().trim();

      if (!storedPassword) {
        logger.error("[validateDashboardPassword] Secret not configured");
        throw new HttpsError("internal", "Dashboard not configured");
      }

      if (password !== storedPassword) {
        logger.warn("[validateDashboardPassword] Invalid password", { ip: clientIp });

        // Log failed attempt for security
        await db.collection("auditLogs").add({
          action: "multi_dashboard_auth_failed",
          ip: clientIp,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: false,
          error: "Mot de passe incorrect",
        };
      }

      // Generate session token
      const token = `mds_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const sessionDuration = (config.sessionDurationHours || 24) * 60 * 60 * 1000;
      const expiresAt = Date.now() + sessionDuration;

      // Log successful auth
      await db.collection("auditLogs").add({
        action: "multi_dashboard_auth_success",
        ip: clientIp,
        token: token.substring(0, 10) + "...", // Partial for logging
        expiresAt: new Date(expiresAt),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("[validateDashboardPassword] Success", {
        ip: clientIp,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return {
        success: true,
        token,
        expiresAt,
      };

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[validateDashboardPassword] Error", { error });
      throw new HttpsError("internal", "Authentication failed");
    }
  }
);
