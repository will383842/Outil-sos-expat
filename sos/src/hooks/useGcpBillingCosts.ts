/**
 * useGcpBillingCosts Hook
 *
 * Hook to fetch detailed GCP billing costs from the getGcpBillingCosts Cloud Function.
 * Provides cost breakdown by service, region, SKU, and daily trends.
 *
 * @module hooks/useGcpBillingCosts
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface GcpServiceCost {
  serviceName: string;
  serviceId: string;
  cost: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export interface GcpRegionCost {
  region: string;
  country: string;
  cost: number;
  percentOfTotal: number;
  services: string[];
}

export interface GcpSkuCost {
  skuId: string;
  skuDescription: string;
  serviceName: string;
  cost: number;
  usage: number;
  usageUnit: string;
  region: string;
}

export interface GcpDailyCost {
  date: string;
  firestore: number;
  functions: number;
  storage: number;
  networking: number;
  other: number;
  total: number;
}

export interface GcpCostAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  service: string;
  message: string;
  currentCost: number;
  threshold: number;
  recommendation: string;
  timestamp: Date;
}

export interface GcpOptimizationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  potentialSavings: number;
  implementation: string;
  affectedResources: string[];
}

export interface GcpBillingCostsData {
  // Summary
  totalCost: number;
  previousPeriodCost: number;
  percentChange: number;
  currency: 'EUR' | 'USD';
  period: string;
  periodStart: Date;
  periodEnd: Date;

  // Breakdown
  costByService: GcpServiceCost[];
  costByRegion: GcpRegionCost[];
  topSkuCosts: GcpSkuCost[];
  dailyCosts: GcpDailyCost[];

  // Budget
  budgetLimit: number;
  budgetUsedPercent: number;
  monthlyForecast: number;

  // Alerts & Recommendations
  alerts: GcpCostAlert[];
  recommendations: GcpOptimizationRecommendation[];

  // Metadata
  timestamp: Date;
  dataSource: 'bigquery' | 'firestore' | 'estimated';
}

export interface UseGcpBillingCostsOptions {
  /** Period in days to analyze (default: 30) */
  periodDays?: number;
  /** Custom budget limit in EUR */
  budgetLimit?: number;
  /** Enable auto-refresh (default: false) */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds (default: 5 minutes) */
  refreshInterval?: number;
}

export interface UseGcpBillingCostsReturn {
  /** GCP billing costs data */
  data: GcpBillingCostsData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh data */
  refresh: () => Promise<void>;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
  /** Change period */
  setPeriodDays: (days: number) => void;
  /** Current period */
  periodDays: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PERIOD_DAYS = 30;
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useGcpBillingCosts(
  options: UseGcpBillingCostsOptions = {}
): UseGcpBillingCostsReturn {
  const {
    periodDays: initialPeriodDays = DEFAULT_PERIOD_DAYS,
    budgetLimit,
    autoRefresh = false,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
  } = options;

  // State
  const [data, setData] = useState<GcpBillingCostsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [periodDays, setPeriodDays] = useState(initialPeriodDays);

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

  // Fetch data
  const fetchData = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const callable = httpsCallable<
        { periodDays: number; budgetLimit?: number },
        GcpBillingCostsData
      >(functions, 'getGcpBillingCosts');

      const result = await callable({
        periodDays,
        budgetLimit,
      });

      if (!isMounted.current) return;

      // Convert date strings to Date objects
      const processedData: GcpBillingCostsData = {
        ...result.data,
        periodStart: new Date(result.data.periodStart),
        periodEnd: new Date(result.data.periodEnd),
        timestamp: new Date(result.data.timestamp),
        alerts: result.data.alerts.map((alert) => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
        })),
      };

      setData(processedData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[useGcpBillingCosts] Error fetching data:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch GCP billing costs'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [periodDays, budgetLimit]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    refreshIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchData();
      }
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  // Memoized return value
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refresh: fetchData,
      lastRefresh,
      setPeriodDays,
      periodDays,
    }),
    [data, isLoading, error, fetchData, lastRefresh, periodDays]
  );
}

export default useGcpBillingCosts;
