/**
 * AI API Key Failure Alert System
 *
 * Centralized monitoring for all AI service API keys (Anthropic, OpenAI, Perplexity).
 * Sends immediate Telegram alerts when authentication errors are detected.
 *
 * Usage from any service:
 *   import { checkAndAlertAIKeyFailure } from '../monitoring/aiKeyAlert';
 *   try { await callAI(...); }
 *   catch (err) { await checkAndAlertAIKeyFailure(err, 'anthropic', 'SEO Generation'); }
 */

import * as admin from 'firebase-admin';
import { sendTelegramMessageDirect } from '../telegram/providers/telegramBot';

// ============================================================================
// TYPES
// ============================================================================

export type AIService = 'anthropic' | 'openai' | 'perplexity';

// Alert record shape: { service, feature, errorMessage, failureType, alertedAt } in ai_key_alerts collection

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cooldown between alerts for the same service (1 hour) */
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

/** In-memory cooldown tracker (per Cloud Function instance) */
const lastAlertTime = new Map<string, number>();

const SERVICE_LABELS: Record<AIService, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  perplexity: 'Perplexity AI',
};

const SERVICE_FIX_HINTS: Record<AIService, string> = {
  anthropic: 'firebase functions:secrets:set ANTHROPIC_API_KEY\nNouvelle clé : https://console.anthropic.com/settings/keys',
  openai: 'firebase functions:secrets:set OPENAI_API_KEY\nNouvelle clé : https://platform.openai.com/api-keys',
  perplexity: 'firebase functions:secrets:set PERPLEXITY_API_KEY\nNouvelle clé : https://www.perplexity.ai/settings/api',
};

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Detect if an error is an AI API authentication/key failure.
 * Covers all common error patterns from Anthropic, OpenAI, and Perplexity.
 */
export function isAIKeyError(error: unknown): boolean {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);
  const status = (error as any)?.status || (error as any)?.statusCode || (error as any)?.response?.status;

  // HTTP 401 or 403 = auth error
  if (status === 401 || status === 403) return true;

  // Common error patterns across AI providers
  const patterns = [
    'invalid x-api-key',
    'invalid api key',
    'invalid_api_key',
    'authentication_error',
    'AuthenticationError',
    'Incorrect API key',
    'invalid_request_error',
    'api key not valid',
    'unauthorized',
    'insufficient_quota',
    'rate_limit_exceeded',
    'billing_hard_limit_reached',
    'account_deactivated',
  ];

  const lowerMessage = message.toLowerCase();
  return patterns.some(p => lowerMessage.includes(p.toLowerCase()));
}

/**
 * Detect the specific type of key failure for more precise alerts.
 */
function getFailureType(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('authentication') || lower.includes('invalid') || lower.includes('api key'))
    return 'Clé API invalide ou expirée';
  if (lower.includes('insufficient_quota') || lower.includes('billing'))
    return 'Quota épuisé ou facturation bloquée';
  if (lower.includes('rate_limit'))
    return 'Rate limit dépassé';
  if (lower.includes('deactivated'))
    return 'Compte désactivé';

  return 'Erreur d\'authentification';
}

// ============================================================================
// ALERT
// ============================================================================

/**
 * Check if an error is an AI key failure, and if so, send a Telegram alert.
 * Includes cooldown to avoid spam (max 1 alert per service per hour).
 *
 * @param error - The caught error
 * @param service - Which AI service ('anthropic', 'openai', 'perplexity')
 * @param feature - Which feature was using it (e.g., 'SEO Generation', 'Outil IA', 'Translation')
 * @returns true if an alert was sent, false otherwise
 */
