// src/pages/admin/AdminAdsAnalytics.tsx
// Dashboard Analytics Publicitaires - Facebook Ads, Instagram, TikTok, YouTube, Google
// Attribution des conversions et ROI par source de trafic

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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  ShoppingCart,
  Calendar,
  Filter,
  RefreshCw,
  Facebook,
  Instagram,
  Youtube,
  Globe,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  PlayCircle,
  Image,
  Layers,
  Smartphone,
  Film,
  Grid,
  HelpCircle,
  Lightbulb,
  Award,
  MapPin,
  Percent,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import adAttributionService, { AdStats, CampaignStats, AdConversion, ContentTypeStats, CreativeStats, CountryStats } from '../../services/adAttributionService';
import { normalizeSourceName, getSourceColor } from '../../utils/trafficSource';
import { ContentType, CONTENT_TYPE_COLORS, parseUtmContent, getContentTypeLabel } from '../../utils/utmContentParser';

// Types
interface DailyStats {
  date: string;
  conversions: number;
  revenue: number;
  leads: number;
  purchases: number;
}

interface SummaryStats {
  totalConversions: number;
  totalRevenue: number;
  totalLeads: number;
  totalPurchases: number;
  avgOrderValue: number;
  topSource: string;
}

type Period = '7d' | '30d' | '90d';
type AttributionModel = 'firstTouch' | 'lastTouch';

// Colors for charts
const CHART_COLORS = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  google: '#4285F4',
  direct: '#9CA3AF',
  organic: '#10B981',
  email: '#F59E0B',
};

const PIE_COLORS = [
  '#1877F2', '#E4405F', '#FF0000', '#4285F4',
  '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
];

// Content type icon mapping
const ContentTypeIcon: React.FC<{ type: ContentType; size?: number; className?: string }> = ({
  type,
  size = 20,
  className = '',
}) => {
  const iconProps = { size, className };

  switch (type) {
    case 'video':
      return <PlayCircle {...iconProps} style={{ color: CONTENT_TYPE_COLORS.video }} />;
    case 'image':
      return <Image {...iconProps} style={{ color: CONTENT_TYPE_COLORS.image }} />;
    case 'carousel':
      return <Layers {...iconProps} style={{ color: CONTENT_TYPE_COLORS.carousel }} />;
    case 'story':
      return <Smartphone {...iconProps} style={{ color: CONTENT_TYPE_COLORS.story }} />;
    case 'reel':
      return <Film {...iconProps} style={{ color: CONTENT_TYPE_COLORS.reel }} />;
    case 'collection':
      return <Grid {...iconProps} style={{ color: CONTENT_TYPE_COLORS.collection }} />;
    default:
      return <HelpCircle {...iconProps} style={{ color: CONTENT_TYPE_COLORS.unknown }} />;
  }
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

const formatCurrency = (value: number, locale: string): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string, locale: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
};

// Get country flag emoji from ISO code
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode === 'unknown') return '🌍';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

// Format percentage
const formatPercent = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

