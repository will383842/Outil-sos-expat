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
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      AI_CONFIG.API_TIMEOUT_MS
    );

    try {
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json() as ClaudeResponse;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error(`Timeout après ${AI_CONFIG.API_TIMEOUT_MS}ms`);
      }
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
