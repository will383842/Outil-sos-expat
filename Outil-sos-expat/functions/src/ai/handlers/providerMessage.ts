/**
 * =============================================================================
 * AI HANDLER - Provider Message Trigger
 * =============================================================================
 *
 * Triggered when a provider sends a message in a conversation.
 * Generates an AI response based on conversation history.
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

import type { MessageData, ConversationData, BookingData } from "../core/types";
import {
  getAISettings,
  getProviderType,
  getProviderLanguage,
  buildConversationHistory,
  checkProviderAIStatus,
  incrementAiUsage,
} from "../services/utils";

import { AI_SECRETS, createService, notifyProvider } from "./shared";

// =============================================================================
// CONSTANTES DURÉES CONVERSATION (en minutes)
// =============================================================================

const CONVERSATION_DURATION_MINUTES = {
  lawyer: 25,  // 25 minutes pour les avocats
  expat: 35,   // 35 minutes pour les experts expatriés
} as const;

// =============================================================================
// TRIGGER: PROVIDER MESSAGE
// =============================================================================

export const aiOnProviderMessage = onDocumentCreated(
  {
    document: "conversations/{conversationId}/messages/{messageId}",
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

    const { conversationId, messageId } = event.params;
    const message = snap.data() as MessageData;

    // Ignore AI or system messages
    if (message.role !== "user" || message.source === "ai" || message.source === "system") {
      return;
    }

    // Check if already processed
    if (message.processed) {
      return;
    }

    logger.info("[AI] New provider message", { conversationId, messageId });

    const db = admin.firestore();
    const msgRef = snap.ref;

    // Atomic transaction to prevent double processing (race condition)
    const shouldProcess = await db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(msgRef);
      const freshData = freshDoc.data() as MessageData;

      if (freshData?.processed) {
        return false;
      }

      transaction.update(msgRef, { processing: true });
      return true;
    });

    if (!shouldProcess) {
      logger.info("[AI] Message already being processed", { conversationId, messageId });
      return;
    }

    try {
      // Get settings
      const settings = await getAISettings();
      if (!settings.enabled || !settings.replyOnUserMessage) {
        await msgRef.update({ processing: false });
        return;
      }

      // Get conversation
      const convoDoc = await db.collection("conversations").doc(conversationId).get();
      if (!convoDoc.exists) {
        logger.warn("[AI] Conversation not found", { conversationId });
        await msgRef.update({ processing: false });
        return;
      }

      const convo = convoDoc.data() as ConversationData;
      const providerId = message.providerId || convo.providerId;
      if (!providerId) {
        logger.warn("[AI] Provider not found", { conversationId });
        await msgRef.update({ processing: false });
        return;
      }

      // ==========================================================
      // VÉRIFICATION EXPIRATION TEMPORELLE
      // Avocats: 25 min | Experts expatriés: 35 min depuis aiProcessedAt
      // ==========================================================
      if (convo.bookingId) {
        const bookingDoc = await db.collection("bookings").doc(convo.bookingId).get();
        if (bookingDoc.exists) {
          const bookingData = bookingDoc.data() as BookingData;

          if (bookingData.aiProcessedAt) {
            const providerType = bookingData.providerType || convo.providerType || "lawyer";
            const durationMinutes = CONVERSATION_DURATION_MINUTES[providerType as keyof typeof CONVERSATION_DURATION_MINUTES] || 25;
            const durationMs = durationMinutes * 60 * 1000;

            const startTime = bookingData.aiProcessedAt.toMillis();
            const expirationTime = startTime + durationMs;
            const now = Date.now();

            if (now > expirationTime) {
              logger.info("[AI] Conversation expired - rejecting message", {
                conversationId,
                bookingId: convo.bookingId,
                providerType,
                durationMinutes,
                expiredSince: Math.floor((now - expirationTime) / 1000 / 60) + " minutes",
              });

              const batch = db.batch();
              const serverNow = admin.firestore.FieldValue.serverTimestamp();

              // 1. Marquer le message comme ignoré
              batch.update(msgRef, {
                processing: false,
                aiSkipped: true,
                aiSkippedReason: "conversation_expired",
              });

              // 2. Ajouter un message système visible dans le chat
              const systemMsgRef = db
                .collection("conversations")
                .doc(conversationId)
                .collection("messages")
                .doc();
              batch.set(systemMsgRef, {
                role: "system",
                source: "system",
                content: `⏱️ Temps de consultation écoulé (${durationMinutes} minutes). L'assistant IA ne peut plus répondre. L'historique de la conversation reste consultable.`,
                timestamp: serverNow,
                isExpirationNotice: true,
              });

              // 3. Marquer la conversation comme archivée
              batch.update(db.collection("conversations").doc(conversationId), {
                archivedAt: serverNow,
                status: "archived",
                archiveReason: "timer_expired",
              });

              // 4. Marquer le booking comme archivé également
              if (convo.bookingId) {
                batch.update(db.collection("bookings").doc(convo.bookingId), {
                  aiConversationArchivedAt: serverNow,
                });
              }

              await batch.commit();

              logger.info("[AI] Conversation archived due to expiration", {
                conversationId,
                bookingId: convo.bookingId,
              });

              return;
            }
          }
        }
      }

      // ==========================================================
      // ACCESS + QUOTA CHECK COMBINÉ (OPTIMISATION: 1 lecture au lieu de 2)
      // ==========================================================
      const aiStatus = await checkProviderAIStatus(providerId);

      // Vérifier accès
      if (!aiStatus.hasAccess) {
        logger.info("[AI] Provider without AI access for message", {
          conversationId,
          providerId,
          reason: aiStatus.accessReason,
        });

        await msgRef.update({
          processing: false,
          aiSkipped: true,
          aiSkippedReason: aiStatus.accessReason,
        });

        return;
      }

      // Vérifier quota
      if (!aiStatus.hasQuota) {
        logger.info("[AI] AI quota exhausted for message", {
          conversationId,
          providerId,
          used: aiStatus.quotaUsed,
          limit: aiStatus.quotaLimit,
        });

        await msgRef.update({
          processing: false,
          aiSkipped: true,
          aiSkippedReason: "quota_exceeded",
        });

        await notifyProvider(
          db,
          "quota_exceeded",
          providerId,
          `Votre quota d'appels IA est épuisé (${aiStatus.quotaUsed}/${aiStatus.quotaLimit}).`,
          { conversationId }
        );

        return;
      }

      // Determine provider type AND language (optimized: single read if aiStatus has providerData)
      const providerType = convo.providerType || (await getProviderType(providerId));

      // 🆕 Get provider's preferred language for AI responses
      const providerLanguage = await getProviderLanguage(providerId);
      logger.info("[AI] Provider language for response", { providerId, providerLanguage });

      // Get INTELLIGENT conversation history (preserves initial context + recent)
      const history = await buildConversationHistory(db, conversationId, convo);

      // Create service and call AI with enriched context (including provider language)
      const service = createService();
      const response = await service.chat(history, providerType, {
        providerType,
        country: convo.bookingContext?.country,
        clientName: convo.bookingContext?.clientName,
        category: convo.bookingContext?.category,
        urgency: convo.bookingContext?.urgency,
        specialties: convo.bookingContext?.specialties,
        providerLanguage,  // 🆕 Force AI to respond in provider's language
      });

      // Batch for atomic operations
      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Save AI response
      const aiMsgRef = db
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .doc();
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

      // Mark original message as processed
      batch.update(msgRef, {
        processed: true,
        processing: false,
        processedAt: now,
      });

      // Update conversation
      batch.update(db.collection("conversations").doc(conversationId), {
        updatedAt: now,
        messageCount: admin.firestore.FieldValue.increment(2),
      });

      await batch.commit();

      // Increment AI usage after success
      await incrementAiUsage(providerId);

      logger.info("[AI] Message response", {
        conversationId,
        model: response.model,
        provider: response.provider,
        historyLength: history.length,
        quotaUsedAfter: aiStatus.quotaUsed + 1,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error("[AI] Error responding to message", {
        conversationId,
        messageId,
        error: errorMessage,
      });

      // Release lock and mark error
      await msgRef.update({
        processing: false,
        aiError: errorMessage,
        aiErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notify provider of error
      try {
        const convoDoc = await db.collection("conversations").doc(conversationId).get();
        const convo = convoDoc.data() as ConversationData;
        if (convo?.providerId) {
          await notifyProvider(
            db,
            "ai_error",
            convo.providerId,
            "L'assistant IA n'a pas pu répondre. Vous pouvez réessayer ou traiter manuellement.",
            { conversationId }
          );
        }
      } catch (notifError) {
        logger.warn("[AI] Unable to notify provider", { notifError });
      }
    }
  }
);
