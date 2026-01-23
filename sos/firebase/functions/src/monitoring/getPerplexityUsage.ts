/**
 * Perplexity Usage Metrics Cloud Function
 *
 * Calculates Perplexity AI usage based on logged calls in Firestore.
 * Note: Perplexity doesn't have a public billing API, so we estimate usage
 * from the ai_call_logs collection.
 *
 * @version 1.0.0
 * @admin-only This function is reserved for administrators
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// ============================================================================
// TYPES
// ============================================================================

interface PerplexityUsageResponse {
  totalCalls: number;
  totalTokens: number;
  estimatedCost: number;
  currency: 'USD';
  periodStart: Date;
  periodEnd: Date;
}

interface PerplexityCallLog {
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  createdAt: admin.firestore.Timestamp;
}

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

/**
 * Perplexity Sonar Pro Pricing (as of 2024)
 * https://docs.perplexity.ai/guides/pricing
 *
 * Sonar Pro:
 * - Input: $3.00 per 1M tokens
 * - Output: $15.00 per 1M tokens
 * - Search: $5.00 per 1K searches (included in output for sonar models)
 */
const PERPLEXITY_PRICING = {
  SONAR_PRO: {
    INPUT_PER_1M_TOKENS: 3.00,   // $3.00 per 1M input tokens
    OUTPUT_PER_1M_TOKENS: 15.00, // $15.00 per 1M output tokens
  },
  // Default assumption for token split if not specified
  DEFAULT_INPUT_RATIO: 0.3,  // 30% input, 70% output typical for search
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verifies that the user has admin access
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin' || userData?.role === 'dev';
  } catch (error) {
    logger.error('[PerplexityUsage] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Calculate estimated cost based on token counts
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * PERPLEXITY_PRICING.SONAR_PRO.INPUT_PER_1M_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * PERPLEXITY_PRICING.SONAR_PRO.OUTPUT_PER_1M_TOKENS;
  return inputCost + outputCost;
}

/**
 * Get the start of the current billing period (first day of current month)
 */
function getBillingPeriodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get the end of the current billing period (current time)
 */
function getBillingPeriodEnd(): Date {
  return new Date();
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getPerplexityUsage - Cloud Function onCall (admin only)
 *
 * Queries ai_call_logs collection for Perplexity calls in the current billing period
 * and calculates estimated usage costs based on Sonar Pro pricing.
 *
 * @param data.periodStart - Optional custom period start (ISO string)
 * @param data.periodEnd - Optional custom period end (ISO string)
 * @returns PerplexityUsageResponse with usage metrics
 */
export const getPerplexityUsage = functions.onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: [/sos-expat\.com$/, /localhost/],
  },
  async (request): Promise<PerplexityUsageResponse> => {
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

    logger.info('[PerplexityUsage] Fetching Perplexity usage metrics', {
      uid: request.auth.uid,
    });

    try {
      // Determine the period
      const periodStart = request.data?.periodStart
        ? new Date(request.data.periodStart)
        : getBillingPeriodStart();
      const periodEnd = request.data?.periodEnd
        ? new Date(request.data.periodEnd)
        : getBillingPeriodEnd();

      // Query ai_call_logs for Perplexity calls
      const logsSnapshot = await db()
        .collection('ai_call_logs')
        .where('provider', '==', 'perplexity')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(periodEnd))
        .get();

      // Aggregate metrics
      let totalCalls = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalUnspecifiedTokens = 0;

      logsSnapshot.docs.forEach((doc) => {
        const data = doc.data() as PerplexityCallLog;
        totalCalls++;

        // Handle different token count scenarios
        if (data.inputTokens !== undefined && data.outputTokens !== undefined) {
          // Both specified
          totalInputTokens += data.inputTokens;
          totalOutputTokens += data.outputTokens;
        } else if (data.totalTokens !== undefined) {
          // Only total specified - estimate split
          totalUnspecifiedTokens += data.totalTokens;
        } else if (data.inputTokens !== undefined) {
          // Only input specified
          totalInputTokens += data.inputTokens;
        } else if (data.outputTokens !== undefined) {
          // Only output specified
          totalOutputTokens += data.outputTokens;
        }
        // If no tokens specified, we count the call but can't estimate tokens
      });

      // Distribute unspecified tokens using default ratio
      if (totalUnspecifiedTokens > 0) {
        const estimatedInput = Math.round(totalUnspecifiedTokens * PERPLEXITY_PRICING.DEFAULT_INPUT_RATIO);
        const estimatedOutput = totalUnspecifiedTokens - estimatedInput;
        totalInputTokens += estimatedInput;
        totalOutputTokens += estimatedOutput;
      }

      const totalTokens = totalInputTokens + totalOutputTokens;
      const estimatedCost = calculateCost(totalInputTokens, totalOutputTokens);

      // Round cost to 4 decimal places for precision
      const roundedCost = Math.round(estimatedCost * 10000) / 10000;

      logger.info('[PerplexityUsage] Metrics calculated', {
        totalCalls,
        totalTokens,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        estimatedCost: roundedCost,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });

      return {
        totalCalls,
        totalTokens,
        estimatedCost: roundedCost,
        currency: 'USD',
        periodStart,
        periodEnd,
      };
    } catch (error) {
      logger.error('[PerplexityUsage] Error fetching usage metrics:', error);
      throw new functions.HttpsError(
        'internal',
        'Failed to fetch Perplexity usage metrics'
      );
    }
  }
);
