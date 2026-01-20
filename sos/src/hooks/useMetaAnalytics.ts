// src/hooks/useMetaAnalytics.ts
// Hook pour recuperer les analytics Meta (CAPI + Pixel) avec metriques avancees

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// Types
// ============================================================================

export type CAPIEventType =
  | 'Purchase'
  | 'Lead'
  | 'InitiateCheckout'
  | 'CompleteRegistration'
  | 'Search'
  | 'ViewContent'
  | 'AddToCart'
  | 'StartTrial'
  | 'AddPaymentInfo'
  | 'Contact';

export type EventSource =
  | 'http_endpoint'
  | 'trigger_booking'
  | 'trigger_user'
  | 'trigger_call'
  | 'trigger_contact';

export interface CAPIEvent {
  id: string;
  eventType: CAPIEventType;
  eventId: string;
  source?: EventSource;
  userId?: string;
  isAnonymous?: boolean;
  contentName?: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  trackedAt: Date;
  // Quality fields
  qualityScore?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasFirstName?: boolean;
  hasLastName?: boolean;
  hasCountry?: boolean;
  hasFbp?: boolean;
  hasFbc?: boolean;
}

export interface EventTypeStats {
  type: CAPIEventType;
  count: number;
  percentage: number;
  value?: number;
}

export interface SourceStats {
  source: EventSource | 'unknown';
  count: number;
  percentage: number;
}

export interface FunnelStep {
  name: string;
  eventType: CAPIEventType;
  count: number;
  percentage: number;
  conversionRate: number;
}

export interface DailyStats {
  date: string;
  label: string;
  total: number;
  byType: Record<CAPIEventType, number>;
}

export interface QualityMetrics {
  averageScore: number;
  withEmail: number;
  withPhone: number;
  withFirstName: number;
  withLastName: number;
  withCountry: number;
  withFbp: number;
  withFbc: number;
  totalEvents: number;
}

export interface UserBreakdown {
  authenticated: number;
  anonymous: number;
  authenticatedPercentage: number;
}

export interface MetaAnalyticsData {
  // Global stats
  totalEvents: number;
  uniqueUsers: number;
  totalValue: number;

  // Stats by event type
  eventsByType: EventTypeStats[];

  // Stats by source
  eventsBySource: SourceStats[];

  // Daily breakdown
  dailyStats: DailyStats[];

  // Recent events
  recentEvents: CAPIEvent[];

  // Conversion funnel
  funnel: FunnelStep[];

  // Quality metrics
  qualityMetrics: QualityMetrics;

  // User breakdown
  userBreakdown: UserBreakdown;

  // Alerts
  alerts: MetaAlert[];

  // Date range
  startDate: Date;
  endDate: Date;
}

export interface MetaAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
}

