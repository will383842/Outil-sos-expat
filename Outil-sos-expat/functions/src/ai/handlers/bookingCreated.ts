/**
 * =============================================================================
 * AI HANDLER - Booking Created Trigger
 * =============================================================================
 *
 * Triggered when a new booking is created.
 * Generates an initial AI response based on booking context.
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

import type { BookingData } from "../core/types";
import {
  getAISettings,
  getProviderType,
  getProviderLanguage,
  normalizeCountry,
  checkProviderAIStatus,
  incrementAiUsage,
} from "../services/utils";

import {
  AI_SECRETS,
  createService,
  buildBookingMessage,
  notifyProvider,
} from "./shared";

// =============================================================================
// TRIGGER: NEW BOOKING
// =============================================================================

export const aiOnBookingCreated = onDocumentCreated(
  {
    document: "bookings/{bookingId}",
    region: "europe-west1",
    secrets: AI_SECRETS,
    // SCALABILITÉ: Configuration optimisée pour appels IA
    memory: "512MiB",
    timeoutSeconds: 120,
    maxInstances: 20,
    // NOTE: minInstances désactivé pour respecter quota CPU région (cold start ~3-10s)
    minInstances: 0,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const bookingId = event.params.bookingId;
    const booking = snap.data() as BookingData;

    // Check if already processed
    if (booking.aiProcessed) {
      logger.info("[AI] Booking already processed", { bookingId });
      return;
    }

    // Get settings
    const settings = await getAISettings();
    if (!settings.enabled || !settings.replyOnBookingCreated) {
      logger.info("[AI] AI disabled", { bookingId });
      return;
    }

    const providerId = booking.providerId;
    if (!providerId) {
      logger.warn("[AI] No provider", { bookingId });
      return;
    }

    logger.info("[AI] Processing booking", { bookingId, providerId });

    try {
      const db = admin.firestore();

      // ==========================================================
      // ACCESS + QUOTA CHECK COMBINÉ (OPTIMISATION: 1 lecture au lieu de 2)
      // ==========================================================
      const aiStatus = await checkProviderAIStatus(providerId);

      // Vérifier accès
      if (!aiStatus.hasAccess) {
        logger.info("[AI] Provider without AI access", {
          bookingId,
          providerId,
          reason: aiStatus.accessReason,
        });

        await snap.ref.update({
          aiProcessed: false,
          aiSkipped: true,
          aiSkippedReason: aiStatus.accessReason,
          aiSkippedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return;
      }

      // Vérifier quota
      if (!aiStatus.hasQuota) {
        logger.info("[AI] AI quota exhausted", {
          bookingId,
          providerId,
          used: aiStatus.quotaUsed,
          limit: aiStatus.quotaLimit,
        });

        await snap.ref.update({
          aiProcessed: false,
          aiSkipped: true,
          aiSkippedReason: "quota_exceeded",
          aiSkippedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await notifyProvider(
          db,
          "quota_exceeded",
          providerId,
          `Votre quota d'appels IA est épuisé (${aiStatus.quotaUsed}/${aiStatus.quotaLimit}). L'assistant n'a pas pu analyser cette consultation.`,
          { bookingId }
        );

        return;
      }

      logger.info("[AI] Access and quota OK", {
        bookingId,
        providerId,
        accessReason: aiStatus.accessReason,
        quotaRemaining: aiStatus.quotaRemaining,
      });

      // Determine provider type
      const providerType = booking.providerType || (await getProviderType(providerId));

      // 🆕 Get provider's preferred language for AI responses
      const providerLanguage = await getProviderLanguage(providerId);
      logger.info("[AI] Provider language for initial response", { providerId, providerLanguage });

      // Build context
      const country = normalizeCountry(booking.clientCurrentCountry);
      const clientName = booking.clientFirstName || booking.clientName || "Client";

      // Build initial message
      const userMessage = buildBookingMessage(booking, clientName, country);

      // Create service and call AI (with provider language)
      const service = createService();
      const response = await service.chat(
        [{ role: "user", content: userMessage }],
        providerType,
        {
          providerType,
          country,
          clientName,
          category: booking.category,
          urgency: booking.urgency,
          bookingTitle: booking.title,
          specialties: booking.providerSpecialties,
          providerLanguage,  // 🆕 Force AI to respond in provider's language
        }
      );

      logger.info("[AI] Response generated", {
        bookingId,
        model: response.model,
        provider: response.provider,
        searchPerformed: response.searchPerformed,
      });

      // Create conversation and save messages atomically
      const convoRef = db.collection("conversations").doc();
      const now = admin.firestore.FieldValue.serverTimestamp();

      const batch = db.batch();

      // 1. Create conversation with PERSISTENT BOOKING CONTEXT
      batch.set(convoRef, {
        bookingId,
        providerId,
        providerType,
        createdAt: now,
        updatedAt: now,
        messageCount: 2,
        bookingContext: {
          clientName: booking.clientFirstName || booking.clientName || "Client",
          country: country,
          nationality: booking.clientNationality || null,
          title: booking.title || null,
          description: booking.description || null,
          category: booking.category || null,
          urgency: booking.urgency || null,
          specialties: booking.providerSpecialties || null,
        },
      });

      // 2. Save initial user message (booking context)
      const userMsgRef = convoRef.collection("messages").doc();
      batch.set(userMsgRef, {
        role: "user",
        source: "system",
        content: userMessage,
        timestamp: now,
      });

      // 3. Save AI response
      const aiMsgRef = convoRef.collection("messages").doc();
      batch.set(aiMsgRef, {
        role: "assistant",
        source: "ai",
        content: response.response,
        model: response.model,
        provider: response.provider,
        searchPerformed: response.searchPerformed,
        citations: response.citations || null,
        fallbackUsed: response.fallbackUsed || false,
        timestamp: now,
      });

      // 4. Mark booking as processed
      batch.update(snap.ref, {
        aiProcessed: true,
        aiProcessedAt: now,
        conversationId: convoRef.id,
      });

      await batch.commit();

      // Increment AI usage after success
      await incrementAiUsage(providerId);

      logger.info("[AI] Booking processed successfully", {
        bookingId,
        conversationId: convoRef.id,
        quotaUsedAfter: aiStatus.quotaUsed + 1,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error("[AI] Error processing booking", { bookingId, error: errorMessage });

      await snap.ref.update({
        aiProcessed: false,
        aiError: errorMessage,
        aiErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const db = admin.firestore();
      await notifyProvider(
        db,
        "ai_error",
        booking.providerId || "",
        "L'assistant IA n'a pas pu analyser cette consultation. Veuillez traiter manuellement.",
        { bookingId }
      );
    }
  }
);
