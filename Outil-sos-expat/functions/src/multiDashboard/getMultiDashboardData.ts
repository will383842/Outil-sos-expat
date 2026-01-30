/**
 * =============================================================================
 * MULTI DASHBOARD - Get Dashboard Data
 * =============================================================================
 *
 * Callable function to fetch all multi-provider accounts from SOS-Expat.
 *
 * IMPORTANT: This function reads from sos-urgently-ac307 (main SOS project),
 * where the admin console writes multi-provider accounts.
 *
 * Multi-provider account = account with linkedProviderIds.length >= 2
 *
 * OPTIMIZATIONS (2025-01):
 * - Batch load all profiles in parallel instead of sequential
 * - Batch load all booking requests with IN query
 * - Cache provider data for reuse
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getSosFirestore, SOS_SERVICE_ACCOUNT } from "./sosFirestore";

// Initialize Firebase Admin for the local project (outils-sos-expat)
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

function timestampToISO(ts: admin.firestore.Timestamp | Date | string | null | undefined): string | undefined {
  if (!ts) return undefined;

  // Handle Firestore Timestamp
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof ts.toDate === 'function') {
    return ts.toDate().toISOString();
  }

  // Handle Date object
  if (ts instanceof Date) {
    return ts.toISOString();
  }

  // Handle string (already ISO or date string)
  if (typeof ts === 'string') {
    return ts;
  }

  // Handle Firestore timestamp-like object with seconds/nanoseconds
  if (typeof ts === 'object' && ts !== null && '_seconds' in ts) {
    const seconds = (ts as { _seconds: number })._seconds;
    return new Date(seconds * 1000).toISOString();
  }

  return undefined;
}

/**
 * Batch get documents by IDs (Firestore limit: 10 per batch for IN queries)
 */
