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
import type { HybridResponse, LLMMessage, ProviderType, AIRequestContext, ConfidenceInfo, ConfidenceLevel } from "../core/types";
import { ClaudeProvider } from "../providers/claude";
import { OpenAIProvider } from "../providers/openai";
import { PerplexityProvider, isFactualQuestion } from "../providers/perplexity";
import { getSystemPrompt } from "../prompts";
import { withExponentialBackoff } from "./utils";

// =============================================================================
// 🆕 DISCLAIMERS PAR NIVEAU DE CONFIANCE
// =============================================================================

const DISCLAIMERS = {
  high: null,  // Pas de disclaimer si confiance haute
  medium: "⚠️ Informations indicatives - vérifiez sur le site officiel du gouvernement concerné.",
  low: "⚠️ Sources non-officielles utilisées - vérifiez impérativement sur les sites gouvernementaux avant d'appliquer.",
};

// =============================================================================
// 🆕 DÉTECTION SOURCES OFFICIELLES (INTERNATIONAL - 197 PAYS)
// =============================================================================

// Patterns génériques pour identifier les sources gouvernementales de N'IMPORTE QUEL pays
const OFFICIAL_DOMAIN_PATTERNS = [
  // Domaines gouvernementaux génériques (tous pays)
  /\.gov\./i,           // .gov.xx (USA, UK, AU, etc.)
  /\.gouv\./i,          // .gouv.xx (France, Canada FR, etc.)
  /\.gob\./i,           // .gob.xx (Espagne, Mexique, etc.)
  /\.gov$/i,            // .gov (USA federal)
  /\.go\./i,            // .go.xx (Japon, Kenya, etc.)
  /\.govt\./i,          // .govt.xx (NZ, etc.)
  /\.gc\./i,            // .gc.ca (Canada)
  /\.admin\./i,         // .admin.ch (Suisse)
  /\.bundesregierung/i, // Allemagne
  /\.regierung/i,       // Allemagne/Autriche

  // Organisations internationales
  /europa\.eu/i,        // Union Européenne
  /eur-lex/i,           // Législation UE
  /un\.org/i,           // Nations Unies
  /ilo\.org/i,          // Organisation Internationale du Travail
  /wto\.org/i,          // OMC
  /oecd\.org/i,         // OCDE
  /who\.int/i,          // OMS
  /imf\.org/i,          // FMI
  /worldbank\.org/i,    // Banque Mondiale

  // Ambassades et consulats (tous pays)
  /embassy/i,
  /consulate/i,
  /ambassade/i,
  /consulat/i,
  /embajada/i,
  /botschaft/i,
];

/**
 * Vérifie si une URL provient d'une source officielle (gouvernement, organisation internationale)
 * Fonctionne pour N'IMPORTE QUEL pays du monde
 */
function isOfficialSource(url: string): boolean {
  return OFFICIAL_DOMAIN_PATTERNS.some(pattern => pattern.test(url));
}

// =============================================================================
// 🆕 CALCUL DU SCORE DE CONFIANCE
// =============================================================================

