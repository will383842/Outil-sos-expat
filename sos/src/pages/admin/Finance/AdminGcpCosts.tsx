/**
 * AdminGcpCosts - Google Cloud Platform Costs Dashboard
 *
 * Comprehensive dashboard for monitoring GCP costs with:
 * - Cost breakdown by service (Firestore, Functions, Storage, etc.)
 * - Cost breakdown by region (to identify US vs EU costs)
 * - Daily cost trends with charts
 * - Budget tracking and alerts
 * - Optimization recommendations
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import {
  Cloud,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Download,
  Calendar,
  Zap,
  Loader2,
  Globe,
  Server,
  Database,
  HardDrive,
  Wifi,
  CheckCircle,
  Info,
  ChevronRight,
  MapPin,
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
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout';
import { logError } from '../../../utils/logging';
import useGcpBillingCosts, {
  GcpServiceCost,
  GcpRegionCost,
  GcpCostAlert,
  GcpOptimizationRecommendation,
  GcpDailyCost,
} from '../../../hooks/useGcpBillingCosts';

// ============================================================================
// TYPES
// ============================================================================

type PeriodType = 7 | 30 | 90;

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_COLORS: Record<string, string> = {
  Firestore: '#FF6B35',
  'Cloud Functions': '#4285F4',
  'Cloud Storage': '#34A853',
  Networking: '#9C27B0',
  BigQuery: '#F9AB00',
  Twilio: '#F22F46',
  Other: '#607D8B',
};

const REGION_COLORS: Record<string, string> = {
  'europe-west1': '#34A853',
  'europe-west3': '#4285F4',
  'us-central1': '#EA4335',
  'us-east1': '#F9AB00',
  global: '#607D8B',
};

const PRIORITY_COLORS = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-blue-600 bg-blue-50 border-blue-200',
};

const ALERT_COLORS = {
  critical: 'bg-red-50 border-red-300 text-red-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const getServiceIcon = (serviceName: string) => {
  switch (serviceName) {
    case 'Firestore':
      return Database;
    case 'Cloud Functions':
      return Zap;
    case 'Cloud Storage':
      return HardDrive;
    case 'Networking':
      return Wifi;
    case 'Twilio':
      return Server;
    default:
      return Cloud;
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  subtitle,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-gray-600">{title}</span>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {change !== undefined && (
      <div className="flex items-center mt-2">
        {change >= 0 ? (
          <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
        )}
        <span
          className={`text-sm font-medium ${
            change >= 0 ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {formatPercent(change)}
        </span>
        <span className="text-xs text-gray-500 ml-1">vs periode prec.</span>
      </div>
    )}
    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

interface AlertCardProps {
  alert: GcpCostAlert;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const alertClass = ALERT_COLORS[alert.type];
  const AlertIcon = alert.type === 'critical' ? AlertCircle : alert.type === 'warning' ? AlertTriangle : Info;

  return (
    <div className={`rounded-lg border p-4 ${alertClass}`}>
      <div className="flex items-start">
        <AlertIcon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-medium">{alert.message}</p>
            <span className="text-xs opacity-75">{alert.service}</span>
          </div>
          <p className="text-sm mt-1 opacity-90">{alert.recommendation}</p>
          <div className="flex items-center mt-2 text-xs opacity-75">
            <span>Actuel: {formatCurrency(alert.currentCost)}</span>
            <span className="mx-2">|</span>
            <span>Seuil: {formatCurrency(alert.threshold)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RecommendationCardProps {
  recommendation: GcpOptimizationRecommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const priorityClass = PRIORITY_COLORS[recommendation.priority];

  return (
    <div className={`rounded-lg border p-4 ${priorityClass}`}>
      <div
        className="flex items-start cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium uppercase mr-2 ${
                  recommendation.priority === 'high'
                    ? 'bg-red-200 text-red-800'
                    : recommendation.priority === 'medium'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-blue-200 text-blue-800'
                }`}
              >
                {recommendation.priority}
              </span>
              <span className="text-xs opacity-75">{recommendation.category}</span>
            </div>
            <span className="text-sm font-semibold text-green-700">
              -{formatCurrency(recommendation.potentialSavings)}
            </span>
          </div>
          <p className="font-medium mt-2">{recommendation.title}</p>
          <p className="text-sm mt-1 opacity-90">{recommendation.description}</p>
        </div>
        <ChevronRight
          className={`w-5 h-5 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
      </div>
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <p className="text-sm font-medium mb-2">Implementation:</p>
          <p className="text-sm opacity-90 whitespace-pre-line">{recommendation.implementation}</p>
          {recommendation.affectedResources.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">Ressources concernees:</p>
              <div className="flex flex-wrap gap-1">
                {recommendation.affectedResources.map((resource, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-white bg-opacity-50 rounded text-xs"
                  >
                    {resource}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminGcpCosts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const intl = useIntl();
  const mountedRef = useRef<boolean>(true);

  // State
  const [periodDays, setPeriodDaysState] = useState<PeriodType>(30);

  // Hook
  const {
    data,
    isLoading,
    error,
    refresh,
    lastRefresh,
    setPeriodDays,
  } = useGcpBillingCosts({
    periodDays,
    autoRefresh: false,
  });

  // Auth check
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  // Period change handler
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriodDaysState(newPeriod);
    setPeriodDays(newPeriod);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!data) return;

    const headers = ['Date', 'Firestore', 'Functions', 'Storage', 'Networking', 'Other', 'Total'];
    const rows = data.dailyCosts.map((d) => [
      d.date,
      d.firestore.toFixed(2),
      d.functions.toFixed(2),
      d.storage.toFixed(2),
      d.networking.toFixed(2),
      d.other.toFixed(2),
      d.total.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gcp-costs-${periodDays}d-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            <p className="text-gray-600">Chargement des couts GCP...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <AdminLayout>
        <div className="px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Erreur de chargement
            </h2>
            <p className="text-red-600 mb-4">{error.message}</p>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Reessayer
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {intl.formatMessage({ id: 'admin.gcpCosts.title', defaultMessage: 'Couts Google Cloud' })}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {intl.formatMessage({
                id: 'admin.gcpCosts.subtitle',
                defaultMessage: 'Analyse detaillee des couts GCP par service, region et SKU',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            {/* Period selector */}
            <select
              value={periodDays}
              onChange={(e) => handlePeriodChange(Number(e.target.value) as PeriodType)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value={7}>7 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
            </select>

            {/* Export button */}
            <button
              onClick={handleExportCSV}
              disabled={!data}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Refresh button */}
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Last refresh info */}
        {lastRefresh && (
          <p className="text-xs text-gray-500 mb-6">
            Derniere mise a jour: {lastRefresh.toLocaleString('fr-FR')}
            {data?.dataSource && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                Source: {data.dataSource}
              </span>
            )}
          </p>
        )}

        {data && (
          <>
            {/* Alerts section */}
            {data.alerts.length > 0 && (
              <div className="mb-8 space-y-3">
                {data.alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard
                title="Cout total"
                value={formatCurrency(data.totalCost, data.currency)}
                change={data.percentChange}
                icon={DollarSign}
                color="bg-red-100 text-red-600"
              />
              <KPICard
                title="Prevision mensuelle"
                value={formatCurrency(data.monthlyForecast, data.currency)}
                icon={TrendingUp}
                color="bg-blue-100 text-blue-600"
                subtitle={`Budget: ${formatCurrency(data.budgetLimit, data.currency)}`}
              />
              <KPICard
                title="Budget utilise"
                value={`${data.budgetUsedPercent.toFixed(1)}%`}
                icon={Calendar}
                color={
                  data.budgetUsedPercent > 90
                    ? 'bg-red-100 text-red-600'
                    : data.budgetUsedPercent > 75
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-green-100 text-green-600'
                }
              />
              <KPICard
                title="Services actifs"
                value={data.costByService.length.toString()}
                icon={Server}
                color="bg-purple-100 text-purple-600"
                subtitle={`${data.costByRegion.length} regions`}
              />
            </div>

            {/* Budget progress bar */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Progression du budget mensuel</h3>
                <span className="text-sm text-gray-600">
                  {formatCurrency(data.totalCost, data.currency)} / {formatCurrency(data.budgetLimit, data.currency)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    data.budgetUsedPercent > 90
                      ? 'bg-red-500'
                      : data.budgetUsedPercent > 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(data.budgetUsedPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0%</span>
                <span className="text-yellow-600">75%</span>
                <span className="text-red-600">90%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Daily costs trend */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Evolution des couts ({data.period})
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.dailyCosts}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => `${val}EUR`}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value as number), '']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#DC2626"
                      fill="url(#colorTotal)"
                      name="Total"
                    />
                    <Line
                      type="monotone"
                      dataKey="firestore"
                      stroke={SERVICE_COLORS.Firestore}
                      dot={false}
                      name="Firestore"
                    />
                    <Line
                      type="monotone"
                      dataKey="functions"
                      stroke={SERVICE_COLORS['Cloud Functions']}
                      dot={false}
                      name="Functions"
                    />
                    <Line
                      type="monotone"
                      dataKey="storage"
                      stroke={SERVICE_COLORS['Cloud Storage']}
                      dot={false}
                      name="Storage"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cost by service pie chart */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Repartition par service
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.costByService as unknown as Array<{ [key: string]: unknown }>}
                      dataKey="cost"
                      nameKey="serviceName"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {data.costByService.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={SERVICE_COLORS[entry.serviceName] || SERVICE_COLORS.Other}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost by service and region tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Cost by service table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detail par service
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Service
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Cout
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          % Total
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Tendance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.costByService.map((service) => {
                        const Icon = getServiceIcon(service.serviceName);
                        return (
                          <tr key={service.serviceId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-3"
                                  style={{
                                    backgroundColor:
                                      SERVICE_COLORS[service.serviceName] || SERVICE_COLORS.Other,
                                  }}
                                />
                                <Icon className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  {service.serviceName}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatCurrency(service.cost)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                              {service.percentOfTotal.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span
                                className={`inline-flex items-center text-sm font-medium ${
                                  service.trend === 'up'
                                    ? 'text-red-600'
                                    : service.trend === 'down'
                                    ? 'text-green-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {service.trend === 'up' ? (
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                ) : service.trend === 'down' ? (
                                  <TrendingDown className="w-4 h-4 mr-1" />
                                ) : null}
                                {formatPercent(service.trendPercent)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cost by region table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-gray-400" />
                    Couts par region
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Region
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Cout
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          % Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Services
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.costByRegion.map((region) => {
                        const isUS = region.region.startsWith('us-');
                        return (
                          <tr
                            key={region.region}
                            className={`hover:bg-gray-50 ${isUS ? 'bg-red-50' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-3"
                                  style={{
                                    backgroundColor:
                                      REGION_COLORS[region.region] || REGION_COLORS.global,
                                  }}
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {region.region}
                                  </span>
                                  <p className="text-xs text-gray-500">{region.country}</p>
                                </div>
                                {isUS && (
                                  <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatCurrency(region.cost)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                              {region.percentOfTotal.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="flex flex-wrap gap-1">
                                {region.services.slice(0, 3).map((svc, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                                  >
                                    {svc}
                                  </span>
                                ))}
                                {region.services.length > 3 && (
                                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                    +{region.services.length - 3}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Optimization recommendations */}
            {data.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                      Recommandations d'optimisation
                    </h3>
                    <span className="text-sm text-green-600 font-medium">
                      Economie potentielle:{' '}
                      {formatCurrency(
                        data.recommendations.reduce((sum, r) => sum + r.potentialSavings, 0)
                      )}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {data.recommendations
                    .sort((a, b) => {
                      const priority = { high: 0, medium: 1, low: 2 };
                      return priority[a.priority] - priority[b.priority];
                    })
                    .map((rec) => (
                      <RecommendationCard key={rec.id} recommendation={rec} />
                    ))}
                </div>
              </div>
            )}

            {/* Top SKUs */}
            {data.topSkuCosts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Top SKUs par cout
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Service
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Usage
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Cout
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.topSkuCosts.slice(0, 10).map((sku) => (
                        <tr key={sku.skuId} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {sku.skuDescription}
                              </p>
                              <p className="text-xs text-gray-500">{sku.skuId}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sku.serviceName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                            {sku.usage.toLocaleString()} {sku.usageUnit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {formatCurrency(sku.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminGcpCosts;