export interface UseMetaAnalyticsReturn {
  data: MetaAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const EVENT_TYPES: CAPIEventType[] = [
  'Purchase',
  'Lead',
  'InitiateCheckout',
  'CompleteRegistration',
  'Search',
  'ViewContent',
  'AddToCart',
  'StartTrial',
  'AddPaymentInfo',
  'Contact',
];

const EVENT_SOURCES: EventSource[] = [
  'http_endpoint',
  'trigger_booking',
  'trigger_user',
  'trigger_call',
  'trigger_contact',
];

const FUNNEL_STEPS: { name: string; eventType: CAPIEventType }[] = [
  { name: 'Vue contenu', eventType: 'ViewContent' },
  { name: 'Recherche', eventType: 'Search' },
  { name: 'Ajout panier', eventType: 'AddToCart' },
  { name: 'Checkout', eventType: 'InitiateCheckout' },
  { name: 'Achat', eventType: 'Purchase' },
];

// Alert thresholds
const ALERT_THRESHOLDS = {
  MIN_QUALITY_SCORE: 40,
  MIN_EMAIL_RATE: 30,
  MIN_FBP_RATE: 50,
  MAX_ANONYMOUS_RATE: 70,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getDateLabel(date: Date, days: number): string {
  if (days <= 1) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (days <= 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function generateAlerts(
  qualityMetrics: QualityMetrics,
  userBreakdown: UserBreakdown,
  eventsByType: EventTypeStats[]
): MetaAlert[] {
  const alerts: MetaAlert[] = [];

  // Quality score alert
  if (qualityMetrics.averageScore < ALERT_THRESHOLDS.MIN_QUALITY_SCORE) {
    alerts.push({
      id: 'low_quality_score',
      type: 'warning',
      title: 'Score de qualite faible',
      description: `Le score moyen de qualite des donnees utilisateur est de ${qualityMetrics.averageScore.toFixed(0)}%. Ameliorez la collecte d'emails et telephones.`,
      metric: 'qualityScore',
      threshold: ALERT_THRESHOLDS.MIN_QUALITY_SCORE,
      currentValue: qualityMetrics.averageScore,
    });
  }

  // Email rate alert
  const emailRate = qualityMetrics.totalEvents > 0
    ? (qualityMetrics.withEmail / qualityMetrics.totalEvents) * 100
    : 0;
  if (emailRate < ALERT_THRESHOLDS.MIN_EMAIL_RATE && qualityMetrics.totalEvents > 10) {
    alerts.push({
      id: 'low_email_rate',
      type: 'warning',
      title: 'Taux d\'email faible',
      description: `Seulement ${emailRate.toFixed(0)}% des evenements ont un email. Meta recommande au moins ${ALERT_THRESHOLDS.MIN_EMAIL_RATE}%.`,
      metric: 'emailRate',
      threshold: ALERT_THRESHOLDS.MIN_EMAIL_RATE,
      currentValue: emailRate,
    });
  }

  // FBP rate alert
  const fbpRate = qualityMetrics.totalEvents > 0
    ? (qualityMetrics.withFbp / qualityMetrics.totalEvents) * 100
    : 0;
  if (fbpRate < ALERT_THRESHOLDS.MIN_FBP_RATE && qualityMetrics.totalEvents > 10) {
    alerts.push({
      id: 'low_fbp_rate',
      type: 'info',
      title: 'Taux de fbp faible',
      description: `Seulement ${fbpRate.toFixed(0)}% des evenements ont le cookie _fbp. Verifiez que le Pixel est charge avant CAPI.`,
      metric: 'fbpRate',
      threshold: ALERT_THRESHOLDS.MIN_FBP_RATE,
      currentValue: fbpRate,
    });
  }

  // Anonymous rate alert
  if (userBreakdown.authenticatedPercentage < (100 - ALERT_THRESHOLDS.MAX_ANONYMOUS_RATE) && qualityMetrics.totalEvents > 20) {
    alerts.push({
      id: 'high_anonymous_rate',
      type: 'info',
      title: 'Beaucoup d\'utilisateurs anonymes',
      description: `${(100 - userBreakdown.authenticatedPercentage).toFixed(0)}% des evenements sont anonymes. Encouragez la connexion pour meilleure attribution.`,
      metric: 'anonymousRate',
      threshold: ALERT_THRESHOLDS.MAX_ANONYMOUS_RATE,
      currentValue: 100 - userBreakdown.authenticatedPercentage,
    });
  }

  // No Purchase events alert
  const purchaseEvents = eventsByType.find(e => e.type === 'Purchase');
  if (!purchaseEvents || purchaseEvents.count === 0) {
    alerts.push({
      id: 'no_purchases',
      type: 'info',
      title: 'Aucun achat CAPI',
      description: 'Aucun evenement Purchase n\'a ete envoye via CAPI. Verifiez l\'integration du webhook Stripe.',
      metric: 'purchases',
      currentValue: 0,
    });
  }

  return alerts;
}

// ============================================================================
// Hook
// ============================================================================

export function useMetaAnalytics(days: number = 7): UseMetaAnalyticsReturn {
  const [data, setData] = useState<MetaAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const startTimestamp = Timestamp.fromDate(startDate);

      // Query CAPI events
      const eventsQuery = query(
        collection(db, 'capi_events'),
        where('trackedAt', '>=', startTimestamp),
        orderBy('trackedAt', 'desc')
      );

      const snapshot = await getDocs(eventsQuery);

      if (!mountedRef.current) return;

      // Process events
      const events: CAPIEvent[] = [];
      const userIds = new Set<string>();
      const eventsByTypeMap = new Map<CAPIEventType, { count: number; value: number }>();
      const eventsBySourceMap = new Map<EventSource | 'unknown', number>();
      const dailyMap = new Map<string, { total: number; byType: Record<string, number> }>();

      // Quality metrics accumulators
      let totalQualityScore = 0;
      let withEmail = 0;
      let withPhone = 0;
      let withFirstName = 0;
      let withLastName = 0;
      let withCountry = 0;
      let withFbp = 0;
      let withFbc = 0;

      // User breakdown
      let authenticatedCount = 0;
      let anonymousCount = 0;

      // Initialize event type counts
      EVENT_TYPES.forEach((type) => {
        eventsByTypeMap.set(type, { count: 0, value: 0 });
      });

      // Initialize source counts
      EVENT_SOURCES.forEach((source) => {
        eventsBySourceMap.set(source, 0);
      });
      eventsBySourceMap.set('unknown', 0);

      // Initialize daily stats
      const current = new Date(startDate);
      while (current <= endDate) {
        const key = current.toISOString().split('T')[0];
        dailyMap.set(key, {
          total: 0,
          byType: EVENT_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {}),
        });
        current.setDate(current.getDate() + 1);
      }

      let totalValue = 0;

      snapshot.forEach((doc) => {
        const d = doc.data();
        const event: CAPIEvent = {
          id: doc.id,
          eventType: (d.eventType as CAPIEventType) || 'Lead',
          eventId: (d.eventId as string) || doc.id,
          source: d.source as EventSource | undefined,
          userId: d.userId as string | undefined,
          isAnonymous: d.isAnonymous as boolean | undefined,
          contentName: d.contentName as string | undefined,
          contentCategory: d.contentCategory as string | undefined,
          value: d.value as number | undefined,
          currency: d.currency as string | undefined,
          trackedAt: d.trackedAt?.toDate?.() || new Date(),
          qualityScore: d.qualityScore as number | undefined,
          hasEmail: d.hasEmail as boolean | undefined,
          hasPhone: d.hasPhone as boolean | undefined,
          hasFirstName: d.hasFirstName as boolean | undefined,
          hasLastName: d.hasLastName as boolean | undefined,
          hasCountry: d.hasCountry as boolean | undefined,
          hasFbp: d.hasFbp as boolean | undefined,
          hasFbc: d.hasFbc as boolean | undefined,
        };

        events.push(event);

        // Track unique users
        if (event.userId) {
          userIds.add(event.userId);
        }

        // Update event type stats
        const typeStats = eventsByTypeMap.get(event.eventType);
        if (typeStats) {
          typeStats.count++;
          if (event.value) {
            typeStats.value += event.value;
            totalValue += event.value;
          }
        }

        // Update source stats
        const source = event.source || 'unknown';
        eventsBySourceMap.set(source, (eventsBySourceMap.get(source) || 0) + 1);

        // Update daily stats
        const dateKey = event.trackedAt.toISOString().split('T')[0];
        const dayStats = dailyMap.get(dateKey);
        if (dayStats) {
          dayStats.total++;
          if (dayStats.byType[event.eventType] !== undefined) {
            dayStats.byType[event.eventType]++;
          }
        }

        // Update quality metrics
        if (event.qualityScore !== undefined) {
          totalQualityScore += event.qualityScore;
        }
        if (event.hasEmail) withEmail++;
        if (event.hasPhone) withPhone++;
        if (event.hasFirstName) withFirstName++;
        if (event.hasLastName) withLastName++;
        if (event.hasCountry) withCountry++;
        if (event.hasFbp) withFbp++;
        if (event.hasFbc) withFbc++;

        // Update user breakdown
        if (event.isAnonymous || (!event.userId && !event.isAnonymous)) {
          anonymousCount++;
        } else {
          authenticatedCount++;
        }
      });

      // Calculate percentages for event types
      const totalEvents = events.length;
      const eventsByType: EventTypeStats[] = Array.from(eventsByTypeMap.entries())
        .map(([type, stats]) => ({
          type,
          count: stats.count,
          percentage: totalEvents > 0 ? (stats.count / totalEvents) * 100 : 0,
          value: stats.value > 0 ? stats.value : undefined,
        }))
        .filter((stat) => stat.count > 0)
        .sort((a, b) => b.count - a.count);

      // Calculate source stats
      const eventsBySource: SourceStats[] = Array.from(eventsBySourceMap.entries())
        .map(([source, count]) => ({
          source,
          count,
          percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
        }))
        .filter((stat) => stat.count > 0)
        .sort((a, b) => b.count - a.count);

      // Build daily stats array
      const dailyStats: DailyStats[] = Array.from(dailyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateStr, stats]) => ({
          date: dateStr,
          label: getDateLabel(new Date(dateStr), days),
          total: stats.total,
          byType: stats.byType as Record<CAPIEventType, number>,
        }));

      // Build conversion funnel
      const funnel: FunnelStep[] = FUNNEL_STEPS.map((step, index) => {
        const count = eventsByTypeMap.get(step.eventType)?.count || 0;
        const previousCount = index > 0
          ? eventsByTypeMap.get(FUNNEL_STEPS[index - 1].eventType)?.count || 1
          : count || 1;

        return {
          name: step.name,
          eventType: step.eventType,
          count,
          percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
          conversionRate: previousCount > 0 ? (count / previousCount) * 100 : 0,
        };
      });

      // Build quality metrics
      const qualityMetrics: QualityMetrics = {
        averageScore: totalEvents > 0 ? totalQualityScore / totalEvents : 0,
        withEmail,
        withPhone,
        withFirstName,
        withLastName,
        withCountry,
        withFbp,
        withFbc,
        totalEvents,
      };

      // Build user breakdown
      const userBreakdown: UserBreakdown = {
        authenticated: authenticatedCount,
        anonymous: anonymousCount,
        authenticatedPercentage: totalEvents > 0
          ? (authenticatedCount / totalEvents) * 100
          : 0,
      };

      // Generate alerts
      const alerts = generateAlerts(qualityMetrics, userBreakdown, eventsByType);

      // Get recent events (limit to 20)
      const recentEvents = events.slice(0, 20);

      setData({
        totalEvents,
        uniqueUsers: userIds.size,
        totalValue,
        eventsByType,
        eventsBySource,
        dailyStats,
        recentEvents,
        funnel,
        qualityMetrics,
        userBreakdown,
        alerts,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error('[useMetaAnalytics] Error loading data:', err);
      if (mountedRef.current) {
        setError('Erreur lors du chargement des analytics Meta');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [days]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}

export default useMetaAnalytics;
