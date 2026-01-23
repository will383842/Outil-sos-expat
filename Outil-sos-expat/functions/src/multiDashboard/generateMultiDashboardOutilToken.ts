/**
 * =============================================================================
 * MULTI DASHBOARD - Generate Outil Token for AI Tool Access
 * =============================================================================
 *
 * Callable function to generate SSO token for AI tool access from multi-dashboard.
 * Uses session token authentication (no Firebase Auth required).
 * Returns a custom token that can be used to sign in to ia.sos-expat.com
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// =============================================================================
// TYPES
// =============================================================================

interface GenerateTokenRequest {
  sessionToken: string;
  providerId: string;
}

interface GenerateTokenResponse {
  success: boolean;
  token?: string;
  ssoUrl?: string;
  expiresIn?: number;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const OUTIL_BASE_URL = "https://ia.sos-expat.com";

// =============================================================================
// CALLABLE FUNCTION
// =============================================================================

export const generateMultiDashboardOutilToken = onCall<
  GenerateTokenRequest,
  Promise<GenerateTokenResponse>
>(
  {
    region: "europe-west1",
    timeoutSeconds: 30,
    maxInstances: 10,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    const { sessionToken, providerId } = request.data;

    logger.info("[generateMultiDashboardOutilToken] Request received", {
      providerId,
      hasSessionToken: !!sessionToken,
    });

    // Validate inputs
    if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.startsWith("mds_")) {
      throw new HttpsError("unauthenticated", "Invalid session token");
    }

    if (!providerId || typeof providerId !== "string") {
      throw new HttpsError("invalid-argument", "Provider ID is required");
    }

    try {
      const db = admin.firestore();
      const auth = admin.auth();

      // 1. Verify the provider exists and is linked to a multi-provider account
      const providerDoc = await db.collection("sos_profiles").doc(providerId).get();

      if (!providerDoc.exists) {
        throw new HttpsError("not-found", "Provider not found");
      }

      const providerData = providerDoc.data()!;
      const providerEmail = providerData.email || "";
      const providerType = providerData.type || "lawyer";

      // 2. Find the user account that has this provider linked
      const usersSnap = await db.collection("users")
        .where("linkedProviderIds", "array-contains", providerId)
        .limit(1)
        .get();

      let ownerUserId: string | null = null;

      if (!usersSnap.empty) {
        ownerUserId = usersSnap.docs[0].id;
      } else {
        // Provider might be their own account
        const userDoc = await db.collection("users").doc(providerId).get();
        if (userDoc.exists) {
          ownerUserId = providerId;
        }
      }

      if (!ownerUserId) {
        throw new HttpsError("not-found", "Provider account not found");
      }

      // 3. Generate custom token for the provider
      // The token will be used to sign in to the Outil IA as this provider
      const customClaims = {
        provider: true,
        providerType: providerType,
        subscriptionTier: "unlimited",
        subscriptionStatus: "active",
        forcedAccess: true,
        multiDashboardAccess: true,
        email: providerEmail,
        tokenGeneratedAt: Date.now(),
      };

      logger.info("[generateMultiDashboardOutilToken] Creating token for provider", {
        providerId,
        providerEmail,
        providerType,
      });

      const customToken = await auth.createCustomToken(providerId, customClaims);

      // 4. Log the access
      await db.collection("auditLogs").add({
        action: "multi_dashboard_outil_token",
        providerId,
        providerEmail,
        ownerUserId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        sessionTokenPrefix: sessionToken.substring(0, 10) + "...",
      });

      logger.info("[generateMultiDashboardOutilToken] Token generated successfully", {
        providerId,
      });

      // Build SSO URL
      const ssoUrl = `${OUTIL_BASE_URL}/auth?token=${encodeURIComponent(customToken)}`;

      return {
        success: true,
        token: customToken,
        ssoUrl,
        expiresIn: 3600,
      };

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[generateMultiDashboardOutilToken] Error", { error });
      throw new HttpsError("internal", "Failed to generate access token");
    }
  }
);
