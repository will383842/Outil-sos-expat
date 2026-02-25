/**
 * Unified Analytics - Centralized Analytics Aggregation
 *
 * Provides comprehensive analytics aggregation for the SOS-Expat platform:
 * - User metrics (DAU, WAU, MAU, registrations, churn)
 * - Call metrics (initiated, completed, failed, duration, success rate, peak hours)
 * - Revenue metrics (daily/weekly/monthly, by country, by service type, platform fees, payouts)
 * - Conversion funnel (visitors -> registered -> first call -> repeat customer)
 *
 * @module analytics/unifiedAnalytics
 * @version 1.0.0
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';

// ============================================================================
// TYPES & INTERFACES
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
 * Peak hour entry
 */
export interface PeakHourEntry {
  hour: number;                   // 0-23
  count: number;
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
 * Revenue by country
 */
export interface CountryRevenue {
  revenue: number;
  transactions: number;
  avgValue: number;
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
export interface UnifiedAnalyticsResponse {
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
 * Daily analytics document schema (stored in analytics_daily collection)
 */
export interface DailyAnalyticsDoc {
  date: string;                   // YYYY-MM-DD format
  timestamp: FirebaseFirestore.Timestamp;
  dau: number;
  wau: number;
  mau: number;
  newClients: number;
  newProviders: number;
  callsInitiated: number;
  callsCompleted: number;
  callsFailed: number;
  avgDurationSeconds: number;
  revenue: number;                // In cents
  platformFees: number;
  providerPayouts: number;
  byCountry: Record<string, {
    revenue: number;
    calls: number;
    users: number;
  }>;
  funnel: {
    visitors: number;
    registered: number;
    firstCall: number;
    repeat: number;
  };
  providerFunnel: {
    registered: number;
    kycComplete: number;
    firstCall: number;
    active: number;
  };
  peakHours: PeakHourEntry[];
  createdAt: FirebaseFirestore.Timestamp;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  region: 'europe-west1' as const,
  memory: '256MiB' as const,
  timeoutSeconds: 120,
  collections: {
    users: 'users',
    providers: 'providers',
    callSessions: 'call_sessions',
    payments: 'payments',
    analyticsDaily: 'analytics_daily',
    siteVisits: 'site_visits',
  },
  // Platform fee percentage (20%)
  platformFeePercentage: 0.20,
  // Churn period in days (users inactive for this many days are considered churned)
  churnPeriodDays: 90,
  // Active provider threshold (minimum calls in last 30 days)
  activeProviderThreshold: 5,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Get date range based on period
 */
function getDateRange(period: AnalyticsPeriod, filters?: AnalyticsFilters): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'quarter':
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (filters?.startDate && filters?.endDate) {
        start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        end.setTime(new Date(filters.endDate).getTime());
        end.setHours(23, 59, 59, 999);
      } else {
        // Default to last 30 days if custom dates not provided
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
      }
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * Convert Date to Firestore Timestamp
 */
function toTimestamp(date: Date): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// USER METRICS AGGREGATION
// ============================================================================

async function aggregateUserMetrics(
  startDate: Date,
  endDate: Date,
  filters?: AnalyticsFilters
): Promise<UserMetrics> {
  const startTimestamp = toTimestamp(startDate);
  const endTimestamp = toTimestamp(endDate);

  // Today's boundaries for DAU
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTimestamp = toTimestamp(todayStart);

  // Week boundaries for WAU
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekTimestamp = toTimestamp(weekStart);

  // Month boundaries for MAU
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);
  monthStart.setHours(0, 0, 0, 0);
  const monthTimestamp = toTimestamp(monthStart);

  // Churn period
  const churnStart = new Date();
  churnStart.setDate(churnStart.getDate() - CONFIG.churnPeriodDays);
  const churnTimestamp = toTimestamp(churnStart);

