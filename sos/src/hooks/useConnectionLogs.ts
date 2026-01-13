/**
 * useConnectionLogs Hook
 *
 * Hook for fetching and managing connection logs.
 * Calls: getConnectionLogs, getConnectionStats
 *
 * @module hooks/useConnectionLogs
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Event types for connection logging
 */
export type ConnectionEventType =
  | 'login'
  | 'logout'
  | 'token_refresh'
  | 'api_access'
  | 'admin_action';

/**
 * Services that can generate connection events
 */
export type ConnectionService =
  | 'firebase_auth'
  | 'admin_console'
  | 'twilio'
  | 'stripe'
  | 'google_cloud'
  | 'api';

/**
 * Geolocation data from IP
 */
export interface GeoLocation {
  country: string | null;
  city: string | null;
  region: string | null;
  countryCode?: string | null;
  timezone?: string | null;
  isp?: string | null;
}

/**
 * Device information
 */
export interface DeviceInfo {
  type?: string;
  os?: string;
  browser?: string;
  version?: string;
}

/**
 * Connection log entry
 */
export interface ConnectionLog {
  id: string;
  eventType: ConnectionEventType;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  service: ConnectionService;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: DeviceInfo | null;
  geoLocation: GeoLocation | null;
  timestamp: string;
  sessionId: string | null;
  metadata: Record<string, unknown>;
  expireAt: string;
}

/**
 * Peak hour entry
 */
export interface PeakHourEntry {
  hour: number;
  count: number;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  period: {
    start: string;
    end: string;
  };
  totalLogins: number;
  totalLogouts: number;
  uniqueUsers: number;
  loginsByDay: Array<{ date: string; count: number }>;
  loginsByService: Record<string, number>;
  topUsers: Array<{ userId: string; email: string | null; count: number }>;
  geoDistribution: Record<string, number>;
  failedLogins: number;
}

/**
 * Filters for connection logs
 */
export interface ConnectionLogsFilters {
  userId?: string;
  userEmail?: string;
  service?: ConnectionService | 'all';
  eventType?: ConnectionEventType | 'all';
  action?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  country?: string;
  searchQuery?: string;
}

/**
 * Hook options
 */
export interface UseConnectionLogsOptions {
  /** Initial filters */
  filters?: ConnectionLogsFilters;
  /** Items per page */
  pageSize?: number;
  /** Days for statistics (default: 7) */
  statsDays?: number;
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefreshInterval?: number;
  /** Load stats on mount */
  loadStatsOnMount?: boolean;
}

/**
 * Hook return type
 */
