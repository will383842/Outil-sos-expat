// src/hooks/useGoogleAdsAnalytics.ts
// Hook pour recuperer les analytics Google Ads avec metriques avancees

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

export type GoogleAdsEventType =
  | 'Purchase'
  | 'Lead'
  | 'SignUp'
  | 'BeginCheckout'
  | 'Contact';

export type GoogleAdsEventSource =
  | 'http_endpoint'
  | 'trigger_booking'
  | 'trigger_user'
  | 'trigger_call'
  | 'trigger_payment';

export interface GoogleAdsEvent {
  id: string;
  eventType: GoogleAdsEventType;
  eventId: string;
  source?: GoogleAdsEventSource;
  userId?: string;
  isAnonymous?: boolean;
  contentName?: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  gclid?: string;
  trackedAt: Date;
  success?: boolean;
  error?: string;
  // Quality fields
  qualityScore?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasGclid?: boolean;
  hasFirstName?: boolean;
  hasLastName?: boolean;
  hasAddress?: boolean;
  hasCountry?: boolean;
}

export interface EventTypeStats {
  type: GoogleAdsEventType;
  count: number;
  percentage: number;
  value?: number;
}

export interface SourceStats {
  source: GoogleAdsEventSource | 'unknown';
  count: number;
  percentage: number;
}

export interface FunnelStep {
  name: string;
  eventType: GoogleAdsEventType;
  count: number;
  percentage: number;
  conversionRate: number;
}

export interface DailyStats {
  date: string;
  label: string;
  total: number;
  byType: Record<GoogleAdsEventType, number>;
}

export interface QualityMetrics {
  averageScore: number;
  withEmail: number;
  withPhone: number;
  withGclid: number;
  withFirstName: number;
  withLastName: number;
  withAddress: number;
  withCountry: number;
  totalEvents: number;
}

export interface UserBreakdown {
  authenticated: number;
  anonymous: number;
  authenticatedPercentage: number;
}

export interface GoogleAdsAnalyticsData {
  // Global stats
  totalEvents: number;
  uniqueUsers: number;
  totalValue: number;
  successRate: number;

  // Stats by event type
  eventsByType: EventTypeStats[];

  // Stats by source
  eventsBySource: SourceStats[];

  // Daily breakdown
  dailyStats: DailyStats[];

  // Recent events
  recentEvents: GoogleAdsEvent[];

  // Conversion funnel
  funnel: FunnelStep[];

  // Quality metrics
  qualityMetrics: QualityMetrics;

  // User breakdown
  userBreakdown: UserBreakdown;

  // Alerts
  alerts: GoogleAdsAlert[];

  // Date range
  startDate: Date;
  endDate: Date;
}

export interface GoogleAdsAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
}

