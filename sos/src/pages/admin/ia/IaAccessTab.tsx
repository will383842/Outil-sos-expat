/**
 * IaAccessTab - Gestion des accès IA pour les prestataires
 * Permet de donner/retirer l'accès IA sans abonnement (forcedAIAccess)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Check,
  X,
  Shield,
  Sparkles,
  Crown,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Clock
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
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { cn } from '../../../utils/cn';
import { ProviderIAAccess, IAAccessStatus } from './types';

// ============================================================================
// CONSTANTES
// ============================================================================

const ACCESS_STATUS_LABELS: Record<IAAccessStatus, { label: string; color: string; icon: React.ReactNode }> = {
  subscription: { label: 'Abonnement', color: 'bg-green-100 text-green-700', icon: <Crown className="w-3 h-3" /> },
  trial: { label: 'Essai', color: 'bg-blue-100 text-blue-700', icon: <Sparkles className="w-3 h-3" /> },
  forced: { label: 'Accès admin', color: 'bg-purple-100 text-purple-700', icon: <Shield className="w-3 h-3" /> },
  none: { label: 'Aucun', color: 'bg-gray-100 text-gray-600', icon: <X className="w-3 h-3" /> }
};

const ROLE_LABELS: Record<string, string> = {
  lawyer: 'Avocat',
  expat_aidant: 'Expatrié',
  expat: 'Expatrié'
};

// ============================================================================
// COMPONENT
// ============================================================================

export const IaAccessTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();

  // State
  const [providers, setProviders] = useState<ProviderIAAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<IAAccessStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'lawyer' | 'expat_aidant'>('all');

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
      const providersList: ProviderIAAccess[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Déterminer le statut d'accès
        let accessStatus: IAAccessStatus = 'none';
        if (data.forcedAIAccess === true) {
          accessStatus = 'forced';
        } else if (data.subscriptionStatus === 'active') {
          accessStatus = 'subscription';
        } else if (data.subscriptionStatus === 'trialing' ||
                   (data.freeTrialUntil && data.freeTrialUntil.toDate() > new Date())) {
          accessStatus = 'trial';
        }

        providersList.push({
          id: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role === 'provider' ? (data.providerType || 'lawyer') : data.role,
          accessStatus,
          forcedAIAccess: data.forcedAIAccess === true,
          freeTrialUntil: data.freeTrialUntil?.toDate() || null,
          subscriptionStatus: data.subscriptionStatus,
          subscriptionTier: data.subscriptionTier,
          aiCallsUsed: data.aiCallsUsed || 0,
          aiCallsLimit: data.aiCallsLimit || 100,
          aiQuotaResetAt: data.aiQuotaResetAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate()
        });
      }

      // Tri côté client par createdAt décroissant
      providersList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

  const toggleForcedAccess = async (provider: ProviderIAAccess) => {
    setSaving(provider.id);
    setError(null);

    try {
      const newValue = !provider.forcedAIAccess;

      await updateDoc(doc(db, 'users', provider.id), {
        forcedAIAccess: newValue,
        forcedAIAccessUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Mettre à jour l'état local
      setProviders(prev => prev.map(p => {
        if (p.id === provider.id) {
          const newAccessStatus: IAAccessStatus = newValue ? 'forced' :
            (p.subscriptionStatus === 'active' ? 'subscription' :
             p.subscriptionStatus === 'trialing' ? 'trial' : 'none');
          return {
            ...p,
            forcedAIAccess: newValue,
            accessStatus: newAccessStatus
          };
        }
        return p;
      }));

      setSuccess(`${newValue ? iaT.accessGranted : iaT.accessRemoved} - ${provider.displayName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling access:', err);
      setError(err.message || iaT.errorModification);
    } finally {
      setSaving(null);
    }
  };

  const setTrialDate = async (provider: ProviderIAAccess, days: number) => {
    setSaving(provider.id);
    setError(null);

    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + days);

      await updateDoc(doc(db, 'users', provider.id), {
        freeTrialUntil: Timestamp.fromDate(trialEnd),
        updatedAt: serverTimestamp()
      });

      // Mettre à jour l'état local
      setProviders(prev => prev.map(p => {
        if (p.id === provider.id) {
          return {
            ...p,
            freeTrialUntil: trialEnd,
            accessStatus: p.forcedAIAccess ? 'forced' : 'trial'
          };
        }
        return p;
      }));

      setSuccess(`${iaT.trialGranted} - ${days} ${iaT.days} - ${provider.displayName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error setting trial:', err);
      setError(err.message || iaT.errorModification);
    } finally {
      setSaving(null);
    }
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

    // Filtre accès
    if (accessFilter !== 'all' && p.accessStatus !== accessFilter) {
      return false;
    }

    // Filtre rôle
    if (roleFilter !== 'all' && p.role !== roleFilter) {
      return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: providers.length,
    withAccess: providers.filter(p => p.accessStatus !== 'none').length,
    subscription: providers.filter(p => p.accessStatus === 'subscription').length,
    trial: providers.filter(p => p.accessStatus === 'trial').length,
    forced: providers.filter(p => p.accessStatus === 'forced').length,
    none: providers.filter(p => p.accessStatus === 'none').length
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total prestataires</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-2xl font-bold text-green-700">{stats.subscription}</div>
          <div className="text-sm text-green-600">Abonnés</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-2xl font-bold text-blue-700">{stats.trial}</div>
          <div className="text-sm text-blue-600">En essai</div>
        </div>
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="text-2xl font-bold text-purple-700">{stats.forced}</div>
          <div className="text-sm text-purple-600">Accès admin</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-700">{stats.none}</div>
          <div className="text-sm text-gray-500">Sans accès</div>
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

          {/* Filtre accès */}
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value as IAAccessStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les accès</option>
            <option value="subscription">Abonnement</option>
            <option value="trial">Essai</option>
            <option value="forced">Accès admin</option>
            <option value="none">Sans accès</option>
          </select>

          {/* Filtre rôle */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'lawyer' | 'expat_aidant')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les types</option>
            <option value="lawyer">Avocats</option>
            <option value="expat_aidant">Expatriés</option>
          </select>

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
          {filteredProviders.length} prestataire(s) affiché(s)
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
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut accès
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quota IA
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Accès admin
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
                  const statusInfo = ACCESS_STATUS_LABELS[provider.accessStatus];
                  const quotaPercent = provider.aiCallsLimit > 0
                    ? Math.round((provider.aiCallsUsed / provider.aiCallsLimit) * 100)
                    : 0;

                  return (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      {/* Prestataire */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{provider.displayName}</div>
                          <div className="text-sm text-gray-500">{provider.email}</div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {ROLE_LABELS[provider.role] || provider.role}
                        </span>
                      </td>

                      {/* Statut accès */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'px-2 py-1 rounded text-sm flex items-center gap-1',
                            statusInfo.color
                          )}>
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                          {provider.accessStatus === 'trial' && provider.freeTrialUntil && (
                            <span className="text-xs text-gray-500">
                              jusqu'au {provider.freeTrialUntil.toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quota */}
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>{provider.aiCallsUsed}</span>
                            <span>{provider.aiCallsLimit === -1 ? '∞' : provider.aiCallsLimit}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all',
                                quotaPercent > 90 ? 'bg-red-500' :
                                quotaPercent > 70 ? 'bg-amber-500' : 'bg-green-500'
                              )}
                              style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Toggle accès admin */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleForcedAccess(provider)}
                          disabled={saving === provider.id}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            provider.forcedAIAccess
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}
                          title={provider.forcedAIAccess ? 'Retirer accès admin' : 'Donner accès admin'}
                        >
                          {saving === provider.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : provider.forcedAIAccess ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Donner essai 7 jours */}
                          <button
                            onClick={() => setTrialDate(provider, 7)}
                            disabled={saving === provider.id}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                            title="Donner 7 jours d'essai"
                          >
                            +7j
                          </button>
                          {/* Donner essai 30 jours */}
                          <button
                            onClick={() => setTrialDate(provider, 30)}
                            disabled={saving === provider.id}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                            title="Donner 30 jours d'essai"
                          >
                            +30j
                          </button>
                        </div>
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

export default IaAccessTab;
