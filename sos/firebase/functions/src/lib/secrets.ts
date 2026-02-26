/**
 * CENTRALIZED SECRETS DEFINITIONS
 *
 * P0 CRITICAL FIX: This file is the SINGLE SOURCE OF TRUTH for all Firebase secrets.
 *
 * NEVER call defineSecret() in any other file!
 * Always import from this file instead.
 *
 * Why this matters:
 * - Firebase v2 defineSecret() creates a parameter binding
 * - Calling defineSecret() multiple times for the same secret in different files
 *   can cause inconsistent binding and credential loading failures
 * - This is the ROOT CAUSE of intermittent Twilio Error 20003 (401 Unauthorized)
 *
 * Usage:
 * 1. Import the secrets you need: import { TWILIO_SECRETS, STRIPE_SECRETS } from './lib/secrets';
 * 2. Add to function config: secrets: [...TWILIO_SECRETS]
 * 3. Use getters to access values: getTwilioAccountSid()
 */

import { defineSecret, defineString } from "firebase-functions/params";

// ============================================================================
// TWILIO SECRETS
// ============================================================================

export const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
export const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
export const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

/** All Twilio secrets for function config */
export const TWILIO_SECRETS = [
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
];

// ============================================================================
// STRIPE SECRETS
// ============================================================================

export const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");
export const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
export const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY"); // Legacy fallback

export const STRIPE_WEBHOOK_SECRET_LIVE = defineSecret("STRIPE_WEBHOOK_SECRET_LIVE");
export const STRIPE_WEBHOOK_SECRET_TEST = defineSecret("STRIPE_WEBHOOK_SECRET_TEST");
export const STRIPE_CONNECT_WEBHOOK_SECRET_LIVE = defineSecret("STRIPE_CONNECT_WEBHOOK_SECRET_LIVE");
export const STRIPE_CONNECT_WEBHOOK_SECRET_TEST = defineSecret("STRIPE_CONNECT_WEBHOOK_SECRET_TEST");

export const STRIPE_MODE = defineString("STRIPE_MODE", { default: "test" });

/** All Stripe secrets for function config */
export const STRIPE_SECRETS = [
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
];

/** Only API keys (no webhooks) */
export const STRIPE_API_SECRETS = [
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
];

// ============================================================================
// EMAIL SECRETS
// ============================================================================

export const EMAIL_USER = defineSecret("EMAIL_USER");
export const EMAIL_PASS = defineSecret("EMAIL_PASS");

export const EMAIL_SECRETS = [EMAIL_USER, EMAIL_PASS];

// ============================================================================
// ENCRYPTION SECRETS (GDPR)
// ============================================================================

export const ENCRYPTION_KEY = defineSecret("ENCRYPTION_KEY");

// ============================================================================
// CLOUD TASKS AUTH
// ============================================================================

export const TASKS_AUTH_SECRET = defineSecret("TASKS_AUTH_SECRET");

// ============================================================================
// PAYPAL SECRETS
// ============================================================================

export const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
export const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
export const PAYPAL_WEBHOOK_ID = defineSecret("PAYPAL_WEBHOOK_ID");
export const PAYPAL_PARTNER_ID = defineSecret("PAYPAL_PARTNER_ID");
export const PAYPAL_PLATFORM_MERCHANT_ID = defineSecret("PAYPAL_PLATFORM_MERCHANT_ID");
export const PAYPAL_MODE = defineString("PAYPAL_MODE", { default: "live" });

/** All PayPal secrets for function config */
export const PAYPAL_SECRETS = [
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID,
  PAYPAL_PARTNER_ID,
  PAYPAL_PLATFORM_MERCHANT_ID,
];

/** Only API keys (no webhooks) */
export const PAYPAL_API_SECRETS = [
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
];

// ============================================================================
// WISE SECRETS (Affiliate Payouts)
// ============================================================================

export const WISE_API_TOKEN = defineSecret("WISE_API_TOKEN");
export const WISE_PROFILE_ID = defineSecret("WISE_PROFILE_ID");
export const WISE_WEBHOOK_SECRET = defineSecret("WISE_WEBHOOK_SECRET");
export const WISE_MODE = defineString("WISE_MODE", { default: "sandbox" });

/** All Wise secrets for function config */
export const WISE_SECRETS = [
  WISE_API_TOKEN,
  WISE_PROFILE_ID,
  WISE_WEBHOOK_SECRET,
];

// ============================================================================
// FLUTTERWAVE SECRETS (Mobile Money Africa)
// ============================================================================

