/**
 * =============================================================================
 * SOS EXPAT — Types et Interfaces IA V6.0
 * =============================================================================
 *
 * Tous les types centralisés pour le module IA.
 */

import type { Timestamp } from "firebase-admin/firestore";

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type ProviderType = "lawyer" | "expat";
export type LLMProvider = "claude" | "gpt" | "perplexity";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";

// =============================================================================
// PARAMÈTRES IA (Firestore)
// =============================================================================

export interface AISettings {
  enabled: boolean;
  replyOnBookingCreated: boolean;
  replyOnUserMessage: boolean;
  model: string;
  perplexityModel: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  lawyerSystemPrompt?: string;
  expertSystemPrompt?: string;
  usePerplexityForFactual: boolean;
  perplexityTemperature: number;
  useClaudeForLawyers: boolean;
}

// =============================================================================
// DONNÉES FIRESTORE
// =============================================================================

export interface BookingData {
  providerId?: string;
  aiProcessed?: boolean;
  aiProcessedAt?: Timestamp;  // Timestamp de la première réponse IA (pour calcul expiration)
  clientFirstName?: string;
  clientName?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  title?: string;
  description?: string;
  providerType?: ProviderType;
  providerSpecialties?: string[];
  clientLanguages?: string[];
  providerName?: string;
  urgency?: UrgencyLevel;
  category?: string;
}

export interface MessageData {
  role?: string;
  source?: string;
  content?: string;
  providerId?: string;
  processed?: boolean;
  processedAt?: Timestamp;
  model?: string;
  provider?: LLMProvider;
  citations?: string[];
  searchPerformed?: boolean;
  timestamp?: Timestamp;
}

export interface ConversationData {
  bookingId?: string;
  providerId?: string;
  providerType?: ProviderType;
  userId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;

  // Contexte persistant (jamais perdu même après 100+ messages)
  bookingContext?: {
    clientName?: string;
    country?: string;
    nationality?: string;
    title?: string;
    description?: string;
    category?: string;
    urgency?: UrgencyLevel;
    specialties?: string[];
  };

  // Résumé de conversation (pour conversations très longues)
  conversationSummary?: string;
  summaryUpdatedAt?: Timestamp;
  messageCount?: number;
}

// =============================================================================
// RÉPONSES API LLM
// =============================================================================

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// =============================================================================
// RÉPONSES SPÉCIFIQUES PAR PROVIDER
// =============================================================================

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface ClaudeResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

// =============================================================================
// RÉPONSE HYBRIDE (ORCHESTRATION)
// =============================================================================

// 🆕 Niveau de confiance de la réponse
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceInfo {
  level: ConfidenceLevel;
  score: number;  // 0-100
  reasons: string[];  // Explication du score
  officialSourcesUsed: boolean;
  disclaimer?: string;  // Avertissement à afficher
}

export interface HybridResponse {
  response: string;
  model: string;
  provider: LLMProvider;
  citations?: string[];
  searchPerformed?: boolean;
  fallbackUsed?: boolean;
  llmUsed?: "claude" | "gpt" | "claude+perplexity" | "gpt+perplexity";
  // 🆕 Informations de confiance
  confidence?: ConfidenceInfo;
}

// =============================================================================
// 🆕 THINKING LOGS (Affichage temps réel des recherches)
// =============================================================================

/**
 * Type d'étape de réflexion (affiché en temps réel au prestataire)
 */
export type ThinkingStep =
  | "analyzing_question"    // Analyse de la question
  | "searching_web"         // Recherche web en cours
  | "search_query"          // Requête de recherche envoyée
  | "search_results"        // Résultats trouvés
  | "analyzing_sources"     // Analyse des sources
  | "generating_response"   // Génération de la réponse
  | "finalizing";           // Finalisation

/**
 * Log de réflexion (stocké dans Firestore pour affichage temps réel)
 */
export interface ThinkingLog {
  step: ThinkingStep;
  message: string;           // Message à afficher (ex: "🔍 Recherche: visa travail France")
  details?: string;          // Détails supplémentaires optionnels
  timestamp: Date;
  order: number;             // Ordre d'affichage
}

/**
 * Callback pour envoyer les logs de réflexion
 */
export type ThinkingCallback = (log: ThinkingLog) => Promise<void>;

// =============================================================================
// CONTEXTE DE REQUÊTE
// =============================================================================

export type TripType = "expatriation" | "business" | "tourism" | "digital_nomad" | "student" | "retirement";

export interface AIRequestContext {
  providerType: ProviderType;

  // Informations client
  clientName?: string;
  nationality?: string;          // Nationalité du client (ex: "Japanese", "Brazilian")
  originCountry?: string;        // Pays d'origine/domicile (ex: "Japan", "Brazil")
  language?: string;             // Langue préférée du client (ex: "fr", "en", "pt")

  // Destination/Résidence
  country?: string;              // Pays de résidence actuel ou destination

  // Type de séjour
  tripType?: TripType;           // Type: expatriation, voyage d'affaires, tourisme, etc.

  // Contexte de la demande
  bookingTitle?: string;
  category?: string;
  urgency?: UrgencyLevel;
  specialties?: string[];

  // 🆕 Langue du prestataire (prioritaire pour les réponses IA)
  providerLanguage?: string;     // Langue préférée du prestataire qui paie l'abonnement (ex: "fr", "de", "en")
}
