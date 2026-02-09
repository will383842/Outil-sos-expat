/**
 * =============================================================================
 * AUTO AI RESPONSE GENERATION - DISABLED (deferred to post-payment)
 * =============================================================================
 *
 * This Firestore trigger previously generated AI responses immediately when a
 * booking_request was created. It is now disabled to avoid wasting API credits
 * before payment is confirmed.
 *
 * AI generation is now handled ONLY after payment via:
 *   syncCallSessionToOutil() in paymentNotifications.ts
 *     → Outil's ingestBooking endpoint
 *     → checkProviderAIStatus() verifies AI access (subscription, forcedAIAccess, free trial)
 *     → AAA profiles (test accounts) always get AI access after payment
 *
 * This trigger is kept as a no-op to avoid breaking the Firebase deployment
 * (removing an exported function requires careful handling).
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

// =============================================================================
// TYPES
// =============================================================================

interface BookingRequestData {
  providerId: string;
  clientName?: string;
  clientFirstName?: string;
}

// =============================================================================
// FIRESTORE TRIGGER (no-op — AI deferred to post-payment)
// =============================================================================

export const onBookingRequestCreatedGenerateAi = onDocumentCreated(
  {
    document: "booking_requests/{bookingId}",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 10,
    maxInstances: 5,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const bookingId = event.params.bookingId;
    const booking = snap.data() as BookingRequestData;

    // AI generation is now handled ONLY after payment via syncCallSessionToOutil
    // (paymentNotifications.ts). This avoids wasting API credits before payment.
    logger.info("[AutoAI] Booking request created — AI deferred to post-payment flow", {
      bookingId,
      providerId: booking.providerId,
      clientName: booking.clientName || booking.clientFirstName,
    });
  }
);
