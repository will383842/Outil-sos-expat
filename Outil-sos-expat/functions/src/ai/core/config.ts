/**
 * =============================================================================
 * SOS EXPAT — Configuration IA V6.0
 * =============================================================================
 *
 * Configuration centralisée pour tous les providers LLM.
 * Modification ici = impact sur tous les providers.
 */

export const AI_CONFIG = {
  // Timeouts et retries - P0 FIX: Timeouts augmentés pour éviter les 10min bloqués
  API_TIMEOUT_MS: 25000,  // 25s (augmenté de 12s) pour recherches juridiques complexes
  MAX_RETRIES: 2,         // Réduit de 3 à 2 pour éviter les délais cumulés
  INITIAL_RETRY_DELAY_MS: 500,  // Réduit de 1000ms à 500ms

  // Exponential backoff strategy - P0 FIX: Délais réduits
  RETRY_BACKOFF_MULTIPLIER: 1.5,  // Réduit de 2 à 1.5 (moins d'attente entre retries)
  RETRY_MAX_DELAY_MS: 8000,       // Réduit de 16s à 8s max
  RETRY_JITTER: true,             // Ajoute du random pour éviter thundering herd

  // Codes HTTP retryables
  RETRYABLE_STATUS_CODES: [408, 429, 500, 502, 503, 504] as const,

  // Limites conversation (conversations de 30+ minutes)
  MAX_HISTORY_MESSAGES: 100,  // 100 messages récents pour conversations longues
  ALWAYS_KEEP_FIRST_MESSAGES: 3,  // Toujours garder les 3 premiers messages (contexte booking)
  SUMMARY_THRESHOLD: 80,  // Créer un résumé après 80 messages

  // Quota par défaut (appels IA par mois par provider)
  DEFAULT_QUOTA_LIMIT: 100,

  // OpenAI / GPT-4o (pour experts expatriés)
  OPENAI: {
    MODEL: "gpt-4o",
    TEMPERATURE: 0.3,
    MAX_TOKENS: 4000,  // Augmenté de 3000 à 4000 pour réponses complètes
    API_URL: "https://api.openai.com/v1/chat/completions"
  },

  // Anthropic / Claude (pour avocats)
  // Version stable recommandée pour production
  CLAUDE: {
    MODEL: "claude-3-5-sonnet-20241022",
    TEMPERATURE: 0.25,
    MAX_TOKENS: 4000,
    API_URL: "https://api.anthropic.com/v1/messages",
    API_VERSION: "2023-06-01"
  },

  // Perplexity (pour recherche web)
  PERPLEXITY: {
    MODEL: "sonar-pro",
    TEMPERATURE: 0.2,
    MAX_TOKENS: 2500,
    API_URL: "https://api.perplexity.ai/chat/completions"
  }
} as const;

// Types dérivés de la configuration
export type OpenAIConfig = typeof AI_CONFIG.OPENAI;
export type ClaudeConfig = typeof AI_CONFIG.CLAUDE;
export type PerplexityConfig = typeof AI_CONFIG.PERPLEXITY;
