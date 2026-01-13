/**
 * useServiceAlerts Hook
 *
 * Hook for service balance alerts management.
 * Calls: getServiceBalanceAlerts, acknowledgeServiceBalanceAlert, getServiceBalanceThresholds
 *
 * @module hooks/useServiceAlerts
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported external services for balance monitoring
 */
export type ServiceType = 'twilio' | 'openai' | 'anthropic' | 'perplexity' | 'stripe';

/**
 * Alert severity levels
 */
export type AlertLevel = 'warning' | 'critical';

/**
 * Service balance alert
 */
export interface ServiceBalanceAlert {
  id: string;
  service: ServiceType;
  currentBalance: number;
  threshold: number;
  currency: string;
  alertLevel: AlertLevel;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  isResolved: boolean;
  resolvedAt?: string;
}

/**
 * Threshold configuration for a service
 */
export interface ServiceBalanceThreshold {
  service: ServiceType;
  threshold: number;
  currency: string;
  alertLevel: AlertLevel;
  notifyEmails: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Update threshold input
 */
export interface UpdateThresholdInput {
  service: ServiceType;
  threshold?: number;
  currency?: string;
  alertLevel?: AlertLevel;
  notifyEmails?: string[];
  isActive?: boolean;
}

/**
 * Check result from manual trigger
 */
export interface ServiceCheckResult {
  service: ServiceType;
  balance: number | null;
  threshold: number;
  currency: string;
  alertTriggered: boolean;
  alertLevel: AlertLevel | null;
  error?: string;
}

/**
 * Hook options
 */
export interface UseServiceAlertsOptions {
  /** Include resolved alerts */
  includeResolved?: boolean;
  /** Maximum alerts to fetch */
  limit?: number;
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefreshInterval?: number;
  /** Load thresholds on mount */
  loadThresholdsOnMount?: boolean;
}

/**
 * Hook return type
 */
export interface UseServiceAlertsReturn {
  /** Active service alerts */
  alerts: ServiceBalanceAlert[];
  /** Threshold configurations */
  thresholds: ServiceBalanceThreshold[];
  /** Loading state for alerts */
  isLoading: boolean;
  /** Loading state for thresholds */
  isLoadingThresholds: boolean;
  /** Error state */
  error: Error | null;
  /** Acknowledge an alert */
  acknowledge: (alertId: string) => Promise<boolean>;
  /** Update threshold configuration */
  updateThreshold: (input: UpdateThresholdInput) => Promise<boolean>;
  /** Trigger manual balance check */
  triggerCheck: () => Promise<ServiceCheckResult[]>;
  /** Refresh alerts */
  refresh: () => Promise<void>;
  /** Refresh thresholds */
  refreshThresholds: () => Promise<void>;
  /** Unacknowledged alerts count */
  unacknowledgedCount: number;
  /** Critical alerts count */
  criticalCount: number;
  /** Action loading states */
  actionLoading: {
    acknowledge: boolean;
    updateThreshold: boolean;
    triggerCheck: boolean;
  };
  /** Get alerts by service */
  getAlertsByService: (service: ServiceType) => ServiceBalanceAlert[];
  /** Get threshold by service */
  getThresholdByService: (service: ServiceType) => ServiceBalanceThreshold | undefined;
  /** Check if service has active alert */
  hasActiveAlert: (service: ServiceType) => boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIMIT = 50;
const DEFAULT_OPTIONS: UseServiceAlertsOptions = {
  includeResolved: false,
  limit: DEFAULT_LIMIT,
  autoRefreshInterval: 0,
  loadThresholdsOnMount: true,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useServiceAlerts(
  options: UseServiceAlertsOptions = {}
): UseServiceAlertsReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const {
    includeResolved,
    limit,
    autoRefreshInterval,
    loadThresholdsOnMount,
  } = mergedOptions;

  // State
  const [alerts, setAlerts] = useState<ServiceBalanceAlert[]>([]);
  const [thresholds, setThresholds] = useState<ServiceBalanceThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThresholds, setIsLoadingThresholds] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [actionLoading, setActionLoading] = useState({
    acknowledge: false,
    updateThreshold: false,
    triggerCheck: false,
  });

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

  // Fetch alerts
  const fetchAlerts = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<
        { includeResolved: boolean; limit: number },
        { alerts: ServiceBalanceAlert[] }
      >(functions, 'getServiceBalanceAlerts');

      const result = await callable({
        includeResolved: includeResolved || false,
        limit: limit || DEFAULT_LIMIT,
      });

      if (isMounted.current) {
        setAlerts(result.data.alerts);
      }
    } catch (err) {
      console.error('[useServiceAlerts] Fetch alerts error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [includeResolved, limit]);

  // Fetch thresholds
  const fetchThresholds = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsLoadingThresholds(true);

    try {
      const callable = httpsCallable<void, { thresholds: ServiceBalanceThreshold[] }>(
        functions,
        'getServiceBalanceThresholds'
      );

      const result = await callable();

      if (isMounted.current) {
        setThresholds(result.data.thresholds);
      }
    } catch (err) {
      console.error('[useServiceAlerts] Fetch thresholds error:', err);
      // Don't set main error for thresholds
    } finally {
      if (isMounted.current) {
        setIsLoadingThresholds(false);
      }
    }
  }, []);

