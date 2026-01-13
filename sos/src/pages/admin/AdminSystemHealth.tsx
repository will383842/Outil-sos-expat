/**
 * Dashboard unifié de santé système
 *
 * Affiche en temps réel :
 * - Statut global du système
 * - Alertes actives
 * - Métriques DLQ
 * - État des backups
 * - Résultats des tests DR
 * - Demandes GDPR
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useIntl } from 'react-intl';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Server,
  Clock,
  Activity,
  FileText,
  Users,
  Phone,
  CreditCard,
  Play,
  Eye,
  Check
} from 'lucide-react';

// Types
interface SystemHealthSummary {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  metrics: {
    dlq: { pending: number; failed: number };
    alerts: { active: number };
    errors: { lastHour: number };
    disputes: { open: number };
    backups: {
      firestore: { lastAt: string } | null;
      auth: { lastAt: string; userCount: number } | null;
    };
  };
  checkedAt: string;
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  category: string;
  title: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
}

interface DRReport {
  id: string;
  createdAt: string;
  overallStatus: 'passed' | 'failed' | 'warning';
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  executionTimeMs: number;
}

const AdminSystemHealth: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const functions = getFunctions(undefined, 'europe-west1');

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthSummary, setHealthSummary] = useState<SystemHealthSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [drReports, setDRReports] = useState<DRReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runningDRTest, setRunningDRTest] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const [healthRes, alertsRes, drRes] = await Promise.all([
        httpsCallable<unknown, SystemHealthSummary>(functions, 'getSystemHealthSummary')(),
        httpsCallable<unknown, { alerts: Alert[] }>(functions, 'getActiveAlerts')(),
        httpsCallable<unknown, { reports: DRReport[] }>(functions, 'listDRReports')()
      ]);

      setHealthSummary(healthRes.data);
      setAlerts(alertsRes.data.alerts);
      setDRReports(drRes.data.reports);
    } catch (err) {
      console.error('Failed to fetch system health:', err);
      setError(t('systemHealth.errors.loading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [functions]);

  useEffect(() => {
    fetchData();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Acknowledge alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await httpsCallable(functions, 'acknowledgeAlert')({ alertId });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Run DR test manually
  const handleRunDRTest = async () => {
    setRunningDRTest(true);
    try {
      await httpsCallable(functions, 'runDRTestManual')();
      await fetchData(true);
    } catch (err) {
      console.error('Failed to run DR test:', err);
      setError(t('systemHealth.errors.drTest'));
    } finally {
      setRunningDRTest(false);
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      passed: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
      emergency: 'bg-purple-100 text-purple-800'
    };

    const icons: Record<string, React.ReactNode> = {
      healthy: <CheckCircle className="w-4 h-4" />,
      passed: <CheckCircle className="w-4 h-4" />,
      warning: <AlertTriangle className="w-4 h-4" />,
      critical: <XCircle className="w-4 h-4" />,
      failed: <XCircle className="w-4 h-4" />,
      emergency: <AlertTriangle className="w-4 h-4" />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {icons[status]}
        {status.toUpperCase()}
      </span>
    );
  };

  // Metric card component
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    status?: 'ok' | 'warning' | 'error';
    subtitle?: string;
  }> = ({ title, value, icon, status = 'ok', subtitle }) => {
    const borderColors: Record<string, string> = {
      ok: 'border-green-200',
      warning: 'border-yellow-200',
      error: 'border-red-200'
    };

    return (
      <div className={`bg-white rounded-lg border-2 ${borderColors[status]} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">{t('systemHealth.title')}</h1>
            <p className="text-sm text-gray-500">
              {t('systemHealth.lastCheck')}: {healthSummary?.checkedAt ? new Date(healthSummary.checkedAt).toLocaleString() : '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {healthSummary && <StatusBadge status={healthSummary.status} />}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Issues */}
      {healthSummary?.issues && healthSummary.issues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">{t('systemHealth.issues')}</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {healthSummary.issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title={t('systemHealth.metrics.dlqPending')}
          value={healthSummary?.metrics.dlq.pending ?? '-'}
          icon={<Database className="w-6 h-6" />}
          status={healthSummary?.metrics.dlq.pending && healthSummary.metrics.dlq.pending > 10 ? 'warning' : 'ok'}
        />
        <MetricCard
          title={t('systemHealth.metrics.dlqFailed')}
          value={healthSummary?.metrics.dlq.failed ?? '-'}
          icon={<XCircle className="w-6 h-6" />}
          status={healthSummary?.metrics.dlq.failed && healthSummary.metrics.dlq.failed > 0 ? 'error' : 'ok'}
        />
        <MetricCard
          title={t('systemHealth.metrics.activeAlerts')}
          value={healthSummary?.metrics.alerts.active ?? '-'}
          icon={<AlertTriangle className="w-6 h-6" />}
          status={healthSummary?.metrics.alerts.active && healthSummary.metrics.alerts.active > 0 ? 'warning' : 'ok'}
        />
        <MetricCard
          title={t('systemHealth.metrics.errorsLastHour')}
          value={healthSummary?.metrics.errors.lastHour ?? '-'}
          icon={<Activity className="w-6 h-6" />}
          status={healthSummary?.metrics.errors.lastHour && healthSummary.metrics.errors.lastHour > 20 ? 'error' : 'ok'}
        />
        <MetricCard
          title={t('systemHealth.metrics.openDisputes')}
          value={healthSummary?.metrics.disputes.open ?? '-'}
          icon={<CreditCard className="w-6 h-6" />}
          status={healthSummary?.metrics.disputes.open && healthSummary.metrics.disputes.open > 5 ? 'warning' : 'ok'}
        />
        <MetricCard
          title={t('systemHealth.metrics.backupFirestore')}
          value={healthSummary?.metrics.backups.firestore ? '✓' : '✗'}
          icon={<Server className="w-6 h-6" />}
          status={healthSummary?.metrics.backups.firestore ? 'ok' : 'error'}
          subtitle={healthSummary?.metrics.backups.firestore?.lastAt
            ? new Date(healthSummary.metrics.backups.firestore.lastAt).toLocaleDateString()
            : t('systemHealth.never')}
        />
        <MetricCard
          title={t('systemHealth.metrics.backupAuth')}
          value={healthSummary?.metrics.backups.auth?.userCount ?? '-'}
          icon={<Users className="w-6 h-6" />}
          status={healthSummary?.metrics.backups.auth ? 'ok' : 'warning'}
          subtitle={healthSummary?.metrics.backups.auth?.lastAt
            ? new Date(healthSummary.metrics.backups.auth.lastAt).toLocaleDateString()
            : t('systemHealth.never')}
        />
        <MetricCard
          title={t('systemHealth.dr.title')}
          value={drReports.length > 0 ? drReports[0].overallStatus : '-'}
          icon={<FileText className="w-6 h-6" />}
          status={drReports.length > 0 && drReports[0].overallStatus === 'passed' ? 'ok' : 'warning'}
        />
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('systemHealth.alerts.title')} ({alerts.length})
          </h2>
        </div>

        {alerts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('systemHealth.alerts.noAlerts')}</p>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.severity === 'emergency' || alert.severity === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={alert.severity} />
                      <span className="text-xs text-gray-500">{alert.category}</span>
                    </div>
                    <h4 className="font-medium mt-1">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="p-1 hover:bg-white rounded"
                    title={t('systemHealth.alerts.acknowledge')}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DR Test History */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('systemHealth.dr.title')}
          </h2>
          <button
            onClick={handleRunDRTest}
            disabled={runningDRTest}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {runningDRTest ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {runningDRTest ? t('systemHealth.dr.running') : t('systemHealth.dr.runTest')}
          </button>
        </div>

        {drReports.length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('systemHealth.dr.noTests')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">{t('systemHealth.dr.date')}</th>
                  <th className="text-left py-2">{t('systemHealth.dr.status')}</th>
                  <th className="text-left py-2">{t('systemHealth.dr.results')}</th>
                  <th className="text-left py-2">{t('systemHealth.dr.duration')}</th>
                </tr>
              </thead>
              <tbody>
                {drReports.slice(0, 5).map(report => (
                  <tr key={report.id} className="border-b">
                    <td className="py-2">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={report.overallStatus} />
                    </td>
                    <td className="py-2">
                      <span className="text-green-600">{report.summary.passed} ✓</span>
                      {report.summary.warnings > 0 && (
                        <span className="text-yellow-600 ml-2">{report.summary.warnings} ⚠</span>
                      )}
                      {report.summary.failed > 0 && (
                        <span className="text-red-600 ml-2">{report.summary.failed} ✗</span>
                      )}
                    </td>
                    <td className="py-2 text-gray-500">
                      {Math.round(report.executionTimeMs / 1000)}s
                    </td>
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

export default AdminSystemHealth;
