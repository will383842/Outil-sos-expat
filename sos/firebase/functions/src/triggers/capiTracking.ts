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
 * - Purchase: When a call session payment is captured (completed)
 * - Contact/Lead: When a contact form is submitted
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {
  trackCAPILead,
  trackCAPICompleteRegistration,
  trackCAPIInitiateCheckout,
  trackCAPIPurchase,
  UserData,
  META_CAPI_TOKEN,
  CAPIEventResult,
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
  price?: number; // Alternative field name for amount
  currency?: string;
  country?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  // Meta tracking identifiers for Pixel/CAPI deduplication
  metaEventId?: string;
}

interface UserDocument {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: "client" | "lawyer" | "expat" | "admin" | "chatter" | "influencer" | "blogger" | "groupAdmin";
  country?: string;
  city?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  metaEventId?: string;
}

interface CallSession {
  clientEmail?: string;
  clientPhone?: string;
  clientName?: string;
  clientId?: string;
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
  pixelEventId?: string;
}

interface ContactSubmission {
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  subject?: string;
  message?: string;
  country?: string;
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

// ============================================================================
// Rate Limiting for Triggers (prevents spam/abuse)
// ============================================================================

const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const TRIGGER_RATE_LIMIT = {
  MAX_EVENTS_PER_DOC: 1, // Max 1 CAPI call per document
  WINDOW_MS: 60 * 1000, // 1 minute window
};

/**
 * Check if a document has already been processed recently
 * Prevents duplicate CAPI calls for the same document
 */
function checkTriggerRateLimit(docId: string, eventType: string): boolean {
  const key = `${eventType}_${docId}`;
  const now = Date.now();
  const entry = rateLimitCache.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitCache.set(key, { count: 1, resetTime: now + TRIGGER_RATE_LIMIT.WINDOW_MS });
    return true;
  }

  if (entry.count >= TRIGGER_RATE_LIMIT.MAX_EVENTS_PER_DOC) {
    console.warn(`[CAPI Rate Limit] Document ${docId} already processed for ${eventType}`);
    return false;
  }

  entry.count++;
  return true;
}

// Note: Cache cleanup happens automatically in checkTriggerRateLimit when entries expire
// No setInterval needed - Cloud Functions cold start resets the cache anyway

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

/**
 * Log CAPI event to Firestore for analytics dashboard
 */
interface LogCAPIEventParams {
  eventType: string;
  eventId: string;
  source: 'trigger_booking' | 'trigger_user' | 'trigger_call' | 'trigger_contact';
  documentId: string;
  userId?: string;
  userData: UserData;
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  metaEventsReceived?: number;
}

