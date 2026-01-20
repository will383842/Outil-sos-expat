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

const SOURCE_LABELS: Record<EventSource | 'unknown', string> = {
  http_endpoint: 'Frontend (HTTP)',
  trigger_booking: 'Booking Request',
  trigger_user: 'User Registration',
  trigger_call: 'Call Session',
  trigger_contact: 'Contact Form',
  unknown: 'Inconnu',
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

const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ score, loading }) => {
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
        <p className="text-sm font-medium text-gray-500">Score Qualite Donnees</p>
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
              {score >= 70 ? 'Excellent' : score >= 40 ? 'Moyen' : 'A ameliorer'}
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

  // Get event type label
  const getEventTypeLabel = (type: CAPIEventType): string => {
    const labels: Record<CAPIEventType, string> = {
      Purchase: 'Achat',
      Lead: 'Lead',
      InitiateCheckout: 'Checkout',
      CompleteRegistration: 'Inscription',
      Search: 'Recherche',
      ViewContent: 'Vue contenu',
      AddToCart: 'Ajout panier',
      StartTrial: 'Essai',
      AddPaymentInfo: 'Paiement',
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
        'https://europe-west1-sos-urgently-ac307.cloudfunctions.net/testCAPIConnection'
      );
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Erreur de connexion au serveur',
        details: {
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    } finally {
      setTestLoading(false);
    }
  }, []);

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
              Reessayer
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
    name: SOURCE_LABELS[stat.source] || stat.source,
    value: stat.count,
    color: PIE_COLORS[index % PIE_COLORS.length],
  })) || [];

  const qualityData = data?.qualityMetrics ? [
    { name: 'Email', value: data.qualityMetrics.withEmail, total: data.qualityMetrics.totalEvents, icon: <Mail size={14} /> },
    { name: 'Telephone', value: data.qualityMetrics.withPhone, total: data.qualityMetrics.totalEvents, icon: <Phone size={14} /> },
    { name: 'Prenom', value: data.qualityMetrics.withFirstName, total: data.qualityMetrics.totalEvents, icon: <User size={14} /> },
    { name: 'Nom', value: data.qualityMetrics.withLastName, total: data.qualityMetrics.totalEvents, icon: <User size={14} /> },
    { name: 'Pays', value: data.qualityMetrics.withCountry, total: data.qualityMetrics.totalEvents, icon: <Globe size={14} /> },
    { name: 'Cookie _fbp', value: data.qualityMetrics.withFbp, total: data.qualityMetrics.totalEvents, icon: <Smartphone size={14} /> },
    { name: 'Cookie _fbc', value: data.qualityMetrics.withFbc, total: data.qualityMetrics.totalEvents, icon: <Smartphone size={14} /> },
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
                Meta Analytics (Pixel + CAPI)
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Suivi complet des conversions et qualite des donnees
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
                Actualiser
              </button>

              {/* Link to Events Manager */}
              <a
                href="https://business.facebook.com/events_manager2/pixel/2204016713738311/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink size={16} />
                Events Manager
              </a>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Alertes ({data.alerts.length})
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
            title="Total Evenements"
            value={formatNumber(data?.totalEvents || 0)}
            icon={<Zap size={24} className="text-blue-600" />}
            iconBgColor="bg-blue-100"
            loading={isLoading}
            subtitle={`${days} derniers jours`}
          />
          <KPICard
            title="Utilisateurs Uniques"
            value={formatNumber(data?.uniqueUsers || 0)}
            icon={<Users size={24} className="text-green-600" />}
            iconBgColor="bg-green-100"
            loading={isLoading}
            subtitle="Avec userId"
          />
          <KPICard
            title="Valeur Totale"
            value={formatCurrency(data?.totalValue || 0)}
            icon={<DollarSign size={24} className="text-red-600" />}
            iconBgColor="bg-red-100"
            loading={isLoading}
            subtitle="Achats + Leads"
          />
          <KPICard
            title="Taux Conversion"
            value={
              data?.funnel && data.funnel.length >= 2
                ? `${data.funnel[data.funnel.length - 1].conversionRate.toFixed(1)}%`
                : '0%'
            }
            icon={<TrendingUp size={24} className="text-purple-600" />}
            iconBgColor="bg-purple-100"
            loading={isLoading}
            subtitle="Checkout → Achat"
          />
          <QualityScoreCard
            score={data?.qualityMetrics?.averageScore || 0}
            loading={isLoading}
          />
        </div>

        {/* User Breakdown & Test CAPI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-purple-600" />
              Repartition Utilisateurs
            </h3>
            {isLoading ? (
              <div className="h-32 bg-gray-100 animate-pulse rounded" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">Authentifies</span>
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
                    <span className="text-sm text-gray-600">Anonymes</span>
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
                  Test Connexion CAPI
                </h3>
                <p className="text-sm text-gray-500">
                  Verifier la connexion au serveur Meta
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
                Tester
              </button>
            </div>

            <TestCAPIResult isLoading={testLoading} result={testResult} />

            {!testResult && !testLoading && (
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p>
                  Cliquez sur "Tester" pour envoyer un evenement de test au serveur Meta CAPI
                  et verifier que l'integration fonctionne correctement.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={20} className="text-yellow-500" />
            Qualite des Donnees Utilisateur
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
              Evolution des Evenements
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
                    name="Total"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary }}
                  />
                  <Line
                    type="monotone"
                    dataKey="purchases"
                    name="Achats"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: COLORS.success }}
                  />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
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
              Repartition par Type
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
                  <Tooltip formatter={(value) => [value, 'Evenements']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                Aucune donnee disponible
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
              Repartition par Source
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
                  <Tooltip formatter={(value) => [value, 'Evenements']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Aucune donnee disponible
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Funnel de Conversion
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
                              {step.conversionRate.toFixed(1)}% depuis precedent
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
            Evenements Recents
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Source</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Contenu</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Qualite</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Valeur</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Date</th>
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
                        {event.source ? SOURCE_LABELS[event.source] : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {event.userId ? (
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {event.userId.slice(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-gray-400 text-xs">Anonyme</span>
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
              Aucun evenement enregistre dans la periode selectionnee
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            A propos de cette page
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>Meta Pixel</strong> : Tracking cote navigateur, peut etre bloque par les ad-blockers.
            </p>
            <p>
              <strong>Conversions API (CAPI)</strong> : Tracking cote serveur, non bloquable, meilleure attribution.
            </p>
            <p>
              Les deux sont combines avec un <strong>event_id partage</strong> pour la deduplication automatique par Meta.
            </p>
            <p>
              <strong>Score de qualite</strong> : Plus vous fournissez de donnees utilisateur (email, telephone, etc.),
              meilleure sera l'attribution des conversions.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMetaAnalytics;
