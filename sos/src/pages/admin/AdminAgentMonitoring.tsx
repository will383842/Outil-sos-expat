/**
 * Agent Monitoring Dashboard
 *
 * Dashboard de monitoring des agents IA avec:
 * - Vue d'ensemble de la santé du système
 * - Métriques par agent (error rate, temps de réponse)
 * - Alertes actives
 * - Graphiques de tendance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Cpu,
  Zap,
  Server,
  XCircle
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { useIntl } from 'react-intl';

// Types
interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  agentType: 'SUPERVISOR' | 'DOMAIN' | 'SPECIALIZED';
  status: 'IDLE' | 'PROCESSING' | 'ERROR' | 'OFFLINE';
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  tasks: {
    total24h: number;
    totalHour: number;
    completed: number;
    failed: number;
    inProgress: number;
    pending: number;
  };
  successRate: number;
  errorRate: number;
  lastTaskAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  trend: {
    errorRateChange: number;
    responseTimeChange: number;
    volumeChange: number;
  };
}

interface AgentMetricsSummary {
  timestamp: string;
  period: '1h' | '24h' | '7d';
  global: {
    totalAgents: number;
    activeAgents: number;
    healthyAgents: number;
    degradedAgents: number;
    errorAgents: number;
    totalTasks24h: number;
    globalSuccessRate: number;
    globalErrorRate: number;
    avgResponseTime: number;
  };
  agents: AgentPerformanceMetrics[];
  topErrors: Array<{
    agentId: string;
    errorCode: string;
    message: string;
    count: number;
    lastOccurrence: string;
  }>;
  alerts: Array<{
    level: 'warning' | 'critical';
    agentId: string;
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }>;
}

// Couleurs
const COLORS = {
  healthy: '#10B981',
  degraded: '#F59E0B',
  error: '#EF4444',
  offline: '#6B7280',
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  background: '#1F2937'
};

const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

// Composant principal
const AdminAgentMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const intl = useIntl();

  const [metrics, setMetrics] = useState<AgentMetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'1h' | '24h' | '7d'>('24h');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const functions = getFunctions(undefined, 'europe-west1');

  // Auth guard
  useEffect(() => {
    if (!currentUser || (currentUser as any).role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const getAgentMetrics = httpsCallable<{ period: string }, AgentMetricsSummary>(
        functions,
        'getAgentMetrics'
      );
      const result = await getAgentMetrics({ period });
      setMetrics(result.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching agent metrics:', err);
      setError('Erreur lors du chargement des métriques');
    } finally {
      setLoading(false);
    }
  }, [functions, period]);

  // Chargement initial uniquement (bouton manuel pour actualiser)
  // ÉCONOMIE: Suppression du setInterval automatique (30s)
  // Avant: 2,880 requêtes/jour - Après: ~50-100 requêtes/jour (manuel)
  // Économie estimée: ~100€/mois sur Firestore
  useEffect(() => {
    fetchMetrics();
    // NOTE: Le rafraîchissement automatique a été SUPPRIMÉ pour économiser les coûts Firestore
    // L'admin peut utiliser le bouton "Actualiser" manuellement quand nécessaire
  }, [fetchMetrics]);

  // Helper pour formater les durées
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  // Helper pour l'icône de tendance
  const TrendIcon: React.FC<{ value: number; inverse?: boolean }> = ({ value, inverse = false }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;

    if (isPositive) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (isNegative) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  // Helper pour le badge de statut
  const StatusBadge: React.FC<{ status: AgentPerformanceMetrics['status'] }> = ({ status }) => {
    const config = {
      IDLE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Idle' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: Activity, label: 'Processing' },
      ERROR: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Error' },
      OFFLINE: { color: 'bg-gray-100 text-gray-800', icon: Server, label: 'Offline' }
    };
    const { color, icon: Icon, label } = config[status];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </span>
    );
  };

  if (loading && !metrics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">{intl.formatMessage({ id: 'admin.common.loading', defaultMessage: 'Chargement...' })}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !metrics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {intl.formatMessage({ id: 'admin.common.retry', defaultMessage: 'Réessayer' })}
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const healthData = metrics ? [
    { name: 'Healthy', value: metrics.global.healthyAgents, color: COLORS.healthy },
    { name: 'Degraded', value: metrics.global.degradedAgents, color: COLORS.degraded },
    { name: 'Error', value: metrics.global.errorAgents, color: COLORS.error },
    { name: 'Offline', value: metrics.global.totalAgents - metrics.global.activeAgents, color: COLORS.offline }
  ] : [];

  // Données pour le graphique des temps de réponse
  const responseTimeData = metrics?.agents
    .filter(a => a.responseTime.avg > 0)
    .map(a => ({
      name: a.agentId,
      p50: Math.round(a.responseTime.p50 / 1000 * 10) / 10,
      p95: Math.round(a.responseTime.p95 / 1000 * 10) / 10,
      p99: Math.round(a.responseTime.p99 / 1000 * 10) / 10
    }))
    .slice(0, 10) || [];

  // Données pour le graphique des error rates
  const errorRateData = metrics?.agents
    .filter(a => a.tasks.total24h > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .map(a => ({
      name: a.agentId,
      errorRate: a.errorRate,
      successRate: a.successRate
    }))
    .slice(0, 10) || [];

  return (
    <AdminLayout>
      <ErrorBoundary>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {intl.formatMessage({ id: 'admin.agentMonitoring.title', defaultMessage: 'Agent Monitoring Dashboard' })}
                </h1>
                <p className="text-gray-600 mt-1">
                  {intl.formatMessage(
                    { id: 'admin.agentMonitoring.subtitle', defaultMessage: 'Surveillance en temps réel des {count} agents IA' },
                    { count: metrics?.global.totalAgents || 0 }
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Sélecteur de période */}
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as '1h' | '24h' | '7d')}
                  className="px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="1h">{intl.formatMessage({ id: 'admin.agentMonitoring.lastHour', defaultMessage: 'Dernière heure' })}</option>
                  <option value="24h">{intl.formatMessage({ id: 'admin.agentMonitoring.last24h', defaultMessage: '24 heures' })}</option>
                  <option value="7d">{intl.formatMessage({ id: 'admin.agentMonitoring.last7d', defaultMessage: '7 jours' })}</option>
                </select>

                {/* Bouton refresh */}
                <button
                  onClick={fetchMetrics}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {intl.formatMessage({ id: 'admin.common.refresh', defaultMessage: 'Actualiser' })}
                </button>
              </div>
            </div>

            {lastRefresh && (
              <p className="text-sm text-gray-500 mt-2">
                {intl.formatMessage(
                  { id: 'admin.agentMonitoring.lastUpdate', defaultMessage: 'Dernière mise à jour: {time}' },
                  { time: lastRefresh.toLocaleTimeString() }
                )}
              </p>
            )}
          </div>

          {/* Alertes critiques */}
          {metrics && metrics.alerts.filter(a => a.level === 'critical').length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800">
                  {intl.formatMessage({ id: 'admin.agentMonitoring.criticalAlerts', defaultMessage: 'Alertes Critiques' })}
                </h3>
              </div>
              <div className="space-y-2">
                {metrics.alerts
                  .filter(a => a.level === 'critical')
                  .map((alert, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-red-700">
                        <strong>{alert.agentId}</strong>: {alert.message}
                      </span>
                      <span className="text-red-600 font-mono">
                        {alert.value.toFixed(1)} / {alert.threshold}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* KPIs globaux */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Agents actifs */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'admin.agentMonitoring.activeAgents', defaultMessage: 'Agents Actifs' })}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics?.global.activeAgents || 0}
                    <span className="text-lg text-gray-500">/{metrics?.global.totalAgents || 0}</span>
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Cpu className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Taux de succès */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'admin.agentMonitoring.successRate', defaultMessage: 'Taux de Succès' })}
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {metrics?.global.globalSuccessRate || 0}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Taux d'erreur */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'admin.agentMonitoring.errorRate', defaultMessage: "Taux d'Erreur" })}
                  </p>
                  <p className={`text-3xl font-bold ${
                    (metrics?.global.globalErrorRate || 0) > 5 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {metrics?.global.globalErrorRate || 0}%
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  (metrics?.global.globalErrorRate || 0) > 5 ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <AlertCircle className={`w-6 h-6 ${
                    (metrics?.global.globalErrorRate || 0) > 5 ? 'text-red-600' : 'text-gray-600'
                  }`} />
                </div>
              </div>
            </div>

            {/* Temps de réponse moyen */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'admin.agentMonitoring.avgResponseTime', defaultMessage: 'Temps Réponse Moyen' })}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatDuration(metrics?.global.avgResponseTime || 0)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Santé des agents (Pie Chart) */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Santé des Agents</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={healthData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
              >
                {healthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Temps de réponse par agent */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Temps de Réponse (secondes)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="p50" name="P50" fill={COLORS.healthy} />
              <Bar dataKey="p95" name="P95" fill={COLORS.degraded} />
              <Bar dataKey="p99" name="P99" fill={COLORS.error} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taux d'erreur par agent */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Taux d'Erreur par Agent (%)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={errorRateData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={100} fontSize={10} />
              <Tooltip />
              <Legend />
              <Bar dataKey="successRate" name="Succès" stackId="a" fill={COLORS.healthy} />
              <Bar dataKey="errorRate" name="Erreur" stackId="a" fill={COLORS.error} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Erreurs */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Top Erreurs</h3>
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {metrics?.topErrors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune erreur récente</p>
            ) : (
              metrics?.topErrors.map((err, i) => (
                <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{err.agentId}</span>
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                        {err.errorCode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate">{err.message}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-600">{err.count}</span>
                    <p className="text-xs text-gray-500">occurrences</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Liste détaillée des agents */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Détail par Agent</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Agent</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Statut</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tasks (24h)</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Succès</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Erreur</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">P95</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.agents.map((agent) => (
                <tr
                  key={agent.agentId}
                  className={`border-b hover:bg-gray-50 cursor-pointer ${
                    selectedAgent === agent.agentId ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedAgent(
                    selectedAgent === agent.agentId ? null : agent.agentId
                  )}
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{agent.agentName}</p>
                      <p className="text-xs text-gray-500">{agent.agentId}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      agent.agentType === 'SUPERVISOR' ? 'bg-purple-100 text-purple-700' :
                      agent.agentType === 'DOMAIN' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {agent.agentType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium">{agent.tasks.total24h}</span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({agent.tasks.inProgress} en cours)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${
                      agent.successRate >= 95 ? 'text-green-600' :
                      agent.successRate >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {agent.successRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${
                      agent.errorRate === 0 ? 'text-green-600' :
                      agent.errorRate < 5 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {agent.errorRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium">
                      {formatDuration(agent.responseTime.p95)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <TrendIcon value={agent.trend.errorRateChange} inverse />
                      <span className="text-xs text-gray-500">
                        {agent.trend.errorRateChange > 0 ? '+' : ''}
                        {agent.trend.errorRateChange}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Détails de l'agent sélectionné */}
        {selectedAgent && metrics && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            {(() => {
              const agent = metrics.agents.find(a => a.agentId === selectedAgent);
              if (!agent) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Métriques de Performance</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">P50:</dt>
                        <dd className="font-medium">{formatDuration(agent.responseTime.p50)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">P95:</dt>
                        <dd className="font-medium">{formatDuration(agent.responseTime.p95)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">P99:</dt>
                        <dd className="font-medium">{formatDuration(agent.responseTime.p99)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Moyenne:</dt>
                        <dd className="font-medium">{formatDuration(agent.responseTime.avg)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Distribution des Tasks</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Complétées:</dt>
                        <dd className="font-medium text-green-600">{agent.tasks.completed}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">En cours:</dt>
                        <dd className="font-medium text-blue-600">{agent.tasks.inProgress}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">En attente:</dt>
                        <dd className="font-medium text-yellow-600">{agent.tasks.pending}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Échouées:</dt>
                        <dd className="font-medium text-red-600">{agent.tasks.failed}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Dernière Activité</h4>
                    <dl className="space-y-1 text-sm">
                      <div>
                        <dt className="text-gray-500">Dernière task:</dt>
                        <dd className="font-medium">
                          {agent.lastTaskAt
                            ? new Date(agent.lastTaskAt).toLocaleString()
                            : 'N/A'}
                        </dd>
                      </div>
                      {agent.lastError && (
                        <div className="mt-2">
                          <dt className="text-gray-500">Dernière erreur:</dt>
                          <dd className="font-medium text-red-600 text-xs mt-1">
                            {agent.lastError}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Alertes Warning */}
      {metrics && metrics.alerts.filter(a => a.level === 'warning').length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">
              {intl.formatMessage({ id: 'admin.agentMonitoring.warnings', defaultMessage: 'Avertissements' })}
            </h3>
          </div>
          <div className="space-y-2">
            {metrics.alerts
              .filter(a => a.level === 'warning')
              .map((alert, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-yellow-700">
                    <strong>{alert.agentId}</strong>: {alert.message}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
        </div>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminAgentMonitoring;
