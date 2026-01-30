/**
 * =============================================================================
 * MULTI DASHBOARD - Bridge to Full AI System
 * =============================================================================
 *
 * Firestore trigger that listens to booking_requests in SOS and creates
 * a corresponding booking in Outil to trigger the complete AI system.
 *
 * This bridges the gap between:
 * - SOS: booking_requests collection (where clients book)
 * - Outil: bookings collection (where aiOnBookingCreated triggers)
 *
 * The complete AI system (aiOnBookingCreated) will:
 * 1. Generate AI response using GPT-4o + Perplexity research
 * 2. Create conversation in Outil
 * 3. Sync AI response back to SOS booking_requests
 * 4. Sync conversation to SOS conversations (for multi-dashboard)
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getSosFirestore, SOS_SERVICE_ACCOUNT } from "./sosFirestore";

// Initialize Firebase Admin for local project (Outil)
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// =============================================================================
// TYPES
// =============================================================================

interface BookingRequestData {
  providerId: string;
  providerName?: string;
  providerType?: "lawyer" | "expat";
  providerCountry?: string;
  providerEmail?: string;
  providerSpecialties?: string[];
  providerLanguages?: string[];
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];
  serviceType?: string;
  title?: string;
  description?: string;
  urgency?: string;
  status?: string;
  aiResponse?: object;
  aiProcessedAt?: admin.firestore.Timestamp;
  forcedAIAccess?: boolean;
  hasActiveSubscription?: boolean;
  subscriptionStatus?: string;
}

interface TriggerAiRequest {
  sessionToken?: string;  // Optional: for admin access
  bookingRequestId: string;
  // For programmatic access (booking creation flow)
  clientId?: string;
  providerId?: string;
}

interface TriggerAiResponse {
  success: boolean;
  bookingId?: string;
  message?: string;
  error?: string;
}

// =============================================================================
// CALLABLE FUNCTION: Trigger AI Generation
// =============================================================================

/**
 * Triggers the full AI system for a booking_request.
 * Can be called:
 * 1. From multi-dashboard with session token (admin access)
 * 2. From booking creation flow with clientId/providerId (programmatic access)
 *
 * Creates a corresponding booking in Outil to trigger aiOnBookingCreated.
 */
export const triggerAiFromBookingRequest = onCall<
  TriggerAiRequest,
  Promise<TriggerAiResponse>
