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

      // 1. Load all users with linkedProviderIds
      const usersSnap = await db.collection("users").get();

      const accounts: MultiProviderAccount[] = [];

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const linkedIds: string[] = userData.linkedProviderIds || [];

        // Only include users with at least one linked provider
        if (linkedIds.length === 0) continue;

        // Load provider details
        const providers: Provider[] = [];
        for (const pid of linkedIds) {
          const profileDoc = await db.collection("sos_profiles").doc(pid).get();
          if (profileDoc.exists) {
            const profile = profileDoc.data()!;
            providers.push({
              id: pid,
              name: profile.displayName || profile.firstName || "N/A",
              email: profile.email || "",
              type: profile.type || "lawyer",
              isActive: userData.activeProviderId === pid,
              isOnline: profile.isOnline === true,
              availability: profile.availability || "offline",
              country: profile.country,
              avatar: profile.photoURL || profile.avatar,
            });
          }
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
