/**
 * =============================================================================
 * AI HANDLER - Chat HTTP Endpoint
 * =============================================================================
 *
 * HTTP endpoint for direct AI chat.
 * Used by frontend for real-time chat interactions.
 *
 * AUTHENTICATION:
 * - Firebase Auth Bearer token (for direct frontend calls)
 * - X-API-Key header (for SOS platform proxy calls)
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import type { Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

import type { LLMMessage, ConversationData, ProviderType } from "../core/types";

// =============================================================================
// API KEY FOR CROSS-PROJECT COMMUNICATION (SOS → OUTIL)
// =============================================================================
const SOS_PLATFORM_API_KEY = defineSecret("SOS_PLATFORM_API_KEY");

// =============================================================================
// AUTH RESULT TYPE
// =============================================================================
interface AuthResult {
  authenticated: boolean;
  userId: string | null;
  method: "firebase" | "api_key" | null;
  providerType?: ProviderType;
  skipSubscriptionCheck?: boolean;
}

// =============================================================================
// FIREBASE AUTH VERIFICATION
// =============================================================================

/**
 * Vérifie le token Firebase Auth depuis le header Authorization
 * @returns DecodedIdToken si valide, null sinon
 */
async function verifyAuthToken(req: Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    return null;
  }

  try {
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    logger.warn("[aiChat] Invalid auth token", { error: (error as Error).message });
    return null;
  }
}

/**
 * Vérifie l'authentification par API key (pour appels cross-project depuis SOS)
 * Le body contient userId et providerType car SOS a déjà vérifié l'utilisateur
 */
function verifyApiKey(req: Request): AuthResult {
  const apiKey = req.header("x-api-key");
  // P0 FIX: Trim secret value to remove trailing CRLF
  const expectedApiKey = SOS_PLATFORM_API_KEY.value().trim();
  if (!apiKey || apiKey.trim() !== expectedApiKey) {
    return { authenticated: false, userId: null, method: null };
  }

  // Avec API key, SOS a déjà vérifié l'utilisateur et son abonnement
  const { userId, providerType } = req.body;

  if (!userId) {
    logger.warn("[aiChat] API key auth missing userId in body");
    return { authenticated: false, userId: null, method: null };
  }

  return {
    authenticated: true,
    userId,
    method: "api_key",
    providerType: providerType || "expat",
    skipSubscriptionCheck: true, // SOS a déjà vérifié l'abonnement
  };
}

/**
 * Vérifie l'authentification (Firebase Auth OU API Key)
 */
async function verifyAuth(req: Request): Promise<AuthResult> {
  // 1. Essayer Firebase Auth d'abord
  const firebaseToken = await verifyAuthToken(req);
  if (firebaseToken) {
    return {
      authenticated: true,
      userId: firebaseToken.uid,
      method: "firebase",
    };
  }

  // 2. Sinon, essayer API Key
  return verifyApiKey(req);
}
import {
  getProviderType,
  checkUserSubscription,
  sanitizeUserInput,
  buildConversationHistory,
  checkProviderAIStatus,
  incrementAiUsage,
} from "../services/utils";

import { AI_SECRETS, createService } from "./shared";

// Rate limiting et modération
import { checkRateLimit, getRateLimitHeaders } from "../../rateLimiter";
import { moderateInput, moderateOutput, MODERATION_OPENAI_KEY } from "../../moderation";

// =============================================================================
// OUTPUT SANITIZATION - Protection XSS sur réponses IA
// =============================================================================

/**
 * Sanitise la réponse IA pour éviter XSS et injections
 * Préserve le Markdown valide mais neutralise les scripts
 */
function sanitizeAIOutput(content: string): string {
  if (!content) return "";

  return content
    // Neutraliser les balises script
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[script removed]")
    // Neutraliser les event handlers HTML
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Neutraliser les liens javascript:
    .replace(/javascript:/gi, "js-disabled:")
    // Neutraliser les data URIs potentiellement dangereux
    .replace(/data:text\/html/gi, "data:text/plain")
    // Limiter la longueur de la réponse (protection contre flooding)
    .substring(0, 50000);
}

// =============================================================================
// HTTP: CHAT API
// =============================================================================

