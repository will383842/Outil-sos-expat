import { defineString } from "firebase-functions/params";
import {
  MAILWIZZ_API_KEY,
  MAILWIZZ_WEBHOOK_SECRET,
  GA4_API_SECRET,
} from "../lib/secrets";

// MailWizz Configuration - Using Firebase Secret Manager
// SECURITY: API keys are stored in Firebase Secret Manager, not hardcoded
// Alias for backward compatibility
const MAILWIZZ_API_KEY_SECRET = MAILWIZZ_API_KEY;

/**
 * Get MailWizz API key from Firebase Secret Manager
 * Must be called within a Cloud Function context
 */
export function getMailWizzApiKey(): string {
  return MAILWIZZ_API_KEY_SECRET.value();
}

/**
 * Export the secrets for use in runWith({ secrets: [...] })
 */
export { MAILWIZZ_API_KEY_SECRET, MAILWIZZ_WEBHOOK_SECRET, GA4_API_SECRET, MAILWIZZ_API_KEY };

/**
 * Get GA4 API Secret from Firebase Secret Manager
 * Must be called within a Cloud Function context
 */
export function getGA4ApiSecret(): string {
  return GA4_API_SECRET.value();
}

// MailWizz Configuration Strings - Read from env first, then Firebase params
export const MAILWIZZ_API_URL = defineString("MAILWIZZ_API_URL", {
  default: process.env.MAILWIZZ_API_URL || "https://mail.sos-expat.com/api/index.php",
});

export const MAILWIZZ_LIST_UID = defineString("MAILWIZZ_LIST_UID", {
  default: process.env.MAILWIZZ_LIST_UID || "yl089ehqpgb96",
});

export const MAILWIZZ_CUSTOMER_ID = defineString("MAILWIZZ_CUSTOMER_ID", {
  default: process.env.MAILWIZZ_CUSTOMER_ID || "1",
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
  // Get API key from Firebase Secret Manager
  const apiKey = getMailWizzApiKey();
  if (!apiKey) {
    throw new Error(
      "MAILWIZZ_API_KEY is not configured in Firebase Secret Manager."
    );
  }

  // Get values from env first, then Firebase params with proper defaults
  // SECURITY: Never use empty strings as fallback - always have sensible defaults
  const apiUrl = process.env.MAILWIZZ_API_URL || MAILWIZZ_API_URL.value() || "https://mail.sos-expat.com/api/index.php";
  const listUid = process.env.MAILWIZZ_LIST_UID || MAILWIZZ_LIST_UID.value() || "yl089ehqpgb96";
  const customerId = process.env.MAILWIZZ_CUSTOMER_ID || MAILWIZZ_CUSTOMER_ID.value() || "1";

  // Validate that we have actual values
  if (!apiUrl || !listUid || !customerId) {
    throw new Error(
      "MailWizz configuration incomplete. Check MAILWIZZ_API_URL, MAILWIZZ_LIST_UID, MAILWIZZ_CUSTOMER_ID."
    );
  }

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

