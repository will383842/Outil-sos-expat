/**
 * =============================================================================
 * SOS EXPAT — Provider OpenAI (GPT-4o)
 * =============================================================================
 *
 * Provider pour GPT-4o - utilisé pour les EXPERTS EXPATRIÉS.
 * Meilleur pour conseils pratiques et informations concrètes.
 */

import { logger } from "firebase-functions";
import { AI_CONFIG } from "../core/config";
import type { LLMResponse, OpenAIResponse, LLMMessage } from "../core/types";
import { BaseLLMProvider, type ChatOptions } from "./base";

// =============================================================================
// PROVIDER OPENAI
// =============================================================================

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = "gpt" as const;
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    // DEBUG: Log API key info at construction
    logger.info("[OpenAI] Provider initialisé", {
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 10) || "EMPTY",
      apiKeyHasWhitespace: apiKey !== apiKey?.trim(),
    });
  }

  isAvailable(): boolean {
    const available = Boolean(this.apiKey && this.apiKey.length > 0);
    logger.debug("[OpenAI] isAvailable check", { available, keyLength: this.apiKey?.length });
    return available;
  }

  async chat(options: ChatOptions): Promise<LLMResponse> {
    this.validateOptions(options);

    if (!this.isAvailable()) {
      throw this.formatError(new Error("API key not configured"), "chat");
    }

    const config = AI_CONFIG.OPENAI;

    // Préparer les messages pour l'API OpenAI
    const openaiMessages = this.formatMessages(options.messages, options.systemPrompt);

    const requestBody = {
      model: config.MODEL,
      messages: openaiMessages,
      temperature: options.temperature ?? config.TEMPERATURE,
      max_tokens: options.maxTokens || config.MAX_TOKENS
    };

    logger.info("[OpenAI] Envoi requête", {
      model: config.MODEL,
      messageCount: openaiMessages.length
    });

    try {
      const response = await this.makeRequest(requestBody);
      return this.parseResponse(response);
    } catch (error) {
      logger.error("[OpenAI] Erreur", { error });
      throw this.formatError(error, "chat");
    }
  }

  // ===========================================================================
  // MÉTHODES PRIVÉES
  // ===========================================================================

  private formatMessages(
    messages: LLMMessage[],
    systemPrompt?: string
  ): Array<{ role: string; content: string }> {
    const formatted: Array<{ role: string; content: string }> = [];

    // Ajouter le system prompt en premier si présent
    if (systemPrompt) {
      formatted.push({ role: "system", content: systemPrompt });
    }

    // Ajouter les messages de la conversation
    for (const msg of messages) {
      if (msg.role === "system" && systemPrompt) continue; // Déjà ajouté
      formatted.push({
        role: msg.role,
        content: msg.content
      });
    }

    return formatted;
  }

  private async makeRequest(body: object): Promise<OpenAIResponse> {
    const requestId = `openai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      AI_CONFIG.API_TIMEOUT_MS
    );

    logger.info(`[OpenAI] [${requestId}] STEP 1: Préparation requête`, {
      url: AI_CONFIG.OPENAI.API_URL,
      timeout: AI_CONFIG.API_TIMEOUT_MS,
      apiKeyLength: this.apiKey?.length,
      apiKeyValid: this.apiKey?.startsWith("sk-"),
    });

    try {
      const startTime = Date.now();
      logger.info(`[OpenAI] [${requestId}] STEP 2: Envoi fetch...`);

      const response = await fetch(AI_CONFIG.OPENAI.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const elapsed = Date.now() - startTime;
      logger.info(`[OpenAI] [${requestId}] STEP 3: Réponse reçue`, {
        status: response.status,
        statusText: response.statusText,
        elapsed: `${elapsed}ms`,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[OpenAI] [${requestId}] STEP 4: ERREUR HTTP`, {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText.substring(0, 500),
          elapsed: `${elapsed}ms`,
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const jsonResponse = await response.json() as OpenAIResponse;
      logger.info(`[OpenAI] [${requestId}] STEP 5: Succès`, {
        model: jsonResponse.model,
        promptTokens: jsonResponse.usage?.prompt_tokens,
        completionTokens: jsonResponse.usage?.completion_tokens,
        elapsed: `${elapsed}ms`,
      });

      return jsonResponse;
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        logger.error(`[OpenAI] [${requestId}] TIMEOUT après ${AI_CONFIG.API_TIMEOUT_MS}ms`);
        throw new Error(`Timeout après ${AI_CONFIG.API_TIMEOUT_MS}ms`);
      }
      logger.error(`[OpenAI] [${requestId}] EXCEPTION`, {
        errorName: err.name,
        errorMessage: err.message,
      });
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseResponse(response: OpenAIResponse): LLMResponse {
    const choice = response.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error("Réponse OpenAI vide ou invalide");
    }

    return {
      content: choice.message.content,
      model: response.model,
      provider: "gpt",
      usage: response.usage ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens
      } : undefined
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createOpenAIProvider(apiKey: string): OpenAIProvider {
  return new OpenAIProvider(apiKey);
}
