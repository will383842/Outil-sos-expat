/**
 * useCostMonitoring Hook
 * Gestion des donnees de cost monitoring avec loading states, refresh automatique et real-time
 *
 * @module hooks/useCostMonitoring
 * @description Hook React pour gerer les metriques de couts, alertes et rate limiting
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CostMetric,
  CostMetricsSummary,
  RateLimitStats,
  RateLimitSummary,
  CostAlert,
  MonthlyEstimate,
  TwilioUsage,
  CostService,
  fetchCostMetrics,
  fetchCostMetricsSummary,
  fetchRateLimitStats,
  fetchRateLimitSummary,
  fetchRecentCostAlerts,
  fetchTwilioUsage,
  calculateEstimatedMonthlyCost,
  subscribeToCostAlerts,
  subscribeToCostMetrics,
  subscribeToRateLimitStats,
  clearCostMonitoringCache,
} from '../services/costMonitoringService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Periode de temps pour les metriques
 */
export type CostPeriod = 'current' | 'previous' | string; // string = 'YYYY-MM'

/**
 * Options de configuration du hook
 */
export interface UseCostMonitoringOptions {
  /** Activer le refresh automatique (defaut: true) */
  autoRefresh?: boolean;
  /** Intervalle de refresh en ms (defaut: 5 minutes = 300000) */
  refreshInterval?: number;
  /** Activer les subscriptions temps reel (defaut: false pour economiser les couts) */
  realtime?: boolean;
  /** Filtrer par service specifique */
  service?: CostService;
  /** Nombre de jours pour les alertes recentes (defaut: 7) */
  alertDays?: number;
}

/**
 * Etat des metriques de couts
 */
export interface CostMetricsState {
  /** Liste des metriques detaillees */
  metrics: CostMetric[];
  /** Resume des metriques */
  summary: CostMetricsSummary | null;
  /** Estimation mensuelle */
  estimate: MonthlyEstimate | null;
  /** Usage Twilio */
  twilioUsage: TwilioUsage | null;
}

/**
 * Valeur de retour du hook
 */
export interface UseCostMonitoringReturn {
  // Data
  /** Etat des metriques de couts */
  metrics: CostMetricsState;
  /** Alertes actives non acquittees */
  alerts: CostAlert[];
  /** Statistiques de rate limiting */
  rateLimits: RateLimitStats[];
  /** Resume du rate limiting */
  rateLimitSummary: RateLimitSummary | null;

  // Loading states
  /** Chargement initial en cours */
  loading: boolean;
  /** Chargement des metriques en cours */
  loadingMetrics: boolean;
  /** Chargement des alertes en cours */
  loadingAlerts: boolean;
  /** Chargement du rate limiting en cours */
  loadingRateLimits: boolean;
  /** Refresh en cours */
  isRefreshing: boolean;

  // Error handling
  /** Erreur globale */
  error: Error | null;

  // Computed values
  /** Cout total de la periode */
  totalCost: number;
  /** Nombre d'alertes critiques */
  criticalAlertsCount: number;
  /** Nombre d'endpoints bloques */
  blockedEndpointsCount: number;
  /** Taux de rejet global */
  globalRejectionRate: number;

