/**
 * =============================================================================
 * GOOGLE ADS TRACKING TRIGGERS
 * =============================================================================
 *
 * Server-side tracking triggers for Google Ads Conversions API (Enhanced Conversions).
 * These triggers ensure conversion events are tracked even when browser
 * tracking is blocked by ad blockers or privacy restrictions.
 *
 * Events tracked:
 * - Lead: When a booking request is created
 * - SignUp: When a user is created
 * - BeginCheckout: When a call session payment is authorized
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {
  trackGoogleAdsLead,
  GoogleAdsUserData,
  GoogleAdsEventResult,
  logGoogleAdsEventToFirestore,
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_LEAD_CONVERSION_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
} from "../googleAdsConversionsApi";

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
  price?: number;
  currency?: string;
  country?: string;
  gclid?: string; // Google Click ID
  client_ip_address?: string;
  client_user_agent?: string;
  googleAdsEventId?: string;
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
  streetAddress?: string;
  postalCode?: string;
  state?: string;
  gclid?: string;
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
  gclid?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

// ============================================================================
// Rate Limiting for Triggers (prevents spam/abuse)
// ============================================================================

const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const TRIGGER_RATE_LIMIT = {
  MAX_EVENTS_PER_DOC: 1,
  WINDOW_MS: 60 * 1000,
};

/**
 * Check if a document has already been processed recently
 */
function checkTriggerRateLimit(docId: string, eventType: string): boolean {
  const key = `gads_${eventType}_${docId}`;
  const now = Date.now();
  const entry = rateLimitCache.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitCache.set(key, { count: 1, resetTime: now + TRIGGER_RATE_LIMIT.WINDOW_MS });
    return true;
  }

  if (entry.count >= TRIGGER_RATE_LIMIT.MAX_EVENTS_PER_DOC) {
    console.warn(`[Google Ads Rate Limit] Document ${docId} already processed for ${eventType}`);
    return false;
  }

  entry.count++;
  return true;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract user data for Google Ads Enhanced Conversions from a document
 */
function extractGoogleAdsUserData(
  data: Partial<BookingRequest & UserDocument & CallSession>
): GoogleAdsUserData {
  const userData: GoogleAdsUserData = {};

  // Email
  if (data.clientEmail || data.email) {
    userData.email = data.clientEmail || data.email;
  }

  // Phone
  if (data.clientPhone || data.phone) {
    userData.phone = data.clientPhone || data.phone;
  }

  // Names
  if (data.clientFirstName || data.firstName) {
    userData.firstName = data.clientFirstName || data.firstName;
  }
  if (data.clientLastName || data.lastName) {
    userData.lastName = data.clientLastName || data.lastName;
  }
  if (!userData.firstName && !userData.lastName && (data.clientName || data.fullName)) {
    const nameParts = (data.clientName || data.fullName)?.split(" ") || [];
    if (nameParts.length > 0) {
      userData.firstName = nameParts[0];
    }
    if (nameParts.length > 1) {
      userData.lastName = nameParts.slice(1).join(" ");
    }
  }

  // Address
  if ((data as UserDocument).streetAddress) {
    userData.streetAddress = (data as UserDocument).streetAddress;
  }
  if ((data as UserDocument).city) {
    userData.city = (data as UserDocument).city;
  }
  if ((data as UserDocument).state) {
    userData.state = (data as UserDocument).state;
  }
  if ((data as UserDocument).postalCode) {
    userData.postalCode = (data as UserDocument).postalCode;
  }
  if (data.country) {
    userData.country = data.country;
  }

  return userData;
}

// All secrets needed for Google Ads API
const GOOGLE_ADS_SECRETS = [
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_LEAD_CONVERSION_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
];

// ============================================================================
// TRIGGER: Lead - Booking Request Created
// ============================================================================

/**
 * Track Lead event when a booking request is created
 */