export async function checkAndAlertAIKeyFailure(
  error: unknown,
  service: AIService,
  feature: string,
): Promise<boolean> {
  if (!isAIKeyError(error)) return false;

  // Cooldown check
  const now = Date.now();
  const lastAlert = lastAlertTime.get(service) || 0;
  if (now - lastAlert < ALERT_COOLDOWN_MS) {
    console.warn(`[AI Alert] Cooldown active for ${service}, skipping alert`);
    return false;
  }

  lastAlertTime.set(service, now);

  const failureType = getFailureType(error);
  const errorMsg = error instanceof Error ? error.message : String(error);

  // Build Telegram message
  const message = [
    `🚨 *ALERTE: Clé IA ${SERVICE_LABELS[service]} en échec*`,
    '',
    `📌 *Service:* ${SERVICE_LABELS[service]}`,
    `⚙️ *Fonctionnalité:* ${feature}`,
    `❌ *Problème:* ${failureType}`,
    `📝 *Erreur:* \`${errorMsg.substring(0, 200)}\``,
    '',
    `🔧 *Pour corriger:*`,
    `\`${SERVICE_FIX_HINTS[service].split('\n')[0]}\``,
    SERVICE_FIX_HINTS[service].split('\n')[1] || '',
    '',
    `⏰ ${new Date().toISOString()}`,
  ].join('\n');

  try {
    // Get admin chat ID from Firestore
    const db = admin.firestore();
    const configDoc = await db.collection('telegram_admin_config').doc('settings').get();
    const adminChatId = configDoc.exists ? configDoc.data()?.recipientChatId : null;

    if (!adminChatId) {
      console.error('[AI Alert] No admin chat ID configured in telegram_admin_config/settings');
      return false;
    }

    await sendTelegramMessageDirect(adminChatId, message, { parseMode: 'Markdown' });
    console.log(`[AI Alert] Telegram alert sent for ${service} (${feature})`);

    // Log to Firestore for audit trail
    await db.collection('ai_key_alerts').add({
      service,
      feature,
      errorMessage: errorMsg.substring(0, 500),
      failureType,
      alertedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  } catch (alertError) {
    console.error('[AI Alert] Failed to send Telegram alert:', alertError);
    return false;
  }
}

// ============================================================================
// SCHEDULED HEALTH CHECK (optional — can be called from a cron)
// ============================================================================

/**
 * Proactively test all AI API keys and alert if any are broken.
 * Call this from a scheduled function for early detection.
 */
export async function healthCheckAIKeys(): Promise<{
  anthropic: boolean;
  openai: boolean;
  perplexity: boolean;
}> {
  const results = { anthropic: false, openai: false, perplexity: false };

  // Test Anthropic
  try {
    const { getAnthropicApiKey } = await import('../lib/secrets');
    const key = getAnthropicApiKey();
    if (!key) throw new Error('ANTHROPIC_API_KEY not configured');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    // 200 or 400 (bad request but key is valid) = OK. 401/403 = key broken
    results.anthropic = res.status !== 401 && res.status !== 403;
    if (!results.anthropic) {
      await checkAndAlertAIKeyFailure(
        new Error(`HTTP ${res.status}: ${await res.text()}`),
        'anthropic', 'Health Check'
      );
    }
  } catch (err) {
    await checkAndAlertAIKeyFailure(err, 'anthropic', 'Health Check');
  }

  // Test OpenAI
  try {
    const { OPENAI_API_KEY } = await import('../lib/secrets');
    const key = OPENAI_API_KEY.value()?.trim();
    if (!key) throw new Error('OPENAI_API_KEY not configured');

    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    results.openai = res.status !== 401 && res.status !== 403;
    if (!results.openai) {
      await checkAndAlertAIKeyFailure(
        new Error(`HTTP ${res.status}`),
        'openai', 'Health Check'
      );
    }
  } catch (err) {
    await checkAndAlertAIKeyFailure(err, 'openai', 'Health Check');
  }

  // Test Perplexity
  try {
    const key = process.env.PERPLEXITY_API_KEY?.trim();
    if (!key) {
      results.perplexity = true; // Not configured = not used = OK
    } else {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });
      results.perplexity = res.status !== 401 && res.status !== 403;
      if (!results.perplexity) {
        await checkAndAlertAIKeyFailure(
          new Error(`HTTP ${res.status}`),
          'perplexity', 'Health Check'
        );
      }
    }
  } catch (err) {
    // Perplexity may not be configured — that's OK
    results.perplexity = true;
  }

  return results;
}
