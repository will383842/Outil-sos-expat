/**
 * =============================================================================
 * SOS EXPAT — Provider Perplexity
 * =============================================================================
 *
 * Provider pour Perplexity - utilisé pour la RECHERCHE WEB.
 * Fournit des informations factuelles avec citations.
 */

import { logger } from "firebase-functions";
import { AI_CONFIG } from "../core/config";
import type { LLMResponse, PerplexityResponse, LLMMessage } from "../core/types";
import { BaseLLMProvider, type ChatOptions, type SearchOptions, type SearchResponse } from "./base";

// =============================================================================
// PROVIDER PERPLEXITY
// =============================================================================

export class PerplexityProvider extends BaseLLMProvider {
  readonly name = "perplexity" as const;
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  async chat(options: ChatOptions): Promise<LLMResponse> {
    // Délègue à search avec les options par défaut
    return this.search(options);
  }

  /**
   * Recherche web avec Perplexity
   * Retourne des informations factuelles avec citations
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    this.validateOptions(options);

    if (!this.isAvailable()) {
      throw this.formatError(new Error("API key not configured"), "search");
    }

    const config = AI_CONFIG.PERPLEXITY;

    // Préparer les messages
    const messages = this.formatMessages(options.messages, options.systemPrompt);

    const requestBody: Record<string, unknown> = {
      model: config.MODEL,
      messages,
      temperature: options.temperature ?? config.TEMPERATURE,
      max_tokens: options.maxTokens || config.MAX_TOKENS,
      return_citations: options.returnCitations ?? true
    };

    // Filtres de domaine optionnels
    if (options.searchDomainFilter && options.searchDomainFilter.length > 0) {
      requestBody.search_domain_filter = options.searchDomainFilter;
    }

    logger.info("[Perplexity] Envoi requête recherche", {
      model: config.MODEL,
      messageCount: messages.length,
      hasDomainFilter: Boolean(options.searchDomainFilter)
    });

    try {
      const response = await this.makeRequest(requestBody);
      return this.parseResponse(response);
    } catch (error) {
      logger.error("[Perplexity] Erreur", { error });
      throw this.formatError(error, "search");
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
      if (msg.role === "system" && systemPrompt) continue;
      formatted.push({
        role: msg.role,
        content: msg.content
      });
    }

    return formatted;
  }

  private async makeRequest(body: object): Promise<PerplexityResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      AI_CONFIG.API_TIMEOUT_MS
    );

    try {
      const response = await fetch(AI_CONFIG.PERPLEXITY.API_URL, {
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

      return await response.json() as PerplexityResponse;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error(`Timeout après ${AI_CONFIG.API_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseResponse(response: PerplexityResponse): SearchResponse {
    const choice = response.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error("Réponse Perplexity vide ou invalide");
    }

    return {
      content: choice.message.content,
      model: AI_CONFIG.PERPLEXITY.MODEL,
      provider: "perplexity",
      citations: response.citations
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createPerplexityProvider(apiKey: string): PerplexityProvider {
  return new PerplexityProvider(apiKey);
}

// =============================================================================
// HELPER: DÉTECTION DE QUESTION FACTUELLE
// =============================================================================

export function isFactualQuestion(message: string): boolean {
  const lowerMsg = message.toLowerCase().trim();

  // EXCLUSIONS: Messages conversationnels purs (pas besoin de recherche web)
  const conversationalExclusions = [
    // Salutations et politesses
    /^(bonjour|bonsoir|salut|hello|hi|coucou)\s*[!.,]?\s*$/i,
    /^(merci|merci beaucoup|thanks|thank you)[!.,]?\s*$/i,
    /^(ok|okay|d'accord|dacord|compris|entendu|parfait|super|génial|excellent)[!.,]?\s*$/i,
    /^(au revoir|bye|à bientôt|à plus)[!.,]?\s*$/i,
    /^(oui|non|ouais|nope|nan)[!.,]?\s*$/i,
    // Confirmations courtes
    /^(c'est noté|bien noté|j'ai compris|je comprends)[!.,]?\s*$/i,
    /^(très bien|c'est parfait|c'est bon)[!.,]?\s*$/i,
    // Questions de suivi simples
    /^(et ensuite|et après|quoi d'autre)\s*\??\s*$/i,
    // Remerciements avec contexte
    /^merci pour (ces|les|ton|votre|ta) (informations?|réponse|aide|conseil)/i
  ];

  // Si c'est un message conversationnel, pas de recherche web
  for (const pattern of conversationalExclusions) {
    if (pattern.test(lowerMsg)) {
      return false;
    }
  }

  // Messages très courts (< 3 mots) = probablement conversationnel
  const wordCount = lowerMsg.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount < 3) {
    return false;
  }

  const factualKeywords = [
    // Urgences
    "urgence", "urgent", "danger", "vol", "arnaque",
    // Institutions
    "ambassade", "consulat", "tribunal", "police",
    // Juridique
    "loi", "légal", "illégal", "juridique", "droit", "avocat",
    // Immigration
    "visa", "permis de séjour", "permis de travail", "overstay", "immigration", "passeport",
    // Santé
    "médecin", "hôpital", "pharmacie", "médicament", "vaccin", "assurance santé",
    // Finance
    "banque", "compte bancaire", "virement", "change", "devise",
    // Logement
    "logement", "appartement", "loyer", "bail", "caution",
    // Travail
    "travail", "emploi", "contrat", "licenciement", "salaire",
    // Famille
    "mariage", "divorce", "garde", "succession", "héritage",
    // Transport
    "permis de conduire", "immatriculation",
    // Fiscal
    "impôt", "taxe", "fiscal",
    // Questions explicites de recherche
    "est-ce que", "peut-on", "faut-il", "doit-on", "puis-je",
    // Contexte pro
    "mon client"
  ];

  // Vérifier les mots-clés factuels
  for (const keyword of factualKeywords) {
    if (lowerMsg.includes(keyword)) return true;
  }

  // Détecte les VRAIES questions (pas juste "ok?")
  // Doit avoir au moins 5 mots pour être considéré comme question
  if (/\?\s*$/.test(lowerMsg) && wordCount >= 5) return true;

  // Messages longs = probablement une question détaillée
  if (wordCount > 15) return true;

  return false;
}