export const onBookingRequestCreatedTrackGoogleAdsLead = onDocumentCreated(
  {
    document: "booking_requests/{requestId}",
    region: "europe-west3",
    cpu: 0.083,
    secrets: GOOGLE_ADS_SECRETS,
  },
  async (event) => {
    const requestId = event.params.requestId;
    const data = event.data?.data() as BookingRequest | undefined;

    if (!data) {
      console.warn("[Google Ads Lead] No data for booking request:", requestId);
      return;
    }

    // Rate limit check
    if (!checkTriggerRateLimit(requestId, "lead")) {
      console.log("[Google Ads Lead] Rate limited, skipping:", requestId);
      return;
    }

    try {
      const userData = extractGoogleAdsUserData(data);
      const orderId = data.googleAdsEventId || `lead_booking_${requestId}`;

      const result: GoogleAdsEventResult = await trackGoogleAdsLead({
        userData,
        value: data.amount || data.price,
        currency: data.currency || "EUR",
        orderId,
        gclid: data.gclid,
      });

      // Log to Firestore for analytics dashboard
      await logGoogleAdsEventToFirestore({
        eventType: "Lead",
        source: "trigger_booking",
        userId: undefined,
        orderId,
        value: data.amount || data.price,
        currency: data.currency || "EUR",
        gclid: data.gclid,
        userData,
        success: result.success,
        error: result.error,
        contentName: `booking_request_${data.providerType || "service"}`,
        contentCategory: data.providerType || "service",
      });

      if (result.success) {
        console.log(`[Google Ads Lead] Tracked for booking ${requestId}`, {
          orderId: result.orderId,
        });

        // Store tracking info in the document
        await admin.firestore().collection("booking_requests").doc(requestId).update({
          googleAdsTracking: {
            leadOrderId: result.orderId,
            trackedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      } else {
        console.warn(`[Google Ads Lead] Failed for booking ${requestId}:`, result.error);
      }
    } catch (error) {
      console.error(`[Google Ads Lead] Error for booking ${requestId}:`, error);

      // Log failure to Firestore
      await logGoogleAdsEventToFirestore({
        eventType: "Lead",
        source: "trigger_booking",
        orderId: `lead_booking_${requestId}`,
        gclid: data.gclid,
        userData: extractGoogleAdsUserData(data),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        contentName: `booking_request_${data.providerType || "service"}`,
        contentCategory: data.providerType || "service",
      });
    }
  }
);

// ============================================================================
// TRIGGER: SignUp - User Created
// ============================================================================

/**
 * Track SignUp event when a user is created
 */
export async function handleGoogleAdsSignUp(event: any) {
    const uid = event.params.uid || event.params.userId;
    const data = event.data?.data() as UserDocument | undefined;

    if (!data) {
      console.warn("[Google Ads SignUp] No data for user:", uid);
      return;
    }

    // Only track non-admin users
    if (data.role === "admin") {
      console.log("[Google Ads SignUp] Skipping admin user:", uid);
      return;
    }

    // Rate limit check
    if (!checkTriggerRateLimit(uid, "signup")) {
      console.log("[Google Ads SignUp] Rate limited, skipping:", uid);
      return;
    }

    try {
      const userData = extractGoogleAdsUserData(data);
      const orderId = `signup_${uid}`;

      const result: GoogleAdsEventResult = await trackGoogleAdsLead({
        userData,
        orderId,
        gclid: data.gclid,
      });

      // Log to Firestore for analytics dashboard
      await logGoogleAdsEventToFirestore({
        eventType: "SignUp",
        source: "trigger_user",
        userId: uid,
        orderId,
        gclid: data.gclid,
        userData,
        success: result.success,
        error: result.error,
        contentName: `${data.role || "user"}_registration`,
        contentCategory: data.role || "user",
      });

      if (result.success) {
        console.log(`[Google Ads SignUp] Tracked for user ${uid}`, {
          orderId: result.orderId,
          role: data.role,
        });

        // Store tracking info in the document
        await admin.firestore().collection("users").doc(uid).update({
          googleAdsTracking: {
            signUpOrderId: result.orderId,
            trackedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });
      } else {
        console.warn(`[Google Ads SignUp] Failed for user ${uid}:`, result.error);
      }
    } catch (error) {
      console.error(`[Google Ads SignUp] Error for user ${uid}:`, error);

      // Log failure to Firestore
      await logGoogleAdsEventToFirestore({
        eventType: "SignUp",
        source: "trigger_user",
        userId: uid,
        orderId: `signup_${uid}`,
        gclid: data.gclid,
        userData: extractGoogleAdsUserData(data),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        contentName: `${data.role || "user"}_registration`,
        contentCategory: data.role || "user",
      });
    }
}

export const onUserCreatedTrackGoogleAdsSignUp = onDocumentCreated(
  {
    document: "users/{uid}",
    region: "europe-west3",
    cpu: 0.083,
    secrets: GOOGLE_ADS_SECRETS,
  },
  handleGoogleAdsSignUp
);

// ============================================================================
// TRIGGER: BeginCheckout - Call Session Payment Authorized
// ============================================================================

/**
 * Track BeginCheckout event when a call session payment is authorized
 */
export const onCallSessionPaymentAuthorizedTrackGoogleAdsCheckout = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    cpu: 0.083,
    secrets: GOOGLE_ADS_SECRETS,
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
      return;
    }

    // Rate limit check
    if (!checkTriggerRateLimit(sessionId, "checkout")) {
      console.log("[Google Ads Checkout] Rate limited, skipping:", sessionId);
      return;
    }

    console.log(`[Google Ads Checkout] Payment authorized for session ${sessionId}`);

    try {
      const userData = extractGoogleAdsUserData(afterData);
      const amount = afterData.payment?.amount || afterData.amount || 0;
      const currency = afterData.payment?.currency || afterData.currency || "EUR";
      const orderId = `checkout_${sessionId}`;

      const result: GoogleAdsEventResult = await trackGoogleAdsLead({
        userData,
        value: amount,
        currency: currency.toUpperCase(),
        orderId,
        gclid: afterData.gclid,
      });

      // Log to Firestore for analytics dashboard
      await logGoogleAdsEventToFirestore({
        eventType: "BeginCheckout",
        source: "trigger_call",
        userId: afterData.clientId,
        orderId,
        value: amount,
        currency: currency.toUpperCase(),
        gclid: afterData.gclid,
        userData,
        success: result.success,
        error: result.error,
        contentName: `${afterData.providerType || "service"}_call`,
        contentCategory: afterData.providerType || "service",
      });

      if (result.success) {
        console.log(`[Google Ads Checkout] Tracked for session ${sessionId}`, {
          orderId: result.orderId,
          amount,
          currency,
        });

        // P0 FIX: DO NOT update call_sessions here!
        // Updating the same document that triggered this function causes an infinite loop
        // of Firestore triggers (chatterOnCallCompleted, influencerOnCallCompleted, etc.)
        // The tracking info is already logged to google_ads_events collection.
        // This was causing quota exhaustion (cpu_allocation) since 2026-01-31
      } else {
        console.warn(`[Google Ads Checkout] Failed for session ${sessionId}:`, result.error);
      }
    } catch (error) {
      console.error(`[Google Ads Checkout] Error for session ${sessionId}:`, error);

      // Log failure to Firestore
      const amount = afterData.payment?.amount || afterData.amount || 0;
      const currency = afterData.payment?.currency || afterData.currency || "EUR";

      await logGoogleAdsEventToFirestore({
        eventType: "BeginCheckout",
        source: "trigger_call",
        userId: afterData.clientId,
        orderId: `checkout_${sessionId}`,
        value: amount,
        currency: currency.toUpperCase(),
        gclid: afterData.gclid,
        userData: extractGoogleAdsUserData(afterData),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        contentName: `${afterData.providerType || "service"}_call`,
        contentCategory: afterData.providerType || "service",
      });
    }
  }
);
