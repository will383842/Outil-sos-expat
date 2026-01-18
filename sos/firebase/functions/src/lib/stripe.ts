/**
 * Stripe Secrets Helper
 *
 * P0 CRITICAL FIX: Use Firebase v2 defineSecret instead of process.env
 * process.env does NOT work for Firebase v2 secrets in production!
 *
 * Usage:
 * 1. Import the secrets for runWith: import { STRIPE_SECRET_KEY_LIVE, ... } from './lib/stripe';
 * 2. Add to function config: { secrets: [STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST] }
 * 3. Call getter in function: const key = getStripeSecretKey();
 */

import { defineSecret, defineString } from "firebase-functions/params";

// ============================================================================
// P0 CRITICAL: Define secrets using Firebase v2 params
// ============================================================================

// Stripe API keys (secrets)
export const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");
export const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
export const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY"); // Legacy fallback

// Stripe webhook secrets
export const STRIPE_WEBHOOK_SECRET_LIVE = defineSecret("STRIPE_WEBHOOK_SECRET_LIVE");
export const STRIPE_WEBHOOK_SECRET_TEST = defineSecret("STRIPE_WEBHOOK_SECRET_TEST");
export const STRIPE_CONNECT_WEBHOOK_SECRET_LIVE = defineSecret("STRIPE_CONNECT_WEBHOOK_SECRET_LIVE");
export const STRIPE_CONNECT_WEBHOOK_SECRET_TEST = defineSecret("STRIPE_CONNECT_WEBHOOK_SECRET_TEST");

// Stripe mode (not a secret, just config)
export const STRIPE_MODE = defineString("STRIPE_MODE", { default: "test" });

// ============================================================================
// Getters with Firebase Secret + process.env fallback (for local dev/emulator)
// ============================================================================

/**
 * Get the appropriate Stripe secret key based on mode
 * Tries Firebase v2 secret first, then falls back to process.env
 */
export function getStripeSecretKey(mode?: 'live' | 'test'): string {
  const effectiveMode = mode || getStripeMode();

  if (effectiveMode === 'live') {
    return getStripeSecretKeyLive();
  }
  return getStripeSecretKeyTest();
}

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
 * P0 FIX 2026-01-18: Updated project IDs to match actual production project
 */
export function isProduction(): boolean {
  // Check for known production project IDs
  const productionProjectIds = ['sos-expat', 'sos-urgently-ac307'];

  const gcpProject = process.env.GCLOUD_PROJECT || '';
  const isGcpProduction = productionProjectIds.some(id => gcpProject.includes(id));

  // Check Firebase config for production project IDs
  const firebaseConfig = process.env.FIREBASE_CONFIG || '';
  const isFirebaseProduction = productionProjectIds.some(id => firebaseConfig.includes(id));

  return process.env.NODE_ENV === 'production' ||
         isGcpProduction ||
         isFirebaseProduction;
}

/**
 * Get Stripe mode (live or test)
 *
 * P0 CRITICAL FIX: In production (non-emulator), force 'live' mode
 * to prevent accidental use of test keys in production
 */
export function getStripeMode(): 'live' | 'test' {
  // P0 FIX: Force live mode in production (non-emulator)
  if (isProduction() && !isEmulator()) {
    console.log('🔒 [Stripe] P0 FIX: Production detected, forcing LIVE mode');
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

  // Default to test (only in non-production)
  return 'test';
}

/**
 * P0 FIX: Validate that Stripe mode is appropriate for the environment
 * Throws an error if test mode is used in production
 */
export function validateStripeMode(mode: 'live' | 'test'): void {
  if (isProduction() && !isEmulator() && mode !== 'live') {
    throw new Error(
      'P0 SECURITY ERROR: Stripe test mode is not allowed in production. ' +
      'Set STRIPE_MODE=live or ensure STRIPE_SECRET_KEY_LIVE is configured.'
    );
  }
}

/**
 * Get LIVE Stripe secret key
 */
export function getStripeSecretKeyLive(): string {
  // Try Firebase v2 secret first
  try {
    const secretValue = STRIPE_SECRET_KEY_LIVE.value();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('sk_live_')) {
      console.log(`🔐 [Stripe] LIVE key loaded from Firebase Secret (length: ${secretValue.length})`);
      return secretValue;
    }
  } catch (e) {
    // Secret not available, try process.env
  }

  // Fallback to process.env
  const envValue = process.env.STRIPE_SECRET_KEY_LIVE;
  if (envValue && envValue.length > 0) {
    console.log(`🔐 [Stripe] LIVE key loaded from process.env (length: ${envValue.length})`);
    return envValue;
  }

  console.error(`❌ [Stripe] STRIPE_SECRET_KEY_LIVE NOT FOUND`);
  return "";
}

