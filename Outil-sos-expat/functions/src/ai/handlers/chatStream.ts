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
  incrementAiUsage,
} from "../services/utils";

import { AI_SECRETS } from "./shared";
import { checkRateLimit } from "../../rateLimiter";
import { moderateInput, MODERATION_OPENAI_KEY } from "../../moderation";

// =============================================================================
// TYPES SSE
// =============================================================================

interface SSEEvent {
  event: "start" | "chunk" | "done" | "error";
  data: Record<string, unknown>;
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
    timeoutSeconds: 60,
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

    // Handle client disconnect
    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
      logger.info("[aiChatStream] Client disconnected");
    });

    try {
      const db = admin.firestore();

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
        convoRef = db.collection("conversations").doc();
        await convoRef.set({
          userId,
          providerType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          messageCount: 0,
        });
      }

      // Quota check
      if (providerId) {
        const aiStatus = await checkProviderAIStatus(providerId);
        if (!aiStatus.hasAccess || !aiStatus.hasQuota) {
          sendSSE(res, {
            event: "error",
            data: {
              error: "Quota IA épuisé",
              quotaUsed: aiStatus.quotaUsed,
              quotaLimit: aiStatus.quotaLimit,
            },
          });
          res.end();
          return;
        }
      }

      // Send start event
      sendSSE(res, {
        event: "start",
        data: { conversationId: convoRef.id },
      });

      // Add user message
      history.push({ role: "user", content: safeMessage });

      // Save user message
      await convoRef.collection("messages").add({
        role: "user",
        source: "user",
        content: safeMessage,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
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

        if (!clientDisconnected) {
          sendSSE(res, {
            event: "error",
            data: { error: "Erreur lors du streaming. Veuillez réessayer." },
          });
        }
        res.end();
        return;
      }

      if (clientDisconnected) {
        logger.info("[aiChatStream] Aborted due to client disconnect");
        return;
      }

      // Save AI response
      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      const aiMsgRef = convoRef.collection("messages").doc();
      batch.set(aiMsgRef, {
        role: "assistant",
        source: "ai",
        content: fullResponse,
        model,
        provider,
        streamed: true,
        timestamp: now,
      });

      batch.update(convoRef, {
        updatedAt: now,
        messageCount: admin.firestore.FieldValue.increment(2),
      });

      await batch.commit();

      // Increment quota
      if (providerId) {
        await incrementAiUsage(providerId);
      }

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
      });

      res.end();
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

      res.end();
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