>(
  {
    region: "europe-west1",
    secrets: [SOS_SERVICE_ACCOUNT],
    memory: "512MiB",
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
    const { sessionToken, bookingRequestId, clientId, providerId } = request.data;

    logger.info("[triggerAiFromBookingRequest] Request received", {
      bookingRequestId,
      hasSessionToken: !!sessionToken,
      hasClientId: !!clientId,
      hasProviderId: !!providerId,
    });

    // Validate access: either session token OR clientId+providerId for booking creation
    const hasAdminAccess = sessionToken && typeof sessionToken === "string" && sessionToken.startsWith("mds_");
    const hasBookingAccess = clientId && providerId;

    if (!hasAdminAccess && !hasBookingAccess) {
      throw new HttpsError("unauthenticated", "Invalid authentication: provide session token or clientId+providerId");
    }

    if (!bookingRequestId) {
      throw new HttpsError("invalid-argument", "bookingRequestId is required");
    }

    try {
      // Get booking_request from SOS
      const sosDb = getSosFirestore();
      const bookingRequestDoc = await sosDb.collection("booking_requests").doc(bookingRequestId).get();

      if (!bookingRequestDoc.exists) {
        throw new HttpsError("not-found", "Booking request not found");
      }

      const bookingRequest = bookingRequestDoc.data() as BookingRequestData;

      // Check if already processed
      if (bookingRequest.aiResponse || bookingRequest.aiProcessedAt) {
        logger.info("[onBookingRequestCreatedGenerateAi] Already processed", {
          bookingRequestId,
        });
        return {
          success: true,
          message: "Already processed",
        };
      }

      // Check if provider has AI access
      if (!bookingRequest.providerId) {
        throw new HttpsError("invalid-argument", "No providerId in booking request");
      }

      // Get provider info from SOS
      const providerDoc = await sosDb.collection("providers").doc(bookingRequest.providerId).get();
      const providerData = providerDoc.exists ? providerDoc.data() : null;

      // Build client name
      const clientName = bookingRequest.clientName
        || `${bookingRequest.clientFirstName || ""} ${bookingRequest.clientLastName || ""}`.trim()
        || "Client";

      // Create booking in Outil (this will trigger aiOnBookingCreated)
      const outilDb = admin.firestore();
      const bookingRef = outilDb.collection("bookings").doc();

      const bookingData = {
        // Client info
        clientFirstName: bookingRequest.clientFirstName || null,
        clientLastName: bookingRequest.clientLastName || null,
        clientName,
        clientEmail: bookingRequest.clientEmail || "",
        clientPhone: bookingRequest.clientPhone || "",
        clientWhatsapp: bookingRequest.clientPhone || "",
        clientCurrentCountry: bookingRequest.clientCurrentCountry || null,
        clientNationality: bookingRequest.clientNationality || null,
        clientLanguages: bookingRequest.clientLanguages || null,

        // Booking details
        title: bookingRequest.title || "Consultation",
        description: bookingRequest.description || null,
        serviceType: bookingRequest.serviceType || null,
        category: bookingRequest.serviceType || null,
        urgency: bookingRequest.urgency || "normal",

        // Provider info
        providerId: bookingRequest.providerId,
        providerType: bookingRequest.providerType || providerData?.type || "lawyer",
        providerName: bookingRequest.providerName || providerData?.name || null,
        providerCountry: bookingRequest.providerCountry || providerData?.country || null,
        // IMPORTANT: Provider specialties for better AI context
        providerSpecialties: bookingRequest.providerSpecialties || providerData?.specialties || null,
        providerLanguages: bookingRequest.providerLanguages || providerData?.languages || null,

        // Status
        status: "pending",
        aiProcessed: false,

        // Link back to SOS booking_request
        externalId: bookingRequestId,
        source: "sos-multi-dashboard",

        // Timestamps
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Ensure provider exists in Outil with AI access
      const outilProviderRef = outilDb.collection("providers").doc(bookingRequest.providerId);
      const outilProviderDoc = await outilProviderRef.get();

      if (!outilProviderDoc.exists) {
        // Create provider in Outil with AI access info from SOS
        await outilProviderRef.set({
          name: bookingRequest.providerName || providerData?.name || null,
          email: bookingRequest.providerEmail || providerData?.email || null,
          type: bookingRequest.providerType || providerData?.type || "lawyer",
          country: bookingRequest.providerCountry || providerData?.country || null,
          active: true,
          // AI access - grant forcedAIAccess for multi-dashboard providers
          forcedAIAccess: bookingRequest.forcedAIAccess ?? providerData?.forcedAIAccess ?? true,
          hasActiveSubscription: bookingRequest.hasActiveSubscription ?? providerData?.hasActiveSubscription ?? false,
          subscriptionStatus: bookingRequest.subscriptionStatus ?? providerData?.subscriptionStatus ?? null,
          // Quota
          aiCallsUsed: 0,
          aiCallsLimit: -1, // Unlimited for multi-dashboard
          // Metadata
          source: "sos-multi-dashboard-sync",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info("[onBookingRequestCreatedGenerateAi] Created provider in Outil", {
          providerId: bookingRequest.providerId,
        });
      } else {
        // Update provider to ensure AI access
        await outilProviderRef.update({
          forcedAIAccess: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Create the booking (this triggers aiOnBookingCreated)
      await bookingRef.set(bookingData);

      logger.info("[onBookingRequestCreatedGenerateAi] Booking created in Outil", {
        bookingRequestId,
        bookingId: bookingRef.id,
        providerId: bookingRequest.providerId,
        NOTE: "aiOnBookingCreated trigger will fire and generate AI response",
      });

      // Mark booking_request as processing
      await sosDb.collection("booking_requests").doc(bookingRequestId).update({
        outilBookingId: bookingRef.id,
        aiProcessingStartedAt: new Date().toISOString(),
      });

      return {
        success: true,
        bookingId: bookingRef.id,
        message: "Booking created in Outil - AI generation triggered",
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[onBookingRequestCreatedGenerateAi] Error", {
        bookingRequestId,
        error: errorMessage,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", `Failed to trigger AI: ${errorMessage}`);
    }
  }
);
