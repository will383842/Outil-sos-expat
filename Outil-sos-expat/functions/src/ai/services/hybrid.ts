/**
 * =============================================================================
 * SOS EXPAT — Service Hybride IA V6.0
 * =============================================================================
 *
 * Orchestration intelligente multi-LLM:
 * - Claude 3.5 Sonnet pour AVOCATS (raisonnement juridique)
 * - GPT-4o pour EXPERTS EXPATRIÉS (conseils pratiques)
 * - Perplexity pour RECHERCHE WEB (questions factuelles)
 * - Fallback automatique entre LLMs
 */

import { logger } from "firebase-functions";
import type { HybridResponse, LLMMessage, ProviderType, AIRequestContext } from "../core/types";
import { ClaudeProvider } from "../providers/claude";
import { OpenAIProvider } from "../providers/openai";
import { PerplexityProvider, isFactualQuestion } from "../providers/perplexity";
import { getSystemPrompt } from "../prompts";
import { withExponentialBackoff } from "./utils";

// =============================================================================
// INTERFACE DE CONFIGURATION
// =============================================================================

export interface HybridServiceConfig {
  openaiApiKey: string;
  claudeApiKey: string;
  perplexityApiKey: string;
  useClaudeForLawyers: boolean;
  usePerplexityForFactual: boolean;
}