/**
 * Get TEST Stripe secret key
 */
export function getStripeSecretKeyTest(): string {
  // Try Firebase v2 secret first
  try {
    const secretValue = STRIPE_SECRET_KEY_TEST.value();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('sk_test_')) {
      console.log(`🔐 [Stripe] TEST key loaded from Firebase Secret (length: ${secretValue.length})`);
      return secretValue;
    }
  } catch (e) {
    // Secret not available, try process.env
  }

  // Fallback to process.env
  const envValue = process.env.STRIPE_SECRET_KEY_TEST;
  if (envValue && envValue.length > 0) {
    console.log(`🔐 [Stripe] TEST key loaded from process.env (length: ${envValue.length})`);
    return envValue;
  }

  console.error(`❌ [Stripe] STRIPE_SECRET_KEY_TEST NOT FOUND`);
  return "";
}

/**
 * Get legacy STRIPE_SECRET_KEY (fallback for older code)
 */
export function getStripeSecretKeyLegacy(): string {
  // Try Firebase v2 secret first
  try {
    const secretValue = STRIPE_SECRET_KEY.value();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('sk_')) {
      console.log(`🔐 [Stripe] Legacy key loaded from Firebase Secret (length: ${secretValue.length})`);
      return secretValue;
    }
  } catch (e) {
    // Secret not available, try process.env
  }

  // Fallback to process.env
  const envValue = process.env.STRIPE_SECRET_KEY;
  if (envValue && envValue.length > 0) {
    console.log(`🔐 [Stripe] Legacy key loaded from process.env (length: ${envValue.length})`);
    return envValue;
  }

  console.error(`❌ [Stripe] STRIPE_SECRET_KEY (legacy) NOT FOUND`);
  return "";
}

/**
 * Get webhook secret based on mode
 */
export function getStripeWebhookSecret(mode?: 'live' | 'test'): string {
  const effectiveMode = mode || getStripeMode();

  if (effectiveMode === 'live') {
    return getStripeWebhookSecretLive();
  }
  return getStripeWebhookSecretTest();
}

/**
 * Get LIVE Stripe webhook secret
 */
export function getStripeWebhookSecretLive(): string {
  try {
    const secretValue = STRIPE_WEBHOOK_SECRET_LIVE.value();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('whsec_')) {
      return secretValue;
    }
  } catch (e) {
    // Secret not available
  }

  const envValue = process.env.STRIPE_WEBHOOK_SECRET_LIVE;
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`❌ [Stripe] STRIPE_WEBHOOK_SECRET_LIVE NOT FOUND`);
  return "";
}

/**
 * Get TEST Stripe webhook secret
 */
export function getStripeWebhookSecretTest(): string {
  try {
    const secretValue = STRIPE_WEBHOOK_SECRET_TEST.value();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('whsec_')) {
      return secretValue;
    }
  } catch (e) {
    // Secret not available
  }

  const envValue = process.env.STRIPE_WEBHOOK_SECRET_TEST;
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`❌ [Stripe] STRIPE_WEBHOOK_SECRET_TEST NOT FOUND`);
  return "";
}

/**
 * Get Connect webhook secret based on mode
 */
export function getStripeConnectWebhookSecret(mode?: 'live' | 'test'): string {
  const effectiveMode = mode || getStripeMode();

  try {
    const secret = effectiveMode === 'live'
      ? STRIPE_CONNECT_WEBHOOK_SECRET_LIVE.value()
      : STRIPE_CONNECT_WEBHOOK_SECRET_TEST.value();

    if (secret && secret.length > 0 && secret.startsWith('whsec_')) {
      return secret;
    }
  } catch (e) {
    // Secret not available
  }

  const envKey = effectiveMode === 'live'
    ? 'STRIPE_CONNECT_WEBHOOK_SECRET_LIVE'
    : 'STRIPE_CONNECT_WEBHOOK_SECRET_TEST';

  const envValue = process.env[envKey];
  if (envValue && envValue.length > 0) {
    return envValue;
  }

  console.error(`❌ [Stripe] ${envKey} NOT FOUND`);
  return "";
}

// ============================================================================
// Convenience: Array of all secrets for runWith config
// ============================================================================

/**
 * All Stripe secrets for use in Cloud Function config
 * Usage: onCall({ secrets: STRIPE_ALL_SECRETS }, ...)
 */
export const STRIPE_ALL_SECRETS = [
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
];

/**
 * Only API keys (no webhooks) for use in Cloud Function config
 */
export const STRIPE_API_SECRETS = [
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
];
