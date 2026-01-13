// src/hooks/useMetaAnalytics.ts
// Hook pour recuperer les analytics Meta (CAPI + Pixel)

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  limit,
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

export interface CAPIEvent {
  id: string;
  eventType: CAPIEventType;
  eventId: string;
  userId?: string;
  contentName?: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  trackedAt: Date;
}

export interface EventTypeStats {
  type: CAPIEventType;
  count: number;
  percentage: number;
  value?: number;
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

export interface MetaAnalyticsData {
  // Global stats
  totalEvents: number;
  uniqueUsers: number;
  totalValue: number;

  // Stats by event type
  eventsByType: EventTypeStats[];

  // Daily breakdown
  dailyStats: DailyStats[];

  // Recent events
  recentEvents: CAPIEvent[];

  // Conversion funnel
  funnel: FunnelStep[];

  // Date range
  startDate: Date;
  endDate: Date;
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

const FUNNEL_STEPS: { name: string; eventType: CAPIEventType }[] = [
  { name: 'Vue contenu', eventType: 'ViewContent' },
  { name: 'Recherche', eventType: 'Search' },
  { name: 'Ajout panier', eventType: 'AddToCart' },
  { name: 'Checkout', eventType: 'InitiateCheckout' },
  { name: 'Achat', eventType: 'Purchase' },
];

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
      const dailyMap = new Map<string, { total: number; byType: Record<string, number> }>();

      // Initialize event type counts
      EVENT_TYPES.forEach((type) => {
        eventsByTypeMap.set(type, { count: 0, value: 0 });
      });

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
          userId: d.userId as string | undefined,
          contentName: d.contentName as string | undefined,
          contentCategory: d.contentCategory as string | undefined,
          value: d.value as number | undefined,
          currency: d.currency as string | undefined,
          trackedAt: d.trackedAt?.toDate?.() || new Date(),
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

        // Update daily stats
        const dateKey = event.trackedAt.toISOString().split('T')[0];
        const dayStats = dailyMap.get(dateKey);
        if (dayStats) {
          dayStats.total++;
          if (dayStats.byType[event.eventType] !== undefined) {
            dayStats.byType[event.eventType]++;
          }
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

      // Get recent events (limit to 20)
      const recentEvents = events.slice(0, 20);

      setData({
        totalEvents,
        uniqueUsers: userIds.size,
        totalValue,
        eventsByType,
        dailyStats,
        recentEvents,
        funnel,
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
