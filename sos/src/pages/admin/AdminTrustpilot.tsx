// src/pages/admin/AdminTrustpilot.tsx
// Dashboard Trustpilot - Suivi des invitations et clics vers Trustpilot
// Analyse des performances de la stratégie d'avis externes

import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Star,
  Mail,
  MousePointer,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  CheckCircle,
  Award,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';

// Types
interface TrustpilotEvent {
  id: string;
  eventName: string;
  params: {
    user_id?: string;
    rating_stars?: number;
    email_language?: string;
    review_id?: string;
    subscriber_id?: string;
    campaign_id?: string;
  };
  timestamp: Date;
  sentToGA4: boolean;
}

interface DailyStats {
  date: string;
  invitesSent: number;
  clicked: number;
}

interface LanguageStats {
  language: string;
  count: number;
  percentage: number;
}

interface RatingStats {
  rating: number;
  count: number;
}

interface SummaryStats {
  totalInvitesSent: number;
  totalClicked: number;
  clickRate: number;
  avgRating: number;
  topLanguage: string;
  periodComparison: number;
}

type Period = '7d' | '30d' | '90d';

// Colors
const CHART_COLORS = {
  invites: '#10B981',  // Green
  clicks: '#3B82F6',   // Blue
  rating5: '#22C55E',
  rating4: '#84CC16',
  rating3: '#EAB308',
  rating2: '#F97316',
  rating1: '#EF4444',
};

const LANGUAGE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'Fran\u00e7ais',
  en: 'English',
  de: 'Deutsch',
  es: 'Espa\u00f1ol',
  pt: 'Portugu\u00eas',
  ru: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
  zh: '\u4e2d\u6587',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  hi: '\u0939\u093f\u0928\u094d\u0926\u0940',
};

// Helper functions
const getDateRange = (period: Period): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
  }

  return { start, end };
};

const formatDate = (dateStr: string, locale: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// KPI Card Component
const KPICard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, change, icon, color, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {typeof change === 'number' && (
          <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
            <span className="ml-1 text-gray-400">vs p\u00e9riode pr\u00e9c.</span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

// Star Rating Component
const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
      />
    ))}
  </div>
);