  // Actions
  /** Charge les metriques pour une periode specifique */
  fetchMetrics: (period?: CostPeriod) => Promise<void>;
  /** Rafraichit toutes les donnees */
  refresh: () => Promise<void>;
  /** Vide le cache local */
  clearCache: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Intervalle de refresh par defaut (5 minutes) */
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000;

/** Nombre de jours par defaut pour les alertes */
const DEFAULT_ALERT_DAYS = 7;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtient la periode actuelle au format YYYY-MM
 */
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Obtient la periode precedente au format YYYY-MM
 */
function getPreviousPeriod(): string {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
}

/**
 * Resout une periode en format YYYY-MM
 */
function resolvePeriod(period: CostPeriod): string {
  if (period === 'current') return getCurrentPeriod();
  if (period === 'previous') return getPreviousPeriod();
  return period;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useCostMonitoring(options: UseCostMonitoringOptions = {}): UseCostMonitoringReturn {
  const {
    autoRefresh = true,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    realtime = false,
    service,
    alertDays = DEFAULT_ALERT_DAYS,
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  // Metrics state
  const [metricsData, setMetricsData] = useState<CostMetric[]>([]);
  const [metricsSummary, setMetricsSummary] = useState<CostMetricsSummary | null>(null);
  const [monthlyEstimate, setMonthlyEstimate] = useState<MonthlyEstimate | null>(null);
  const [twilioUsage, setTwilioUsage] = useState<TwilioUsage | null>(null);

  // Alerts state
  const [alerts, setAlerts] = useState<CostAlert[]>([]);

  // Rate limits state
  const [rateLimits, setRateLimits] = useState<RateLimitStats[]>([]);
  const [rateLimitSummary, setRateLimitSummary] = useState<RateLimitSummary | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingRateLimits, setLoadingRateLimits] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Error state
  const [error, setError] = useState<Error | null>(null);

  // Current period
  const [currentPeriod, setCurrentPeriod] = useState<string>(getCurrentPeriod());

  // ============================================================================
  // REFS
  // ============================================================================

  const isMounted = useRef(true);
  const unsubscribeMetrics = useRef<(() => void) | null>(null);
  const unsubscribeAlerts = useRef<(() => void) | null>(null);
  const unsubscribeRateLimits = useRef<(() => void) | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Cleanup subscriptions
      if (unsubscribeMetrics.current) {
        unsubscribeMetrics.current();
        unsubscribeMetrics.current = null;
      }
      if (unsubscribeAlerts.current) {
        unsubscribeAlerts.current();
        unsubscribeAlerts.current = null;
      }
      if (unsubscribeRateLimits.current) {
        unsubscribeRateLimits.current();
        unsubscribeRateLimits.current = null;
      }

      // Cleanup interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  // ============================================================================
  // FETCH FUNCTIONS
  // ============================================================================

  /**
   * Charge les metriques de couts pour une periode
   */
  const fetchMetricsData = useCallback(async (period: CostPeriod = 'current') => {
    if (!isMounted.current) return;

    setLoadingMetrics(true);
    setError(null);

    try {
      const resolvedPeriod = resolvePeriod(period);
      setCurrentPeriod(resolvedPeriod);

      // Fetch en parallele pour optimiser
      const [metrics, summary, estimate, twilio] = await Promise.all([
        fetchCostMetrics(resolvedPeriod, service),
        fetchCostMetricsSummary(resolvedPeriod),
        calculateEstimatedMonthlyCost(),
        fetchTwilioUsage(resolvedPeriod),
      ]);

      if (!isMounted.current) return;

      setMetricsData(metrics);
      setMetricsSummary(summary);
      setMonthlyEstimate(estimate);
      setTwilioUsage(twilio);
    } catch (err) {
      console.error('[useCostMonitoring] Error fetching metrics:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch cost metrics'));
      }
    } finally {
      if (isMounted.current) {
        setLoadingMetrics(false);
      }
    }
  }, [service]);

  /**
   * Charge les alertes de couts
   */
  const fetchAlertsData = useCallback(async () => {
    if (!isMounted.current) return;

    setLoadingAlerts(true);

    try {
      const recentAlerts = await fetchRecentCostAlerts(alertDays);

      if (!isMounted.current) return;

      // Filtrer pour ne garder que les alertes non acquittees
      const activeAlerts = recentAlerts.filter(alert => !alert.acknowledgedAt);
      setAlerts(activeAlerts);
    } catch (err) {
      console.error('[useCostMonitoring] Error fetching alerts:', err);
      // Ne pas propager l'erreur pour les alertes, ce n'est pas bloquant
    } finally {
      if (isMounted.current) {
        setLoadingAlerts(false);
      }
    }
  }, [alertDays]);

  /**
   * Charge les stats de rate limiting
   */
  const fetchRateLimitsData = useCallback(async () => {
    if (!isMounted.current) return;

    setLoadingRateLimits(true);

    try {
      const [stats, summary] = await Promise.all([
        fetchRateLimitStats(),
        fetchRateLimitSummary(),
      ]);

      if (!isMounted.current) return;

      setRateLimits(stats);
      setRateLimitSummary(summary);
    } catch (err) {
      console.error('[useCostMonitoring] Error fetching rate limits:', err);
      // Ne pas propager l'erreur pour le rate limiting, ce n'est pas bloquant
    } finally {
      if (isMounted.current) {
        setLoadingRateLimits(false);
      }
    }
  }, []);

