/**
 * Scheduled AI Key Health Check
 *
 * Runs daily at 8:00 AM Paris time to verify all AI API keys are valid.
 * Sends Telegram alerts immediately if any key is broken.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { ANTHROPIC_API_KEY } from '../lib/secrets';
import { OPENAI_API_KEY } from '../lib/secrets';
import { healthCheckAIKeys } from './aiKeyAlert';

export const scheduledAIKeyHealthCheck = onSchedule(
  {
    schedule: '0 8 * * *', // Daily at 08:00 Paris time
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [ANTHROPIC_API_KEY, OPENAI_API_KEY],
  },
  async () => {
    console.log('[AI Health Check] Starting daily AI key verification...');

    const results = await healthCheckAIKeys();

    const allOk = results.anthropic && results.openai && results.perplexity;

    console.log('[AI Health Check] Results:', {
      anthropic: results.anthropic ? 'OK' : 'FAILED',
      openai: results.openai ? 'OK' : 'FAILED',
      perplexity: results.perplexity ? 'OK' : 'FAILED',
      allOk,
    });

    // Alerts are sent by healthCheckAIKeys() automatically for failures
  }
);
