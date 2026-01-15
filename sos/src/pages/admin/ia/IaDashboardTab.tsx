/**
 * IaDashboardTab - Tableau de bord des statistiques IA
 * Avec graphiques recharts, MRR, churn, conversions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../contexts/AppContext';
import { getDateLocale } from '../../../utils/formatters';
import {
  Users,
  Sparkles,
  Crown,
  DollarSign,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Activity,
  BarChart3,
  PieChartIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { SubscriptionTier } from '../../../types/subscription';
import { StatCard } from './components/StatCard';
import { SubscriptionStats, DailySubscriberData, PlanDistributionData, UsageByPlanData } from './types';
import { cn } from '../../../utils/cn';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_COLORS: Record<SubscriptionTier, string> = {
  trial: '#9CA3AF',
  basic: '#3B82F6',
  standard: '#6366F1',
  pro: '#8B5CF6',
  unlimited: '#F59E0B'
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  trial: 'Essai',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
  unlimited: 'Illimite'
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IaDashboardTab: React.FC = () => {
  const { language } = useApp();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [dailyData, setDailyData] = useState<DailySubscriberData[]>([]);
  const [usageByPlan, setUsageByPlan] = useState<UsageByPlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadStats();
  }, [chartPeriod]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load subscriptions
      // COST FIX: Added limit to prevent excessive reads
      const subsSnapshot = await getDocs(query(collection(db, 'subscriptions'), limit(2000)));

      const newStats: SubscriptionStats = {
        totalProviders: subsSnapshot.size,
        activeSubscriptions: 0,
        trialUsers: 0,
        paidUsers: 0,
        mrr: 0,
        mrrEur: 0,
        mrrUsd: 0,
        churnRate: 0,
        trialConversionRate: 0,
        byTier: {
          trial: 0,
          basic: 0,
          standard: 0,
          pro: 0,
          unlimited: 0
        }
      };

      let canceledLast30Days = 0;
      let convertedFromTrial = 0;
      let totalTrialEver = 0;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      subsSnapshot.docs.forEach(doc => {
        const sub = doc.data();
        const tier = sub.tier as SubscriptionTier;
        newStats.byTier[tier] = (newStats.byTier[tier] || 0) + 1;

        if (sub.status === 'trialing') {
          newStats.trialUsers++;
          totalTrialEver++;
        } else if (sub.status === 'active') {
          newStats.activeSubscriptions++;
          newStats.paidUsers++;

          // Calculate MRR
          const amount = sub.currentPeriodAmount || 0;
          const currency = sub.currency || 'EUR';
          const billingPeriod = sub.billingPeriod || 'monthly';

          // Convert annual to monthly for MRR
          const monthlyAmount = billingPeriod === 'yearly' ? amount / 12 : amount;

          if (currency === 'EUR') {
            newStats.mrrEur += monthlyAmount;
          } else {
            newStats.mrrUsd += monthlyAmount;
          }
          newStats.mrr += monthlyAmount;

          // Check if converted from trial
          if (sub.trialStartedAt) {
            convertedFromTrial++;
            totalTrialEver++;
          }
        } else if (sub.status === 'canceled' || sub.status === 'expired') {
          const canceledAt = sub.canceledAt?.toDate?.() || sub.updatedAt?.toDate?.();
          if (canceledAt && canceledAt > thirtyDaysAgo) {
            canceledLast30Days++;
          }
        }
      });

      // Calculate churn rate
      const totalActiveStart = newStats.paidUsers + canceledLast30Days;
      newStats.churnRate = totalActiveStart > 0
        ? Math.round((canceledLast30Days / totalActiveStart) * 100 * 10) / 10
        : 0;

      // Calculate trial conversion rate
      newStats.trialConversionRate = totalTrialEver > 0
        ? Math.round((convertedFromTrial / totalTrialEver) * 100 * 10) / 10
        : 0;

      setStats(newStats);

      // Generate daily data for charts
      await loadDailyData(chartPeriod);
      await loadUsageByPlan();

    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyData = async (period: '7d' | '30d' | '90d') => {
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Get subscription activity logs or generate mock data based on current state
      // COST FIX: Added limit to prevent excessive reads
      const subsSnapshot = await getDocs(query(collection(db, 'subscriptions'), limit(2000)));

      const dailyStats: DailySubscriberData[] = [];

      // Generate data for each day
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString(getDateLocale(language), { day: '2-digit', month: '2-digit' });

        let active = 0;
        let trial = 0;
        let canceled = 0;

        subsSnapshot.docs.forEach(doc => {
          const sub = doc.data();
          const createdAt = sub.createdAt?.toDate?.();
          const canceledAt = sub.canceledAt?.toDate?.();

          if (createdAt && createdAt <= date) {
            if (canceledAt && canceledAt <= date) {
              canceled++;
            } else if (sub.status === 'trialing' || (sub.trialEndsAt?.toDate?.() > date && !sub.stripeSubscriptionId)) {
              trial++;
            } else {
              active++;
            }
          }
        });

        dailyStats.push({
          date: dateStr,
          total: active + trial,
          active,
          trial,
          canceled
        });
      }

      setDailyData(dailyStats);
    } catch (err) {
      console.error('Error loading daily data:', err);
    }
  };

  const loadUsageByPlan = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['lawyer', 'expat_aidant', 'provider']),
        limit(500)
      );

      const snapshot = await getDocs(usersQuery);

      const usageMap: Record<SubscriptionTier, { total: number; count: number; max: number; min: number }> = {
        trial: { total: 0, count: 0, max: 0, min: Infinity },
        basic: { total: 0, count: 0, max: 0, min: Infinity },
        standard: { total: 0, count: 0, max: 0, min: Infinity },
        pro: { total: 0, count: 0, max: 0, min: Infinity },
        unlimited: { total: 0, count: 0, max: 0, min: Infinity }
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const tier = (data.subscriptionTier as SubscriptionTier) || 'trial';
        const usage = data.aiCallsUsed || 0;

        if (usageMap[tier]) {
          usageMap[tier].total += usage;
          usageMap[tier].count++;
          usageMap[tier].max = Math.max(usageMap[tier].max, usage);
          if (usage > 0) {
            usageMap[tier].min = Math.min(usageMap[tier].min, usage);
          }
        }
      });

      const usageData: UsageByPlanData[] = Object.entries(usageMap)
        .filter(([_, data]) => data.count > 0)
        .map(([plan, data]) => ({
          plan: TIER_LABELS[plan as SubscriptionTier],
          avgUsage: Math.round(data.total / data.count),
          maxUsage: data.max,
          minUsage: data.min === Infinity ? 0 : data.min
        }));

      setUsageByPlan(usageData);
    } catch (err) {
      console.error('Error loading usage by plan:', err);
    }
  };

  // Plan distribution for pie chart
  const planDistribution = useMemo<PlanDistributionData[]>(() => {
    if (!stats) return [];
    return Object.entries(stats.byTier)
      .filter(([_, value]) => value > 0)
      .map(([tier, value]) => ({
        name: TIER_LABELS[tier as SubscriptionTier],
        value,
        color: TIER_COLORS[tier as SubscriptionTier]
      }));
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Impossible de charger les statistiques
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          label="Total prestataires"
          value={stats.totalProviders}
          color="bg-indigo-100"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5 text-blue-600" />}
          label="En essai gratuit"
          value={stats.trialUsers}
          trend={stats.trialConversionRate > 0 ? {
            value: `${stats.trialConversionRate}% conversion`,
            positive: stats.trialConversionRate > 20
          } : undefined}
          color="bg-blue-100"
        />
        <StatCard
          icon={<Crown className="w-5 h-5 text-purple-600" />}
          label="Abonnes payants"
          value={stats.paidUsers}
          color="bg-purple-100"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          label="MRR Total"
          value={`${Math.round(stats.mrr).toLocaleString('fr-FR')} EUR`}
          trend={stats.churnRate > 0 ? {
            value: `${stats.churnRate}% churn`,
            positive: false
          } : undefined}
          color="bg-green-100"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.trialConversionRate}%
          </div>
          <div className="text-sm text-gray-500">Taux de conversion essai</div>
          <div className="mt-2 text-xs text-gray-400">
            Essai vers abonnement paye
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              'p-2 rounded-lg',
              stats.churnRate > 5 ? 'bg-red-100' : 'bg-amber-100'
            )}>
              <TrendingDown className={cn(
                'w-5 h-5',
                stats.churnRate > 5 ? 'text-red-600' : 'text-amber-600'
              )} />
            </div>
            {stats.churnRate > 5 && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.churnRate}%
          </div>
          <div className="text-sm text-gray-500">Taux de churn (30j)</div>
          <div className="mt-2 text-xs text-gray-400">
            Annulations sur 30 jours
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.activeSubscriptions}
          </div>
          <div className="text-sm text-gray-500">Abonnements actifs</div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-gray-500">EUR: {Math.round(stats.mrrEur).toLocaleString('fr-FR')} EUR</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">USD: ${Math.round(stats.mrrUsd).toLocaleString('en-US')}</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscribers Evolution Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Evolution des abonnes
              </h2>
            </div>
            <div className="flex gap-1">
              {(['7d', '30d', '90d'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-lg transition-colors',
                    chartPeriod === period
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval={chartPeriod === '7d' ? 0 : chartPeriod === '30d' ? 4 : 14}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="active"
                  name="Actifs"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="trial"
                  name="Essai"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Repartition par plan
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution as Array<{ name: string; value: number; color: string }>}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''}: ${value ?? 0}`}
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {planDistribution.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage by Plan Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Usage IA moyen par plan
          </h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usageByPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="plan" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar
                dataKey="avgUsage"
                name="Moyenne"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="maxUsage"
                name="Maximum"
                fill="#E5E7EB"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tier Distribution Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Distribution par tier
        </h2>
        <div className="grid grid-cols-5 gap-4">
          {(['trial', 'basic', 'standard', 'pro', 'unlimited'] as SubscriptionTier[]).map(tier => {
            const count = stats.byTier[tier] || 0;
            const percent = stats.totalProviders > 0
              ? Math.round((count / stats.totalProviders) * 100)
              : 0;
            return (
              <div key={tier} className="text-center p-4 bg-gray-50 rounded-lg">
                <div
                  className="w-4 h-4 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: TIER_COLORS[tier] }}
                />
                <div className="text-2xl font-bold text-gray-900">
                  {count}
                </div>
                <div className="text-xs text-gray-500 capitalize">{TIER_LABELS[tier]}</div>
                <div className="text-xs text-gray-400 mt-1">{percent}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Actions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer group">
            <Users className="w-6 h-6 text-indigo-600 mb-2" />
            <h3 className="font-medium text-gray-900">Acces Prestataires</h3>
            <p className="text-sm text-gray-500">Gerer les acces IA</p>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 mt-2 transition-colors" />
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer group">
            <Crown className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Quotas</h3>
            <p className="text-sm text-gray-500">Modifier les quotas</p>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 mt-2 transition-colors" />
          </div>
          <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer group">
            <DollarSign className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Tarification</h3>
            <p className="text-sm text-gray-500">Gerer les plans</p>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 mt-2 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IaDashboardTab;
