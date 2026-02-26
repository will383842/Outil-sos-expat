/**
 * useAiQuota Hook
 * Gestion des quotas et de l'utilisation IA
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  AiUsage,
  QuotaCheckResult,
  TrialConfig,
  DEFAULT_TRIAL_CONFIG
} from '../types/subscription';
import {
  getAiUsage,
  subscribeToAiUsage,
  checkAiQuota,
  getTrialConfig,
  subscribeToTrialConfig
} from '../services/subscription/subscriptionService';

interface UseAiQuotaReturn {
  // State
  usage: AiUsage | null;
  quotaCheck: QuotaCheckResult | null;
  trialConfig: TrialConfig;
  loading: boolean;
  error: string | null;

  // Computed values
  currentUsage: number;
  limit: number;
  remaining: number;
  usagePercentage: number;
  isUnlimited: boolean;

  // Trial info
  isInTrial: boolean;
  trialDaysRemaining: number;
  trialCallsRemaining: number;
  trialProgress: number; // 0-100 percentage of trial used

  // Status
  canMakeAiCall: boolean;
  isQuotaExhausted: boolean;
  isNearQuotaLimit: boolean; // > 80%
  blockReason: string | null;

  // Actions
  refreshQuota: () => Promise<void>;
  checkCanMakeCall: () => Promise<QuotaCheckResult>;
}

export function useAiQuota(): UseAiQuotaReturn {
  const { user } = useAuth();
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [quotaCheck, setQuotaCheck] = useState<QuotaCheckResult | null>(null);
  const [trialConfig, setTrialConfig] = useState<TrialConfig>(DEFAULT_TRIAL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to usage changes
  useEffect(() => {
    if (!user?.uid) {
      setUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToAiUsage(user.uid, (aiUsage) => {
      setUsage(aiUsage);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to trial config changes - ONLY when authenticated
  // Firestore rule: settings/{docId} requires isAuthenticated()
  useEffect(() => {
    // Don't subscribe if not authenticated - avoids permission error
    if (!user?.uid) {
      setTrialConfig(DEFAULT_TRIAL_CONFIG);
      return;
    }

    const unsubscribe = subscribeToTrialConfig((config) => {
      setTrialConfig(config);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Check quota on mount and when user changes
  // Note: Removed 'usage' from dependencies to prevent excessive re-checks
  // The quota is checked once on mount and can be manually refreshed via refreshQuota()
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      // Reset quota check for non-authenticated users
      setQuotaCheck(null);
      return;
    }

    const checkQuotaAsync = async () => {
      try {
        const result = await checkAiQuota(uid);
        setQuotaCheck(result);
        setError(null); // Clear error on success
      } catch (err: unknown) {
        // P2 FIX: Only log in development
        if (import.meta.env.DEV) {
          console.warn('[useAiQuota] Error checking quota (user may not have subscription):',
            err instanceof Error ? err.message : err
          );
        }
        // Set a safe fallback - allow access but with error state
        setQuotaCheck({
          allowed: false,
          reason: 'no_subscription',
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          isInTrial: false
        });
        // Only set error state for non-permission errors
        if (err instanceof Error && !err.message.includes('permissions')) {
          setError(err.message);
        }
      }
    };

    checkQuotaAsync();
  }, [user?.uid]);

  // Computed values
  const currentUsage = useMemo(() => {
    if (!quotaCheck) return 0;
    return quotaCheck.currentUsage;
  }, [quotaCheck]);

  const limit = useMemo(() => {
    if (!quotaCheck) return 0;
    return quotaCheck.limit;
  }, [quotaCheck]);

  const remaining = useMemo(() => {
    if (!quotaCheck) return 0;
    return quotaCheck.remaining;
  }, [quotaCheck]);

  const usagePercentage = useMemo(() => {
    if (!quotaCheck || quotaCheck.limit === -1) return 0;
    if (quotaCheck.limit === 0) return 100;
    return Math.min(100, Math.round((quotaCheck.currentUsage / quotaCheck.limit) * 100));
  }, [quotaCheck]);

  const isUnlimited = useMemo(() => {
    return quotaCheck?.limit === -1;
  }, [quotaCheck]);

  // Trial info
  const isInTrial = useMemo(() => {
    return quotaCheck?.isInTrial ?? false;
  }, [quotaCheck]);

  const trialDaysRemaining = useMemo(() => {
    return quotaCheck?.trialDaysRemaining ?? 0;
  }, [quotaCheck]);

  const trialCallsRemaining = useMemo(() => {
    return quotaCheck?.trialCallsRemaining ?? 0;
  }, [quotaCheck]);

  const trialProgress = useMemo(() => {
    if (!isInTrial || !trialConfig) return 0;

    const callsUsed = usage?.trialCallsUsed ?? 0;
    const callsProgress = (callsUsed / trialConfig.maxAiCalls) * 100;

    // We could also factor in days, but calls are the primary limiter
    return Math.min(100, Math.round(callsProgress));
  }, [isInTrial, trialConfig, usage]);

  // Status
  const canMakeAiCall = useMemo(() => {
    return quotaCheck?.allowed ?? false;
  }, [quotaCheck]);

  const isQuotaExhausted = useMemo(() => {
    return quotaCheck?.reason === 'quota_exhausted' ||
           quotaCheck?.reason === 'trial_calls_exhausted' ||
           quotaCheck?.reason === 'trial_expired';
  }, [quotaCheck]);

  const isNearQuotaLimit = useMemo(() => {
    if (isUnlimited) return false;
    return usagePercentage >= 80;
  }, [isUnlimited, usagePercentage]);

  // Map reason codes to i18n translation keys
  // Components should use intl.formatMessage({ id: blockReason }) to display the message
  const blockReason = useMemo((): string | null => {
    if (!quotaCheck?.reason) return null;

    const reasonToI18nKey: Record<string, string> = {
      trial_expired: 'subscription.errors.trialExpired',
      trial_calls_exhausted: 'subscription.errors.trialCallsExhausted',
      quota_exhausted: 'subscription.errors.quotaExhausted',
      subscription_expired: 'subscription.errors.subscriptionExpired',
      subscription_cancelled: 'subscription.errors.subscriptionCanceled',
      subscription_canceled: 'subscription.errors.subscriptionCanceled',
      payment_failed: 'subscription.errors.paymentFailed',
      no_subscription: 'subscription.errors.noSubscription'
    };

    return reasonToI18nKey[quotaCheck.reason] || 'subscription.errors.generic';
  }, [quotaCheck]);

  // Actions
  const refreshQuota = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const [aiUsage, quota] = await Promise.all([
        getAiUsage(user.uid),
        checkAiQuota(user.uid)
      ]);

      setUsage(aiUsage);
      setQuotaCheck(quota);
    } catch (err) {
      setError((err as Error).message || 'Failed to refresh quota');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const checkCanMakeCall = useCallback(async (): Promise<QuotaCheckResult> => {
    if (!user?.uid) {
      return {
        allowed: false,
        reason: 'no_subscription',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isInTrial: false
      };
    }

    try {
      const result = await checkAiQuota(user.uid);
      setQuotaCheck(result);
      return result;
    } catch (err) {
      setError((err as Error).message || 'Failed to check quota');
      throw err;
    }
  }, [user?.uid]);

  return {
    // State
    usage,
    quotaCheck,
    trialConfig,
    loading,
    error,

    // Computed values
    currentUsage,
    limit,
    remaining,
    usagePercentage,
    isUnlimited,

    // Trial info
    isInTrial,
    trialDaysRemaining,
    trialCallsRemaining,
    trialProgress,

    // Status
    canMakeAiCall,
    isQuotaExhausted,
    isNearQuotaLimit,
    blockReason,

    // Actions
    refreshQuota,
    checkCanMakeCall
  };
}

export default useAiQuota;
