/**
 * Threshold Service
 * Frontend service for tax threshold management
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { db } from '../config/firebase';
import {
  ThresholdTracking,
  ThresholdAlert,
  ThresholdConfig,
  ThresholdDashboardSummary,
  ThresholdFilters,
  ThresholdStatus,
  THRESHOLD_CONFIGS,
  THRESHOLD_STATUS_LABELS,
  THRESHOLD_STATUS_COLORS,
  COUNTRY_REGIONS,
  formatThresholdCurrency,
} from '../types/thresholds';

// ============================================================================
// TYPES
// ============================================================================

interface ThresholdDashboardResponse {
  success: boolean;
  data: {
    trackings: ThresholdTrackingDoc[];
    summary: ThresholdDashboardSummary;
    configs: ThresholdConfig[];
  };
}

interface ThresholdTrackingDoc {
  countryCode: string;
  countryName: string;
  period: string;
  periodType: string;
  thresholdAmount: number;
  thresholdCurrency: string;
  currentAmount: number;
  currentAmountEUR: number;
  transactionCount: number;
  b2cCount: number;
  b2bCount: number;
  percentageUsed: number;
  status: ThresholdStatus;
  isRegistered: boolean;
  registrationNumber?: string;
  registrationDate?: Timestamp;
  alertsSent: {
    alert70: boolean;
    alert90: boolean;
    alert100: boolean;
    alert70SentAt?: Timestamp;
    alert90SentAt?: Timestamp;
    alert100SentAt?: Timestamp;
  };
  lastTransactionAt?: Timestamp;
  lastAlertAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ThresholdAlertDoc {
  id: string;
  countryCode: string;
  alertType: string;
  percentageAtAlert: number;
  amountAtAlert: number;
  thresholdAmount: number;
  currency: string;
  notificationSent: boolean;
  emailSent: boolean;
  emailRecipients?: string[];
  blockingApplied: boolean;
  createdAt: Timestamp;
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  acknowledgeNotes?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLECTIONS = {
  THRESHOLD_TRACKING: 'threshold_tracking',
  THRESHOLD_ALERTS: 'threshold_alerts',
  THRESHOLD_DAILY_SUMMARIES: 'threshold_daily_summaries',
} as const;

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Map<string, CacheEntry<unknown>> = new Map();

function getCached<T>(key: string): T | null {
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

export function clearThresholdCache(): void {
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

function docToThresholdTracking(doc: ThresholdTrackingDoc): ThresholdTracking {
  return {
    countryCode: doc.countryCode,
    countryName: doc.countryName,
    period: doc.period,
    periodType: doc.periodType as ThresholdTracking['periodType'],
    thresholdAmount: doc.thresholdAmount,
    thresholdCurrency: doc.thresholdCurrency as ThresholdTracking['thresholdCurrency'],
    currentAmount: doc.currentAmount,
    currentAmountEUR: doc.currentAmountEUR,
    transactionCount: doc.transactionCount,
    b2cCount: doc.b2cCount,
    b2bCount: doc.b2bCount,
    percentageUsed: doc.percentageUsed,
    status: doc.status,
    isRegistered: doc.isRegistered,
    registrationNumber: doc.registrationNumber,
    registrationDate: doc.registrationDate ? toDate(doc.registrationDate) : undefined,
    alertsSent: {
      alert70: doc.alertsSent.alert70,
      alert90: doc.alertsSent.alert90,
      alert100: doc.alertsSent.alert100,
      alert70SentAt: doc.alertsSent.alert70SentAt ? toDate(doc.alertsSent.alert70SentAt) : undefined,
      alert90SentAt: doc.alertsSent.alert90SentAt ? toDate(doc.alertsSent.alert90SentAt) : undefined,
      alert100SentAt: doc.alertsSent.alert100SentAt ? toDate(doc.alertsSent.alert100SentAt) : undefined,
    },
    lastTransactionAt: doc.lastTransactionAt ? toDate(doc.lastTransactionAt) : undefined,
    lastAlertAt: doc.lastAlertAt ? toDate(doc.lastAlertAt) : undefined,
    createdAt: toDate(doc.createdAt),
    updatedAt: toDate(doc.updatedAt),
  };
}

function docToThresholdAlert(doc: ThresholdAlertDoc): ThresholdAlert {
  return {
    id: doc.id,
    countryCode: doc.countryCode,
    alertType: doc.alertType as ThresholdAlert['alertType'],
    percentageAtAlert: doc.percentageAtAlert,
    amountAtAlert: doc.amountAtAlert,
    thresholdAmount: doc.thresholdAmount,
    currency: doc.currency as ThresholdAlert['currency'],
    notificationSent: doc.notificationSent,
    emailSent: doc.emailSent,
    emailRecipients: doc.emailRecipients,
    blockingApplied: doc.blockingApplied,
    createdAt: toDate(doc.createdAt),
    acknowledgedBy: doc.acknowledgedBy,
    acknowledgedAt: doc.acknowledgedAt ? toDate(doc.acknowledgedAt) : undefined,
    acknowledgeNotes: doc.acknowledgeNotes,
  };
}

// ============================================================================
// DATA FETCHING - DIRECT FIRESTORE
// ============================================================================

/**
 * Fetch all threshold trackings from Firestore
 */
