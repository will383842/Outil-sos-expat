/**
 * =============================================================================
 * AI HANDLER - Chat Streaming SSE Endpoint
 * =============================================================================
 *
 * Server-Sent Events (SSE) endpoint for streaming AI responses.
 * Provides real-time progressive display of AI responses.
 *
 * Events:
 * - start: Début du streaming
 * - chunk: Fragment de texte
 * - done: Fin du streaming
 * - error: Erreur survenue
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import type { Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

import type { LLMMessage, ConversationData, ProviderType } from "../core/types";
import { AI_CONFIG } from "../core/config";
import {
  getProviderType,
  getProviderLanguage,
  checkUserSubscription,
  sanitizeUserInput,
  buildConversationHistory,
  checkProviderAIStatus,
  reserveAiQuota,
  releaseAiQuota,
} from "../services/utils";

import { AI_SECRETS } from "./shared";
import { checkRateLimit } from "../../rateLimiter";
import { moderateInput, moderateOutput, MODERATION_OPENAI_KEY } from "../../moderation";

// =============================================================================
// TYPES SSE
// =============================================================================

interface SSEEvent {
  event: "start" | "chunk" | "done" | "error" | "warning" | "progress";
  data: Record<string, unknown>;
}

// P0 FIX: Types pour les étapes de progression
type ProgressStep = "initializing" | "validating" | "searching" | "analyzing" | "generating" | "finalizing";

interface ProgressData {
  step: ProgressStep;
  stepNumber: number;
  totalSteps: number;
  message: string;
}

// =============================================================================
// AUTH VERIFICATION
// =============================================================================

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
    logger.warn("[aiChatStream] Invalid auth token", {
      error: (error as Error).message,
    });
    return null;
  }
}

// =============================================================================
// SSE HELPERS
// =============================================================================

function sendSSE(res: Response, event: SSEEvent): void {
  res.write(`event: ${event.event}\n`);
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  // P0 FIX: Force flush buffer pour envoi immédiat
  if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
    (res as unknown as { flush: () => void }).flush();
  }
}

function setupSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();
}

// =============================================================================
// STREAMING OPENAI CALL
// =============================================================================

async function* streamOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): AsyncGenerator<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

  try {
    const response = await fetch(AI_CONFIG.OPENAI.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.OPENAI.MODEL,
        messages,
        temperature: AI_CONFIG.OPENAI.TEMPERATURE,
        max_tokens: AI_CONFIG.OPENAI.MAX_TOKENS,
        stream: true, // Enable streaming
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;

        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// STREAMING ANTHROPIC CALL
// =============================================================================

async function* streamClaude(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  apiKey: string
): AsyncGenerator<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    // Filtrer les messages système (Anthropic les veut séparés)
    const claudeMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(AI_CONFIG.CLAUDE.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_CONFIG.CLAUDE.MODEL,
        system: systemPrompt,
        messages: claudeMessages,
        max_tokens: AI_CONFIG.CLAUDE.MAX_TOKENS,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.type === "content_block_delta") {
              const text = json.delta?.text;
              if (text) {
                yield text;
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// HTTP: CHAT STREAM API
// =============================================================================

export const aiChatStream = onRequest(
  {
    region: "europe-west1",
    cors: [/sos-expat.*$/i, /localhost(:\d+)?$/i, /ulixai.*$/i],
    // Note: MODERATION_OPENAI_KEY est déjà inclus dans AI_SECRETS (même secret)
    secrets: AI_SECRETS,
    // P0 FIX: Timeout augmenté de 60s à 120s pour éviter les "10 minutes bloquées"
    // Avec les nouveaux timeouts API (25s) et retries réduits (2x1.5), le pire cas est ~65s
    timeoutSeconds: 120,
    // NOTE: minInstances désactivé pour respecter quota CPU région (cold start ~3-10s)
    minInstances: 0,
    maxInstances: 20,
    memory: "512MiB",
  },
  async (req: Request, res: Response): Promise<void> => {
    // Only POST allowed
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method Not Allowed" });
      return;
    }

    // ==========================================================
    // AUTH
    // ==========================================================
    const decodedToken = await verifyAuthToken(req);
    if (!decodedToken) {
      res.status(401).json({
        ok: false,
        error: "Authentification requise",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    const { message, conversationId, providerType: reqProviderType } = req.body;
    const userId = decodedToken.uid;
    const startTime = Date.now();

    if (!message) {
      res.status(400).json({ ok: false, error: "message requis" });
      return;
    }

    // ==========================================================
    // PARALLEL VALIDATION
    // ==========================================================
    const [rateLimitResult, moderationResult, hasAccess] = await Promise.all([
      checkRateLimit(userId, "AI_CHAT"),
      moderateInput(message),
      checkUserSubscription(userId),
    ]);

    if (!rateLimitResult.allowed) {
      res.status(429).json({
        ok: false,
        error: "Trop de requêtes. Veuillez patienter.",
        retryAfter: Math.ceil(
          (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
        ),
      });
      return;
    }

    if (!moderationResult.ok) {
      res.status(400).json({
        ok: false,
        error: "Votre message a été bloqué par notre système de modération.",
        code: "CONTENT_MODERATED",
      });
      return;
    }

    const safeMessage = sanitizeUserInput(message);
    if (!safeMessage) {
      res.status(400).json({
        ok: false,
        error: "message invalide après sanitization",
      });
      return;
    }

    if (!hasAccess) {
      res.status(403).json({ ok: false, error: "Abonnement requis" });
      return;
    }

    // ==========================================================
    // SETUP SSE
    // ==========================================================
    setupSSEHeaders(res);

    // Handle client disconnect - MUST be declared first
    let clientDisconnected = false;

    // P0 FIX: Helper pour envoyer les événements de progression
    const sendProgress = (step: ProgressStep, stepNumber: number, message: string) => {
      if (!clientDisconnected) {
        sendSSE(res, {
          event: "progress",
          data: {
            step,
            stepNumber,
            totalSteps: 4,
            message,
          } as Record<string, unknown>,
        });
      }
    };

    // Étape 1: Validation terminée - envoi immédiat pour feedback utilisateur
    sendProgress("validating", 1, "Vérifications en cours...");
    req.on("close", () => {
      clientDisconnected = true;
      logger.info("[aiChatStream] Client disconnected");
    });

    // P0 FIX: Heartbeat keepalive pour éviter coupure proxy après 60s inactivité
    // P0 FIX: Réduit de 25s à 15s pour garantir maintien de connexion
    let heartbeatInterval: NodeJS.Timeout | null = setInterval(() => {
      if (!clientDisconnected && heartbeatInterval) {
        res.write(": keepalive\n\n");
        if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
          (res as unknown as { flush: () => void }).flush();
        }
      }
    }, 15000); // 15 secondes (avant le timeout proxy de 30-60s)

    // Helper pour nettoyer heartbeat et terminer la réponse
    const endResponse = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      res.end();
    };

    // Cleanup heartbeat on disconnect
    req.on("close", () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    });

    try {
      const db = admin.firestore();

      // Étape 2: Préparation du dossier
      sendProgress("initializing", 2, "Préparation du dossier...");

      // Get or create conversation
      let convoRef;
      let history: LLMMessage[] = [];
      let providerType: ProviderType = reqProviderType || "expat";
      let convoData: ConversationData | null = null;
      let providerId: string | null = null;
      let providerLanguage: string | undefined = undefined;  // 🆕 Langue du prestataire

      if (conversationId) {
        convoRef = db.collection("conversations").doc(conversationId);
        const convoDoc = await convoRef.get();

        if (convoDoc.exists) {
          convoData = convoDoc.data() as ConversationData;
          if (convoData.providerId) {
            providerId = convoData.providerId;
            providerType =
              convoData.providerType ||
              (await getProviderType(convoData.providerId));
            // 🆕 Récupérer la langue préférée du prestataire (il paie l'abonnement)
            providerLanguage = await getProviderLanguage(convoData.providerId);
            logger.info("[aiChatStream] Provider language", { providerId, providerLanguage });
          }
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

      // P0 FIX: Quota check + reserve ATOMIQUE (évite race condition)
      let quotaReserved = false;
      if (providerId) {
        const aiStatus = await checkProviderAIStatus(providerId);
        if (!aiStatus.hasAccess) {
          sendSSE(res, {
            event: "error",
            data: {
              error: "Accès IA non autorisé",
              reason: aiStatus.accessReason,
            },
          });
          endResponse();
          return;
        }

        // Réserver le quota de manière atomique AVANT de générer
        const reservation = await reserveAiQuota(providerId);
        if (!reservation.reserved) {
          sendSSE(res, {
            event: "error",
            data: {
              error: "Quota IA épuisé",
              quotaUsed: reservation.used,
              quotaLimit: reservation.limit,
            },
          });
          endResponse();
          return;
        }
        quotaReserved = true;
      }

      // Send start event
      sendSSE(res, {
        event: "start",
        data: { conversationId: convoRef.id },
      });

      // Étape 3: Analyse et génération de la réponse
      sendProgress("analyzing", 3, "Analyse juridique en cours...");

      // Add user message
      history.push({ role: "user", content: safeMessage });

      // Save user message
      // FIX: Use 'createdAt' instead of 'timestamp' - frontend queries by createdAt
      await convoRef.collection("messages").add({
        role: "user",
        source: "user",
        content: safeMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Prepare messages for API (🆕 avec langue du prestataire)
      const systemPrompt = buildSystemPrompt(providerType, convoData, providerLanguage);
      const formattedMessages = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      // Get API keys
      const openaiKey = process.env.OPENAI_API_KEY || "";
      const claudeKey = process.env.ANTHROPIC_API_KEY || "";

      // Choose provider and stream
      let fullResponse = "";
      let model = "";
      let provider = "";

      try {
        // Try OpenAI first (faster for streaming)
        if (openaiKey) {
          model = AI_CONFIG.OPENAI.MODEL;
          provider = "gpt";

          for await (const chunk of streamOpenAI(formattedMessages, openaiKey)) {
            if (clientDisconnected) break;

            fullResponse += chunk;
            sendSSE(res, {
              event: "chunk",
              data: { text: chunk },
            });
          }
        } else if (claudeKey) {
          // Fallback to Claude
          model = AI_CONFIG.CLAUDE.MODEL;
          provider = "claude";

          for await (const chunk of streamClaude(
            formattedMessages,
            systemPrompt,
            claudeKey
          )) {
            if (clientDisconnected) break;

            fullResponse += chunk;
            sendSSE(res, {
              event: "chunk",
              data: { text: chunk },
            });
          }
        } else {
          throw new Error("No AI provider available");
        }
      } catch (streamError) {
        logger.error("[aiChatStream] Streaming error", {
          error: (streamError as Error).message,
        });

        // P0 FIX: Libérer le quota réservé en cas d'échec de génération
        if (quotaReserved && providerId) {
          await releaseAiQuota(providerId);
          logger.info("[aiChatStream] Quota released due to streaming error", { providerId });
        }

        if (!clientDisconnected) {
          sendSSE(res, {
            event: "error",
            data: { error: "Erreur lors du streaming. Veuillez réessayer." },
          });
        }
        endResponse();
        return;
      }

      if (clientDisconnected) {
        logger.info("[aiChatStream] Aborted due to client disconnect");
        // P0 FIX: Libérer le quota si client déconnecté avant fin de génération
        if (quotaReserved && providerId && fullResponse.length === 0) {
          await releaseAiQuota(providerId);
          logger.info("[aiChatStream] Quota released due to client disconnect (no content generated)", { providerId });
        }
        return;
      }

      // P0 FIX: Modération de l'output IA
      // Note: Le contenu a déjà été streamé au client, on log uniquement pour audit
      let outputFlagged = false;
      let flaggedCategories: string[] = [];
      if (fullResponse.length >= 50) {
        const openaiKey = process.env.OPENAI_API_KEY || "";
        const outputModeration = await moderateOutput(fullResponse, openaiKey);
        if (!outputModeration.ok) {
          outputFlagged = true;
          flaggedCategories = outputModeration.categories || [];
          logger.warn("[aiChatStream] AI output was flagged by moderation", {
            userId,
            providerId,
            conversationId: conversationId || convoRef.id,
            categories: flaggedCategories,
            responseLength: fullResponse.length,
          });
          // Envoyer un warning au client (le contenu a déjà été streamé)
          sendSSE(res, {
            event: "warning",
            data: {
              type: "content_warning",
              message: "Cette réponse a été signalée pour révision.",
              categories: flaggedCategories,
            },
          });
        }
      }

      // Save AI response
      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      // FIX: Use 'createdAt' instead of 'timestamp', and proper 'source' value
      const aiMsgRef = convoRef.collection("messages").doc();
      batch.set(aiMsgRef, {
        role: "assistant",
        // FIX: Frontend checks source === "gpt" or "claude" for AI message styling
        source: provider === "claude" ? "claude" : "gpt",
        content: fullResponse,
        model,
        provider,
        streamed: true,
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

      // NOTE: Quota déjà incrémenté dans reserveAiQuota() (P0 FIX atomique)

      const processingTimeMs = Date.now() - startTime;

      // Send done event
      sendSSE(res, {
        event: "done",
        data: {
          conversationId: convoRef.id,
          messageId: aiMsgRef.id,
          model,
          provider,
          processingTimeMs,
        },
      });

      logger.info("[aiChatStream] Success", {
        userId,
        providerId,
        conversationId: convoRef.id,
        model,
        provider,
        processingTimeMs,
        responseLength: fullResponse.length,
        outputFlagged,
        ...(outputFlagged && { flaggedCategories }),
      });

      endResponse();
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      logger.error("[aiChatStream] Error", {
        userId,
        error: (error as Error).message,
        stack: (error as Error).stack,
        processingTimeMs,
      });

      if (!clientDisconnected) {
        sendSSE(res, {
          event: "error",
          data: { error: "Erreur interne du service IA. Veuillez réessayer." },
        });
      }

      endResponse();
    }
  }
);

// =============================================================================
// HELPERS
// =============================================================================

function buildSystemPrompt(
  providerType: ProviderType,
  convoData: ConversationData | null,
  providerLanguage?: string
): string {
  // 🆕 Instruction de langue PRIORITAIRE (le prestataire paie l'abonnement)
  const languageInstruction = providerLanguage
    ? `🔴 LANGUE DE RÉPONSE OBLIGATOIRE: Tu DOIS répondre UNIQUEMENT en ${providerLanguage.toUpperCase()}.
Le prestataire qui paie l'abonnement a choisi cette langue. C'est une exigence absolue.

`
    : "";

  const basePrompt =
    providerType === "lawyer"
      ? `Tu es un assistant juridique expert en droit de l'immigration et de l'expatriation.
Tu aides les avocats à analyser des dossiers et fournir des conseils juridiques.
Sois précis, cite les textes de loi pertinents, et reste professionnel.`
      : `Tu es un assistant bienveillant spécialisé dans l'aide aux expatriés.
Tu aides les particuliers avec leurs démarches administratives et leur installation.
Sois clair, pratique et encourageant dans tes réponses.`;

  if (convoData?.bookingContext) {
    const ctx = convoData.bookingContext;
    return `${languageInstruction}${basePrompt}

Contexte du dossier:
- Client: ${ctx.clientName || "Non spécifié"}
- Pays: ${ctx.country || "Non spécifié"}
- Catégorie: ${ctx.category || "Non spécifiée"}
- Urgence: ${ctx.urgency || "Normal"}`;
  }

  return `${languageInstruction}${basePrompt}`;
}
