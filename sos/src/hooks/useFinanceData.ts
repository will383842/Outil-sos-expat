/**
 * useFinanceData Hook
 * Finance data management with loading states, caching, and real-time updates
 *
 * @module hooks/useFinanceData
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  FinanceFilters,
  FinanceKPIs,
  AdminPaymentRecord,
  AdminSubscriptionRecord,
  AdminRefundRecord,
  AdminDisputeRecord,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
  CurrencyCode
} from '../types/finance';

// ============================================================================
// TYPES
// ============================================================================

interface UseFinanceDataOptions {
  filters: FinanceFilters;
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseFinanceDataReturn {
  // Data
  payments: AdminPaymentRecord[];
  kpis: FinanceKPIs | null;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;

  // Pagination
  hasMore: boolean;
  loadMore: () => Promise<void>;

  // Actions
  refresh: () => Promise<void>;

  // Computed values
  totalCount: number;
  totalAmount: number;

  // Error handling
  error: Error | null;
}

interface UseFinanceKPIsReturn {
  kpis: FinanceKPIs | null;
  isLoading: boolean;
  refresh: () => void;
}

interface UseSubscriptionsReturn {
  subscriptions: AdminSubscriptionRecord[];
  isLoading: boolean;
  loadMore: () => void;
  hasMore: boolean;
}

interface UseRefundsReturn {
  refunds: AdminRefundRecord[];
  isLoading: boolean;
  refresh: () => void;
}

interface UseDisputesReturn {
  disputes: AdminDisputeRecord[];
  urgentCount: number;
  isLoading: boolean;
  refresh: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute
const DEBOUNCE_DELAY = 300; // 300ms debounce for filter changes
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const kpiCache = new Map<string, CacheEntry<FinanceKPIs>>();

function getCacheKey(dateRange: { from: Date; to: Date }): string {
  return `${dateRange.from.toISOString()}_${dateRange.to.toISOString()}`;
}

function getCachedKPIs(key: string): FinanceKPIs | null {
  const entry = kpiCache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    kpiCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedKPIs(key: string, kpis: FinanceKPIs): void {
  // Limit cache size to prevent memory issues
  if (kpiCache.size > 10) {
    const firstKey = kpiCache.keys().next().value;
    if (firstKey) kpiCache.delete(firstKey);
  }
  kpiCache.set(key, { data: kpis, timestamp: Date.now() });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toISODate(ts: Timestamp | undefined): Date {
  return ts ? ts.toDate() : new Date();
}

function buildFilterConstraints(filters: FinanceFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  // Status filter
  if (filters.status && filters.status !== 'all') {
    if (Array.isArray(filters.status)) {
      constraints.push(where('status', 'in', filters.status));
    } else {
      constraints.push(where('status', '==', filters.status));
    }
  }

  // Payment method filter
  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    constraints.push(where('paymentMethod', '==', filters.paymentMethod));
  }

  // Transaction type filter
  if (filters.transactionType && filters.transactionType !== 'all') {
    constraints.push(where('transactionType', '==', filters.transactionType));
  }

  // Country filter
  if (filters.country && filters.country !== 'all') {
    constraints.push(where('clientCountry', '==', filters.country));
  }

  // Currency filter
  if (filters.currency && filters.currency !== 'all') {
    constraints.push(where('currency', '==', filters.currency));
  }

  // Date range filters
  if (filters.dateFrom) {
    constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
  }

  if (filters.dateTo) {
    constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)));
  }

  return constraints;
}

function parsePaymentRecord(doc: QueryDocumentSnapshot): AdminPaymentRecord {
  const data = doc.data();
  return {
    id: doc.id,
    amount: Number(data.amount || 0),
    amountInEuros: data.amountInEuros ? Number(data.amountInEuros) : undefined,
    currency: (data.currency || 'EUR') as CurrencyCode,
    providerAmount: data.providerAmount ? Number(data.providerAmount) : undefined,
    commissionAmount: data.commissionAmount ? Number(data.commissionAmount) : undefined,
    status: (data.status || 'pending') as PaymentStatus,
    paymentMethod: (data.paymentMethod || 'stripe') as PaymentMethod,
    transactionType: (data.transactionType || 'call_payment') as TransactionType,
    clientId: data.clientId || '',
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    clientCountry: data.clientCountry,
    providerId: data.providerId || '',
    providerName: data.providerName,
    providerEmail: data.providerEmail,
    providerCountry: data.providerCountry,
    callSessionId: data.callSessionId,
    subscriptionId: data.subscriptionId,
    stripePaymentIntentId: data.stripePaymentIntentId,
    stripeChargeId: data.stripeChargeId,
    paypalOrderId: data.paypalOrderId,
    paypalCaptureId: data.paypalCaptureId,
    invoices: data.invoices,
    createdAt: toISODate(data.createdAt),
    updatedAt: data.updatedAt ? toISODate(data.updatedAt) : undefined,
    capturedAt: data.capturedAt ? toISODate(data.capturedAt) : undefined,
    refundedAt: data.refundedAt ? toISODate(data.refundedAt) : undefined,
    metadata: data.metadata
  };
}

function parseSubscriptionRecord(doc: QueryDocumentSnapshot): AdminSubscriptionRecord {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId || data.providerId || '',
    userName: data.userName || data.providerName,
    userEmail: data.userEmail || data.providerEmail,
    plan: data.plan || data.tier || 'free',
    status: data.status || 'active',
    pricePerMonth: Number(data.pricePerMonth || data.currentPeriodAmount || 0),
    currency: (data.currency || 'EUR') as CurrencyCode,
    billingCycle: data.billingCycle || 'monthly',
    currentPeriodStart: toISODate(data.currentPeriodStart),
    currentPeriodEnd: toISODate(data.currentPeriodEnd),
    cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
    canceledAt: data.canceledAt ? toISODate(data.canceledAt) : undefined,
    trialEnd: data.trialEndsAt ? toISODate(data.trialEndsAt) : undefined,
    stripeSubscriptionId: data.stripeSubscriptionId,
    stripeCustomerId: data.stripeCustomerId,
    quotaUsed: Number(data.quotaUsed || 0),
    quotaLimit: Number(data.quotaLimit || 0),
    createdAt: toISODate(data.createdAt),
    updatedAt: data.updatedAt ? toISODate(data.updatedAt) : undefined
  };
}

function parseRefundRecord(doc: QueryDocumentSnapshot): AdminRefundRecord {
  const data = doc.data();
  return {
    id: doc.id,
    paymentId: data.paymentId || '',
    amount: Number(data.amount || 0),
    currency: (data.currency || 'EUR') as CurrencyCode,
    reason: data.reason || '',
    status: data.status || 'pending',
    requestedBy: data.requestedBy || data.clientId || '',
    requestedAt: toISODate(data.requestedAt || data.createdAt),
    processedAt: data.processedAt ? toISODate(data.processedAt) : undefined,
    processedBy: data.processedBy,
    stripeRefundId: data.stripeRefundId || data.refundId,
    paypalRefundId: data.paypalRefundId,
    notes: data.notes || data.adminNotes
  };
}

function parseDisputeRecord(doc: QueryDocumentSnapshot): AdminDisputeRecord {
  const data = doc.data();
  return {
    id: doc.id,
    paymentId: data.paymentId || '',
    amount: Number(data.amount || 0),
    currency: (data.currency || 'EUR') as CurrencyCode,
    status: data.status || 'open',
    reason: data.reason || '',
    evidence: data.evidence,
    stripeDisputeId: data.stripeDisputeId,
    paypalDisputeId: data.paypalDisputeId,
    createdAt: toISODate(data.createdAt),
    updatedAt: data.updatedAt ? toISODate(data.updatedAt) : undefined,
    resolvedAt: data.resolvedAt ? toISODate(data.resolvedAt) : undefined,
    dueBy: data.dueBy ? toISODate(data.dueBy) : undefined
  };
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// MAIN HOOK: useFinanceData
// ============================================================================

export function useFinanceData(options: UseFinanceDataOptions): UseFinanceDataReturn {
  const {
    filters,
    pageSize = DEFAULT_PAGE_SIZE,
    autoRefresh = false,
    refreshInterval = DEFAULT_REFRESH_INTERVAL
  } = options;

  // State
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [kpis, setKpis] = useState<FinanceKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const isMounted = useRef(true);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Debounce filters to avoid excessive queries
  const debouncedFilters = useDebounce(filters, DEBOUNCE_DELAY);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Fetch payments with filters
  const fetchPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        ...buildFilterConstraints(debouncedFilters),
        limit(pageSize)
      ];

      const q = query(collection(db, 'payments'), ...constraints);
      const snapshot = await getDocs(q);

      if (!isMounted.current) return;

      const records = snapshot.docs
        .filter(doc => !doc.data()._placeholder)
        .map(parsePaymentRecord);

      // Apply client-side search filter if present
      let filteredRecords = records;
      if (debouncedFilters.search) {
        const searchLower = debouncedFilters.search.toLowerCase();
        filteredRecords = records.filter(record =>
          record.clientName?.toLowerCase().includes(searchLower) ||
          record.clientEmail?.toLowerCase().includes(searchLower) ||
          record.providerName?.toLowerCase().includes(searchLower) ||
          record.providerEmail?.toLowerCase().includes(searchLower) ||
          record.id.toLowerCase().includes(searchLower)
        );
      }

      // Apply amount range filters client-side
      if (debouncedFilters.minAmount !== undefined) {
        filteredRecords = filteredRecords.filter(r => r.amount >= debouncedFilters.minAmount!);
      }
      if (debouncedFilters.maxAmount !== undefined) {
        filteredRecords = filteredRecords.filter(r => r.amount <= debouncedFilters.maxAmount!);
      }

      setPayments(filteredRecords);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setHasMore(snapshot.docs.length === pageSize);

    } catch (err) {
      console.error('[useFinanceData] Error fetching payments:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch payments'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [debouncedFilters, pageSize]);

  // Load more payments (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDocRef.current) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        ...buildFilterConstraints(debouncedFilters),
        startAfter(lastDocRef.current),
        limit(pageSize)
      ];

      const q = query(collection(db, 'payments'), ...constraints);
      const snapshot = await getDocs(q);

      if (!isMounted.current) return;

      const newRecords = snapshot.docs
        .filter(doc => !doc.data()._placeholder)
        .map(parsePaymentRecord);

      // Apply same filters as initial fetch
      let filteredRecords = newRecords;
      if (debouncedFilters.search) {
        const searchLower = debouncedFilters.search.toLowerCase();
        filteredRecords = newRecords.filter(record =>
          record.clientName?.toLowerCase().includes(searchLower) ||
          record.clientEmail?.toLowerCase().includes(searchLower) ||
          record.providerName?.toLowerCase().includes(searchLower) ||
          record.providerEmail?.toLowerCase().includes(searchLower) ||
          record.id.toLowerCase().includes(searchLower)
        );
      }

      if (debouncedFilters.minAmount !== undefined) {
        filteredRecords = filteredRecords.filter(r => r.amount >= debouncedFilters.minAmount!);
      }
      if (debouncedFilters.maxAmount !== undefined) {
        filteredRecords = filteredRecords.filter(r => r.amount <= debouncedFilters.maxAmount!);
      }

      setPayments(prev => [...prev, ...filteredRecords]);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setHasMore(snapshot.docs.length === pageSize);

    } catch (err) {
      console.error('[useFinanceData] Error loading more payments:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to load more payments'));
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingMore(false);
      }
    }
  }, [debouncedFilters, pageSize, hasMore, isLoadingMore]);

  // Refresh function
  const refresh = useCallback(async () => {
    lastDocRef.current = null;
    await fetchPayments(true);
  }, [fetchPayments]);

  // Initial fetch and filter change handling
  useEffect(() => {
    lastDocRef.current = null;
    fetchPayments();
  }, [fetchPayments]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, refresh]);

  // Computed values
  const totalCount = useMemo(() => payments.length, [payments]);

  const totalAmount = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  return {
    payments,
    kpis,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    loadMore,
    refresh,
    totalCount,
    totalAmount,
    error
  };
}

// ============================================================================
// SPECIALIZED HOOK: useFinanceKPIs
// ============================================================================

export function useFinanceKPIs(dateRange: { from: Date; to: Date }): UseFinanceKPIsReturn {
  const [kpis, setKpis] = useState<FinanceKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchKPIs = useCallback(async () => {
    const cacheKey = getCacheKey(dateRange);

    // Check cache first
    const cached = getCachedKPIs(cacheKey);
    if (cached) {
      setKpis(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch payments for the date range
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('createdAt', '>=', Timestamp.fromDate(dateRange.from)),
        where('createdAt', '<=', Timestamp.fromDate(dateRange.to)),
        orderBy('createdAt', 'desc')
      );

      // Fetch active subscriptions
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('status', 'in', ['active', 'trialing'])
      );

      // Fetch canceled subscriptions for churn rate calculation
      const canceledSubscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('status', '==', 'canceled'),
        where('canceledAt', '>=', Timestamp.fromDate(dateRange.from)),
        where('canceledAt', '<=', Timestamp.fromDate(dateRange.to))
      );

      // Fetch disputes
      const disputesQuery = query(
        collection(db, 'disputes'),
        where('status', 'in', ['open', 'under_review', 'needs_response'])
      );

      // Fetch refunds
      const refundsQuery = query(
        collection(db, 'refunds'),
        where('createdAt', '>=', Timestamp.fromDate(dateRange.from)),
        where('createdAt', '<=', Timestamp.fromDate(dateRange.to))
      );

      const [paymentsSnap, subsSnap, canceledSubsSnap, disputesSnap, refundsSnap] = await Promise.all([
        getDocs(paymentsQuery),
        getDocs(subscriptionsQuery),
        getDocs(canceledSubscriptionsQuery),
        getDocs(disputesQuery),
        getDocs(refundsQuery)
      ]);

      if (!isMounted.current) return;

      const payments = paymentsSnap.docs
        .filter(doc => !doc.data()._placeholder)
        .map(parsePaymentRecord);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Calculate KPIs
      // P1 FIX: Include 'succeeded' status (Stripe uses this for successful payments)
      const SUCCESSFUL_STATUSES = ['paid', 'captured', 'succeeded'];
      const totalRevenue = payments
        .filter(p => SUCCESSFUL_STATUSES.includes(p.status))
        .reduce((sum, p) => sum + p.amount, 0);

      const totalTransactions = payments.length;
      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Revenue by period (using SUCCESSFUL_STATUSES defined above)
      const revenueByPeriod = {
        today: payments
          .filter(p => SUCCESSFUL_STATUSES.includes(p.status) && p.createdAt >= startOfToday)
          .reduce((sum, p) => sum + p.amount, 0),
        thisWeek: payments
          .filter(p => SUCCESSFUL_STATUSES.includes(p.status) && p.createdAt >= startOfWeek)
          .reduce((sum, p) => sum + p.amount, 0),
        thisMonth: payments
          .filter(p => SUCCESSFUL_STATUSES.includes(p.status) && p.createdAt >= startOfMonth)
          .reduce((sum, p) => sum + p.amount, 0),
        lastMonth: payments
          .filter(p => SUCCESSFUL_STATUSES.includes(p.status) &&
            p.createdAt >= startOfLastMonth && p.createdAt <= endOfLastMonth)
          .reduce((sum, p) => sum + p.amount, 0)
      };

      // Transactions by status
      const transactionsByStatus = payments.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<PaymentStatus, number>);

      // Transactions by method
      const transactionsByMethod = payments.reduce((acc, p) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
        return acc;
      }, {} as Record<PaymentMethod, number>);

      // Refunds
      const refunds = refundsSnap.docs
        .filter(doc => !doc.data()._placeholder)
        .map(parseRefundRecord);

      const refundsTotal = refunds.reduce((sum, r) => sum + r.amount, 0);
      const refundsCount = refunds.length;
      const refundRate = totalTransactions > 0 ? refundsCount / totalTransactions : 0;

      // Disputes
      const disputesOpen = disputesSnap.docs.filter(doc => !doc.data()._placeholder).length;
      const disputesTotal = disputesOpen;
      const disputeRate = totalTransactions > 0 ? disputesTotal / totalTransactions : 0;

      // Subscriptions
      const activeSubscriptions = subsSnap.docs.filter(doc => !doc.data()._placeholder);
      const subscriptionsActive = activeSubscriptions.length;
      // P0 FIX: MRR calculation must account for yearly billing cycles
      // For yearly subscriptions, divide by 12 to get Monthly Recurring Revenue
      const subscriptionsMRR = activeSubscriptions.reduce((sum, doc) => {
        const data = doc.data();
        const amount = Number(data.currentPeriodAmount || data.pricePerMonth || 0);
        const billingCycle = data.billingCycle || 'monthly';
        // If yearly billing, divide by 12 to get monthly equivalent
        const monthlyAmount = billingCycle === 'yearly' ? amount / 12 : amount;
        return sum + monthlyAmount;
      }, 0);

      // Calculate churn rate: (canceled subscriptions / total at period start) * 100
      // Total at period start = currently active + those canceled during period
      const canceledCount = canceledSubsSnap.docs.filter(doc => !doc.data()._placeholder).length;
      const totalAtPeriodStart = subscriptionsActive + canceledCount;
      const subscriptionsChurnRate = totalAtPeriodStart > 0
        ? (canceledCount / totalAtPeriodStart) * 100
        : 0;

      // Top countries (using SUCCESSFUL_STATUSES)
      const countryRevenue: Record<string, { revenue: number; count: number }> = {};
      payments
        .filter(p => SUCCESSFUL_STATUSES.includes(p.status))
        .forEach(p => {
          const country = p.clientCountry || 'Unknown';
          if (!countryRevenue[country]) {
            countryRevenue[country] = { revenue: 0, count: 0 };
          }
          countryRevenue[country].revenue += p.amount;
          countryRevenue[country].count += 1;
        });

      const topCountries = Object.entries(countryRevenue)
        .map(([country, data]) => ({ country, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const computedKpis: FinanceKPIs = {
        totalRevenue,
        totalTransactions,
        avgTransactionValue,
        revenueByPeriod,
        transactionsByStatus,
        transactionsByMethod,
        refundsTotal,
        refundsCount,
        refundRate,
        disputesOpen,
        disputesTotal,
        disputeRate,
        subscriptionsMRR,
        subscriptionsActive,
        subscriptionsChurnRate,
        topCountries
      };

      setCachedKPIs(cacheKey, computedKpis);
      setKpis(computedKpis);

    } catch (err) {
      console.error('[useFinanceKPIs] Error fetching KPIs:', err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [dateRange]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const refresh = useCallback(() => {
    const cacheKey = getCacheKey(dateRange);
    kpiCache.delete(cacheKey);
    fetchKPIs();
  }, [dateRange, fetchKPIs]);

  return { kpis, isLoading, refresh };
}

// ============================================================================
// SPECIALIZED HOOK: useSubscriptions
// ============================================================================

export function useSubscriptions(filters: {
  status?: string;
  plan?: string;
  search?: string;
}): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const isMounted = useRef(true);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const debouncedFilters = useDebounce(filters, DEBOUNCE_DELAY);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);

    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(25)];

    if (debouncedFilters.status && debouncedFilters.status !== 'all') {
      constraints.push(where('status', '==', debouncedFilters.status));
    }

    if (debouncedFilters.plan && debouncedFilters.plan !== 'all') {
      constraints.push(where('tier', '==', debouncedFilters.plan));
    }

    const q = query(collection(db, 'subscriptions'), ...constraints);

    // Use real-time listener
    unsubscribeRef.current = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted.current) return;

        let records = snapshot.docs
          .filter(doc => !doc.data()._placeholder)
          .map(parseSubscriptionRecord);

        // Apply search filter client-side
        if (debouncedFilters.search) {
          const searchLower = debouncedFilters.search.toLowerCase();
          records = records.filter(record =>
            record.userName?.toLowerCase().includes(searchLower) ||
            record.userEmail?.toLowerCase().includes(searchLower) ||
            record.userId.toLowerCase().includes(searchLower)
          );
        }

        setSubscriptions(records);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
        setHasMore(snapshot.docs.length === 25);
        setIsLoading(false);
      },
      (error) => {
        console.error('[useSubscriptions] Error:', error);
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [debouncedFilters]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !lastDocRef.current) return;

    try {
      const constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(25)
      ];

      if (debouncedFilters.status && debouncedFilters.status !== 'all') {
        constraints.push(where('status', '==', debouncedFilters.status));
      }

      const q = query(collection(db, 'subscriptions'), ...constraints);
      const snapshot = await getDocs(q);

      if (!isMounted.current) return;

      const newRecords = snapshot.docs
        .filter(doc => !doc.data()._placeholder)
        .map(parseSubscriptionRecord);

      setSubscriptions(prev => [...prev, ...newRecords]);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setHasMore(snapshot.docs.length === 25);
    } catch (err) {
      console.error('[useSubscriptions] Error loading more:', err);
    }
  }, [debouncedFilters, hasMore]);

  return { subscriptions, isLoading, loadMore, hasMore };
}

// ============================================================================
// SPECIALIZED HOOK: useRefunds
// ============================================================================

export function useRefunds(filters: {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): UseRefundsReturn {
  const [refunds, setRefunds] = useState<AdminRefundRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const debouncedFilters = useDebounce(filters, DEBOUNCE_DELAY);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const fetchRefunds = useCallback(() => {
    setIsLoading(true);

    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(100)];

    if (debouncedFilters.status && debouncedFilters.status !== 'all') {
      constraints.push(where('status', '==', debouncedFilters.status));
    }

    if (debouncedFilters.dateFrom) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(debouncedFilters.dateFrom)));
    }

    if (debouncedFilters.dateTo) {
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(debouncedFilters.dateTo)));
    }

    const q = query(collection(db, 'refunds'), ...constraints);

    // Use real-time listener
    unsubscribeRef.current = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted.current) return;

        const records = snapshot.docs
          .filter(doc => !doc.data()._placeholder)
          .map(parseRefundRecord);

        setRefunds(records);
        setIsLoading(false);
      },
      (error) => {
        console.error('[useRefunds] Error:', error);
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    );
  }, [debouncedFilters]);

  useEffect(() => {
    fetchRefunds();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [fetchRefunds]);

  const refresh = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    fetchRefunds();
  }, [fetchRefunds]);

  return { refunds, isLoading, refresh };
}

// ============================================================================
// SPECIALIZED HOOK: useDisputes
// ============================================================================

export function useDisputes(): UseDisputesReturn {
  const [disputes, setDisputes] = useState<AdminDisputeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const fetchDisputes = useCallback(() => {
    setIsLoading(true);

    const q = query(
      collection(db, 'disputes'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    // Use real-time listener for disputes (important for urgent notifications)
    unsubscribeRef.current = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted.current) return;

        const records = snapshot.docs
          .filter(doc => !doc.data()._placeholder)
          .map(parseDisputeRecord);

        setDisputes(records);
        setIsLoading(false);
      },
      (error) => {
        console.error('[useDisputes] Error:', error);
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    );
  }, []);

  useEffect(() => {
    fetchDisputes();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [fetchDisputes]);

  // Count urgent disputes (open or needs_response with dueBy approaching)
  const urgentCount = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return disputes.filter(d => {
      const isOpenStatus = d.status === 'open' || d.status === 'under_review';
      const isDueSoon = d.dueBy && d.dueBy <= threeDaysFromNow;
      return isOpenStatus && isDueSoon;
    }).length;
  }, [disputes]);

  const refresh = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    fetchDisputes();
  }, [fetchDisputes]);

  return { disputes, urgentCount, isLoading, refresh };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useFinanceData;
