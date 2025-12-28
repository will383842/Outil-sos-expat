import { defineString, defineSecret } from "firebase-functions/params";

// MailWizz Configuration - Using Firebase Secret Manager
// SECURITY: API keys are stored in Firebase Secret Manager, not hardcoded
const MAILWIZZ_API_KEY_SECRET = defineSecret("MAILWIZZ_API_KEY");
const MAILWIZZ_WEBHOOK_SECRET = defineSecret("MAILWIZZ_WEBHOOK_SECRET");

/**
 * Get MailWizz API key from Firebase Secret Manager
 * Must be called within a Cloud Function context
 */
export function getMailWizzApiKey(): string {
  return MAILWIZZ_API_KEY_SECRET.value();
}

/**
 * Export the secret for use in runWith({ secrets: [...] })
 */
export { MAILWIZZ_API_KEY_SECRET, MAILWIZZ_WEBHOOK_SECRET };

// MailWizz Configuration Strings - Read from env first, then Firebase params
export const MAILWIZZ_API_URL = defineString("MAILWIZZ_API_URL", {
  default: process.env.MAILWIZZ_API_URL || "https://app.mail-ulixai.com/api/index.php",
});

export const MAILWIZZ_LIST_UID = defineString("MAILWIZZ_LIST_UID", {
  default: process.env.MAILWIZZ_LIST_UID || "yl089ehqpgb96",
});

export const MAILWIZZ_CUSTOMER_ID = defineString("MAILWIZZ_CUSTOMER_ID", {
  default: process.env.MAILWIZZ_CUSTOMER_ID || "2",
});

// // GA4 Configuration
export const GA4_MEASUREMENT_ID = defineString("GA4_MEASUREMENT_ID", {
  default: "",
});

// Supported Languages
export const SUPPORTED_LANGUAGES = [
  "fr",
  "en",
  "de",
  "es",
  "pt",
  "ru",
  "zh",
  "ar",
  "hi",
] as const;

export type SupportedLanguage =
  (typeof SUPPORTED_LANGUAGES)[number];

// Language to UPPERCASE mapping for template names
export function getLanguageCode(lang?: string): string {
  const normalized = (lang || "en").toLowerCase();
  const validLang = SUPPORTED_LANGUAGES.find(
    (l) => l === normalized
  ) || "en";
  return validLang.toUpperCase();
}

// Validate configuration
export function validateMailWizzConfig(): {
  apiUrl: string;
  apiKey: string;
  listUid: string;
  customerId: string;
} {
  // Using static values - no longer reading from environment or secrets
  const apiKey = getMailWizzApiKey();
  if (!apiKey) {
    throw new Error(
      "MAILWIZZ_API_KEY is not configured."
    );
  }

  // Get values from env first, then Firebase params
  const apiUrl = process.env.MAILWIZZ_API_URL ||""
  const listUid = process.env.MAILWIZZ_LIST_UID || ""
  const customerId = process.env.MAILWIZZ_CUSTOMER_ID || ""

  return {
    apiUrl,
    apiKey,
    listUid,
    customerId,
  };
}

/**
 * Get MailWizz webhook secret from Firebase Secret Manager
 * Must be called within a Cloud Function context
 */
export function getMailWizzWebhookSecret(): string {
  return MAILWIZZ_WEBHOOK_SECRET.value();
}