function calculateConfidence(params: {
  searchPerformed: boolean;
  officialSourcesUsed: boolean;
  citationsCount: number;
  fallbackUsed: boolean;
  hasCountryContext: boolean;
}): ConfidenceInfo {
  let score = 50;  // Score de base
  const reasons: string[] = [];

  // +25 si recherche web effectuée
  if (params.searchPerformed) {
    score += 15;
    reasons.push("Recherche web effectuée");
  }

  // +25 si sources officielles utilisées
  if (params.officialSourcesUsed) {
    score += 25;
    reasons.push("Sources officielles utilisées");
  } else if (params.searchPerformed) {
    score -= 10;
    reasons.push("Sources non-officielles");
  }

  // +5 par citation (max +15)
  const citationBonus = Math.min(params.citationsCount * 5, 15);
  score += citationBonus;
  if (params.citationsCount > 0) {
    reasons.push(`${params.citationsCount} citation(s) fournie(s)`);
  }

  // -15 si fallback utilisé
  if (params.fallbackUsed) {
    score -= 15;
    reasons.push("LLM de secours utilisé");
  }

  // +10 si contexte pays précis
  if (params.hasCountryContext) {
    score += 10;
    reasons.push("Contexte pays précis");
  }

  // Normaliser entre 0 et 100
  score = Math.max(0, Math.min(100, score));

  // Déterminer le niveau
  let level: ConfidenceLevel;
  if (score >= 75) {
    level = "high";
  } else if (score >= 50) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    score,
    reasons,
    officialSourcesUsed: params.officialSourcesUsed,
    disclaimer: DISCLAIMERS[level] || undefined
  };
}

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
    let officialSourcesUsed = false;

    if (this.config.usePerplexityForFactual && isFactualQuestion(userMessage)) {
      try {
        const searchResult = await this.performWebSearch(userMessage, context);
        searchContext = searchResult.content;
        citations = searchResult.citations;
        searchPerformed = true;
        officialSourcesUsed = searchResult.officialSourcesUsed;
        logger.info("[HybridAI] Recherche web effectuée", {
          citationsCount: citations?.length,
          officialSourcesUsed
        });
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

      // 🆕 Calculer le score de confiance
      const confidence = calculateConfidence({
        searchPerformed,
        officialSourcesUsed,
        citationsCount: citations?.length || 0,
        fallbackUsed: response.fallbackUsed || false,
        hasCountryContext: Boolean(context?.country)
      });

      logger.info("[HybridAI] Confiance calculée", {
        level: confidence.level,
        score: confidence.score,
        reasons: confidence.reasons
      });

      return {
        response: response.content,
        model: response.model,
        provider: response.provider,
        citations,
        searchPerformed,
        llmUsed,
        fallbackUsed: response.fallbackUsed || false,
        confidence  // 🆕 Ajout du score de confiance
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
  ): Promise<{ content: string; citations?: string[]; officialSourcesUsed: boolean }> {
    // Construire une requête de recherche ciblée par pays (INTERNATIONAL)
    const searchParts: string[] = [];

    // 1. La question originale
    searchParts.push(query);

    // 2. Contexte pays OBLIGATOIRE et PRÉCIS
    if (context?.country) {
      searchParts.push(`in ${context.country}`);
      searchParts.push(`${context.country} official government laws regulations 2024 2025`);
    }

    // 3. Nationalité si différente du pays
    if (context?.nationality && context.nationality !== context.country) {
      searchParts.push(`${context.nationality} citizen nationals`);
    }

    // 4. Catégorie si disponible
    if (context?.category) {
      searchParts.push(context.category);
    }

    // 5. Contexte expatrié/voyageur (termes internationaux)
    searchParts.push("official government site requirements foreigners");

    const enrichedQuery = searchParts.join(" ");

    logger.info("[HybridAI] Recherche internationale", {
      country: context?.country || "non spécifié",
      nationality: context?.nationality || "non spécifiée"
    });

    // Prompt de recherche INTERNATIONAL pour Perplexity
    const searchSystemPrompt = `You are an expert researcher for international expatriates and travelers.

MISSION: Find PRECISE and CURRENT information for this context:
${context?.country ? `- TARGET COUNTRY: ${context.country} (MANDATORY - ALL information MUST be about THIS specific country)` : ""}
${context?.nationality ? `- CLIENT NATIONALITY: ${context.nationality}` : ""}
${context?.category ? `- DOMAIN: ${context.category}` : ""}

🔴 PRIORITY SOURCES (MANDATORY):
- Official government websites of the target country (.gov, .gouv, .gob, .go, .govt, etc.)
- Official immigration and visa portals
- Embassy and consulate websites
- International organizations (UN, ILO, WHO, etc.) when relevant
- ⚠️ AVOID: blogs, forums, non-official commercial sites

CRITICAL RULES:
1. ONLY provide information from OFFICIAL SOURCES of ${context?.country || "the target country"}
2. CITE local laws with numbers and dates (format varies by country)
3. ALWAYS include the official source URL
4. Provide CURRENT fees and timelines (2024-2025)
5. If info comes from non-official source, MARK IT with ⚠️
6. NEVER give generic information that doesn't apply to the specific country
7. Consider bilateral agreements between ${context?.nationality || "client's country"} and ${context?.country || "target country"}`;

    const result = await withExponentialBackoff(
      () => this.perplexity.search({
        messages: [{ role: "user", content: enrichedQuery }],
        systemPrompt: searchSystemPrompt,
        returnCitations: true
        // PAS de domainFilter fixe - Perplexity cherche librement dans tous les pays
      }),
      { logContext: `[Perplexity Search] ${context?.country || "global"}` }
    );

    // 🆕 Vérifier si les citations incluent des sources officielles (INTERNATIONAL)
    const officialSourcesUsed = result.citations?.some(url => isOfficialSource(url)) ?? false;

    // Compter les sources officielles vs non-officielles
    const officialCount = result.citations?.filter(url => isOfficialSource(url)).length || 0;
    const totalCount = result.citations?.length || 0;

    logger.info("[HybridAI] Recherche internationale terminée", {
      country: context?.country,
      citationsCount: totalCount,
      officialSourcesCount: officialCount,
      officialSourcesUsed
    });

    return {
      content: result.content,
      citations: result.citations,
      officialSourcesUsed
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