export const aiChat = onRequest(
  {
    region: "europe-west1",
    cors: [/sos-expat.*$/i, /localhost(:\d+)?$/i, /ulixai.*$/i],
    // Note: MODERATION_OPENAI_KEY est déjà inclus dans AI_SECRETS (même secret)
    secrets: [...AI_SECRETS, SOS_PLATFORM_API_KEY],
    timeoutSeconds: 60,
    // NOTE: minInstances désactivé pour respecter quota CPU région (cold start ~3-10s)
    minInstances: 0,
    maxInstances: 20,
    memory: "512MiB",
  },
  async (req: Request, res: Response): Promise<void> => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method Not Allowed" });
      return;
    }

    // ==========================================================
    // SÉCURITÉ: Vérification Firebase Auth OU API Key (SOS)
    // ==========================================================
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.userId) {
      res.status(401).json({
        ok: false,
        error: "Authentification requise",
        code: "AUTH_REQUIRED"
      });
      return;
    }

    const { message, conversationId, providerType: reqProviderType } = req.body;
    // Utiliser l'userId vérifié (du token Firebase ou du body pour API key)
    const userId = authResult.userId;
    const startTime = Date.now();

    if (!message) {
      res.status(400).json({ ok: false, error: "message requis" });
      return;
    }

    // ==========================================================
    // PERFORMANCE: VÉRIFICATIONS PARALLÈLES
    // Rate limit et modération toujours, subscription si pas API key
    // ==========================================================
    const checksToRun: Promise<unknown>[] = [
      checkRateLimit(userId, "AI_CHAT"),
      moderateInput(message),
    ];

    // Ne vérifier l'abonnement que si pas authentifié par API key
    // (SOS a déjà vérifié l'abonnement côté SOS)
    if (!authResult.skipSubscriptionCheck) {
      checksToRun.push(checkUserSubscription(userId));
    }

    const results = await Promise.all(checksToRun);
    const rateLimitResult = results[0] as Awaited<ReturnType<typeof checkRateLimit>>;
    const moderationResult = results[1] as Awaited<ReturnType<typeof moderateInput>>;
    const hasAccess = authResult.skipSubscriptionCheck ? true : (results[2] as boolean);

    // Traiter rate limit
    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!rateLimitResult.allowed) {
      logger.warn("[aiChat] Rate limit exceeded", { userId, remaining: rateLimitResult.remaining });
      res.status(429).json({
        ok: false,
        error: "Trop de requêtes. Veuillez patienter.",
        retryAfter: Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000),
      });
      return;
    }

    // Traiter modération
    if (!moderationResult.ok) {
      logger.warn("[aiChat] Content moderation blocked", {
        userId,
        reason: moderationResult.reason
      });

      if (moderationResult.reason === "moderation_unavailable") {
        res.status(503).json({
          ok: false,
          error: "Service de modération temporairement indisponible. Veuillez réessayer.",
        });
      } else {
        res.status(400).json({
          ok: false,
          error: "Votre message a été bloqué par notre système de modération.",
          code: "CONTENT_MODERATED",
        });
      }
      return;
    }

    // Sanitize user message to prevent prompt injection
    const safeMessage = sanitizeUserInput(message);
    if (!safeMessage) {
      res.status(400).json({ ok: false, error: "message invalide après sanitization" });
      return;
    }

    // Traiter subscription
    if (!hasAccess) {
      res.status(403).json({ ok: false, error: "Abonnement requis" });
      return;
    }

    try {
      const db = admin.firestore();

      // Get or create conversation
      let convoRef;
      let history: LLMMessage[] = [];
      let providerType: ProviderType = reqProviderType || "expat";
      let convoData: ConversationData | null = null;
      let providerId: string | null = null;

      if (conversationId) {
        convoRef = db.collection("conversations").doc(conversationId);
        const convoDoc = await convoRef.get();

        if (convoDoc.exists) {
          convoData = convoDoc.data() as ConversationData;
          if (convoData.providerId) {
            providerId = convoData.providerId;
            providerType = convoData.providerType || (await getProviderType(convoData.providerId));
          }

          // Load INTELLIGENT history (preserves initial context + recent)
          history = await buildConversationHistory(db, conversationId, convoData);
        }
      } else {
        // FIX: Add status and lastMessageAt for frontend compatibility
        convoRef = db.collection("conversations").doc();
        const now = admin.firestore.FieldValue.serverTimestamp();
        await convoRef.set({
          userId,
          providerId: providerId || null,
          providerType,
          status: "active",
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now,
          messagesCount: 0,
        });
      }

      // ==========================================================
      // ACCESS AND QUOTA CHECK COMBINÉ (OPTIMISATION: 1 lecture Firestore)
      // ==========================================================
      if (providerId) {
        const aiStatus = await checkProviderAIStatus(providerId);

        // Vérifier accès
        if (!aiStatus.hasAccess) {
          logger.warn("[aiChat] Provider without AI access", {
            providerId,
            reason: aiStatus.accessReason,
          });
          res.status(403).json({
            ok: false,
            error: "Accès IA non autorisé pour ce prestataire",
            reason: aiStatus.accessReason,
          });
          return;
        }

        // Vérifier quota
        if (!aiStatus.hasQuota) {
          logger.warn("[aiChat] Quota exhausted", {
            providerId,
            used: aiStatus.quotaUsed,
            limit: aiStatus.quotaLimit,
          });
          res.status(429).json({
            ok: false,
            error: `Quota IA épuisé (${aiStatus.quotaUsed}/${aiStatus.quotaLimit} appels)`,
            quotaUsed: aiStatus.quotaUsed,
            quotaLimit: aiStatus.quotaLimit,
          });
          return;
        }
      }

      // Add sanitized user message
      history.push({ role: "user", content: safeMessage });

      // Save user message
      // FIX: Use 'createdAt' instead of 'timestamp' - frontend queries by createdAt
      await convoRef.collection("messages").add({
        role: "user",
        source: "user",
        content: safeMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Call AI with enriched context
      const service = createService();
      const response = await service.chat(history, providerType, {
        providerType,
        country: convoData?.bookingContext?.country,
        clientName: convoData?.bookingContext?.clientName,
        category: convoData?.bookingContext?.category,
        urgency: convoData?.bookingContext?.urgency,
        specialties: convoData?.bookingContext?.specialties,
      });

      // P0 FIX: Modération de l'output IA
      let outputFlagged = false;
      let flaggedCategories: string[] = [];
      if (response.response && response.response.length >= 50) {
        const outputModeration = await moderateOutput(response.response);
        if (!outputModeration.ok) {
          outputFlagged = true;
          flaggedCategories = outputModeration.categories || [];
          logger.warn("[aiChat] AI output was flagged by moderation", {
            userId,
            providerId,
            conversationId: conversationId || convoRef.id,
            categories: flaggedCategories,
            responseLength: response.response.length,
          });
        }
      }

      // Batch for parallel operations
      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Save AI response
      // FIX: Use 'createdAt' instead of 'timestamp', and proper 'source' value
      const aiMsgRef = convoRef.collection("messages").doc();
      batch.set(aiMsgRef, {
        role: "assistant",
        // FIX: Frontend checks source === "gpt" or "claude" for AI message styling
        source: response.provider === "claude" ? "claude" : "gpt",
        content: response.response,
        model: response.model,
        provider: response.provider,
        searchPerformed: response.searchPerformed,
        citations: response.citations || null,
        fallbackUsed: response.fallbackUsed || false,
        createdAt: now,
        // P0 FIX: Flag pour modération output
        ...(outputFlagged && {
          moderation: {
            flagged: true,
            categories: flaggedCategories,
            flaggedAt: now,
            reviewed: false,
          },
        }),
      });

      // Update conversation
      batch.update(convoRef, {
        updatedAt: now,
        messagesCount: admin.firestore.FieldValue.increment(2),
        // P0 FIX: Flag conversation pour review admin si contenu flaggé
        ...(outputFlagged && {
          hasFlaggedContent: true,
          lastFlaggedAt: now,
        }),
      });

      await batch.commit();

      // ==========================================================
      // INCREMENT QUOTA AFTER SUCCESS (if linked to a provider)
      // ==========================================================
      if (providerId) {
        await incrementAiUsage(providerId);
      }

      // Sanitiser la réponse IA avant envoi (protection XSS)
      const safeResponse = sanitizeAIOutput(response.response);
      const processingTimeMs = Date.now() - startTime;

      // Logging performance pour monitoring
      logger.info("[aiChat] Success", {
        userId,
        providerId,
        conversationId: convoRef.id,
        model: response.model,
        provider: response.provider,
        searchPerformed: response.searchPerformed,
        fallbackUsed: response.fallbackUsed || false,
        processingTimeMs,
        inputTokens: (response as unknown as { usage?: { inputTokens?: number } }).usage?.inputTokens,
        outputTokens: (response as unknown as { usage?: { outputTokens?: number } }).usage?.outputTokens,
        outputFlagged,
        ...(outputFlagged && { flaggedCategories }),
      });

      res.status(200).json({
        ok: true,
        response: safeResponse,
        model: response.model,
        provider: response.provider,
        conversationId: convoRef.id,
        searchPerformed: response.searchPerformed,
        citations: response.citations,
        fallbackUsed: response.fallbackUsed || false,
        processingTimeMs,
        // P0 FIX: Inclure warning si output flaggé
        ...(outputFlagged && {
          warning: {
            type: "content_warning",
            message: "Cette réponse a été signalée pour révision.",
            categories: flaggedCategories,
          },
        }),
      });
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      logger.error("[aiChat] Error", {
        userId,
        error: (error as Error).message,
        stack: (error as Error).stack,
        processingTimeMs,
      });
      // SÉCURITÉ: Ne pas exposer les détails d'erreur en production
      res.status(500).json({
        ok: false,
        error: "Erreur interne du service IA. Veuillez réessayer.",
      });
    }
  }
);
