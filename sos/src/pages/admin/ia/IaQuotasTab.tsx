/**
 * IaQuotasTab - Gestion des quotas IA par prestataire
 * Avec alertes, historique des resets, providers proches de la limite
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import { useApp } from '../../../contexts/AppContext';
import { getDateLocale } from '../../../utils/formatters';
import {
  Search,
  RefreshCw,
  Check,
  AlertCircle,
  Edit2,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Activity,
  Save,
  X,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Bell
} from 'lucide-react';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../utils/cn';
import { QuotaResetLog } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface ProviderQuota {
  id: string;
  email: string;
  displayName: string;
  role: string;
  aiCallsUsed: number;
  aiCallsLimit: number;
  aiQuotaResetAt?: Date;
  aiLastCallAt?: Date;
  hasAccess: boolean;
  quotaPercent: number;
}

// ============================================================================
// RESET HISTORY MODAL
// ============================================================================

interface ResetHistoryModalProps {
  logs: QuotaResetLog[];
  loading: boolean;
  onClose: () => void;
  language: string;
}

const ResetHistoryModal: React.FC<ResetHistoryModalProps> = ({ logs, loading, onClose, language }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Historique des resets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto max-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun historique de reset
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{log.providerName}</span>
                  <span className="text-sm text-gray-500">
                    {log.createdAt.toLocaleDateString(getDateLocale(language), {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Usage avant reset: <span className="font-medium">{log.previousUsage}</span> / {log.quotaLimit}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Par: {log.resetByName}
                  {log.reason && <span className="ml-2">- {log.reason}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ============================================================================
// COMPONENT
// ============================================================================

export const IaQuotasTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();
  const { language } = useApp();
  const { user: currentUser } = useAuth();

  // State
  const [providers, setProviders] = useState<ProviderQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'nearLimit' | 'exceeded' | 'hasUsage'>('all');

  // History modal
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<QuotaResetLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['lawyer', 'expat_aidant', 'provider']),
        limit(500)
      );

      const snapshot = await getDocs(usersQuery);
      const providersList: ProviderQuota[] = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();

        const hasAccess = data.forcedAIAccess === true ||
          data.subscriptionStatus === 'active' ||
          data.subscriptionStatus === 'trialing' ||
          (data.freeTrialUntil && data.freeTrialUntil.toDate() > new Date());

        const aiCallsUsed = data.aiCallsUsed || 0;
        const aiCallsLimit = data.aiCallsLimit || 100;
        const quotaPercent = aiCallsLimit > 0 ? Math.round((aiCallsUsed / aiCallsLimit) * 100) : 0;

        providersList.push({
          id: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          role: data.role === 'provider' ? (data.providerType || 'lawyer') : data.role,
          aiCallsUsed,
          aiCallsLimit,
          aiQuotaResetAt: data.aiQuotaResetAt?.toDate(),
          aiLastCallAt: data.aiLastCallAt?.toDate(),
          hasAccess,
          quotaPercent
        });
      });

      // Sort by usage descending
      providersList.sort((a, b) => b.quotaPercent - a.quotaPercent);
      setProviders(providersList);
    } catch (err: any) {
      console.error('Error loading providers:', err);
      setError(err.message || iaT.errorLoading);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const loadResetHistory = async () => {
    setHistoryLoading(true);
    try {
      const logsQuery = query(
        collection(db, 'quota_reset_logs'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(logsQuery);
      const logs: QuotaResetLog[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          providerId: data.providerId,
          providerName: data.providerName || 'Inconnu',
          resetBy: data.resetBy,
          resetByName: data.resetByName || 'Admin',
          previousUsage: data.previousUsage || 0,
          quotaLimit: data.quotaLimit || 100,
          reason: data.reason,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });

      setHistoryLogs(logs);
    } catch (err) {
      console.error('Error loading reset history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const updateQuotaLimit = async (providerId: string, newLimit: number) => {
    setSaving(providerId);
    setError(null);

    try {
      const updateData = {
        aiCallsLimit: newLimit,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'users', providerId), updateData);

      // Also try to update sos_profiles
      try {
        await updateDoc(doc(db, 'sos_profiles', providerId), updateData);
      } catch (syncErr) {
        console.warn('[IaQuotasTab] Could not update sos_profiles:', syncErr);
      }

      setProviders(prev => prev.map(p =>
        p.id === providerId ? {
          ...p,
          aiCallsLimit: newLimit,
          quotaPercent: newLimit > 0 ? Math.round((p.aiCallsUsed / newLimit) * 100) : 0
        } : p
      ));

      setEditingId(null);
      setSuccess(iaT.quotaUpdated);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating quota:', err);
      setError(err.message || iaT.errorModification);
    } finally {
      setSaving(null);
    }
  };

  const resetQuota = async (provider: ProviderQuota, reason?: string) => {
    setSaving(provider.id);
    setError(null);

    try {
      // P0 FIX: Use Cloud Function instead of direct Firestore write
      // This avoids the quota_reset_logs write permission issue
      const adminResetQuotaFn = httpsCallable(functions, 'adminResetQuota');
      const result = await adminResetQuotaFn({
        providerId: provider.id,
        reason: reason || 'Reset manuel depuis admin IA'
      });

      const data = result.data as { success: boolean; previousCalls?: number };

      if (!data.success) {
        throw new Error('Cloud Function returned failure');
      }

      // Update local state
      setProviders(prev => prev.map(p =>
        p.id === provider.id ? { ...p, aiCallsUsed: 0, aiQuotaResetAt: new Date(), quotaPercent: 0 } : p
      ));

      setSuccess(`${iaT.quotaReset} - ${provider.displayName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error resetting quota:', err);
      // Handle Firebase callable errors
      const message = err.code === 'functions/permission-denied'
        ? 'Permission refusée - Accès admin requis'
        : err.message || iaT.errorReset;
      setError(message);
    } finally {
      setSaving(null);
    }
  };

  const startEditing = (provider: ProviderQuota) => {
    setEditingId(provider.id);
    setEditValue(provider.aiCallsLimit);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue(0);
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!p.email.toLowerCase().includes(query) &&
            !p.displayName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Type filter
      switch (filterType) {
        case 'nearLimit':
          return p.quotaPercent >= 80 && p.quotaPercent < 100;
        case 'exceeded':
          return p.quotaPercent >= 100;
        case 'hasUsage':
          return p.aiCallsUsed > 0;
        default:
          return true;
      }
    });
  }, [providers, searchQuery, filterType]);

  // Stats
  const stats = useMemo(() => ({
    total: providers.length,
    totalCalls: providers.reduce((acc, p) => acc + p.aiCallsUsed, 0),
    nearLimit: providers.filter(p => p.quotaPercent >= 80 && p.quotaPercent < 100).length,
    exceeded: providers.filter(p => p.quotaPercent >= 100).length,
    hasUsage: providers.filter(p => p.aiCallsUsed > 0).length
  }), [providers]);

  // Providers needing attention (>=80%)
  const alertProviders = useMemo(() => {
    return providers
      .filter(p => p.quotaPercent >= 80)
      .sort((a, b) => b.quotaPercent - a.quotaPercent)
      .slice(0, 5);
  }, [providers]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-gray-500">Total appels IA</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalCalls.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-500">Avec usage</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.hasUsage}</div>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-600">Proche limite (&gt;80%)</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.nearLimit}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">Quota depasse</span>
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.exceeded}</div>
        </div>
      </div>

      {/* Alerts Section */}
      {alertProviders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Alertes quota</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertProviders.map(provider => (
              <div
                key={provider.id}
                className={cn(
                  'bg-white rounded-lg p-3 border',
                  provider.quotaPercent >= 100 ? 'border-red-200' : 'border-amber-200'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 text-sm truncate">
                    {provider.displayName}
                  </span>
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded',
                    provider.quotaPercent >= 100
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  )}>
                    {provider.quotaPercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {provider.aiCallsUsed} / {provider.aiCallsLimit}
                  </span>
                  <button
                    onClick={() => resetQuota(provider)}
                    disabled={saving === provider.id}
                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
                  >
                    {saving === provider.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      'Reset'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={iaT.searchByNameEmail}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filtres rapides */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType(filterType === 'nearLimit' ? 'all' : 'nearLimit')}
              className={cn(
                'px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                filterType === 'nearLimit'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              Proche limite
              {stats.nearLimit > 0 && (
                <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">
                  {stats.nearLimit}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterType(filterType === 'exceeded' ? 'all' : 'exceeded')}
              className={cn(
                'px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
                filterType === 'exceeded'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <AlertCircle className="w-4 h-4" />
              Depasse
              {stats.exceeded > 0 && (
                <span className="text-xs bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full">
                  {stats.exceeded}
                </span>
              )}
            </button>
          </div>

          {/* Historique */}
          <button
            onClick={() => {
              setShowHistory(true);
              loadResetHistory();
            }}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            Historique
          </button>

          {/* Refresh */}
          <button
            onClick={loadProviders}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="mt-2 text-sm text-gray-500">
          {filteredProviders.length} prestataire(s) affiche(s)
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.provider}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.usage}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.limit}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.progress}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.lastCall}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dernier reset
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    {adminT.loading}
                  </td>
                </tr>
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {iaT.noProviderFound}
                  </td>
                </tr>
              ) : (
                filteredProviders.map((provider) => {
                  const isEditing = editingId === provider.id;

                  return (
                    <tr
                      key={provider.id}
                      className={cn(
                        'hover:bg-gray-50',
                        provider.quotaPercent >= 100 && 'bg-red-50',
                        provider.quotaPercent >= 80 && provider.quotaPercent < 100 && 'bg-amber-50'
                      )}
                    >
                      {/* Prestataire */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{provider.displayName}</div>
                          <div className="text-sm text-gray-500">{provider.email}</div>
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {provider.aiCallsUsed.toLocaleString()}
                        </span>
                      </td>

                      {/* Limite */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500"
                              min="-1"
                            />
                            <button
                              onClick={() => updateQuotaLimit(provider.id, editValue)}
                              disabled={saving === provider.id}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              {saving === provider.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">
                              {provider.aiCallsLimit === -1 ? 'Illimite' : provider.aiCallsLimit}
                            </span>
                            <button
                              onClick={() => startEditing(provider)}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Progression */}
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span className={cn(
                              'font-medium',
                              provider.quotaPercent >= 100 ? 'text-red-600' :
                              provider.quotaPercent >= 80 ? 'text-amber-600' : 'text-gray-600'
                            )}>
                              {provider.quotaPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                provider.quotaPercent >= 100 ? 'bg-red-500' :
                                provider.quotaPercent >= 80 ? 'bg-amber-500' : 'bg-green-500'
                              )}
                              style={{ width: `${Math.min(provider.quotaPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Dernier appel */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {provider.aiLastCallAt
                          ? provider.aiLastCallAt.toLocaleDateString(getDateLocale(language), {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'
                        }
                      </td>

                      {/* Dernier reset */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {provider.aiQuotaResetAt
                          ? provider.aiQuotaResetAt.toLocaleDateString(getDateLocale(language), {
                              day: '2-digit',
                              month: 'short'
                            })
                          : '-'
                        }
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => resetQuota(provider)}
                          disabled={saving === provider.id || provider.aiCallsUsed === 0}
                          className={cn(
                            'px-3 py-1 text-sm rounded flex items-center gap-1 transition-colors',
                            provider.aiCallsUsed === 0
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          )}
                        >
                          {saving === provider.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          {iaT.reset}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset History Modal */}
      {showHistory && (
        <ResetHistoryModal
          logs={historyLogs}
          loading={historyLoading}
          onClose={() => setShowHistory(false)}
          language={language}
        />
      )}
    </div>
  );
};

export default IaQuotasTab;
