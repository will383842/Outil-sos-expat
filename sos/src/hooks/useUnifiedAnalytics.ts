/**
 * useUnifiedAnalytics Hook
 *
 * Hook for unified analytics data.
 * Calls: getUnifiedAnalytics, getHistoricalAnalytics
 *
 * @module hooks/useUnifiedAnalytics
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Period filter for analytics queries
 */
export type AnalyticsPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Filters for analytics queries
 */
export interface AnalyticsFilters {
  country?: string;
  serviceType?: 'lawyer' | 'expat' | 'all';
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
}

/**
 * User metrics
 */
export interface UserMetrics {
  dau: number;                    // Daily Active Users
  wau: number;                    // Weekly Active Users
  mau: number;                    // Monthly Active Users
  newClients: number;             // New client registrations
  newProviders: number;           // New provider registrations
  totalUsers: number;             // Total registered users
  totalProviders: number;         // Total registered providers
  churnRate: number;              // Churn rate (percentage)
  activeProviders: number;        // Providers with KYC complete and active
}

/**
 * Peak hour entry
 */
export interface PeakHourEntry {
  hour: number;                   // 0-23
  count: number;
}

/**
 * Call metrics
 */
export interface CallMetrics {
  callsInitiated: number;
  callsCompleted: number;
  callsFailed: number;
  callsCanceled: number;
  avgDurationSeconds: number;
  totalDurationMinutes: number;
  successRate: number;            // Percentage
  peakHours: PeakHourEntry[];     // Top 3 peak hours
  byStatus: Record<string, number>;
}

/**
 * Revenue by country
 */
export interface CountryRevenue {
  revenue: number;
  transactions: number;
  avgValue: number;
}

/**
 * Revenue metrics
 */
export interface RevenueMetrics {
  daily: number;                  // Revenue in cents
  weekly: number;
  monthly: number;
  totalRevenue: number;
  platformFees: number;           // Platform fees collected
  providerPayouts: number;        // Amount paid to providers
  averageTransactionValue: number;
  transactionCount: number;
  byCountry: Record<string, CountryRevenue>;
  byServiceType: {
    lawyer: number;
    expat: number;
  };
}

/**
 * Client conversion funnel
 */
export interface ClientFunnel {
  visitors: number;               // Total site visitors (from analytics if available)
  registered: number;             // Registered clients
  firstCall: number;              // Clients who made at least one call
  repeatCustomer: number;         // Clients with 2+ calls
  registrationRate: number;       // visitors -> registered (%)
  firstCallRate: number;          // registered -> first call (%)
  repeatRate: number;             // first call -> repeat (%)
}

/**
 * Provider conversion funnel
 */
export interface ProviderFunnel {
  registered: number;             // Registered providers
  kycComplete: number;            // Providers with KYC verified
  firstCall: number;              // Providers who received at least one call
  active: number;                 // Providers with 5+ calls in last 30 days
  kycCompletionRate: number;      // registered -> KYC complete (%)
  activationRate: number;         // KYC complete -> first call (%)
  retentionRate: number;          // first call -> active (%)
}

/**
 * Complete unified analytics response
 */
export interface UnifiedAnalytics {
  period: AnalyticsPeriod;
  filters: AnalyticsFilters;
  generatedAt: string;
  cached: boolean;
  users: UserMetrics;
  calls: CallMetrics;
  revenue: RevenueMetrics;
  funnel: {
    client: ClientFunnel;
    provider: ProviderFunnel;
  };
}

/**
 * Historical data entry
 */
export interface HistoricalDataEntry {
  date: string;
  dau: number;
  wau: number;
  mau: number;
  newClients: number;
  newProviders: number;
  callsCompleted: number;
  revenue: number;
  platformFees: number;
}

/**
 * Historical analytics response
 */
export interface HistoricalAnalytics {
  success: boolean;
  days: number;
  data: HistoricalDataEntry[];
}

/**
 * Hook options
 */
export interface UseUnifiedAnalyticsOptions {
  /** Initial period */
  period?: AnalyticsPeriod;
  /** Initial filters */
  filters?: AnalyticsFilters;
  /** Historical data days */
  historicalDays?: number;
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefreshInterval?: number;
  /** Load historical data on mount */
  loadHistoricalOnMount?: boolean;
}

/**
 * Hook return type
 */
