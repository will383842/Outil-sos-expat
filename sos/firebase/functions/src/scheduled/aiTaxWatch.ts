/**
 * Veille IA Fiscale Semestrielle - SOS-Expat OU
 *
 * Cron semestriel (1er janvier + 1er juillet) qui verifie les changements
 * de reglementation fiscale en Estonie, UE, UK et Suisse.
 *
 * @module scheduled/aiTaxWatch
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// =============================================================================
// CONFIGURATION
// =============================================================================

const TAX_WATCH_TOPICS = [
  'Estonia VAT rate changes 2026 2027',
  'EU VAT OSS threshold changes digital services',
  'EU Digital Services Tax new obligations',
  'UK VAT registration threshold changes',
  'Switzerland VAT obligations foreign digital services',
  'Estonia e-Residency tax changes',
  'EU DAC7 DAC8 reporting obligations platforms',
  'OECD Pillar Two minimum tax digital services',
];

// =============================================================================
// INITIALISATION
// =============================================================================

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

// =============================================================================
// CRON FUNCTION
// =============================================================================

export const aiTaxWatch = onSchedule(
  {
    schedule: '0 10 1 1,7 *', // 1er janvier + 1er juillet a 10h
    timeZone: 'Europe/Tallinn',
    region: 'europe-west3',
    memory: '512MiB',
    timeoutSeconds: 120,
    retryCount: 1,
  },
  async () => {
    const db = getDb();
    const runDate = new Date();
    const runId = `tax_watch_${runDate.toISOString().split('T')[0]}`;

    logger.info('aiTaxWatch: Starting semiannual tax watch', { runId });

    try {
      // Attempt to use Claude API if available
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

      let watchResult: {
        summary: string;
        changes: Array<{ topic: string; status: string; details: string }>;
        source: string;
      };

      if (anthropicApiKey) {
        watchResult = await runClaudeWebSearch(anthropicApiKey);
      } else {
        // Fallback: create reminder notification without AI
        watchResult = {
          summary: 'Rappel semestriel: Verifier manuellement les changements de reglementation fiscale pour SOS-Expat OU (Estonie).',
          changes: TAX_WATCH_TOPICS.map(topic => ({
            topic,
            status: 'A VERIFIER',
            details: 'Verification manuelle requise - cle API Claude non configuree',
          })),
          source: 'manual_reminder',
        };
      }

      // Store result
      await db.collection('admin_config').doc('tax_watch_results').set({
        lastRun: FieldValue.serverTimestamp(),
        runId,
        ...watchResult,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create admin notification
      await db.collection('admin_notifications').add({
        type: 'tax_watch',
        title: 'Veille fiscale semestrielle',
        message: watchResult.summary,
        severity: watchResult.changes.some(c => c.status === 'CHANGE_DETECTED') ? 'high' : 'info',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        metadata: { runId, changeCount: watchResult.changes.length },
      });

      logger.info('aiTaxWatch: Complete', {
        runId,
        source: watchResult.source,
        changeCount: watchResult.changes.length,
      });
    } catch (error) {
      logger.error('aiTaxWatch: Failed', {
        runId,
        error: error instanceof Error ? error.message : error,
      });

      // Still create notification about failure
      await db.collection('admin_notifications').add({
        type: 'tax_watch_error',
        title: 'Veille fiscale - Erreur',
        message: `La veille fiscale semestrielle a echoue: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Verifiez manuellement.`,
        severity: 'high',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        metadata: { runId },
      });
    }
  }
);

// =============================================================================
// CLAUDE WEB SEARCH
// =============================================================================

async function runClaudeWebSearch(apiKey: string): Promise<{
  summary: string;
  changes: Array<{ topic: string; status: string; details: string }>;
  source: string;
}> {
  const prompt = `You are a tax compliance assistant for SOS-Expat OU, an Estonian e-Residency company operating digital services (phone consultations) in 197 countries.

Check for any recent or upcoming changes to:
1. Estonia VAT rates (currently 22%)
2. EU VAT OSS thresholds (currently €10,000)
3. EU Digital Services Tax obligations
4. UK VAT registration thresholds for foreign digital services
5. Switzerland VAT obligations for foreign digital services
6. New EU directives (DAC7, DAC8) affecting platforms
7. OECD Pillar Two minimum tax implications
8. Any new tax reporting obligations for digital service platforms

For each topic, indicate:
- NO_CHANGE: No changes detected
- CHANGE_DETECTED: A change has been enacted or is imminent
- UPCOMING: Changes planned but not yet effective

Respond in JSON format:
{
  "summary": "Brief executive summary in French",
  "changes": [
    { "topic": "...", "status": "NO_CHANGE|CHANGE_DETECTED|UPCOMING", "details": "..." }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { ...parsed, source: 'claude_api' };
    }

    return {
      summary: text.slice(0, 500),
      changes: [],
      source: 'claude_api_unparsed',
    };
  } catch (error) {
    logger.warn('aiTaxWatch: Claude API failed, using fallback', {
      error: error instanceof Error ? error.message : error,
    });

    return {
      summary: 'Rappel semestriel: L\'appel a l\'API Claude a echoue. Verifiez manuellement les changements fiscaux.',
      changes: TAX_WATCH_TOPICS.map(topic => ({
        topic,
        status: 'A VERIFIER',
        details: 'API indisponible - verification manuelle requise',
      })),
      source: 'fallback_reminder',
    };
  }
}
