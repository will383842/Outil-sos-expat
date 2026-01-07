/**
 * IaMultiProvidersTab - Gestion des comptes avec plusieurs prestataires
 * Permet de lier/délier des prestataires à un compte utilisateur
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import {
  Users,
  Search,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  User,
  Scale,
  Globe,
  Link2,
  Unlink,
  Plus,
  X,
  UserPlus,
  Phone,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { cn } from '../../../utils/cn';
import { MultiProviderAccount } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface SearchResult {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  type?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const IaMultiProvidersTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();

  // State
  const [accounts, setAccounts] = useState<MultiProviderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Expansion state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minProviders, setMinProviders] = useState<number>(1);

  // Modal pour lier des prestataires
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkStep, setLinkStep] = useState<1 | 2>(1);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<SearchResult | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<SearchResult[]>([]);
  const [providerSearchResults, setProviderSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const accountsList: MultiProviderAccount[] = [];

      for (const docSnap of usersSnapshot.docs) {
        const data = docSnap.data();
        const linkedIds: string[] = data.linkedProviderIds || [];

        if (linkedIds.length >= 1) {
          const providersDetails: MultiProviderAccount['providers'] = [];

          for (const providerId of linkedIds) {
            try {
              const providerDoc = await getDoc(doc(db, 'providers', providerId));
              if (providerDoc.exists()) {
                const providerData = providerDoc.data();
                providersDetails.push({
                  id: providerId,
                  name: providerData.name || providerData.displayName || 'N/A',
                  type: providerData.type || 'lawyer',
                  isActive: data.activeProviderId === providerId
                });
              } else {
                const userProviderDoc = await getDoc(doc(db, 'users', providerId));
                if (userProviderDoc.exists()) {
                  const userProviderData = userProviderDoc.data();
                  providersDetails.push({
                    id: providerId,
                    name: userProviderData.displayName || `${userProviderData.firstName || ''} ${userProviderData.lastName || ''}`.trim() || 'N/A',
                    type: userProviderData.role === 'expat_aidant' ? 'expat' : 'lawyer',
                    isActive: data.activeProviderId === providerId
                  });
                }
              }
            } catch (err) {
              console.warn(`Could not load provider ${providerId}:`, err);
            }
          }

          accountsList.push({
            userId: docSnap.id,
            email: data.email || '',
            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
            linkedProviderIds: linkedIds,
            activeProviderId: data.activeProviderId,
            providersCount: linkedIds.length,
            providers: providersDetails,
            createdAt: data.createdAt?.toDate() || new Date(),
            shareBusyStatus: data.shareBusyStatus || false
          });
        }
      }

      accountsList.sort((a, b) => b.providersCount - a.providersCount);
      setAccounts(accountsList);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
      setError(err.message || iaT.errorLoading);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ============================================================================
  // SEARCH FUNCTIONS
  // ============================================================================

  const searchUsers = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const results: SearchResult[] = [];
      const term = searchTerm.toLowerCase();

      usersSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const email = (data.email || '').toLowerCase();
        const displayName = (data.displayName || `${data.firstName || ''} ${data.lastName || ''}`).toLowerCase();

        if (email.includes(term) || displayName.includes(term)) {
          results.push({
            id: docSnap.id,
            email: data.email || '',
            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
            role: data.role
          });
        }
      });

      setUserSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const searchProviders = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setProviderSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results: SearchResult[] = [];
      const term = searchTerm.toLowerCase();

      // Chercher dans la collection providers
      const providersSnapshot = await getDocs(collection(db, 'providers'));
      providersSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const name = (data.name || data.displayName || '').toLowerCase();
        const email = (data.email || '').toLowerCase();

        if (name.includes(term) || email.includes(term)) {
          results.push({
            id: docSnap.id,
            email: data.email || '',
            displayName: data.name || data.displayName || 'N/A',
            type: data.type || 'lawyer'
          });
        }
      });

      // Chercher aussi dans users avec role prestataire
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.role === 'lawyer' || data.role === 'expat_aidant' || data.role === 'provider') {
          const displayName = (data.displayName || `${data.firstName || ''} ${data.lastName || ''}`).toLowerCase();
          const email = (data.email || '').toLowerCase();

          if (displayName.includes(term) || email.includes(term)) {
            // Éviter les doublons
            if (!results.find(r => r.id === docSnap.id)) {
              results.push({
                id: docSnap.id,
                email: data.email || '',
                displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
                type: data.role === 'expat_aidant' ? 'expat' : 'lawyer'
              });
            }
          }
        }
      });

      setProviderSearchResults(results.slice(0, 10));
    } catch (err) {
      console.error('Error searching providers:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (linkStep === 1) {
        searchUsers(userSearchQuery);
      } else {
        searchProviders(providerSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, providerSearchQuery, linkStep, searchUsers, searchProviders]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const linkProvider = async () => {
    if (!selectedUser || !selectedProvider) return;

    setSaving('linking');
    setError(null);

    try {
      // Vérifier si le provider n'est pas déjà lié
      const userDoc = await getDoc(doc(db, 'users', selectedUser.id));
      const userData = userDoc.data();
      const existingLinks: string[] = userData?.linkedProviderIds || [];

      if (existingLinks.includes(selectedProvider.id)) {
        setError('Ce prestataire est déjà lié à ce compte');
        setSaving(null);
        return;
      }

      // Ajouter le lien
      await updateDoc(doc(db, 'users', selectedUser.id), {
        linkedProviderIds: arrayUnion(selectedProvider.id),
        // Si c'est le premier prestataire, le définir comme actif
        ...(existingLinks.length === 0 && { activeProviderId: selectedProvider.id }),
        updatedAt: serverTimestamp()
      });

      setSuccess(`Prestataire "${selectedProvider.displayName}" lié au compte "${selectedUser.displayName}"`);
      setTimeout(() => setSuccess(null), 5000);

      // Reset et fermer
      closeLinkModal();
      loadAccounts();
    } catch (err: any) {
      console.error('Error linking provider:', err);
      setError(err.message || iaT.errorLinking);
    } finally {
      setSaving(null);
    }
  };

  const setActiveProvider = async (account: MultiProviderAccount, providerId: string) => {
    setSaving(account.userId);
    setError(null);

    try {
      await updateDoc(doc(db, 'users', account.userId), {
        activeProviderId: providerId,
        updatedAt: serverTimestamp()
      });

      setAccounts(prev => prev.map(a => {
        if (a.userId === account.userId) {
          return {
            ...a,
            activeProviderId: providerId,
            providers: a.providers.map(p => ({
              ...p,
              isActive: p.id === providerId
            }))
          };
        }
        return a;
      }));

      setSuccess(iaT.activeProviderUpdated);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error setting active provider:', err);
      setError(err.message || iaT.errorModification);
    } finally {
      setSaving(null);
    }
  };

  const unlinkProvider = async (account: MultiProviderAccount, providerId: string) => {
    if (account.linkedProviderIds.length <= 1) {
      setError('Impossible de retirer le dernier prestataire');
      return;
    }

    setSaving(account.userId);
    setError(null);

    try {
      const newLinkedIds = account.linkedProviderIds.filter(id => id !== providerId);
      const newActiveId = account.activeProviderId === providerId
        ? newLinkedIds[0]
        : account.activeProviderId;

      await updateDoc(doc(db, 'users', account.userId), {
        linkedProviderIds: newLinkedIds,
        activeProviderId: newActiveId,
        updatedAt: serverTimestamp()
      });

      setAccounts(prev => prev.map(a => {
        if (a.userId === account.userId) {
          return {
            ...a,
            linkedProviderIds: newLinkedIds,
            activeProviderId: newActiveId,
            providersCount: newLinkedIds.length,
            providers: a.providers.filter(p => p.id !== providerId).map(p => ({
              ...p,
              isActive: p.id === newActiveId
            }))
          };
        }
        return a;
      }));

      setSuccess(iaT.providerUnlinked);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error unlinking provider:', err);
      setError(err.message || iaT.errorUnlinking);
    } finally {
      setSaving(null);
    }
  };

  /**
   * Toggle shareBusyStatus - Quand activé, tous les prestataires liés
   * passent en "busy" quand l'un d'eux est en appel
   */
  const toggleShareBusyStatus = async (account: MultiProviderAccount) => {
    setSaving(account.userId);
    setError(null);

    try {
      const newValue = !account.shareBusyStatus;

      await updateDoc(doc(db, 'users', account.userId), {
        shareBusyStatus: newValue,
        updatedAt: serverTimestamp()
      });

      setAccounts(prev => prev.map(a => {
        if (a.userId === account.userId) {
          return { ...a, shareBusyStatus: newValue };
        }
        return a;
      }));

      setSuccess(newValue
        ? 'Statut occupé partagé activé - Tous les prestataires seront busy ensemble'
        : 'Statut occupé partagé désactivé - Prestataires indépendants'
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling shareBusyStatus:', err);
      setError(err.message || 'Erreur lors de la modification');
    } finally {
      setSaving(null);
    }
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setLinkStep(1);
    setSelectedUser(null);
    setSelectedProvider(null);
    setUserSearchQuery('');
    setProviderSearchQuery('');
    setUserSearchResults([]);
    setProviderSearchResults([]);
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const filteredAccounts = accounts.filter(a => {
    if (a.providersCount < minProviders) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!a.email.toLowerCase().includes(query) &&
          !a.displayName.toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  });

  const stats = {
    total: accounts.length,
    withMultiple: accounts.filter(a => a.providersCount >= 2).length,
    with3Plus: accounts.filter(a => a.providersCount >= 3).length,
    totalLinks: accounts.reduce((acc, a) => acc + a.providersCount, 0)
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
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-gray-500">Comptes avec liens</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-600">Multi-prestataires (2+)</span>
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.withMultiple}</div>
        </div>
        <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-indigo-600">3+ prestataires</span>
          </div>
          <div className="text-2xl font-bold text-indigo-700">{stats.with3Plus}</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-500">Total liens</span>
          </div>
          <div className="text-2xl font-bold text-gray-700">{stats.totalLinks}</div>
        </div>
      </div>

      {/* Bouton Lier des prestataires */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Lier des prestataires</h3>
            <p className="text-indigo-100 text-sm">
              Permet à un utilisateur de gérer plusieurs profils prestataires depuis un seul compte
            </p>
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Lier un prestataire
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Minimum :</span>
            <select
              value={minProviders}
              onChange={(e) => setMinProviders(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>1+ prestataire</option>
              <option value={2}>2+ prestataires</option>
              <option value={3}>3+ prestataires</option>
            </select>
          </div>

          <button
            onClick={loadAccounts}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="mt-2 text-sm text-gray-500">
          {filteredAccounts.length} compte(s) affiché(s)
        </div>
      </div>

      {/* Liste des comptes */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">{adminT.loading}</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">{iaT.noAccountFound}</p>
            <p className="text-sm text-gray-400 mt-1">
              Utilisez le bouton "Lier un prestataire" pour créer un lien
            </p>
          </div>
        ) : (
          filteredAccounts.map((account) => {
            const isExpanded = expandedId === account.userId;

            return (
              <div
                key={account.userId}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : account.userId)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{account.displayName}</div>
                      <div className="text-sm text-gray-500">{account.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-indigo-600">
                        {account.providersCount} prestataire(s)
                      </div>
                      <div className="text-xs text-gray-500">
                        Actif : {account.providers.find(p => p.isActive)?.name || 'N/A'}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                    {/* Toggle pour partager le statut busy entre prestataires */}
                    {account.providersCount >= 2 && (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'p-2 rounded-lg',
                              account.shareBusyStatus ? 'bg-orange-100' : 'bg-gray-100'
                            )}>
                              <Phone className={cn(
                                'w-4 h-4',
                                account.shareBusyStatus ? 'text-orange-600' : 'text-gray-500'
                              )} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                Partager le statut "Occupé"
                              </div>
                              <div className="text-xs text-gray-500">
                                {account.shareBusyStatus
                                  ? 'Tous les prestataires sont busy quand l\'un est en appel'
                                  : 'Chaque prestataire est indépendant'
                                }
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleShareBusyStatus(account)}
                            disabled={saving === account.userId}
                            className={cn(
                              'p-1 rounded-lg transition-colors',
                              saving === account.userId && 'opacity-50 cursor-wait'
                            )}
                          >
                            {account.shareBusyStatus ? (
                              <ToggleRight className="w-10 h-10 text-orange-500" />
                            ) : (
                              <ToggleLeft className="w-10 h-10 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-700">
                        Prestataires liés :
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser({
                            id: account.userId,
                            email: account.email,
                            displayName: account.displayName
                          });
                          setLinkStep(2);
                          setShowLinkModal(true);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter un prestataire
                      </button>
                    </div>
                    <div className="space-y-2">
                      {account.providers.map((provider) => (
                        <div
                          key={provider.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg',
                            provider.isActive ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-gray-200'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'p-2 rounded-lg',
                              provider.type === 'lawyer' ? 'bg-blue-100' : 'bg-green-100'
                            )}>
                              {provider.type === 'lawyer' ? (
                                <Scale className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Globe className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{provider.name}</div>
                              <div className="text-xs text-gray-500">
                                {provider.type === 'lawyer' ? 'Avocat' : 'Expatrié'} • ID: {provider.id.slice(0, 8)}...
                              </div>
                            </div>
                            {provider.isActive && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                Actif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!provider.isActive && (
                              <button
                                onClick={() => setActiveProvider(account, provider.id)}
                                disabled={saving === account.userId}
                                className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                              >
                                Définir actif
                              </button>
                            )}
                            <button
                              onClick={() => unlinkProvider(account, provider.id)}
                              disabled={saving === account.userId || account.providersCount <= 1}
                              className={cn(
                                'p-1 rounded transition-colors',
                                account.providersCount <= 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-500 hover:bg-red-50'
                              )}
                              title="Délier ce prestataire"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de liaison */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Lier un prestataire
                </h3>
                <p className="text-sm text-gray-500">
                  Étape {linkStep}/2 : {linkStep === 1 ? 'Sélectionner le compte utilisateur' : 'Sélectionner le prestataire à lier'}
                </p>
              </div>
              <button
                onClick={closeLinkModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {linkStep === 1 ? (
                <>
                  {/* Étape 1: Sélectionner l'utilisateur */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rechercher un utilisateur (compte principal)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Email ou nom..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Résultats de recherche */}
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searching && (
                      <div className="text-center py-4 text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1" />
                        {iaT.searching}
                      </div>
                    )}
                    {!searching && userSearchQuery.length >= 2 && userSearchResults.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        {adminT.noResults}
                      </div>
                    )}
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setLinkStep(2);
                        }}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.role && (
                          <span className="text-xs text-gray-400">Role: {user.role}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {userSearchQuery.length < 2 && (
                    <p className="text-sm text-gray-400 text-center mt-4">
                      {iaT.minChars}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* Étape 2: Sélectionner le prestataire */}
                  <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                    <div className="text-sm text-indigo-600 mb-1">Compte sélectionné :</div>
                    <div className="font-medium text-indigo-900">{selectedUser?.displayName}</div>
                    <div className="text-sm text-indigo-700">{selectedUser?.email}</div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rechercher un prestataire à lier
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nom du cabinet, email..."
                        value={providerSearchQuery}
                        onChange={(e) => setProviderSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Résultats de recherche prestataires */}
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searching && (
                      <div className="text-center py-4 text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1" />
                        {iaT.searching}
                      </div>
                    )}
                    {!searching && providerSearchQuery.length >= 2 && providerSearchResults.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        {adminT.noResults}
                      </div>
                    )}
                    {providerSearchResults.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider)}
                        className={cn(
                          'w-full p-3 text-left border rounded-lg transition-colors',
                          selectedProvider?.id === provider.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg',
                            provider.type === 'lawyer' ? 'bg-blue-100' : 'bg-green-100'
                          )}>
                            {provider.type === 'lawyer' ? (
                              <Scale className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Globe className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{provider.displayName}</div>
                            <div className="text-sm text-gray-500">{provider.email}</div>
                            <div className="text-xs text-gray-400">
                              {provider.type === 'lawyer' ? 'Avocat' : 'Expatrié'} • ID: {provider.id.slice(0, 12)}...
                            </div>
                          </div>
                          {selectedProvider?.id === provider.id && (
                            <Check className="w-5 h-5 text-indigo-600 ml-auto" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {providerSearchQuery.length < 2 && (
                    <p className="text-sm text-gray-400 text-center mt-4">
                      {iaT.minChars}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => {
                  if (linkStep === 2) {
                    setLinkStep(1);
                    setSelectedProvider(null);
                    setProviderSearchQuery('');
                  } else {
                    closeLinkModal();
                  }
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {linkStep === 2 ? 'Retour' : 'Annuler'}
              </button>

              {linkStep === 2 && (
                <button
                  onClick={linkProvider}
                  disabled={!selectedProvider || saving === 'linking'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving === 'linking' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  Lier ce prestataire
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IaMultiProvidersTab;