  try {
    // Get all users
    let usersQuery = db().collection(CONFIG.collections.users);
    const allUsersSnapshot = await usersQuery.get();

    let clients = 0;
    let providers = 0;
    let dauCount = 0;
    let wauCount = 0;
    let mauCount = 0;
    let newClients = 0;
    let newProviders = 0;
    let activeProviders = 0;
    let churnedUsers = 0;
    let activeInPeriod = 0;

    for (const doc of allUsersSnapshot.docs) {
      const data = doc.data();
      const role = data.role || 'client';
      const createdAt = data.createdAt as FirebaseFirestore.Timestamp | undefined;
      const lastActiveAt = data.lastActiveAt as FirebaseFirestore.Timestamp | undefined;
      const country = data.country || data.countryOfResidence;

      // Apply country filter if specified
      if (filters?.country && country !== filters.country) {
        continue;
      }

      // Count by role
      if (role === 'provider' || role === 'lawyer') {
        providers++;

        // Check if active provider (KYC complete + has activity)
        if (data.kycStatus === 'verified' && lastActiveAt) {
          activeProviders++;
        }

        // New provider in period
        if (createdAt && createdAt.toMillis() >= startTimestamp.toMillis() &&
            createdAt.toMillis() <= endTimestamp.toMillis()) {
          newProviders++;
        }
      } else {
        clients++;

        // New client in period
        if (createdAt && createdAt.toMillis() >= startTimestamp.toMillis() &&
            createdAt.toMillis() <= endTimestamp.toMillis()) {
          newClients++;
        }
      }

      // Activity tracking
      if (lastActiveAt) {
        // DAU
        if (lastActiveAt.toMillis() >= todayTimestamp.toMillis()) {
          dauCount++;
        }
        // WAU
        if (lastActiveAt.toMillis() >= weekTimestamp.toMillis()) {
          wauCount++;
        }
        // MAU
        if (lastActiveAt.toMillis() >= monthTimestamp.toMillis()) {
          mauCount++;
        }
        // Active in period
        if (lastActiveAt.toMillis() >= startTimestamp.toMillis() &&
            lastActiveAt.toMillis() <= endTimestamp.toMillis()) {
          activeInPeriod++;
        }
        // Churned (no activity in churn period)
        if (lastActiveAt.toMillis() < churnTimestamp.toMillis()) {
          churnedUsers++;
        }
      }
    }

    // Calculate churn rate
    const totalWithActivity = allUsersSnapshot.size;
    const churnRate = totalWithActivity > 0 ? (churnedUsers / totalWithActivity) * 100 : 0;

    return {
      dau: dauCount,
      wau: wauCount,
      mau: mauCount,
      newClients,
      newProviders,
      totalUsers: clients,
      totalProviders: providers,
      churnRate: Math.round(churnRate * 100) / 100,
      activeProviders,
    };
  } catch (error) {
    logger.error('aggregateUserMetrics: Error', { error });
    throw error;
  }
}

// ============================================================================
// CALL METRICS AGGREGATION
// ============================================================================

async function aggregateCallMetrics(
  startDate: Date,
  endDate: Date,
  filters?: AnalyticsFilters
): Promise<CallMetrics> {
  const startTimestamp = toTimestamp(startDate);
  const endTimestamp = toTimestamp(endDate);

  try {
    let query = db().collection(CONFIG.collections.callSessions)
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<=', endTimestamp);

    const snapshot = await query.get();

    let initiated = 0;
    let completed = 0;
    let failed = 0;
    let canceled = 0;
    let totalDuration = 0;
    const statusCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const status = data.status || 'unknown';
      const duration = data.duration || 0;
      const createdAt = data.createdAt as FirebaseFirestore.Timestamp;

      // Apply service type filter
      if (filters?.serviceType && filters.serviceType !== 'all') {
        const providerType = data.providerType || data.serviceType;
        if (providerType !== filters.serviceType) {
          continue;
        }
      }

      initiated++;

      // Status tracking
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (status === 'completed') {
        completed++;
        totalDuration += duration;
      } else if (status === 'failed') {
        failed++;
      } else if (status === 'canceled' || status === 'cancelled') {
        canceled++;
      }

      // Peak hours tracking
      if (createdAt) {
        const hour = createdAt.toDate().getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    // Calculate peak hours (top 3)
    const peakHours: PeakHourEntry[] = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate metrics
    const avgDuration = completed > 0 ? totalDuration / completed : 0;
    const successRate = initiated > 0 ? (completed / initiated) * 100 : 0;

    return {
      callsInitiated: initiated,
      callsCompleted: completed,
      callsFailed: failed,
      callsCanceled: canceled,
      avgDurationSeconds: Math.round(avgDuration),
      totalDurationMinutes: Math.round(totalDuration / 60),
      successRate: Math.round(successRate * 100) / 100,
      peakHours,
      byStatus: statusCounts,
    };
  } catch (error) {
    logger.error('aggregateCallMetrics: Error', { error });
    throw error;
  }
}

// ============================================================================
// REVENUE METRICS AGGREGATION
// ============================================================================

async function aggregateRevenueMetrics(
  startDate: Date,
  endDate: Date,
  filters?: AnalyticsFilters
): Promise<RevenueMetrics> {
  const startTimestamp = toTimestamp(startDate);
  const endTimestamp = toTimestamp(endDate);

  // Calculate period boundaries for daily/weekly/monthly
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);
  monthStart.setHours(0, 0, 0, 0);

  try {
    // Query payments in the period
    const paymentsQuery = db().collection(CONFIG.collections.payments)
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<=', endTimestamp)
      .where('status', 'in', ['captured', 'succeeded', 'paid']);

    const snapshot = await paymentsQuery.get();

    let totalRevenue = 0;
    let dailyRevenue = 0;
    let weeklyRevenue = 0;
    let monthlyRevenue = 0;
    let platformFees = 0;
    let providerPayouts = 0;
    let transactionCount = 0;
    const byCountry: Record<string, CountryRevenue> = {};
    let lawyerRevenue = 0;
    let expatRevenue = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const amount = data.amount || 0;
      const createdAt = data.createdAt as FirebaseFirestore.Timestamp;
      const country = data.country || data.clientCountry || 'unknown';
      const serviceType = data.providerType || data.serviceType || 'expat';

      // Apply filters
      if (filters?.country && country !== filters.country) {
        continue;
      }
      if (filters?.serviceType && filters.serviceType !== 'all' && serviceType !== filters.serviceType) {
        continue;
      }

      transactionCount++;
      totalRevenue += amount;

      // Calculate platform fee and provider payout
      const fee = Math.round(amount * CONFIG.platformFeePercentage);
      platformFees += fee;
      providerPayouts += (amount - fee);

      // Time-based revenue
      const createdDate = createdAt.toDate();
      if (createdDate >= todayStart) {
        dailyRevenue += amount;
      }
      if (createdDate >= weekStart) {
        weeklyRevenue += amount;
      }
      if (createdDate >= monthStart) {
        monthlyRevenue += amount;
      }

      // By country
      if (!byCountry[country]) {
        byCountry[country] = { revenue: 0, transactions: 0, avgValue: 0 };
      }
      byCountry[country].revenue += amount;
      byCountry[country].transactions++;

      // By service type
      if (serviceType === 'lawyer') {
        lawyerRevenue += amount;
      } else {
        expatRevenue += amount;
      }
    }

    // Calculate averages for countries
    for (const country of Object.keys(byCountry)) {
      if (byCountry[country].transactions > 0) {
        byCountry[country].avgValue = Math.round(byCountry[country].revenue / byCountry[country].transactions);
      }
    }

    const avgTransactionValue = transactionCount > 0 ? Math.round(totalRevenue / transactionCount) : 0;

    return {
      daily: dailyRevenue,
      weekly: weeklyRevenue,
      monthly: monthlyRevenue,
      totalRevenue,
      platformFees,
      providerPayouts,
      averageTransactionValue: avgTransactionValue,
      transactionCount,
      byCountry,
      byServiceType: {
        lawyer: lawyerRevenue,
        expat: expatRevenue,
      },
    };
  } catch (error) {
    logger.error('aggregateRevenueMetrics: Error', { error });
    throw error;
  }
}

// ============================================================================
// FUNNEL METRICS AGGREGATION
// ============================================================================

async function aggregateFunnelMetrics(
  startDate: Date,
  endDate: Date,
  filters?: AnalyticsFilters
): Promise<{ client: ClientFunnel; provider: ProviderFunnel }> {
  const startTimestamp = toTimestamp(startDate);
  const endTimestamp = toTimestamp(endDate);

  try {
    // Get all clients
    const clientsSnapshot = await db().collection(CONFIG.collections.users)
      .where('role', '==', 'client')
      .get();

    // Get all providers
    const providersSnapshot = await db().collection(CONFIG.collections.users)
      .where('role', 'in', ['provider', 'lawyer'])
      .get();

    // Get call sessions for the period
    const callsSnapshot = await db().collection(CONFIG.collections.callSessions)
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<=', endTimestamp)
      .where('status', '==', 'completed')
      .get();

    // Client funnel calculation
    const clientCallCounts: Record<string, number> = {};
    const providerCallCounts: Record<string, number> = {};

    for (const doc of callsSnapshot.docs) {
      const data = doc.data();
      const clientId = data.clientId;
      const providerId = data.providerId;

      if (clientId) {
        clientCallCounts[clientId] = (clientCallCounts[clientId] || 0) + 1;
      }
      if (providerId) {
        providerCallCounts[providerId] = (providerCallCounts[providerId] || 0) + 1;
      }
    }

    const registeredClients = clientsSnapshot.size;
    const clientsWithFirstCall = Object.keys(clientCallCounts).length;
    const repeatCustomers = Object.values(clientCallCounts).filter(count => count >= 2).length;

    // Try to get visitor count from site_visits collection
    let visitors = 0;
    try {
      const visitsSnapshot = await db().collection(CONFIG.collections.siteVisits)
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get();
      visitors = visitsSnapshot.size;
    } catch {
      // Site visits collection may not exist
      visitors = registeredClients * 10; // Estimate: 10% conversion rate
    }

    // Provider funnel calculation
    let registeredProviders = 0;
    let kycCompleteProviders = 0;

    for (const doc of providersSnapshot.docs) {
      const data = doc.data();
      const country = data.country || data.countryOfResidence;

      // Apply country filter
      if (filters?.country && country !== filters.country) {
        continue;
      }

      registeredProviders++;

      if (data.kycStatus === 'verified' || data.stripeAccountStatus === 'complete') {
        kycCompleteProviders++;
      }
    }

    const providersWithFirstCall = Object.keys(providerCallCounts).length;
    const activeProviders = Object.values(providerCallCounts)
      .filter(count => count >= CONFIG.activeProviderThreshold).length;

    // Calculate rates
    const registrationRate = visitors > 0 ? (registeredClients / visitors) * 100 : 0;
    const firstCallRate = registeredClients > 0 ? (clientsWithFirstCall / registeredClients) * 100 : 0;
    const repeatRate = clientsWithFirstCall > 0 ? (repeatCustomers / clientsWithFirstCall) * 100 : 0;

    const kycCompletionRate = registeredProviders > 0 ? (kycCompleteProviders / registeredProviders) * 100 : 0;
    const activationRate = kycCompleteProviders > 0 ? (providersWithFirstCall / kycCompleteProviders) * 100 : 0;
    const retentionRate = providersWithFirstCall > 0 ? (activeProviders / providersWithFirstCall) * 100 : 0;

    return {
      client: {
        visitors,
        registered: registeredClients,
        firstCall: clientsWithFirstCall,
        repeatCustomer: repeatCustomers,
        registrationRate: Math.round(registrationRate * 100) / 100,
        firstCallRate: Math.round(firstCallRate * 100) / 100,
        repeatRate: Math.round(repeatRate * 100) / 100,
      },
      provider: {
        registered: registeredProviders,
        kycComplete: kycCompleteProviders,
        firstCall: providersWithFirstCall,
        active: activeProviders,
        kycCompletionRate: Math.round(kycCompletionRate * 100) / 100,
        activationRate: Math.round(activationRate * 100) / 100,
        retentionRate: Math.round(retentionRate * 100) / 100,
      },
    };
  } catch (error) {
    logger.error('aggregateFunnelMetrics: Error', { error });
    throw error;
  }
}

// ============================================================================
// CALLABLE FUNCTION: getUnifiedAnalytics
// ============================================================================

/**
 * Get unified analytics for the specified period and filters
 *
 * @param period - The time period to analyze
 * @param filters - Optional filters (country, serviceType, custom date range)
 * @returns Complete analytics data
 */
export const getUnifiedAnalytics = onCall(
  {
    region: CONFIG.region,
    cpu: 0.083,
    memory: CONFIG.memory,
    timeoutSeconds: CONFIG.timeoutSeconds,
    minInstances: 0,
  },
  async (request): Promise<UnifiedAnalyticsResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Verify admin role (check both claim formats for compatibility)
    const claims = request.auth.token;
    const isAdmin = claims?.admin === true || claims?.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { period = 'month', filters = {} } = request.data as {
      period?: AnalyticsPeriod;
      filters?: AnalyticsFilters;
    };

    logger.info('getUnifiedAnalytics: Starting aggregation', { period, filters });

    try {
      // Check for cached daily analytics if period is 'today' or 'yesterday'
      if (period === 'today' || period === 'yesterday') {
        const targetDate = period === 'today' ? new Date() : new Date(Date.now() - 86400000);
        const dateString = getDateString(targetDate);

        const cachedDoc = await db().collection(CONFIG.collections.analyticsDaily)
          .doc(dateString)
          .get();

        if (cachedDoc.exists && period === 'yesterday') {
          const cached = cachedDoc.data() as DailyAnalyticsDoc;
          logger.info('getUnifiedAnalytics: Using cached data', { date: dateString });

          return {
            period,
            filters,
            generatedAt: new Date().toISOString(),
            cached: true,
            users: {
              dau: cached.dau,
              wau: cached.wau,
              mau: cached.mau,
              newClients: cached.newClients,
              newProviders: cached.newProviders,
              totalUsers: 0, // Not stored in daily cache
              totalProviders: 0,
              churnRate: 0,
              activeProviders: 0,
            },
            calls: {
              callsInitiated: cached.callsInitiated,
              callsCompleted: cached.callsCompleted,
              callsFailed: cached.callsFailed,
              callsCanceled: 0,
              avgDurationSeconds: cached.avgDurationSeconds,
              totalDurationMinutes: 0,
              successRate: cached.callsInitiated > 0 ? (cached.callsCompleted / cached.callsInitiated) * 100 : 0,
              peakHours: cached.peakHours || [],
              byStatus: {},
            },
            revenue: {
              daily: cached.revenue,
              weekly: 0,
              monthly: 0,
              totalRevenue: cached.revenue,
              platformFees: cached.platformFees,
              providerPayouts: cached.providerPayouts,
              averageTransactionValue: 0,
              transactionCount: 0,
              byCountry: Object.fromEntries(
                Object.entries(cached.byCountry || {}).map(([country, data]) => [
                  country,
                  { revenue: data.revenue, transactions: 0, avgValue: 0 },
                ])
              ),
              byServiceType: { lawyer: 0, expat: 0 },
            },
            funnel: {
              client: {
                visitors: cached.funnel?.visitors || 0,
                registered: cached.funnel?.registered || 0,
                firstCall: cached.funnel?.firstCall || 0,
                repeatCustomer: cached.funnel?.repeat || 0,
                registrationRate: 0,
                firstCallRate: 0,
                repeatRate: 0,
              },
              provider: {
                registered: cached.providerFunnel?.registered || 0,
                kycComplete: cached.providerFunnel?.kycComplete || 0,
                firstCall: cached.providerFunnel?.firstCall || 0,
                active: cached.providerFunnel?.active || 0,
                kycCompletionRate: 0,
                activationRate: 0,
                retentionRate: 0,
              },
            },
          };
        }
      }

      // Get date range
      const { start, end } = getDateRange(period, filters);

      // Aggregate all metrics in parallel
      const [users, calls, revenue, funnel] = await Promise.all([
        aggregateUserMetrics(start, end, filters),
        aggregateCallMetrics(start, end, filters),
        aggregateRevenueMetrics(start, end, filters),
        aggregateFunnelMetrics(start, end, filters),
      ]);

      const response: UnifiedAnalyticsResponse = {
        period,
        filters,
        generatedAt: new Date().toISOString(),
        cached: false,
        users,
        calls,
        revenue,
        funnel,
      };

      logger.info('getUnifiedAnalytics: Aggregation complete', {
        period,
        dau: users.dau,
        callsCompleted: calls.callsCompleted,
        totalRevenue: revenue.totalRevenue,
      });

      return response;
    } catch (error) {
      logger.error('getUnifiedAnalytics: Error', { error });
      throw new HttpsError('internal', 'Failed to aggregate analytics');
    }
  }
);

// ============================================================================
// SCHEDULED FUNCTION: aggregateDailyAnalytics
// ============================================================================

/**
 * Pre-calculates and stores daily analytics metrics
 * Runs every day at 01:00 UTC to aggregate previous day's data
 */
export const aggregateDailyAnalytics = onSchedule(
  {
    schedule: '0 1 * * *', // 01:00 UTC daily
    timeZone: 'UTC',
    region: CONFIG.region,
    memory: CONFIG.memory,
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    logger.info('aggregateDailyAnalytics: Starting daily aggregation');

    try {
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      const dateString = getDateString(yesterday);

      // Check if already aggregated
      const existingDoc = await db().collection(CONFIG.collections.analyticsDaily)
        .doc(dateString)
        .get();

      if (existingDoc.exists) {
        logger.info('aggregateDailyAnalytics: Already aggregated', { date: dateString });
        return;
      }

      // Aggregate all metrics
      const [users, calls, revenue, funnel] = await Promise.all([
        aggregateUserMetrics(yesterday, endOfYesterday),
        aggregateCallMetrics(yesterday, endOfYesterday),
        aggregateRevenueMetrics(yesterday, endOfYesterday),
        aggregateFunnelMetrics(yesterday, endOfYesterday),
      ]);

      // Build country metrics
      const byCountry: Record<string, { revenue: number; calls: number; users: number }> = {};
      for (const [country, data] of Object.entries(revenue.byCountry)) {
        byCountry[country] = {
          revenue: data.revenue,
          calls: data.transactions,
          users: 0, // Would need additional query to get users by country
        };
      }

      // Store daily analytics document
      const dailyDoc: DailyAnalyticsDoc = {
        date: dateString,
        timestamp: toTimestamp(yesterday),
        dau: users.dau,
        wau: users.wau,
        mau: users.mau,
        newClients: users.newClients,
        newProviders: users.newProviders,
        callsInitiated: calls.callsInitiated,
        callsCompleted: calls.callsCompleted,
        callsFailed: calls.callsFailed,
        avgDurationSeconds: calls.avgDurationSeconds,
        revenue: revenue.totalRevenue,
        platformFees: revenue.platformFees,
        providerPayouts: revenue.providerPayouts,
        byCountry,
        funnel: {
          visitors: funnel.client.visitors,
          registered: funnel.client.registered,
          firstCall: funnel.client.firstCall,
          repeat: funnel.client.repeatCustomer,
        },
        providerFunnel: {
          registered: funnel.provider.registered,
          kycComplete: funnel.provider.kycComplete,
          firstCall: funnel.provider.firstCall,
          active: funnel.provider.active,
        },
        peakHours: calls.peakHours,
        createdAt: admin.firestore.Timestamp.now(),
      };

      await db().collection(CONFIG.collections.analyticsDaily).doc(dateString).set(dailyDoc);

      logger.info('aggregateDailyAnalytics: Daily aggregation complete', {
        date: dateString,
        dau: users.dau,
        callsCompleted: calls.callsCompleted,
        revenue: revenue.totalRevenue,
      });
    } catch (error) {
      logger.error('aggregateDailyAnalytics: Error during aggregation', { error });
      throw error;
    }
  }
);

// ============================================================================
// HELPER: Get historical analytics
// ============================================================================

/**
 * Get historical daily analytics for trend analysis
 */
export const getHistoricalAnalytics = onCall(
  {
    region: CONFIG.region,
    cpu: 0.083,
    memory: '128MiB',
    timeoutSeconds: 60,
    minInstances: 0,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Verify admin role (check both claim formats for compatibility)
    const claims = request.auth.token;
    const isAdmin = claims?.admin === true || claims?.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { days = 30 } = request.data as { days?: number };
    const limitDays = Math.min(Math.max(days, 1), 365); // Limit between 1 and 365 days

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - limitDays);
      const startString = getDateString(startDate);

      const snapshot = await db().collection(CONFIG.collections.analyticsDaily)
        .where('date', '>=', startString)
        .orderBy('date', 'desc')
        .limit(limitDays)
        .get();

      const history = snapshot.docs.map(doc => {
        const data = doc.data() as DailyAnalyticsDoc;
        return {
          date: data.date,
          dau: data.dau,
          wau: data.wau,
          mau: data.mau,
          newClients: data.newClients,
          newProviders: data.newProviders,
          callsCompleted: data.callsCompleted,
          revenue: data.revenue,
          platformFees: data.platformFees,
        };
      });

      return {
        success: true,
        days: limitDays,
        data: history,
      };
    } catch (error) {
      logger.error('getHistoricalAnalytics: Error', { error });
      throw new HttpsError('internal', 'Failed to fetch historical analytics');
    }
  }
);

// ============================================================================
// CLEANUP: Remove old analytics data
// ============================================================================

/**
 * Clean up analytics data older than 2 years
 * Runs weekly on Sunday at 02:00 UTC
 */
export const cleanupOldAnalytics = onSchedule(
  {
    schedule: '0 2 * * 0', // 02:00 UTC every Sunday
    timeZone: 'UTC',
    region: CONFIG.region,
    memory: '128MiB',
    cpu: 0.083,
    timeoutSeconds: 120,
  },
  async () => {
    logger.info('cleanupOldAnalytics: Starting cleanup');

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const cutoffDate = getDateString(twoYearsAgo);

    try {
      const oldDocs = await db().collection(CONFIG.collections.analyticsDaily)
        .where('date', '<', cutoffDate)
        .limit(500)
        .get();

      if (oldDocs.empty) {
        logger.info('cleanupOldAnalytics: No old analytics to clean up');
        return;
      }

      const batch = db().batch();
      oldDocs.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      logger.info('cleanupOldAnalytics: Cleanup complete', { deleted: oldDocs.size });
    } catch (error) {
      logger.error('cleanupOldAnalytics: Error during cleanup', { error });
      throw error;
    }
  }
);
