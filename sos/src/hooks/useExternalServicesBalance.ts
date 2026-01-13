/**
 * useExternalServicesBalance Hook
 *
 * Hook to fetch all external service balances from Cloud Functions.
 * Calls: getTwilioBalance, getOpenAIUsage, getAnthropicUsage, getStripeBalance,
 * getFirebaseUsage, getPerplexityUsage
 *
 * @module hooks/useExternalServicesBalance
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Twilio balance response
 */
export interface TwilioBalance {
  balance: number;
  currency: string;
  accountSid: string;
  timestamp: Date;
}

/**
 * OpenAI usage response
 */
export interface OpenAIUsage {
  totalUsage: number;
  creditBalance: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  timestamp: Date;
  dailyUsage?: Array<{ date: string; usage: number }>;
}

/**
 * Anthropic usage response
 */
export interface AnthropicUsage {
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: 'USD';
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Stripe balance response
 */
export interface StripeBalance {
  available: number;
  pending: number;
  currency: string;
  timestamp: Date;
}

/**
 * Firebase usage response
 */
export interface FirebaseUsage {
  reads: number;
  writes: number;
  deletes: number;
  storageBytes: number;
  bandwidth: number;
  periodStart: Date;
  periodEnd: Date;
  timestamp: Date;
}

/**
 * Perplexity usage response
 */
export interface PerplexityUsage {
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  currency: 'USD';
  periodStart: Date;
  periodEnd: Date;
}

/**
 * All balances combined
 */
export interface ExternalServicesBalances {
  twilio: TwilioBalance | null;
  openai: OpenAIUsage | null;
  anthropic: AnthropicUsage | null;
  stripe: StripeBalance | null;
  firebase: FirebaseUsage | null;
  perplexity: PerplexityUsage | null;
}

/**
 * Individual service fetch status
 */
export interface ServiceFetchStatus {
  twilio: { loading: boolean; error: Error | null };
  openai: { loading: boolean; error: Error | null };
  anthropic: { loading: boolean; error: Error | null };
  stripe: { loading: boolean; error: Error | null };
  firebase: { loading: boolean; error: Error | null };
  perplexity: { loading: boolean; error: Error | null };
}

/**
 * Hook options
 */
export interface UseExternalServicesBalanceOptions {
  /** Enable auto-refresh (default: false) */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds (default: 5 minutes) */
  refreshInterval?: number;
  /** Period in days for usage calculation (default: 30) */
  periodDays?: number;
}

/**
 * Hook return type
 */
export interface UseExternalServicesBalanceReturn {
  /** All service balances */
  balances: ExternalServicesBalances;
  /** Overall loading state */
  isLoading: boolean;
  /** Overall error (if all services failed) */
  error: Error | null;
  /** Individual service status */
  serviceStatus: ServiceFetchStatus;
  /** Refresh all balances */
  refresh: () => Promise<void>;
  /** Refresh a specific service */
  refreshService: (service: keyof ExternalServicesBalances) => Promise<void>;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
  /** Total estimated monthly cost across all services */
  totalEstimatedCost: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PERIOD_DAYS = 30;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useExternalServicesBalance(
  options: UseExternalServicesBalanceOptions = {}
): UseExternalServicesBalanceReturn {
  const {
    autoRefresh = false,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    periodDays = DEFAULT_PERIOD_DAYS,
  } = options;

  // State
  const [balances, setBalances] = useState<ExternalServicesBalances>({
    twilio: null,
    openai: null,
    anthropic: null,
    stripe: null,
    firebase: null,
    perplexity: null,
  });

  const [serviceStatus, setServiceStatus] = useState<ServiceFetchStatus>({
    twilio: { loading: false, error: null },
    openai: { loading: false, error: null },
    anthropic: { loading: false, error: null },
    stripe: { loading: false, error: null },
    firebase: { loading: false, error: null },
    perplexity: { loading: false, error: null },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs
  const isMounted = useRef(true);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Update service status helper
  const updateServiceStatus = useCallback(
    (service: keyof ExternalServicesBalances, loading: boolean, error: Error | null) => {
      if (!isMounted.current) return;
      setServiceStatus((prev) => ({
        ...prev,
        [service]: { loading, error },
      }));
    },
    []
  );

  // Fetch Twilio balance
  const fetchTwilioBalance = useCallback(async (): Promise<TwilioBalance | null> => {
    updateServiceStatus('twilio', true, null);
    try {
      const callable = httpsCallable<void, TwilioBalance>(functions, 'getTwilioBalance');
      const result = await callable();
      updateServiceStatus('twilio', false, null);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch Twilio balance');
      updateServiceStatus('twilio', false, error);
      console.error('[useExternalServicesBalance] Twilio error:', err);
      return null;
    }
  }, [updateServiceStatus]);

  // Fetch OpenAI usage
  const fetchOpenAIUsage = useCallback(async (): Promise<OpenAIUsage | null> => {
    updateServiceStatus('openai', true, null);
    try {
      const callable = httpsCallable<{ periodDays: number }, OpenAIUsage>(
        functions,
        'getOpenAIUsage'
      );
      const result = await callable({ periodDays });
      updateServiceStatus('openai', false, null);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch OpenAI usage');
      updateServiceStatus('openai', false, error);
      console.error('[useExternalServicesBalance] OpenAI error:', err);
      return null;
    }
  }, [periodDays, updateServiceStatus]);

  // Fetch Anthropic usage
  const fetchAnthropicUsage = useCallback(async (): Promise<AnthropicUsage | null> => {
    updateServiceStatus('anthropic', true, null);
    try {
      const callable = httpsCallable<{ periodDays: number }, AnthropicUsage>(
        functions,
        'getAnthropicUsage'
      );
      const result = await callable({ periodDays });
      updateServiceStatus('anthropic', false, null);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch Anthropic usage');
      updateServiceStatus('anthropic', false, error);
      console.error('[useExternalServicesBalance] Anthropic error:', err);
      return null;
    }
  }, [periodDays, updateServiceStatus]);

  // Fetch Stripe balance
  const fetchStripeBalance = useCallback(async (): Promise<StripeBalance | null> => {
    updateServiceStatus('stripe', true, null);
    try {
      const callable = httpsCallable<void, StripeBalance>(functions, 'getStripeBalance');
      const result = await callable();
      updateServiceStatus('stripe', false, null);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch Stripe balance');
      updateServiceStatus('stripe', false, error);
      console.error('[useExternalServicesBalance] Stripe error:', err);
      return null;
    }
  }, [updateServiceStatus]);

  // Fetch Firebase usage
  const fetchFirebaseUsage = useCallback(async (): Promise<FirebaseUsage | null> => {
    updateServiceStatus('firebase', true, null);
    try {
      const callable = httpsCallable<{ periodDays: number }, FirebaseUsage>(
        functions,
        'getFirebaseUsage'
      );
      const result = await callable({ periodDays });
      updateServiceStatus('firebase', false, null);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch Firebase usage');
      updateServiceStatus('firebase', false, error);
      console.error('[useExternalServicesBalance] Firebase error:', err);
      return null;
    }
  }, [periodDays, updateServiceStatus]);

  // Fetch Perplexity usage
  const fetchPerplexityUsage = useCallback(async (): Promise<PerplexityUsage | null> => {
    updateServiceStatus('perplexity', true, null);
    try {
      const callable = httpsCallable<{ periodDays: number }, PerplexityUsage>(
        functions,
        'getPerplexityUsage'
      );
      const result = await callable({ periodDays });
      updateServiceStatus('perplexity', false, null);
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch Perplexity usage');
      updateServiceStatus('perplexity', false, error);
      console.error('[useExternalServicesBalance] Perplexity error:', err);
      return null;
    }
  }, [periodDays, updateServiceStatus]);

  // Refresh a specific service
  const refreshService = useCallback(
    async (service: keyof ExternalServicesBalances): Promise<void> => {
      let result: TwilioBalance | OpenAIUsage | AnthropicUsage | StripeBalance | FirebaseUsage | PerplexityUsage | null = null;

      switch (service) {
        case 'twilio':
          result = await fetchTwilioBalance();
          break;
        case 'openai':
          result = await fetchOpenAIUsage();
          break;
        case 'anthropic':
          result = await fetchAnthropicUsage();
          break;
        case 'stripe':
          result = await fetchStripeBalance();
          break;
        case 'firebase':
          result = await fetchFirebaseUsage();
          break;
        case 'perplexity':
          result = await fetchPerplexityUsage();
          break;
      }

      if (isMounted.current && result) {
        setBalances((prev) => ({
          ...prev,
          [service]: result,
        }));
      }
    },
    [
      fetchTwilioBalance,
      fetchOpenAIUsage,
      fetchAnthropicUsage,
      fetchStripeBalance,
      fetchFirebaseUsage,
      fetchPerplexityUsage,
    ]
  );

  // Refresh all balances
  const refresh = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all services in parallel
      const [twilio, openai, anthropic, stripe, firebase, perplexity] = await Promise.all([
        fetchTwilioBalance(),
        fetchOpenAIUsage(),
        fetchAnthropicUsage(),
        fetchStripeBalance(),
        fetchFirebaseUsage(),
        fetchPerplexityUsage(),
      ]);

      if (!isMounted.current) return;

      setBalances({
        twilio,
        openai,
        anthropic,
        stripe,
        firebase,
        perplexity,
      });

      setLastRefresh(new Date());

      // Check if all services failed
      const allFailed = !twilio && !openai && !anthropic && !stripe && !firebase && !perplexity;
      if (allFailed) {
        setError(new Error('Failed to fetch any service balance'));
      }
    } catch (err) {
      console.error('[useExternalServicesBalance] Refresh error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to refresh balances'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [
    fetchTwilioBalance,
    fetchOpenAIUsage,
    fetchAnthropicUsage,
    fetchStripeBalance,
    fetchFirebaseUsage,
    fetchPerplexityUsage,
  ]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    refreshIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        refresh();
      }
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Calculate total estimated monthly cost
  const totalEstimatedCost = useMemo(() => {
    let total = 0;

    // OpenAI usage cost
    if (balances.openai) {
      total += balances.openai.totalUsage;
    }

    // Anthropic estimated cost
    if (balances.anthropic) {
      total += balances.anthropic.estimatedCost;
    }

    // Perplexity estimated cost
    if (balances.perplexity) {
      total += balances.perplexity.estimatedCost;
    }

    return Math.round(total * 100) / 100;
  }, [balances.openai, balances.anthropic, balances.perplexity]);

  return {
    balances,
    isLoading,
    error,
    serviceStatus,
    refresh,
    refreshService,
    lastRefresh,
    totalEstimatedCost,
  };
}

export default useExternalServicesBalance;
