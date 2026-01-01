// src/components/admin/TemporalComparisonWidget.tsx
// Widget de comparaisons temporelles (aujourd'hui vs hier vs semaine dernière)
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  BarChart3,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  Phone,
  DollarSign,
  CheckCircle,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Types
interface PeriodStats {
  calls: number;
  successfulCalls: number;
  revenue: number;
  uniqueClients: number;
  uniqueProviders: number;
  averageCallDuration: number;
  successRate: number;
}

interface ComparisonData {
  today: PeriodStats;
  yesterday: PeriodStats;
  lastWeekSameDay: PeriodStats;
  lastMonth: PeriodStats;
  changes: {
    vsYesterday: number;
    vsLastWeek: number;
    vsLastMonth: number;
  };
}

interface TemporalComparisonWidgetProps {
  compact?: boolean;
}

// Helpers
const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const TemporalComparisonWidget: React.FC<TemporalComparisonWidgetProps> = ({
  compact: _compact = false,
}) => {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'calls' | 'revenue' | 'successRate'>('calls');
  const mountedRef = useRef(true);

  // Charger les données
  useEffect(() => {
    mountedRef.current = true;

    const loadData = async () => {
      try {
        const now = new Date();
        const today = getStartOfDay(now);
        const todayEnd = getEndOfDay(now);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = getEndOfDay(yesterday);

        const lastWeekSameDay = new Date(today);
        lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
        const lastWeekSameDayEnd = getEndOfDay(lastWeekSameDay);

        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthEnd = new Date(lastMonth);
        lastMonthEnd.setDate(lastMonthEnd.getDate() + 1);

        // Fonction helper pour récupérer les stats d'une période
        const getStatsForPeriod = async (start: Date, end: Date): Promise<PeriodStats> => {
          const sessionsQuery = query(
            collection(db, 'call_sessions'),
            where('metadata.createdAt', '>=', Timestamp.fromDate(start)),
            where('metadata.createdAt', '<=', Timestamp.fromDate(end))
          );

          const snapshot = await getDocs(sessionsQuery);

          if (!mountedRef.current) {
            return {
              calls: 0,
              successfulCalls: 0,
              revenue: 0,
              uniqueClients: new Set<string>().size,
              uniqueProviders: new Set<string>().size,
              averageCallDuration: 0,
              successRate: 0,
            };
          }

          let calls = 0;
          let successfulCalls = 0;
          let revenue = 0;
          let totalDuration = 0;
          const clients = new Set<string>();
          const providers = new Set<string>();

          snapshot.forEach((doc) => {
            const data = doc.data();
            calls++;

            if (data.status === 'completed') {
              successfulCalls++;
            }

            if (data.payment?.amount) {
              revenue += data.payment.amount / 100; // Convertir centimes en euros
            }

            if (data.metadata?.duration) {
              totalDuration += data.metadata.duration;
            }

            if (data.metadata?.clientId) {
              clients.add(data.metadata.clientId);
            }

            if (data.metadata?.providerId) {
              providers.add(data.metadata.providerId);
            }
          });

          return {
            calls,
            successfulCalls,
            revenue,
            uniqueClients: clients.size,
            uniqueProviders: providers.size,
            averageCallDuration: calls > 0 ? totalDuration / calls : 0,
            successRate: calls > 0 ? (successfulCalls / calls) * 100 : 0,
          };
        };

        // Charger toutes les périodes en parallèle
        const [todayStats, yesterdayStats, lastWeekStats, lastMonthStats] = await Promise.all([
          getStatsForPeriod(today, todayEnd),
          getStatsForPeriod(yesterday, yesterdayEnd),
          getStatsForPeriod(lastWeekSameDay, lastWeekSameDayEnd),
          getStatsForPeriod(lastMonth, lastMonthEnd),
        ]);

        if (!mountedRef.current) return;

        // Calculer les changements
        const calcChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        setData({
          today: todayStats,
          yesterday: yesterdayStats,
          lastWeekSameDay: lastWeekStats,
          lastMonth: lastMonthStats,
          changes: {
            vsYesterday: calcChange(todayStats.calls, yesterdayStats.calls),
            vsLastWeek: calcChange(todayStats.calls, lastWeekStats.calls),
            vsLastMonth: calcChange(todayStats.calls, lastMonthStats.calls),
          },
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Erreur TemporalComparisonWidget:', error);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Obtenir la valeur sélectionnée pour chaque période
  const _getMetricValue = (stats: PeriodStats, metric: string): number => {
    switch (metric) {
      case 'calls':
        return stats.calls;
      case 'revenue':
        return stats.revenue;
      case 'successRate':
        return stats.successRate;
      default:
        return stats.calls;
    }
  };

  // Composant pour afficher un changement
  const ChangeIndicator: React.FC<{ value: number; label: string }> = ({ value, label }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;

    return (
      <div className="flex items-center space-x-1">
        {isPositive ? (
          <ArrowUp className="text-green-500" size={14} />
        ) : isNeutral ? (
          <Minus className="text-gray-400" size={14} />
        ) : (
          <ArrowDown className="text-red-500" size={14} />
        )}
        <span
          className={`text-sm font-medium ${
            isPositive ? 'text-green-600' : isNeutral ? 'text-gray-500' : 'text-red-600'
          }`}
        >
          {formatPercent(value)}
        </span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="mr-2 text-purple-600" size={20} />
            Comparaisons temporelles
          </h3>

          {/* Sélecteur de métrique */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedMetric('calls')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedMetric === 'calls'
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Phone size={14} className="inline mr-1" />
              Appels
            </button>
            <button
              onClick={() => setSelectedMetric('revenue')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedMetric === 'revenue'
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <DollarSign size={14} className="inline mr-1" />
              Revenus
            </button>
            <button
              onClick={() => setSelectedMetric('successRate')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedMetric === 'successRate'
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CheckCircle size={14} className="inline mr-1" />
              Taux succès
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-6">
        {/* Grille de comparaison */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Aujourd'hui */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-purple-700">Aujourd'hui</span>
              <Calendar size={16} className="text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {selectedMetric === 'revenue'
                ? formatCurrency(data.today.revenue)
                : selectedMetric === 'successRate'
                ? `${data.today.successRate.toFixed(0)}%`
                : data.today.calls}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {data.today.successfulCalls} réussis / {data.today.calls} total
            </div>
          </div>

          {/* Hier */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Hier</span>
              <Clock size={16} className="text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-700">
              {selectedMetric === 'revenue'
                ? formatCurrency(data.yesterday.revenue)
                : selectedMetric === 'successRate'
                ? `${data.yesterday.successRate.toFixed(0)}%`
                : data.yesterday.calls}
            </div>
            <ChangeIndicator
              value={
                selectedMetric === 'revenue'
                  ? ((data.today.revenue - data.yesterday.revenue) / (data.yesterday.revenue || 1)) * 100
                  : selectedMetric === 'successRate'
                  ? data.today.successRate - data.yesterday.successRate
                  : data.changes.vsYesterday
              }
              label="vs hier"
            />
          </div>

          {/* Semaine dernière même jour */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Sem. dernière</span>
              <ChevronLeft size={16} className="text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-700">
              {selectedMetric === 'revenue'
                ? formatCurrency(data.lastWeekSameDay.revenue)
                : selectedMetric === 'successRate'
                ? `${data.lastWeekSameDay.successRate.toFixed(0)}%`
                : data.lastWeekSameDay.calls}
            </div>
            <ChangeIndicator
              value={
                selectedMetric === 'revenue'
                  ? ((data.today.revenue - data.lastWeekSameDay.revenue) / (data.lastWeekSameDay.revenue || 1)) * 100
                  : selectedMetric === 'successRate'
                  ? data.today.successRate - data.lastWeekSameDay.successRate
                  : data.changes.vsLastWeek
              }
              label="vs S-1"
            />
          </div>

          {/* Mois dernier */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">Mois dernier</span>
              <Calendar size={16} className="text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-700">
              {selectedMetric === 'revenue'
                ? formatCurrency(data.lastMonth.revenue)
                : selectedMetric === 'successRate'
                ? `${data.lastMonth.successRate.toFixed(0)}%`
                : data.lastMonth.calls}
            </div>
            <ChangeIndicator
              value={
                selectedMetric === 'revenue'
                  ? ((data.today.revenue - data.lastMonth.revenue) / (data.lastMonth.revenue || 1)) * 100
                  : selectedMetric === 'successRate'
                  ? data.today.successRate - data.lastMonth.successRate
                  : data.changes.vsLastMonth
              }
              label="vs M-1"
            />
          </div>
        </div>

        {/* Statistiques détaillées - Aujourd'hui */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Détails d'aujourd'hui</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">{data.today.calls}</div>
              <div className="text-xs text-gray-500">Appels totaux</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{data.today.successfulCalls}</div>
              <div className="text-xs text-gray-500">Réussis</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{formatCurrency(data.today.revenue)}</div>
              <div className="text-xs text-gray-500">Revenus</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{data.today.uniqueClients}</div>
              <div className="text-xs text-gray-500">Clients uniques</div>
            </div>
            <div className="text-center p-3 bg-teal-50 rounded-lg">
              <div className="text-xl font-bold text-teal-600">{data.today.uniqueProviders}</div>
              <div className="text-xs text-gray-500">Prestataires actifs</div>
            </div>
          </div>
        </div>

        {/* Tendance générale */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {data.changes.vsYesterday > 0 ? (
                <TrendingUp className="text-green-500 mr-2" size={24} />
              ) : data.changes.vsYesterday < 0 ? (
                <TrendingDown className="text-red-500 mr-2" size={24} />
              ) : (
                <Minus className="text-gray-400 mr-2" size={24} />
              )}
              <div>
                <span className="font-medium text-gray-900">Tendance: </span>
                <span
                  className={
                    data.changes.vsYesterday > 0
                      ? 'text-green-600'
                      : data.changes.vsYesterday < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }
                >
                  {data.changes.vsYesterday > 0
                    ? 'En hausse'
                    : data.changes.vsYesterday < 0
                    ? 'En baisse'
                    : 'Stable'}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Mis à jour: {new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporalComparisonWidget;
