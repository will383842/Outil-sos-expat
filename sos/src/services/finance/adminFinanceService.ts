/**
 * Admin Finance Service
 *
 * This file contains all Firestore queries and data fetching logic for the admin finance section.
 * Includes KPIs, payments, subscriptions, refunds, disputes, and revenue aggregations.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

export type Currency = 'EUR' | 'USD';

export interface FinanceFilters {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  country?: string;
  search?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface FinanceKPIs {
  totalRevenue: number;
  platformFees: number;
  providerPayouts: number;
  pendingPayouts: number;
  refundTotal: number;
  disputeCount: number;
  activeSubscriptions: number;
  mrr: number;
  transactionCount: number;
  averageTransactionValue: number;
  conversionRate: number;
}

export interface AdminPaymentRecord {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'disputed' | 'canceled';
  createdAt: Date;
  paidAt?: Date;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  providerId: string;
  providerName?: string;
  platformFee: number;
  providerAmount: number;
  paymentMethod?: string;
  country?: string;
  stripePaymentIntentId?: string;
  callId?: string;
  description?: string;
}

export interface AdminSubscriptionRecord {
  id: string;
  providerId: string;
  providerName?: string;
  providerEmail?: string;
  providerType: string;
  planId: string;
  planName?: string;
  tier: string;
  status: string;
  amount: number;
  currency: Currency;
  billingPeriod: 'monthly' | 'yearly';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  stripeSubscriptionId?: string;
}

export interface AdminRefundRecord {
  id: string;
  paymentId: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason: string;
  description?: string;
  clientId: string;
  clientEmail?: string;
  providerId?: string;
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  stripeRefundId?: string;
}

export interface AdminDisputeRecord {
  id: string;
  paymentId: string;
  amount: number;
  currency: Currency;
  status: 'needs_response' | 'under_review' | 'warning_closed' | 'won' | 'lost';
  reason: string;
  dueBy?: Date;
  isUrgent: boolean;
  clientId?: string;
  providerId?: string;
  createdAt: Date;
  updatedAt?: Date;
  stripeDisputeId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLECTIONS = {
  PAYMENTS: 'payments',
  SUBSCRIPTIONS: 'subscriptions',
  REFUNDS: 'refunds',
  REFUND_REQUESTS: 'refund_requests',
  DISPUTES: 'disputes',
  USERS: 'users',
  INVOICES: 'invoices',
  PAYOUTS: 'payouts'
} as const;

// Cache configuration
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Simple in-memory cache
const cache: Map<string, CacheEntry<unknown>> = new Map();

// ============================================================================
// CACHE HELPERS
// ============================================================================

function getCacheKey(prefix: string, params: Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(params)}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearFinanceCache(): void {
  cache.clear();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return new Date();
}

function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function buildDateConstraints(
  fieldName: string,
  dateFrom?: Date,
  dateTo?: Date
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (dateFrom) {
    constraints.push(where(fieldName, '>=', toTimestamp(dateFrom)));
  }
  if (dateTo) {
    constraints.push(where(fieldName, '<=', toTimestamp(dateTo)));
  }

  return constraints;
}

// ============================================================================
// FETCH PAYMENTS
// ============================================================================

export async function fetchPayments(
  filters: FinanceFilters,
  pageSize: number = 25,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  payments: AdminPaymentRecord[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc')
    ];

    // Add date filters
    if (filters.dateFrom) {
      constraints.push(where('createdAt', '>=', toTimestamp(filters.dateFrom)));
    }
    if (filters.dateTo) {
      constraints.push(where('createdAt', '<=', toTimestamp(filters.dateTo)));
    }

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    // Add country filter
    if (filters.country && filters.country !== 'all') {
      constraints.push(where('country', '==', filters.country));
    }

    // Add pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize + 1)); // +1 to check if there are more

    const q = query(collection(db, COLLECTIONS.PAYMENTS), ...constraints);
    const snapshot = await getDocs(q);

    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    const paymentsData = hasMore ? docs.slice(0, pageSize) : docs;

    const payments: AdminPaymentRecord[] = paymentsData
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: Number(data.amount || data.totalAmount || 0),
          currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
          status: data.status || 'pending',
          createdAt: toDate(data.createdAt),
          paidAt: data.paidAt ? toDate(data.paidAt) : undefined,
          clientId: data.clientId || '',
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          providerId: data.providerId || '',
          providerName: data.providerName,
          platformFee: Number(data.platformFee || data.fee || 0),
          providerAmount: Number(data.providerAmount || 0),
          paymentMethod: data.paymentMethod,
          country: data.country,
          stripePaymentIntentId: data.stripePaymentIntentId,
          callId: data.callId,
          description: data.description
        };
      });

    // Apply client-side search filter if provided
    let filteredPayments = payments;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredPayments = payments.filter(p =>
        p.clientName?.toLowerCase().includes(searchLower) ||
        p.clientEmail?.toLowerCase().includes(searchLower) ||
        p.providerName?.toLowerCase().includes(searchLower) ||
        p.id.toLowerCase().includes(searchLower) ||
        p.stripePaymentIntentId?.toLowerCase().includes(searchLower)
      );
    }

    // Apply amount filters client-side
    if (filters.minAmount !== undefined) {
      filteredPayments = filteredPayments.filter(p => p.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filteredPayments = filteredPayments.filter(p => p.amount <= filters.maxAmount!);
    }

    return {
      payments: filteredPayments,
      lastDoc: paymentsData.length > 0 ? paymentsData[paymentsData.length - 1] : null,
      hasMore
    };
  } catch (error) {
    console.error('[AdminFinance] Error fetching payments:', error);
    return { payments: [], lastDoc: null, hasMore: false };
  }
}

// ============================================================================
// FETCH FINANCE KPIs
// ============================================================================

export async function fetchFinanceKPIs(
  dateRange: { from: Date; to: Date }
): Promise<FinanceKPIs> {
  const cacheKey = getCacheKey('kpis', { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() });
  const cached = getFromCache<FinanceKPIs>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch payments in date range
    const paymentsQuery = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('createdAt', '>=', toTimestamp(dateRange.from)),
      where('createdAt', '<=', toTimestamp(dateRange.to)),
      orderBy('createdAt', 'desc')
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    let totalRevenue = 0;
    let platformFees = 0;
    let providerPayouts = 0;
    let transactionCount = 0;
    let refundTotal = 0;

    paymentsSnapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        const amount = Number(data.amount || data.totalAmount || 0);
        const fee = Number(data.platformFee || data.fee || 0);
        const providerAmount = Number(data.providerAmount || 0);
        const status = data.status;

        if (status === 'succeeded' || status === 'captured') {
          totalRevenue += amount;
          platformFees += fee;
          providerPayouts += providerAmount;
          transactionCount++;
        } else if (status === 'refunded') {
          refundTotal += amount;
        }
      });

    // Fetch active subscriptions count
    const subscriptionsQuery = query(
      collection(db, COLLECTIONS.SUBSCRIPTIONS),
      where('status', 'in', ['active', 'trialing'])
    );
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    const activeSubscriptions = subscriptionsSnapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .length;

    // Fetch disputes count
    const disputesQuery = query(
      collection(db, COLLECTIONS.DISPUTES),
      where('createdAt', '>=', toTimestamp(dateRange.from)),
      where('createdAt', '<=', toTimestamp(dateRange.to))
    );
    const disputesSnapshot = await getDocs(disputesQuery);
    const disputeCount = disputesSnapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .length;

    // Calculate MRR from active subscriptions
    const mrr = await calculateMRR();

    // Calculate pending payouts
    const pendingPayouts = await getPendingPayoutsTotal();

    // Calculate average transaction value
    const averageTransactionValue = transactionCount > 0
      ? totalRevenue / transactionCount
      : 0;

    // Conversion rate would need checkout session data - use placeholder
    const conversionRate = 0;

    const kpis: FinanceKPIs = {
      totalRevenue,
      platformFees,
      providerPayouts,
      pendingPayouts,
      refundTotal,
      disputeCount,
      activeSubscriptions,
      mrr,
      transactionCount,
      averageTransactionValue,
      conversionRate
    };

    setCache(cacheKey, kpis);
    return kpis;
  } catch (error) {
    console.error('[AdminFinance] Error fetching KPIs:', error);
    return {
      totalRevenue: 0,
      platformFees: 0,
      providerPayouts: 0,
      pendingPayouts: 0,
      refundTotal: 0,
      disputeCount: 0,
      activeSubscriptions: 0,
      mrr: 0,
      transactionCount: 0,
      averageTransactionValue: 0,
      conversionRate: 0
    };
  }
}

// ============================================================================
// FETCH SUBSCRIPTIONS
// ============================================================================

export async function fetchSubscriptions(
  filters: { status?: string; plan?: string; search?: string },
  pageSize: number = 25,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  subscriptions: AdminSubscriptionRecord[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc')
    ];

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    // Add plan/tier filter
    if (filters.plan && filters.plan !== 'all') {
      constraints.push(where('tier', '==', filters.plan));
    }

    // Add pagination
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pageSize + 1));

    const q = query(collection(db, COLLECTIONS.SUBSCRIPTIONS), ...constraints);
    const snapshot = await getDocs(q);

    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    const subsData = hasMore ? docs.slice(0, pageSize) : docs;

    const subscriptions: AdminSubscriptionRecord[] = subsData
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          providerId: data.providerId || doc.id,
          providerName: data.providerName,
          providerEmail: data.providerEmail,
          providerType: data.providerType || 'lawyer',
          planId: data.planId || '',
          planName: data.planName,
          tier: data.tier || 'basic',
          status: data.status || 'active',
          amount: Number(data.currentPeriodAmount || data.amount || 0),
          currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
          billingPeriod: data.billingPeriod || 'monthly',
          currentPeriodStart: toDate(data.currentPeriodStart),
          currentPeriodEnd: toDate(data.currentPeriodEnd),
          cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
          createdAt: toDate(data.createdAt),
          stripeSubscriptionId: data.stripeSubscriptionId
        };
      });

    // Apply client-side search filter
    let filteredSubs = subscriptions;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredSubs = subscriptions.filter(s =>
        s.providerName?.toLowerCase().includes(searchLower) ||
        s.providerEmail?.toLowerCase().includes(searchLower) ||
        s.providerId.toLowerCase().includes(searchLower)
      );
    }

    return {
      subscriptions: filteredSubs,
      lastDoc: subsData.length > 0 ? subsData[subsData.length - 1] : null,
      hasMore
    };
  } catch (error) {
    console.error('[AdminFinance] Error fetching subscriptions:', error);
    return { subscriptions: [], lastDoc: null, hasMore: false };
  }
}

// ============================================================================
// FETCH REFUNDS
// ============================================================================

export async function fetchRefunds(
  filters: { status?: string; dateFrom?: Date; dateTo?: Date },
  pageSize: number = 25
): Promise<AdminRefundRecord[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc')
    ];

    // Add date filters
    if (filters.dateFrom) {
      constraints.push(where('createdAt', '>=', toTimestamp(filters.dateFrom)));
    }
    if (filters.dateTo) {
      constraints.push(where('createdAt', '<=', toTimestamp(filters.dateTo)));
    }

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    constraints.push(limit(pageSize));

    // Try refund_requests collection first (for user-initiated refunds)
    const refundRequestsQuery = query(collection(db, COLLECTIONS.REFUND_REQUESTS), ...constraints);
    const refundRequestsSnapshot = await getDocs(refundRequestsQuery);

    // Also fetch from refunds collection (for processed refunds)
    const refundsQuery = query(collection(db, COLLECTIONS.REFUNDS), ...constraints);
    const refundsSnapshot = await getDocs(refundsQuery);

    const refunds: AdminRefundRecord[] = [];

    // Process refund requests
    refundRequestsSnapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        refunds.push({
          id: doc.id,
          paymentId: data.paymentId || '',
          amount: Number(data.amount || 0),
          currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
          status: data.status || 'pending',
          reason: data.reason || '',
          description: data.description,
          clientId: data.clientId || '',
          clientEmail: data.clientEmail,
          providerId: data.providerId,
          processedBy: data.processedBy,
          processedAt: data.processedAt ? toDate(data.processedAt) : undefined,
          createdAt: toDate(data.createdAt),
          stripeRefundId: data.refundId || data.stripeRefundId
        });
      });

    // Process processed refunds
    refundsSnapshot.docs
      .filter(doc => !doc.data()._placeholder && !refunds.some(r => r.id === doc.id))
      .forEach(doc => {
        const data = doc.data();
        refunds.push({
          id: doc.id,
          paymentId: data.paymentId || '',
          amount: Number(data.amount || 0),
          currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
          status: 'completed',
          reason: data.reason || 'processed',
          description: data.description,
          clientId: data.clientId || '',
          clientEmail: data.clientEmail,
          providerId: data.providerId,
          processedBy: data.processedBy,
          processedAt: data.processedAt ? toDate(data.processedAt) : undefined,
          createdAt: toDate(data.createdAt || data.created),
          stripeRefundId: data.stripeRefundId
        });
      });

    // Sort by createdAt descending
    return refunds.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, pageSize);
  } catch (error) {
    console.error('[AdminFinance] Error fetching refunds:', error);
    return [];
  }
}

// ============================================================================
// FETCH DISPUTES
// ============================================================================

export async function fetchDisputes(
  filters: { status?: string; urgent?: boolean }
): Promise<AdminDisputeRecord[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc')
    ];

    // Add status filter
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    const q = query(collection(db, COLLECTIONS.DISPUTES), ...constraints);
    const snapshot = await getDocs(q);

    const now = new Date();
    const urgentThresholdMs = 3 * 24 * 60 * 60 * 1000; // 3 days

    let disputes: AdminDisputeRecord[] = snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        const dueBy = data.dueBy ? toDate(data.dueBy) : undefined;
        const isUrgent = dueBy
          ? (dueBy.getTime() - now.getTime()) < urgentThresholdMs && data.status === 'needs_response'
          : false;

        return {
          id: doc.id,
          paymentId: data.paymentId || '',
          amount: Number(data.amount || 0),
          currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
          status: data.status || 'needs_response',
          reason: data.reason || '',
          dueBy,
          isUrgent,
          clientId: data.clientId,
          providerId: data.providerId,
          createdAt: toDate(data.createdAt),
          updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
          stripeDisputeId: data.stripeDisputeId
        };
      });

    // Filter by urgent if specified
    if (filters.urgent === true) {
      disputes = disputes.filter(d => d.isUrgent);
    }

    return disputes;
  } catch (error) {
    console.error('[AdminFinance] Error fetching disputes:', error);
    return [];
  }
}

// ============================================================================
// REVENUE AGGREGATIONS
// ============================================================================

export async function getRevenueByCountry(
  dateRange: { from: Date; to: Date }
): Promise<Array<{ country: string; revenue: number; count: number }>> {
  const cacheKey = getCacheKey('revenueByCountry', { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() });
  const cached = getFromCache<Array<{ country: string; revenue: number; count: number }>>(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('createdAt', '>=', toTimestamp(dateRange.from)),
      where('createdAt', '<=', toTimestamp(dateRange.to)),
      where('status', '==', 'succeeded'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const countryMap = new Map<string, { revenue: number; count: number }>();

    snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        const country = data.country || 'Unknown';
        const amount = Number(data.amount || data.totalAmount || 0);

        const current = countryMap.get(country) || { revenue: 0, count: 0 };
        countryMap.set(country, {
          revenue: current.revenue + amount,
          count: current.count + 1
        });
      });

    const result = Array.from(countryMap.entries())
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AdminFinance] Error getting revenue by country:', error);
    return [];
  }
}

export async function getRevenueByMethod(
  dateRange: { from: Date; to: Date }
): Promise<Record<string, number>> {
  const cacheKey = getCacheKey('revenueByMethod', { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() });
  const cached = getFromCache<Record<string, number>>(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('createdAt', '>=', toTimestamp(dateRange.from)),
      where('createdAt', '<=', toTimestamp(dateRange.to)),
      where('status', '==', 'succeeded'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const methodMap: Record<string, number> = {};

    snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        const method = data.paymentMethod || data.payment_method_type || 'card';
        const amount = Number(data.amount || data.totalAmount || 0);

        methodMap[method] = (methodMap[method] || 0) + amount;
      });

    setCache(cacheKey, methodMap);
    return methodMap;
  } catch (error) {
    console.error('[AdminFinance] Error getting revenue by method:', error);
    return {};
  }
}

// ============================================================================
// REVENUE TIME SERIES
// ============================================================================

export async function getRevenueTimeSeries(
  dateRange: { from: Date; to: Date },
  granularity: 'day' | 'week' | 'month'
): Promise<Array<{ date: string; revenue: number; count: number }>> {
  const cacheKey = getCacheKey('revenueTimeSeries', {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
    granularity
  });
  const cached = getFromCache<Array<{ date: string; revenue: number; count: number }>>(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('createdAt', '>=', toTimestamp(dateRange.from)),
      where('createdAt', '<=', toTimestamp(dateRange.to)),
      where('status', '==', 'succeeded'),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const timeMap = new Map<string, { revenue: number; count: number }>();

    snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        const createdAt = toDate(data.createdAt);
        const amount = Number(data.amount || data.totalAmount || 0);

        let dateKey: string;
        if (granularity === 'day') {
          dateKey = createdAt.toISOString().split('T')[0];
        } else if (granularity === 'week') {
          // Get ISO week start (Monday)
          const day = createdAt.getDay();
          const diff = createdAt.getDate() - day + (day === 0 ? -6 : 1);
          const weekStart = new Date(createdAt);
          weekStart.setDate(diff);
          dateKey = weekStart.toISOString().split('T')[0];
        } else {
          // Month
          dateKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        }

        const current = timeMap.get(dateKey) || { revenue: 0, count: 0 };
        timeMap.set(dateKey, {
          revenue: current.revenue + amount,
          count: current.count + 1
        });
      });

    // Fill in missing dates
    const result: Array<{ date: string; revenue: number; count: number }> = [];
    const currentDate = new Date(dateRange.from);

    while (currentDate <= dateRange.to) {
      let dateKey: string;
      let nextDate: Date;

      if (granularity === 'day') {
        dateKey = currentDate.toISOString().split('T')[0];
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (granularity === 'week') {
        dateKey = currentDate.toISOString().split('T')[0];
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const data = timeMap.get(dateKey) || { revenue: 0, count: 0 };
      result.push({ date: dateKey, ...data });

      currentDate.setTime(nextDate.getTime());
    }

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[AdminFinance] Error getting revenue time series:', error);
    return [];
  }
}

// ============================================================================
// MRR CALCULATION
// ============================================================================

export async function calculateMRR(): Promise<number> {
  const cacheKey = 'mrr';
  const cached = getFromCache<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const q = query(
      collection(db, COLLECTIONS.SUBSCRIPTIONS),
      where('status', 'in', ['active', 'trialing'])
    );

    const snapshot = await getDocs(q);
    let mrr = 0;

    snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        const amount = Number(data.currentPeriodAmount || data.amount || 0);
        const billingPeriod = data.billingPeriod;

        if (billingPeriod === 'yearly') {
          // Convert yearly to monthly
          mrr += amount / 12;
        } else {
          // Assume monthly
          mrr += amount;
        }
      });

    setCache(cacheKey, mrr);
    return mrr;
  } catch (error) {
    console.error('[AdminFinance] Error calculating MRR:', error);
    return 0;
  }
}

// ============================================================================
// PENDING PAYOUTS
// ============================================================================

export async function getPendingPayoutsTotal(): Promise<number> {
  const cacheKey = 'pendingPayouts';
  const cached = getFromCache<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    // First try to get from payouts collection
    const payoutsQuery = query(
      collection(db, COLLECTIONS.PAYOUTS),
      where('status', '==', 'pending')
    );
    const payoutsSnapshot = await getDocs(payoutsQuery);

    let total = 0;
    payoutsSnapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        total += Number(data.amount || 0);
      });

    // Also check payments with pending transfer status
    const paymentsQuery = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('status', '==', 'succeeded'),
      where('transferStatus', '==', 'pending')
    );

    try {
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.docs
        .filter(doc => !doc.data()._placeholder)
        .forEach(doc => {
          const data = doc.data();
          total += Number(data.providerAmount || 0);
        });
    } catch {
      // transferStatus field might not exist or not be indexed
    }

    setCache(cacheKey, total);
    return total;
  } catch (error) {
    console.error('[AdminFinance] Error getting pending payouts:', error);
    return 0;
  }
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export function formatPaymentsForExport(payments: AdminPaymentRecord[]): object[] {
  return payments.map(payment => ({
    'ID': payment.id,
    'Date': payment.createdAt.toISOString(),
    'Amount': payment.amount,
    'Currency': payment.currency,
    'Status': payment.status,
    'Client Name': payment.clientName || '',
    'Client Email': payment.clientEmail || '',
    'Provider Name': payment.providerName || '',
    'Platform Fee': payment.platformFee,
    'Provider Amount': payment.providerAmount,
    'Payment Method': payment.paymentMethod || '',
    'Country': payment.country || '',
    'Stripe Payment Intent': payment.stripePaymentIntentId || '',
    'Call ID': payment.callId || '',
    'Description': payment.description || ''
  }));
}

export function generateCSV(data: object[], columns?: string[]): string {
  if (data.length === 0) return '';

  // Get columns from first row if not provided
  const cols = columns || Object.keys(data[0]);

  // Escape CSV value
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Header row
  const headerRow = cols.map(escapeCSV).join(',');

  // Data rows
  const dataRows = data.map(row => {
    const rowData = row as Record<string, unknown>;
    return cols.map(col => escapeCSV(rowData[col])).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

// ============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a single payment by ID
 */