async function batchGetDocs(
  db: admin.firestore.Firestore,
  collectionName: string,
  ids: string[]
): Promise<Map<string, admin.firestore.DocumentData>> {
  const results = new Map<string, admin.firestore.DocumentData>();
  if (ids.length === 0) return results;

  // Use getAll for efficient batch fetch
  const refs = ids.map(id => db.collection(collectionName).doc(id));
  const docs = await db.getAll(...refs);

  for (const doc of docs) {
    if (doc.exists) {
      results.set(doc.id, doc.data()!);
    }
  }

  return results;
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
    // CRITICAL: Include the SOS service account secret to access sos-urgently-ac307
    secrets: [SOS_SERVICE_ACCOUNT],
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    const { sessionToken } = request.data;
    const startTime = Date.now();

    logger.info("[getMultiDashboardData] Request received");

    // Validate session token format
    if (!sessionToken || typeof sessionToken !== "string" || !sessionToken.startsWith("mds_")) {
      throw new HttpsError("unauthenticated", "Invalid session token");
    }

    try {
      // ==========================================================================
      // Use the SOS project's Firestore (sos-urgently-ac307)
      // This is where the admin console writes multi-provider accounts
      // ==========================================================================
      const db = getSosFirestore();

      logger.info("[getMultiDashboardData] Connected to SOS Firestore (sos-urgently-ac307)");

      // ==========================================================================
      // 1. Load multi-provider accounts (accounts with 2+ linked providers)
      // ==========================================================================
      // Multi-provider = account managing 2 or more providers

      const allUsersSnap = await db.collection("users").get();
      const usersToProcess = allUsersSnap.docs.filter(doc => {
        const data = doc.data();
        const linkedIds = data.linkedProviderIds;
        // Multi-provider = 2 or more providers linked
        return Array.isArray(linkedIds) && linkedIds.length >= 2;
      });

      logger.info("[getMultiDashboardData] Found multi-provider accounts", {
        count: usersToProcess.length,
        totalUsers: allUsersSnap.size,
        elapsed: Date.now() - startTime,
      });

      if (usersToProcess.length === 0) {
        logger.info("[getMultiDashboardData] No multi-provider accounts found");
        return {
          success: true,
          accounts: [],
        };
      }

      // Use usersToProcess instead of usersSnap.docs below
      const usersSnap = { docs: usersToProcess, size: usersToProcess.length };

      // ==========================================================================
      // 2. Collect ALL unique provider IDs for batch loading
      // ==========================================================================
      const allProviderIds = new Set<string>();
      const userDataMap = new Map<string, { userData: admin.firestore.DocumentData; linkedIds: string[] }>();

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const linkedIds: string[] = userData.linkedProviderIds || [];

        // Skip users without linked providers (shouldn't happen if isMultiProvider is true, but safety check)
        if (!Array.isArray(linkedIds) || linkedIds.length === 0) continue;

        userDataMap.set(userDoc.id, { userData, linkedIds });

        for (const pid of linkedIds) {
          allProviderIds.add(pid);
        }
      }

      logger.info("[getMultiDashboardData] Collected provider IDs", {
        uniqueProviders: allProviderIds.size,
        elapsed: Date.now() - startTime,
      });

      // ==========================================================================
      // 3. BATCH LOAD all profiles (sos_profiles first, then fallback to providers)
      // ==========================================================================
      const providerIdsArray = Array.from(allProviderIds);

      // Batch get from sos_profiles
      const profilesMap = await batchGetDocs(db, "sos_profiles", providerIdsArray);

      // Find missing profiles
      const missingIds = providerIdsArray.filter(id => !profilesMap.has(id));

      // Batch get missing from providers collection
      if (missingIds.length > 0) {
        const providersMap = await batchGetDocs(db, "providers", missingIds);
        for (const [id, data] of providersMap) {
          profilesMap.set(id, data);
        }
        logger.info("[getMultiDashboardData] Found additional providers in 'providers' collection", {
          count: providersMap.size,
        });
      }

      logger.info("[getMultiDashboardData] Loaded all profiles", {
        total: profilesMap.size,
        elapsed: Date.now() - startTime,
      });

      // ==========================================================================
      // 4. BATCH LOAD all booking requests for all providers
      // ==========================================================================
      // Use multiple IN queries (Firestore limit: 30 items per IN query)
      const bookingsByProvider = new Map<string, BookingRequest[]>();
      const BATCH_SIZE = 30;

      for (let i = 0; i < providerIdsArray.length; i += BATCH_SIZE) {
        const batch = providerIdsArray.slice(i, i + BATCH_SIZE);

        // Note: Removed orderBy to avoid requiring a composite index
        // Sorting is done later when building accounts
        const bookingsSnap = await db
          .collection("booking_requests")
          .where("providerId", "in", batch)
          .limit(200) // Limit total to avoid excessive data
          .get();

        for (const bookingDoc of bookingsSnap.docs) {
          const data = bookingDoc.data();
          const providerId = data.providerId;

          if (!bookingsByProvider.has(providerId)) {
            bookingsByProvider.set(providerId, []);
          }

          bookingsByProvider.get(providerId)!.push({
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

      logger.info("[getMultiDashboardData] Loaded all bookings", {
        totalBookings: Array.from(bookingsByProvider.values()).reduce((sum, arr) => sum + arr.length, 0),
        elapsed: Date.now() - startTime,
      });

      // ==========================================================================
      // 5. Build accounts using cached data
      // ==========================================================================
      const accounts: MultiProviderAccount[] = [];

      for (const [userId, { userData, linkedIds }] of userDataMap) {
        const providers: Provider[] = [];

        for (const pid of linkedIds) {
          const profile = profilesMap.get(pid);
          if (profile) {
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
            logger.warn("[getMultiDashboardData] Provider not found", {
              pid,
              userId,
            });
          }
        }

        // Skip accounts with no valid providers
        if (providers.length === 0) {
          logger.warn("[getMultiDashboardData] Skipping user - no valid providers found", {
            userId,
            linkedIds,
          });
          continue;
        }

        // Collect booking requests for this account's providers
        const bookingRequests: BookingRequest[] = [];
        for (const provider of providers) {
          const providerBookings = bookingsByProvider.get(provider.id) || [];
          // Add provider info to bookings
          for (const booking of providerBookings) {
            booking.providerName = booking.providerName || provider.name;
            booking.providerType = booking.providerType || provider.type;
          }
          bookingRequests.push(...providerBookings);
        }

        // Sort bookings by date (newest first)
        bookingRequests.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        accounts.push({
          userId,
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

      const totalTime = Date.now() - startTime;
      logger.info("[getMultiDashboardData] Success", {
        accountCount: accounts.length,
        totalProviders: accounts.reduce((sum, a) => sum + a.providers.length, 0),
        totalBookings: accounts.reduce((sum, a) => sum + a.bookingRequests.length, 0),
        executionTimeMs: totalTime,
      });

      return {
        success: true,
        accounts,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error("[getMultiDashboardData] Error", {
        message: errorMessage,
        stack: errorStack,
        error: JSON.stringify(error, Object.getOwnPropertyNames(error || {})),
      });
      throw new HttpsError("internal", `Failed to load dashboard data: ${errorMessage}`);
    }
  }
);
