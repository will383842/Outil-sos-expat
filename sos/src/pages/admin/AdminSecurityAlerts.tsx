/**
 * Dashboard des alertes de sécurité - Admin SOS Expat
 * Monitoring en temps réel, statistiques et actions rapides
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoSuspendRealtime } from '../../hooks/useAutoSuspendRealtime';
import {
  SecurityAlert,
  AlertSeverity,
  AlertStatus,
  ThreatLevel,
  BlockedEntity,
  SEVERITY_COLORS,
  STATUS_COLORS,
  THREAT_LEVEL_COLORS,
  getAlertTypeLabel,
  formatTimeAgo,
  AlertFilters,
} from '../../types/security';

// ==========================================
// COMPOSANTS D'ICONES
// ==========================================

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const BlockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// ==========================================
// THREAT LEVEL INDICATOR
// ==========================================

interface ThreatLevelIndicatorProps {
  level: ThreatLevel;
}

const ThreatLevelIndicator: React.FC<ThreatLevelIndicatorProps> = ({ level }) => {
  const { t } = useTranslation();

  const levelLabels: Record<ThreatLevel, string> = {
    normal: t('admin.security.threatLevel.normal', 'Normal'),
    low: t('admin.security.threatLevel.low', 'Bas'),
    moderate: t('admin.security.threatLevel.moderate', 'Modere'),
    elevated: t('admin.security.threatLevel.elevated', 'Eleve'),
    critical: t('admin.security.threatLevel.critical', 'Critique'),
  };

  const levelBars: Record<ThreatLevel, number> = {
    normal: 1,
    low: 2,
    moderate: 3,
    elevated: 4,
    critical: 5,
  };

  const levelColors: Record<ThreatLevel, string> = {
    normal: 'bg-green-500',
    low: 'bg-blue-500',
    moderate: 'bg-yellow-500',
    elevated: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">
          {t('admin.security.threatLevel.title', 'Niveau de menace')}
        </h3>
        <span className={`text-lg font-bold ${THREAT_LEVEL_COLORS[level]}`}>
          {levelLabels[level]}
        </span>
      </div>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`h-3 flex-1 rounded ${
              bar <= levelBars[level] ? levelColors[level] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// ==========================================
// STAT CARD
// ==========================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; isUp: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${color}`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="flex items-center">
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {trend && (
            <span className={`ml-2 text-sm ${trend.isUp ? 'text-red-500' : 'text-green-500'}`}>
              {trend.isUp ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ==========================================
// ALERT ROW
// ==========================================

interface AlertRowProps {
  alert: SecurityAlert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onInvestigate: (id: string) => void;
  onBlockIP: (ip: string) => void;
}

const AlertRow: React.FC<AlertRowProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  onInvestigate,
  onBlockIP,
}) => {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const severityBadge = (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${SEVERITY_COLORS[alert.severity]}`}>
      {alert.severity.toUpperCase()}
    </span>
  );

  const statusBadge = (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[alert.status]}`}>
      {alert.status}
    </span>
  );

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50">
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {severityBadge}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {getAlertTypeLabel(alert.type, i18n.language)}
              </p>
              <p className="text-xs text-gray-500">
                {alert.source.ip && `IP: ${alert.source.ip}`}
                {alert.source.userEmail && ` | ${alert.source.userEmail}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {statusBadge}
            {alert.aggregation.count > 1 && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                x{alert.aggregation.count}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatTimeAgo(alert.createdAt, i18n.language)}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                {t('admin.security.details', 'Details')}
              </h4>
              <dl className="text-sm">
                {alert.context.ip && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">IP</dt>
                    <dd className="font-mono">{alert.context.ip}</dd>
                  </div>
                )}
                {alert.context.country && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">{t('admin.security.country', 'Pays')}</dt>
                    <dd>{alert.context.countryName || alert.context.country}</dd>
                  </div>
                )}
                {alert.context.attemptCount && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">{t('admin.security.attempts', 'Tentatives')}</dt>
                    <dd>{alert.context.attemptCount}</dd>
                  </div>
                )}
                {alert.context.riskScore && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">{t('admin.security.riskScore', 'Score risque')}</dt>
                    <dd className={alert.context.riskScore > 70 ? 'text-red-600 font-bold' : ''}>
                      {alert.context.riskScore}%
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                {t('admin.security.actions', 'Actions')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {alert.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id); }}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <CheckIcon /> {t('admin.security.acknowledge', 'Acquitter')}
                  </button>
                )}
                {(alert.status === 'pending' || alert.status === 'acknowledged') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onInvestigate(alert.id); }}
                    className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    <EyeIcon /> {t('admin.security.investigate', 'Investiguer')}
                  </button>
                )}
                {alert.status !== 'resolved' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onResolve(alert.id); }}
                    className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    {t('admin.security.resolve', 'Resoudre')}
                  </button>
                )}
                {alert.source.ip && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onBlockIP(alert.source.ip!); }}
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <BlockIcon /> {t('admin.security.blockIP', 'Bloquer IP')}
                  </button>
                )}
              </div>
            </div>
          </div>
          {alert.context.riskFactors && alert.context.riskFactors.length > 0 && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                {t('admin.security.riskFactors', 'Facteurs de risque')}
              </h4>
              <div className="flex flex-wrap gap-1">
                {alert.context.riskFactors.map((factor, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                    {factor}
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

// ==========================================
// QUICK ACTIONS PANEL
// ==========================================

interface QuickActionsPanelProps {
  onBlockIP: (ip: string) => void;
  onRefresh: () => void;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ onBlockIP, onRefresh }) => {
  const { t } = useTranslation();
  const [ipToBlock, setIpToBlock] = useState('');

  const handleBlockIP = () => {
    if (ipToBlock.trim()) {
      onBlockIP(ipToBlock.trim());
      setIpToBlock('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        {t('admin.security.quickActions', 'Actions rapides')}
      </h3>
      <div className="space-y-3">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="IP a bloquer..."
            value={ipToBlock}
            onChange={(e) => setIpToBlock(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={handleBlockIP}
            disabled={!ipToBlock.trim()}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            <BlockIcon />
          </button>
        </div>
        <button
          onClick={onRefresh}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center justify-center"
        >
          <RefreshIcon />
          <span className="ml-2">{t('admin.security.refresh', 'Actualiser')}</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const AdminSecurityAlerts: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { firebaseUser } = useAuth();

  // State
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [blockedEntities, setBlockedEntities] = useState<BlockedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AlertFilters>({
    severity: [],
    status: ['pending', 'acknowledged', 'escalated'],
  });
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>('normal');

  // Stats
  const stats = useMemo(() => {
    const bySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0,
      emergency: 0,
    };

    alerts.forEach((alert) => {
      bySeverity[alert.severity]++;
    });

    return {
      total: alerts.length,
      pending: alerts.filter((a) => a.status === 'pending').length,
      critical: bySeverity.critical + bySeverity.emergency,
      bySeverity,
    };
  }, [alerts]);

  // Determine threat level
  useEffect(() => {
    if (stats.bySeverity.emergency > 0) {
      setThreatLevel('critical');
    } else if (stats.bySeverity.critical > 0) {
      setThreatLevel('elevated');
    } else if (stats.bySeverity.warning > 5) {
      setThreatLevel('moderate');
    } else if (stats.bySeverity.warning > 0) {
      setThreatLevel('low');
    } else {
      setThreatLevel('normal');
    }
  }, [stats]);

  // Real-time listener for alerts
  const { isRealtimeActive } = useAutoSuspendRealtime();

  useEffect(() => {
    setLoading(true);

    const alertsRef = collection(db, 'security_alerts');
    let alertsQuery = query(
      alertsRef,
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    if (filters.status && filters.status.length > 0) {
      alertsQuery = query(
        alertsRef,
        where('status', 'in', filters.status),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        const alertsData: SecurityAlert[] = [];
        snapshot.forEach((doc) => {
          alertsData.push({ id: doc.id, ...doc.data() } as SecurityAlert);
        });
        setAlerts(alertsData);
        setLoading(false);
      },
      (error) => {
        console.error('[AdminSecurityAlerts] Error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filters.status]);

  // Load blocked entities
  useEffect(() => {
    const loadBlocked = async () => {
      const blockedRef = collection(db, 'blocked_entities');
      const snapshot = await getDocs(query(blockedRef, limit(50)));
      const blocked: BlockedEntity[] = [];
      snapshot.forEach((doc) => {
        blocked.push({ id: doc.id, ...doc.data() } as BlockedEntity);
      });
      setBlockedEntities(blocked);
    };

    loadBlocked();
  }, []);

  // Action handlers
  const handleAcknowledge = useCallback(async (alertId: string) => {
    if (!firebaseUser) return;

    try {
      await updateDoc(doc(db, 'security_alerts', alertId), {
        status: 'acknowledged',
        acknowledgedBy: firebaseUser.uid,
        acknowledgedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }, [firebaseUser]);

  const handleResolve = useCallback(async (alertId: string) => {
    if (!firebaseUser) return;

    try {
      await updateDoc(doc(db, 'security_alerts', alertId), {
        status: 'resolved',
        resolvedBy: firebaseUser.uid,
        resolvedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  }, [firebaseUser]);

  const handleInvestigate = useCallback(async (alertId: string) => {
    if (!firebaseUser) return;

    try {
      await updateDoc(doc(db, 'security_alerts', alertId), {
        status: 'investigating',
        assignedTo: firebaseUser.uid,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  }, [firebaseUser]);

  const handleBlockIP = useCallback(async (ip: string) => {
    if (!firebaseUser) return;

    try {
      const securityAction = httpsCallable(functions, 'securityAlertAdminAction');
      await securityAction({
        action: 'block_ip',
        targetIp: ip,
        adminId: firebaseUser.uid,
        notes: 'Blocked from admin dashboard',
      });
      alert(t('admin.security.ipBlocked', 'IP bloquee avec succes'));
    } catch (error) {
      console.error('Error blocking IP:', error);
      alert(t('admin.security.error', 'Erreur lors du blocage'));
    }
  }, [firebaseUser, t]);

  const handleRefresh = useCallback(() => {
    // Force re-render by updating a filter
    setFilters((prev) => ({ ...prev }));
  }, []);

  // Filter controls
  const severityOptions: AlertSeverity[] = ['info', 'warning', 'critical', 'emergency'];
  const statusOptions: AlertStatus[] = ['pending', 'acknowledged', 'investigating', 'escalated', 'resolved'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ShieldIcon />
          <h1 className="ml-3 text-2xl font-bold text-gray-900">
            {t('admin.security.title', 'Alertes de securite')}
          </h1>
        </div>
        <div className="text-sm text-gray-500">
          {t('admin.security.lastUpdate', 'Mise a jour en temps reel')}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <ThreatLevelIndicator level={threatLevel} />
        <StatCard
          title={t('admin.security.totalAlerts', 'Total alertes')}
          value={stats.total}
          icon={<AlertIcon />}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title={t('admin.security.pendingAlerts', 'En attente')}
          value={stats.pending}
          icon={<AlertIcon />}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title={t('admin.security.criticalAlerts', 'Critiques')}
          value={stats.critical}
          icon={<AlertIcon />}
          color="bg-red-100 text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main alerts list */}
        <div className="lg:col-span-3">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow mb-4 p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t('admin.security.filterSeverity', 'Severite')}
                </label>
                <div className="flex flex-wrap gap-1">
                  {severityOptions.map((sev) => (
                    <button
                      key={sev}
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          severity: prev.severity?.includes(sev)
                            ? prev.severity.filter((s) => s !== sev)
                            : [...(prev.severity || []), sev],
                        }));
                      }}
                      className={`px-2 py-1 text-xs rounded-full border ${
                        filters.severity?.includes(sev)
                          ? SEVERITY_COLORS[sev]
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t('admin.security.filterStatus', 'Statut')}
                </label>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          status: prev.status?.includes(status)
                            ? prev.status.filter((s) => s !== status)
                            : [...(prev.status || []), status],
                        }));
                      }}
                      className={`px-2 py-1 text-xs rounded-full border ${
                        filters.status?.includes(status)
                          ? STATUS_COLORS[status]
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alerts list */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-medium text-gray-700">
                {t('admin.security.recentAlerts', 'Alertes recentes')} ({alerts.length})
              </h2>
            </div>
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ShieldIcon />
                <p className="mt-2">{t('admin.security.noAlerts', 'Aucune alerte')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {alerts
                  .filter((alert) => {
                    if (filters.severity && filters.severity.length > 0) {
                      if (!filters.severity.includes(alert.severity)) return false;
                    }
                    return true;
                  })
                  .map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={handleAcknowledge}
                      onResolve={handleResolve}
                      onInvestigate={handleInvestigate}
                      onBlockIP={handleBlockIP}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <QuickActionsPanel onBlockIP={handleBlockIP} onRefresh={handleRefresh} />

          {/* Blocked entities */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {t('admin.security.blockedEntities', 'Entites bloquees')} ({blockedEntities.length})
            </h3>
            {blockedEntities.length === 0 ? (
              <p className="text-xs text-gray-500">{t('admin.security.noBlocked', 'Aucune')}</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {blockedEntities.slice(0, 10).map((entity) => (
                  <li key={entity.id} className="text-xs flex justify-between items-center">
                    <span className="font-mono">{entity.entityId}</span>
                    <span className="text-gray-500">{entity.entityType}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSecurityAlerts;
