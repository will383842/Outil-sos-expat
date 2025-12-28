/**
 * IaQuotasTab - Gestion des quotas IA par prestataire
 * Permet de modifier les quotas individuels et de reset les compteurs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
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
  X
} from 'lucide-react';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { cn } from '../../../utils/cn';

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
}

// ============================================================================
// COMPONENT
// ============================================================================

export const IaQuotasTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();

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
  const [showNearLimit, setShowNearLimit] = useState(false);
  const [showExceeded, setShowExceeded] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Requête simple sans orderBy pour éviter index composite
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

        providersList.push({
          id: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          role: data.role === 'provider' ? (data.providerType || 'lawyer') : data.role,
          aiCallsUsed: data.aiCallsUsed || 0,
          aiCallsLimit: data.aiCallsLimit || 100,
          aiQuotaResetAt: data.aiQuotaResetAt?.toDate(),
          aiLastCallAt: data.aiLastCallAt?.toDate(),
          hasAccess
        });
      });

      // Tri côté client par aiCallsUsed décroissant
      providersList.sort((a, b) => b.aiCallsUsed - a.aiCallsUsed);
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

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const updateQuotaLimit = async (providerId: string, newLimit: number) => {
    setSaving(providerId);
    setError(null);

    try {
      // Update both users and sos_profiles to trigger sync to Outil IA
      const updateData = {
        aiCallsLimit: newLimit,
        updatedAt: serverTimestamp()
      };

      // Update users collection (for SOS usage)
      await updateDoc(doc(db, 'users', providerId), updateData);

      // Also update sos_profiles to trigger sync to Outil IA
      try {
        await updateDoc(doc(db, 'sos_profiles', providerId), updateData);
      } catch (syncErr) {
        // sos_profiles might not exist for this user, that's ok
        console.warn('[IaQuotasTab] Could not update sos_profiles (may not exist):', syncErr);
      }

      setProviders(prev => prev.map(p =>
        p.id === providerId ? { ...p, aiCallsLimit: newLimit } : p
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

  const resetQuota = async (provider: ProviderQuota) => {
    setSaving(provider.id);
    setError(null);

    try {
      const resetData = {
        aiCallsUsed: 0,
        aiQuotaResetAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Update users collection
      await updateDoc(doc(db, 'users', provider.id), resetData);

      // Also update sos_profiles to trigger sync to Outil IA
      try {
        await updateDoc(doc(db, 'sos_profiles', provider.id), resetData);
      } catch (syncErr) {
        console.warn('[IaQuotasTab] Could not update sos_profiles for reset:', syncErr);
      }

      setProviders(prev => prev.map(p =>
        p.id === provider.id ? { ...p, aiCallsUsed: 0, aiQuotaResetAt: new Date() } : p
      ));

      setSuccess(`${iaT.quotaReset} - ${provider.displayName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error resetting quota:', err);
      setError(err.message || iaT.errorReset);
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

  const filteredProviders = providers.filter(p => {
    // Filtre recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!p.email.toLowerCase().includes(query) &&
          !p.displayName.toLowerCase().includes(query)) {
        return false;
      }
    }

    const quotaPercent = p.aiCallsLimit > 0 ? (p.aiCallsUsed / p.aiCallsLimit) * 100 : 0;

    // Filtre proche limite (>80%)
    if (showNearLimit && quotaPercent <= 80) {
      return false;
    }

    // Filtre dépassé (>=100%)
    if (showExceeded && quotaPercent < 100) {
      return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: providers.length,
    totalCalls: providers.reduce((acc, p) => acc + p.aiCallsUsed, 0),
    nearLimit: providers.filter(p => {
      const percent = p.aiCallsLimit > 0 ? (p.aiCallsUsed / p.aiCallsLimit) * 100 : 0;
      return percent > 80 && percent < 100;
    }).length,
    exceeded: providers.filter(p => {
      const percent = p.aiCallsLimit > 0 ? (p.aiCallsUsed / p.aiCallsLimit) * 100 : 0;
      return percent >= 100;
    }).length
  };

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
            <span className="text-sm text-gray-500">Prestataires actifs</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
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
            <span className="text-sm text-red-600">Quota dépassé</span>
          </div>
          <div className="text-2xl font-bold text-red-700">{stats.exceeded}</div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
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
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filtre proche limite */}
          <button
            onClick={() => {
              setShowNearLimit(!showNearLimit);
              setShowExceeded(false);
            }}
            className={cn(
              'px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              showNearLimit
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            Proche limite
          </button>

          {/* Filtre dépassé */}
          <button
            onClick={() => {
              setShowExceeded(!showExceeded);
              setShowNearLimit(false);
            }}
            className={cn(
              'px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              showExceeded
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <AlertCircle className="w-4 h-4" />
            Dépassé
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prestataire
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Limite
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Progression
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dernier appel
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    {adminT.loading}
                  </td>
                </tr>
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {iaT.noProviderFound}
                  </td>
                </tr>
              ) : (
                filteredProviders.map((provider) => {
                  const quotaPercent = provider.aiCallsLimit > 0
                    ? Math.round((provider.aiCallsUsed / provider.aiCallsLimit) * 100)
                    : 0;

                  const isEditing = editingId === provider.id;

                  return (
                    <tr key={provider.id} className="hover:bg-gray-50">
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
                              {provider.aiCallsLimit === -1 ? '∞' : provider.aiCallsLimit}
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
                            <span>{quotaPercent}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                quotaPercent >= 100 ? 'bg-red-500' :
                                quotaPercent > 80 ? 'bg-amber-500' : 'bg-green-500'
                              )}
                              style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Dernier appel */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {provider.aiLastCallAt
                          ? provider.aiLastCallAt.toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
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
                          Reset
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
    </div>
  );
};

export default IaQuotasTab;