export const FLUTTERWAVE_SECRET_KEY = defineSecret("FLUTTERWAVE_SECRET_KEY");
export const FLUTTERWAVE_PUBLIC_KEY = defineSecret("FLUTTERWAVE_PUBLIC_KEY");
export const FLUTTERWAVE_WEBHOOK_SECRET = defineSecret("FLUTTERWAVE_WEBHOOK_SECRET");
export const FLUTTERWAVE_MODE = defineString("FLUTTERWAVE_MODE", { default: "sandbox" });

/** All Flutterwave secrets for function config */
export const FLUTTERWAVE_SECRETS = [
  FLUTTERWAVE_SECRET_KEY,
  FLUTTERWAVE_PUBLIC_KEY,
  FLUTTERWAVE_WEBHOOK_SECRET,
];

// ============================================================================
// META CONVERSIONS API
// ============================================================================

export const META_CAPI_TOKEN = defineSecret("META_CAPI_TOKEN");

/** Meta CAPI secrets for function config */
export const META_CAPI_SECRETS = [META_CAPI_TOKEN];

// ============================================================================
// OPENAI
// ============================================================================

export const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

/** OpenAI secrets for function config */
export const OPENAI_SECRETS = [OPENAI_API_KEY];

// ============================================================================
// EXTERNAL API KEYS
// ============================================================================

export const OUTIL_API_KEY = defineSecret("OUTIL_API_KEY");
export const OUTIL_SYNC_API_KEY = defineSecret("OUTIL_SYNC_API_KEY");
export const OUTIL_INGEST_ENDPOINT = defineString("OUTIL_INGEST_ENDPOINT", {
  default: "https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking",
  description: "URL of the Outil-sos-expat ingestBooking endpoint",
});

// ============================================================================
// BACKLINK ENGINE
// ============================================================================

export const BACKLINK_ENGINE_WEBHOOK_SECRET = defineSecret("BACKLINK_ENGINE_WEBHOOK_SECRET");

/** Backlink Engine secrets for function config */
export const BACKLINK_ENGINE_SECRETS = [BACKLINK_ENGINE_WEBHOOK_SECRET];

// ============================================================================
// OUTIL SERVICE ACCOUNT (SSO for Outil IA)
// ============================================================================

export const OUTIL_SERVICE_ACCOUNT_KEY = defineSecret("OUTIL_SERVICE_ACCOUNT_KEY");

// ============================================================================
// SENTRY
// ============================================================================

export const SENTRY_DSN = defineSecret("SENTRY_DSN");

// ============================================================================
// EMAIL MARKETING (MailWizz + GA4)
// ============================================================================

export const MAILWIZZ_API_KEY = defineSecret("MAILWIZZ_API_KEY");
export const MAILWIZZ_WEBHOOK_SECRET = defineSecret("MAILWIZZ_WEBHOOK_SECRET");
export const GA4_API_SECRET = defineSecret("GA4_API_SECRET");

/** All Email Marketing secrets for function config */
export const EMAIL_MARKETING_SECRETS = [MAILWIZZ_API_KEY, MAILWIZZ_WEBHOOK_SECRET, GA4_API_SECRET];

// ============================================================================
// GOOGLE ADS CONVERSIONS API
// ============================================================================

export const GOOGLE_ADS_CUSTOMER_ID = defineSecret("GOOGLE_ADS_CUSTOMER_ID");
export const GOOGLE_ADS_PURCHASE_CONVERSION_ID = defineSecret("GOOGLE_ADS_PURCHASE_CONVERSION_ID");
export const GOOGLE_ADS_LEAD_CONVERSION_ID = defineSecret("GOOGLE_ADS_LEAD_CONVERSION_ID");
export const GOOGLE_ADS_DEVELOPER_TOKEN = defineSecret("GOOGLE_ADS_DEVELOPER_TOKEN");
export const GOOGLE_ADS_REFRESH_TOKEN = defineSecret("GOOGLE_ADS_REFRESH_TOKEN");
export const GOOGLE_ADS_CLIENT_ID = defineSecret("GOOGLE_ADS_CLIENT_ID");
export const GOOGLE_ADS_CLIENT_SECRET = defineSecret("GOOGLE_ADS_CLIENT_SECRET");

/** All Google Ads secrets for function config */
export const GOOGLE_ADS_SECRETS = [
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_PURCHASE_CONVERSION_ID,
  GOOGLE_ADS_LEAD_CONVERSION_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
];

