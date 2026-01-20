/**
 * Dashboard de Monitoring Fonctionnel
 *
 * Affiche en temps réel :
 * - Santé des parcours critiques (inscription, réservation, paiement)
 * - Alertes fonctionnelles actives
 * - Métriques des funnels
 * - État du tracking (Meta/Google)
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useIntl } from 'react-intl';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Target,
  Check,
  Play,
  Eye,
  UserPlus,
  Calendar,
  BarChart3,
  Zap
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface FunctionalHealthSummary {
  status: 'healthy' | 'warning' | 'critical' | 'emergency';
  totalActiveAlerts: number;
  alertsByCategory: Record<string, number>;
  alertsBySeverity: {
    warning: number;
    critical: number;
    emergency: number;
  };
  latestMetrics: {
    signup_funnel?: {
      pageViews: number;
      formStarts: number;
      formSubmits: number;
      actualSignups: number;
      conversionRate: number;
      formDropOffRate: number;
      timestamp: string;
    };
    tracking_health?: {
      metaCapi: {
        totalEvents: number;
        conversions: number;
        avgQualityScore: number;
      };
      googleAds: {
        totalEvents: number;
      };
      timestamp: string;
    };
  };
  checkedAt: string;
}

interface FunctionalAlert {
  id: string;
  severity: 'warning' | 'critical' | 'emergency';
  category: string;
  title: string;
  message: string;
  impact: string;
  suggestedAction: string;
  createdAt: string;
  acknowledged: boolean;
  resolved: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdminFunctionalMonitoring: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      // Fallback si la traduction n'existe pas
      return id.split('.').pop() || id;
    }
  };
  const functions = getFunctions(undefined, 'europe-west1');

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthSummary, setHealthSummary] = useState<FunctionalHealthSummary | null>(null);
  const [alerts, setAlerts] = useState<FunctionalAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  const [selectedCheckType, setSelectedCheckType] = useState<string>('all');

  // Fetch all data
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setError(null);

    try {
      const [healthRes, alertsRes] = await Promise.all([
        httpsCallable<unknown, FunctionalHealthSummary>(functions, 'getFunctionalHealthSummary')(),
        httpsCallable<unknown, { alerts: FunctionalAlert[] }>(functions, 'getFunctionalAlerts')({ resolved: false })
      ]);

      setHealthSummary(healthRes.data);
      setAlerts(alertsRes.data.alerts);
    } catch (err) {
      console.error('Failed to fetch functional health:', err);
      setError('Erreur lors du chargement des données. Vérifiez que les fonctions sont déployées.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [functions]);

  // Initial load only (manual refresh for cost savings)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Resolve alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await httpsCallable(functions, 'resolveFunctionalAlert')({ alertId, resolution: 'Résolu via admin' });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  // Run manual check
  const handleRunCheck = async () => {
    setRunningCheck(true);
    try {
      await httpsCallable(functions, 'triggerFunctionalCheck')({ checkType: selectedCheckType });
      await fetchData(true);
    } catch (err) {
      console.error('Failed to run check:', err);
      setError('Échec du déclenchement du check. Vérifiez les permissions admin.');
    } finally {
      setRunningCheck(false);
    }
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800',
      emergency: 'bg-purple-100 text-purple-800'
    };

    const icons: Record<string, React.ReactNode> = {
      healthy: <CheckCircle className="w-4 h-4" />,
      warning: <AlertTriangle className="w-4 h-4" />,
      critical: <XCircle className="w-4 h-4" />,
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
    trend?: string;
  }> = ({ title, value, icon, status = 'ok', subtitle, trend }) => {
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
            {trend && (
              <p className={`text-xs ${trend.startsWith('+') ? 'text-green-600' : trend.startsWith('-') ? 'text-red-600' : 'text-gray-400'}`}>
                {trend}
              </p>
            )}
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>
      </div>
    );
  };

  // Category icon mapping
  const getCategoryIcon = (category: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      signup_funnel: <UserPlus className="w-5 h-5" />,
      booking_funnel: <Calendar className="w-5 h-5" />,
      payment_flow: <CreditCard className="w-5 h-5" />,
      form_errors: <AlertTriangle className="w-5 h-5" />,
      tracking: <Target className="w-5 h-5" />,
      availability: <Users className="w-5 h-5" />,
      performance: <Zap className="w-5 h-5" />
    };
    return icons[category] || <Activity className="w-5 h-5" />;
  };

  // Category label mapping
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      signup_funnel: 'Funnel Inscription',
      booking_funnel: 'Funnel Réservation',
      payment_flow: 'Flux Paiement',
      form_errors: 'Erreurs Formulaires',
      tracking: 'Tracking Marketing',
      availability: 'Disponibilité',
      performance: 'Performance'
    };
    return labels[category] || category;
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
            <Activity className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold">Monitoring Fonctionnel</h1>
              <p className="text-sm text-gray-500">
                Surveillance des parcours critiques - Dernière vérif: {healthSummary?.checkedAt ? new Date(healthSummary.checkedAt).toLocaleString() : '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {healthSummary && <StatusBadge status={healthSummary.status} />}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Actualiser"
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

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Alertes Actives"
            value={healthSummary?.totalActiveAlerts ?? 0}
            icon={<AlertTriangle className="w-6 h-6" />}
            status={healthSummary?.totalActiveAlerts && healthSummary.totalActiveAlerts > 0 ? 'warning' : 'ok'}
          />
          <MetricCard
            title="Critiques"
            value={healthSummary?.alertsBySeverity.critical ?? 0}
            icon={<XCircle className="w-6 h-6" />}
            status={healthSummary?.alertsBySeverity.critical && healthSummary.alertsBySeverity.critical > 0 ? 'error' : 'ok'}
          />
          <MetricCard
            title="Urgences"
            value={healthSummary?.alertsBySeverity.emergency ?? 0}
            icon={<Zap className="w-6 h-6" />}
            status={healthSummary?.alertsBySeverity.emergency && healthSummary.alertsBySeverity.emergency > 0 ? 'error' : 'ok'}
          />
          <MetricCard
            title="Avertissements"
            value={healthSummary?.alertsBySeverity.warning ?? 0}
            icon={<AlertTriangle className="w-6 h-6" />}
            status={healthSummary?.alertsBySeverity.warning && healthSummary.alertsBySeverity.warning > 3 ? 'warning' : 'ok'}
          />
        </div>

        {/* Funnel Metrics */}
        {healthSummary?.latestMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Signup Funnel */}
            {healthSummary.latestMetrics.signup_funnel && (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold">Funnel Inscription (24h)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Vues page</p>
                    <p className="text-xl font-bold">{healthSummary.latestMetrics.signup_funnel.pageViews}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Formulaires commencés</p>
                    <p className="text-xl font-bold">{healthSummary.latestMetrics.signup_funnel.formStarts}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Inscriptions réussies</p>
                    <p className="text-xl font-bold text-green-600">{healthSummary.latestMetrics.signup_funnel.actualSignups}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taux conversion</p>
                    <p className={`text-xl font-bold ${healthSummary.latestMetrics.signup_funnel.conversionRate < 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {healthSummary.latestMetrics.signup_funnel.conversionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {healthSummary.latestMetrics.signup_funnel.formDropOffRate > 30 && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                    Taux d'abandon formulaire: {healthSummary.latestMetrics.signup_funnel.formDropOffRate.toFixed(1)}%
                  </div>
                )}
              </div>
            )}

            {/* Tracking Health */}
            {healthSummary.latestMetrics.tracking_health && (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold">Tracking Marketing (24h)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Events Meta CAPI</p>
                    <p className="text-xl font-bold">{healthSummary.latestMetrics.tracking_health.metaCapi.totalEvents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Conversions Meta</p>
                    <p className="text-xl font-bold text-green-600">{healthSummary.latestMetrics.tracking_health.metaCapi.conversions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Score Qualité CAPI</p>
                    <p className={`text-xl font-bold ${healthSummary.latestMetrics.tracking_health.metaCapi.avgQualityScore < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {healthSummary.latestMetrics.tracking_health.metaCapi.avgQualityScore.toFixed(0)}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Events Google Ads</p>
                    <p className="text-xl font-bold">{healthSummary.latestMetrics.tracking_health.googleAds.totalEvents}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Check Trigger */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Déclencher une vérification</h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCheckType}
                onChange={(e) => setSelectedCheckType(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="all">Toutes les vérifications</option>
                <option value="critical">Critiques seulement (rapide)</option>
                <option value="signup">Funnel Inscription</option>
                <option value="booking">Funnel Réservation</option>
                <option value="tracking">Tracking Marketing</option>
                <option value="payment">Flux Paiement</option>
              </select>
              <button
                onClick={handleRunCheck}
                disabled={runningCheck}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {runningCheck ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {runningCheck ? 'En cours...' : 'Lancer'}
              </button>
            </div>
          </div>
        </div>

        {/* Alerts by Category */}
        {healthSummary?.alertsByCategory && Object.keys(healthSummary.alertsByCategory).length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Alertes par catégorie
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(healthSummary.alertsByCategory).map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  {getCategoryIcon(category)}
                  <span className="text-sm">{getCategoryLabel(category)}</span>
                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Alerts */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertes Actives ({alerts.length})
            </h2>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500">Aucune alerte active. Tous les systèmes fonctionnent normalement.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'emergency'
                      ? 'bg-purple-50 border-purple-200'
                      : alert.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getCategoryIcon(alert.category)}
                        <StatusBadge status={alert.severity} />
                        <span className="text-xs text-gray-500">{getCategoryLabel(alert.category)}</span>
                      </div>
                      <h4 className="font-medium text-lg">{alert.title}</h4>
                      <p className="text-sm text-gray-700 mt-1">{alert.message}</p>

                      {/* Impact & Action */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white bg-opacity-50 rounded p-2">
                          <p className="text-xs font-medium text-gray-500 uppercase">Impact Business</p>
                          <p className="text-sm text-gray-800">{alert.impact}</p>
                        </div>
                        <div className="bg-white bg-opacity-50 rounded p-2">
                          <p className="text-xs font-medium text-gray-500 uppercase">Action Suggérée</p>
                          <p className="text-sm text-gray-800">{alert.suggestedAction}</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Créé le {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        title="Marquer comme résolu"
                      >
                        <Check className="w-4 h-4" />
                        Résoudre
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Ce monitoring surveille automatiquement :</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li><strong>Inscriptions</strong> : Détecte si personne ne peut s'inscrire</li>
            <li><strong>Réservations</strong> : Détecte si les réservations sont bloquées</li>
            <li><strong>Paiements</strong> : Détecte les problèmes de checkout et commissions</li>
            <li><strong>Tracking</strong> : Détecte si Meta Pixel/Google Ads ne fonctionne plus</li>
            <li><strong>Formulaires</strong> : Détecte les erreurs répétées sur les formulaires</li>
          </ul>
          <p className="mt-2 text-xs">Vérifications automatiques : toutes les 4h (critiques) et 2x/jour (complet)</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFunctionalMonitoring;
