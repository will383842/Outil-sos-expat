/**
 * IaAnalyticsTab - Analytics Avancées
 * Analyse de cohortes, LTV/CAC, Prédiction de churn
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { getDateLocale } from '../../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Target,
  Activity,
  UserX,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowRight,
  Mail,
  Phone
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { SubscriptionTier } from '../../../types/subscription';
import { cn } from '../../../utils/cn';
import {
  CohortData,
  LTVMetrics,
  ChurnPrediction,
  RevenueMetrics,
  MRRMovement
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_PRICES: Record<SubscriptionTier, number> = {
  trial: 0,
  basic: 19,
  standard: 39,
  pro: 79,
  unlimited: 149
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  trial: 'Essai',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
  unlimited: 'Illimité'
};

const RISK_COLORS = {
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
};

// ============================================================================
// COHORT ANALYSIS COMPONENT
// ============================================================================

interface CohortTableProps {
  cohorts: CohortData[];
  loading: boolean;
  language: string;
}

const CohortTable: React.FC<CohortTableProps> = ({ cohorts, loading, language }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Pas assez de données pour l'analyse de cohortes
      </div>
    );
  }

  const maxMonths = Math.max(...cohorts.map(c => c.retentionByMonth.length));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">Cohorte</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Utilisateurs</th>
            {Array.from({ length: maxMonths }, (_, i) => (
              <th key={i} className="px-3 py-3 text-center font-medium text-gray-600">
                M{i}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium text-gray-600">LTV Moy.</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort, idx) => (
            <tr key={cohort.cohortMonth} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 font-medium text-gray-900">
                {new Date(cohort.cohortMonth + '-01').toLocaleDateString(getDateLocale(language), {
                  month: 'short',
                  year: 'numeric'
                })}
              </td>
              <td className="px-4 py-3 text-center text-gray-600">
                {cohort.totalUsers}
              </td>
              {cohort.retentionByMonth.map((retention, monthIdx) => {
                const intensity = Math.round(retention);
                const bgColor = retention >= 80 ? 'bg-green-500' :
                               retention >= 60 ? 'bg-green-400' :
                               retention >= 40 ? 'bg-yellow-400' :
                               retention >= 20 ? 'bg-orange-400' : 'bg-red-400';
                const textColor = retention >= 40 ? 'text-white' : 'text-gray-900';

                return (
                  <td key={monthIdx} className="px-1 py-1">
                    <div className={cn(
                      'px-2 py-2 rounded text-center text-xs font-medium',
                      bgColor,
                      textColor
                    )}>
                      {retention.toFixed(0)}%
                    </div>
                  </td>
                );
              })}
              {/* Fill empty cells */}
              {Array.from({ length: maxMonths - cohort.retentionByMonth.length }, (_, i) => (
                <td key={`empty-${i}`} className="px-1 py-1">
                  <div className="px-2 py-2 rounded text-center text-xs text-gray-300 bg-gray-100">
                    -
                  </div>
                </td>
              ))}
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {cohort.avgLTV.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// LTV/CAC METRICS COMPONENT
// ============================================================================

interface LTVCardProps {
  metrics: LTVMetrics | null;
  loading: boolean;
}

const LTVMetricsCard: React.FC<LTVCardProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Assuming CAC of 50€ for now (this would come from marketing data)
  const estimatedCAC = 50;
  const ltvCacRatio = metrics.overallLTV / estimatedCAC;
  const isHealthy = ltvCacRatio >= 3;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Métriques LTV/CAC</h3>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">LTV Global</p>
          <p className="text-2xl font-bold text-indigo-700">{metrics.overallLTV.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
          <p className="text-xs text-gray-500 mt-1">Valeur vie client moyenne</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">LTV Projeté</p>
          <p className="text-2xl font-bold text-green-700">{metrics.projectedLTV.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
          <p className="text-xs text-gray-500 mt-1">Basé sur tendances actuelles</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Durée Moy.</p>
          <p className="text-2xl font-bold text-blue-700">{metrics.avgSubscriptionDuration.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">Mois d'abonnement</p>
        </div>

        <div className={cn(
          'p-4 rounded-xl',
          isHealthy ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-orange-50'
        )}>
          <p className="text-sm text-gray-600 mb-1">Ratio LTV/CAC</p>
          <p className={cn(
            'text-2xl font-bold',
            isHealthy ? 'text-green-700' : 'text-red-700'
          )}>
            {ltvCacRatio.toFixed(1)}x
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {isHealthy ? '✓ Sain (>3x)' : '⚠️ À améliorer (<3x)'}
          </p>
        </div>
      </div>

      {/* LTV by Tier */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">LTV par Plan</h4>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(metrics.ltvByTier).map(([tier, ltv]) => (
            <div key={tier} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-gray-900">{ltv.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
              <p className="text-xs text-gray-500 capitalize">{TIER_LABELS[tier as SubscriptionTier] || tier}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LTV by Provider Type */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">LTV par Type de Prestataire</h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(metrics.ltvByProviderType).map(([type, ltv]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                {type === 'lawyer' ? '👨‍⚖️ Avocats' : '🤝 Expat Aidants'}
              </span>
              <span className="font-bold text-gray-900">{ltv.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CHURN PREDICTION COMPONENT
// ============================================================================

interface ChurnPredictionListProps {
  predictions: ChurnPrediction[];
  loading: boolean;
  onContactUser: (prediction: ChurnPrediction) => void;
  language: string;
}

const ChurnPredictionList: React.FC<ChurnPredictionListProps> = ({
  predictions,
  loading,
  onContactUser,
  language
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  const filteredPredictions = useMemo(() => {
    if (filterRisk === 'all') return predictions;
    return predictions.filter(p => p.riskLevel === filterRisk);
  }, [predictions, filterRisk]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'critical', 'high', 'medium'] as const).map(risk => (
          <button
            key={risk}
            onClick={() => setFilterRisk(risk)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              filterRisk === risk
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {risk === 'all' ? 'Tous' :
             risk === 'critical' ? '🔴 Critique' :
             risk === 'high' ? '🟠 Élevé' : '🟡 Moyen'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-red-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-700">
            {predictions.filter(p => p.riskLevel === 'critical').length}
          </p>
          <p className="text-xs text-red-600">Critiques</p>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-orange-700">
            {predictions.filter(p => p.riskLevel === 'high').length}
          </p>
          <p className="text-xs text-orange-600">Élevés</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-700">
            {predictions.filter(p => p.riskLevel === 'medium').length}
          </p>
          <p className="text-xs text-yellow-600">Moyens</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">
            {predictions.filter(p => p.riskLevel === 'low').length}
          </p>
          <p className="text-xs text-green-600">Faibles</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredPredictions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filterRisk === 'all'
              ? 'Aucun risque de churn détecté'
              : `Aucun risque ${filterRisk} détecté`}
          </div>
        ) : (
          filteredPredictions.map(prediction => {
            const colors = RISK_COLORS[prediction.riskLevel];
            const isExpanded = expandedId === prediction.providerId;

            return (
              <div
                key={prediction.providerId}
                className={cn(
                  'border rounded-lg transition-all',
                  colors.border,
                  colors.bg
                )}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : prediction.providerId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        prediction.riskLevel === 'critical' ? 'bg-red-500' :
                        prediction.riskLevel === 'high' ? 'bg-orange-500' :
                        prediction.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      )}>
                        <span className="text-white font-bold text-sm">
                          {prediction.riskScore}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{prediction.providerName}</p>
                        <p className="text-sm text-gray-500">{prediction.providerEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn('text-sm font-medium', colors.text)}>
                          Risque {prediction.riskLevel === 'critical' ? 'critique' :
                                  prediction.riskLevel === 'high' ? 'élevé' :
                                  prediction.riskLevel === 'medium' ? 'moyen' : 'faible'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {prediction.daysSinceLastActivity} jours sans activité
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-white/50">
                    {/* Risk Factors */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Facteurs de risque
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {prediction.riskFactors.map((factor, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Dernière activité</p>
                        <p className="text-sm font-medium">
                          {new Date(prediction.lastActivity).toLocaleDateString(getDateLocale(language))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Baisse d'utilisation</p>
                        <p className={cn(
                          'text-sm font-medium',
                          prediction.usageDeclinePercent > 50 ? 'text-red-600' : 'text-orange-600'
                        )}>
                          -{prediction.usageDeclinePercent}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Score de risque</p>
                        <p className="text-sm font-medium">{prediction.riskScore}/100</p>
                      </div>
                    </div>

                    {/* Recommended Action */}
                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-indigo-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-indigo-700">Action recommandée</p>
                          <p className="text-sm text-indigo-600">{prediction.recommendedAction}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => onContactUser(prediction)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                      >
                        <Mail className="w-4 h-4" />
                        Contacter
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                        <Phone className="w-4 h-4" />
                        Appeler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MRR MOVEMENTS CHART
// ============================================================================

interface MRRMovementsChartProps {
  movements: MRRMovement[];
  loading: boolean;
}

const MRRMovementsChart: React.FC<MRRMovementsChartProps> = ({ movements, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={movements} stackOffset="sign">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}€`} />
          <Tooltip
            formatter={(value) => [`${(value ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="newMrr" name="Nouveau" stackId="stack" fill="#22C55E" />
          <Bar dataKey="expansionMrr" name="Expansion" stackId="stack" fill="#3B82F6" />
          <Bar dataKey="reactivationMrr" name="Réactivation" stackId="stack" fill="#8B5CF6" />
          <Bar dataKey="contractionMrr" name="Contraction" stackId="stack" fill="#F59E0B" />
          <Bar dataKey="churnedMrr" name="Churn" stackId="stack" fill="#EF4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IaAnalyticsTab: React.FC = () => {
  const { language } = useApp();
  const [activeSection, setActiveSection] = useState<'cohorts' | 'ltv' | 'churn' | 'mrr'>('cohorts');
  const [loading, setLoading] = useState(true);

  // Data states
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [ltvMetrics, setLtvMetrics] = useState<LTVMetrics | null>(null);
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>([]);
  const [mrrMovements, setMrrMovements] = useState<MRRMovement[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCohortData(),
        loadLTVMetrics(),
        loadChurnPredictions(),
        loadMRRMovements()
      ]);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCohortData = async () => {
    try {
      const subsSnapshot = await getDocs(collection(db, 'subscriptions'));

      // Group subscriptions by cohort month
      const cohortMap = new Map<string, {
        users: Set<string>;
        activeByMonth: Map<number, Set<string>>;
        totalRevenue: number;
        churned: Set<string>;
      }>();

      const now = new Date();

      subsSnapshot.docs.forEach(doc => {
        const sub = doc.data();
        const createdAt = sub.createdAt?.toDate?.();
        if (!createdAt) return;

        const cohortMonth = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

        if (!cohortMap.has(cohortMonth)) {
          cohortMap.set(cohortMonth, {
            users: new Set(),
            activeByMonth: new Map(),
            totalRevenue: 0,
            churned: new Set()
          });
        }

        const cohort = cohortMap.get(cohortMonth)!;
        cohort.users.add(sub.providerId);

        // Calculate months since cohort start
        const cohortDate = new Date(cohortMonth + '-01');
        const monthsSinceStart = Math.floor(
          (now.getTime() - cohortDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );

        // Track active users per month
        for (let m = 0; m <= Math.min(monthsSinceStart, 12); m++) {
          if (!cohort.activeByMonth.has(m)) {
            cohort.activeByMonth.set(m, new Set());
          }

          const canceledAt = sub.canceledAt?.toDate?.();
          const monthDate = new Date(cohortDate.getTime() + m * 30 * 24 * 60 * 60 * 1000);

          if (!canceledAt || canceledAt > monthDate) {
            if (sub.status === 'active' || sub.status === 'trialing') {
              cohort.activeByMonth.get(m)!.add(sub.providerId);
            }
          }
        }

        // Calculate revenue
        if (sub.status === 'active') {
          const monthlyAmount = sub.billingPeriod === 'yearly'
            ? (sub.currentPeriodAmount || 0) / 12
            : (sub.currentPeriodAmount || 0);
          cohort.totalRevenue += monthlyAmount * Math.min(monthsSinceStart, 12);
        }

        // Track churned
        if (sub.status === 'canceled' || sub.status === 'expired') {
          cohort.churned.add(sub.providerId);
        }
      });

      // Convert to CohortData array
      const cohortData: CohortData[] = Array.from(cohortMap.entries())
        .map(([month, data]) => {
          const totalUsers = data.users.size;
          const retentionByMonth: number[] = [];

          for (let m = 0; m < 12; m++) {
            const activeCount = data.activeByMonth.get(m)?.size || 0;
            if (m === 0 || data.activeByMonth.has(m)) {
              retentionByMonth.push((activeCount / totalUsers) * 100);
            }
          }

          return {
            cohortMonth: month,
            totalUsers,
            retentionByMonth,
            avgLTV: totalUsers > 0 ? data.totalRevenue / totalUsers : 0,
            churnedCount: data.churned.size
          };
        })
        .sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth))
        .slice(0, 12); // Last 12 months

      setCohorts(cohortData);
    } catch (err) {
      console.error('Error loading cohort data:', err);
    }
  };

  const loadLTVMetrics = async () => {
    try {
      const subsSnapshot = await getDocs(collection(db, 'subscriptions'));

      let totalLTV = 0;
      let userCount = 0;
      let totalDuration = 0;
      let totalRevenue = 0;

      const ltvByTier: Record<string, { total: number; count: number }> = {};
      const ltvByType: Record<string, { total: number; count: number }> = {};

      subsSnapshot.docs.forEach(doc => {
        const sub = doc.data();
        const createdAt = sub.createdAt?.toDate?.();
        const canceledAt = sub.canceledAt?.toDate?.();
        const tier = sub.tier as SubscriptionTier;
        const providerType = sub.providerType || 'expat_aidant';

        if (!createdAt) return;

        userCount++;

        // Calculate duration in months
        const endDate = canceledAt || new Date();
        const durationMonths = Math.max(1,
          (endDate.getTime() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        totalDuration += durationMonths;

        // Calculate revenue
        const monthlyPrice = TIER_PRICES[tier] || 0;
        const revenue = monthlyPrice * durationMonths;
        totalRevenue += revenue;
        totalLTV += revenue;

        // By tier
        if (!ltvByTier[tier]) ltvByTier[tier] = { total: 0, count: 0 };
        ltvByTier[tier].total += revenue;
        ltvByTier[tier].count++;

        // By provider type
        if (!ltvByType[providerType]) ltvByType[providerType] = { total: 0, count: 0 };
        ltvByType[providerType].total += revenue;
        ltvByType[providerType].count++;
      });

      const avgLTV = userCount > 0 ? totalLTV / userCount : 0;
      const avgDuration = userCount > 0 ? totalDuration / userCount : 0;
      const arpu = userCount > 0 ? totalRevenue / userCount : 0;

      // Calculate projected LTV based on current retention
      const avgChurnRate = cohorts.length > 0
        ? cohorts.reduce((sum, c) => sum + (100 - (c.retentionByMonth[c.retentionByMonth.length - 1] || 100)), 0) / cohorts.length
        : 5;
      const avgMonthlyChurn = avgChurnRate / 100;
      const expectedLifetime = avgMonthlyChurn > 0 ? 1 / avgMonthlyChurn : 24;
      const projectedLTV = arpu * expectedLifetime;

      setLtvMetrics({
        overallLTV: avgLTV,
        ltvByTier: Object.fromEntries(
          Object.entries(ltvByTier).map(([tier, data]) => [
            tier,
            data.count > 0 ? data.total / data.count : 0
          ])
        ),
        ltvByProviderType: Object.fromEntries(
          Object.entries(ltvByType).map(([type, data]) => [
            type,
            data.count > 0 ? data.total / data.count : 0
          ])
        ),
        avgSubscriptionDuration: avgDuration,
        avgRevenuePerUser: arpu,
        projectedLTV
      });
    } catch (err) {
      console.error('Error loading LTV metrics:', err);
    }
  };

  const loadChurnPredictions = async () => {
    try {
      // Get all active subscriptions
      const subsSnapshot = await getDocs(
        query(collection(db, 'subscriptions'), where('status', 'in', ['active', 'trialing']))
      );

      // Get user activity data
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userActivity = new Map<string, { lastLogin?: Date; aiCallsUsed: number; aiCallsLimit: number }>();

      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        userActivity.set(doc.id, {
          lastLogin: data.lastLoginAt?.toDate?.(),
          aiCallsUsed: data.aiCallsUsed || 0,
          aiCallsLimit: data.aiCallsLimit || 10
        });
      });

      const now = new Date();
      const predictions: ChurnPrediction[] = [];

      subsSnapshot.docs.forEach(doc => {
        const sub = doc.data();
        const providerId = sub.providerId;
        const activity = userActivity.get(providerId);

        const lastActivity = activity?.lastLogin || sub.updatedAt?.toDate?.() || sub.createdAt?.toDate?.();
        const daysSinceLastActivity = lastActivity
          ? Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))
          : 999;

        // Calculate usage decline
        const usagePercent = activity
          ? (activity.aiCallsUsed / Math.max(1, activity.aiCallsLimit)) * 100
          : 0;
        const usageDecline = Math.max(0, 100 - usagePercent);

        // Calculate risk score (0-100)
        let riskScore = 0;
        const riskFactors: string[] = [];

        // Factor 1: Days since last activity (max 40 points)
        if (daysSinceLastActivity > 30) {
          riskScore += 40;
          riskFactors.push(`${daysSinceLastActivity} jours d'inactivité`);
        } else if (daysSinceLastActivity > 14) {
          riskScore += 25;
          riskFactors.push(`${daysSinceLastActivity} jours d'inactivité`);
        } else if (daysSinceLastActivity > 7) {
          riskScore += 10;
          riskFactors.push(`${daysSinceLastActivity} jours d'inactivité`);
        }

        // Factor 2: Usage decline (max 30 points)
        if (usageDecline > 80) {
          riskScore += 30;
          riskFactors.push('Usage très faible (<20%)');
        } else if (usageDecline > 50) {
          riskScore += 20;
          riskFactors.push('Usage faible (<50%)');
        } else if (usageDecline > 30) {
          riskScore += 10;
          riskFactors.push('Usage modéré');
        }

        // Factor 3: Trial ending soon (max 15 points)
        if (sub.status === 'trialing') {
          const trialEnds = sub.trialEndsAt?.toDate?.();
          if (trialEnds) {
            const daysUntilEnd = Math.floor((trialEnds.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            if (daysUntilEnd <= 3) {
              riskScore += 15;
              riskFactors.push('Essai expire dans 3 jours');
            } else if (daysUntilEnd <= 7) {
              riskScore += 10;
              riskFactors.push('Essai expire bientôt');
            }
          }
        }

        // Factor 4: Payment issues (max 15 points)
        if (sub.paymentFailed) {
          riskScore += 15;
          riskFactors.push('Paiement échoué récent');
        }

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        if (riskScore >= 70) riskLevel = 'critical';
        else if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';
        else riskLevel = 'low';

        // Generate recommended action
        let recommendedAction = 'Aucune action requise';
        if (riskLevel === 'critical') {
          recommendedAction = 'Contact urgent - Proposer un appel de rétention avec offre spéciale';
        } else if (riskLevel === 'high') {
          recommendedAction = 'Envoyer un email personnalisé avec ressources d\'aide';
        } else if (riskLevel === 'medium') {
          recommendedAction = 'Programmer un email de réengagement automatique';
        }

        // Only include users with some risk
        if (riskScore >= 20) {
          predictions.push({
            providerId,
            providerName: sub.providerName || 'N/A',
            providerEmail: sub.providerEmail || 'N/A',
            riskScore,
            riskLevel,
            riskFactors,
            lastActivity: lastActivity || now,
            daysSinceLastActivity,
            usageDeclinePercent: Math.round(usageDecline),
            recommendedAction
          });
        }
      });

      // Sort by risk score descending
      predictions.sort((a, b) => b.riskScore - a.riskScore);
      setChurnPredictions(predictions);
    } catch (err) {
      console.error('Error loading churn predictions:', err);
    }
  };

  const loadMRRMovements = async () => {
    try {
      const subsSnapshot = await getDocs(collection(db, 'subscriptions'));

      // Load subscription logs for upgrade/downgrade tracking
      const logsSnapshot = await getDocs(
        query(
          collection(db, 'subscription_logs'),
          where('action', '==', 'subscription_updated')
        )
      );

      const now = new Date();
      const movements: MRRMovement[] = [];

      // Generate last 6 months of data
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthStr = monthDate.toLocaleDateString(getDateLocale(language), { month: 'short', year: '2-digit' });

        let newMrr = 0;
        let expansionMrr = 0;
        let contractionMrr = 0;
        let churnedMrr = 0;
        let reactivationMrr = 0;

        subsSnapshot.docs.forEach(doc => {
          const sub = doc.data();
          const createdAt = sub.createdAt?.toDate?.();
          const canceledAt = sub.canceledAt?.toDate?.();
          const tier = sub.tier as SubscriptionTier;
          const monthlyPrice = TIER_PRICES[tier] || 0;

          if (!createdAt) return;

          // New MRR - subscriptions created this month
          if (createdAt >= monthDate && createdAt <= monthEnd) {
            if (sub.status === 'active') {
              newMrr += monthlyPrice;
            }
          }

          // Churned MRR - cancellations this month
          if (canceledAt && canceledAt >= monthDate && canceledAt <= monthEnd) {
            churnedMrr -= monthlyPrice;
          }
        });

        // Track upgrades/downgrades for expansion/contraction from subscription logs
        logsSnapshot.docs.forEach(doc => {
          const log = doc.data();
          const logDate = log.createdAt?.toDate?.();
          const metadata = log.metadata || {};

          if (!logDate || logDate < monthDate || logDate > monthEnd) return;

          const previousTier = metadata.previousTier as SubscriptionTier | undefined;
          const newTier = metadata.newTier as SubscriptionTier | undefined;

          if (!previousTier || !newTier || previousTier === newTier) return;

          const previousPrice = TIER_PRICES[previousTier] || 0;
          const newPrice = TIER_PRICES[newTier] || 0;
          const priceDiff = newPrice - previousPrice;

          if (metadata.isUpgrade && priceDiff > 0) {
            // Expansion MRR - upgrades increase revenue
            expansionMrr += priceDiff;
          } else if (metadata.isDowngrade && priceDiff < 0) {
            // Contraction MRR - downgrades decrease revenue (stored as negative)
            contractionMrr += priceDiff;
          }
        });

        movements.push({
          date: monthStr,
          newMrr,
          expansionMrr,
          contractionMrr,
          churnedMrr,
          reactivationMrr,
          netMrr: newMrr + expansionMrr + contractionMrr + churnedMrr + reactivationMrr
        });
      }

      setMrrMovements(movements);

      // Calculate revenue metrics
      const currentMonth = movements[movements.length - 1];
      const previousMonth = movements[movements.length - 2];

      const mrr = subsSnapshot.docs.reduce((sum, doc) => {
        const sub = doc.data();
        if (sub.status === 'active') {
          const tier = sub.tier as SubscriptionTier;
          return sum + (TIER_PRICES[tier] || 0);
        }
        return sum;
      }, 0);

      const previousMrr = mrr - (currentMonth?.netMrr || 0);
      const mrrGrowthRate = previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0;

      setRevenueMetrics({
        mrr,
        arr: mrr * 12,
        mrrGrowthRate,
        netMrrChange: currentMonth?.netMrr || 0,
        newMrr: currentMonth?.newMrr || 0,
        expansionMrr: currentMonth?.expansionMrr || 0,
        contractionMrr: Math.abs(currentMonth?.contractionMrr || 0),
        churnedMrr: Math.abs(currentMonth?.churnedMrr || 0),
        reactivationMrr: currentMonth?.reactivationMrr || 0
      });
    } catch (err) {
      console.error('Error loading MRR movements:', err);
    }
  };

  const handleContactUser = (prediction: ChurnPrediction) => {
    // Open email client
    const subject = encodeURIComponent('Besoin d\'aide avec SOS Expat ?');
    const body = encodeURIComponent(`Bonjour ${prediction.providerName},\n\nNous avons remarqué que vous n'avez pas utilisé notre plateforme récemment. Y a-t-il quelque chose que nous pourrions améliorer pour vous ?\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nL'équipe SOS Expat`);
    window.open(`mailto:${prediction.providerEmail}?subject=${subject}&body=${body}`);
  };

  const sections = [
    { id: 'cohorts', label: 'Cohortes', icon: Users },
    { id: 'ltv', label: 'LTV/CAC', icon: Target },
    { id: 'churn', label: 'Prédiction Churn', icon: UserX },
    { id: 'mrr', label: 'Mouvements MRR', icon: BarChart3 }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Analytics Avancées</h2>
            <p className="text-sm text-gray-500">Cohortes, LTV, Prédiction de churn</p>
          </div>
        </div>
        <button
          onClick={loadAllData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 justify-center',
                activeSection === section.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Summary Cards */}
      {revenueMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-500">MRR</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{revenueMetrics.mrr.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
            <p className={cn(
              'text-xs mt-1 flex items-center gap-1',
              revenueMetrics.mrrGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {revenueMetrics.mrrGrowthRate >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {revenueMetrics.mrrGrowthRate >= 0 ? '+' : ''}{revenueMetrics.mrrGrowthRate.toFixed(1)}% ce mois
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <span className="text-sm text-gray-500">LTV Moyen</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{ltvMetrics?.overallLTV.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}€</p>
            <p className="text-xs text-gray-500 mt-1">Par utilisateur</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserX className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-500">À risque</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {churnPredictions.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Utilisateurs à surveiller</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-500">Durée Moy.</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {ltvMetrics?.avgSubscriptionDuration.toFixed(1) || 0} mois
            </p>
            <p className="text-xs text-gray-500 mt-1">Abonnement</p>
          </div>
        </div>
      )}

      {/* Section Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeSection === 'cohorts' && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Analyse de Cohortes</h3>
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <Info className="w-4 h-4" />
                Rétention mensuelle par cohorte d'inscription
              </div>
            </div>
            <CohortTable cohorts={cohorts} loading={loading} language={language} />
          </>
        )}

        {activeSection === 'ltv' && (
          <LTVMetricsCard metrics={ltvMetrics} loading={loading} />
        )}

        {activeSection === 'churn' && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <UserX className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Prédiction de Churn</h3>
              <div className="ml-auto text-sm text-gray-500">
                {churnPredictions.length} utilisateurs analysés
              </div>
            </div>
            <ChurnPredictionList
              predictions={churnPredictions}
              loading={loading}
              onContactUser={handleContactUser}
              language={language}
            />
          </>
        )}

        {activeSection === 'mrr' && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Mouvements MRR</h3>
            </div>
            <MRRMovementsChart movements={mrrMovements} loading={loading} />

            {revenueMetrics && (
              <div className="mt-6 grid grid-cols-5 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-700">+{revenueMetrics.newMrr.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
                  <p className="text-xs text-green-600">Nouveau</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-700">+{revenueMetrics.expansionMrr.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
                  <p className="text-xs text-blue-600">Expansion</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-700">+{revenueMetrics.reactivationMrr.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
                  <p className="text-xs text-purple-600">Réactivation</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-lg font-bold text-orange-700">-{revenueMetrics.contractionMrr.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
                  <p className="text-xs text-orange-600">Contraction</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-700">-{revenueMetrics.churnedMrr.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</p>
                  <p className="text-xs text-red-600">Churn</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default IaAnalyticsTab;
