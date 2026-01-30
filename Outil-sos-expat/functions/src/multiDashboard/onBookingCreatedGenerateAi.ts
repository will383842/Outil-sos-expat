/**
 * =============================================================================
 * AUTO AI RESPONSE GENERATION - All Providers (Outil)
 * =============================================================================
 *
 * Firestore trigger that automatically generates an AI response when a
 * booking_request is created for ANY provider with valid AI access.
 *
 * AI access is granted via:
 * - forcedAIAccess flag on the booking (set by SOS during sync)
 * - Provider document with hasActiveSubscription = true
 * - Provider document with freeTrialUntil in the future
 *
 * NOTE: This trigger listens to booking_requests in outils-sos-expat.
 * For it to work, booking_requests must be synced from sos-urgently-ac307
 * OR this function should be moved to the SOS project.
 *
 * This is separate from the main aiOnBookingCreated trigger because:
 * 1. It listens to booking_requests (not bookings)
 * 2. It generates a "welcome" response, not a full analysis
 * 3. It stores the response directly in the booking_request document
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getSosFirestore, SOS_SERVICE_ACCOUNT } from "./sosFirestore";

// Initialize Firebase Admin for local project
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
// HELPER: Check if provider has valid AI access
// =============================================================================

interface AiAccessResult {
  hasAccess: boolean;
  reason: 'forced_access' | 'subscription_active' | 'free_trial' | 'no_access';
  note?: string;
}

async function checkProviderAiAccess(providerId: string): Promise<AiAccessResult> {
  // Use SOS Firestore to check provider access
  const db = getSosFirestore();
  const now = new Date();

  // Check provider document for AI access flags (synced from SOS)
  const providerDoc = await db.collection("providers").doc(providerId).get();

  if (providerDoc.exists) {
    const providerData = providerDoc.data()!;

    // Check forcedAIAccess (synced from SOS via ingestBooking)
    if (providerData.forcedAIAccess === true || providerData.forceAiAccess === true) {
      return {
        hasAccess: true,
        reason: 'forced_access',
        note: 'Accès IA accordé par administrateur'
      };
    }

    // Check hasActiveSubscription (synced from SOS)
    if (providerData.hasActiveSubscription === true) {
      return {
        hasAccess: true,
        reason: 'subscription_active',
        note: `Abonnement actif: ${providerData.subscriptionStatus || 'active'}`
      };
    }

    // Check freeTrialUntil
    if (providerData.freeTrialUntil) {
      const freeTrialUntil = providerData.freeTrialUntil.toDate
        ? providerData.freeTrialUntil.toDate()
        : new Date(providerData.freeTrialUntil);

      if (freeTrialUntil > now) {
        return {
          hasAccess: true,
          reason: 'free_trial',
          note: `Essai gratuit jusqu'au ${freeTrialUntil.toLocaleDateString('fr-FR')}`
        };
      }
    }
  }

  return { hasAccess: false, reason: 'no_access' };
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
    secrets: [ANTHROPIC_API_KEY, SOS_SERVICE_ACCOUNT],
    memory: "512MiB",
    timeoutSeconds: 60,
    maxInstances: 10,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("[AutoAI-Outil] No snapshot data");
      return;
    }

    const bookingId = event.params.bookingId;
    const booking = snap.data() as BookingRequestData;

    logger.info("[AutoAI-Outil] New booking_request detected", {
      bookingId,
      providerId: booking.providerId,
      clientName: booking.clientName || booking.clientFirstName,
    });

    // Skip if already processed
    if (booking.aiResponse || booking.aiProcessedAt) {
      logger.info("[AutoAI-Outil] Already processed, skipping", { bookingId });
      return;
    }

    // Check if provider has valid AI access
    const aiAccess = await checkProviderAiAccess(booking.providerId);

    if (!aiAccess.hasAccess) {
      logger.info("[AutoAI-Outil] Provider has no AI access, skipping", {
        bookingId,
        providerId: booking.providerId,
        reason: aiAccess.reason,
      });
      return;
    }

    logger.info("[AutoAI-Outil] Provider has AI access, generating automatic response", {
      bookingId,
      providerId: booking.providerId,
      accessReason: aiAccess.reason,
      accessNote: aiAccess.note,
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
          source: "auto_ai_welcome_outil",
          accessReason: aiAccess.reason,
        },
        aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("[AutoAI-Outil] AI response saved successfully", {
        bookingId,
        model: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
        responseLength: aiResult.text.length,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[AutoAI-Outil] Failed to generate AI response", {
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
