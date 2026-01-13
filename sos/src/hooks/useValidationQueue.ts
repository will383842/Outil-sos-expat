/**
 * useValidationQueue Hook
 *
 * Hook to manage provider profile validation queue.
 * Calls: getValidationQueue, assignValidation, approveProfile, rejectProfile, requestChanges
 *
 * @module hooks/useValidationQueue
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Validation status types
 */
export type ValidationStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

/**
 * Provider profile in validation queue
 */
export interface ValidationQueueItem {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  profileType: 'lawyer' | 'expat';
  status: ValidationStatus;
  submittedAt: Date;
  assignedTo: string | null;
  assignedAt: Date | null;
  lastUpdatedAt: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  country: string;
  documents: ValidationDocument[];
  changeLog: ValidationChangeLogEntry[];
  notes: string;
}

/**
 * Document attached to validation request
 */
export interface ValidationDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: Date;
  verified: boolean;
}

/**
 * Change log entry
 */
export interface ValidationChangeLogEntry {
  action: string;
  performedBy: string;
  performedAt: Date;
  details: string;
}

/**
 * Validation queue statistics
 */
export interface ValidationQueueStats {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  changesRequested: number;
  avgProcessingTimeHours: number;
  byCountry: Record<string, number>;
  byProfileType: { lawyer: number; expat: number };
}

/**
 * Filters for validation queue
 */