export async function fetchThresholdTrackings(
  filters?: ThresholdFilters
): Promise<ThresholdTracking[]> {
  const cacheKey = `trackings:${JSON.stringify(filters || {})}`;
  const cached = getCached<ThresholdTracking[]>(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, COLLECTIONS.THRESHOLD_TRACKING),
      orderBy('percentageUsed', 'desc')
    );

    const snapshot = await getDocs(q);
    let trackings = snapshot.docs.map(doc => {
      const data = doc.data() as ThresholdTrackingDoc;
      return docToThresholdTracking(data);
    });

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        trackings = trackings.filter(t => t.status === filters.status);
      }

      if (filters.region && filters.region !== 'all') {
        trackings = trackings.filter(t => {
          const region = COUNTRY_REGIONS[t.countryCode];
          return region === filters.region;
        });
      }

      if (filters.periodType && filters.periodType !== 'all') {
        trackings = trackings.filter(t => t.periodType === filters.periodType);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        trackings = trackings.filter(t =>
          t.countryName.toLowerCase().includes(searchLower) ||
          t.countryCode.toLowerCase().includes(searchLower)
        );
      }
    }

    setCache(cacheKey, trackings);
    return trackings;
  } catch (error) {
    console.error('[ThresholdService] Error fetching trackings:', error);
    return [];
  }
}

/**
 * Fetch threshold tracking for a specific country
 */
