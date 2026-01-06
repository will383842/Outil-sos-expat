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
  const config: HybridServiceConfig = {
    openaiApiKey: OPENAI_API_KEY.value().trim(),
    claudeApiKey: ANTHROPIC_API_KEY.value().trim(),
    perplexityApiKey: PERPLEXITY_API_KEY.value().trim(),
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

  parts.push(`Nouvelle consultation pour ${safeClientName}`);

  if (country) {
    parts.push(`Pays: ${country}`);
  }

  if (safeNationality) {
    parts.push(`Nationalité: ${safeNationality}`);
  }

  if (safeTitle) {
    parts.push(`Sujet: ${safeTitle}`);
  }

  if (safeDescription) {
    parts.push(`Description: ${safeDescription}`);
  }

  if (booking.urgency) {
    const urgencyLabels: Record<string, string> = {
      low: "Faible",
      medium: "Moyenne",
      high: "Haute",
      critical: "CRITIQUE",
    };
    parts.push(`Urgence: ${urgencyLabels[booking.urgency] || booking.urgency}`);
  }

  if (safeCategory) {
    parts.push(`Catégorie: ${safeCategory}`);
  }

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