export interface UseConnectionLogsReturn {
  /** Connection log entries */
  logs: ConnectionLog[];
  /** Connection statistics */
  stats: ConnectionStats | null;
  /** Loading state for logs */
  isLoading: boolean;
  /** Loading state for stats */
  isLoadingStats: boolean;
  /** Error state */
  error: Error | null;
  /** Current filters */
  filters: ConnectionLogsFilters;
  /** Update filters */
  setFilters: (filters: ConnectionLogsFilters) => void;
  /** Load more logs */
  loadMore: () => Promise<void>;
  /** Has more logs to load */
  hasMore: boolean;
  /** Refresh logs */
  refresh: () => Promise<void>;
  /** Refresh stats */
  refreshStats: () => Promise<void>;
  /** Total log count */
  totalCount: number;
  /** Current page/offset */
  currentOffset: number;
  /** Export logs to CSV */
  exportToCSV: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_STATS_DAYS = 7;
const DEFAULT_FILTERS: ConnectionLogsFilters = {
  service: 'all',
  eventType: 'all',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert logs to CSV format
 */
function logsToCSV(logs: ConnectionLog[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Event Type',
    'Service',
    'Action',
    'User ID',
    'User Email',
    'User Role',
    'IP Address',
    'Country',
    'City',
    'Device Type',
    'Browser',
    'OS',
  ];

  const rows = logs.map((log) => [
    log.id,
    log.timestamp,
    log.eventType,
    log.service,
    log.action,
    log.userId || '',
    log.userEmail || '',
    log.userRole || '',
    log.ipAddress || '',
    log.geoLocation?.country || '',
    log.geoLocation?.city || '',
    log.deviceInfo?.type || '',
    log.deviceInfo?.browser || '',
    log.deviceInfo?.os || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useConnectionLogs(
  options: UseConnectionLogsOptions = {}
): UseConnectionLogsReturn {
  const {
    filters: initialFilters = DEFAULT_FILTERS,
    pageSize = DEFAULT_PAGE_SIZE,
    statsDays = DEFAULT_STATS_DAYS,
    autoRefreshInterval = 0,
    loadStatsOnMount = true,
  } = options;

  // State
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ConnectionLogsFilters>(initialFilters);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

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

  // Build API filters from hook filters
  const buildApiFilters = useMemo(() => {
    const apiFilters: Record<string, unknown> = {};

    if (filters.userId) {
      apiFilters.userId = filters.userId;
    }
    if (filters.service && filters.service !== 'all') {
      apiFilters.service = filters.service;
    }
    if (filters.eventType && filters.eventType !== 'all') {
      apiFilters.eventType = filters.eventType;
    }
    if (filters.action) {
      apiFilters.action = filters.action;
    }
    if (filters.startDate) {
      apiFilters.startDate = filters.startDate;
    }
    if (filters.endDate) {
      apiFilters.endDate = filters.endDate;
    }

    return apiFilters;
  }, [filters]);

  // Fetch connection logs
  const fetchLogs = useCallback(
    async (offset: number = 0, append: boolean = false): Promise<void> => {
      if (!isMounted.current) return;

      setIsLoading(true);
      setError(null);

      try {
        const callable = httpsCallable<
          Record<string, unknown>,
          {
            logs: ConnectionLog[];
            count: number;
            hasMore: boolean;
          }
        >(functions, 'getConnectionLogs');

        const result = await callable({
          ...buildApiFilters,
          limit: pageSize,
          offset,
        });

        if (!isMounted.current) return;

        const { logs: newLogs, count, hasMore: more } = result.data;

        if (append) {
          setLogs((prev) => [...prev, ...newLogs]);
        } else {
          setLogs(newLogs);
        }

        setTotalCount(count);
        setHasMore(more);
        setCurrentOffset(offset);
      } catch (err) {
        console.error('[useConnectionLogs] Fetch error:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch connection logs'));
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [buildApiFilters, pageSize]
  );

  // Fetch connection stats
  const fetchStats = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return;

    setIsLoadingStats(true);

    try {
      const callable = httpsCallable<{ days: number }, ConnectionStats>(
        functions,
        'getConnectionStats'
      );

      const result = await callable({ days: statsDays });

      if (isMounted.current) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('[useConnectionLogs] Stats fetch error:', err);
      // Don't set error for stats, they're optional
    } finally {
      if (isMounted.current) {
        setIsLoadingStats(false);
      }
    }
  }, [statsDays]);

  // Refresh logs
  const refresh = useCallback(async (): Promise<void> => {
    await fetchLogs(0, false);
  }, [fetchLogs]);

  // Refresh stats
  const refreshStats = useCallback(async (): Promise<void> => {
    await fetchStats();
  }, [fetchStats]);

  // Load more logs
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading) return;
    await fetchLogs(currentOffset + pageSize, true);
  }, [fetchLogs, hasMore, isLoading, currentOffset, pageSize]);

  // Update filters
  const handleSetFilters = useCallback((newFilters: ConnectionLogsFilters) => {
    setFilters(newFilters);
    setCurrentOffset(0);
    setHasMore(true);
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (logs.length === 0) return;

    const csvContent = logsToCSV(logs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `connection_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [logs]);

  // Initial fetch
  useEffect(() => {
    fetchLogs(0, false);
    if (loadStatsOnMount) {
      fetchStats();
    }
  }, [fetchLogs, fetchStats, loadStatsOnMount]);

  // Refetch when filters change
  useEffect(() => {
    fetchLogs(0, false);
  }, [filters, fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    refreshIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchLogs(0, false);
      }
    }, autoRefreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshInterval, fetchLogs]);

  return {
    logs,
    stats,
    isLoading,
    isLoadingStats,
    error,
    filters,
    setFilters: handleSetFilters,
    loadMore,
    hasMore,
    refresh,
    refreshStats,
    totalCount,
    currentOffset,
    exportToCSV,
  };
}

export default useConnectionLogs;