// Calculate CPA (Cost Per Acquisition) - for display purposes we show revenue per conversion
const calculateCPA = (revenue: number, conversions: number): number => {
  if (conversions === 0) return 0;
  return revenue / conversions;
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
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

// Source Icon Component
const SourceIcon: React.FC<{ source: string; size?: number }> = ({ source, size = 20 }) => {
  const sourceLower = source.toLowerCase();

  switch (sourceLower) {
    case 'facebook':
      return <Facebook size={size} className="text-[#1877F2]" />;
    case 'instagram':
      return <Instagram size={size} className="text-[#E4405F]" />;
    case 'youtube':
      return <Youtube size={size} className="text-[#FF0000]" />;
    case 'google':
      return <Globe size={size} className="text-[#4285F4]" />;
    case 'tiktok':
      return <span className="text-lg">📱</span>;
    default:
      return <Globe size={size} className="text-gray-400" />;
  }
};

// Main Component
const AdminAdsAnalytics: React.FC = () => {
  const intl = useIntl();

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [attribution, setAttribution] = useState<AttributionModel>('lastTouch');

  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [sourceStats, setSourceStats] = useState<AdStats[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [recentConversions, setRecentConversions] = useState<AdConversion[]>([]);

  // Content Type Analytics states
  const [contentTypeStats, setContentTypeStats] = useState<ContentTypeStats[]>([]);
  const [topCreatives, setTopCreatives] = useState<CreativeStats[]>([]);
  const [topCreativesByRevenue, setTopCreativesByRevenue] = useState<CreativeStats[]>([]);
  const [contentTypeInsights, setContentTypeInsights] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'sources' | 'contentTypes'>('sources');

  // Country Analytics states
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const { start, end } = getDateRange(period);

      // Fetch all data in parallel (including content type analytics and country analytics)
      const [
        summaryData,
        sourceData,
        campaignData,
        dailyData,
        recentData,
        contentTypeData,
        topCreativesData,
        topCreativesByRevenueData,
        comparisonData,
        countryData,
      ] = await Promise.all([
        adAttributionService.getSummary(start, end),
        adAttributionService.getStatsBySource(start, end, attribution),
        adAttributionService.getStatsByCampaign(start, end, attribution),
        adAttributionService.getDailyStats(start, end),
        adAttributionService.getRecentConversions(20),
        adAttributionService.getStatsByContentType(start, end, attribution),
        adAttributionService.getTopCreatives(start, end, attribution, 10),
        adAttributionService.getTopCreativesByRevenue(start, end, attribution, 10),
        adAttributionService.getContentTypeComparison(start, end),
        adAttributionService.getStatsByCountry(start, end),
      ]);

      setSummary(summaryData);
      setSourceStats(sourceData);
      setCampaignStats(campaignData);
      setDailyStats(dailyData);
      setRecentConversions(recentData);
      setContentTypeStats(contentTypeData);
      setTopCreatives(topCreativesData);
      setTopCreativesByRevenue(topCreativesByRevenueData);
      setContentTypeInsights(comparisonData.insights);
      setCountryStats(countryData);

    } catch (error) {
      console.error('[AdminAdsAnalytics] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, attribution]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Prepare chart data
  const pieData = sourceStats.map((stat, index) => ({
    name: stat.sourceName,
    value: stat.conversions,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  const revenueBySource = sourceStats
    .filter(s => s.revenue > 0)
    .map(stat => ({
      name: stat.sourceName,
      revenue: stat.revenue,
      fill: getSourceColor(stat.source),
    }));

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="text-blue-600" />
                  {intl.formatMessage({ id: 'admin.adsAnalytics.title' })}
                </h1>
                <p className="text-gray-600 mt-1">
                  {intl.formatMessage({ id: 'admin.adsAnalytics.subtitle' })}
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
                      {p === '7d' ? intl.formatMessage({ id: 'admin.adsAnalytics.period.7d' }) : p === '30d' ? intl.formatMessage({ id: 'admin.adsAnalytics.period.30d' }) : intl.formatMessage({ id: 'admin.adsAnalytics.period.90d' })}
                    </button>
                  ))}
                </div>

                {/* Attribution Model */}
                <select
                  value={attribution}
                  onChange={(e) => setAttribution(e.target.value as AttributionModel)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lastTouch">Last-Touch</option>
                  <option value="firstTouch">First-Touch</option>
                </select>

                {/* Refresh */}
                <Button
                  onClick={loadData}
                  variant="outline"
                  className="border-gray-300"
                  loading={isLoading}
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title={intl.formatMessage({ id: 'admin.adsAnalytics.kpi.totalConversions' })}
                  value={summary?.totalConversions || 0}
                  icon={<Target size={24} className="text-white" />}
                  color="bg-blue-600"
                  subtitle={`${intl.formatMessage({ id: 'admin.adsAnalytics.kpi.topSource' })}: ${summary?.topSource || 'N/A'}`}
                />
                <KPICard
                  title={intl.formatMessage({ id: 'admin.adsAnalytics.kpi.generatedRevenue' })}
                  value={formatCurrency(summary?.totalRevenue || 0, intl.locale)}
                  icon={<DollarSign size={24} className="text-white" />}
                  color="bg-green-600"
                  subtitle={`${summary?.totalPurchases || 0} ${intl.formatMessage({ id: 'admin.adsAnalytics.kpi.purchases' })}`}
                />
                <KPICard
                  title={intl.formatMessage({ id: 'admin.adsAnalytics.kpi.generatedLeads' })}
                  value={summary?.totalLeads || 0}
                  icon={<Users size={24} className="text-white" />}
                  color="bg-purple-600"
                  subtitle={intl.formatMessage({ id: 'admin.adsAnalytics.kpi.consultationRequests' })}
                />
                <KPICard
                  title={intl.formatMessage({ id: 'admin.adsAnalytics.kpi.avgBasket' })}
                  value={formatCurrency(summary?.avgOrderValue || 0, intl.locale)}
                  icon={<ShoppingCart size={24} className="text-white" />}
                  color="bg-orange-500"
                  subtitle={intl.formatMessage({ id: 'admin.adsAnalytics.kpi.perTransaction' })}
                />
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversions Over Time */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {intl.formatMessage({ id: 'admin.adsAnalytics.chart.conversionsEvolution' })}
                  </h3>
                  <div className="h-80">
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
                          dataKey="conversions"
                          name={intl.formatMessage({ id: 'admin.adsAnalytics.chart.conversions' })}
                          stroke="#2563EB"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="leads"
                          name={intl.formatMessage({ id: 'admin.adsAnalytics.chart.leads' })}
                          stroke="#9333EA"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="purchases"
                          name={intl.formatMessage({ id: 'admin.adsAnalytics.chart.purchases' })}
                          stroke="#16A34A"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Conversions by Source (Pie) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {intl.formatMessage({ id: 'admin.adsAnalytics.chart.distributionBySource' })}
                  </h3>
                  <div className="h-80">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value ?? 0} conversions`, 'Total']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Revenue by Source Chart */}
              {revenueBySource.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {intl.formatMessage({ id: 'admin.adsAnalytics.chart.revenueBySource' })}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueBySource} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          type="number"
                          tickFormatter={(value) => formatCurrency(value, intl.locale)}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#9CA3AF"
                          fontSize={12}
                          width={100}
                        />
                        <Tooltip
                          formatter={(value) => [formatCurrency(Number(value ?? 0), intl.locale), intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                          {revenueBySource.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ============ CONTENT TYPE ANALYTICS SECTION ============ */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Film className="text-purple-600" />
                      {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.title', defaultMessage: 'Performance par Type de Contenu' })}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.subtitle', defaultMessage: 'Analysez les performances selon le format publicitaire (Video, Image, Carousel, Story, Reel, Collection)' })}
                    </p>
                  </div>
                </div>

                {/* Content Type Insights */}
                {contentTypeInsights.length > 0 && (
                  <div className="mb-6 p-4 bg-white rounded-lg border border-purple-100">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="text-yellow-500 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.insights', defaultMessage: 'Insights' })}
                        </h4>
                        <ul className="space-y-1">
                          {contentTypeInsights.map((insight, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Type Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Content Type Distribution (Pie) */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.distribution', defaultMessage: 'Distribution par Format' })}
                    </h3>
                    <div className="h-64">
                      {contentTypeStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={contentTypeStats.map(stat => ({
                                name: stat.label,
                                value: stat.conversions,
                                color: CONTENT_TYPE_COLORS[stat.contentType],
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            >
                              {contentTypeStats.map((stat, index) => (
                                <Cell key={`cell-${index}`} fill={CONTENT_TYPE_COLORS[stat.contentType]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [`${value ?? 0} conversions`, 'Total']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Type Revenue Bar Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.revenueByFormat', defaultMessage: 'Revenus par Format' })}
                    </h3>
                    <div className="h-64">
                      {contentTypeStats.filter(s => s.revenue > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={contentTypeStats.filter(s => s.revenue > 0)}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis
                              type="number"
                              tickFormatter={(value) => formatCurrency(value, intl.locale)}
                              stroke="#9CA3AF"
                              fontSize={12}
                            />
                            <YAxis
                              type="category"
                              dataKey="label"
                              stroke="#9CA3AF"
                              fontSize={12}
                              width={100}
                            />
                            <Tooltip
                              formatter={(value) => [formatCurrency(Number(value ?? 0), intl.locale), 'Revenus']}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                              {contentTypeStats.map((stat, index) => (
                                <Cell key={`cell-${index}`} fill={CONTENT_TYPE_COLORS[stat.contentType]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Type Stats Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.breakdown', defaultMessage: 'Breakdown Video vs Image vs Carousel' })}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.format', defaultMessage: 'Format' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.conv' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.chart.leads' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.chart.purchases' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.kpi.avgBasket', defaultMessage: 'AOV' })}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {contentTypeStats.length > 0 ? (
                          contentTypeStats.map((stat) => (
                            <tr key={stat.contentType} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <ContentTypeIcon type={stat.contentType} size={24} />
                                  <div>
                                    <span className="font-medium text-gray-900">
                                      {getContentTypeLabel(stat.contentType, 'en')}
                                    </span>
                                    {stat.topVariants.length > 0 && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        Top: {stat.topVariants[0]?.variant}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900 font-medium">
                                {stat.conversions}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {stat.leads}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {stat.purchases}
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-gray-900">
                                {formatCurrency(stat.revenue, intl.locale)}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {stat.avgOrderValue > 0 ? formatCurrency(stat.avgOrderValue, intl.locale) : '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Performing Creatives */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Award className="text-yellow-500" size={20} />
                      {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.topCreatives', defaultMessage: 'Top Performing Creatives' })}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.creative', defaultMessage: 'Creative (utm_content)' })}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.format', defaultMessage: 'Format' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.conv' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {topCreatives.length > 0 ? (
                          topCreatives.map((creative, index) => (
                            <tr key={creative.utmContent} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                  index === 1 ? 'bg-gray-100 text-gray-800' :
                                  index === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-50 text-gray-600'
                                }`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                    {creative.utmContent}
                                  </code>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {creative.label}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <ContentTypeIcon type={creative.contentType} size={18} />
                                  <span className="text-sm text-gray-700">
                                    {getContentTypeLabel(creative.contentType, 'en')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-gray-900">
                                {creative.conversions}
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-gray-900">
                                {formatCurrency(creative.revenue, intl.locale)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.noCreatives', defaultMessage: 'Aucun creative avec utm_content trouv\u00e9' })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* ============ END CONTENT TYPE ANALYTICS SECTION ============ */}

              {/* ============ CONTENT TYPE BREAKDOWN SECTION ============ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="text-blue-600" size={20} />
                    {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.breakdownTitle', defaultMessage: 'Breakdown par Type de Contenu' })}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.breakdownDesc', defaultMessage: 'Repartition des performances par format publicitaire' })}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  {/* Content Type Distribution Pie Chart */}
                  <div className="h-72">
                    {contentTypeStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={contentTypeStats.map(stat => ({
                              name: getContentTypeLabel(stat.contentType, 'en'),
                              value: stat.conversions,
                              color: CONTENT_TYPE_COLORS[stat.contentType],
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {contentTypeStats.map((stat, index) => (
                              <Cell key={`cell-${index}`} fill={CONTENT_TYPE_COLORS[stat.contentType]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value ?? 0} conversions`, 'Total']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                      </div>
                    )}
                  </div>

                  {/* Content Type Table with CPA */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.type', defaultMessage: 'Type' })}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.conv' })}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })}
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.cpa', defaultMessage: 'Rev/Conv' })}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {contentTypeStats.length > 0 ? (
                          contentTypeStats.map((stat) => (
                            <tr key={stat.contentType} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <ContentTypeIcon type={stat.contentType} size={20} />
                                  <span className="font-medium text-gray-900">
                                    {getContentTypeLabel(stat.contentType, 'en')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900 font-medium">
                                {stat.conversions}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                {formatCurrency(stat.revenue, intl.locale)}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {stat.conversions > 0 ? formatCurrency(calculateCPA(stat.revenue, stat.conversions), intl.locale) : '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* ============ END CONTENT TYPE BREAKDOWN SECTION ============ */}

              {/* ============ TOP CREATIVES BY REVENUE SECTION ============ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="text-yellow-500" size={20} />
                    {intl.formatMessage({ id: 'admin.adsAnalytics.topCreatives.title', defaultMessage: 'Top 10 Creatives par Revenue' })}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {intl.formatMessage({ id: 'admin.adsAnalytics.topCreatives.desc', defaultMessage: 'Les meilleures creatives (utm_content) classees par chiffre d\'affaires' })}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.topCreatives.creative', defaultMessage: 'Creative (utm_content)' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.contentType.type', defaultMessage: 'Type' })}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.table.conv' })}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.topCreatives.convRate', defaultMessage: 'Conv. Rate' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {topCreativesByRevenue.length > 0 ? (
                        topCreativesByRevenue.map((creative, index) => {
                          const totalConversions = topCreativesByRevenue.reduce((sum, c) => sum + c.conversions, 0);
                          return (
                            <tr key={creative.utmContent} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-50 text-gray-600'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <div>
                                    <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">
                                      {creative.utmContent}
                                    </code>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {creative.label}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <ContentTypeIcon type={creative.contentType} size={18} />
                                  <span className="text-sm text-gray-700">
                                    {getContentTypeLabel(creative.contentType, 'en')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-gray-900">
                                {creative.conversions}
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-green-600">
                                {formatCurrency(creative.revenue, intl.locale)}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                <div className="flex items-center justify-end gap-1">
                                  <Percent size={14} className="text-gray-400" />
                                  {formatPercent(creative.conversions, totalConversions)}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.topCreatives.noData', defaultMessage: 'Aucun creative avec utm_content trouve' })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* ============ END TOP CREATIVES BY REVENUE SECTION ============ */}

              {/* ============ COUNTRY ANALYTICS SECTION ============ */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="text-green-600" />
                      {intl.formatMessage({ id: 'admin.adsAnalytics.country.title', defaultMessage: 'Analytics par Pays' })}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.country.subtitle', defaultMessage: 'Top 10 pays par conversions et revenus' })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Country Revenue Bar Chart */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.country.revenueByCountry', defaultMessage: 'Revenus par Pays' })}
                    </h3>
                    <div className="h-64">
                      {countryStats.filter(s => s.revenue > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={countryStats.filter(s => s.revenue > 0).slice(0, 10)}
                            layout="vertical"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis
                              type="number"
                              tickFormatter={(value) => formatCurrency(value, intl.locale)}
                              stroke="#9CA3AF"
                              fontSize={12}
                            />
                            <YAxis
                              type="category"
                              dataKey="countryName"
                              stroke="#9CA3AF"
                              fontSize={12}
                              width={100}
                              tickFormatter={(value) => `${getCountryFlag(countryStats.find(c => c.countryName === value)?.country || '')} ${value}`}
                            />
                            <Tooltip
                              formatter={(value) => [formatCurrency(Number(value ?? 0), intl.locale), intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })]}
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Country Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {intl.formatMessage({ id: 'admin.adsAnalytics.country.topCountries', defaultMessage: 'Top 10 Pays' })}
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.country.country', defaultMessage: 'Pays' })}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.table.conv' })}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.kpi.avgBasket' })}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {countryStats.length > 0 ? (
                            countryStats.slice(0, 10).map((stat, index) => (
                              <tr key={stat.country} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{getCountryFlag(stat.country)}</span>
                                    <span className="font-medium text-gray-900">
                                      {stat.countryName}
                                    </span>
                                    {index === 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        #1
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                                  {stat.conversions}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">
                                  {formatCurrency(stat.revenue, intl.locale)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-600">
                                  {stat.avgOrderValue > 0 ? formatCurrency(stat.avgOrderValue, intl.locale) : '-'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                {intl.formatMessage({ id: 'admin.adsAnalytics.country.noData', defaultMessage: 'Aucune donnee pays disponible' })}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              {/* ============ END COUNTRY ANALYTICS SECTION ============ */}

              {/* Stats Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stats by Source */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.table.performanceBySource' })}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.source' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.conv' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.chart.leads' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sourceStats.length > 0 ? (
                          sourceStats.map((stat) => (
                            <tr key={stat.source} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <SourceIcon source={stat.source} size={18} />
                                  <span className="font-medium text-gray-900">
                                    {stat.sourceName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900">
                                {stat.conversions}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {stat.leads}
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-gray-900">
                                {formatCurrency(stat.revenue, intl.locale)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.chart.noData' })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Stats by Campaign */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.adsAnalytics.table.performanceByCampaign' })}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.campaign' })}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.source' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.conv' })}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.table.revenue' })}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {campaignStats.length > 0 ? (
                          campaignStats.slice(0, 10).map((stat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-gray-900 truncate max-w-[150px] block">
                                  {stat.campaign}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                  {normalizeSourceName(stat.source)} / {stat.medium}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-900">
                                {stat.conversions}
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-gray-900">
                                {formatCurrency(stat.revenue, intl.locale)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                              {intl.formatMessage({ id: 'admin.adsAnalytics.table.noCampaign' })}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Conversions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {intl.formatMessage({ id: 'admin.adsAnalytics.recent.title' })}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.recent.date' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.recent.type' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.table.source' })}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.recent.campaign' })}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'admin.adsAnalytics.recent.value' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentConversions.length > 0 ? (
                        recentConversions.map((conv) => {
                          const source = conv.trafficSource?.lastTouch?.utm_source || 'direct';
                          const campaign = conv.trafficSource?.lastTouch?.utm_campaign;

                          return (
                            <tr key={conv.conversionId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {conv.timestamp?.toLocaleString(intl.locale, {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }) || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  conv.conversionType === 'purchase'
                                    ? 'bg-green-100 text-green-800'
                                    : conv.conversionType === 'lead'
                                    ? 'bg-purple-100 text-purple-800'
                                    : conv.conversionType === 'registration'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {conv.conversionType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <SourceIcon source={source} size={16} />
                                  <span className="text-sm text-gray-900">
                                    {normalizeSourceName(source)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-[150px] truncate">
                                {campaign || '-'}
                              </td>
                              <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-gray-900">
                                {conv.value ? formatCurrency(conv.value, intl.locale) : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            {intl.formatMessage({ id: 'admin.adsAnalytics.recent.noConversions' })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {intl.formatMessage({ id: 'admin.adsAnalytics.help.title' })}
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>{intl.formatMessage({ id: 'admin.adsAnalytics.help.firstTouchLabel' })}</strong> {intl.formatMessage({ id: 'admin.adsAnalytics.help.firstTouchDesc' })}
                  </p>
                  <p>
                    <strong>{intl.formatMessage({ id: 'admin.adsAnalytics.help.lastTouchLabel' })}</strong> {intl.formatMessage({ id: 'admin.adsAnalytics.help.lastTouchDesc' })}
                  </p>
                  <p>
                    <strong>{intl.formatMessage({ id: 'admin.adsAnalytics.help.trackingLabel' })}</strong> {intl.formatMessage({ id: 'admin.adsAnalytics.help.trackingDesc' })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAdsAnalytics;
