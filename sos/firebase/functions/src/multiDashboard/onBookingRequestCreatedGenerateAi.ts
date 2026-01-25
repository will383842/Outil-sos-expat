/**
 * =============================================================================
 * MULTI DASHBOARD - Auto AI Response Generation
 * =============================================================================
 *
 * Firestore trigger that automatically generates an AI response when a
 * booking_request is created for a multi-provider account.
 *
 * This trigger is deployed on sos-urgently-ac307 (where booking_requests are created)
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// =============================================================================
// SECRETS
// =============================================================================

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// =============================================================================
// TYPES
// =============================================================================

interface BookingRequestData {
  providerId: string;
  providerName?: string;
  providerType?: "lawyer" | "expat";
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];
  serviceType?: string;
  title?: string;
  description?: string;
  status?: string;
  aiResponse?: object;
  aiProcessedAt?: admin.firestore.Timestamp;
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// =============================================================================
// HELPER: Check if provider belongs to a multi-provider account
// =============================================================================

async function checkIfMultiProvider(providerId: string): Promise<boolean> {
  const db = admin.firestore();

  // Query users collection for accounts that have this providerId in linkedProviderIds
  // AND are marked as multi-provider
  const usersQuery = await db
    .collection("users")
    .where("linkedProviderIds", "array-contains", providerId)
    .where("isMultiProvider", "==", true)
    .limit(1)
    .get();

  return !usersQuery.empty;
}

// =============================================================================
// HELPER: Generate AI Welcome Response
// =============================================================================

async function generateWelcomeResponse(context: {
  clientName: string;
  clientCountry?: string;
  serviceType?: string;
  clientLanguages?: string[];
  providerType?: "lawyer" | "expat";
  title?: string;
}): Promise<{ text: string; tokensUsed: number; model: string }> {
  const apiKey = ANTHROPIC_API_KEY.value().trim();

  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    throw new Error("Invalid or missing Anthropic API key");
  }

  // Determine response language based on client languages
  const primaryLanguage = context.clientLanguages?.[0] || "fr";
  const languageInstruction = primaryLanguage.startsWith("en")
    ? "Respond in English."
    : primaryLanguage.startsWith("es")
      ? "Respond in Spanish."
      : primaryLanguage.startsWith("de")
        ? "Respond in German."
        : "Respond in French.";

  const providerRole = context.providerType === "lawyer"
    ? "un avocat spécialisé"
    : "un aidant expatrié expérimenté";

  const prompt = `Tu es un assistant pour SOS-Expat, une plateforme qui met en relation des expatriés avec des avocats et aidants.

Un nouveau client vient de faire une demande de service. Génère une première réponse professionnelle et chaleureuse.

Contexte:
- Nom client: ${context.clientName}
- Pays actuel: ${context.clientCountry || "Non spécifié"}
- Type de service: ${context.serviceType || "Consultation"}
- Type de prestataire: ${providerRole}
${context.title ? `- Sujet: ${context.title}` : ""}

Instructions:
1. Salue le client par son nom
2. Confirme la réception de sa demande
3. Explique brièvement les prochaines étapes
4. Rassure sur la confidentialité
5. ${languageInstruction}

Format: Réponse directe, professionnelle, 3-4 phrases maximum. Pas de formatage markdown.`;

  const messages: ClaudeMessage[] = [
    { role: "user", content: prompt }
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      temperature: 0.7,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as ClaudeResponse;
  const textContent = data.content.find(c => c.type === "text");

  if (!textContent?.text) {
    throw new Error("Empty response from Claude");
  }

  return {
    text: textContent.text,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    model: data.model,
  };
}

// =============================================================================
// FIRESTORE TRIGGER
// =============================================================================

export const onBookingRequestCreatedGenerateAi = onDocumentCreated(
  {
    document: "booking_requests/{bookingId}",
    region: "europe-west1",
    secrets: [ANTHROPIC_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("[MultiDashboard-SOS] No snapshot data");
      return;
    }

    const bookingId = event.params.bookingId;
    const booking = snap.data() as BookingRequestData;

    logger.info("[MultiDashboard-SOS] New booking_request detected", {
      bookingId,
      providerId: booking.providerId,
      clientName: booking.clientName || booking.clientFirstName,
    });

    // Skip if already processed
    if (booking.aiResponse || booking.aiProcessedAt) {
      logger.info("[MultiDashboard-SOS] Already processed, skipping", { bookingId });
      return;
    }

    // Check if provider belongs to a multi-provider account
    const isMulti = await checkIfMultiProvider(booking.providerId);

    if (!isMulti) {
      logger.info("[MultiDashboard-SOS] Not a multi-provider, skipping", {
        bookingId,
        providerId: booking.providerId,
      });
      return;
    }

    logger.info("[MultiDashboard-SOS] Multi-provider detected, generating AI response", {
      bookingId,
      providerId: booking.providerId,
    });

    try {
      // Build client name
      const clientName = booking.clientName
        || `${booking.clientFirstName || ""} ${booking.clientLastName || ""}`.trim()
        || "Client";

      // Generate AI response
      const aiResult = await generateWelcomeResponse({
        clientName,
        clientCountry: booking.clientCurrentCountry,
        serviceType: booking.serviceType,
        clientLanguages: booking.clientLanguages,
        providerType: booking.providerType,
        title: booking.title,
      });

      // Save response to booking_request
      await snap.ref.update({
        aiResponse: {
          content: aiResult.text,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          model: aiResult.model,
          tokensUsed: aiResult.tokensUsed,
          source: "multi_dashboard_auto",
        },
        aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("[MultiDashboard-SOS] AI response saved successfully", {
        bookingId,
        model: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
        responseLength: aiResult.text.length,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[MultiDashboard-SOS] Failed to generate AI response", {
        bookingId,
        error: errorMessage,
      });

      // Mark as failed but don't block the booking
      await snap.ref.update({
        aiError: errorMessage,
        aiErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