// ============================================================================
// SYNC API KEY (Outil -> SOS synchronization)
// ============================================================================

export const SOS_SYNC_API_KEY = defineSecret("SOS_SYNC_API_KEY");

// ============================================================================
// MULTI DASHBOARD
// ============================================================================

export const MULTI_DASHBOARD_PASSWORD = defineSecret("MULTI_DASHBOARD_PASSWORD");

// ============================================================================
// SEO / CACHE INVALIDATION
// ============================================================================

export const CACHE_INVALIDATION_KEY = defineSecret("CACHE_INVALIDATION_KEY");

// ============================================================================
// TELEGRAM SECRETS
// ============================================================================

export const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
export const TELEGRAM_WEBHOOK_SECRET = defineSecret("TELEGRAM_WEBHOOK_SECRET");

/** All Telegram secrets for function config */
export const TELEGRAM_SECRETS = [TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET];

// ============================================================================
// GETTERS WITH FALLBACK TO process.env (for emulator/local dev)
// ============================================================================

/**
 * Check if running in Firebase emulator
 */
export function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === 'true' ||
         process.env.FIREBASE_EMULATOR === 'true' ||
         process.env.FIRESTORE_EMULATOR_HOST !== undefined;
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  const productionProjectIds = ['sos-expat', 'sos-urgently-ac307'];
  const gcpProject = process.env.GCLOUD_PROJECT || '';
  const isGcpProduction = productionProjectIds.some(id => gcpProject.includes(id));
  const firebaseConfig = process.env.FIREBASE_CONFIG || '';
  const isFirebaseProduction = productionProjectIds.some(id => firebaseConfig.includes(id));

  return process.env.NODE_ENV === 'production' ||
         isGcpProduction ||
         isFirebaseProduction;
}

// --- TWILIO GETTERS ---

export function getTwilioAccountSid(): string {
  try {
    const secretValue = TWILIO_ACCOUNT_SID.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] TWILIO_ACCOUNT_SID loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available, try process.env
  }

  const envValue = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] TWILIO_ACCOUNT_SID loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] TWILIO_ACCOUNT_SID NOT FOUND`);
  return "";
}

export function getTwilioAuthToken(): string {
  try {
    const secretValue = TWILIO_AUTH_TOKEN.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] TWILIO_AUTH_TOKEN loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available, try process.env
  }

  const envValue = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] TWILIO_AUTH_TOKEN loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] TWILIO_AUTH_TOKEN NOT FOUND`);
  return "";
}

export function getTwilioPhoneNumberValue(): string {
  try {
    const secretValue = TWILIO_PHONE_NUMBER.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] TWILIO_PHONE_NUMBER loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available, try process.env
  }

  const envValue = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] TWILIO_PHONE_NUMBER loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] TWILIO_PHONE_NUMBER NOT FOUND`);
  return "";
}

// --- STRIPE GETTERS ---

export function getStripeMode(): 'live' | 'test' {
  // Force live mode in production
  if (isProduction() && !isEmulator()) {
    console.log('[Secrets] Production detected, forcing Stripe LIVE mode');
    return 'live';
  }

  try {
    const modeValue = STRIPE_MODE.value();
    if (modeValue === 'live' || modeValue === 'test') {
      return modeValue;
    }
  } catch {
    // Fallback to process.env
  }

  const envMode = process.env.STRIPE_MODE;
  if (envMode === 'live' || envMode === 'test') {
    return envMode;
  }

  return 'test';
}

export function getStripeSecretKey(mode?: 'live' | 'test'): string {
  const effectiveMode = mode || getStripeMode();
  return effectiveMode === 'live' ? getStripeSecretKeyLive() : getStripeSecretKeyTest();
}

export function getStripeSecretKeyLive(): string {
  try {
    // P0 FIX: trim() to handle Windows CRLF in secrets
    const secretValue = STRIPE_SECRET_KEY_LIVE.value()?.trim();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('sk_live_')) {
      console.log(`[Secrets] STRIPE_SECRET_KEY_LIVE loaded from Firebase Secret`);
      return secretValue;
    }
    // P0 DEBUG: Log why secret was rejected
    console.warn(`[Secrets] STRIPE_SECRET_KEY_LIVE value rejected:`, {
      hasValue: !!secretValue,
      length: secretValue?.length || 0,
      startsWithSkLive: secretValue?.startsWith('sk_live_') || false,
    });
  } catch (err) {
    // P0 FIX: Log the error instead of silently ignoring
    console.error(`[Secrets] STRIPE_SECRET_KEY_LIVE.value() threw error:`, err);
  }

  const envValue = process.env.STRIPE_SECRET_KEY_LIVE;
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] STRIPE_SECRET_KEY_LIVE loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] STRIPE_SECRET_KEY_LIVE NOT FOUND - neither Firebase Secret nor process.env available`);
  return "";
}

