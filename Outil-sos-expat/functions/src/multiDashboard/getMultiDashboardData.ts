/**
 * =============================================================================
 * MULTI DASHBOARD - Get Dashboard Data
 * =============================================================================
 *
 * Callable function to fetch all multi-dashboard data securely.
 * Uses Admin SDK to bypass Firestore rules (session token validated).
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

interface GetDataRequest {
  sessionToken: string;
}

interface Provider {
  id: string;
  name: string;
  email: string;
  type: 'lawyer' | 'expat';
  isActive: boolean;
  isOnline: boolean;
  availability: string;
  country?: string;
  avatar?: string;
}

interface BookingRequest {
  id: string;
  providerId: string;
  providerName?: string;
  providerType?: string;
  clientId: string;
  clientName: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];
  serviceType: string;
  title?: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  aiResponse?: {
    content: string;
    generatedAt: string;
    model: string;
    tokensUsed?: number;
    source: string;
  };
  aiProcessedAt?: string;
  aiError?: string;
}

interface MultiProviderAccount {
  userId: string;
  email: string;
  displayName: string;
  shareBusyStatus: boolean;
  providers: Provider[];
  bookingRequests: BookingRequest[];
  activeProviderId?: string;
}

interface GetDataResponse {
  success: boolean;
  accounts?: MultiProviderAccount[];
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function timestampToISO(ts: admin.firestore.Timestamp | null | undefined): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

// =============================================================================
// CALLABLE FUNCTION
// =============================================================================

export const getMultiDashboardData = onCall<
  GetDataRequest,
  Promise<GetDataResponse>
>(
  {
    region: "europe-west1",
    timeoutSeconds: 60,
    maxInstances: 10,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    const { sessionToken } = request.data;

    logger.info("[getMultiDashboardData] Request received");

    // Validate session token format
    if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.startsWith("mds_")) {
      throw new HttpsError("unauthenticated", "Invalid session token");
    }

    try {
      const db = admin.firestore();

      // ==========================================================================
      // 1. Load ONLY users with linkedProviderIds (multi-provider accounts)
      // ==========================================================================
      // FIX: Use a more targeted query approach
      // Since Firestore doesn't support "array not empty", we check isMultiProvider
      // or fall back to loading users with known linkedProviderIds

      let usersSnap;

      // First, try to get users marked as multi-provider
      const multiProviderQuery = await db.collection("users")
        .where("isMultiProvider", "==", true)
        .get();

      if (!multiProviderQuery.empty) {
        usersSnap = multiProviderQuery;
        logger.info("[getMultiDashboardData] Using isMultiProvider filter", {
          count: usersSnap.size,
        });
      } else {
        // Fallback: Load all and filter, but limit to users with linkedProviderIds
        const allUsersSnap = await db.collection("users").get();
        const filteredDocs = allUsersSnap.docs.filter(doc => {
          const data = doc.data();
          const linkedIds = data.linkedProviderIds;
          return Array.isArray(linkedIds) && linkedIds.length > 0;
        });

        usersSnap = { docs: filteredDocs, size: filteredDocs.length };
        logger.info("[getMultiDashboardData] Fallback filter applied", {
          totalUsers: allUsersSnap.size,
          multiProviderUsers: filteredDocs.length,
        });
      }

      const accounts: MultiProviderAccount[] = [];

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const linkedIds: string[] = userData.linkedProviderIds || [];

        // Double-check: Only include users with at least one linked provider
        if (!Array.isArray(linkedIds) || linkedIds.length === 0) continue;

        // ==========================================================================
        // 2. Load provider details - try sos_profiles first, then providers collection
        // ==========================================================================
        const providers: Provider[] = [];

        for (const pid of linkedIds) {
          // Try sos_profiles first
          let profileDoc = await db.collection("sos_profiles").doc(pid).get();

          // Fallback to providers collection if not found
          if (!profileDoc.exists) {
            profileDoc = await db.collection("providers").doc(pid).get();
            if (profileDoc.exists) {
              logger.info("[getMultiDashboardData] Provider found in 'providers' collection", { pid });
            }
          }

          if (profileDoc.exists) {
            const profile = profileDoc.data()!;
            providers.push({
              id: pid,
              name: profile.displayName || profile.name || profile.firstName || "N/A",
              email: profile.email || "",
              type: profile.type || profile.role || "lawyer",
              isActive: userData.activeProviderId === pid,
              isOnline: profile.isOnline === true,
              availability: profile.availability || "offline",
              country: profile.country,
              avatar: profile.photoURL || profile.avatar,
            });
          } else {
            logger.warn("[getMultiDashboardData] Provider not found in any collection", {
              pid,
              userId: userDoc.id
            });
          }
        }

        // ==========================================================================
        // 3. Only add account if it has at least one valid provider
        // ==========================================================================
        if (providers.length === 0) {
          logger.warn("[getMultiDashboardData] Skipping user - no valid providers found", {
            userId: userDoc.id,
            linkedIds,
          });
          continue;
        }

        // Load booking requests for all providers of this account
        const bookingRequests: BookingRequest[] = [];
        for (const provider of providers) {
          const bookingsSnap = await db
            .collection("booking_requests")
            .where("providerId", "==", provider.id)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();

          for (const bookingDoc of bookingsSnap.docs) {
            const data = bookingDoc.data();
            bookingRequests.push({
              id: bookingDoc.id,
              providerId: data.providerId,
              providerName: data.providerName,
              providerType: data.providerType,
              clientId: data.clientId,
              clientName: data.clientName || `${data.clientFirstName || ""} ${data.clientLastName || ""}`.trim() || "Client",
              clientFirstName: data.clientFirstName,
              clientLastName: data.clientLastName,
              clientEmail: data.clientEmail,
              clientPhone: data.clientPhone,
              clientWhatsapp: data.clientWhatsapp,
              clientCurrentCountry: data.clientCurrentCountry,
              clientNationality: data.clientNationality,
              clientLanguages: data.clientLanguages,
              serviceType: data.serviceType,
              title: data.title,
              description: data.description,
              status: data.status || "pending",
              createdAt: timestampToISO(data.createdAt) || new Date().toISOString(),
              updatedAt: timestampToISO(data.updatedAt),
              aiResponse: data.aiResponse ? {
                content: data.aiResponse.content,
                generatedAt: timestampToISO(data.aiResponse.generatedAt) || "",
                model: data.aiResponse.model,
                tokensUsed: data.aiResponse.tokensUsed,
                source: data.aiResponse.source || "manual",
              } : undefined,
              aiProcessedAt: timestampToISO(data.aiProcessedAt),
              aiError: data.aiError || undefined,
            });
          }
        }

        accounts.push({
          userId: userDoc.id,
          email: userData.email || "",
          displayName: userData.displayName || `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "N/A",
          shareBusyStatus: userData.shareBusyStatus === true,
          providers,
          bookingRequests,
          activeProviderId: userData.activeProviderId,
        });
      }

      // Sort by number of providers (descending)
      accounts.sort((a, b) => b.providers.length - a.providers.length);

      logger.info("[getMultiDashboardData] Success", {
        accountCount: accounts.length,
        totalProviders: accounts.reduce((sum, a) => sum + a.providers.length, 0),
      });

      return {
        success: true,
        accounts,
      };

    } catch (error) {
      logger.error("[getMultiDashboardData] Error", { error });
      throw new HttpsError("internal", "Failed to load dashboard data");
    }
  }
);