export async function getPaymentById(paymentId: string): Promise<AdminPaymentRecord | null> {
  try {
    const docRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || docSnap.data()._placeholder) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      amount: Number(data.amount || data.totalAmount || 0),
      currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
      status: data.status || 'pending',
      createdAt: toDate(data.createdAt),
      paidAt: data.paidAt ? toDate(data.paidAt) : undefined,
      clientId: data.clientId || '',
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      providerId: data.providerId || '',
      providerName: data.providerName,
      platformFee: Number(data.platformFee || data.fee || 0),
      providerAmount: Number(data.providerAmount || 0),
      paymentMethod: data.paymentMethod,
      country: data.country,
      stripePaymentIntentId: data.stripePaymentIntentId,
      callId: data.callId,
      description: data.description
    };
  } catch (error) {
    console.error('[AdminFinance] Error getting payment by ID:', error);
    return null;
  }
}

/**
 * Get payment statistics for a specific provider
 */
export async function getProviderPaymentStats(
  providerId: string,
  dateRange?: { from: Date; to: Date }
): Promise<{
  totalEarnings: number;
  totalFees: number;
  transactionCount: number;
  averageTransaction: number;
}> {
  try {
    const constraints: QueryConstraint[] = [
      where('providerId', '==', providerId),
      where('status', '==', 'succeeded')
    ];

    if (dateRange) {
      constraints.push(
        where('createdAt', '>=', toTimestamp(dateRange.from)),
        where('createdAt', '<=', toTimestamp(dateRange.to))
      );
    }

    const q = query(collection(db, COLLECTIONS.PAYMENTS), ...constraints);
    const snapshot = await getDocs(q);

    let totalEarnings = 0;
    let totalFees = 0;
    let transactionCount = 0;

    snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .forEach(doc => {
        const data = doc.data();
        totalEarnings += Number(data.providerAmount || 0);
        totalFees += Number(data.platformFee || data.fee || 0);
        transactionCount++;
      });

    return {
      totalEarnings,
      totalFees,
      transactionCount,
      averageTransaction: transactionCount > 0 ? totalEarnings / transactionCount : 0
    };
  } catch (error) {
    console.error('[AdminFinance] Error getting provider payment stats:', error);
    return {
      totalEarnings: 0,
      totalFees: 0,
      transactionCount: 0,
      averageTransaction: 0
    };
  }
}

