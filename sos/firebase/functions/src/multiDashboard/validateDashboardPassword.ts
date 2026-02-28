/**
 * =============================================================================
 * MULTI DASHBOARD - Password Validation
 * =============================================================================
 *
 * Callable function to validate dashboard password securely.
 * Password is stored in Google Cloud Secret Manager for security.
 * Returns a session token on success.
 *
 * Security features:
 * - Timing-safe password comparison (prevents timing attacks)
 * - Cryptographically secure token generation
 * - Rate limiting per IP (prevents brute force)
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { timingSafeEqual, randomBytes } from "crypto";
import { MULTI_DASHBOARD_PASSWORD } from "../lib/secrets";
import { ALLOWED_ORIGINS } from "../lib/functionConfigs";

// Secret for dashboard password (stored in Google Cloud Secret Manager)
// Imported from lib/secrets.ts

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
    secrets: [MULTI_DASHBOARD_PASSWORD],
    cors: ALLOWED_ORIGINS,
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

      // =========================================================
      // RATE LIMITING - Prevent brute force attacks
      // =========================================================
      const rateLimitRef = db.collection("dashboard_rate_limits").doc(clientIp);
      const rateLimitDoc = await rateLimitRef.get();
      const now = Date.now();
      const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
      const MAX_ATTEMPTS = 5;

      if (rateLimitDoc.exists) {
        const rateLimitData = rateLimitDoc.data();
        const windowStart = rateLimitData?.windowStart || 0;
        const attempts = rateLimitData?.attempts || 0;

        // Check if we're still in the rate limit window
        if (now - windowStart < RATE_LIMIT_WINDOW_MS) {
          if (attempts >= MAX_ATTEMPTS) {
            const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - windowStart);
            const retryAfterMinutes = Math.ceil(retryAfterMs / 60000);

            logger.warn("[validateDashboardPassword] Rate limited", {
              ip: clientIp,
              attempts,
              retryAfterMinutes,
            });

            return {
              success: false,
              error: `Trop de tentatives. Réessayez dans ${retryAfterMinutes} minute${retryAfterMinutes > 1 ? "s" : ""}.`,
            };
          }
        }
      }

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

      // Timing-safe password comparison to prevent timing attacks
      const passwordBuffer = Buffer.from(password.trim());
      const storedPasswordBuffer = Buffer.from(storedPassword);

      const passwordsMatch = passwordBuffer.length === storedPasswordBuffer.length &&
        timingSafeEqual(passwordBuffer, storedPasswordBuffer);

      if (!passwordsMatch) {
        logger.warn("[validateDashboardPassword] Invalid password", { ip: clientIp });

        // Update rate limit counter for failed attempt
        const currentRateLimit = rateLimitDoc.exists ? rateLimitDoc.data() : null;
        const windowStillValid = currentRateLimit &&
          (now - (currentRateLimit.windowStart || 0)) < RATE_LIMIT_WINDOW_MS;

        await rateLimitRef.set({
          windowStart: windowStillValid ? currentRateLimit.windowStart : now,
          attempts: windowStillValid ? (currentRateLimit.attempts || 0) + 1 : 1,
          lastAttempt: now,
        });

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

      // Reset rate limit on successful authentication
      await rateLimitRef.delete().catch(() => {
        // Ignore deletion errors
      });

      // Generate cryptographically secure session token
      const token = `mds_${Date.now()}_${randomBytes(24).toString("hex")}`;
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
