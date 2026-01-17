/**
 * =============================================================================
 * SOS EXPAT — Module IA V6.0 HYBRIDE (PRODUCTION)
 * =============================================================================
 *
 * SYSTÈME HYBRIDE : Claude 3.5 Sonnet + GPT-4o + Perplexity
 * - Claude 3.5 Sonnet pour AVOCATS (raisonnement juridique)
 * - GPT-4o pour EXPERTS EXPATRIÉS (conseils pratiques)
 * - Perplexity pour recherche web (questions factuelles)
 * - Fallback intelligent entre LLMs
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// =============================================================================
// EXPORTS - All AI handlers
// =============================================================================

export { aiOnBookingCreated, aiOnProviderMessage, aiChat, aiChatStream } from "./handlers";
