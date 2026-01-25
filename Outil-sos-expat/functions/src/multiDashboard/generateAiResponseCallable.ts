/**
 * =============================================================================
 * MULTI DASHBOARD - Generate AI Response (Callable)
 * =============================================================================
 *
 * Callable function that generates an AI response for a booking_request.
 * Called from the SOS frontend after creating a booking_request.
 *
 * This allows generating AI responses even though the booking_request
 * is stored in a different Firebase project (sos-urgently-ac307).
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// Initialize Firebase Admin
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// =============================================================================
// SECRETS
// =============================================================================

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// =============================================================================
// TYPES
// =============================================================================

interface GenerateAiRequest {
  bookingId: string;
  providerId: string;
  clientName: string;
  clientCurrentCountry?: string;
  clientLanguages?: string[];
  serviceType?: string;
  providerType?: "lawyer" | "expat";
  title?: string;
}

interface GenerateAiResponse {
  success: boolean;
  aiResponse?: string;
  model?: string;
  tokensUsed?: number;
  error?: string;
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
  // Query the SOS project's Firestore via Admin SDK
  // Note: This requires the outils-sos-expat service account to have access
  // to sos-urgently-ac307's Firestore

  // For now, we'll check the local providers collection
  const db = admin.firestore();

  // Check if this provider exists and is marked as multi
  const providerDoc = await db.collection("providers").doc(providerId).get();

  if (providerDoc.exists) {
    const data = providerDoc.data();
    // If provider has isMultiProviderLinked or similar flag
    return data?.isMultiProviderLinked === true;
  }

  // Fallback: Check if providerId follows multi-provider naming convention
  // Multi-provider IDs typically start with "aaa_"
  return providerId.startsWith("aaa_");
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
// CALLABLE FUNCTION
// =============================================================================

export const generateMultiDashboardAiResponse = onCall<
  GenerateAiRequest,
  Promise<GenerateAiResponse>
>(
  {
    region: "europe-west1",
    secrets: [ANTHROPIC_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
  },
  async (request) => {
    const { bookingId, providerId, clientName, clientCurrentCountry, clientLanguages, serviceType, providerType, title } = request.data;

    logger.info("[generateMultiDashboardAiResponse] Request received", {
      bookingId,
      providerId,
      clientName,
    });

    // Validate required fields
    if (!bookingId || !providerId || !clientName) {
      throw new HttpsError("invalid-argument", "Missing required fields: bookingId, providerId, clientName");
    }

    // Check if provider is multi-provider (optional check)
    const isMulti = await checkIfMultiProvider(providerId);
    logger.info("[generateMultiDashboardAiResponse] Multi-provider check", {
      providerId,
      isMulti,
    });

    try {
      // Generate AI response
      const aiResult = await generateWelcomeResponse({
        clientName,
        clientCountry: clientCurrentCountry,
        serviceType,
        clientLanguages,
        providerType,
        title,
      });

      logger.info("[generateMultiDashboardAiResponse] AI response generated", {
        bookingId,
        model: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
        responseLength: aiResult.text.length,
      });

      return {
        success: true,
        aiResponse: aiResult.text,
        model: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[generateMultiDashboardAiResponse] Failed to generate AI response", {
        bookingId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);