  // Acknowledge alert
  const acknowledge = useCallback(async (alertId: string): Promise<boolean> => {
    setActionLoading((prev) => ({ ...prev, acknowledge: true }));

    try {
      const callable = httpsCallable<{ alertId: string }, { success: boolean }>(
        functions,
        'acknowledgeServiceBalanceAlert'
      );

      const result = await callable({ alertId });

      if (result.data.success && isMounted.current) {
        // Update local state
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  acknowledgedAt: new Date().toISOString(),
                }
              : alert
          )
        );
      }

      return result.data.success;
    } catch (err) {
      console.error('[useServiceAlerts] Acknowledge error:', err);
      return false;
    } finally {
      if (isMounted.current) {
        setActionLoading((prev) => ({ ...prev, acknowledge: false }));
      }
    }
  }, []);

  // Update threshold
  const updateThreshold = useCallback(
    async (input: UpdateThresholdInput): Promise<boolean> => {
      setActionLoading((prev) => ({ ...prev, updateThreshold: true }));

      try {
        const callable = httpsCallable<
          UpdateThresholdInput,
          { success: boolean; threshold: ServiceBalanceThreshold }
        >(functions, 'updateServiceBalanceThreshold');

        const result = await callable(input);

        if (result.data.success && isMounted.current) {
          // Update local state
          setThresholds((prev) => {
            const index = prev.findIndex((t) => t.service === input.service);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = result.data.threshold;
              return updated;
            }
            return [...prev, result.data.threshold];
          });
        }

        return result.data.success;
      } catch (err) {
        console.error('[useServiceAlerts] Update threshold error:', err);
        return false;
      } finally {
        if (isMounted.current) {
          setActionLoading((prev) => ({ ...prev, updateThreshold: false }));
        }
      }
    },
    []
  );

  // Trigger manual balance check
  const triggerCheck = useCallback(async (): Promise<ServiceCheckResult[]> => {
    setActionLoading((prev) => ({ ...prev, triggerCheck: true }));

    try {
      const callable = httpsCallable<void, { results: ServiceCheckResult[] }>(
        functions,
        'triggerServiceBalanceCheck'
      );

      const result = await callable();

      // Refresh alerts after check (new alerts may have been created)
      if (isMounted.current) {
        await fetchAlerts();
      }

      return result.data.results;
    } catch (err) {
      console.error('[useServiceAlerts] Trigger check error:', err);
      return [];
    } finally {
      if (isMounted.current) {
        setActionLoading((prev) => ({ ...prev, triggerCheck: false }));
      }
    }
  }, [fetchAlerts]);

  // Refresh alerts
  const refresh = useCallback(async (): Promise<void> => {
    await fetchAlerts();
  }, [fetchAlerts]);

  // Refresh thresholds
  const refreshThresholds = useCallback(async (): Promise<void> => {
    await fetchThresholds();
  }, [fetchThresholds]);

  // Get alerts by service
  const getAlertsByService = useCallback(
    (service: ServiceType): ServiceBalanceAlert[] => {
      return alerts.filter((a) => a.service === service);
    },
    [alerts]
  );

  // Get threshold by service
  const getThresholdByService = useCallback(
    (service: ServiceType): ServiceBalanceThreshold | undefined => {
      return thresholds.find((t) => t.service === service);
    },
    [thresholds]
  );

  // Check if service has active alert
  const hasActiveAlert = useCallback(
    (service: ServiceType): boolean => {
      return alerts.some((a) => a.service === service && !a.isResolved);
    },
    [alerts]
  );

  // Compute counts
  const unacknowledgedCount = useMemo(() => {
    return alerts.filter((a) => !a.acknowledgedAt && !a.isResolved).length;
  }, [alerts]);

  const criticalCount = useMemo(() => {
    return alerts.filter((a) => a.alertLevel === 'critical' && !a.isResolved).length;
  }, [alerts]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
    if (loadThresholdsOnMount) {
      fetchThresholds();
    }
  }, [fetchAlerts, fetchThresholds, loadThresholdsOnMount]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    refreshIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchAlerts();
      }
    }, autoRefreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshInterval, fetchAlerts]);

  return {
    alerts,
    thresholds,
    isLoading,
    isLoadingThresholds,
    error,
    acknowledge,
    updateThreshold,
    triggerCheck,
    refresh,
    refreshThresholds,
    unacknowledgedCount,
    criticalCount,
    actionLoading,
    getAlertsByService,
    getThresholdByService,
    hasActiveAlert,
  };
}

export default useServiceAlerts;
