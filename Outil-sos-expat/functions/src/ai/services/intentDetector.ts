/**
 * =============================================================================
 * SOS EXPAT — Détecteur d'intention pour adapter la longueur des réponses IA
 * =============================================================================
 *
 * Analyse le message du prestataire pour déterminer le type de réponse attendue.
 * Injecte une instruction de longueur dans le prompt avant l'appel LLM.
 */

import type { LLMMessage } from "../core/types";

// =============================================================================
// TYPES
// =============================================================================

export type MessageIntent =
  | "confirmation"       // "Ok merci" / "D'accord" / "Compris"
  | "contact_request"    // "Donnez-moi le numéro du consulat"
  | "follow_up"          // "Et pour les délais ?" / "What about costs?"
  | "factual_short"      // Question courte factuelle < 10 mots
  | "legal_analysis"     // Analyse juridique complexe
  | "complex_analysis";  // Cas multi-aspects nécessitant plusieurs sections

// =============================================================================
// PATTERNS
// =============================================================================

const CONFIRMATION_PATTERNS = /^(ok|merci|d'accord|super|parfait|compris|bien|thanks|thank you|got it|understood|great|oui|yes|no|non|entendu|reçu|noté|c'est noté)/i;

const CONTACT_PATTERNS = /\b(numéro|téléphone|adresse|contact|email|e-mail|site web|website|horaires|phone|number|address|hours|coordonnées|joindre|appeler|contacter)\b/i;

const FOLLOW_UP_PATTERNS = /^(et |aussi |qu'en est-il|concernant |pour |à propos|what about |and |also |regarding |how about |qu'est-ce que|pour ce qui est|en ce qui concerne|côté |niveau )/i;

const LEGAL_ANALYSIS_PATTERNS = /\b(compétent|compétence|applicable|convention|bilatéral|conflit de lois|jurisprudence|tribunal|juridiction|recours|prescription|article|alinéa|décret|règlement|directive|jurisdiction|statute|ruling|precedent)\b/i;

// =============================================================================
// DÉTECTION D'INTENTION
// =============================================================================

export function detectIntent(
  message: string,
  previousMessages: LLMMessage[]
): MessageIntent {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const wordCount = lower.split(/\s+/).length;

  // 1. Confirmations → réponse minimale
  if (wordCount <= 5 && CONFIRMATION_PATTERNS.test(lower)) {
    return "confirmation";
  }

  // 2. Demande de contact explicite
  if (CONTACT_PATTERNS.test(lower) && wordCount <= 15) {
    return "contact_request";
  }

  // 3. Question de suivi (référence au contexte précédent)
  if (FOLLOW_UP_PATTERNS.test(lower) && previousMessages.length >= 2) {
    return "follow_up";
  }

  // 4. Analyse juridique complexe
  if (LEGAL_ANALYSIS_PATTERNS.test(lower) && wordCount > 8) {
    return "legal_analysis";
  }

  // 5. Question courte factuelle
  if (wordCount <= 12 && /\?$/.test(trimmed)) {
    return "factual_short";
  }

  // 6. Par défaut : complexe si long, factuel si court
  return wordCount > 25 ? "complex_analysis" : "factual_short";
}

// =============================================================================
// INJECTION D'INSTRUCTION DE LONGUEUR
// =============================================================================

/**
 * Retourne une instruction à injecter comme message système juste avant
 * le dernier message user, pour guider la longueur de la réponse.
 * Retourne null si aucune contrainte spéciale n'est nécessaire.
 */
export function getIntentGuidance(intent: MessageIntent): string | null {
  switch (intent) {
    case "confirmation":
      return "[INSTRUCTION: Le prestataire confirme ou remercie. Réponse très courte (1-2 lignes max). Pas de nouveau contenu sauf si une question est implicite.]";

    case "contact_request":
      return "[INSTRUCTION: Le prestataire demande un contact/numéro/adresse. Donne UNIQUEMENT les coordonnées demandées (nom + téléphone + site web). Pas d'analyse, pas de sections.]";

    case "follow_up":
      return "[INSTRUCTION: Question de suivi. Réponds UNIQUEMENT à ce qui est demandé. Ne répète RIEN de tes réponses précédentes. Pas de réintroduction du contexte.]";

    case "factual_short":
      return "[INSTRUCTION: Question factuelle courte. Réponse en 3-8 lignes max avec la source si juridique. Pas de sections sauf si vraiment nécessaire.]";

    case "legal_analysis":
      // Pas de contrainte de longueur — laisser l'IA développer
      return null;

    case "complex_analysis":
      // Pas de contrainte de longueur — laisser l'IA développer
      return null;
  }
}