export function getStripeSecretKeyTest(): string {
  try {
    // P0 FIX: trim() to handle Windows CRLF in secrets
    const secretValue = STRIPE_SECRET_KEY_TEST.value()?.trim();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('sk_test_')) {
      console.log(`[Secrets] STRIPE_SECRET_KEY_TEST loaded from Firebase Secret`);
      return secretValue;
    }
    // P0 DEBUG: Log why secret was rejected
    console.warn(`[Secrets] STRIPE_SECRET_KEY_TEST value rejected:`, {
      hasValue: !!secretValue,
      length: secretValue?.length || 0,
      startsWithSkTest: secretValue?.startsWith('sk_test_') || false,
    });
  } catch (err) {
    // P0 FIX: Log the error instead of silently ignoring
    console.error(`[Secrets] STRIPE_SECRET_KEY_TEST.value() threw error:`, err);
  }

  const envValue = process.env.STRIPE_SECRET_KEY_TEST;
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] STRIPE_SECRET_KEY_TEST loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] STRIPE_SECRET_KEY_TEST NOT FOUND - neither Firebase Secret nor process.env available`);
  return "";
}

export function getStripeWebhookSecret(mode?: 'live' | 'test'): string {
  const effectiveMode = mode || getStripeMode();

  const secretDef = effectiveMode === 'live' ? STRIPE_WEBHOOK_SECRET_LIVE : STRIPE_WEBHOOK_SECRET_TEST;
  const envKey = effectiveMode === 'live' ? 'STRIPE_WEBHOOK_SECRET_LIVE' : 'STRIPE_WEBHOOK_SECRET_TEST';

  try {
    // P0 FIX: trim() to handle Windows CRLF in secrets
    const secretValue = secretDef.value()?.trim();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('whsec_')) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env[envKey]?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] ${envKey} NOT FOUND`);
  return "";
}

export function getStripeConnectWebhookSecret(mode?: 'live' | 'test'): string {
  const effectiveMode = mode || getStripeMode();

  const secretDef = effectiveMode === 'live' ? STRIPE_CONNECT_WEBHOOK_SECRET_LIVE : STRIPE_CONNECT_WEBHOOK_SECRET_TEST;
  const envKey = effectiveMode === 'live' ? 'STRIPE_CONNECT_WEBHOOK_SECRET_LIVE' : 'STRIPE_CONNECT_WEBHOOK_SECRET_TEST';

  try {
    // P0 FIX: trim() to handle Windows CRLF in secrets
    const secretValue = secretDef.value()?.trim();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('whsec_')) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env[envKey]?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] ${envKey} NOT FOUND`);
  return "";
}

// --- TASKS AUTH GETTER ---

export function getTasksAuthSecret(): string {
  try {
    const secretValue = TASKS_AUTH_SECRET.value();
    if (secretValue && secretValue.length > 0) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.TASKS_AUTH_SECRET;
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] TASKS_AUTH_SECRET NOT FOUND`);
  return "";
}

// --- PAYPAL GETTERS ---

export function getPayPalMode(): 'sandbox' | 'live' {
  // Force live mode in production
  if (isProduction() && !isEmulator()) {
    console.log('[Secrets] Production detected, forcing PayPal LIVE mode');
    return 'live';
  }

  try {
    const modeValue = PAYPAL_MODE.value();
    if (modeValue === 'live' || modeValue === 'sandbox') {
      return modeValue;
    }
  } catch {
    // Fallback to process.env
  }

  const envMode = process.env.PAYPAL_MODE;
  if (envMode === 'live' || envMode === 'sandbox') {
    return envMode;
  }

  // P1-1 AUDIT FIX: Default is now 'live' (defineString default changed too).
  // Sandbox is only used if explicitly requested via PAYPAL_MODE=sandbox.
  // This prevents accidental sandbox mode in production if the param is missing.
  console.warn('[Secrets] PAYPAL_MODE not resolved from any source — defaulting to LIVE');
  return 'live';
}

