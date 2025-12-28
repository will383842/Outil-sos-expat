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
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      AI_CONFIG.API_TIMEOUT_MS
    );

    try {
      const response = await fetch(AI_CONFIG.OPENAI.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json() as OpenAIResponse;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error(`Timeout après ${AI_CONFIG.API_TIMEOUT_MS}ms`);
      }
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