async function logCAPIEventToFirestore(params: LogCAPIEventParams): Promise<void> {
  try {
    // Calculate user data quality score
    let qualityScore = 0;
    if (params.userData.em) qualityScore += 30;
    if (params.userData.ph) qualityScore += 25;
    if (params.userData.fn) qualityScore += 15;
    if (params.userData.ln) qualityScore += 10;
    if (params.userData.country) qualityScore += 10;
    if (params.userData.fbp) qualityScore += 5;
    if (params.userData.fbc) qualityScore += 5;

    await admin.firestore().collection('capi_events').add({
      // Event identification
      eventType: params.eventType,
      eventId: params.eventId,
      source: params.source,
      documentId: params.documentId,

      // User identification
      userId: params.userId || params.userData.external_id || null,
      isAnonymous: !params.userId && !params.userData.external_id,

      // User data quality
      hasEmail: !!params.userData.em,
      hasPhone: !!params.userData.ph,
      hasFirstName: !!params.userData.fn,
      hasLastName: !!params.userData.ln,
      hasCountry: !!params.userData.country,
      hasFbp: !!params.userData.fbp,
      hasFbc: !!params.userData.fbc,
      qualityScore,

      // Event content
      contentName: params.contentName || null,
      contentCategory: params.contentCategory || null,

      // Value tracking
      value: params.value || null,
      currency: params.currency || 'EUR',

      // Meta response
      metaEventsReceived: params.metaEventsReceived || 1,

      // Timestamps
      trackedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn('[logCAPIEventToFirestore] Failed to log event:', error);
  }
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
    region: "europe-west3",
    secrets: [META_CAPI_TOKEN],
  },
  async (event) => {
    const requestId = event.params.requestId;
    const data = event.data?.data() as BookingRequest | undefined;

    if (!data) {
      console.warn("[CAPI Lead] No data for booking request:", requestId);
      return;
    }

    // Rate limit check
    if (!checkTriggerRateLimit(requestId, "lead")) {
      console.log("[CAPI Lead] Rate limited, skipping:", requestId);
      return;
    }

    try {
      const userData = extractUserData(data);

      // Use metaEventId from frontend if provided for deduplication
      const result = await trackCAPILead({
        userData,
        value: data.amount || data.price,
        currency: data.currency || "EUR",
        contentName: `booking_request_${data.providerType || "service"}`,
        contentCategory: data.providerType || "service",
        serviceType: data.serviceType,
        eventSourceUrl: "https://sos-expat.com",
        eventId: data.metaEventId, // Use frontend-generated eventId for deduplication
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

        // Log to capi_events for analytics dashboard
        await logCAPIEventToFirestore({
          eventType: 'Lead',
          eventId: result.eventId,
          source: 'trigger_booking',
          documentId: requestId,
          userData,
          value: data.amount || data.price,
          currency: data.currency || 'EUR',
          contentName: `booking_request_${data.providerType || 'service'}`,
          contentCategory: data.providerType || 'service',
          metaEventsReceived: result.eventsReceived,
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
export async function handleCAPIRegistration(event: any) {
    const uid = event.params.uid || event.params.userId;
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

    // Rate limit check
    if (!checkTriggerRateLimit(uid, "registration")) {
      console.log("[CAPI Registration] Rate limited, skipping:", uid);
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
        eventId: data.metaEventId, // Pixel/CAPI deduplication
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

        // Log to capi_events for analytics dashboard
        await logCAPIEventToFirestore({
          eventType: 'CompleteRegistration',
          eventId: result.eventId,
          source: 'trigger_user',
          documentId: uid,
          userId: uid,
          userData,
          contentName: `${data.role || 'user'}_registration`,
          contentCategory: data.role || 'user',
          metaEventsReceived: result.eventsReceived,
        });
      } else {
        console.warn(`[CAPI Registration] ⚠️ Failed for user ${uid}:`, result.error);
      }
    } catch (error) {
      console.error(`[CAPI Registration] ❌ Error for user ${uid}:`, error);
    }
}

export const onUserCreatedTrackRegistration = onDocumentCreated(
  {
    document: "users/{uid}",
    region: "europe-west3",
    secrets: [META_CAPI_TOKEN],
  },
  handleCAPIRegistration
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
    region: "europe-west3",
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

    // Rate limit check
    if (!checkTriggerRateLimit(sessionId, "checkout")) {
      console.log("[CAPI Checkout] Rate limited, skipping:", sessionId);
      return;
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

        // P0 FIX: DO NOT update call_sessions here!
        // Updating the same document that triggered this function causes an infinite loop
        // of Firestore triggers (chatterOnCallCompleted, influencerOnCallCompleted, etc.)
        // The tracking info is already stored in capi_events below, so this is redundant.
        // This was causing quota exhaustion (cpu_allocation) since 2026-01-31

        // Log to capi_events for analytics dashboard
        await logCAPIEventToFirestore({
          eventType: 'InitiateCheckout',
          eventId: result.eventId,
          source: 'trigger_call',
          documentId: sessionId,
          userData,
          value: amount,
          currency: currency.toUpperCase(),
          contentName: `${afterData.providerType || 'service'}_call`,
          contentCategory: afterData.providerType || 'service',
          metaEventsReceived: result.eventsReceived,
        });
      } else {
        console.warn(`[CAPI Checkout] ⚠️ Failed for session ${sessionId}:`, result.error);
      }
    } catch (error) {
      console.error(`[CAPI Checkout] ❌ Error for session ${sessionId}:`, error);
    }
  }
);

// ============================================================================
// TRIGGER: Contact - Contact Form Submitted
// ============================================================================

/**
 * Track Lead event when a contact form is submitted
 * Uses Lead event type as Meta recommends for contact form submissions
 */
export const onContactSubmittedTrackLead = onDocumentCreated(
  {
    document: "contact_submissions/{submissionId}",
    region: "europe-west3",
    secrets: [META_CAPI_TOKEN],
  },
  async (event) => {
    const submissionId = event.params.submissionId;
    const data = event.data?.data() as ContactSubmission | undefined;

    if (!data) {
      console.warn("[CAPI Contact] No data for submission:", submissionId);
      return;
    }

    // Rate limit check
    if (!checkTriggerRateLimit(submissionId, "contact")) {
      console.log("[CAPI Contact] Rate limited, skipping:", submissionId);
      return;
    }

    try {
      const userData: UserData = {};

      // Extract user data
      if (data.email) {
        userData.em = data.email.toLowerCase().trim();
      }
      if (data.phone) {
        userData.ph = data.phone.replace(/[^0-9+]/g, "");
      }
      if (data.firstName) {
        userData.fn = data.firstName.toLowerCase().trim();
      }
      if (data.lastName) {
        userData.ln = data.lastName.toLowerCase().trim();
      }
      if (!userData.fn && !userData.ln && data.name) {
        const nameParts = data.name.split(" ");
        if (nameParts.length > 0) {
          userData.fn = nameParts[0]?.toLowerCase().trim();
        }
        if (nameParts.length > 1) {
          userData.ln = nameParts.slice(1).join(" ").toLowerCase().trim();
        }
      }
      if (data.country) {
        userData.country = data.country.toLowerCase().trim();
      }

      // Facebook identifiers
      if (data.fbp) userData.fbp = data.fbp;
      if (data.fbc) userData.fbc = data.fbc;
      if (data.client_ip_address) userData.client_ip_address = data.client_ip_address;
      if (data.client_user_agent) userData.client_user_agent = data.client_user_agent;

      const result: CAPIEventResult = await trackCAPILead({
        userData,
        contentName: "contact_form",
        contentCategory: data.subject || "support",
        serviceType: "contact",
        eventSourceUrl: "https://sos-expat.com/contact",
      });

      if (result.success) {
        console.log(`[CAPI Contact] ✅ Tracked for submission ${submissionId}`, {
          eventId: result.eventId,
          eventsReceived: result.eventsReceived,
        });

        // Store tracking info in the document
        await admin.firestore().collection("contact_submissions").doc(submissionId).update({
          capiTracking: {
            contactEventId: result.eventId,
            trackedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });

        // Log to capi_events for analytics dashboard
        await logCAPIEventToFirestore({
          eventType: 'Contact',
          eventId: result.eventId,
          source: 'trigger_contact',
          documentId: submissionId,
          userData,
          contentName: 'contact_form',
          contentCategory: data.subject || 'support',
          metaEventsReceived: result.eventsReceived,
        });
      } else {
        console.warn(`[CAPI Contact] ⚠️ Failed for submission ${submissionId}:`, result.error);
      }
    } catch (error) {
      console.error(`[CAPI Contact] ❌ Error for submission ${submissionId}:`, error);
    }
  }
);

// ============================================================================
// TRIGGER: Purchase - Call Session Payment Captured (Completed)
// ============================================================================

/**
 * Track Purchase event when a call session payment is fully captured.
 * Uses pixelEventId from the document for Pixel/CAPI deduplication.
 */
export const onCallSessionPaymentCaptured = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    secrets: [META_CAPI_TOKEN],
  },
  async (event) => {
    const sessionId = event.params.sessionId;
    const beforeData = event.data?.before.data() as CallSession | undefined;
    const afterData = event.data?.after.data() as CallSession | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    // Check if payment status changed to "captured"
    const oldStatus = beforeData.payment?.status;
    const newStatus = afterData.payment?.status;

    if (oldStatus === newStatus || newStatus !== "captured") {
      return; // Only track when status changes TO "captured"
    }

    // Rate limit check
    if (!checkTriggerRateLimit(sessionId, "purchase")) {
      console.log("[CAPI Purchase] Rate limited, skipping:", sessionId);
      return;
    }

    console.log(`[CAPI Purchase] Payment captured for session ${sessionId}`);

    try {
      const userData = extractUserData(afterData);

      const amount = afterData.payment?.amount || afterData.amount || 0;
      const currency = afterData.payment?.currency || afterData.currency || "EUR";

      const result = await trackCAPIPurchase({
        userData,
        value: amount,
        currency: currency.toUpperCase(),
        orderId: sessionId,
        contentName: `${afterData.providerType || "service"}_call`,
        contentCategory: afterData.providerType || "service",
        contentIds: afterData.providerId ? [afterData.providerId] : undefined,
        serviceType: afterData.serviceType,
        providerType: afterData.providerType,
        eventSourceUrl: "https://sos-expat.com",
        eventId: afterData.pixelEventId, // Pixel/CAPI deduplication
      });

      if (result.success) {
        console.log(`[CAPI Purchase] ✅ Tracked for session ${sessionId}`, {
          eventId: result.eventId,
          amount,
          currency,
        });

        // Log to capi_events for analytics dashboard
        await logCAPIEventToFirestore({
          eventType: "Purchase",
          eventId: result.eventId,
          source: "trigger_call",
          documentId: sessionId,
          userData,
          value: amount,
          currency: currency.toUpperCase(),
          contentName: `${afterData.providerType || "service"}_call`,
          contentCategory: afterData.providerType || "service",
          metaEventsReceived: result.eventsReceived,
        });
      } else {
        console.warn(`[CAPI Purchase] ⚠️ Failed for session ${sessionId}:`, result.error);
      }
    } catch (error) {
      console.error(`[CAPI Purchase] ❌ Error for session ${sessionId}:`, error);
    }
  }
);