export interface UseUnifiedAnalyticsReturn {
  /** Current analytics data */
  analytics: UnifiedAnalytics | null;
  /** Historical analytics data */
  historical: HistoricalAnalytics | null;
  /** Loading state for current analytics */
  isLoading: boolean;
  /** Loading state for historical analytics */
  isLoadingHistorical: boolean;
  /** Error state */
  error: Error | null;
  /** Current period */
  period: AnalyticsPeriod;
  /** Set period */
  setPeriod: (period: AnalyticsPeriod) => void;
  /** Current filters */
  filters: AnalyticsFilters;
  /** Set filters */
  setFilters: (filters: AnalyticsFilters) => void;
  /** Refresh current analytics */
  refresh: () => Promise<void>;
  /** Refresh historical analytics */
  refreshHistorical: (days?: number) => Promise<void>;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
  /** Computed KPIs for quick access */
  kpis: {
    totalRevenue: number;
    totalCalls: number;
    successRate: number;
    averageCallDuration: number;
    conversionRate: number;
    growthRate: number | null;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PERIOD: AnalyticsPeriod = 'month';
const DEFAULT_FILTERS: AnalyticsFilters = {
  serviceType: 'all',
};
const DEFAULT_HISTORICAL_DAYS = 30;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useUnifiedAnalytics(
  options: UseUnifiedAnalyticsOptions = {}
): UseUnifiedAnalyticsReturn {
  const {
    period: initialPeriod = DEFAULT_PERIOD,
    filters: initialFilters = DEFAULT_FILTERS,
    historicalDays = DEFAULT_HISTORICAL_DAYS,
    autoRefreshInterval = 0,
    loadHistoricalOnMount = true,
  } = options;

  // State
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null);
  const [historical, setHistorical] = useState<HistoricalAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
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

  // Fetch unified analytics
  const fetchAnalytics = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<
        { period: AnalyticsPeriod; filters: AnalyticsFilters },
        UnifiedAnalytics
      >(functions, 'getUnifiedAnalytics');

      const result = await callable({ period, filters });

      if (!isMounted.current) return;

      setAnalytics(result.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[useUnifiedAnalytics] Fetch error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [period, filters]);

  // Fetch historical analytics
  const fetchHistorical = useCallback(
    async (days: number = historicalDays): Promise<void> => {
      if (!isMounted.current) return;

      setIsLoadingHistorical(true);

      try {
        const callable = httpsCallable<{ days: number }, HistoricalAnalytics>(
          functions,
          'getHistoricalAnalytics'
        );

        const result = await callable({ days });

        if (isMounted.current) {
          setHistorical(result.data);
        }
      } catch (err) {
        console.error('[useUnifiedAnalytics] Historical fetch error:', err);
        // Don't set main error for historical data
      } finally {
        if (isMounted.current) {
          setIsLoadingHistorical(false);
        }
      }
    },
    [historicalDays]
  );

  // Refresh analytics
  const refresh = useCallback(async (): Promise<void> => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  // Refresh historical
  const refreshHistorical = useCallback(
    async (days?: number): Promise<void> => {
      await fetchHistorical(days);
    },
    [fetchHistorical]
  );

  // Update period
  const handleSetPeriod = useCallback((newPeriod: AnalyticsPeriod) => {
    setPeriod(newPeriod);
  }, []);

  // Update filters
  const handleSetFilters = useCallback((newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  }, []);

  // Compute KPIs
  const kpis = useMemo(() => {
    if (!analytics) {
      return {
        totalRevenue: 0,
        totalCalls: 0,
        successRate: 0,
        averageCallDuration: 0,
        conversionRate: 0,
        growthRate: null,
      };
    }

    // Calculate growth rate from historical data if available
    let growthRate: number | null = null;
    if (historical && historical.data.length >= 2) {
      const sortedData = [...historical.data].sort((a, b) => a.date.localeCompare(b.date));
      const latestWeek = sortedData.slice(-7);
      const previousWeek = sortedData.slice(-14, -7);

      if (previousWeek.length > 0) {
        const latestRevenue = latestWeek.reduce((sum, d) => sum + d.revenue, 0);
        const previousRevenue = previousWeek.reduce((sum, d) => sum + d.revenue, 0);

        if (previousRevenue > 0) {
          growthRate = Math.round(((latestRevenue - previousRevenue) / previousRevenue) * 100);
        }
      }
    }

    return {
      totalRevenue: analytics.revenue.totalRevenue,
      totalCalls: analytics.calls.callsCompleted,
      successRate: analytics.calls.successRate,
      averageCallDuration: analytics.calls.avgDurationSeconds,
      conversionRate: analytics.funnel.client.firstCallRate,
      growthRate,
    };
  }, [analytics, historical]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
    if (loadHistoricalOnMount) {
      fetchHistorical();
    }
  }, [fetchAnalytics, fetchHistorical, loadHistoricalOnMount]);

  // Refetch when period or filters change
  useEffect(() => {
    fetchAnalytics();
  }, [period, filters, fetchAnalytics]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    refreshIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchAnalytics();
      }
    }, autoRefreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshInterval, fetchAnalytics]);

  return {
    analytics,
    historical,
    isLoading,
    isLoadingHistorical,
    error,
    period,
    setPeriod: handleSetPeriod,
    filters,
    setFilters: handleSetFilters,
    refresh,
    refreshHistorical,
    lastRefresh,
    kpis,
  };
}

export default useUnifiedAnalytics;