  /**
   * Charge toutes les donnees
   */
  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!isMounted.current) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      await Promise.all([
        fetchMetricsData(currentPeriod),
        fetchAlertsData(),
        fetchRateLimitsData(),
      ]);
    } catch (err) {
      console.error('[useCostMonitoring] Error fetching all data:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch cost monitoring data'));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [currentPeriod, fetchMetricsData, fetchAlertsData, fetchRateLimitsData]);

  // ============================================================================
  // REALTIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!realtime) return;

    // Subscribe to cost metrics
    unsubscribeMetrics.current = subscribeToCostMetrics((metrics) => {
      if (isMounted.current) {
        setMetricsData(metrics);
      }
    }, currentPeriod);

    // Subscribe to cost alerts
    unsubscribeAlerts.current = subscribeToCostAlerts(
      (alertsData) => {
        if (isMounted.current) {
          // Filtrer pour ne garder que les alertes non acquittees
          const activeAlerts = alertsData.filter(alert => !alert.acknowledgedAt);
          setAlerts(activeAlerts);
        }
      },
      { unacknowledgedOnly: true }
    );

    // Subscribe to rate limit stats
    unsubscribeRateLimits.current = subscribeToRateLimitStats((stats) => {
      if (isMounted.current) {
        setRateLimits(stats);
      }
    });

    return () => {
      if (unsubscribeMetrics.current) {
        unsubscribeMetrics.current();
        unsubscribeMetrics.current = null;
      }
      if (unsubscribeAlerts.current) {
        unsubscribeAlerts.current();
        unsubscribeAlerts.current = null;
      }
      if (unsubscribeRateLimits.current) {
        unsubscribeRateLimits.current();
        unsubscribeRateLimits.current = null;
      }
    };
  }, [realtime, currentPeriod]);

  // ============================================================================
  // INITIAL LOAD
  // ============================================================================

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ============================================================================
  // AUTO-REFRESH
  // ============================================================================

  useEffect(() => {
    if (!autoRefresh || realtime) return;

    refreshIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchAllData(true);
      }
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, realtime, refreshInterval, fetchAllData]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalCost = useMemo(() => {
    return metricsSummary?.totalCost ?? 0;
  }, [metricsSummary]);

  const criticalAlertsCount = useMemo(() => {
    return alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length;
  }, [alerts]);

  const blockedEndpointsCount = useMemo(() => {
    return rateLimitSummary?.blockedEndpoints ?? 0;
  }, [rateLimitSummary]);

  const globalRejectionRate = useMemo(() => {
    return rateLimitSummary?.rejectionRate ?? 0;
  }, [rateLimitSummary]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Charge les metriques pour une periode specifique
   */
  const fetchMetrics = useCallback(async (period: CostPeriod = 'current') => {
    await fetchMetricsData(period);
  }, [fetchMetricsData]);

  /**
   * Rafraichit toutes les donnees
   */
  const refresh = useCallback(async () => {
    clearCostMonitoringCache();
    await fetchAllData(true);
  }, [fetchAllData]);

  /**
   * Vide le cache local
   */
  const clearCache = useCallback(() => {
    clearCostMonitoringCache();
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    metrics: {
      metrics: metricsData,
      summary: metricsSummary,
      estimate: monthlyEstimate,
      twilioUsage,
    },
    alerts,
    rateLimits,
    rateLimitSummary,

    // Loading states
    loading,
    loadingMetrics,
    loadingAlerts,
    loadingRateLimits,
    isRefreshing,

    // Error handling
    error,

    // Computed values
    totalCost,
    criticalAlertsCount,
    blockedEndpointsCount,
    globalRejectionRate,

    // Actions
    fetchMetrics,
    refresh,
    clearCache,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook simplifie pour les alertes de couts uniquement
 */
export function useCostAlerts(options: { days?: number; realtime?: boolean } = {}) {
  const { days = 7, realtime = false } = options;

  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  const unsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMounted.current = true;

    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const data = await fetchRecentCostAlerts(days);
        if (isMounted.current) {
          setAlerts(data.filter(a => !a.acknowledgedAt));
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    if (realtime) {
      unsubscribe.current = subscribeToCostAlerts(
        (data) => {
          if (isMounted.current) {
            setAlerts(data.filter(a => !a.acknowledgedAt));
            setLoading(false);
          }
        },
        { unacknowledgedOnly: true }
      );
    } else {
      fetchAlerts();
    }

    return () => {
      isMounted.current = false;
      if (unsubscribe.current) {
        unsubscribe.current();
      }
    };
  }, [days, realtime]);

  const criticalCount = useMemo(() => {
    return alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length;
  }, [alerts]);

  const warningCount = useMemo(() => {
    return alerts.filter(a => a.severity === 'warning').length;
  }, [alerts]);

  return {
    alerts,
    loading,
    error,
    criticalCount,
    warningCount,
    totalCount: alerts.length,
  };
}

/**
 * Hook simplifie pour le rate limiting uniquement
 */
export function useRateLimitStats(options: { realtime?: boolean } = {}) {
  const { realtime = false } = options;

  const [stats, setStats] = useState<RateLimitStats[]>([]);
  const [summary, setSummary] = useState<RateLimitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  const unsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, summaryData] = await Promise.all([
          fetchRateLimitStats(),
          fetchRateLimitSummary(),
        ]);
        if (isMounted.current) {
          setStats(statsData);
          setSummary(summaryData);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch rate limits'));
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    if (realtime) {
      unsubscribe.current = subscribeToRateLimitStats((data) => {
        if (isMounted.current) {
          setStats(data);
          setLoading(false);
        }
      });
      // Also fetch summary (not available in realtime)
      fetchRateLimitSummary().then(data => {
        if (isMounted.current) {
          setSummary(data);
        }
      });
    } else {
      fetchData();
    }

    return () => {
      isMounted.current = false;
      if (unsubscribe.current) {
        unsubscribe.current();
      }
    };
  }, [realtime]);

  const criticalEndpoints = useMemo(() => {
    return stats.filter(s => s.percentageUsed > 90 && !s.isBlocked);
  }, [stats]);

  const blockedEndpoints = useMemo(() => {
    return stats.filter(s => s.isBlocked);
  }, [stats]);

  return {
    stats,
    summary,
    loading,
    error,
    criticalEndpoints,
    blockedEndpoints,
    criticalCount: criticalEndpoints.length,
    blockedCount: blockedEndpoints.length,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default useCostMonitoring;
