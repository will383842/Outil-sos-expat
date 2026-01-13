/**
 * OpenAI Usage Monitoring Cloud Function
 *
 * Fetches usage and credit information from OpenAI API:
 * - Monthly usage costs
 * - Credit grants balance
 * - Subscription details
 *
 * @version 1.0.0
 * @admin-only This function is reserved for administrators
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';

// ============================================================================
// SECRETS
// ============================================================================

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// ============================================================================
// TYPES
// ============================================================================

interface OpenAIUsageResponse {
  totalUsage: number;         // Total usage in USD (cents converted to dollars)
  creditBalance: number;      // Remaining credit balance in USD
  currency: string;           // Currency code (USD)
  periodStart: Date;          // Start of billing period
  periodEnd: Date;            // End of billing period
  timestamp: Date;            // When this data was fetched
  dailyUsage?: DailyUsage[];  // Optional daily breakdown
}

interface DailyUsage {
  date: string;
  usage: number;  // USD
}

interface OpenAIBillingUsageResponse {
  object: string;
  total_usage: number;  // Usage in cents
  daily_costs?: Array<{
    timestamp: number;
    line_items: Array<{
      name: string;
      cost: number;
    }>;
  }>;
}

interface OpenAICreditGrantsResponse {
  object: string;
  total_granted: number;
  total_used: number;
  total_available: number;
  grants?: {
    data: Array<{
      object: string;
      id: string;
      grant_amount: number;
      used_amount: number;
      effective_at: number;
      expires_at: number;
    }>;
  };
}

interface OpenAISubscriptionResponse {
  object: string;
  has_payment_method: boolean;
  canceled: boolean;
  canceled_at: number | null;
  delinquent: boolean | null;
  access_until: number;
  soft_limit: number;
  hard_limit: number;
  system_hard_limit: number;
  soft_limit_usd: number;
  hard_limit_usd: number;
  system_hard_limit_usd: number;
  plan: {
    title: string;
    id: string;
  };
  account_name: string;
  po_number: string | null;
  billing_email: string | null;
  tax_ids: string[] | null;
  billing_address: object | null;
  business_address: string | null;
}

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
    logger.error('[OpenAIUsage] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Fetches billing usage from OpenAI API
 */
async function fetchBillingUsage(
  apiKey: string,
  startDate: Date,
  endDate: Date
): Promise<OpenAIBillingUsageResponse> {
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  const url = `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDateStr}&end_date=${endDateStr}`;

  logger.info('[OpenAIUsage] Fetching billing usage', {
    url,
    startDate: startDateStr,
    endDate: endDateStr,
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[OpenAIUsage] Failed to fetch billing usage', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<OpenAIBillingUsageResponse>;
}

/**
 * Fetches credit grants from OpenAI API
 */
async function fetchCreditGrants(apiKey: string): Promise<OpenAICreditGrantsResponse> {
  const url = 'https://api.openai.com/v1/dashboard/billing/credit_grants';

  logger.info('[OpenAIUsage] Fetching credit grants');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[OpenAIUsage] Failed to fetch credit grants', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    // Return default values if credit grants endpoint fails
    // (Some accounts may not have access to this endpoint)
    return {
      object: 'credit_summary',
      total_granted: 0,
      total_used: 0,
      total_available: 0,
    };
  }

  return response.json() as Promise<OpenAICreditGrantsResponse>;
}

/**
 * Fetches subscription info from OpenAI API
 */
async function fetchSubscription(apiKey: string): Promise<OpenAISubscriptionResponse | null> {
  const url = 'https://api.openai.com/v1/dashboard/billing/subscription';

  logger.info('[OpenAIUsage] Fetching subscription info');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn('[OpenAIUsage] Failed to fetch subscription (may not be available)', {
      status: response.status,
      error: errorText,
    });
    return null;
  }

  return response.json() as Promise<OpenAISubscriptionResponse>;
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getOpenAIUsage - Cloud Function onCall (admin only)
 *
 * Fetches OpenAI API usage and credit information.
 *
 * @param data.periodDays - Number of days to analyze (default: 30 for monthly)
 * @returns OpenAIUsageResponse - Object containing usage and credit metrics
 */
export const getOpenAIUsage = functions.onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: [OPENAI_API_KEY],
  },
  async (request): Promise<OpenAIUsageResponse> => {
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

    logger.info('[OpenAIUsage] Fetching OpenAI usage metrics', {
      uid: request.auth.uid,
    });

    try {
      // Get API key from secrets
      const apiKey = OPENAI_API_KEY.value().trim();

      if (!apiKey || !apiKey.startsWith('sk-')) {
        logger.error('[OpenAIUsage] Invalid or missing OPENAI_API_KEY');
        throw new functions.HttpsError(
          'failed-precondition',
          'OpenAI API key is not configured or invalid'
        );
      }

      // Determine the analysis period
      const periodDays = request.data?.periodDays || 30;
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Fetch data in parallel
      const [usageData, creditData, subscriptionData] = await Promise.all([
        fetchBillingUsage(apiKey, periodStart, periodEnd),
        fetchCreditGrants(apiKey),
        fetchSubscription(apiKey),
      ]);

      // Convert usage from cents to dollars
      const totalUsageUSD = (usageData.total_usage || 0) / 100;

      // Extract daily usage if available
      const dailyUsage: DailyUsage[] = [];
      if (usageData.daily_costs) {
        for (const day of usageData.daily_costs) {
          const totalDayCost = day.line_items.reduce((sum, item) => sum + item.cost, 0);
          dailyUsage.push({
            date: new Date(day.timestamp * 1000).toISOString().split('T')[0],
            usage: totalDayCost / 100,  // Convert to dollars
          });
        }
      }

      // Build response
      const response: OpenAIUsageResponse = {
        totalUsage: Math.round(totalUsageUSD * 100) / 100,  // Round to 2 decimals
        creditBalance: (creditData.total_available || 0) / 100,  // Convert to dollars
        currency: 'USD',
        periodStart,
        periodEnd,
        timestamp: new Date(),
        dailyUsage: dailyUsage.length > 0 ? dailyUsage : undefined,
      };

      // Log metrics for audit
      logger.info('[OpenAIUsage] Metrics retrieved successfully', {
        period: `${periodDays} day(s)`,
        totalUsage: response.totalUsage,
        creditBalance: response.creditBalance,
        hasSubscription: !!subscriptionData,
        subscriptionPlan: subscriptionData?.plan?.title || 'N/A',
        dailyDataPoints: dailyUsage.length,
      });

      // Save metrics to Firestore for historical tracking
      await db().collection('openai_usage_metrics').add({
        ...response,
        periodStart: admin.firestore.Timestamp.fromDate(periodStart),
        periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
        timestamp: admin.firestore.Timestamp.now(),
        fetchedBy: request.auth.uid,
        subscription: subscriptionData ? {
          plan: subscriptionData.plan?.title,
          hasPaymentMethod: subscriptionData.has_payment_method,
          softLimitUSD: subscriptionData.soft_limit_usd,
          hardLimitUSD: subscriptionData.hard_limit_usd,
        } : null,
        // TTL: keep 90 days of history
        expireAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        ),
      });

      return response;

    } catch (error) {
      const err = error as Error;
      logger.error('[OpenAIUsage] Error fetching metrics:', {
        errorName: err.name,
        errorMessage: err.message,
      });

      // Re-throw HttpsError as-is
      if (error instanceof functions.HttpsError) {
        throw error;
      }

      throw new functions.HttpsError(
        'internal',
        `Failed to fetch OpenAI usage metrics: ${err.message}`
      );
    }
  }
);
