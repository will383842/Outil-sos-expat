/**
 * Configuration Firebase pour le projet outils-sos-expat
 * Utilisé pour appeler les Cloud Functions IA depuis le frontend
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

// Configuration du projet outils-sos-expat
const outilFirebaseConfig = {
  apiKey: import.meta.env.VITE_OUTIL_FIREBASE_API_KEY || "AIzaSyAkZuQoE3zyYLKBKqPGgJaGYH7deCLMa7E",
  authDomain: "outils-sos-expat.firebaseapp.com",
  projectId: "outils-sos-expat",
  storageBucket: "outils-sos-expat.firebasestorage.app",
  messagingSenderId: "694506867593",
  appId: "1:694506867593:web:abc123def456", // Placeholder - sera remplacé si nécessaire
};

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
 * Appelle la fonction IA pour générer une réponse automatique
 * pour un booking_request multi-prestataire
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
    const generateAi = httpsCallable<typeof bookingData, AiResponseResult>(
      outilFunctions,
      "generateMultiDashboardAiResponse"
    );

    const result = await generateAi(bookingData);
    return result.data;
  } catch (error) {
    console.error("[OutilFirebase] Error calling AI function:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
