/**
 * OpenAI Usage Monitoring Cloud Function
 *
 * Fetches usage and cost information from OpenAI API using the new
 * Organization Usage API (2024+).
 *
 * Note: The old /v1/dashboard/billing/* endpoints are deprecated.
 * Credit balance information is no longer available via API.
 *
 * @version 2.0.0
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
  totalUsage: number;         // Total usage in USD
  totalTokens: number;        // Total tokens used
  inputTokens: number;        // Input/prompt tokens
  outputTokens: number;       // Output/completion tokens
  creditBalance: number;      // Remaining credit balance (not available via new API)
  currency: string;           // Currency code (USD)
  periodStart: Date;          // Start of billing period
  periodEnd: Date;            // End of billing period
  timestamp: Date;            // When this data was fetched
  dailyUsage?: DailyUsage[];  // Optional daily breakdown
  modelBreakdown?: ModelUsage[]; // Usage by model
  dataSource: 'usage_api' | 'costs_api' | 'estimated';
}

interface DailyUsage {
  date: string;
  usage: number;       // USD
  tokens: number;      // Total tokens
  inputTokens: number;
  outputTokens: number;
}

interface ModelUsage {
  model: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  costUSD: number;
}

// New OpenAI Usage API response types
interface OpenAIUsageAPIResponse {
  object: string;
  data: UsageBucket[];
  has_more: boolean;
  next_page?: string;
}

interface UsageBucket {
  object: string;
  start_time: number;
  end_time: number;
  results: UsageResult[];
}

interface UsageResult {
  object: string;
  input_tokens: number;
  output_tokens: number;
  num_model_requests: number;
  project_id?: string;
  user_id?: string;
  api_key_id?: string;
  model?: string;
  batch?: boolean;
  input_cached_tokens?: number;
  input_audio_tokens?: number;
  output_audio_tokens?: number;
}

// Costs API response types
interface OpenAICostsAPIResponse {
  object: string;
  data: CostBucket[];
  has_more: boolean;
  next_page?: string;
}

interface CostBucket {
  object: string;
  start_time: number;
  end_time: number;
  results: CostResult[];
}

interface CostResult {
  object: string;
  amount: {
    value: number;
    currency: string;
  };
  line_item?: string;
  project_id?: string;
}

// ============================================================================
// PRICING (approximate, for estimation fallback)
// ============================================================================

const MODEL_PRICING_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'whisper-1': { input: 0.006, output: 0 }, // per second
  'tts-1': { input: 15.00, output: 0 }, // per 1M characters
  'default': { input: 1.00, output: 2.00 },
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
    logger.error('[OpenAIUsage] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Fetches usage data from OpenAI Organization Usage API
 * Endpoint: GET /v1/organization/usage/completions
 */
async function fetchUsageAPI(
  apiKey: string,
  startTime: number,
  endTime: number,
  bucketWidth: '1m' | '1h' | '1d' = '1d'
): Promise<OpenAIUsageAPIResponse | null> {
  const url = new URL('https://api.openai.com/v1/organization/usage/completions');
  url.searchParams.set('start_time', startTime.toString());
  url.searchParams.set('end_time', endTime.toString());
  url.searchParams.set('bucket_width', bucketWidth);
  url.searchParams.set('group_by', 'model');

  logger.info('[OpenAIUsage] Fetching from Usage API', {
    startTime: new Date(startTime * 1000).toISOString(),
    endTime: new Date(endTime * 1000).toISOString(),
    bucketWidth,
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('[OpenAIUsage] Usage API failed', {
        status: response.status,
        error: errorText,
      });
      return null;
    }

    return response.json() as Promise<OpenAIUsageAPIResponse>;
  } catch (error) {
    logger.warn('[OpenAIUsage] Usage API error:', error);
    return null;
  }
}

/**
 * Fetches cost data from OpenAI Organization Costs API
 * Endpoint: GET /v1/organization/costs
 */