export function getPayPalClientId(): string {
  try {
    const secretValue = PAYPAL_CLIENT_ID.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] PAYPAL_CLIENT_ID loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.PAYPAL_CLIENT_ID?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] PAYPAL_CLIENT_ID loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] PAYPAL_CLIENT_ID NOT FOUND`);
  return "";
}

export function getPayPalClientSecret(): string {
  try {
    const secretValue = PAYPAL_CLIENT_SECRET.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] PAYPAL_CLIENT_SECRET loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] PAYPAL_CLIENT_SECRET loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] PAYPAL_CLIENT_SECRET NOT FOUND`);
  return "";
}

export function getPayPalWebhookId(): string {
  try {
    const secretValue = PAYPAL_WEBHOOK_ID.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] PAYPAL_WEBHOOK_ID NOT FOUND`);
  return "";
}

export function getPayPalPartnerId(): string {
  try {
    const secretValue = PAYPAL_PARTNER_ID.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.PAYPAL_PARTNER_ID?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  // Fallback to default partner ID
  return "SOS-Expat_SP";
}

export function getPayPalPlatformMerchantId(): string {
  try {
    const secretValue = PAYPAL_PLATFORM_MERCHANT_ID.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.PAYPAL_PLATFORM_MERCHANT_ID?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] PAYPAL_PLATFORM_MERCHANT_ID NOT FOUND`);
  return "";
}

export function getPayPalBaseUrl(): string {
  const mode = getPayPalMode();
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

// --- WISE GETTERS ---

export function getWiseMode(): 'sandbox' | 'live' {
  // Force live mode in production
  if (isProduction() && !isEmulator()) {
    console.log('[Secrets] Production detected, forcing Wise LIVE mode');
    return 'live';
  }

  try {
    const modeValue = WISE_MODE.value();
    if (modeValue === 'live' || modeValue === 'sandbox') {
      return modeValue;
    }
  } catch {
    // Fallback to process.env
  }

  const envMode = process.env.WISE_MODE;
  if (envMode === 'live' || envMode === 'sandbox') {
    return envMode;
  }

  return 'sandbox';
}

export function getWiseApiToken(): string {
  try {
    const secretValue = WISE_API_TOKEN.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] WISE_API_TOKEN loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.WISE_API_TOKEN?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] WISE_API_TOKEN loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] WISE_API_TOKEN NOT FOUND`);
  return "";
}

export function getWiseProfileId(): string {
  try {
    const secretValue = WISE_PROFILE_ID.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] WISE_PROFILE_ID loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.WISE_PROFILE_ID?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] WISE_PROFILE_ID loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] WISE_PROFILE_ID NOT FOUND`);
  return "";
}

export function getWiseWebhookSecret(): string {
  try {
    const secretValue = WISE_WEBHOOK_SECRET.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.WISE_WEBHOOK_SECRET?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] WISE_WEBHOOK_SECRET NOT FOUND`);
  return "";
}

export function getWiseBaseUrl(): string {
  const mode = getWiseMode();
  return mode === 'live'
    ? 'https://api.wise.com'
    : 'https://api.sandbox.transferwise.tech';
}

// --- FLUTTERWAVE GETTERS ---

export function getFlutterwaveMode(): 'sandbox' | 'production' {
  // Force production mode in production environment
  if (isProduction() && !isEmulator()) {
    console.log('[Secrets] Production detected, forcing Flutterwave PRODUCTION mode');
    return 'production';
  }

  try {
    const modeValue = FLUTTERWAVE_MODE.value();
    if (modeValue === 'production' || modeValue === 'sandbox') {
      return modeValue;
    }
  } catch {
    // Fallback to process.env
  }

  const envMode = process.env.FLUTTERWAVE_MODE;
  if (envMode === 'production' || envMode === 'sandbox') {
    return envMode;
  }

  return 'sandbox';
}

export function getFlutterwaveSecretKey(): string {
  try {
    const secretValue = FLUTTERWAVE_SECRET_KEY.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] FLUTTERWAVE_SECRET_KEY loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] FLUTTERWAVE_SECRET_KEY loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] FLUTTERWAVE_SECRET_KEY NOT FOUND`);
  return "";
}

export function getFlutterwavePublicKey(): string {
  try {
    const secretValue = FLUTTERWAVE_PUBLIC_KEY.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] FLUTTERWAVE_PUBLIC_KEY loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.FLUTTERWAVE_PUBLIC_KEY?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] FLUTTERWAVE_PUBLIC_KEY loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] FLUTTERWAVE_PUBLIC_KEY NOT FOUND`);
  return "";
}

export function getFlutterwaveWebhookSecret(): string {
  try {
    const secretValue = FLUTTERWAVE_WEBHOOK_SECRET.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      return secretValue;
    }
  } catch {
    // Secret not available
  }

  const envValue = process.env.FLUTTERWAVE_WEBHOOK_SECRET?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] FLUTTERWAVE_WEBHOOK_SECRET NOT FOUND`);
  return "";
}

