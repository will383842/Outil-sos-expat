/**
 * =============================================================================
 * MULTI DASHBOARD - Generate Outil Token for AI Tool Access
 * =============================================================================
 *
 * Callable function to generate SSO token for AI tool access from multi-dashboard.
 * Uses session token authentication (no Firebase Auth required).
 * Returns a custom token that can be used to sign in to ia.sos-expat.com
 *
 * IMPORTANT: This function reads from sos-urgently-ac307 but signs tokens
 * with outils-sos-expat (the project where ia.sos-expat.com runs).
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getSosFirestore, getSosAuth, SOS_SERVICE_ACCOUNT } from "./sosFirestore";

// Initialize Firebase Admin for local project (outils-sos-expat)
// This is used to sign custom tokens for the Outil IA
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// =============================================================================
// TYPES
// =============================================================================

interface GenerateTokenRequest {
  sessionToken?: string; // Auth mode 1: multi-dashboard session token (mds_*)
  firebaseIdToken?: string; // Auth mode 2: Firebase ID token from SOS project (PWA)
  providerId: string;
  bookingId?: string; // Optional: redirect directly to a specific booking/conversation
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
    secrets: [SOS_SERVICE_ACCOUNT],
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://multi.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    logger.info("[generateMultiDashboardOutilToken] Function invoked");

    const { sessionToken, firebaseIdToken, providerId, bookingId } = request.data || {};

    logger.info("[generateMultiDashboardOutilToken] Request received", {
      providerId: providerId || "MISSING",
      bookingId: bookingId || "none",
      hasSessionToken: !!sessionToken,
      hasFirebaseIdToken: !!firebaseIdToken,
      hasData: !!request.data,
    });

    if (!providerId || typeof providerId !== "string") {
      throw new HttpsError("invalid-argument", "Provider ID is required");
    }

    // Validate auth: either sessionToken (mds_*) or firebaseIdToken (SOS Firebase Auth)
    if (firebaseIdToken && typeof firebaseIdToken === "string") {
      // Auth mode 2: Firebase ID token from SOS project (PWA multi.sos-expat.com)
      try {
        const sosAuth = getSosAuth();
        const decodedToken = await sosAuth.verifyIdToken(firebaseIdToken);
        const uid = decodedToken.uid;

        logger.info("[generateMultiDashboardOutilToken] Firebase ID token verified", { uid });

        // Verify user has permission (admin/agency_manager with this provider linked)
        const sosDb = getSosFirestore();
        const userDoc = await sosDb.collection("users").doc(uid).get();

        if (!userDoc.exists) {
          throw new HttpsError("permission-denied", "User not found");
        }

        const userData = userDoc.data()!;
        const role = userData.role as string;
        const linkedProviderIds = (userData.linkedProviderIds as string[]) || [];

        if (!["admin", "agency_manager"].includes(role)) {
          throw new HttpsError("permission-denied", "Insufficient role");
        }

        if (!linkedProviderIds.includes(providerId)) {
          throw new HttpsError("permission-denied", "Provider not linked to this account");
        }

        logger.info("[generateMultiDashboardOutilToken] Firebase auth verified", {
          uid, role, providerCount: linkedProviderIds.length,
        });
      } catch (authError) {
        if (authError instanceof HttpsError) throw authError;
        logger.error("[generateMultiDashboardOutilToken] Firebase token verification failed", { error: authError });
        throw new HttpsError("unauthenticated", "Invalid Firebase token");
      }
    } else if (sessionToken && typeof sessionToken === "string" && sessionToken.startsWith("mds_")) {
      // Auth mode 1: multi-dashboard session token (existing web flow)
      logger.info("[generateMultiDashboardOutilToken] Using session token auth");
    } else {
      throw new HttpsError("unauthenticated", "Authentication required (sessionToken or firebaseIdToken)");
    }

    try {
      // Use SOS Firestore for reading data (sos-urgently-ac307)
      const db = getSosFirestore();
      // Use local auth for signing tokens (outils-sos-expat - where ia.sos-expat.com runs)
      const auth = admin.auth();

      // 1. Verify the provider exists (try sos_profiles first, then providers)
      let providerDoc = await db.collection("sos_profiles").doc(providerId).get();

      if (!providerDoc.exists) {
        // Fallback: try providers collection
        providerDoc = await db.collection("providers").doc(providerId).get();
        if (!providerDoc.exists) {
          logger.warn("[generateMultiDashboardOutilToken] Provider not found in any collection", { providerId });
          throw new HttpsError("not-found", "Provider not found");
        }
        logger.info("[generateMultiDashboardOutilToken] Found provider in 'providers' collection", { providerId });
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

      // 4. Log the access (non-blocking, don't fail if audit log fails)
      try {
        await db.collection("auditLogs").add({
          action: "multi_dashboard_outil_token",
          providerId,
          providerEmail,
          ownerUserId,
          timestamp: new Date().toISOString(),
          authMethod: firebaseIdToken ? "firebase_sso" : "session_token",
          sessionTokenPrefix: sessionToken ? sessionToken.substring(0, 10) + "..." : "firebase_auth",
        });
      } catch (auditError) {
        logger.warn("[generateMultiDashboardOutilToken] Failed to write audit log (non-blocking)", { error: auditError });
      }

      logger.info("[generateMultiDashboardOutilToken] Token generated successfully", {
        providerId,
      });

      // Build SSO URL with optional redirect to specific booking
      let ssoUrl = `${OUTIL_BASE_URL}/auth?token=${encodeURIComponent(customToken)}`;

      // If bookingId is provided, add redirect parameter to go directly to that conversation
      if (bookingId) {
        // FIX: The bookingId from multi-dashboard is a booking_request ID (SOS project)
        // We need to find the corresponding Outil booking ID (outilBookingId) for proper redirect
        let redirectBookingId = bookingId;

        try {
          // Check if this is a booking_request and get the outilBookingId
          const bookingRequestDoc = await db.collection("booking_requests").doc(bookingId).get();

          if (bookingRequestDoc.exists) {
            const bookingRequestData = bookingRequestDoc.data();

            if (bookingRequestData?.outilBookingId) {
              // Use the Outil booking ID for redirect (this is what ConversationDetail expects)
              redirectBookingId = bookingRequestData.outilBookingId;
              logger.info("[generateMultiDashboardOutilToken] Found outilBookingId, using for redirect", {
                bookingRequestId: bookingId,
                outilBookingId: redirectBookingId,
              });
            } else {
              // No outilBookingId yet - AI hasn't been triggered or is still processing
              // Use the booking_request ID with a source hint for ConversationDetail
              logger.info("[generateMultiDashboardOutilToken] No outilBookingId yet, using booking_request ID with source hint", {
                bookingRequestId: bookingId,
              });
            }
          }
        } catch (lookupError) {
          logger.warn("[generateMultiDashboardOutilToken] Could not lookup booking_request, using original ID", {
            bookingId,
            error: lookupError,
          });
        }

        // Add source parameter to help ConversationDetail know where to look
        const redirectPath = `/dashboard/conversation/${redirectBookingId}?source=multi_dashboard&originalId=${bookingId}`;
        ssoUrl += `&redirect=${encodeURIComponent(redirectPath)}`;
        logger.info("[generateMultiDashboardOutilToken] Adding redirect to conversation", {
          bookingId,
          redirectBookingId,
          redirectPath,
        });
      }

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