export interface UseGoogleAdsAnalyticsReturn {
  data: GoogleAdsAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const EVENT_TYPES: GoogleAdsEventType[] = [
  'Purchase',
  'Lead',
  'SignUp',
  'BeginCheckout',
  'Contact',
];

const EVENT_SOURCES: GoogleAdsEventSource[] = [
  'http_endpoint',
  'trigger_booking',
  'trigger_user',
  'trigger_call',
  'trigger_payment',
];

const FUNNEL_STEPS: { name: string; eventType: GoogleAdsEventType }[] = [
  { name: 'Inscription', eventType: 'SignUp' },
  { name: 'Lead', eventType: 'Lead' },
  { name: 'Checkout', eventType: 'BeginCheckout' },
  { name: 'Achat', eventType: 'Purchase' },
];

// Alert thresholds
const ALERT_THRESHOLDS = {
  MIN_QUALITY_SCORE: 40,
  MIN_EMAIL_RATE: 30,
  MIN_GCLID_RATE: 50,
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
  eventsByType: EventTypeStats[],
  successRate: number
): GoogleAdsAlert[] {
  const alerts: GoogleAdsAlert[] = [];

  // Quality score alert
  if (qualityMetrics.averageScore < ALERT_THRESHOLDS.MIN_QUALITY_SCORE) {
    alerts.push({
      id: 'low_quality_score',
      type: 'warning',
      title: 'Score de qualite faible',
      description: `Le score moyen de qualite des donnees utilisateur est de ${qualityMetrics.averageScore.toFixed(0)}%. Ameliorez la collecte d'emails, telephones et GCLID.`,
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
      description: `Seulement ${emailRate.toFixed(0)}% des evenements ont un email. Google recommande l'email pour Enhanced Conversions.`,
      metric: 'emailRate',
      threshold: ALERT_THRESHOLDS.MIN_EMAIL_RATE,
      currentValue: emailRate,
    });
  }

  // GCLID rate alert
  const gclidRate = qualityMetrics.totalEvents > 0
    ? (qualityMetrics.withGclid / qualityMetrics.totalEvents) * 100
    : 0;
  if (gclidRate < ALERT_THRESHOLDS.MIN_GCLID_RATE && qualityMetrics.totalEvents > 10) {
    alerts.push({
      id: 'low_gclid_rate',
      type: 'info',
      title: 'Taux de GCLID faible',
      description: `Seulement ${gclidRate.toFixed(0)}% des evenements ont un GCLID. Verifiez que l'auto-tagging est active dans Google Ads.`,
      metric: 'gclidRate',
      threshold: ALERT_THRESHOLDS.MIN_GCLID_RATE,
      currentValue: gclidRate,
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
      title: 'Aucun achat Google Ads',
      description: 'Aucun evenement Purchase n\'a ete envoye. Verifiez l\'integration du webhook Stripe.',
      metric: 'purchases',
      currentValue: 0,
    });
  }

  // Low success rate alert
  if (successRate < 90 && qualityMetrics.totalEvents > 10) {
    alerts.push({
      id: 'low_success_rate',
      type: 'error',
      title: 'Taux de succes faible',
      description: `Seulement ${successRate.toFixed(0)}% des evenements ont ete envoyes avec succes. Verifiez la configuration de l'API Google Ads.`,
      metric: 'successRate',
      threshold: 90,
      currentValue: successRate,
    });
  }

  return alerts;
}

// ============================================================================
// Hook
// ============================================================================

export function useGoogleAdsAnalytics(days: number = 7): UseGoogleAdsAnalyticsReturn {
  const [data, setData] = useState<GoogleAdsAnalyticsData | null>(null);
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

      // Query Google Ads events
      const eventsQuery = query(
        collection(db, 'google_ads_events'),
        where('trackedAt', '>=', startTimestamp),
        orderBy('trackedAt', 'desc')
      );

      const snapshot = await getDocs(eventsQuery);

      if (!mountedRef.current) return;

      // Process events
      const events: GoogleAdsEvent[] = [];
      const userIds = new Set<string>();
      const eventsByTypeMap = new Map<GoogleAdsEventType, { count: number; value: number }>();
      const eventsBySourceMap = new Map<GoogleAdsEventSource | 'unknown', number>();
      const dailyMap = new Map<string, { total: number; byType: Record<string, number> }>();

      // Quality metrics accumulators
      let totalQualityScore = 0;
      let withEmail = 0;
      let withPhone = 0;
      let withGclid = 0;
      let withFirstName = 0;
      let withLastName = 0;
      let withAddress = 0;
      let withCountry = 0;
      let successCount = 0;

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
        const event: GoogleAdsEvent = {
          id: doc.id,
          eventType: (d.eventType as GoogleAdsEventType) || 'Lead',
          eventId: (d.eventId as string) || doc.id,
          source: d.source as GoogleAdsEventSource | undefined,
          userId: d.userId as string | undefined,
          isAnonymous: d.isAnonymous as boolean | undefined,
          contentName: d.contentName as string | undefined,
          contentCategory: d.contentCategory as string | undefined,
          value: d.value as number | undefined,
          currency: d.currency as string | undefined,
          gclid: d.gclid as string | undefined,
          trackedAt: d.trackedAt?.toDate?.() || new Date(),
          success: d.success as boolean | undefined,
          error: d.error as string | undefined,
          qualityScore: d.qualityScore as number | undefined,
          hasEmail: d.hasEmail as boolean | undefined,
          hasPhone: d.hasPhone as boolean | undefined,
          hasGclid: d.hasGclid as boolean | undefined,
          hasFirstName: d.hasFirstName as boolean | undefined,
          hasLastName: d.hasLastName as boolean | undefined,
          hasAddress: d.hasAddress as boolean | undefined,
          hasCountry: d.hasCountry as boolean | undefined,
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
        if (event.hasGclid) withGclid++;
        if (event.hasFirstName) withFirstName++;
        if (event.hasLastName) withLastName++;
        if (event.hasAddress) withAddress++;
        if (event.hasCountry) withCountry++;
        if (event.success !== false) successCount++;

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
          byType: stats.byType as Record<GoogleAdsEventType, number>,
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
        withGclid,
        withFirstName,
        withLastName,
        withAddress,
        withCountry,
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

      // Calculate success rate
      const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 100;

      // Generate alerts
      const alerts = generateAlerts(qualityMetrics, userBreakdown, eventsByType, successRate);

      // Get recent events (limit to 20)
      const recentEvents = events.slice(0, 20);

      setData({
        totalEvents,
        uniqueUsers: userIds.size,
        totalValue,
        successRate,
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
      console.error('[useGoogleAdsAnalytics] Error loading data:', err);
      if (mountedRef.current) {
        setError('Erreur lors du chargement des analytics Google Ads');
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

export default useGoogleAdsAnalytics;
