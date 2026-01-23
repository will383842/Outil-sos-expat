// src/pages/admin/AdminMetaAnalytics.tsx
// Dashboard Analytics Meta Pixel + CAPI - Version Complete

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
  AlertTriangle,
  AlertCircle,
  Info,
  Mail,
  Phone,
  User,
  Globe,
  Server,
  Smartphone,
  Shield,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { useMetaAnalytics, CAPIEventType, EventSource, MetaAlert } from '../../hooks/useMetaAnalytics';

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

// Source labels will be retrieved from intl in the component

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
  trend?: 'up' | 'down' | 'neutral';
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

interface QualityScoreCardProps {
  score: number;
  loading?: boolean;
}

interface QualityScoreCardTranslations {
  title: string;
  excellent: string;
  average: string;
  needsImprovement: string;
}

const QualityScoreCard: React.FC<QualityScoreCardProps & { translations: QualityScoreCardTranslations }> = ({ score, loading, translations }) => {
  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-green-600';
    if (s >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (s: number) => {
    if (s >= 70) return 'bg-green-100';
    if (s >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{translations.title}</p>
        <Star className="w-5 h-5 text-yellow-500" />
      </div>
      {loading ? (
        <div className="h-16 bg-gray-200 animate-pulse rounded" />
      ) : (
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score.toFixed(0)}%
          </div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreBg(score)} transition-all`}
                style={{ width: `${Math.min(score, 100)}%`, backgroundColor: score >= 70 ? COLORS.success : score >= 40 ? COLORS.warning : COLORS.primary }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {score >= 70 ? translations.excellent : score >= 40 ? translations.average : translations.needsImprovement}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface AlertCardProps {
  alert: MetaAlert;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const getAlertStyles = () => {
    switch (alert.type) {
      case 'error':
        return { bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle className="text-red-600" size={20} />, textColor: 'text-red-800' };
      case 'warning':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: <AlertTriangle className="text-yellow-600" size={20} />, textColor: 'text-yellow-800' };
      default:
        return { bg: 'bg-blue-50', border: 'border-blue-200', icon: <Info className="text-blue-600" size={20} />, textColor: 'text-blue-800' };
    }
  };

  const styles = getAlertStyles();

  return (
    <div className={`p-4 rounded-lg ${styles.bg} border ${styles.border}`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div className="flex-1">
          <p className={`font-medium ${styles.textColor}`}>{alert.title}</p>
          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
        </div>
      </div>
    </div>
  );
};

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

interface TestCAPIResultTranslations {
  testInProgress: string;
  eventsReceived: string;
  error: string;
}

const TestCAPIResult: React.FC<TestCAPIResultProps & { translations: TestCAPIResultTranslations }> = ({ isLoading, result, translations }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Loader2 size={16} className="animate-spin" />
        <span>{translations.testInProgress}</span>
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
                <p>{translations.eventsReceived}: {result.details.eventsReceived}</p>
              )}
              {result.details.fbtraceId && (
                <p>Trace ID: <code className="bg-gray-100 px-1 rounded">{result.details.fbtraceId}</code></p>
              )}
              {result.details.error && (
                <p className="text-red-600">{translations.error}: {result.details.error}</p>
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

  // i18n helper
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  // Get source label with i18n
  const getSourceLabel = (source: EventSource | 'unknown'): string => {
    const labelKeys: Record<EventSource | 'unknown', string> = {
      http_endpoint: 'admin.metaAnalytics.source.httpEndpoint',
      trigger_booking: 'admin.metaAnalytics.source.triggerBooking',
      trigger_user: 'admin.metaAnalytics.source.triggerUser',
      trigger_call: 'admin.metaAnalytics.source.triggerCall',
      trigger_contact: 'admin.metaAnalytics.source.triggerContact',
      unknown: 'admin.metaAnalytics.source.unknown',
    };
    return t(labelKeys[source] || labelKeys.unknown);
  };

  // Get event type label (keep simple names, mostly same in FR/EN)
  const getEventTypeLabel = (type: CAPIEventType): string => {
    const labels: Record<CAPIEventType, string> = {
      Purchase: t('admin.metaAnalytics.chart.purchases'),
      Lead: 'Lead',
      InitiateCheckout: 'Checkout',
      CompleteRegistration: t('admin.metaAnalytics.users.authenticated').split(' ')[0] || 'Registration',
      Search: t('admin.metaAnalytics.quality.email').includes('Email') ? 'Search' : 'Recherche',
      ViewContent: t('admin.metaAnalytics.chart.total').includes('Total') ? 'View Content' : 'Vue contenu',
      AddToCart: t('admin.metaAnalytics.chart.total').includes('Total') ? 'Add to Cart' : 'Ajout panier',
      StartTrial: t('admin.metaAnalytics.chart.total').includes('Total') ? 'Trial' : 'Essai',
      AddPaymentInfo: t('admin.metaAnalytics.chart.total').includes('Total') ? 'Payment' : 'Paiement',
      Contact: 'Contact',
    };
    return labels[type] || type;
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
        'https://testcapiconnection-5tfnuxa2hq-ew.a.run.app'
      );
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: t('admin.metaAnalytics.testCapi.connectionError'),
        details: {
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    } finally {
      setTestLoading(false);
    }
  }, [t]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fr-FR').format(num);
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
              {t('admin.metaAnalytics.error.retry')}
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

  const sourceData = data?.eventsBySource.map((stat, index) => ({
    name: getSourceLabel(stat.source),
    value: stat.count,
    color: PIE_COLORS[index % PIE_COLORS.length],
  })) || [];

  const qualityData = data?.qualityMetrics ? [
    { name: t('admin.metaAnalytics.quality.email'), value: data.qualityMetrics.withEmail, total: data.qualityMetrics.totalEvents, icon: <Mail size={14} /> },
    { name: t('admin.metaAnalytics.quality.phone'), value: data.qualityMetrics.withPhone, total: data.qualityMetrics.totalEvents, icon: <Phone size={14} /> },
    { name: t('admin.metaAnalytics.quality.firstName'), value: data.qualityMetrics.withFirstName, total: data.qualityMetrics.totalEvents, icon: <User size={14} /> },
    { name: t('admin.metaAnalytics.quality.lastName'), value: data.qualityMetrics.withLastName, total: data.qualityMetrics.totalEvents, icon: <User size={14} /> },
    { name: t('admin.metaAnalytics.quality.country'), value: data.qualityMetrics.withCountry, total: data.qualityMetrics.totalEvents, icon: <Globe size={14} /> },
    { name: t('admin.metaAnalytics.quality.fbpCookie'), value: data.qualityMetrics.withFbp, total: data.qualityMetrics.totalEvents, icon: <Smartphone size={14} /> },
    { name: t('admin.metaAnalytics.quality.fbcCookie'), value: data.qualityMetrics.withFbc, total: data.qualityMetrics.totalEvents, icon: <Smartphone size={14} /> },
  ] : [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-7 h-7 text-blue-600" />
                {t('admin.metaAnalytics.title')}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {t('admin.metaAnalytics.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                {[
                  { value: 1, label: '24h' },
                  { value: 7, label: '7j' },
                  { value: 30, label: '30j' },
                  { value: 90, label: '90j' },
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
                    {period.label}
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
                {t('admin.metaAnalytics.refresh')}
              </button>

              {/* Link to Events Manager */}
              <a
                href="https://business.facebook.com/events_manager2/pixel/2204016713738311/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink size={16} />
                {t('admin.metaAnalytics.eventsManager')}
              </a>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              {t('admin.metaAnalytics.alerts.title')} ({data.alerts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title={t('admin.metaAnalytics.kpi.totalEvents')}
            value={formatNumber(data?.totalEvents || 0)}
            icon={<Zap size={24} className="text-blue-600" />}
            iconBgColor="bg-blue-100"
            loading={isLoading}
            subtitle={t('admin.metaAnalytics.kpi.lastDays', { days: String(days) })}
          />
          <KPICard
            title={t('admin.metaAnalytics.kpi.uniqueUsers')}
            value={formatNumber(data?.uniqueUsers || 0)}
            icon={<Users size={24} className="text-green-600" />}
            iconBgColor="bg-green-100"
            loading={isLoading}
            subtitle={t('admin.metaAnalytics.kpi.withUserId')}
          />
          <KPICard
            title={t('admin.metaAnalytics.kpi.totalValue')}
            value={formatCurrency(data?.totalValue || 0)}
            icon={<DollarSign size={24} className="text-red-600" />}
            iconBgColor="bg-red-100"
            loading={isLoading}
            subtitle={t('admin.metaAnalytics.kpi.purchasesLeads')}
          />
          <KPICard
            title={t('admin.metaAnalytics.kpi.conversionRate')}
            value={
              data?.funnel && data.funnel.length >= 2
                ? `${data.funnel[data.funnel.length - 1].conversionRate.toFixed(1)}%`
                : '0%'
            }
            icon={<TrendingUp size={24} className="text-purple-600" />}
            iconBgColor="bg-purple-100"
            loading={isLoading}
            subtitle={t('admin.metaAnalytics.kpi.checkoutPurchase')}
          />
          <QualityScoreCard
            score={data?.qualityMetrics?.averageScore || 0}
            loading={isLoading}
            translations={{
              title: t('admin.metaAnalytics.quality.score'),
              excellent: t('admin.metaAnalytics.quality.excellent'),
              average: t('admin.metaAnalytics.quality.average'),
              needsImprovement: t('admin.metaAnalytics.quality.needsImprovement'),
            }}
          />
        </div>

        {/* User Breakdown & Test CAPI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-purple-600" />
              {t('admin.metaAnalytics.users.title')}
            </h3>
            {isLoading ? (
              <div className="h-32 bg-gray-100 animate-pulse rounded" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">{t('admin.metaAnalytics.users.authenticated')}</span>
                  </div>
                  <span className="font-semibold">
                    {formatNumber(data?.userBreakdown?.authenticated || 0)}
                    <span className="text-gray-400 ml-1">
                      ({(data?.userBreakdown?.authenticatedPercentage || 0).toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-sm text-gray-600">{t('admin.metaAnalytics.users.anonymous')}</span>
                  </div>
                  <span className="font-semibold">
                    {formatNumber(data?.userBreakdown?.anonymous || 0)}
                    <span className="text-gray-400 ml-1">
                      ({(100 - (data?.userBreakdown?.authenticatedPercentage || 0)).toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${data?.userBreakdown?.authenticatedPercentage || 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test CAPI Connection */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Server size={20} className="text-green-600" />
                  {t('admin.metaAnalytics.testCapi.title')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('admin.metaAnalytics.testCapi.subtitle')}
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
                {t('admin.metaAnalytics.testCapi.button')}
              </button>
            </div>

            <TestCAPIResult
              isLoading={testLoading}
              result={testResult}
              translations={{
                testInProgress: t('admin.metaAnalytics.testCapi.testing'),
                eventsReceived: t('admin.metaAnalytics.testCapi.eventsReceived'),
                error: t('admin.metaAnalytics.testCapi.errorLabel'),
              }}
            />

            {!testResult && !testLoading && (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p>
                  {t('admin.metaAnalytics.testCapi.help')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={20} className="text-yellow-500" />
            {t('admin.metaAnalytics.quality.title')}
          </h3>
          {isLoading ? (
            <div className="h-48 bg-gray-100 animate-pulse rounded" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {qualityData.map((metric) => {
                const percentage = metric.total > 0 ? (metric.value / metric.total) * 100 : 0;
                return (
                  <div key={metric.name} className="text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 mb-2">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#E5E7EB"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke={percentage >= 50 ? COLORS.success : percentage >= 25 ? COLORS.warning : COLORS.primary}
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${(percentage / 100) * 176} 176`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xs font-semibold">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                      {metric.icon}
                      {metric.name}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatNumber(metric.value)}/{formatNumber(metric.total)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events Over Time */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('admin.metaAnalytics.chart.eventsOverTime')}
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
                    name={t('admin.metaAnalytics.chart.total')}
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary }}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    name={t('admin.metaAnalytics.chart.purchases')}
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: COLORS.success }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name={t('admin.metaAnalytics.chart.leads')}
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
              {t('admin.metaAnalytics.chart.distributionByType')}
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
                  <Tooltip formatter={(value) => [value, t('admin.metaAnalytics.chart.events')]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                {t('admin.metaAnalytics.chart.noData')}
              </div>
            )}
          </div>
        </div>

        {/* Source Breakdown & Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Server size={20} className="text-cyan-600" />
              {t('admin.metaAnalytics.source.title')}
            </h3>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} stroke="#9CA3AF" />
                  <Tooltip formatter={(value) => [value, t('admin.metaAnalytics.chart.events')]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                {t('admin.metaAnalytics.chart.noData')}
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('admin.metaAnalytics.funnel.title')}
            </h3>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {data?.funnel.map((step, index) => {
                  const maxCount = data.funnel[0]?.count || 1;
                  const width = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                  const color = PIE_COLORS[index % PIE_COLORS.length];

                  return (
                    <div key={step.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{step.name}</span>
                          {index > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {step.conversionRate.toFixed(1)}% {t('admin.metaAnalytics.funnel.fromPrevious')}
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
                          {width > 10 && (
                            <span className="text-xs font-medium text-white">
                              {width.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Events Table */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.metaAnalytics.recent.title')}
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.metaAnalytics.recent.type')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.metaAnalytics.recent.source')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.metaAnalytics.recent.user')}</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.metaAnalytics.recent.content')}</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">{t('admin.metaAnalytics.recent.quality')}</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">{t('admin.metaAnalytics.recent.value')}</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">{t('admin.metaAnalytics.recent.date')}</th>
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
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {event.source ? getSourceLabel(event.source) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {event.userId ? (
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {event.userId.slice(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-gray-400 text-xs">{t('admin.metaAnalytics.users.anonymous')}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {event.contentName || event.contentCategory || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {event.qualityScore !== undefined ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded ${
                            event.qualityScore >= 70 ? 'bg-green-100 text-green-700' :
                            event.qualityScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {event.qualityScore}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {event.value ? formatCurrency(event.value) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 text-xs">
                        {event.trackedAt.toLocaleString('fr-FR', {
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
              {t('admin.metaAnalytics.recent.noEvents')}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            {t('admin.metaAnalytics.info.title')}
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>{t('admin.metaAnalytics.info.pixel')}</strong> : {t('admin.metaAnalytics.info.pixelDesc')}
            </p>
            <p>
              <strong>{t('admin.metaAnalytics.info.capi')}</strong> : {t('admin.metaAnalytics.info.capiDesc')}
            </p>
            <p>
              <strong>{t('admin.metaAnalytics.info.deduplication')}</strong> : {t('admin.metaAnalytics.info.deduplicationDesc')}
            </p>
            <p>
              <strong>{t('admin.metaAnalytics.info.qualityScore')}</strong> : {t('admin.metaAnalytics.info.qualityScoreDesc')}
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMetaAnalytics;