async function fetchCostsAPI(
  apiKey: string,
  startTime: number,
  endTime: number,
  bucketWidth: '1d' = '1d'
): Promise<OpenAICostsAPIResponse | null> {
  const url = new URL('https://api.openai.com/v1/organization/costs');
  url.searchParams.set('start_time', startTime.toString());
  url.searchParams.set('end_time', endTime.toString());
  url.searchParams.set('bucket_width', bucketWidth);

  logger.info('[OpenAIUsage] Fetching from Costs API', {
    startTime: new Date(startTime * 1000).toISOString(),
    endTime: new Date(endTime * 1000).toISOString(),
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('[OpenAIUsage] Costs API failed', {
        status: response.status,
        error: errorText,
      });
      return null;
    }

    return response.json() as Promise<OpenAICostsAPIResponse>;
  } catch (error) {
    logger.warn('[OpenAIUsage] Costs API error:', error);
    return null;
  }
}

/**
 * Estimates cost based on token usage and model pricing
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_PER_1M_TOKENS[model] || MODEL_PRICING_PER_1M_TOKENS['default'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Process usage data from the API response
 */
function processUsageData(usageData: OpenAIUsageAPIResponse): {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  modelBreakdown: ModelUsage[];
  dailyUsage: Map<string, DailyUsage>;
} {
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const modelMap = new Map<string, ModelUsage>();
  const dailyMap = new Map<string, DailyUsage>();

  for (const bucket of usageData.data) {
    const dateKey = new Date(bucket.start_time * 1000).toISOString().split('T')[0];

    for (const result of bucket.results) {
      const input = result.input_tokens || 0;
      const output = result.output_tokens || 0;
      const tokens = input + output;
      const model = result.model || 'unknown';

      totalTokens += tokens;
      inputTokens += input;
      outputTokens += output;

      // Aggregate by model
      const existing = modelMap.get(model) || {
        model,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
        costUSD: 0,
      };
      existing.tokens += tokens;
      existing.inputTokens += input;
      existing.outputTokens += output;
      existing.requests += result.num_model_requests || 0;
      existing.costUSD += estimateCost(model, input, output);
      modelMap.set(model, existing);

      // Aggregate by day
      const dailyExisting = dailyMap.get(dateKey) || {
        date: dateKey,
        usage: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      dailyExisting.tokens += tokens;
      dailyExisting.inputTokens += input;
      dailyExisting.outputTokens += output;
      dailyExisting.usage += estimateCost(model, input, output);
      dailyMap.set(dateKey, dailyExisting);
    }
  }

  return {
    totalTokens,
    inputTokens,
    outputTokens,
    modelBreakdown: Array.from(modelMap.values()).sort((a, b) => b.costUSD - a.costUSD),
    dailyUsage: dailyMap,
  };
}

/**
 * Process costs data from the API response
 */
function processCostsData(costsData: OpenAICostsAPIResponse): {
  totalCost: number;
  dailyCosts: Map<string, number>;
} {
  let totalCost = 0;
  const dailyCosts = new Map<string, number>();

  for (const bucket of costsData.data) {
    const dateKey = new Date(bucket.start_time * 1000).toISOString().split('T')[0];
    let dayCost = 0;

    for (const result of bucket.results) {
      const amount = result.amount?.value || 0;
      totalCost += amount;
      dayCost += amount;
    }

    dailyCosts.set(dateKey, (dailyCosts.get(dateKey) || 0) + dayCost);
  }

  return { totalCost, dailyCosts };
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getOpenAIUsage - Cloud Function onCall (admin only)
 *
 * Fetches OpenAI API usage metrics using the new Organization API.
 *
 * @param data.periodDays - Number of days to analyze (default: 30)
 * @returns OpenAIUsageResponse - Object containing usage metrics
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

      // Convert to Unix timestamps (seconds)
      const startTime = Math.floor(periodStart.getTime() / 1000);
      const endTime = Math.floor(periodEnd.getTime() / 1000);

      // Fetch data from both APIs in parallel
      const [usageData, costsData] = await Promise.all([
        fetchUsageAPI(apiKey, startTime, endTime, '1d'),
        fetchCostsAPI(apiKey, startTime, endTime, '1d'),
      ]);

      let totalUsage = 0;
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let dailyUsage: DailyUsage[] = [];
      let modelBreakdown: ModelUsage[] = [];
      let dataSource: 'usage_api' | 'costs_api' | 'estimated' = 'estimated';

      // Process Costs API data (preferred for financial data)
      if (costsData && costsData.data && costsData.data.length > 0) {
        const { totalCost, dailyCosts } = processCostsData(costsData);
        totalUsage = Math.round(totalCost * 100) / 100;
        dataSource = 'costs_api';

        // Merge daily costs with usage data if available
        dailyCosts.forEach((cost, date) => {
          const existing = dailyUsage.find(d => d.date === date);
          if (existing) {
            existing.usage = Math.round(cost * 100) / 100;
          } else {
            dailyUsage.push({
              date,
              usage: Math.round(cost * 100) / 100,
              tokens: 0,
              inputTokens: 0,
              outputTokens: 0,
            });
          }
        });
      }

      // Process Usage API data (for token details)
      if (usageData && usageData.data && usageData.data.length > 0) {
        const processed = processUsageData(usageData);
        totalTokens = processed.totalTokens;
        inputTokens = processed.inputTokens;
        outputTokens = processed.outputTokens;
        modelBreakdown = processed.modelBreakdown;

        if (dataSource === 'estimated') {
          dataSource = 'usage_api';
          // Estimate cost from usage if Costs API failed
          totalUsage = modelBreakdown.reduce((sum, m) => sum + m.costUSD, 0);
          totalUsage = Math.round(totalUsage * 100) / 100;
        }

        // Merge token data into daily usage
        processed.dailyUsage.forEach((usage, date) => {
          const existing = dailyUsage.find(d => d.date === date);
          if (existing) {
            existing.tokens = usage.tokens;
            existing.inputTokens = usage.inputTokens;
            existing.outputTokens = usage.outputTokens;
            if (existing.usage === 0) {
              existing.usage = Math.round(usage.usage * 100) / 100;
            }
          } else {
            dailyUsage.push({
              date,
              usage: Math.round(usage.usage * 100) / 100,
              tokens: usage.tokens,
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            });
          }
        });
      }

      // Sort daily usage by date
      dailyUsage.sort((a, b) => a.date.localeCompare(b.date));

      // Build response
      const response: OpenAIUsageResponse = {
        totalUsage,
        totalTokens,
        inputTokens,
        outputTokens,
        creditBalance: 0, // Not available via new API
        currency: 'USD',
        periodStart,
        periodEnd,
        timestamp: new Date(),
        dailyUsage: dailyUsage.length > 0 ? dailyUsage : undefined,
        modelBreakdown: modelBreakdown.length > 0 ? modelBreakdown : undefined,
        dataSource,
      };

      // Log metrics for audit
      logger.info('[OpenAIUsage] Metrics retrieved successfully', {
        period: `${periodDays} day(s)`,
        totalUsage: response.totalUsage,
        totalTokens: response.totalTokens,
        modelsUsed: modelBreakdown.length,
        dailyDataPoints: dailyUsage.length,
        dataSource,
      });

      // Save metrics to Firestore for historical tracking
      await db().collection('openai_usage_metrics').add({
        totalUsage: response.totalUsage,
        totalTokens: response.totalTokens,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        creditBalance: response.creditBalance,
        currency: response.currency,
        periodStart: admin.firestore.Timestamp.fromDate(periodStart),
        periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
        timestamp: admin.firestore.Timestamp.now(),
        fetchedBy: request.auth.uid,
        dataSource,
        modelBreakdown: modelBreakdown.slice(0, 10), // Top 10 models
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
