/**
 * =============================================================================
 * META CAPI TRACKING TRIGGERS
 * =============================================================================
 *
 * Server-side tracking triggers for Meta Conversions API (CAPI).
 * These triggers ensure conversion events are tracked even when browser
 * tracking is blocked by ad blockers or privacy restrictions.
 *
 * Events tracked:
 * - Lead: When a booking request is created
 * - CompleteRegistration: When a user is created
 * - InitiateCheckout: When a call session payment is authorized
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {
  trackCAPILead,
  trackCAPICompleteRegistration,
  trackCAPIInitiateCheckout,
  UserData,
  META_CAPI_TOKEN,
} from "../metaConversionsApi";

// ============================================================================
// Types
// ============================================================================

interface BookingRequest {
  clientEmail?: string;
  clientPhone?: string;
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  providerId?: string;
  providerType?: "lawyer" | "expat";
  serviceType?: string;
  amount?: number;
  currency?: string;
  country?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

interface UserDocument {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: "client" | "lawyer" | "expat" | "admin";
  country?: string;
  city?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
}

interface CallSession {
  clientEmail?: string;
  clientPhone?: string;
  clientName?: string;
  providerId?: string;
  providerType?: "lawyer" | "expat";
  serviceType?: string;
  payment?: {
    status?: string;
    amount?: number;
    currency?: string;
  };
  amount?: number;
  currency?: string;
  country?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract user data for CAPI from a document
 */
function extractUserData(data: Partial<BookingRequest & UserDocument & CallSession>): UserData {
  const userData: UserData = {};

  // Email
  if (data.clientEmail || data.email) {
    userData.em = (data.clientEmail || data.email)?.toLowerCase().trim();
  }

  // Phone
  if (data.clientPhone || data.phone) {
    userData.ph = (data.clientPhone || data.phone)?.replace(/[^0-9+]/g, "");
  }

  // Names
  if (data.clientFirstName || data.firstName) {
    userData.fn = (data.clientFirstName || data.firstName)?.toLowerCase().trim();
  }
  if (data.clientLastName || data.lastName) {
    userData.ln = (data.clientLastName || data.lastName)?.toLowerCase().trim();
  }
  if (!userData.fn && !userData.ln && (data.clientName || data.fullName)) {
    const nameParts = (data.clientName || data.fullName)?.split(" ") || [];
    if (nameParts.length > 0) {
      userData.fn = nameParts[0]?.toLowerCase().trim();
    }
    if (nameParts.length > 1) {
      userData.ln = nameParts.slice(1).join(" ").toLowerCase().trim();
    }
  }

  // Location
  if (data.country) {
    userData.country = data.country.toLowerCase().trim();
  }
  if ((data as UserDocument).city) {
    userData.ct = (data as UserDocument).city?.toLowerCase().trim();
  }

  // Facebook identifiers (not hashed)
  if (data.fbp) userData.fbp = data.fbp;
  if (data.fbc || data.fbclid) userData.fbc = data.fbc || `fb.1.${Date.now()}.${data.fbclid}`;
  if (data.client_ip_address) userData.client_ip_address = data.client_ip_address;
  if (data.client_user_agent) userData.client_user_agent = data.client_user_agent;

  return userData;
}

// ============================================================================
// TRIGGER: Lead - Booking Request Created
// ============================================================================

/**
 * Track Lead event when a booking request is created
 */
