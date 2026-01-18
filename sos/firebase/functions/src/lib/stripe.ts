/**
 * Stripe Secrets Helper
 *
 * P0 FIX: This file now imports from centralized secrets.ts
 * NEVER call defineSecret() in this file - it causes credential conflicts!
 *
 * Usage:
 * 1. Import the secrets for runWith: import { STRIPE_SECRETS } from './lib/secrets';
 * 2. Add to function config: { secrets: [...STRIPE_SECRETS] }
 * 3. Call getter in function: import { getStripeSecretKey } from './lib/stripe';
 */

// P0 FIX: Import from centralized secrets - NEVER call defineSecret() here!
import {
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
  STRIPE_MODE,
  STRIPE_SECRETS,
  STRIPE_API_SECRETS,
  isEmulator,
  isProduction,
  getStripeMode as getStripeModeFromSecrets,
  getStripeSecretKey as getStripeSecretKeyFromSecrets,
  getStripeSecretKeyLive as getStripeSecretKeyLiveFromSecrets,
  getStripeSecretKeyTest as getStripeSecretKeyTestFromSecrets,
  getStripeWebhookSecret as getStripeWebhookSecretFromSecrets,
  getStripeConnectWebhookSecret as getStripeConnectWebhookSecretFromSecrets,
} from "./secrets";

// Re-export secrets for backwards compatibility
export {
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_WEBHOOK_SECRET_TEST,
  STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
  STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
  STRIPE_MODE,
  isEmulator,
  isProduction,
};

// Re-export arrays
export const STRIPE_ALL_SECRETS = STRIPE_SECRETS;
export { STRIPE_API_SECRETS };

// ============================================================================
// Getters - delegate to centralized secrets.ts
// ============================================================================

export function getStripeSecretKey(mode?: 'live' | 'test'): string {
  return getStripeSecretKeyFromSecrets(mode);
}

export function getStripeMode(): 'live' | 'test' {
  return getStripeModeFromSecrets();
}

export function validateStripeMode(mode: 'live' | 'test'): void {
  if (isProduction() && !isEmulator() && mode !== 'live') {
    throw new Error(
      'P0 SECURITY ERROR: Stripe test mode is not allowed in production. ' +
      'Set STRIPE_MODE=live or ensure STRIPE_SECRET_KEY_LIVE is configured.'
    );
  }
}

export function getStripeSecretKeyLive(): string {
  return getStripeSecretKeyLiveFromSecrets();
}

export function getStripeSecretKeyTest(): string {
  return getStripeSecretKeyTestFromSecrets();
}

export function getStripeSecretKeyLegacy(): string {
  try {
    const secretValue = STRIPE_SECRET_KEY.value();
    if (secretValue && secretValue.length > 0 && secretValue.startsWith('sk_')) {
      console.log(`[Stripe] Legacy key loaded from Firebase Secret`);
      return secretValue;
    }
  } catch {
    // Secret not available, try process.env
  }

  const envValue = process.env.STRIPE_SECRET_KEY;
  if (envValue && envValue.length > 0) {
    console.log(`[Stripe] Legacy key loaded from process.env`);
    return envValue;
  }

  console.error(`[Stripe] STRIPE_SECRET_KEY (legacy) NOT FOUND`);
  return "";
}

export function getStripeWebhookSecret(mode?: 'live' | 'test'): string {
  return getStripeWebhookSecretFromSecrets(mode);
}

export function getStripeWebhookSecretLive(): string {
  return getStripeWebhookSecretFromSecrets('live');
}

export function getStripeWebhookSecretTest(): string {
  return getStripeWebhookSecretFromSecrets('test');
}

export function getStripeConnectWebhookSecret(mode?: 'live' | 'test'): string {
  return getStripeConnectWebhookSecretFromSecrets(mode);
}
