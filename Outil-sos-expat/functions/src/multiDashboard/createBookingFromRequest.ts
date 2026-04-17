/**
 * =============================================================================
 * MULTI DASHBOARD - Create Booking from Booking Request
 * =============================================================================
 *
 * Callable function to create a booking in the Outil from a booking_request
 * in the SOS project. This triggers the AI and creates a conversation.
 *
 * Called when a user clicks on a conversation from multi.sos-expat.com
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getSosFirestore, SOS_SERVICE_ACCOUNT } from "./sosFirestore";

// Initialize Firebase Admin for local project (outils-sos-expat)
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// =============================================================================
// TYPES
// =============================================================================

interface CreateBookingRequest {
  bookingRequestId: string; // ID from sos-urgently-ac307 booking_requests
  providerId: string;
}

interface CreateBookingResponse {
  success: boolean;
  bookingId?: string;
  conversationId?: string;
  alreadyExists?: boolean;
  aiSkipped?: boolean;
  aiSkippedReason?: string;
  aiPending?: boolean;
  error?: string;
}

// =============================================================================
// CALLABLE FUNCTION
// =============================================================================

export const createBookingFromRequest = onCall<
  CreateBookingRequest,
  Promise<CreateBookingResponse>
>(
  {
    region: "europe-west1",
    timeoutSeconds: 60,
    secrets: [SOS_SERVICE_ACCOUNT],
    cors: [
      "https://ia.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    logger.info("[createBookingFromRequest] Function invoked");

    // AUDIT-FIX P1-g: Require Firebase Auth (onCall provides auth automatically)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { bookingRequestId, providerId } = request.data || {};

    if (!bookingRequestId || !providerId) {
      throw new HttpsError("invalid-argument", "bookingRequestId and providerId are required");
    }

    logger.info("[createBookingFromRequest] Request received", {
      bookingRequestId,
      providerId,
    });

    try {
      const sosDb = getSosFirestore();
      const outilDb = admin.firestore();

      // 1. Get the booking_request from SOS
      const bookingRequestDoc = await sosDb.collection("booking_requests").doc(bookingRequestId).get();

      if (!bookingRequestDoc.exists) {
        throw new HttpsError("not-found", "Booking request not found");
      }

      const bookingRequestData = bookingRequestDoc.data()!;

      // 2. Check if booking already exists in Outil (by externalId)
      // Uses a transaction + deterministic doc ID so parallel calls (e.g. React
      // StrictMode double-mount, or the useEffect firing twice in quick succession)
      // converge on the same booking instead of racing to create duplicates.
      // No `limit(1)`: historical race conditions may have created duplicates that
      // we want to clean up in one pass.
      const existingBookingsSnap = await outilDb.collection("bookings")
        .where("externalId", "==", bookingRequestId)
        .get();

      // Prefer the most recent booking that is NOT stuck. If all are stuck, delete
      // them all and fall through to create a fresh one.
      const allExisting = existingBookingsSnap.docs.map(doc => ({
        doc,
        data: doc.data(),
        createdAtMillis:
          doc.data().createdAt?.toMillis?.() ??
          (doc.data().createdAt?._seconds ? doc.data().createdAt._seconds * 1000 : 0),
      })).sort((a, b) => b.createdAtMillis - a.createdAtMillis);

      if (allExisting.length > 0) {
        const existingBooking = allExisting[0].doc;
        const existingBookingData = allExisting[0].data;

        // The AI trigger writes `conversationId` (not `outilConversationId`) on the Outil booking.
        // `outilConversationId` is only written on the SOS booking_request document.
        const existingConvId = existingBookingData.conversationId as string | undefined;

        // AUTO-RETRY: detect "stuck" bookings — AI never processed AND never skipped
        // AND older than 90s. This happens if:
        //  1) A pre-fix booking got stuck when LLMs errored without writing aiSkipped
        //  2) The trigger was killed by Cloud Functions timeout before completion
        //  3) The function was redeployed mid-execution
        // Delete the zombie + fall through to create a fresh one so the new trigger fires.
        const createdAtMillis =
          existingBookingData.createdAt?.toMillis?.() ??
          (existingBookingData.createdAt?._seconds ? existingBookingData.createdAt._seconds * 1000 : 0);
        const ageMs = createdAtMillis ? Date.now() - createdAtMillis : 0;
        const STUCK_AFTER_MS = 90_000; // 90s — more than any normal cold start + LLM latency

        const isStuck =
          existingBookingData.aiProcessed !== true &&
          !existingConvId &&
          existingBookingData.aiSkipped !== true &&
          ageMs > STUCK_AFTER_MS;

        // Also retry stuck bookings that skipped with a transient LLM error
        // (quota/timeout/auth) if they're older than 5 min — the operator may
        // have recharged the API keys since.
        const RETRY_LLM_AFTER_MS = 5 * 60_000;
        const isRetryableSkip =
          existingBookingData.aiSkipped === true &&
          ageMs > RETRY_LLM_AFTER_MS &&
          typeof existingBookingData.aiSkippedReason === "string" &&
          /^llm_/.test(existingBookingData.aiSkippedReason);

        if (isStuck || isRetryableSkip) {
          logger.warn("[createBookingFromRequest] Deleting zombie bookings to retry trigger", {
            primaryBookingId: existingBooking.id,
            ageMs,
            reason: isStuck ? "stuck_no_terminal_state" : "retryable_llm_skip",
            aiSkipped: existingBookingData.aiSkipped,
            aiSkippedReason: existingBookingData.aiSkippedReason,
            duplicatesDetected: allExisting.length,
          });
          // Delete ALL existing bookings for this externalId (including historical
          // race-duplicates like the pair `N48w1o2g...` + `sfMHkTNEAN...` observed
          // in logs before the deterministic-ID fix). Ensures the new trigger fires
          // on a clean slate.
          await Promise.all(allExisting.map(entry => entry.doc.ref.delete()));
          // Fall through to the creation path below
        } else {
          logger.info("[createBookingFromRequest] Booking already exists", {
            bookingId: existingBooking.id,
            conversationId: existingConvId,
            aiProcessed: existingBookingData.aiProcessed,
            aiSkipped: existingBookingData.aiSkipped,
            ageMs,
          });

          return {
            success: true,
            bookingId: existingBooking.id,
            conversationId: existingConvId || existingBooking.id,
            alreadyExists: true,
            aiSkipped: existingBookingData.aiSkipped === true,
            aiSkippedReason: existingBookingData.aiSkippedReason,
            aiPending: !existingConvId && existingBookingData.aiSkipped !== true,
          };
        }
      }

      // 3. Check if there's already a conversation in SOS
      let existingConversationId: string | undefined;
      if (bookingRequestData.outilConversationId) {
        existingConversationId = bookingRequestData.outilConversationId;
        logger.info("[createBookingFromRequest] Found existing conversation ID in booking_request", {
          conversationId: existingConversationId,
        });
      }

      // 4. Create booking in Outil inside a transaction keyed on a deterministic
      // doc ID built from bookingRequestId + providerId. If two concurrent calls
      // race, only the first wins the create; the second sees the doc exist and
      // reuses it. Prevents the dual-booking race observed in prod logs.
      const deterministicDocId = `mdash_${bookingRequestId}_${providerId}`.slice(0, 480);
      const bookingRef = outilDb.collection("bookings").doc(deterministicDocId);

      const didCreate = await outilDb.runTransaction(async (tx) => {
        const snap = await tx.get(bookingRef);
        if (snap.exists) {
          logger.info("[createBookingFromRequest] Deterministic booking already exists (race avoided)", {
            bookingId: bookingRef.id,
          });
          return false;
        }
        tx.set(bookingRef, {
          externalId: bookingRequestId,
          externalSource: "sos_multi_dashboard",
          providerId: providerId,
          providerType: bookingRequestData.providerType || "lawyer",
          clientId: bookingRequestData.clientId || null,
          clientName: bookingRequestData.clientName || "Client",
          clientFirstName: bookingRequestData.clientName?.split(" ")[0] || "Client",
          clientEmail: bookingRequestData.clientEmail || null,
          clientPhone: bookingRequestData.clientPhone || null,
          clientWhatsapp: bookingRequestData.clientWhatsapp || null,
          clientCurrentCountry: bookingRequestData.clientCurrentCountry || null,
          clientNationality: bookingRequestData.clientNationality || null,
          clientLanguages: bookingRequestData.clientLanguages || ["fr"],
          title: bookingRequestData.title || "Consultation",
          description: bookingRequestData.description || "",
          serviceType: bookingRequestData.serviceType || "consultation",
          category: bookingRequestData.serviceType || "general",
          urgency: "normal",
          status: "pending",
          source: "multi_dashboard",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          aiProcessed: false,
        });
        return true;
      });

      logger.info("[createBookingFromRequest] Booking ready in Outil", {
        bookingId: bookingRef.id,
        externalId: bookingRequestId,
        created: didCreate,
      });

      // 5. Poll the booking until `aiOnBookingCreated` has either produced a conversation
      // (aiProcessed=true with conversationId) or explicitly skipped (aiSkipped=true).
      // A fixed 2s wait was too short for cold starts — the function returned `bookingRef.id`
      // as a fallback, which doesn't match any real conversation doc, so the frontend stayed
      // stuck on "Initialisation du chat IA...".
      const MAX_WAIT_MS = 25000;
      const POLL_INTERVAL_MS = 500;
      const pollStart = Date.now();

      let conversationId: string | undefined;
      let aiSkipped = false;
      let aiSkippedReason: string | undefined;

      while (Date.now() - pollStart < MAX_WAIT_MS) {
        const snap = await bookingRef.get();
        const data = snap.data();

        if (data?.conversationId && typeof data.conversationId === "string") {
          conversationId = data.conversationId;
          break;
        }
        if (data?.aiSkipped === true) {
          aiSkipped = true;
          aiSkippedReason = data.aiSkippedReason;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      const aiPending = !conversationId && !aiSkipped;

      if (aiPending) {
        logger.warn("[createBookingFromRequest] AI trigger timeout — booking created but conversation not ready yet", {
          bookingId: bookingRef.id,
          waitedMs: Date.now() - pollStart,
        });
      } else if (aiSkipped) {
        logger.warn("[createBookingFromRequest] AI skipped by trigger", {
          bookingId: bookingRef.id,
          reason: aiSkippedReason,
        });
      } else {
        logger.info("[createBookingFromRequest] AI processed successfully", {
          bookingId: bookingRef.id,
          conversationId,
          waitedMs: Date.now() - pollStart,
        });
      }

      // 6. Update the booking_request in SOS with the new IDs (non-blocking)
      try {
        await sosDb.collection("booking_requests").doc(bookingRequestId).update({
          outilBookingId: bookingRef.id,
          ...(conversationId ? { outilConversationId: conversationId } : {}),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        logger.warn("[createBookingFromRequest] Failed to update booking_request (non-blocking)", {
          error: updateError,
        });
      }

      return {
        success: true,
        bookingId: bookingRef.id,
        conversationId: conversationId || bookingRef.id,
        alreadyExists: false,
        aiSkipped,
        aiSkippedReason,
        aiPending,
      };

    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[createBookingFromRequest] Error", { error });
      throw new HttpsError("internal", "Failed to create booking");
    }
  }
);
