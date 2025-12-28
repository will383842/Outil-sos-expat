/**
 * =============================================================================
 * SOS EXPAT — Interface de base pour les providers LLM
 * =============================================================================
 *
 * Interface commune que tous les providers (Claude, OpenAI, Perplexity)
 * doivent implémenter. Permet l'interchangeabilité et le fallback.
 */

import type { LLMMessage, LLMResponse, LLMProvider } from "../core/types";

// =============================================================================
// INTERFACE PRINCIPALE
// =============================================================================

export interface LLMProviderInterface {
  /**
   * Nom du provider (pour logs et debugging)
   */
  readonly name: LLMProvider;

  /**
   * Vérifie si le provider est disponible (API key configurée)
   */
  isAvailable(): boolean;

  /**
   * Envoie un message et reçoit une réponse
   */
  chat(options: ChatOptions): Promise<LLMResponse>;
}

// =============================================================================
// OPTIONS DE CHAT
// =============================================================================

export interface ChatOptions {
  messages: LLMMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// =============================================================================
// OPTIONS SPÉCIFIQUES PERPLEXITY (RECHERCHE WEB)
// =============================================================================

export interface SearchOptions extends ChatOptions {
  searchDomainFilter?: string[];
  returnCitations?: boolean;
  returnImages?: boolean;
}

export interface SearchResponse extends LLMResponse {
  citations?: string[];
  images?: string[];
}

// =============================================================================
// CLASSE DE BASE ABSTRAITE
// =============================================================================

export abstract class BaseLLMProvider implements LLMProviderInterface {
  abstract readonly name: LLMProvider;

  abstract isAvailable(): boolean;
  abstract chat(options: ChatOptions): Promise<LLMResponse>;

  /**
   * Valide les options de chat
   */
  protected validateOptions(options: ChatOptions): void {
    if (!options.messages || options.messages.length === 0) {
      throw new Error("Messages array is required and cannot be empty");
    }
  }

  /**
   * Formate une erreur de manière standardisée
   */
  protected formatError(error: unknown, context: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`[${this.name}] ${context}: ${message}`);
  }
}

// =============================================================================
// TYPE POUR LE REGISTRE DE PROVIDERS
// =============================================================================

export type ProviderRegistry = {
  claude: LLMProviderInterface;
  gpt: LLMProviderInterface;
  perplexity: LLMProviderInterface;
};