// =============================================================================
// CIRCUIT BREAKER - Protection contre pannes LLM
// =============================================================================

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = "CLOSED";
  private readonly failureThreshold = 5;
  private readonly resetTimeoutMs = 60000; // 1 minute

  constructor(private readonly name: string) {}

  isOpen(): boolean {
    if (this.state === "OPEN") {
      // Vérifier si on peut passer en HALF_OPEN
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        logger.info(`[CircuitBreaker:${this.name}] State: HALF_OPEN (testing recovery)`);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      logger.info(`[CircuitBreaker:${this.name}] State: CLOSED (recovered)`);
    }
    this.failures = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      logger.error(`[CircuitBreaker:${this.name}] State: OPEN (${this.failures} failures)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Circuit breakers globaux pour chaque provider
const circuitBreakers = {
  claude: new CircuitBreaker("claude"),
  openai: new CircuitBreaker("openai"),
  perplexity: new CircuitBreaker("perplexity"),
};

// =============================================================================
// SERVICE HYBRIDE
// =============================================================================

export class HybridAIService {
  private claude: ClaudeProvider;
  private openai: OpenAIProvider;
  private perplexity: PerplexityProvider;
  private config: HybridServiceConfig;

  constructor(config: HybridServiceConfig) {
    this.config = config;
    this.claude = new ClaudeProvider(config.claudeApiKey);
    this.openai = new OpenAIProvider(config.openaiApiKey);
    this.perplexity = new PerplexityProvider(config.perplexityApiKey);
  }

  /**
   * Point d'entrée principal - route vers le bon LLM selon le contexte
   */
  async chat(
    messages: LLMMessage[],
    providerType: ProviderType,
    context?: AIRequestContext
  ): Promise<HybridResponse> {
    const userMessage = this.getLastUserMessage(messages);
    const systemPrompt = getSystemPrompt(providerType);

    logger.info("[HybridAI] Requête entrante", {
      providerType,
      messageLength: userMessage.length,
      isFactual: isFactualQuestion(userMessage)
    });

    // Étape 1: Recherche web si question factuelle
    let searchContext = "";
    let citations: string[] | undefined;
    let searchPerformed = false;

    if (this.config.usePerplexityForFactual && isFactualQuestion(userMessage)) {
      try {
        const searchResult = await this.performWebSearch(userMessage, context);
        searchContext = searchResult.content;
        citations = searchResult.citations;
        searchPerformed = true;
        logger.info("[HybridAI] Recherche web effectuée", { citationsCount: citations?.length });
      } catch (error) {
        logger.warn("[HybridAI] Recherche web échouée, continue sans", { error });
      }
    }

    // Étape 2: Choisir le LLM principal selon providerType
    const useClaude = providerType === "lawyer" && this.config.useClaudeForLawyers;

    // Étape 3: Appeler le LLM avec fallback
    try {
      const response = await this.callWithFallback(
        messages,
        systemPrompt,
        searchContext,
        citations,  // Passer les citations pour injection
        useClaude
      );

      // Déterminer le llmUsed basé sur le provider principal
      const mainProvider = response.provider as "claude" | "gpt";
      let llmUsed: "claude" | "gpt" | "claude+perplexity" | "gpt+perplexity";
      if (searchPerformed) {
        llmUsed = mainProvider === "claude" ? "claude+perplexity" : "gpt+perplexity";
      } else {
        llmUsed = mainProvider;
      }

      return {
        response: response.content,
        model: response.model,
        provider: response.provider,
        citations,
        searchPerformed,
        llmUsed,
        fallbackUsed: response.fallbackUsed || false
      };
    } catch (error) {
      logger.error("[HybridAI] Tous les LLMs ont échoué", { error });
      throw error;
    }
  }

  // ===========================================================================
  // MÉTHODES PRIVÉES
  // ===========================================================================

  private getLastUserMessage(messages: LLMMessage[]): string {
    const userMessages = messages.filter(m => m.role === "user");
    return userMessages[userMessages.length - 1]?.content || "";
  }

  private async performWebSearch(
    query: string,
    context?: AIRequestContext
  ): Promise<{ content: string; citations?: string[] }> {
    // Construire une requête de recherche TRÈS ciblée par pays
    const searchParts: string[] = [];

    // 1. La question originale
    searchParts.push(query);

    // 2. Contexte pays OBLIGATOIRE et PRÉCIS
    if (context?.country) {
      searchParts.push(`in ${context.country}`);
      searchParts.push(`${context.country} laws regulations 2024 2025`);
    }

    // 3. Nationalité si différente du pays
    if (context?.nationality && context.nationality !== context.country) {
      searchParts.push(`${context.nationality} citizen`);
    }

    // 4. Catégorie si disponible
    if (context?.category) {
      searchParts.push(context.category);
    }

    // 5. Contexte expatrié/voyageur
    searchParts.push("expatriate foreigner requirements");

    const enrichedQuery = searchParts.join(" ");

    // Prompt de recherche TRÈS précis pour Perplexity
    const searchSystemPrompt = `Tu es un expert en recherche d'informations pour expatriés.

MISSION: Trouver des informations PRÉCISES et ACTUELLES pour ce contexte:
${context?.country ? `- PAYS CONCERNÉ: ${context.country} (OBLIGATOIRE - toutes les infos doivent concerner CE pays)` : ""}
${context?.nationality ? `- NATIONALITÉ DU CLIENT: ${context.nationality}` : ""}
${context?.category ? `- DOMAINE: ${context.category}` : ""}

RÈGLES CRITIQUES:
1. Ne donne QUE des informations qui s'appliquent au pays ${context?.country || "concerné"}
2. Cite les LOIS LOCALES avec numéros et dates
3. Indique les sites OFFICIELS du gouvernement de ce pays
4. Donne les TARIFS et DÉLAIS actuels (2024-2025)
5. Si une info est incertaine, DIS-LE clairement
6. JAMAIS d'informations générales qui ne s'appliquent pas au pays spécifique`;

    const result = await withExponentialBackoff(
      () => this.perplexity.search({
        messages: [{ role: "user", content: enrichedQuery }],
        systemPrompt: searchSystemPrompt,
        returnCitations: true
      }),
      { logContext: `[Perplexity Search] ${context?.country || "global"}` }
    );

    return {
      content: result.content,
      citations: result.citations
    };
  }

  private async callWithFallback(
    messages: LLMMessage[],
    systemPrompt: string,
    searchContext: string,
    citations: string[] | undefined,
    preferClaude: boolean
  ): Promise<{ content: string; model: string; provider: "claude" | "gpt"; fallbackUsed: boolean }> {
    // Enrichir le prompt avec le contexte de recherche ET les citations
    let enrichedPrompt = systemPrompt;
    if (searchContext) {
      enrichedPrompt += `\n\n--- INFORMATIONS DE RECHERCHE WEB ---\n${searchContext}`;

      // Injecter les citations pour que le LLM puisse les référencer
      if (citations && citations.length > 0) {
        enrichedPrompt += `\n\n--- SOURCES ---\n`;
        citations.forEach((citation, i) => {
          enrichedPrompt += `[${i + 1}] ${citation}\n`;
        });
        enrichedPrompt += `\nUtilise ces sources dans ta réponse en citant les numéros [1], [2], etc. quand pertinent.`;
      }

      enrichedPrompt += `\n--- FIN RECHERCHE ---`;
    }

    // Ordre de priorité selon le type de provider avec CIRCUIT BREAKER
    const primaryProviderName = preferClaude ? "claude" : "openai";
    const fallbackProviderName = preferClaude ? "openai" : "claude";
    const primaryProvider = preferClaude ? this.claude : this.openai;
    const fallbackProvider = preferClaude ? this.openai : this.claude;
    const primaryCircuit = circuitBreakers[primaryProviderName];
    const fallbackCircuit = circuitBreakers[fallbackProviderName];

    // ==========================================================
    // CIRCUIT BREAKER: Essayer le provider principal
    // ==========================================================
    if (primaryProvider.isAvailable() && !primaryCircuit.isOpen()) {
      try {
        logger.info(`[HybridAI] Tentative avec ${primaryProvider.name} (circuit: ${primaryCircuit.getState()})`);
        const result = await withExponentialBackoff(
          () => primaryProvider.chat({
            messages,
            systemPrompt: enrichedPrompt
          }),
          { logContext: `[${primaryProvider.name}] Primary` }
        );
        // SUCCÈS: Fermer le circuit
        primaryCircuit.recordSuccess();
        return {
          content: result.content,
          model: result.model,
          provider: result.provider as "claude" | "gpt",
          fallbackUsed: false
        };
      } catch (error) {
        // ÉCHEC: Enregistrer dans le circuit breaker
        primaryCircuit.recordFailure();
        logger.warn(`[HybridAI] ${primaryProvider.name} échoué (circuit: ${primaryCircuit.getState()}), fallback`, { error });
      }
    } else if (primaryCircuit.isOpen()) {
      logger.warn(`[HybridAI] ${primaryProvider.name} circuit OPEN, skip vers fallback`);
    }

    // ==========================================================
    // CIRCUIT BREAKER: Fallback sur l'autre provider
    // ==========================================================
    if (fallbackProvider.isAvailable() && !fallbackCircuit.isOpen()) {
      try {
        logger.info(`[HybridAI] Fallback vers ${fallbackProvider.name} (circuit: ${fallbackCircuit.getState()})`);
        const result = await withExponentialBackoff(
          () => fallbackProvider.chat({
            messages,
            systemPrompt: enrichedPrompt
          }),
          { logContext: `[${fallbackProvider.name}] Fallback` }
        );
        // SUCCÈS: Fermer le circuit
        fallbackCircuit.recordSuccess();
        return {
          content: result.content,
          model: result.model,
          provider: result.provider as "claude" | "gpt",
          fallbackUsed: true
        };
      } catch (error) {
        // ÉCHEC: Enregistrer dans le circuit breaker
        fallbackCircuit.recordFailure();
        logger.error(`[HybridAI] ${fallbackProvider.name} échoué aussi (circuit: ${fallbackCircuit.getState()})`, { error });
        throw error;
      }
    } else if (fallbackCircuit.isOpen()) {
      logger.error(`[HybridAI] ${fallbackProvider.name} circuit OPEN, aucun LLM disponible`);
    }

    // ==========================================================
    // DERNIER RECOURS: Réponse pré-enregistrée
    // ==========================================================
    logger.error("[HybridAI] Tous les circuits sont ouverts, réponse de secours");
    return {
      content: "Je suis temporairement indisponible en raison d'une maintenance. Veuillez réessayer dans quelques minutes. Si le problème persiste, contactez le support.",
      model: "fallback",
      provider: "gpt",
      fallbackUsed: true
    };
  }

  /**
   * Expose l'état des circuits pour monitoring
   */
  getCircuitStates(): Record<string, CircuitState> {
    return {
      claude: circuitBreakers.claude.getState(),
      openai: circuitBreakers.openai.getState(),
      perplexity: circuitBreakers.perplexity.getState(),
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createHybridService(config: HybridServiceConfig): HybridAIService {
  return new HybridAIService(config);
}