export interface ValidationQueueFilters {
  status?: ValidationStatus | 'all';
  profileType?: 'lawyer' | 'expat' | 'all';
  country?: string;
  assignedTo?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'all';
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

/**
 * Request changes input
 */
export interface RequestChangesInput {
  validationId: string;
  reason: string;
  requiredChanges: string[];
  deadline?: string;
}

/**
 * Rejection input
 */
export interface RejectionInput {
  validationId: string;
  reason: string;
  permanent: boolean;
}

/**
 * Hook options
 */
export interface UseValidationQueueOptions {
  /** Initial filters */
  filters?: ValidationQueueFilters;
  /** Items per page */
  pageSize?: number;
  /** Auto-refresh interval in ms (0 to disable) */
  autoRefreshInterval?: number;
}

/**
 * Hook return type
 */
export interface UseValidationQueueReturn {
  /** Validation queue items */
  queue: ValidationQueueItem[];
  /** Queue statistics */
  stats: ValidationQueueStats | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current filters */
  filters: ValidationQueueFilters;
  /** Update filters */
  setFilters: (filters: ValidationQueueFilters) => void;
  /** Assign validation to admin */
  assign: (validationId: string, adminId: string) => Promise<boolean>;
  /** Approve a profile */
  approve: (validationId: string, notes?: string) => Promise<boolean>;
  /** Reject a profile */
  reject: (input: RejectionInput) => Promise<boolean>;
  /** Request changes to a profile */
  requestChanges: (input: RequestChangesInput) => Promise<boolean>;
  /** Refresh queue */
  refresh: () => Promise<void>;
  /** Load more items */
  loadMore: () => Promise<void>;
  /** Has more items to load */
  hasMore: boolean;
  /** Current page */
  currentPage: number;
  /** Total items */
  totalItems: number;
  /** Action loading states */
  actionLoading: {
    assign: boolean;
    approve: boolean;
    reject: boolean;
    requestChanges: boolean;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_FILTERS: ValidationQueueFilters = {
  status: 'all',
  profileType: 'all',
  priority: 'all',
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useValidationQueue(
  options: UseValidationQueueOptions = {}
): UseValidationQueueReturn {
  const {
    filters: initialFilters = DEFAULT_FILTERS,
    pageSize = DEFAULT_PAGE_SIZE,
    autoRefreshInterval = 0,
  } = options;

  // State
  const [queue, setQueue] = useState<ValidationQueueItem[]>([]);
  const [stats, setStats] = useState<ValidationQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ValidationQueueFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [actionLoading, setActionLoading] = useState({
    assign: false,
    approve: false,
    reject: false,
    requestChanges: false,
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

  // Fetch validation queue
  const fetchQueue = useCallback(
    async (page: number = 1, append: boolean = false): Promise<void> => {
      if (!isMounted.current) return;

      setIsLoading(true);
      setError(null);

      try {
        const callable = httpsCallable<
          { filters: ValidationQueueFilters; page: number; pageSize: number },
          {
            items: ValidationQueueItem[];
            total: number;
            hasMore: boolean;
            stats: ValidationQueueStats;
          }
        >(functions, 'getValidationQueue');

        const result = await callable({
          filters,
          page,
          pageSize,
        });

        if (!isMounted.current) return;

        const { items, total, hasMore: more, stats: queueStats } = result.data;

        if (append) {
          setQueue((prev) => [...prev, ...items]);
        } else {
          setQueue(items);
        }

        setTotalItems(total);
        setHasMore(more);
        setStats(queueStats);
        setCurrentPage(page);
      } catch (err) {
        console.error('[useValidationQueue] Fetch error:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('Failed to fetch validation queue'));
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [filters, pageSize]
  );

  // Refresh queue
  const refresh = useCallback(async (): Promise<void> => {
    await fetchQueue(1, false);
  }, [fetchQueue]);

  // Load more items
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading) return;
    await fetchQueue(currentPage + 1, true);
  }, [fetchQueue, hasMore, isLoading, currentPage]);

  // Assign validation to admin
  const assign = useCallback(
    async (validationId: string, adminId: string): Promise<boolean> => {
      setActionLoading((prev) => ({ ...prev, assign: true }));

      try {
        const callable = httpsCallable<
          { validationId: string; adminId: string },
          { success: boolean }
        >(functions, 'assignValidation');

        const result = await callable({ validationId, adminId });

        if (result.data.success && isMounted.current) {
          // Update local state
          setQueue((prev) =>
            prev.map((item) =>
              item.id === validationId
                ? {
                    ...item,
                    status: 'in_review' as ValidationStatus,
                    assignedTo: adminId,
                    assignedAt: new Date(),
                  }
                : item
            )
          );
        }

        return result.data.success;
      } catch (err) {
        console.error('[useValidationQueue] Assign error:', err);
        return false;
      } finally {
        if (isMounted.current) {
          setActionLoading((prev) => ({ ...prev, assign: false }));
        }
      }
    },
    []
  );

  // Approve profile
  const approve = useCallback(
    async (validationId: string, notes?: string): Promise<boolean> => {
      setActionLoading((prev) => ({ ...prev, approve: true }));

      try {
        const callable = httpsCallable<
          { validationId: string; notes?: string },
          { success: boolean }
        >(functions, 'approveProfile');

        const result = await callable({ validationId, notes });

        if (result.data.success && isMounted.current) {
          // Update local state
          setQueue((prev) =>
            prev.map((item) =>
              item.id === validationId
                ? {
                    ...item,
                    status: 'approved' as ValidationStatus,
                    lastUpdatedAt: new Date(),
                  }
                : item
            )
          );
        }

        return result.data.success;
      } catch (err) {
        console.error('[useValidationQueue] Approve error:', err);
        return false;
      } finally {
        if (isMounted.current) {
          setActionLoading((prev) => ({ ...prev, approve: false }));
        }
      }
    },
    []
  );

  // Reject profile
  const reject = useCallback(async (input: RejectionInput): Promise<boolean> => {
    setActionLoading((prev) => ({ ...prev, reject: true }));

    try {
      const callable = httpsCallable<RejectionInput, { success: boolean }>(
        functions,
        'rejectProfile'
      );

      const result = await callable(input);

      if (result.data.success && isMounted.current) {
        // Update local state
        setQueue((prev) =>
          prev.map((item) =>
            item.id === input.validationId
              ? {
                  ...item,
                  status: 'rejected' as ValidationStatus,
                  lastUpdatedAt: new Date(),
                }
              : item
          )
        );
      }

      return result.data.success;
    } catch (err) {
      console.error('[useValidationQueue] Reject error:', err);
      return false;
    } finally {
      if (isMounted.current) {
        setActionLoading((prev) => ({ ...prev, reject: false }));
      }
    }
  }, []);

  // Request changes
  const requestChanges = useCallback(async (input: RequestChangesInput): Promise<boolean> => {
    setActionLoading((prev) => ({ ...prev, requestChanges: true }));

    try {
      const callable = httpsCallable<RequestChangesInput, { success: boolean }>(
        functions,
        'requestChanges'
      );

      const result = await callable(input);

      if (result.data.success && isMounted.current) {
        // Update local state
        setQueue((prev) =>
          prev.map((item) =>
            item.id === input.validationId
              ? {
                  ...item,
                  status: 'changes_requested' as ValidationStatus,
                  lastUpdatedAt: new Date(),
                }
              : item
          )
        );
      }

      return result.data.success;
    } catch (err) {
      console.error('[useValidationQueue] Request changes error:', err);
      return false;
    } finally {
      if (isMounted.current) {
        setActionLoading((prev) => ({ ...prev, requestChanges: false }));
      }
    }
  }, []);

  // Update filters
  const handleSetFilters = useCallback((newFilters: ValidationQueueFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchQueue(1, false);
  }, [fetchQueue]);

  // Refetch when filters change
  useEffect(() => {
    fetchQueue(1, false);
  }, [filters, fetchQueue]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    refreshIntervalRef.current = setInterval(() => {
      if (isMounted.current) {
        fetchQueue(1, false);
      }
    }, autoRefreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshInterval, fetchQueue]);

  return {
    queue,
    stats,
    isLoading,
    error,
    filters,
    setFilters: handleSetFilters,
    assign,
    approve,
    reject,
    requestChanges,
    refresh,
    loadMore,
    hasMore,
    currentPage,
    totalItems,
    actionLoading,
  };
}

export default useValidationQueue;
