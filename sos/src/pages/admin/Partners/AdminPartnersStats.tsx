/**
 * AdminPartnersStats - Premium 2026 program overview dashboard
 *
 * Features:
 * - Summary stat cards with gradient backgrounds
 * - Monthly earnings trend chart (Recharts AreaChart)
 * - Top partners by revenue table with rank badges
 * - Conversion rate display
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  MousePointerClick,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Crown,
  Globe,
  Phone,
  Wallet,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface ProgramStats {
  totalPartners: number;
  activePartners: number;
  suspendedPartners: number;
  bannedPartners: number;
  totalEarnings: number;
  totalClicks: number;
  totalCalls: number;
  totalWithdrawn: number;
  topPartners: Array<{
    id: string;
    websiteName: string;
    affiliateCode: string;
    totalEarned: number;
    totalClicks: number;
    totalCalls: number;
  }>;
  monthlyGrowth: Array<{
    month: string;
    newPartners: number;
    earnings: number;
    clicks: number;
  }>;
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdminPartnersStats: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, ProgramStats>(functionsAffiliate, 'adminGetPartnerStats');
      const res = await fn();
      setStats(res.data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchStats} className={`${UI.button.secondary} inline-flex items-center gap-2`}>
            <RefreshCw className="w-4 h-4" /> <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
          </button>
        </div>
      </AdminLayout>
    );
  }

  const STAT_CARDS = [
    { icon: Users, label: intl.formatMessage({ id: 'admin.partners.stats.activePartners', defaultMessage: 'Partenaires actifs' }), value: stats.activePartners, subValue: `${stats.totalPartners} total`, color: 'text-teal-600 dark:text-teal-400', bg: 'from-teal-500/20 to-emerald-500/20' },
    { icon: DollarSign, label: intl.formatMessage({ id: 'admin.partners.stats.totalEarnings', defaultMessage: 'Gains totaux' }), value: formatAmount(stats.totalEarnings), subValue: `${formatAmount(stats.totalWithdrawn)} retires`, color: 'text-green-600 dark:text-green-400', bg: 'from-green-500/20 to-emerald-500/20' },
    { icon: MousePointerClick, label: intl.formatMessage({ id: 'admin.partners.stats.totalClicks', defaultMessage: 'Total clics' }), value: stats.totalClicks.toLocaleString(), subValue: `${stats.totalCalls.toLocaleString()} appels`, color: 'text-blue-600 dark:text-blue-400', bg: 'from-blue-500/20 to-indigo-500/20' },
    { icon: TrendingUp, label: intl.formatMessage({ id: 'admin.partners.stats.newThisMonth', defaultMessage: 'Nouveaux ce mois' }), value: stats.monthlyGrowth.length > 0 ? stats.monthlyGrowth[stats.monthlyGrowth.length - 1].newPartners : 0, subValue: intl.formatMessage({ id: 'admin.partners.stats.growthLabel', defaultMessage: 'Croissance' }), color: 'text-purple-600 dark:text-purple-400', bg: 'from-purple-500/20 to-pink-500/20' },
  ];

  const RANK_COLORS = [
    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'bg-gray-200 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-teal-500" />
              </div>
              <FormattedMessage id="admin.partners.stats.title" defaultMessage="Vue d'ensemble Partenaires" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
              <FormattedMessage id="admin.partners.stats.subtitle" defaultMessage="Metriques globales du programme partenaire" />
            </p>
          </div>
          <button onClick={fetchStats} disabled={loading} className={`${UI.button.secondary} flex items-center gap-2 text-sm`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <FormattedMessage id="common.refresh" defaultMessage="Rafraichir" />
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAT_CARDS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`${UI.card} p-5 relative overflow-hidden group`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                  {stat.subValue && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stat.subValue}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Earnings Chart */}
        {stats.monthlyGrowth.length > 0 && (
          <div className={UI.card + ' p-6'}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="admin.partners.stats.monthlyTrend" defaultMessage="Tendance mensuelle" />
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyGrowth}>
                  <defs>
                    <linearGradient id="statsEarningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="statsClicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#888" fontSize={12} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', background: 'var(--tooltip-bg, rgba(255,255,255,0.95))' }}
                    formatter={(value, name) => [
                      name === 'earnings' ? `$${(Number(value) / 100).toFixed(2)}` : Number(value).toLocaleString(),
                      name === 'earnings' ? intl.formatMessage({ id: 'admin.partners.stats.chart.earnings', defaultMessage: 'Gains' }) : intl.formatMessage({ id: 'admin.partners.stats.chart.clicks', defaultMessage: 'Clics' })
                    ]}
                  />
                  <Legend formatter={(value) => value === 'earnings' ? intl.formatMessage({ id: 'admin.partners.stats.chart.earnings', defaultMessage: 'Gains' }) : intl.formatMessage({ id: 'admin.partners.stats.chart.clicks', defaultMessage: 'Clics' })} />
                  <Area yAxisId="left" type="monotone" dataKey="earnings" stroke="#14b8a6" fill="url(#statsEarningsGrad)" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="clicks" stroke="#6366f1" fill="url(#statsClicksGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top Performers */}
        <div className={UI.card + ' overflow-hidden'}>
          <div className="p-5 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.stats.topPerformers" defaultMessage="Top Partenaires" />
              </h2>
            </div>
          </div>

          {stats.topPartners.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400"><FormattedMessage id="admin.partners.stats.noPerformers" defaultMessage="Pas encore de donnees" /></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.stats.table.partner" defaultMessage="Partenaire" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.stats.table.code" defaultMessage="Code" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.stats.table.earnings" defaultMessage="Gains" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.stats.table.clicks" defaultMessage="Clics" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.stats.table.calls" defaultMessage="Appels" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {stats.topPartners.map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => navigate(`/admin/partners/${p.id}`)}>
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i < 3 ? RANK_COLORS[i] : 'bg-gray-100 dark:bg-gray-700/30 text-gray-500'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-4 h-4 text-teal-500" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{p.websiteName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-lg text-teal-600 dark:text-teal-400 font-mono">{p.affiliateCode}</code>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-teal-600 dark:text-teal-400">{formatAmount(p.totalEarned)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{p.totalClicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{p.totalCalls.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPartnersStats;
