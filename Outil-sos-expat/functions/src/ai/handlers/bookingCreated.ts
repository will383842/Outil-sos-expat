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
    const debugId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // ============================================================
    // DEBUG STEP 1: Trigger fired
    // ============================================================
    logger.info(`🚀 [AI-DEBUG-${debugId}] STEP 1: aiOnBookingCreated TRIGGER FIRED`, {
      eventParams: event.params,
      hasData: !!event.data,
      timestamp: new Date().toISOString(),
    });

    const snap = event.data;
    if (!snap) {
      logger.error(`❌ [AI-DEBUG-${debugId}] STEP 1 FAILED: No snapshot data`);
      return;
    }

    const bookingId = event.params.bookingId;
    const booking = snap.data() as BookingData;

    // ============================================================
    // DEBUG STEP 2: Booking data received
    // ============================================================
    const bookingAny = booking as Record<string, unknown>;
    logger.info(`📦 [AI-DEBUG-${debugId}] STEP 2: BOOKING DATA RECEIVED`, {
      bookingId,
      hasBookingData: !!booking,
      bookingKeys: booking ? Object.keys(booking) : [],
      providerId: booking?.providerId || "MISSING",
      providerType: booking?.providerType || "MISSING",
      clientName: booking?.clientName || booking?.clientFirstName || "MISSING",
      clientCurrentCountry: booking?.clientCurrentCountry || "MISSING",
      title: booking?.title || "MISSING",
      aiProcessed: booking?.aiProcessed,
      aiSkipped: bookingAny?.aiSkipped,
      aiSkippedReason: bookingAny?.aiSkippedReason,
      source: bookingAny?.source || "MISSING",
    });

    // Check if already processed
    if (booking.aiProcessed) {
      logger.info(`⏭️ [AI-DEBUG-${debugId}] STEP 2 EXIT: Booking already processed`, { bookingId });
      return;
    }

    // ============================================================
    // DEBUG STEP 3: Check AI settings
    // ============================================================
    logger.info(`⚙️ [AI-DEBUG-${debugId}] STEP 3: Fetching AI settings...`);
    const settings = await getAISettings();
    logger.info(`⚙️ [AI-DEBUG-${debugId}] STEP 3: AI SETTINGS RETRIEVED`, {
      enabled: settings.enabled,
      replyOnBookingCreated: settings.replyOnBookingCreated,
      replyOnUserMessage: settings.replyOnUserMessage,
      model: settings.model,
      useClaudeForLawyers: settings.useClaudeForLawyers,
    });

    if (!settings.enabled || !settings.replyOnBookingCreated) {
      logger.warn(`❌ [AI-DEBUG-${debugId}] STEP 3 EXIT: AI disabled in settings`, {
        bookingId,
        enabled: settings.enabled,
        replyOnBookingCreated: settings.replyOnBookingCreated,
        FIX: "Vérifiez le document Firestore: settings/ai - enabled et replyOnBookingCreated doivent être true",
      });
      return;
    }

    // ============================================================
    // DEBUG STEP 4: Check providerId
    // ============================================================
    const providerId = booking.providerId;
    logger.info(`👤 [AI-DEBUG-${debugId}] STEP 4: PROVIDER ID CHECK`, {
      providerId,
      providerIdType: typeof providerId,
      providerIdLength: providerId?.length || 0,
      isEmpty: !providerId,
      isEmptyString: providerId === "",
    });

    if (!providerId) {
      logger.error(`❌ [AI-DEBUG-${debugId}] STEP 4 EXIT: No providerId in booking`, {
        bookingId,
        FIX: "Le booking doit contenir un providerId. Vérifiez que SOS envoie bien le providerId dans ingestBooking.",
      });
      return;
    }

    logger.info(`✅ [AI-DEBUG-${debugId}] STEP 4 PASSED: Processing booking`, { bookingId, providerId });

    try {
      const db = admin.firestore();

      // ============================================================
      // DEBUG STEP 5: Check provider AI status (access + quota)
      // ============================================================
      logger.info(`🔍 [AI-DEBUG-${debugId}] STEP 5: Calling checkProviderAIStatus...`, { providerId });
      const aiStatus = await checkProviderAIStatus(providerId);
      logger.info(`🔍 [AI-DEBUG-${debugId}] STEP 5: PROVIDER AI STATUS RESULT`, {
        providerId,
        hasAccess: aiStatus.hasAccess,
        accessReason: aiStatus.accessReason,
        hasQuota: aiStatus.hasQuota,
        quotaUsed: aiStatus.quotaUsed,
        quotaLimit: aiStatus.quotaLimit,
        quotaRemaining: aiStatus.quotaRemaining,
        providerDataKeys: aiStatus.providerData ? Object.keys(aiStatus.providerData) : "NO_PROVIDER_DATA",
      });

      // ============================================================
      // DEBUG STEP 6: Access check
      // ============================================================
      if (!aiStatus.hasAccess) {
        logger.error(`❌ [AI-DEBUG-${debugId}] STEP 6 EXIT: Provider WITHOUT AI access`, {
          bookingId,
          providerId,
          reason: aiStatus.accessReason,
          providerData: aiStatus.providerData ? {
            forcedAIAccess: aiStatus.providerData.forcedAIAccess,
            freeTrialUntil: aiStatus.providerData.freeTrialUntil,
            subscriptionStatus: aiStatus.providerData.subscriptionStatus,
            hasActiveSubscription: aiStatus.providerData.hasActiveSubscription,
          } : "NO_DATA",
          FIX: `Le provider ${providerId} n'a pas accès à l'IA. Raison: ${aiStatus.accessReason}.
                Pour donner accès:
                1. Mettre forcedAIAccess=true dans providers/${providerId}
                2. OU définir freeTrialUntil à une date future
                3. OU définir subscriptionStatus="active"`,
        });

        await snap.ref.update({
          aiProcessed: false,
          aiSkipped: true,
          aiSkippedReason: aiStatus.accessReason,
          aiSkippedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return;
      }

      logger.info(`✅ [AI-DEBUG-${debugId}] STEP 6 PASSED: Provider has AI access`, {
        providerId,
        accessReason: aiStatus.accessReason,
      });

      // ============================================================
      // DEBUG STEP 7: Quota check
      // ============================================================
      if (!aiStatus.hasQuota) {
        logger.error(`❌ [AI-DEBUG-${debugId}] STEP 7 EXIT: Quota exhausted`, {
          bookingId,
          providerId,
          quotaUsed: aiStatus.quotaUsed,
          quotaLimit: aiStatus.quotaLimit,
          FIX: "Augmentez aiCallsLimit dans providers/${providerId} ou réinitialisez aiCallsUsed à 0",
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

      logger.info(`✅ [AI-DEBUG-${debugId}] STEP 7 PASSED: Quota OK`, {
        bookingId,
        providerId,
        accessReason: aiStatus.accessReason,
        quotaUsed: aiStatus.quotaUsed,
        quotaLimit: aiStatus.quotaLimit,
        quotaRemaining: aiStatus.quotaRemaining,
      });

      // ============================================================
      // DEBUG STEP 8: Build AI context
      // ============================================================
      const providerType = booking.providerType || (await getProviderType(providerId));
      const providerLanguage = await getProviderLanguage(providerId);
      const country = normalizeCountry(booking.clientCurrentCountry);
      const clientName = booking.clientFirstName || booking.clientName || "Client";
      const userMessage = buildBookingMessage(booking, clientName, country);

      logger.info(`📝 [AI-DEBUG-${debugId}] STEP 8: AI CONTEXT BUILT`, {
        bookingId,
        providerId,
        providerType,
        providerLanguage,
        country,
        clientName,
        category: booking.category,
        urgency: booking.urgency,
        title: booking.title,
        userMessageLength: userMessage?.length || 0,
        userMessagePreview: userMessage?.substring(0, 200) + "...",
      });

      // ============================================================
      // DEBUG STEP 9: Call AI service
      // ============================================================
      logger.info(`🤖 [AI-DEBUG-${debugId}] STEP 9: Calling AI service...`, {
        providerType,
        model: providerType === "lawyer" ? "claude" : "gpt-4o",
      });

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
          providerLanguage,
        }
      );

      logger.info(`✅ [AI-DEBUG-${debugId}] STEP 9: AI RESPONSE GENERATED`, {
        bookingId,
        model: response.model,
        provider: response.provider,
        searchPerformed: response.searchPerformed,
        responseLength: response.response?.length || 0,
        responsePreview: response.response?.substring(0, 200) + "...",
        hasCitations: !!response.citations,
        fallbackUsed: response.fallbackUsed,
      });

      // ============================================================
      // DEBUG STEP 10: Create conversation and save to Firestore
      // ============================================================
      logger.info(`💾 [AI-DEBUG-${debugId}] STEP 10: Creating conversation...`);

      const convoRef = db.collection("conversations").doc();
      const now = admin.firestore.FieldValue.serverTimestamp();

      const batch = db.batch();

      // 1. Create conversation with PERSISTENT BOOKING CONTEXT
      // FIX: Add status, clientName, messagesCount (with 's') to match frontend expectations
      batch.set(convoRef, {
        bookingId,
        providerId,
        providerType,
        // FIX: Frontend expects these fields at root level
        status: "active",
        clientName: booking.clientFirstName || booking.clientName || "Client",
        clientFirstName: booking.clientFirstName || null,
        title: booking.title || "Consultation",
        subject: booking.title || "Consultation",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        // FIX: Frontend expects 'messagesCount' (with 's'), not 'messageCount'
        messagesCount: 2,
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
      // FIX: Use 'createdAt' instead of 'timestamp' - frontend queries by createdAt
      const userMsgRef = convoRef.collection("messages").doc();
      batch.set(userMsgRef, {
        role: "user",
        source: "system",
        content: userMessage,
        createdAt: now,
      });

      // 3. Save AI response
      // FIX: Use 'createdAt' instead of 'timestamp', and 'source: gpt' for proper icon rendering
      const aiMsgRef = convoRef.collection("messages").doc();
      batch.set(aiMsgRef, {
        role: "assistant",
        // FIX: Frontend checks source === "gpt" for AI message styling
        source: response.provider === "claude" ? "claude" : "gpt",
        content: response.response,
        model: response.model,
        provider: response.provider,
        searchPerformed: response.searchPerformed,
        citations: response.citations || null,
        fallbackUsed: response.fallbackUsed || false,
        createdAt: now,
      });

      // 4. Mark booking as processed
      batch.update(snap.ref, {
        aiProcessed: true,
        aiProcessedAt: now,
        conversationId: convoRef.id,
      });

      await batch.commit();

      logger.info(`💾 [AI-DEBUG-${debugId}] STEP 10: Firestore batch committed`, {
        conversationId: convoRef.id,
        userMsgId: userMsgRef.id,
        aiMsgId: aiMsgRef.id,
      });

      // Increment AI usage after success
      await incrementAiUsage(providerId);

      // ============================================================
      // DEBUG STEP 11: SUCCESS!
      // ============================================================
      logger.info(`🎉 [AI-DEBUG-${debugId}] STEP 11: SUCCESS! Booking processed`, {
        bookingId,
        conversationId: convoRef.id,
        providerId,
        providerType,
        quotaUsedAfter: aiStatus.quotaUsed + 1,
        responseModel: response.model,
        totalSteps: 11,
      });

    } catch (error) {
      // ============================================================
      // DEBUG CATCH: Error during processing
      // ============================================================
      const errorMessage = (error as Error).message;
      const errorStack = (error as Error).stack;
      logger.error(`💥 [AI-DEBUG-${debugId}] CATCH: Error processing booking`, {
        bookingId,
        providerId: booking.providerId,
        errorMessage,
        errorStack,
        errorName: (error as Error).name,
      });

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
