// src/pages/admin/AdminMetaAnalytics.tsx
// Dashboard Analytics Meta Pixel + CAPI

import React, { useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  Users,
  DollarSign,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Loader2,
  Zap,
  Target,
  ShoppingCart,
  Eye,
  Search,
  UserPlus,
  CreditCard,
  Play,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { useMetaAnalytics, CAPIEventType } from '../../hooks/useMetaAnalytics';

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  primary: '#DC2626',
  secondary: '#2563EB',
  success: '#16A34A',
  warning: '#D97706',
  purple: '#9333EA',
  pink: '#DB2777',
  cyan: '#0891B2',
  orange: '#EA580C',
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.pink,
  COLORS.cyan,
  COLORS.orange,
];

// Event type labels will be loaded from i18n in the component

const EVENT_TYPE_ICONS: Record<CAPIEventType, React.ReactNode> = {
  Purchase: <DollarSign size={16} />,
  Lead: <Target size={16} />,
  InitiateCheckout: <CreditCard size={16} />,
  CompleteRegistration: <UserPlus size={16} />,
  Search: <Search size={16} />,
  ViewContent: <Eye size={16} />,
  AddToCart: <ShoppingCart size={16} />,
  StartTrial: <Play size={16} />,
  AddPaymentInfo: <CreditCard size={16} />,
  Contact: <Users size={16} />,
};

// ============================================================================
// Components
// ============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  loading?: boolean;
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  iconBgColor,
  loading,
  subtitle,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
        {subtitle && !loading && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div className={`p-3 rounded-full ${iconBgColor}`}>{icon}</div>
    </div>
  </div>
);

interface TestCAPIResultProps {
  isLoading: boolean;
  result: {
    success: boolean;
    message: string;
    details?: {
      eventId?: string;
      eventsReceived?: number;
      fbtraceId?: string;
      error?: string;
    };
  } | null;
}

