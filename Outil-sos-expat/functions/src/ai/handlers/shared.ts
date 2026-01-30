/**
 * =============================================================================
 * AI HANDLERS - Shared utilities
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import type { BookingData } from "../core/types";
import { createHybridService, type HybridServiceConfig } from "../services/hybrid";
import { sanitizeUserInput } from "../services/utils";

// =============================================================================
// SECRETS (shared across all handlers)
// =============================================================================

export const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
export const PERPLEXITY_API_KEY = defineSecret("PERPLEXITY_API_KEY");
export const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// All secrets for handler configuration
export const AI_SECRETS = [OPENAI_API_KEY, PERPLEXITY_API_KEY, ANTHROPIC_API_KEY];

// =============================================================================
// SERVICE FACTORY
// =============================================================================

/**
 * Creates a configured hybrid AI service
 */
export function createService(): ReturnType<typeof createHybridService> {
  // P0 FIX: Add .trim() to remove trailing CRLF from GCP Secret Manager values
  const openaiKey = OPENAI_API_KEY.value().trim();
  const claudeKey = ANTHROPIC_API_KEY.value().trim();
  const perplexityKey = PERPLEXITY_API_KEY.value().trim();

  // DEBUG: Log API key loading info
  console.log("[createService] DEBUG: Chargement des clés API", {
    openai: {
      rawLength: OPENAI_API_KEY.value().length,
      trimmedLength: openaiKey.length,
      prefix: openaiKey.substring(0, 10),
      valid: openaiKey.startsWith("sk-"),
    },
    claude: {
      rawLength: ANTHROPIC_API_KEY.value().length,
      trimmedLength: claudeKey.length,
      prefix: claudeKey.substring(0, 15),
      valid: claudeKey.startsWith("sk-ant-"),
    },
    perplexity: {
      rawLength: PERPLEXITY_API_KEY.value().length,
      trimmedLength: perplexityKey.length,
      prefix: perplexityKey.substring(0, 10),
      valid: perplexityKey.startsWith("pplx-"),
    },
  });

  const config: HybridServiceConfig = {
    openaiApiKey: openaiKey,
    claudeApiKey: claudeKey,
    perplexityApiKey: perplexityKey,
    useClaudeForLawyers: true,
    usePerplexityForFactual: true,
  };
  return createHybridService(config);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Builds the initial message from booking data
 * NOTE: This message is designed to trigger Perplexity web search for legal/factual questions
 */
export function buildBookingMessage(
  booking: BookingData,
  clientName: string,
  country: string
): string {
  const parts: string[] = [];

  // Sanitize all user inputs to prevent prompt injection
  const safeClientName = sanitizeUserInput(clientName);
  const safeTitle = sanitizeUserInput(booking.title || "");
  const safeDescription = sanitizeUserInput(booking.description || "");
  const safeNationality = sanitizeUserInput(booking.clientNationality || "");
  const safeCategory = sanitizeUserInput(booking.category || "");
  const safeSpecialties = booking.providerSpecialties?.map(s => sanitizeUserInput(s)).join(", ") || "";

  // Header with factual keywords to trigger Perplexity search
  parts.push(`Nouvelle consultation juridique pour ${safeClientName}`);

  if (country) {
    parts.push(`Pays concerné: ${country}`);
  }

  if (safeNationality) {
    parts.push(`Nationalité du client: ${safeNationality}`);
  }

  if (safeTitle) {
    parts.push(`Sujet de la demande: ${safeTitle}`);
  }

  if (safeDescription) {
    parts.push(`Description détaillée: ${safeDescription}`);
  }

  if (booking.urgency) {
    const urgencyLabels: Record<string, string> = {
      low: "Faible",
      medium: "Moyenne",
      high: "Haute",
      critical: "CRITIQUE",
    };
    parts.push(`Niveau d'urgence: ${urgencyLabels[booking.urgency] || booking.urgency}`);
  }

  if (safeCategory) {
    parts.push(`Catégorie: ${safeCategory}`);
  }

  // Add provider specialties to enrich context
  if (safeSpecialties) {
    parts.push(`Domaines d'expertise du prestataire: ${safeSpecialties}`);
  }

  // Add explicit request for legal research to ensure Perplexity is triggered
  parts.push("");
  parts.push("Merci de fournir une analyse juridique complète avec les textes de loi applicables, les procédures officielles et les contacts utiles (ambassade, consulat, administrations).");

  return parts.join("\n");
}

/**
 * Creates a notification for the provider
 */
export async function notifyProvider(
  db: admin.firestore.Firestore,
  type: "quota_exceeded" | "ai_error",
  providerId: string,
  message: string,
  context: { bookingId?: string; conversationId?: string }
): Promise<void> {
  try {
    await db.collection("notifications").add({
      type,
      providerId,
      ...context,
      message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Silent fail - notifications should not block main flow
    console.warn("[AI] Failed to notify provider", { error });
  }
}