export async function fetchThresholdByCountry(
  countryCode: string
): Promise<ThresholdTracking | null> {
  const cacheKey = `tracking:${countryCode}`;
  const cached = getCached<ThresholdTracking>(cacheKey);
  if (cached) return cached;

  try {
    // Get current period based on config
    const config = THRESHOLD_CONFIGS.find(c => c.countryCode === countryCode);
    if (!config) return null;

    const now = new Date();
    const year = now.getFullYear();
    let period: string;

    switch (config.periodType) {
      case 'CALENDAR_YEAR':
        period = year.toString();
        break;
      case 'ROLLING_12M':
        period = 'rolling';
        break;
      case 'QUARTER':
        const quarter = Math.ceil((now.getMonth() + 1) / 3);
        period = `${year}-Q${quarter}`;
        break;
    }

    const docId = `${countryCode}_${period}`;
    const docRef = doc(db, COLLECTIONS.THRESHOLD_TRACKING, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const tracking = docToThresholdTracking(docSnap.data() as ThresholdTrackingDoc);
    setCache(cacheKey, tracking);
    return tracking;
  } catch (error) {
    console.error('[ThresholdService] Error fetching country threshold:', error);
    return null;
  }
}

/**
 * Fetch recent alerts
 */
export async function fetchRecentAlerts(days: number = 30): Promise<ThresholdAlert[]> {
  const cacheKey = `alerts:${days}`;
  const cached = getCached<ThresholdAlert[]>(cacheKey);
  if (cached) return cached;

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const q = query(
      collection(db, COLLECTIONS.THRESHOLD_ALERTS),
      where('createdAt', '>=', Timestamp.fromDate(cutoff)),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const alerts = snapshot.docs.map(doc => {
      const data = doc.data() as Omit<ThresholdAlertDoc, 'id'>;
      return docToThresholdAlert({ ...data, id: doc.id });
    });

    setCache(cacheKey, alerts);
    return alerts;
  } catch (error) {
    console.error('[ThresholdService] Error fetching alerts:', error);
    return [];
  }
}

/**
 * Fetch dashboard summary
 */
export async function fetchThresholdDashboardSummary(): Promise<ThresholdDashboardSummary> {
  const cacheKey = 'dashboard:summary';
  const cached = getCached<ThresholdDashboardSummary>(cacheKey);
  if (cached) return cached;

  try {
    const [trackings, alerts] = await Promise.all([
      fetchThresholdTrackings(),
      fetchRecentAlerts(30),
    ]);

    const summary: ThresholdDashboardSummary = {
      totalTracked: trackings.length,
      safeCount: trackings.filter(t => t.status === 'SAFE').length,
      warningCount: trackings.filter(t => t.status === 'WARNING_70' || t.status === 'WARNING_90').length,
      exceededCount: trackings.filter(t => t.status === 'EXCEEDED').length,
      registeredCount: trackings.filter(t => t.status === 'REGISTERED').length,
      criticalThresholds: trackings.filter(t => t.status === 'WARNING_90' || t.status === 'EXCEEDED'),
      recentAlerts: alerts,
      totalRevenueEUR: trackings.reduce((sum, t) => sum + t.currentAmountEUR, 0),
    };

    setCache(cacheKey, summary);
    return summary;
  } catch (error) {
    console.error('[ThresholdService] Error fetching dashboard summary:', error);
    return {
      totalTracked: 0,
      safeCount: 0,
      warningCount: 0,
      exceededCount: 0,
      registeredCount: 0,
      criticalThresholds: [],
      recentAlerts: [],
      totalRevenueEUR: 0,
    };
  }
}

// ============================================================================
// CLOUD FUNCTION CALLS
// ============================================================================

const functions = getFunctions(undefined, 'europe-west1');

/**
 * Get threshold dashboard data via Cloud Function
 */
export async function getThresholdDashboardFromFunction(): Promise<ThresholdDashboardResponse['data'] | null> {
  try {
    const getThresholdDashboard = httpsCallable<void, ThresholdDashboardResponse>(
      functions,
      'getThresholdDashboard'
    );

    const result = await getThresholdDashboard();

    if (result.data.success) {
      return result.data.data;
    }

    return null;
  } catch (error) {
    console.error('[ThresholdService] Error calling getThresholdDashboard:', error);
    return null;
  }
}

/**
 * Mark a country as registered for tax
 */
export async function markCountryAsRegistered(
  countryCode: string,
  registrationNumber: string
): Promise<boolean> {
  try {
    const markCountryAsRegisteredFn = httpsCallable<
      { countryCode: string; registrationNumber: string },
      { success: boolean; message: string }
    >(functions, 'markCountryAsRegistered');

    const result = await markCountryAsRegisteredFn({ countryCode, registrationNumber });

    if (result.data.success) {
      clearThresholdCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[ThresholdService] Error marking country as registered:', error);
    return false;
  }
}

/**
 * Acknowledge a threshold alert
 */
export async function acknowledgeAlert(
  alertId: string,
  notes?: string
): Promise<boolean> {
  try {
    const acknowledgeThresholdAlertFn = httpsCallable<
      { alertId: string; notes?: string },
      { success: boolean; message: string }
    >(functions, 'acknowledgeThresholdAlert');

    const result = await acknowledgeThresholdAlertFn({ alertId, notes });

    if (result.data.success) {
      clearThresholdCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[ThresholdService] Error acknowledging alert:', error);
    return false;
  }
}

/**
 * Initialize threshold tracking for all countries
 */
export async function initializeAllThresholds(): Promise<boolean> {
  try {
    const initializeThresholdTrackingFn = httpsCallable<
      void,
      { success: boolean; data: Array<{ countryCode: string; created: boolean }> }
    >(functions, 'initializeThresholdTracking');

    const result = await initializeThresholdTrackingFn();

    if (result.data.success) {
      clearThresholdCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[ThresholdService] Error initializing thresholds:', error);
    return false;
  }
}

/**
 * Trigger manual threshold recalculation
 */
export async function triggerRecalculation(): Promise<boolean> {
  try {
    const triggerThresholdRecalculationFn = httpsCallable<
      void,
      { success: boolean; message: string }
    >(functions, 'triggerThresholdRecalculation');

    const result = await triggerThresholdRecalculationFn();

    if (result.data.success) {
      clearThresholdCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[ThresholdService] Error triggering recalculation:', error);
    return false;
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to threshold tracking updates
 */
export function subscribeToThresholds(
  callback: (trackings: ThresholdTracking[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.THRESHOLD_TRACKING),
    orderBy('percentageUsed', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const trackings = snapshot.docs.map(doc => {
      const data = doc.data() as ThresholdTrackingDoc;
      return docToThresholdTracking(data);
    });
    callback(trackings);
  }, (error) => {
    console.error('[ThresholdService] Subscription error:', error);
  });
}

/**
 * Subscribe to threshold alerts
 */
export function subscribeToAlerts(
  callback: (alerts: ThresholdAlert[]) => void,
  days: number = 30
): Unsubscribe {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const q = query(
    collection(db, COLLECTIONS.THRESHOLD_ALERTS),
    where('createdAt', '>=', Timestamp.fromDate(cutoff)),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => {
      const data = doc.data() as Omit<ThresholdAlertDoc, 'id'>;
      return docToThresholdAlert({ ...data, id: doc.id });
    });
    callback(alerts);
  }, (error) => {
    console.error('[ThresholdService] Alerts subscription error:', error);
  });
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export threshold data to CSV
 */
export function exportThresholdsToCSV(trackings: ThresholdTracking[]): string {
  const headers = [
    'Pays/Zone',
    'Code',
    'Montant Actuel',
    'Seuil',
    'Devise',
    'Pourcentage',
    'Statut',
    'Transactions',
    'B2C',
    'B2B',
    'Periode',
    'Enregistre',
    'Numero TVA',
    'Derniere Transaction',
    'Derniere Alerte',
  ];

  const rows = trackings.map(t => [
    t.countryName,
    t.countryCode,
    t.currentAmount.toFixed(2),
    t.thresholdAmount.toFixed(2),
    t.thresholdCurrency,
    t.percentageUsed.toFixed(1),
    THRESHOLD_STATUS_LABELS[t.status],
    t.transactionCount.toString(),
    t.b2cCount.toString(),
    t.b2bCount.toString(),
    t.period,
    t.isRegistered ? 'Oui' : 'Non',
    t.registrationNumber || '',
    t.lastTransactionAt?.toISOString() || '',
    t.lastAlertAt?.toISOString() || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export {
  THRESHOLD_CONFIGS,
  THRESHOLD_STATUS_LABELS,
  THRESHOLD_STATUS_COLORS,
  COUNTRY_REGIONS,
  formatThresholdCurrency,
};
