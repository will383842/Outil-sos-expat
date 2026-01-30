/**
 * Configuration Firebase pour le projet outils-sos-expat
 * Utilisé pour appeler les Cloud Functions IA depuis le frontend
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// Configuration du projet outils-sos-expat
// IMPORTANT: Toutes les clés doivent être définies dans .env
const outilFirebaseConfig = {
  apiKey: import.meta.env.VITE_OUTIL_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_OUTIL_FIREBASE_AUTH_DOMAIN || "outils-sos-expat.firebaseapp.com",
  projectId: import.meta.env.VITE_OUTIL_FIREBASE_PROJECT_ID || "outils-sos-expat",
  storageBucket: import.meta.env.VITE_OUTIL_FIREBASE_STORAGE_BUCKET || "outils-sos-expat.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_OUTIL_FIREBASE_MESSAGING_SENDER_ID || "694506867593",
  appId: import.meta.env.VITE_OUTIL_FIREBASE_APP_ID,
};

// Vérification que l'API key est configurée
if (!outilFirebaseConfig.apiKey) {
  console.warn("[OutilFirebase] VITE_OUTIL_FIREBASE_API_KEY non configurée dans .env");
}

// Initialiser l'app secondaire pour outils-sos-expat
let outilApp;
try {
  outilApp = getApps().find(app => app.name === 'outil') || initializeApp(outilFirebaseConfig, 'outil');
} catch {
  outilApp = getApp('outil');
}

// Functions pour outils-sos-expat
export const outilFunctions = getFunctions(outilApp, "europe-west1");

/**
 * Déclenche le système IA complet pour un booking_request
 * Crée un booking dans Outil qui déclenche aiOnBookingCreated
 * (GPT-4o + Perplexity pour recherche, Claude pour avocats)
 */
interface TriggerAiResult {
  success: boolean;
  bookingId?: string;
  message?: string;
  error?: string;
}

export async function triggerFullAiGeneration(bookingData: {
  bookingRequestId: string;
  clientId: string;
  providerId: string;
}): Promise<TriggerAiResult> {
  try {
    const triggerAi = httpsCallable<typeof bookingData, TriggerAiResult>(
      outilFunctions,
      "triggerAiFromBookingRequest"
    );

    const result = await triggerAi(bookingData);
    return result.data;
  } catch (error) {
    console.error("[OutilFirebase] Error triggering AI:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * @deprecated Utiliser triggerFullAiGeneration à la place
 * Ancienne fonction pour générer une réponse IA simple
 */
interface AiResponseResult {
  success: boolean;
  aiResponse?: string;
  model?: string;
  tokensUsed?: number;
  error?: string;
}

export async function generateAiResponseForBooking(bookingData: {
  bookingId: string;
  providerId: string;
  clientName: string;
  clientCurrentCountry?: string;
  clientLanguages?: string[];
  serviceType?: string;
  providerType?: "lawyer" | "expat";
  title?: string;
}): Promise<AiResponseResult> {
  try {
    // Redirect to the new full AI system
    const result = await triggerFullAiGeneration({
      bookingRequestId: bookingData.bookingId,
      clientId: "system", // Will be validated by checking booking_request exists
      providerId: bookingData.providerId,
    });

    if (result.success) {
      return {
        success: true,
        aiResponse: "Réponse IA en cours de génération...",
        model: "gpt-4o+perplexity",
      };
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    console.error("[OutilFirebase] Error calling AI function:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