export const onBookingRequestCreatedTrackLead = onDocumentCreated(
  {
    document: "booking_requests/{requestId}",
    region: "europe-west1",
    secrets: [META_CAPI_TOKEN],
  },
  async (event) => {
    const requestId = event.params.requestId;
    const data = event.data?.data() as BookingRequest | undefined;

    if (!data) {
      console.warn("[CAPI Lead] No data for booking request:", requestId);
      return;
    }

    try {
      const userData = extractUserData(data);

      const result = await trackCAPILead({
        userData,
        value: data.amount,
        currency: data.currency || "EUR",
        contentName: `booking_request_${data.providerType || "service"}`,
        contentCategory: data.providerType || "service",
        serviceType: data.serviceType,
        eventSourceUrl: "https://sos-expat.com",
      });

      if (result.success) {
        console.log(`[CAPI Lead] ✅ Tracked for booking ${requestId}`, {
          eventId: result.eventId,
          eventsReceived: result.eventsReceived,
        });

        // Store tracking info in the document
        await admin.firestore().collection("booking_requests").doc(requestId).update({
          capiTracking: {
            leadEventId: result.eventId,
            trackedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      } else {
        console.warn(`[CAPI Lead] ⚠️ Failed for booking ${requestId}:`, result.error);
      }
    } catch (error) {
      console.error(`[CAPI Lead] ❌ Error for booking ${requestId}:`, error);
    }
  }
);

// ============================================================================
// TRIGGER: CompleteRegistration - User Created
// ============================================================================

/**
 * Track CompleteRegistration event when a user is created
 */
export const onUserCreatedTrackRegistration = onDocumentCreated(
  {
    document: "users/{uid}",
    region: "europe-west1",
    secrets: [META_CAPI_TOKEN],
  },
  async (event) => {
    const uid = event.params.uid;
    const data = event.data?.data() as UserDocument | undefined;

    if (!data) {
      console.warn("[CAPI Registration] No data for user:", uid);
      return;
    }

    // Only track non-admin users
    if (data.role === "admin") {
      console.log("[CAPI Registration] Skipping admin user:", uid);
      return;
    }

    try {
      const userData = extractUserData(data);
      userData.external_id = uid;

      const result = await trackCAPICompleteRegistration({
        userData,
        contentName: `${data.role || "user"}_registration`,
        status: "completed",
        eventSourceUrl: "https://sos-expat.com",
      });

      if (result.success) {
        console.log(`[CAPI Registration] ✅ Tracked for user ${uid}`, {
          eventId: result.eventId,
          role: data.role,
        });

        // Store tracking info in the document
        await admin.firestore().collection("users").doc(uid).update({
          capiTracking: {
            registrationEventId: result.eventId,
            trackedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      } else {
        console.warn(`[CAPI Registration] ⚠️ Failed for user ${uid}:`, result.error);
      }
    } catch (error) {
      console.error(`[CAPI Registration] ❌ Error for user ${uid}:`, error);
    }
  }
);

// ============================================================================
// TRIGGER: InitiateCheckout - Call Session Payment Authorized
// ============================================================================

/**
 * Track InitiateCheckout event when a call session payment is authorized
 */
export const onCallSessionPaymentAuthorized = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west1",
    secrets: [META_CAPI_TOKEN],
  },
  async (event) => {
    const sessionId = event.params.sessionId;
    const beforeData = event.data?.before.data() as CallSession | undefined;
    const afterData = event.data?.after.data() as CallSession | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    // Check if payment status changed to "authorized"
    const oldStatus = beforeData.payment?.status;
    const newStatus = afterData.payment?.status;

    if (oldStatus === newStatus || newStatus !== "authorized") {
      return; // Only track when status changes TO "authorized"
    }

    console.log(`[CAPI Checkout] Payment authorized for session ${sessionId}`);

    try {
      const userData = extractUserData(afterData);

      const amount = afterData.payment?.amount || afterData.amount || 0;
      const currency = afterData.payment?.currency || afterData.currency || "EUR";

      const result = await trackCAPIInitiateCheckout({
        userData,
        value: amount,
        currency: currency.toUpperCase(),
        contentName: `${afterData.providerType || "service"}_call`,
        contentCategory: afterData.providerType || "service",
        contentIds: afterData.providerId ? [afterData.providerId] : undefined,
        numItems: 1,
        serviceType: afterData.serviceType,
        providerType: afterData.providerType,
        eventSourceUrl: "https://sos-expat.com",
      });

      if (result.success) {
        console.log(`[CAPI Checkout] ✅ Tracked for session ${sessionId}`, {
          eventId: result.eventId,
          amount,
          currency,
        });

        // Store tracking info in the document
        await admin.firestore().collection("call_sessions").doc(sessionId).update({
          capiTracking: {
            initiateCheckoutEventId: result.eventId,
            trackedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      } else {
        console.warn(`[CAPI Checkout] ⚠️ Failed for session ${sessionId}:`, result.error);
      }
    } catch (error) {
      console.error(`[CAPI Checkout] ❌ Error for session ${sessionId}:`, error);
    }
  }
);