export function getFlutterwaveBaseUrl(): string {
  // Flutterwave uses the same base URL for sandbox and production
  // The environment is determined by the API keys used
  return 'https://api.flutterwave.com/v3';
}

// --- TELEGRAM GETTERS ---

export function getTelegramBotToken(): string {
  try {
    const secretValue = TELEGRAM_BOT_TOKEN.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`[Secrets] TELEGRAM_BOT_TOKEN loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available, try process.env
  }

  const envValue = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] TELEGRAM_BOT_TOKEN loaded from process.env`);
    return envValue;
  }

  console.error(`[Secrets] TELEGRAM_BOT_TOKEN NOT FOUND`);
  return "";
}

// --- TELEGRAM WEBHOOK SECRET GETTER ---

export function getTelegramWebhookSecret(): string {
  try {
    const secretValue = TELEGRAM_WEBHOOK_SECRET.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      return secretValue;
    }
  } catch {
    // Secret not available, try process.env
  }

  const envValue = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`[Secrets] TELEGRAM_WEBHOOK_SECRET NOT FOUND`);
  return "";
}

// --- OUTIL GETTERS ---

export function getOutilIngestEndpoint(): string {
  try {
    const paramValue = OUTIL_INGEST_ENDPOINT.value()?.trim();
    if (paramValue && paramValue.length > 0) {
      return paramValue;
    }
  } catch {
    // Param not available, try process.env
  }

  const envValue = process.env.OUTIL_INGEST_ENDPOINT?.trim();
  if (envValue && envValue.length > 0) {
    console.log(`[Secrets] OUTIL_INGEST_ENDPOINT loaded from process.env`);
    return envValue;
  }

  // Fallback to default production URL
  return "https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking";
}

// ============================================================================
// COMBINED ARRAYS FOR FUNCTION CONFIG
// ============================================================================

/** All secrets commonly needed for Twilio call functions */
export const CALL_FUNCTION_SECRETS = [
  ...TWILIO_SECRETS,
  TASKS_AUTH_SECRET,
  ENCRYPTION_KEY,
];

/** All secrets for payment/Stripe functions */
export const PAYMENT_FUNCTION_SECRETS = [
  ...STRIPE_SECRETS,
];

/** All secrets for Wise affiliate payout functions */
export const WISE_PAYOUT_SECRETS = [
  ...WISE_SECRETS,
  ENCRYPTION_KEY,
];

/** All secrets for Flutterwave mobile money payout functions */
export const FLUTTERWAVE_PAYOUT_SECRETS = [
  ...FLUTTERWAVE_SECRETS,
  ENCRYPTION_KEY,
];

/** All secrets for Telegram notification functions */
export const TELEGRAM_NOTIFICATION_SECRETS = [
  ...TELEGRAM_SECRETS,
];

// ============================================================================
// TIMING-SAFE AUTH COMPARISON (Cloud Tasks)
// ============================================================================

import crypto from "crypto";

/**
 * Timing-safe comparison for Cloud Tasks X-Task-Auth header.
 * Prevents timing attacks that could leak the secret byte-by-byte.
 */
export function isValidTaskAuth(received: string, expected: string): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** All secrets - use sparingly, prefer specific arrays */
export const ALL_SECRETS = [
  ...TWILIO_SECRETS,
  ...STRIPE_SECRETS,
  ...PAYPAL_SECRETS,
  ...WISE_SECRETS,
  ...FLUTTERWAVE_SECRETS,
  ...TELEGRAM_SECRETS,
  ...EMAIL_SECRETS,
  ...EMAIL_MARKETING_SECRETS,
  ...GOOGLE_ADS_SECRETS,
  ...META_CAPI_SECRETS,
  ...OPENAI_SECRETS,
  ...BACKLINK_ENGINE_SECRETS,
  ENCRYPTION_KEY,
  TASKS_AUTH_SECRET,
  OUTIL_API_KEY,
  OUTIL_SYNC_API_KEY,
  OUTIL_SERVICE_ACCOUNT_KEY,
  SENTRY_DSN,
  SOS_SYNC_API_KEY,
  MULTI_DASHBOARD_PASSWORD,
  CACHE_INVALIDATION_KEY,
];
