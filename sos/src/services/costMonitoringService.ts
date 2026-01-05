/**
 * Cost Monitoring Service
 * Service de surveillance des couts et du rate limiting pour SOS-Expat
 *
 * Ce service fournit:
 * - Recuperation des metriques de couts depuis Firestore
 * - Stats de rate limiting
 * - Usage Twilio (SMS/Voice)
 * - Alertes de couts en temps reel
 * - Estimation des couts mensuels
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Metriques de couts stockees dans Firestore
 */
export interface CostMetric {
  id: string;
  service: CostService;
  category: CostCategory;
  amount: number;
  currency: 'EUR' | 'USD';
  quantity: number;
  unitCost: number;
  period: string; // Format: YYYY-MM
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Services generes de couts
 */
export type CostService =
  | 'firebase'
  | 'twilio'
  | 'stripe'
  | 'openai'
  | 'sendgrid'
  | 'storage'
  | 'functions'
  | 'firestore'
  | 'auth'
  | 'hosting'
  | 'other';

/**
 * Categories de couts
 */
export type CostCategory =
  | 'sms'
  | 'voice'
  | 'ai_calls'
  | 'storage'
  | 'bandwidth'
  | 'reads'
  | 'writes'
  | 'deletes'
  | 'invocations'
  | 'compute'
  | 'transactions'
  | 'authentication'
  | 'other';

/**
 * Resume des metriques de couts
 */
export interface CostMetricsSummary {
  totalCost: number;
  currency: 'EUR' | 'USD';
  period: string;
  byService: Record<CostService, number>;
  byCategory: Record<CostCategory, number>;
  topCostDrivers: Array<{
    service: CostService;
    category: CostCategory;
    amount: number;
    percentageOfTotal: number;
  }>;
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number;
}

/**
 * Statistiques de rate limiting
 */
export interface RateLimitStats {
  id: string;
  endpoint: string;
  service: string;
  currentUsage: number;
  limit: number;
  remainingQuota: number;
  percentageUsed: number;
  resetAt: Date;
  windowDuration: number; // en secondes
  isBlocked: boolean;
  blockedUntil?: Date;
  totalRequestsToday: number;
  rejectedRequestsToday: number;
  lastRequestAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Resume du rate limiting
 */
export interface RateLimitSummary {
  totalEndpoints: number;
  blockedEndpoints: number;
  criticalEndpoints: number; // > 90% usage
  warningEndpoints: number; // > 70% usage
  healthyEndpoints: number; // <= 70% usage
  totalRequestsToday: number;
  totalRejectedToday: number;
  rejectionRate: number;
}

/**
 * Usage Twilio (SMS et Voice)
 */
export interface TwilioUsage {
  period: string;
  sms: {
    sent: number;
    received: number;
    failed: number;
    totalCost: number;
    costPerSms: number;
    byCountry: Record<string, { count: number; cost: number }>;
  };
  voice: {
    callsMade: number;
    callsReceived: number;
    totalMinutes: number;
    totalCost: number;
    costPerMinute: number;
    byCountry: Record<string, { minutes: number; cost: number }>;
  };
  totalCost: number;
  currency: 'EUR' | 'USD';
  lastUpdated: Date;
}

/**
 * Alerte de cout
 */
export interface CostAlert {
  id: string;
  type: CostAlertType;
  severity: CostAlertSeverity;
  service: CostService;
  category?: CostCategory;
  title: string;
  message: string;
  currentValue: number;
  threshold: number;
  percentageOfThreshold: number;
  currency: 'EUR' | 'USD';
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export type CostAlertType =
  | 'threshold_warning'  // 70% du seuil
  | 'threshold_critical' // 90% du seuil
  | 'threshold_exceeded' // 100%+ du seuil
  | 'anomaly_detected'   // Spike inhabituel
  | 'rate_limit_warning' // Rate limit proche
  | 'rate_limit_hit'     // Rate limit atteint
  | 'budget_warning'     // Budget mensuel proche
  | 'budget_exceeded';   // Budget depassé

export type CostAlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

/**
 * Configuration des seuils de cout
 */
export interface CostThresholdConfig {
  service: CostService;
  category?: CostCategory;
  monthlyBudget: number;
  warningThreshold: number; // Pourcentage (ex: 70)
  criticalThreshold: number; // Pourcentage (ex: 90)
  currency: 'EUR' | 'USD';
  notifyEmails: string[];
  notifySlack: boolean;
  autoBlock: boolean; // Bloquer automatiquement si depassé
}

/**
 * Estimation des couts mensuels
 */
export interface MonthlyEstimate {
  period: string;
  currentSpend: number;
  projectedSpend: number;
  budget: number;
  percentageOfBudget: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyAverage: number;
  projectedOverage: number;
  currency: 'EUR' | 'USD';
  breakdown: Array<{
    service: CostService;
    currentSpend: number;
    projectedSpend: number;
    percentageOfTotal: number;
  }>;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLLECTIONS = {
  COST_METRICS: 'cost_metrics',
  RATE_LIMITS: 'rate_limits',
  TWILIO_USAGE: 'twilio_usage',
  COST_ALERTS: 'cost_alerts',
  COST_THRESHOLDS: 'cost_thresholds',
} as const;

/** Duree du cache (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Seuils par defaut */
const DEFAULT_THRESHOLDS = {
  warning: 70,
  critical: 90,
} as const;

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

/**
 * Vide le cache du service
 */
export function clearCostMonitoringCache(): void {
  cache.clear();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convertit une valeur en Date
 */
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

/**
 * Obtient la periode actuelle (YYYY-MM)
 */
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Parse un document Firestore en CostMetric
 */
function parseCostMetric(id: string, data: DocumentData): CostMetric {
  return {
    id,
    service: data.service as CostService,
    category: data.category as CostCategory,
    amount: data.amount ?? 0,
    currency: data.currency ?? 'EUR',
    quantity: data.quantity ?? 0,
    unitCost: data.unitCost ?? 0,
    period: data.period ?? getCurrentPeriod(),
    timestamp: toDate(data.timestamp),
    metadata: data.metadata,
  };
}

/**
 * Parse un document Firestore en RateLimitStats
 */
function parseRateLimitStats(id: string, data: DocumentData): RateLimitStats {
  const currentUsage = data.currentUsage ?? 0;
  const limitValue = data.limit ?? 1000;
  const percentageUsed = limitValue > 0 ? (currentUsage / limitValue) * 100 : 0;

  return {
    id,
    endpoint: data.endpoint ?? '',
    service: data.service ?? 'unknown',
    currentUsage,
    limit: limitValue,
    remainingQuota: Math.max(0, limitValue - currentUsage),
    percentageUsed,
    resetAt: toDate(data.resetAt),
    windowDuration: data.windowDuration ?? 3600,
    isBlocked: data.isBlocked ?? false,
    blockedUntil: data.blockedUntil ? toDate(data.blockedUntil) : undefined,
    totalRequestsToday: data.totalRequestsToday ?? 0,
    rejectedRequestsToday: data.rejectedRequestsToday ?? 0,
    lastRequestAt: data.lastRequestAt ? toDate(data.lastRequestAt) : undefined,
    metadata: data.metadata,
  };
}

/**
 * Parse un document Firestore en CostAlert
 */
function parseCostAlert(id: string, data: DocumentData): CostAlert {
  return {
    id,
    type: data.type as CostAlertType,
    severity: data.severity as CostAlertSeverity,
    service: data.service as CostService,
    category: data.category as CostCategory | undefined,
    title: data.title ?? '',
    message: data.message ?? '',
    currentValue: data.currentValue ?? 0,
    threshold: data.threshold ?? 0,
    percentageOfThreshold: data.percentageOfThreshold ?? 0,
    currency: data.currency ?? 'EUR',
    triggeredAt: toDate(data.triggeredAt),
    acknowledgedAt: data.acknowledgedAt ? toDate(data.acknowledgedAt) : undefined,
    acknowledgedBy: data.acknowledgedBy,
    resolvedAt: data.resolvedAt ? toDate(data.resolvedAt) : undefined,
    metadata: data.metadata,
  };
}

/**
 * Parse un document Firestore en TwilioUsage
 */
function parseTwilioUsage(data: DocumentData): TwilioUsage {
  return {
    period: data.period ?? getCurrentPeriod(),
    sms: {
      sent: data.sms?.sent ?? 0,
      received: data.sms?.received ?? 0,
      failed: data.sms?.failed ?? 0,
      totalCost: data.sms?.totalCost ?? 0,
      costPerSms: data.sms?.costPerSms ?? 0,
      byCountry: data.sms?.byCountry ?? {},
    },
    voice: {
      callsMade: data.voice?.callsMade ?? 0,
      callsReceived: data.voice?.callsReceived ?? 0,
      totalMinutes: data.voice?.totalMinutes ?? 0,
      totalCost: data.voice?.totalCost ?? 0,
      costPerMinute: data.voice?.costPerMinute ?? 0,
      byCountry: data.voice?.byCountry ?? {},
    },
    totalCost: data.totalCost ?? 0,
    currency: data.currency ?? 'EUR',
    lastUpdated: toDate(data.lastUpdated),
  };
}

// ============================================================================
// FETCH COST METRICS
// ============================================================================

/**
 * Recupere les metriques de couts depuis Firestore
 * @param period - Periode au format YYYY-MM (defaut: mois en cours)
 * @param service - Filtrer par service (optionnel)
 */
export async function fetchCostMetrics(
  period?: string,
  service?: CostService
): Promise<CostMetric[]> {
  const targetPeriod = period ?? getCurrentPeriod();
  const cacheKey = `cost_metrics:${targetPeriod}:${service ?? 'all'}`;

  const cached = getCached<CostMetric[]>(cacheKey);
  if (cached) return cached;

  try {
    let q = query(
      collection(db, COLLECTIONS.COST_METRICS),
      where('period', '==', targetPeriod),
      orderBy('amount', 'desc')
    );

    if (service) {
      q = query(
        collection(db, COLLECTIONS.COST_METRICS),
        where('period', '==', targetPeriod),
        where('service', '==', service),
        orderBy('amount', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const metrics = snapshot.docs.map(d => parseCostMetric(d.id, d.data()));

    setCache(cacheKey, metrics);
    return metrics;
  } catch (error) {
    console.error('[CostMonitoringService] Error fetching cost metrics:', error);
    return [];
  }
}

/**
 * Recupere un resume des metriques de couts
 */
export async function fetchCostMetricsSummary(period?: string): Promise<CostMetricsSummary> {
  const targetPeriod = period ?? getCurrentPeriod();
  const cacheKey = `cost_summary:${targetPeriod}`;

  const cached = getCached<CostMetricsSummary>(cacheKey);
  if (cached) return cached;

  try {
    const metrics = await fetchCostMetrics(targetPeriod);

    // Calculer les totaux par service et categorie
    const byService: Record<CostService, number> = {} as Record<CostService, number>;
    const byCategory: Record<CostCategory, number> = {} as Record<CostCategory, number>;
    let totalCost = 0;

    for (const metric of metrics) {
      totalCost += metric.amount;
      byService[metric.service] = (byService[metric.service] ?? 0) + metric.amount;
      byCategory[metric.category] = (byCategory[metric.category] ?? 0) + metric.amount;
    }

    // Top cost drivers
    const topCostDrivers = metrics
      .slice(0, 5)
      .map(m => ({
        service: m.service,
        category: m.category,
        amount: m.amount,
        percentageOfTotal: totalCost > 0 ? (m.amount / totalCost) * 100 : 0,
      }));

    // Calculer la tendance (comparaison avec le mois precedent)
    const [year, month] = targetPeriod.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const prevMetrics = await fetchCostMetrics(prevPeriod);
    const prevTotal = prevMetrics.reduce((sum, m) => sum + m.amount, 0);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let trendPercentage = 0;

    if (prevTotal > 0) {
      trendPercentage = ((totalCost - prevTotal) / prevTotal) * 100;
      if (trendPercentage > 5) trend = 'increasing';
      else if (trendPercentage < -5) trend = 'decreasing';
    }

    const summary: CostMetricsSummary = {
      totalCost,
      currency: 'EUR',
      period: targetPeriod,
      byService,
      byCategory,
      topCostDrivers,
      trend,
      trendPercentage,
    };

    setCache(cacheKey, summary);
    return summary;
  } catch (error) {
    console.error('[CostMonitoringService] Error fetching cost summary:', error);
    return {
      totalCost: 0,
      currency: 'EUR',
      period: targetPeriod,
      byService: {} as Record<CostService, number>,
      byCategory: {} as Record<CostCategory, number>,
      topCostDrivers: [],
      trend: 'stable',
      trendPercentage: 0,
    };
  }
}

// ============================================================================
// FETCH RATE LIMIT STATS
// ============================================================================

/**
 * Recupere les statistiques de rate limiting depuis Firestore
 */
export async function fetchRateLimitStats(): Promise<RateLimitStats[]> {
  const cacheKey = 'rate_limit_stats';

  const cached = getCached<RateLimitStats[]>(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, COLLECTIONS.RATE_LIMITS),
      orderBy('percentageUsed', 'desc')
    );

    const snapshot = await getDocs(q);
    const stats = snapshot.docs.map(d => parseRateLimitStats(d.id, d.data()));

    setCache(cacheKey, stats);
    return stats;
  } catch (error) {
    console.error('[CostMonitoringService] Error fetching rate limit stats:', error);
    return [];
  }
}

/**
 * Recupere un resume du rate limiting
 */
export async function fetchRateLimitSummary(): Promise<RateLimitSummary> {
  const cacheKey = 'rate_limit_summary';

  const cached = getCached<RateLimitSummary>(cacheKey);
  if (cached) return cached;

  try {
    const stats = await fetchRateLimitStats();

    const summary: RateLimitSummary = {
      totalEndpoints: stats.length,
      blockedEndpoints: stats.filter(s => s.isBlocked).length,
      criticalEndpoints: stats.filter(s => s.percentageUsed > 90 && !s.isBlocked).length,
      warningEndpoints: stats.filter(s => s.percentageUsed > 70 && s.percentageUsed <= 90).length,
      healthyEndpoints: stats.filter(s => s.percentageUsed <= 70).length,
      totalRequestsToday: stats.reduce((sum, s) => sum + s.totalRequestsToday, 0),
      totalRejectedToday: stats.reduce((sum, s) => sum + s.rejectedRequestsToday, 0),
      rejectionRate: 0,
    };

    if (summary.totalRequestsToday > 0) {
      summary.rejectionRate = (summary.totalRejectedToday / summary.totalRequestsToday) * 100;
    }

    setCache(cacheKey, summary);
    return summary;
  } catch (error) {
    console.error('[CostMonitoringService] Error fetching rate limit summary:', error);
    return {
      totalEndpoints: 0,
      blockedEndpoints: 0,
      criticalEndpoints: 0,
      warningEndpoints: 0,
      healthyEndpoints: 0,
      totalRequestsToday: 0,
      totalRejectedToday: 0,
      rejectionRate: 0,
    };
  }
}

/**
 * Recupere les stats d'un endpoint specifique
 */
export async function fetchRateLimitForEndpoint(endpoint: string): Promise<RateLimitStats | null> {
  const cacheKey = `rate_limit:${endpoint}`;

  const cached = getCached<RateLimitStats>(cacheKey);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, COLLECTIONS.RATE_LIMITS),
      where('endpoint', '==', endpoint),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const stats = parseRateLimitStats(snapshot.docs[0].id, snapshot.docs[0].data());
    setCache(cacheKey, stats);
    return stats;
  } catch (error) {
    console.error('[CostMonitoringService] Error fetching endpoint rate limit:', error);
    return null;
  }
}

// ============================================================================
// FETCH TWILIO USAGE
// ============================================================================

/**
 * Recupere l'usage Twilio (SMS/Voice) depuis Firestore
 * @param period - Periode au format YYYY-MM (defaut: mois en cours)
 */
export async function fetchTwilioUsage(period?: string): Promise<TwilioUsage | null> {
  const targetPeriod = period ?? getCurrentPeriod();
  const cacheKey = `twilio_usage:${targetPeriod}`;

  const cached = getCached<TwilioUsage>(cacheKey);
  if (cached) return cached;

  try {
    const docRef = doc(db, COLLECTIONS.TWILIO_USAGE, targetPeriod);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Essayer avec le format alternatif (twilio_YYYY-MM)
      const altDocRef = doc(db, COLLECTIONS.TWILIO_USAGE, `twilio_${targetPeriod}`);
      const altDocSnap = await getDoc(altDocRef);

      if (!altDocSnap.exists()) {
        return null;
      }

      const usage = parseTwilioUsage(altDocSnap.data());
      setCache(cacheKey, usage);
      return usage;
    }

    const usage = parseTwilioUsage(docSnap.data());
    setCache(cacheKey, usage);
    return usage;
  } catch (error) {
    console.error('[CostMonitoringService] Error fetching Twilio usage:', error);
    return null;
  }
}

/**
 * Recupere l'usage Twilio via Cloud Function (donnees temps reel de l'API Twilio)
 */
export async function fetchTwilioUsageFromAPI(): Promise<TwilioUsage | null> {
  try {
    const getTwilioUsage = httpsCallable<
      { period?: string },
      { success: boolean; data: TwilioUsage; error?: string }
    >(functions, 'getTwilioUsage');

    const result = await getTwilioUsage({ period: getCurrentPeriod() });

    if (result.data.success) {
      return {
        ...result.data.data,
        lastUpdated: new Date(),
      };
    }

    console.warn('[CostMonitoringService] Twilio API error:', result.data.error);
    return null;
  } catch (error) {
    console.error('[CostMonitoringService] Error calling getTwilioUsage:', error);
    return null;
  }
}

// ============================================================================
// COST ALERTS
// ============================================================================

/**
 * Souscrit aux alertes de couts en temps reel
 * @param callback - Fonction appelee a chaque mise a jour
 * @param options - Options de filtrage
 * @returns Fonction pour arreter l'ecoute
 */
export function subscribeToCostAlerts(
  callback: (alerts: CostAlert[]) => void,
  options?: {
    severity?: CostAlertSeverity[];
    unacknowledgedOnly?: boolean;
    service?: CostService;
  }
): Unsubscribe {
  let q = query(
    collection(db, COLLECTIONS.COST_ALERTS),
    orderBy('triggeredAt', 'desc'),
    limit(50)
  );

  // Filtrer par severity si specifie
  if (options?.severity && options.severity.length > 0) {
    q = query(
      collection(db, COLLECTIONS.COST_ALERTS),
      where('severity', 'in', options.severity),
      orderBy('triggeredAt', 'desc'),
      limit(50)
    );
  }

  // Filtrer par service si specifie
  if (options?.service) {
    q = query(
      collection(db, COLLECTIONS.COST_ALERTS),
      where('service', '==', options.service),
      orderBy('triggeredAt', 'desc'),
      limit(50)
    );
  }

  return onSnapshot(
    q,
    (snapshot) => {
      let alerts = snapshot.docs.map(d => parseCostAlert(d.id, d.data()));

      // Filtrer les non-acknowledges si demandé
      if (options?.unacknowledgedOnly) {
        alerts = alerts.filter(a => !a.acknowledgedAt);
      }

      callback(alerts);
    },
    (error) => {
      console.error('[CostMonitoringService] Cost alerts subscription error:', error);
      callback([]);
    }
  );
}

/**
 * Recupere les alertes de couts recentes
 */
export async function fetchRecentCostAlerts(days: number = 7): Promise<CostAlert[]> {
  const cacheKey = `cost_alerts:${days}`;

  const cached = getCached<CostAlert[]>(cacheKey);
  if (cached) return cached;

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const q = query(
      collection(db, COLLECTIONS.COST_ALERTS),
      where('triggeredAt', '>=', Timestamp.fromDate(cutoff)),
      orderBy('triggeredAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const alerts = snapshot.docs.map(d => parseCostAlert(d.id, d.data()));

    setCache(cacheKey, alerts);
    return alerts;
  } catch (error) {
    console.error('[CostMonitoringService] Error fetching cost alerts:', error);
    return [];
  }
}

/**
 * Acquitte une alerte de cout
 */
export async function acknowledgeCostAlert(
  alertId: string,
  notes?: string
): Promise<boolean> {
  try {
    const acknowledgeCostAlertFn = httpsCallable<
      { alertId: string; notes?: string },
      { success: boolean; message: string }
    >(functions, 'acknowledgeCostAlert');

    const result = await acknowledgeCostAlertFn({ alertId, notes });

    if (result.data.success) {
      clearCostMonitoringCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[CostMonitoringService] Error acknowledging alert:', error);
    return false;
  }
}

// ============================================================================
// MONTHLY COST ESTIMATION
// ============================================================================

/**
 * Calcule l'estimation des couts mensuels
 */
export async function calculateEstimatedMonthlyCost(): Promise<MonthlyEstimate> {
  const cacheKey = 'monthly_estimate';

  const cached = getCached<MonthlyEstimate>(cacheKey);
  if (cached) return cached;

  try {
    const currentPeriod = getCurrentPeriod();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const daysInMonth = endOfMonth.getDate();
    const daysElapsed = now.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

    // Recuperer les metriques du mois en cours
    const metrics = await fetchCostMetrics(currentPeriod);
    const currentSpend = metrics.reduce((sum, m) => sum + m.amount, 0);

    // Calculer la moyenne journaliere et projeter
    const dailyAverage = daysElapsed > 0 ? currentSpend / daysElapsed : 0;
    const projectedSpend = dailyAverage * daysInMonth;

    // Recuperer le budget (depuis la config ou valeur par defaut)
    const budgetDoc = await getDoc(doc(db, COLLECTIONS.COST_THRESHOLDS, 'monthly_budget'));
    const budget = budgetDoc.exists() ? (budgetDoc.data().budget ?? 1000) : 1000;

    const percentageOfBudget = budget > 0 ? (projectedSpend / budget) * 100 : 0;
    const projectedOverage = Math.max(0, projectedSpend - budget);

    // Breakdown par service
    const byService: Record<CostService, number> = {} as Record<CostService, number>;
    for (const metric of metrics) {
      byService[metric.service] = (byService[metric.service] ?? 0) + metric.amount;
    }

    const breakdown = Object.entries(byService)
      .map(([service, currentServiceSpend]) => ({
        service: service as CostService,
        currentSpend: currentServiceSpend,
        projectedSpend: daysElapsed > 0 ? (currentServiceSpend / daysElapsed) * daysInMonth : 0,
        percentageOfTotal: currentSpend > 0 ? (currentServiceSpend / currentSpend) * 100 : 0,
      }))
      .sort((a, b) => b.currentSpend - a.currentSpend);

    // Generer des recommandations
    const recommendations: string[] = [];

    if (percentageOfBudget > 100) {
      recommendations.push(`Attention: Le budget mensuel sera depasse de ${projectedOverage.toFixed(2)} EUR.`);
    } else if (percentageOfBudget > 90) {
      recommendations.push('Le budget mensuel est presque atteint. Surveillez les depenses.');
    }

    // Identifier les services les plus couteux
    if (breakdown.length > 0 && breakdown[0].percentageOfTotal > 50) {
      recommendations.push(
        `Le service "${breakdown[0].service}" represente ${breakdown[0].percentageOfTotal.toFixed(0)}% des couts. Envisagez une optimisation.`
      );
    }

    // Verifier la tendance
    const summary = await fetchCostMetricsSummary(currentPeriod);
    if (summary.trend === 'increasing' && summary.trendPercentage > 20) {
      recommendations.push(
        `Les couts augmentent de ${summary.trendPercentage.toFixed(0)}% par rapport au mois precedent.`
      );
    }

    const estimate: MonthlyEstimate = {
      period: currentPeriod,
      currentSpend,
      projectedSpend,
      budget,
      percentageOfBudget,
      daysElapsed,
      daysRemaining,
      dailyAverage,
      projectedOverage,
      currency: 'EUR',
      breakdown,
      recommendations,
    };

    setCache(cacheKey, estimate);
    return estimate;
  } catch (error) {
    console.error('[CostMonitoringService] Error calculating monthly estimate:', error);
    const currentPeriod = getCurrentPeriod();
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      period: currentPeriod,
      currentSpend: 0,
      projectedSpend: 0,
      budget: 1000,
      percentageOfBudget: 0,
      daysElapsed: now.getDate(),
      daysRemaining: endOfMonth.getDate() - now.getDate(),
      dailyAverage: 0,
      projectedOverage: 0,
      currency: 'EUR',
      breakdown: [],
      recommendations: ['Impossible de calculer l\'estimation. Verifiez la connexion Firestore.'],
    };
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Souscrit aux metriques de couts en temps reel
 */
export function subscribeToCostMetrics(
  callback: (metrics: CostMetric[]) => void,
  period?: string
): Unsubscribe {
  const targetPeriod = period ?? getCurrentPeriod();

  const q = query(
    collection(db, COLLECTIONS.COST_METRICS),
    where('period', '==', targetPeriod),
    orderBy('amount', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const metrics = snapshot.docs.map(d => parseCostMetric(d.id, d.data()));
      callback(metrics);
    },
    (error) => {
      console.error('[CostMonitoringService] Cost metrics subscription error:', error);
      callback([]);
    }
  );
}

/**
 * Souscrit aux stats de rate limiting en temps reel
 */
export function subscribeToRateLimitStats(
  callback: (stats: RateLimitStats[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.RATE_LIMITS),
    orderBy('percentageUsed', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const stats = snapshot.docs.map(d => parseRateLimitStats(d.id, d.data()));
      callback(stats);
    },
    (error) => {
      console.error('[CostMonitoringService] Rate limit subscription error:', error);
      callback([]);
    }
  );
}

// ============================================================================
// CLOUD FUNCTION CALLS
// ============================================================================

/**
 * Declenche un recalcul des metriques de couts
 */
export async function triggerCostRecalculation(): Promise<boolean> {
  try {
    const recalculateCostsFn = httpsCallable<
      void,
      { success: boolean; message: string }
    >(functions, 'recalculateCostMetrics');

    const result = await recalculateCostsFn();

    if (result.data.success) {
      clearCostMonitoringCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[CostMonitoringService] Error triggering recalculation:', error);
    return false;
  }
}

/**
 * Met a jour les seuils de cout
 */
export async function updateCostThreshold(
  config: Partial<CostThresholdConfig> & { service: CostService }
): Promise<boolean> {
  try {
    const updateThresholdFn = httpsCallable<
      Partial<CostThresholdConfig> & { service: CostService },
      { success: boolean; message: string }
    >(functions, 'updateCostThreshold');

    const result = await updateThresholdFn(config);

    if (result.data.success) {
      clearCostMonitoringCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[CostMonitoringService] Error updating threshold:', error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formate un montant en devise
 */
export function formatCost(amount: number, currency: 'EUR' | 'USD' = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Retourne la couleur associee a un statut de cout
 */
export function getCostStatusColor(percentageOfBudget: number): string {
  if (percentageOfBudget > 100) return 'red';
  if (percentageOfBudget > 90) return 'orange';
  if (percentageOfBudget > 70) return 'yellow';
  return 'green';
}

/**
 * Retourne le label associe a une severite d'alerte
 */
export function getAlertSeverityLabel(severity: CostAlertSeverity): string {
  const labels: Record<CostAlertSeverity, string> = {
    info: 'Information',
    warning: 'Avertissement',
    critical: 'Critique',
    emergency: 'Urgence',
  };
  return labels[severity];
}

/**
 * Retourne la couleur associee a une severite d'alerte
 */
export function getAlertSeverityColor(severity: CostAlertSeverity): string {
  const colors: Record<CostAlertSeverity, string> = {
    info: 'blue',
    warning: 'yellow',
    critical: 'orange',
    emergency: 'red',
  };
  return colors[severity];
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const costMonitoringService = {
  // Fetch functions
  fetchCostMetrics,
  fetchCostMetricsSummary,
  fetchRateLimitStats,
  fetchRateLimitSummary,
  fetchRateLimitForEndpoint,
  fetchTwilioUsage,
  fetchTwilioUsageFromAPI,
  fetchRecentCostAlerts,

  // Subscriptions
  subscribeToCostAlerts,
  subscribeToCostMetrics,
  subscribeToRateLimitStats,

  // Calculations
  calculateEstimatedMonthlyCost,

  // Actions
  acknowledgeCostAlert,
  triggerCostRecalculation,
  updateCostThreshold,

  // Utilities
  clearCostMonitoringCache,
  formatCost,
  getCostStatusColor,
  getAlertSeverityLabel,
  getAlertSeverityColor,
};

export default costMonitoringService;