// Main Component
const AdminTrustpilot: React.FC = () => {
  const intl = useIntl();

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats[]>([]);
  const [recentEvents, setRecentEvents] = useState<TrustpilotEvent[]>([]);

  // Load data from Firestore
  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const { start, end } = getDateRange(period);

      // Query analytics_events for Trustpilot events
      // Note: Firestore doesn't support 'in' with range queries without composite index
      // So we do two separate queries and combine results
      const invitesQuery = query(
        collection(db, 'analytics_events'),
        where('eventName', '==', 'trustpilot_invite_sent'),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      const clicksQuery = query(
        collection(db, 'analytics_events'),
        where('eventName', '==', 'trustpilot_clicked'),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      // Execute both queries in parallel
      const [invitesSnapshot, clicksSnapshot] = await Promise.all([
        getDocs(invitesQuery),
        getDocs(clicksQuery)
      ]);

      // Combine and sort results
      const allDocs = [...invitesSnapshot.docs, ...clicksSnapshot.docs];
      const events: TrustpilotEvent[] = allDocs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }) as TrustpilotEvent)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Calculate summary
      const invitesSent = events.filter(e => e.eventName === 'trustpilot_invite_sent');
      const clicked = events.filter(e => e.eventName === 'trustpilot_clicked');

      const totalInvites = invitesSent.length;
      const totalClicks = clicked.length;
      const clickRate = totalInvites > 0 ? (totalClicks / totalInvites) * 100 : 0;

      // Calculate average rating
      const ratings = invitesSent
        .map(e => e.params?.rating_stars)
        .filter((r): r is number => typeof r === 'number');
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

      // Calculate language distribution
      const langCounts: Record<string, number> = {};
      invitesSent.forEach(e => {
        const lang = e.params?.email_language || 'unknown';
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      });

      const langStats: LanguageStats[] = Object.entries(langCounts)
        .map(([language, count]) => ({
          language,
          count,
          percentage: totalInvites > 0 ? (count / totalInvites) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate rating distribution
      const ratingCounts: Record<number, number> = { 4: 0, 5: 0 };
      invitesSent.forEach(e => {
        const rating = e.params?.rating_stars;
        if (rating === 4 || rating === 5) {
          ratingCounts[rating]++;
        }
      });

      const ratingStatsData: RatingStats[] = [
        { rating: 5, count: ratingCounts[5] || 0 },
        { rating: 4, count: ratingCounts[4] || 0 },
      ];

      // Calculate daily stats
      const dailyMap: Record<string, { invitesSent: number; clicked: number }> = {};

      events.forEach(e => {
        const dateKey = e.timestamp.toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { invitesSent: 0, clicked: 0 };
        }
        if (e.eventName === 'trustpilot_invite_sent') {
          dailyMap[dateKey].invitesSent++;
        } else if (e.eventName === 'trustpilot_clicked') {
          dailyMap[dateKey].clicked++;
        }
      });

      const dailyData: DailyStats[] = Object.entries(dailyMap)
        .map(([date, stats]) => ({
          date,
          ...stats,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Set states
      setSummary({
        totalInvitesSent: totalInvites,
        totalClicked: totalClicks,
        clickRate,
        avgRating,
        topLanguage: langStats[0]?.language || 'N/A',
        periodComparison: 0, // Could calculate vs previous period
      });

      setDailyStats(dailyData);
      setLanguageStats(langStats);
      setRatingStats(ratingStatsData);
      setRecentEvents(events.slice(0, 20));

    } catch (error) {
      console.error('[AdminTrustpilot] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Star className="text-green-600 fill-green-600" />
                  {intl.formatMessage({ id: 'admin.trustpilot.title', defaultMessage: 'Trustpilot Analytics' })}
                </h1>
                <p className="text-gray-600 mt-1">
                  {intl.formatMessage({ id: 'admin.trustpilot.subtitle', defaultMessage: 'Suivi des invitations et conversions Trustpilot' })}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Period Filter */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(['7d', '30d', '90d'] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        period === p
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
                    </button>
                  ))}
                </div>

                {/* Refresh */}
                <Button
                  onClick={loadData}
                  variant="outline"
                  className="border-gray-300"
                  loading={isLoading}
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </Button>

                {/* Link to Trustpilot */}
                <a
                  href="https://www.trustpilot.com/review/sos-expat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ExternalLink size={18} />
                  Voir sur Trustpilot
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title={intl.formatMessage({ id: 'admin.trustpilot.kpi.invitesSent', defaultMessage: 'Invitations envoy\u00e9es' })}
                  value={summary?.totalInvitesSent || 0}
                  icon={<Mail size={24} className="text-white" />}
                  color="bg-green-600"
                  subtitle={`Clients satisfaits (4-5\u2605)`}
                />
                <KPICard
                  title={intl.formatMessage({ id: 'admin.trustpilot.kpi.clicked', defaultMessage: 'Clics sur Trustpilot' })}
                  value={summary?.totalClicked || 0}
                  icon={<MousePointer size={24} className="text-white" />}
                  color="bg-blue-600"
                  subtitle="Liens Trustpilot cliqu\u00e9s"
                />
                <KPICard
                  title={intl.formatMessage({ id: 'admin.trustpilot.kpi.clickRate', defaultMessage: 'Taux de clic' })}
                  value={formatPercentage(summary?.clickRate || 0)}
                  icon={<TrendingUp size={24} className="text-white" />}
                  color="bg-purple-600"
                  subtitle="Clics / Invitations"
                />
                <KPICard
                  title={intl.formatMessage({ id: 'admin.trustpilot.kpi.avgRating', defaultMessage: 'Note moyenne' })}
                  value={`${(summary?.avgRating || 0).toFixed(1)}\u2605`}
                  icon={<Star size={24} className="text-white fill-white" />}
                  color="bg-yellow-500"
                  subtitle="Des clients invit\u00e9s"
                />
              </div>

              {/* Info Banner */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-medium text-green-900">
                      {intl.formatMessage({ id: 'admin.trustpilot.info.title', defaultMessage: 'Flux Trustpilot actif' })}
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      {intl.formatMessage({ id: 'admin.trustpilot.info.description', defaultMessage: 'Les clients ayant donn\u00e9 une note \u2265 4 \u00e9toiles re\u00e7oivent automatiquement une invitation par email pour laisser un avis sur Trustpilot.' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution Over Time */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {intl.formatMessage({ id: 'admin.trustpilot.chart.evolution', defaultMessage: '\u00c9volution dans le temps' })}
                  </h3>
                  <div className="h-80">
                    {dailyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => formatDate(value, intl.locale)}
                            stroke="#9CA3AF"
                            fontSize={12}
                          />
                          <YAxis stroke="#9CA3AF" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                            }}
                            labelFormatter={(value) => formatDate(value, intl.locale)}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="invitesSent"
                            name="Invitations"
                            stroke={CHART_COLORS.invites}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="clicked"
                            name="Clics"
                            stroke={CHART_COLORS.clicks}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Aucune donn\u00e9e pour cette p\u00e9riode
                      </div>
                    )}
                  </div>
                </div>

                {/* Language Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {intl.formatMessage({ id: 'admin.trustpilot.chart.byLanguage', defaultMessage: 'R\u00e9partition par langue' })}
                  </h3>
                  <div className="h-80">
                    {languageStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={languageStats.map((stat, index) => ({
                              name: LANGUAGE_NAMES[stat.language] || stat.language.toUpperCase(),
                              value: stat.count,
                              color: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length],
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {languageStats.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={LANGUAGE_COLORS[index % LANGUAGE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} invitations`, 'Total']} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Aucune donn\u00e9e
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'admin.trustpilot.chart.byRating', defaultMessage: 'Distribution par note' })}
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                      <YAxis
                        type="category"
                        dataKey="rating"
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => `${value}\u2605`}
                        width={50}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} invitations`, 'Total']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {ratingStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.rating === 5 ? CHART_COLORS.rating5 : CHART_COLORS.rating4}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Seuls les clients avec une note \u2265 4 re\u00e7oivent une invitation Trustpilot
                </p>
              </div>

              {/* Recent Events Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {intl.formatMessage({ id: 'admin.trustpilot.recent.title', defaultMessage: '\u00c9v\u00e9nements r\u00e9cents' })}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Langue
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Note
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          User ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentEvents.length > 0 ? (
                        recentEvents.map((event) => (
                          <tr key={event.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {event.timestamp.toLocaleString(intl.locale, {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                event.eventName === 'trustpilot_invite_sent'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {event.eventName === 'trustpilot_invite_sent' ? (
                                  <>
                                    <Mail size={12} />
                                    Invitation
                                  </>
                                ) : (
                                  <>
                                    <MousePointer size={12} />
                                    Clic
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {event.params?.email_language ? (
                                <span className="flex items-center gap-1.5">
                                  <Globe size={14} className="text-gray-400" />
                                  {LANGUAGE_NAMES[event.params.email_language] || event.params.email_language.toUpperCase()}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {event.params?.rating_stars ? (
                                <StarRating rating={event.params.rating_stars} size={14} />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {event.params?.user_id ? (
                                <span className="truncate max-w-[120px] block">
                                  {event.params.user_id.slice(0, 12)}...
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            Aucun \u00e9v\u00e9nement Trustpilot pour cette p\u00e9riode
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Help Section */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <Award className="text-green-600" />
                  {intl.formatMessage({ id: 'admin.trustpilot.help.title', defaultMessage: 'Comment fonctionne l\'int\u00e9gration Trustpilot ?' })}
                </h3>
                <div className="text-sm text-green-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs font-bold">1</div>
                    <p><strong>Client satisfait :</strong> Un client laisse un avis avec une note \u2265 4 \u00e9toiles sur la plateforme</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs font-bold">2</div>
                    <p><strong>Invitation automatique :</strong> Un email d'invitation Trustpilot est envoy\u00e9 via MailWizz dans sa langue pr\u00e9f\u00e9r\u00e9e</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs font-bold">3</div>
                    <p><strong>Clic track\u00e9 :</strong> Quand le client clique sur le lien, l'\u00e9v\u00e9nement est enregistr\u00e9 via le webhook MailWizz</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-xs font-bold">4</div>
                    <p><strong>Avis public :</strong> Le client laisse un avis sur <a href="https://www.trustpilot.com/review/sos-expat.com" target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-900">trustpilot.com/review/sos-expat.com</a></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTrustpilot;
