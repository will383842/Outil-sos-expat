/**
 * Anthropic API Usage Monitoring Cloud Function
 *
 * Tracks Claude API usage from our own ai_call_logs collection since
 * Anthropic doesn't have a public billing API.
 *
 * Calculates:
 * - Total API calls to Claude
 * - Input/Output token usage
 * - Estimated cost based on Claude 3.5 Sonnet pricing
 *
 * @version 1.1.0
 * @admin-only This function is reserved for administrators
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// ============================================================================
// TYPES
// ============================================================================

interface AnthropicUsageResponse {
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: 'USD';
  periodStart: Date;
  periodEnd: Date;
}

interface AnthropicUsageInput {
  periodDays?: number;
}

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

/**
 * Claude 3.5 Sonnet pricing (as of 2024)
 * Source: https://www.anthropic.com/pricing
 */
const CLAUDE_PRICING = {
  // Claude 3.5 Sonnet
  INPUT_PER_MILLION_TOKENS_USD: 3.00,   // $3 per 1M input tokens
  OUTPUT_PER_MILLION_TOKENS_USD: 15.00, // $15 per 1M output tokens
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verifies that the user is an admin
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.role === 'dev';
  } catch (error) {
    logger.error('[AnthropicUsage] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Queries ai_call_logs for Claude provider usage
 */
async function getClaudeUsageFromLogs(periodStart: Date, periodEnd: Date): Promise<{
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
}> {
  try {
    // Query ai_call_logs where provider is 'claude'
    const logsSnapshot = await db().collection('ai_call_logs')
      .where('provider', '==', 'claude')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(periodEnd))
      .get();

    let totalCalls = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    logsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalCalls++;
      inputTokens += data.inputTokens || 0;
      outputTokens += data.outputTokens || 0;
    });

    return { totalCalls, inputTokens, outputTokens };
  } catch (error) {
    logger.error('[AnthropicUsage] Error querying ai_call_logs:', error);
    throw error;
  }
}

/**
 * Calculates estimated cost based on Claude 3.5 Sonnet pricing
 */
function calculateEstimatedCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * CLAUDE_PRICING.INPUT_PER_MILLION_TOKENS_USD;
  const outputCost = (outputTokens / 1_000_000) * CLAUDE_PRICING.OUTPUT_PER_MILLION_TOKENS_USD;
  return Math.round((inputCost + outputCost) * 100) / 100; // Round to 2 decimal places
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getAnthropicUsage - Cloud Function onCall (admin only)
 *
 * Retrieves Anthropic (Claude) API usage metrics from ai_call_logs.
 * Since Anthropic doesn't have a public billing API, we track usage
 * from our own logs and estimate costs based on current pricing.
 *
 * @param data.periodDays - Number of days to analyze (default: 30 for current month)
 * @returns AnthropicUsageResponse - Usage metrics and estimated cost
 */
export const getAnthropicUsage = functions.onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    memory: '128MiB',
    timeoutSeconds: 60,
    cors: [/sos-expat\.com$/, /localhost/],
  },
  async (request): Promise<AnthropicUsageResponse> => {
    // Authentication check
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Admin verification
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new functions.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    const data = request.data as AnthropicUsageInput | undefined;

    logger.info('[AnthropicUsage] Fetching Anthropic usage metrics', {
      uid: request.auth.uid,
      periodDays: data?.periodDays || 30
    });

    try {
      // Determine analysis period (default: 30 days for monthly billing)
      const periodDays = data?.periodDays || 30;
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get usage from ai_call_logs
      const usage = await getClaudeUsageFromLogs(periodStart, periodEnd);

      // Calculate estimated cost
      const estimatedCost = calculateEstimatedCost(usage.inputTokens, usage.outputTokens);

      // Build response
      const response: AnthropicUsageResponse = {
        totalCalls: usage.totalCalls,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCost,
        currency: 'USD',
        periodStart,
        periodEnd,
      };

      // Log metrics for audit
      logger.info('[AnthropicUsage] Metrics calculated', {
        period: `${periodDays} day(s)`,
        totalCalls: usage.totalCalls,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUSD: estimatedCost,
      });

      return response;
    } catch (error) {
      logger.error('[AnthropicUsage] Error fetching usage metrics:', error);
      throw new functions.HttpsError(
        'internal',
        'Failed to fetch Anthropic usage metrics'
      );
    }
  }
);