const TestCAPIResult: React.FC<TestCAPIResultProps> = ({ isLoading, result }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 size={16} className="animate-spin" />
        <span>Test en cours...</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div
      className={`p-4 rounded-lg ${
        result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {result.success ? (
          <CheckCircle size={20} className="text-green-600 mt-0.5" />
        ) : (
          <XCircle size={20} className="text-red-600 mt-0.5" />
        )}
        <div className="flex-1">
          <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.message}
          </p>
          {result.details && (
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              {result.details.eventId && (
                <p>Event ID: <code className="bg-gray-100 px-1 rounded">{result.details.eventId}</code></p>
              )}
              {result.details.eventsReceived !== undefined && (
                <p>Events recus: {result.details.eventsReceived}</p>
              )}
              {result.details.fbtraceId && (
                <p>Trace ID: <code className="bg-gray-100 px-1 rounded">{result.details.fbtraceId}</code></p>
              )}
              {result.details.error && (
                <p className="text-red-600">Erreur: {result.details.error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const AdminMetaAnalytics: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [days, setDays] = useState(7);
  const { data, isLoading, error, refresh } = useMetaAnalytics(days);

  // Get event type label from i18n
  const getEventTypeLabel = (type: CAPIEventType): string => {
    return intl.formatMessage({ id: `admin.metaAnalytics.eventTypes.${type}`, defaultMessage: type });
  };

  // Test CAPI state
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      eventId?: string;
      eventsReceived?: number;
      fbtraceId?: string;
      error?: string;
    };
  } | null>(null);

  // Check auth
  React.useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  // Test CAPI connection
  const handleTestCAPI = useCallback(async () => {
    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(
        'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/testCAPIConnection'
      );
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: intl.formatMessage({ id: 'admin.metaAnalytics.testCapi.connectionError' }),
        details: {
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    } finally {
      setTestLoading(false);
    }
  }, [intl]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(intl.locale).format(num);
  };

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={refresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {intl.formatMessage({ id: 'admin.metaAnalytics.error.retry' })}
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Prepare chart data
  const pieData = data?.eventsByType.map((stat, index) => ({
    name: getEventTypeLabel(stat.type),
    value: stat.count,
    color: PIE_COLORS[index % PIE_COLORS.length],
  })) || [];

  const lineData = data?.dailyStats.map((day) => ({
    date: day.label,
    total: day.total,
    purchases: day.byType.Purchase || 0,
    leads: day.byType.Lead || 0,
  })) || [];

  const funnelData = data?.funnel.map((step) => ({
    name: step.name,
    count: step.count,
    rate: step.conversionRate,
  })) || [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-7 h-7 text-blue-600" />
                {intl.formatMessage({ id: 'admin.metaAnalytics.title' })}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {intl.formatMessage({ id: 'admin.metaAnalytics.subtitle' })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                {[
                  { value: 1, labelKey: 'admin.metaAnalytics.period.24h' },
                  { value: 7, labelKey: 'admin.metaAnalytics.period.7d' },
                  { value: 30, labelKey: 'admin.metaAnalytics.period.30d' },
                  { value: 90, labelKey: 'admin.metaAnalytics.period.90d' },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setDays(period.value)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      days === period.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {intl.formatMessage({ id: period.labelKey })}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={refresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                {intl.formatMessage({ id: 'admin.metaAnalytics.refresh' })}
              </button>

              {/* Link to Events Manager */}
              <a
                href="https://business.facebook.com/events_manager"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink size={16} />
                {intl.formatMessage({ id: 'admin.metaAnalytics.eventsManager' })}
              </a>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.totalEvents' })}
            value={formatNumber(data?.totalEvents || 0)}
            icon={<Zap size={24} className="text-blue-600" />}
            iconBgColor="bg-blue-100"
            loading={isLoading}
            subtitle={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.lastDays' }, { days })}
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.uniqueUsers' })}
            value={formatNumber(data?.uniqueUsers || 0)}
            icon={<Users size={24} className="text-green-600" />}
            iconBgColor="bg-green-100"
            loading={isLoading}
            subtitle={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.withUserId' })}
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.totalValue' })}
            value={formatCurrency(data?.totalValue || 0)}
            icon={<DollarSign size={24} className="text-red-600" />}
            iconBgColor="bg-red-100"
            loading={isLoading}
            subtitle={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.purchasesLeads' })}
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.conversionRate' })}
            value={
              data?.funnel && data.funnel.length >= 2
                ? `${data.funnel[data.funnel.length - 1].conversionRate.toFixed(1)}%`
                : '0%'
            }
            icon={<TrendingUp size={24} className="text-purple-600" />}
            iconBgColor="bg-purple-100"
            loading={isLoading}
            subtitle={intl.formatMessage({ id: 'admin.metaAnalytics.kpi.checkoutPurchase' })}
          />
        </div>

        {/* Test CAPI Connection */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{intl.formatMessage({ id: 'admin.metaAnalytics.testCapi.title' })}</h2>
              <p className="text-sm text-gray-500">
                {intl.formatMessage({ id: 'admin.metaAnalytics.testCapi.subtitle' })}
              </p>
            </div>
            <button
              onClick={handleTestCAPI}
              disabled={testLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {testLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              {intl.formatMessage({ id: 'admin.metaAnalytics.testCapi.button' })}
            </button>
          </div>

          <TestCAPIResult isLoading={testLoading} result={testResult} />

          {!testResult && !testLoading && (
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p>
                {intl.formatMessage({ id: 'admin.metaAnalytics.testCapi.help' })}
              </p>
            </div>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events Over Time */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {intl.formatMessage({ id: 'admin.metaAnalytics.chart.eventsOverTime' })}
            </h3>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={intl.formatMessage({ id: 'admin.metaAnalytics.chart.total' })}
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary }}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    name={intl.formatMessage({ id: 'admin.metaAnalytics.chart.purchases' })}
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: COLORS.success }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name={intl.formatMessage({ id: 'admin.metaAnalytics.chart.leads' })}
                    stroke={COLORS.secondary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.secondary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Events by Type (Pie) */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {intl.formatMessage({ id: 'admin.metaAnalytics.chart.distributionByType' })}
            </h3>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, intl.formatMessage({ id: 'admin.metaAnalytics.chart.events' })]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                {intl.formatMessage({ id: 'admin.metaAnalytics.chart.noData' })}
              </div>
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {intl.formatMessage({ id: 'admin.metaAnalytics.funnel.title' })}
          </h3>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {funnelData.map((step, index) => {
                const maxCount = funnelData[0]?.count || 1;
                const width = (step.count / maxCount) * 100;
                const color = PIE_COLORS[index % PIE_COLORS.length];

                return (
                  <div key={step.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{step.name}</span>
                        {index > 0 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {step.rate.toFixed(1)}% {intl.formatMessage({ id: 'admin.metaAnalytics.funnel.fromPrevious' })}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatNumber(step.count)}
                      </span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(width, 5)}%`,
                          backgroundColor: color,
                        }}
                      >
                        <span className="text-xs font-medium text-white">
                          {((step.count / maxCount) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Events Table */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {intl.formatMessage({ id: 'admin.metaAnalytics.recent.title' })}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : data?.recentEvents && data.recentEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{intl.formatMessage({ id: 'admin.metaAnalytics.recent.type' })}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{intl.formatMessage({ id: 'admin.metaAnalytics.recent.user' })}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{intl.formatMessage({ id: 'admin.metaAnalytics.recent.content' })}</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">{intl.formatMessage({ id: 'admin.metaAnalytics.recent.value' })}</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">{intl.formatMessage({ id: 'admin.metaAnalytics.recent.date' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEvents.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">
                            {EVENT_TYPE_ICONS[event.eventType]}
                          </span>
                          <span className="font-medium">
                            {getEventTypeLabel(event.eventType)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {event.userId ? (
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {event.userId.slice(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-gray-400">{intl.formatMessage({ id: 'admin.metaAnalytics.recent.anonymous' })}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {event.contentName || event.contentCategory || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {event.value ? formatCurrency(event.value) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {event.trackedAt.toLocaleString(intl.locale, {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {intl.formatMessage({ id: 'admin.metaAnalytics.recent.noEvents' })}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            {intl.formatMessage({ id: 'admin.metaAnalytics.info.title' })}
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>{intl.formatMessage({ id: 'admin.metaAnalytics.info.pixel' })}</strong> : {intl.formatMessage({ id: 'admin.metaAnalytics.info.pixelDesc' })}
            </p>
            <p>
              <strong>{intl.formatMessage({ id: 'admin.metaAnalytics.info.capi' })}</strong> : {intl.formatMessage({ id: 'admin.metaAnalytics.info.capiDesc' })}
            </p>
            <p>
              {intl.formatMessage({ id: 'admin.metaAnalytics.info.dedup' })}
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMetaAnalytics;
