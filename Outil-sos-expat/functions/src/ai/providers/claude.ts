/**
 * =============================================================================
 * SOS EXPAT — Provider Claude (Anthropic)
 * =============================================================================
 *
 * Provider pour Claude 3.5 Sonnet - utilisé pour les AVOCATS.
 * Meilleur raisonnement juridique et analyse complexe.
 */

import { logger } from "firebase-functions";
import { AI_CONFIG } from "../core/config";
import type { LLMResponse, ClaudeResponse, LLMMessage } from "../core/types";
import { BaseLLMProvider, type ChatOptions } from "./base";

// =============================================================================
// PROVIDER CLAUDE
// =============================================================================

export class ClaudeProvider extends BaseLLMProvider {
  readonly name = "claude" as const;
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    // DEBUG: Log API key info at construction
    logger.info("[Claude] Provider initialisé", {
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 15) || "EMPTY",
      apiKeyHasWhitespace: apiKey !== apiKey?.trim(),
      apiKeyEndsWithCRLF: apiKey?.endsWith("\r\n") || apiKey?.endsWith("\n"),
    });
  }

  isAvailable(): boolean {
    const available = Boolean(this.apiKey && this.apiKey.length > 0);
    logger.debug("[Claude] isAvailable check", { available, keyLength: this.apiKey?.length });
    return available;
  }

  async chat(options: ChatOptions): Promise<LLMResponse> {
    this.validateOptions(options);

    if (!this.isAvailable()) {
      throw this.formatError(new Error("API key not configured"), "chat");
    }

    const config = AI_CONFIG.CLAUDE;

    // Préparer les messages pour l'API Claude
    const claudeMessages = this.formatMessages(options.messages);

    const requestBody = {
      model: config.MODEL,
      max_tokens: options.maxTokens || config.MAX_TOKENS,
      temperature: options.temperature ?? config.TEMPERATURE,
      system: options.systemPrompt || "",
      messages: claudeMessages
    };

    logger.info("[Claude] Envoi requête", {
      model: config.MODEL,
      messageCount: claudeMessages.length,
      hasSystemPrompt: Boolean(options.systemPrompt)
    });

    try {
      const response = await this.makeRequest(requestBody);
      return this.parseResponse(response);
    } catch (error) {
      logger.error("[Claude] Erreur", { error });
      throw this.formatError(error, "chat");
    }
  }

  // ===========================================================================
  // MÉTHODES PRIVÉES
  // ===========================================================================

  private formatMessages(messages: LLMMessage[]): Array<{ role: string; content: string }> {
    return messages
      .filter(m => m.role !== "system") // System est passé séparément à Claude
      .map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));
  }

  private async makeRequest(body: object): Promise<ClaudeResponse> {
    const requestId = `claude_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      AI_CONFIG.API_TIMEOUT_MS
    );

    logger.info(`[Claude] [${requestId}] STEP 1: Préparation requête`, {
      url: AI_CONFIG.CLAUDE.API_URL,
      timeout: AI_CONFIG.API_TIMEOUT_MS,
      apiVersion: AI_CONFIG.CLAUDE.API_VERSION,
      apiKeyLength: this.apiKey?.length,
      apiKeyValid: this.apiKey?.startsWith("sk-ant-"),
    });

    try {
      const startTime = Date.now();
      logger.info(`[Claude] [${requestId}] STEP 2: Envoi fetch...`);

      const response = await fetch(AI_CONFIG.CLAUDE.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": AI_CONFIG.CLAUDE.API_VERSION
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const elapsed = Date.now() - startTime;
      logger.info(`[Claude] [${requestId}] STEP 3: Réponse reçue`, {
        status: response.status,
        statusText: response.statusText,
        elapsed: `${elapsed}ms`,
        headers: {
          contentType: response.headers.get("content-type"),
          requestId: response.headers.get("request-id"),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Claude] [${requestId}] STEP 4: ERREUR HTTP`, {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText.substring(0, 500), // Limite à 500 chars
          elapsed: `${elapsed}ms`,
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const jsonResponse = await response.json() as ClaudeResponse;
      logger.info(`[Claude] [${requestId}] STEP 5: Succès`, {
        model: jsonResponse.model,
        stopReason: (jsonResponse as any).stop_reason || "N/A",
        inputTokens: jsonResponse.usage?.input_tokens,
        outputTokens: jsonResponse.usage?.output_tokens,
        elapsed: `${elapsed}ms`,
      });

      return jsonResponse;
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        logger.error(`[Claude] [${requestId}] TIMEOUT après ${AI_CONFIG.API_TIMEOUT_MS}ms`);
        throw new Error(`Timeout après ${AI_CONFIG.API_TIMEOUT_MS}ms`);
      }
      logger.error(`[Claude] [${requestId}] EXCEPTION`, {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack?.substring(0, 300),
      });
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseResponse(response: ClaudeResponse): LLMResponse {
    const textContent = response.content.find(c => c.type === "text");

    if (!textContent?.text) {
      throw new Error("Réponse Claude vide ou invalide");
    }

    return {
      content: textContent.text,
      model: response.model,
      provider: "claude",
      usage: response.usage ? {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      } : undefined
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createClaudeProvider(apiKey: string): ClaudeProvider {
  return new ClaudeProvider(apiKey);
}
