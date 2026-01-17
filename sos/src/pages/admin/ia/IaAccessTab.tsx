/**
 * IaAccessTab - Gestion des acces IA pour les prestataires
 * Permet de donner/retirer l'acces IA sans abonnement (forcedAIAccess)
 * Avec filtres, recherche, bulk actions, details provider
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import { useApp } from '../../../contexts/AppContext';
import { getDateLocale } from '../../../utils/formatters';
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
  Clock,
  Eye,
  RotateCcw,
  CheckSquare,
  Square,
  Activity,
  Mail,
  ChevronDown,
  ChevronUp,
  ExternalLink
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
  forced: { label: 'Acces admin', color: 'bg-purple-100 text-purple-700', icon: <Shield className="w-3 h-3" /> },
  none: { label: 'Aucun', color: 'bg-gray-100 text-gray-600', icon: <X className="w-3 h-3" /> }
};

const ROLE_LABELS: Record<string, string> = {
  lawyer: 'Avocat',
  expat_aidant: 'Expatrie',
  expat: 'Expatrie'
};

// ============================================================================
// PROVIDER DETAIL MODAL
// ============================================================================

interface ProviderDetailModalProps {
  provider: ProviderIAAccess | null;
  onClose: () => void;
  onResetQuota: (provider: ProviderIAAccess) => void;
  language: string;
}

const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({ provider, onClose, onResetQuota, language }) => {
  if (!provider) return null;

  const quotaPercent = provider.aiCallsLimit > 0
    ? Math.round((provider.aiCallsUsed / provider.aiCallsLimit) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Details Prestataire</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info de base */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">{provider.displayName}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{provider.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{ROLE_LABELS[provider.role] || provider.role}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Inscrit le {provider.createdAt.toLocaleDateString(getDateLocale(language))}</span>
              </div>
              {provider.lastLoginAt && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Derniere connexion: {provider.lastLoginAt.toLocaleDateString(getDateLocale(language))}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statut acces */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Statut Acces IA</h4>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn(
                'px-3 py-1 rounded-full text-sm flex items-center gap-1',
                ACCESS_STATUS_LABELS[provider.accessStatus].color
              )}>
                {ACCESS_STATUS_LABELS[provider.accessStatus].icon}
                {ACCESS_STATUS_LABELS[provider.accessStatus].label}
              </span>
              {provider.forcedAIAccess && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                  Acces force
                </span>
              )}
            </div>
            {provider.accessStatus === 'trial' && provider.freeTrialUntil && (
              <p className="text-sm text-gray-600">
                Essai jusqu'au {provider.freeTrialUntil.toLocaleDateString(getDateLocale(language))}
              </p>
            )}
            {provider.subscriptionTier && provider.subscriptionTier !== 'trial' && (
              <p className="text-sm text-gray-600">
                Plan: <span className="font-medium capitalize">{provider.subscriptionTier}</span>
              </p>
            )}
          </div>

          {/* Usage IA */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Usage IA ce mois</h4>
              <button
                onClick={() => onResetQuota(provider)}
                disabled={provider.aiCallsUsed === 0}
                className={cn(
                  'px-3 py-1 text-sm rounded flex items-center gap-1 transition-colors',
                  provider.aiCallsUsed === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                )}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Appels utilises</span>
                <span className="font-medium">
                  {provider.aiCallsUsed} / {provider.aiCallsLimit === -1 ? 'Illimite' : provider.aiCallsLimit}
                </span>
              </div>
              {provider.aiCallsLimit !== -1 && (
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
              )}
              {provider.aiQuotaResetAt && (
                <p className="text-xs text-gray-500">
                  Dernier reset: {provider.aiQuotaResetAt.toLocaleDateString(getDateLocale(language))}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export const IaAccessTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();
  const { language } = useApp();

  // State
  const [providers, setProviders] = useState<ProviderIAAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // Modal
  const [detailProvider, setDetailProvider] = useState<ProviderIAAccess | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<IAAccessStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'lawyer' | 'expat_aidant'>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'high' | 'low' | 'none'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      const providersList: ProviderIAAccess[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

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

      providersList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setProviders(providersList);
    } catch (err) {
      console.error('Error loading providers:', err);
      setError((err as Error).message || iaT.errorLoading);
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
    } catch (err) {
      console.error('Error toggling access:', err);
      setError((err as Error).message || iaT.errorModification);
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
    } catch (err) {
      console.error('Error setting trial:', err);
      setError((err as Error).message || iaT.errorModification);
    } finally {
      setSaving(null);
    }
  };

  const resetQuota = async (provider: ProviderIAAccess) => {
    setSaving(provider.id);
    setError(null);

    try {
      await updateDoc(doc(db, 'users', provider.id), {
        aiCallsUsed: 0,
        aiQuotaResetAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setProviders(prev => prev.map(p =>
        p.id === provider.id ? { ...p, aiCallsUsed: 0, aiQuotaResetAt: new Date() } : p
      ));

      setSuccess(`${iaT.quotaReset} - ${provider.displayName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error resetting quota:', err);
      setError((err as Error).message || iaT.errorReset);
    } finally {
      setSaving(null);
    }
  };

  // Bulk reset quota
  const bulkResetQuota = async () => {
    if (selectedIds.size === 0) return;

    setBulkSaving(true);
    setError(null);

    try {
      const promises = Array.from(selectedIds).map(id =>
        updateDoc(doc(db, 'users', id), {
          aiCallsUsed: 0,
          aiQuotaResetAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );

      await Promise.all(promises);

      setProviders(prev => prev.map(p =>
        selectedIds.has(p.id) ? { ...p, aiCallsUsed: 0, aiQuotaResetAt: new Date() } : p
      ));

      setSuccess(`Quota reinitialise pour ${selectedIds.size} prestataire(s)`);
      setSelectedIds(new Set());
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error bulk resetting quotas:', err);
      setError((err as Error).message || 'Erreur lors du reset en masse');
    } finally {
      setBulkSaving(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredProviders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProviders.map(p => p.id)));
    }
  };

  // ============================================================================
  // FILTERED & SORTED DATA
  // ============================================================================

  const filteredProviders = useMemo(() => {
    let result = providers.filter(p => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!p.email.toLowerCase().includes(query) &&
            !p.displayName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Access filter
      if (accessFilter !== 'all' && p.accessStatus !== accessFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && p.role !== roleFilter) {
        return false;
      }

      // Usage filter
      if (usageFilter !== 'all') {
        const usagePercent = p.aiCallsLimit > 0 ? (p.aiCallsUsed / p.aiCallsLimit) * 100 : 0;
        if (usageFilter === 'high' && usagePercent <= 80) return false;
        if (usageFilter === 'low' && (usagePercent > 50 || usagePercent === 0)) return false;
        if (usageFilter === 'none' && p.aiCallsUsed !== 0) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'usage':
          comparison = a.aiCallsUsed - b.aiCallsUsed;
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [providers, searchQuery, accessFilter, roleFilter, usageFilter, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => ({
    total: providers.length,
    withAccess: providers.filter(p => p.accessStatus !== 'none').length,
    subscription: providers.filter(p => p.accessStatus === 'subscription').length,
    trial: providers.filter(p => p.accessStatus === 'trial').length,
    forced: providers.filter(p => p.accessStatus === 'forced').length,
    none: providers.filter(p => p.accessStatus === 'none').length
  }), [providers]);

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
          <div className="text-sm text-green-600">Abonnes</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-2xl font-bold text-blue-700">{stats.trial}</div>
          <div className="text-sm text-blue-600">En essai</div>
        </div>
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="text-2xl font-bold text-purple-700">{stats.forced}</div>
          <div className="text-sm text-purple-600">Acces admin</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-700">{stats.none}</div>
          <div className="text-sm text-gray-500">Sans acces</div>
        </div>
      </div>

      {/* Alerts */}
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
              aria-label="Rechercher par nom ou email"
            />
          </div>

          {/* Filtre acces */}
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value as IAAccessStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            aria-label="Filtrer par acces"
          >
            <option value="all">{iaT.allAccess}</option>
            <option value="subscription">{iaT.subscription}</option>
            <option value="trial">{iaT.trial}</option>
            <option value="forced">{iaT.adminAccess}</option>
            <option value="none">{iaT.noAccess}</option>
          </select>

          {/* Filtre role */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'lawyer' | 'expat_aidant')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            aria-label="Filtrer par type"
          >
            <option value="all">{iaT.allTypes}</option>
            <option value="lawyer">{iaT.lawyer}</option>
            <option value="expat_aidant">{iaT.expat}</option>
          </select>

          {/* Toggle more filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-3 py-2 rounded-lg flex items-center gap-2 transition-colors',
              showFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Filter className="w-4 h-4" />
            Plus de filtres
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Refresh */}
          <button
            onClick={loadProviders}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Rafraichir"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Filtres avances */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Usage:</span>
              <select
                value={usageFilter}
                onChange={(e) => setUsageFilter(e.target.value as typeof usageFilter)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous</option>
                <option value="high">Eleve (&gt;80%)</option>
                <option value="low">Faible (1-50%)</option>
                <option value="none">Aucun usage</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Trier par:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="createdAt">Date inscription</option>
                <option value="name">Nom</option>
                <option value="usage">Usage IA</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                aria-label={sortOrder === 'asc' ? 'Tri decroissant' : 'Tri croissant'}
              >
                {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>{filteredProviders.length} prestataire(s) affiche(s)</span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-indigo-600">{selectedIds.size} selectionne(s)</span>
              <button
                onClick={bulkResetQuota}
                disabled={bulkSaving}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                {bulkSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Reset quota
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={selectAll}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    aria-label="Tout selectionner"
                  >
                    {selectedIds.size === filteredProviders.length && filteredProviders.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.provider}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.type}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.accessStatus}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.aiQuota}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {iaT.adminToggle}
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
                  const statusInfo = ACCESS_STATUS_LABELS[provider.accessStatus];
                  const quotaPercent = provider.aiCallsLimit > 0
                    ? Math.round((provider.aiCallsUsed / provider.aiCallsLimit) * 100)
                    : 0;

                  return (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      {/* Checkbox */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleSelection(provider.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {selectedIds.has(provider.id) ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>

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

                      {/* Statut acces */}
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
                              jusqu'au {provider.freeTrialUntil.toLocaleDateString(getDateLocale(language))}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quota */}
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>{provider.aiCallsUsed}</span>
                            <span>{provider.aiCallsLimit === -1 ? '?' : provider.aiCallsLimit}</span>
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

                      {/* Toggle acces admin */}
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
                          title={provider.forcedAIAccess ? 'Retirer acces admin' : 'Donner acces admin'}
                          aria-label={provider.forcedAIAccess ? 'Retirer acces admin' : 'Donner acces admin'}
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
                          {/* Voir details */}
                          <button
                            onClick={() => setDetailProvider(provider)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Voir details"
                            aria-label="Voir details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
                          {/* Reset quota */}
                          <button
                            onClick={() => resetQuota(provider)}
                            disabled={saving === provider.id || provider.aiCallsUsed === 0}
                            className={cn(
                              'p-2 rounded transition-colors',
                              provider.aiCallsUsed === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                            )}
                            title="Reset quota"
                            aria-label="Reset quota"
                          >
                            <RotateCcw className="w-4 h-4" />
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

      {/* Provider Detail Modal */}
      <ProviderDetailModal
        provider={detailProvider}
        onClose={() => setDetailProvider(null)}
        onResetQuota={(p) => {
          resetQuota(p);
          setDetailProvider(null);
        }}
        language={language}
      />
    </div>
  );
};

export default IaAccessTab;