/**
 * Get subscription details by provider ID
 */
export async function getSubscriptionByProviderId(
  providerId: string
): Promise<AdminSubscriptionRecord | null> {
  try {
    // Try direct lookup first
    const directRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, providerId);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists() && !directSnap.data()._placeholder) {
      const data = directSnap.data();
      return {
        id: directSnap.id,
        providerId: data.providerId || directSnap.id,
        providerName: data.providerName,
        providerEmail: data.providerEmail,
        providerType: data.providerType || 'lawyer',
        planId: data.planId || '',
        planName: data.planName,
        tier: data.tier || 'basic',
        status: data.status || 'active',
        amount: Number(data.currentPeriodAmount || data.amount || 0),
        currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
        billingPeriod: data.billingPeriod || 'monthly',
        currentPeriodStart: toDate(data.currentPeriodStart),
        currentPeriodEnd: toDate(data.currentPeriodEnd),
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        createdAt: toDate(data.createdAt),
        stripeSubscriptionId: data.stripeSubscriptionId
      };
    }

    // Try with sub_ prefix
    const prefixRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, `sub_${providerId}`);
    const prefixSnap = await getDoc(prefixRef);

    if (prefixSnap.exists() && !prefixSnap.data()._placeholder) {
      const data = prefixSnap.data();
      return {
        id: prefixSnap.id,
        providerId: data.providerId || providerId,
        providerName: data.providerName,
        providerEmail: data.providerEmail,
        providerType: data.providerType || 'lawyer',
        planId: data.planId || '',
        planName: data.planName,
        tier: data.tier || 'basic',
        status: data.status || 'active',
        amount: Number(data.currentPeriodAmount || data.amount || 0),
        currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
        billingPeriod: data.billingPeriod || 'monthly',
        currentPeriodStart: toDate(data.currentPeriodStart),
        currentPeriodEnd: toDate(data.currentPeriodEnd),
        cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
        createdAt: toDate(data.createdAt),
        stripeSubscriptionId: data.stripeSubscriptionId
      };
    }

    // Query by providerId field
    const q = query(
      collection(db, COLLECTIONS.SUBSCRIPTIONS),
      where('providerId', '==', providerId),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    if (data._placeholder) return null;

    return {
      id: docSnap.id,
      providerId: data.providerId || providerId,
      providerName: data.providerName,
      providerEmail: data.providerEmail,
      providerType: data.providerType || 'lawyer',
      planId: data.planId || '',
      planName: data.planName,
      tier: data.tier || 'basic',
      status: data.status || 'active',
      amount: Number(data.currentPeriodAmount || data.amount || 0),
      currency: (data.currency?.toUpperCase() || 'EUR') as Currency,
      billingPeriod: data.billingPeriod || 'monthly',
      currentPeriodStart: toDate(data.currentPeriodStart),
      currentPeriodEnd: toDate(data.currentPeriodEnd),
      cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
      createdAt: toDate(data.createdAt),
      stripeSubscriptionId: data.stripeSubscriptionId
    };
  } catch (error) {
    console.error('[AdminFinance] Error getting subscription by provider ID:', error);
    return null;
  }
}
