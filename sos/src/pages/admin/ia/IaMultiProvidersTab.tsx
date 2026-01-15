/**
 * IaMultiProvidersTab - Gestion simplifiée des comptes multi-prestataires
 *
 * Permet à l'admin de :
 * - Voir les comptes avec plusieurs prestataires liés
 * - Lier un nouveau prestataire à un compte
 * - Délier un prestataire
 * - Définir le prestataire actif
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Check,
  AlertCircle,
  User,
  Link2,
  Unlink,
  Plus,
  X,
  Star,
  Loader2,
  Scale,
  Globe
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
  limit,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAdminReferenceData } from '../../../hooks/useAdminReferenceData';
import { cn } from '../../../utils/cn';

// ============================================================================
// TYPES
// ============================================================================

interface Provider {
  id: string;
  name: string;
  email: string;
  type: 'lawyer' | 'expat';
  isActive: boolean;
}

interface MultiProviderAccount {
  userId: string;
  email: string;
  displayName: string;
  providers: Provider[];
  activeProviderId?: string;
}

interface AvailableProvider {
  id: string;
  name: string;
  email: string;
  type: 'lawyer' | 'expat';
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  linkedProviderIds: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export const IaMultiProvidersTab: React.FC = () => {
  // COST OPTIMIZATION: Use shared admin reference data cache
  const { usersMap, profilesMap, isLoading: refDataLoading } = useAdminReferenceData();

  // Data
  const [accounts, setAccounts] = useState<MultiProviderAccount[]>([]);
  const [allProviders, setAllProviders] = useState<AvailableProvider[]>([]);
  const [allUsers, setAllUsers] = useState<AvailableUser[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    // Wait for reference data to be loaded
    if (refDataLoading || profilesMap.size === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // COST OPTIMIZATION: Only load users (needed for linkedProviderIds/activeProviderId)
      // Profiles data comes from shared cache (useAdminReferenceData)
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));

      // Construire la liste des comptes multi-prestataires
      const accountsList: MultiProviderAccount[] = [];
      const providersList: AvailableProvider[] = [];
      const usersList: AvailableUser[] = [];

      // D'abord, collecter tous les prestataires disponibles from cache
      profilesMap.forEach((profile) => {
        providersList.push({
          id: profile.id,
          name: profile.displayName || 'N/A',
          email: profile.email || '',
          type: profile.type
        });
      });

      // Ensuite, construire les comptes
      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        const linkedIds: string[] = data.linkedProviderIds || [];

        // Ajouter à la liste de tous les utilisateurs (pour le modal)
        usersList.push({
          id: docSnap.id,
          name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          email: data.email || '',
          linkedProviderIds: linkedIds
        });

        // Ne garder dans "accounts" que les comptes avec au moins 1 prestataire lié
        if (linkedIds.length === 0) continue;

        const providers: Provider[] = [];
        for (const pid of linkedIds) {
          // Use cached profile data
          const cachedProfile = profilesMap.get(pid);
          if (cachedProfile) {
            providers.push({
              id: pid,
              name: cachedProfile.displayName || 'N/A',
              email: cachedProfile.email || '',
              type: cachedProfile.type,
              isActive: data.activeProviderId === pid
            });
          } else {
            // Fallback: chercher dans usersMap (cache)
            const cachedUser = usersMap.get(pid);
            if (cachedUser) {
              providers.push({
                id: pid,
                name: cachedUser.displayName || 'N/A',
                email: cachedUser.email || '',
                type: cachedUser.type === 'expat_aidant' ? 'expat' : 'lawyer',
                isActive: data.activeProviderId === pid
              });
            }
          }
        }

        accountsList.push({
          userId: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          providers,
          activeProviderId: data.activeProviderId
        });
      }

      // Trier par nombre de prestataires décroissant
      accountsList.sort((a, b) => b.providers.length - a.providers.length);
      providersList.sort((a, b) => a.name.localeCompare(b.name));
      usersList.sort((a, b) => a.name.localeCompare(b.name));

      setAccounts(accountsList);
      setAllProviders(providersList);
      setAllUsers(usersList);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [refDataLoading, profilesMap, usersMap]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const setActiveProvider = async (account: MultiProviderAccount, providerId: string) => {
    setSaving(account.userId);
    try {
      await updateDoc(doc(db, 'users', account.userId), {
        activeProviderId: providerId,
        updatedAt: serverTimestamp()
      });

      setAccounts(prev => prev.map(a => {
        if (a.userId !== account.userId) return a;
        return {
          ...a,
          activeProviderId: providerId,
          providers: a.providers.map(p => ({ ...p, isActive: p.id === providerId }))
        };
      }));

      setSuccess('Prestataire actif mis à jour');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erreur lors de la mise à jour');
    } finally {
      setSaving(null);
    }
  };

  const unlinkProvider = async (account: MultiProviderAccount, providerId: string) => {
    if (account.providers.length <= 1) {
      setError('Impossible de retirer le dernier prestataire');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!confirm('Voulez-vous vraiment délier ce prestataire ?')) return;

    setSaving(account.userId);
    try {
      const newLinkedIds = account.providers.map(p => p.id).filter(id => id !== providerId);
      const newActiveId = account.activeProviderId === providerId ? newLinkedIds[0] : account.activeProviderId;

      await updateDoc(doc(db, 'users', account.userId), {
        linkedProviderIds: newLinkedIds,
        activeProviderId: newActiveId,
        updatedAt: serverTimestamp()
      });

      setAccounts(prev => prev.map(a => {
        if (a.userId !== account.userId) return a;
        return {
          ...a,
          activeProviderId: newActiveId,
          providers: a.providers.filter(p => p.id !== providerId).map(p => ({
            ...p,
            isActive: p.id === newActiveId
          }))
        };
      }));

      setSuccess('Prestataire délié');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Erreur lors de la suppression du lien');
    } finally {
      setSaving(null);
    }
  };

  const linkProvider = async () => {
    if (!selectedAccountId || !selectedProviderId) return;

    setSaving('modal');
    try {
      // Vérifier si déjà lié
      const userDoc = await getDoc(doc(db, 'users', selectedAccountId));
      const existingLinks: string[] = userDoc.data()?.linkedProviderIds || [];

      if (existingLinks.includes(selectedProviderId)) {
        setError('Ce prestataire est déjà lié à ce compte');
        setSaving(null);
        return;
      }

      await updateDoc(doc(db, 'users', selectedAccountId), {
        linkedProviderIds: arrayUnion(selectedProviderId),
        ...(existingLinks.length === 0 && { activeProviderId: selectedProviderId }),
        updatedAt: serverTimestamp()
      });

      setSuccess('Prestataire lié avec succès');
      setTimeout(() => setSuccess(null), 3000);
      closeModal();
      loadData();
    } catch (err: any) {
      setError('Erreur lors de la liaison');
    } finally {
      setSaving(null);
    }
  };

  // ============================================================================
  // MODAL
  // ============================================================================

  const openModal = (accountId?: string) => {
    setSelectedAccountId(accountId || '');
    setSelectedProviderId('');
    setModalStep(accountId ? 2 : 1);
    setModalSearch('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAccountId('');
    setSelectedProviderId('');
    setModalStep(1);
    setModalSearch('');
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredAccounts = accounts.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.displayName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.providers.some(p => p.name.toLowerCase().includes(q))
    );
  });

  // Pour le modal - tous les utilisateurs (pas seulement ceux avec prestataires)
  const filteredModalUsers = allUsers.filter(u => {
    if (!modalSearch) return true;
    const q = modalSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // Trouver les prestataires déjà liés au compte sélectionné
  const selectedUser = allUsers.find(u => u.id === selectedAccountId);
  const linkedProviderIds = selectedUser?.linkedProviderIds || [];

  const filteredModalProviders = allProviders
    .filter(p => !linkedProviderIds.includes(p.id))
    .filter(p => {
      if (!modalSearch) return true;
      const q = modalSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sos-red" />
            Comptes Multi-Prestataires
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {accounts.length} compte{accounts.length > 1 ? 's' : ''} avec prestataires liés
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>

          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-sos-red text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Lier un prestataire
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un compte ou prestataire..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sos-red focus:border-transparent"
        />
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-sos-red animate-spin" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun compte multi-prestataire trouvé</p>
          <button
            onClick={() => openModal()}
            className="mt-4 text-sos-red hover:underline"
          >
            Créer un premier lien
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => (
            <div
              key={account.userId}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Account Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {account.displayName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {account.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      {account.providers.length} prestataire{account.providers.length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => openModal(account.userId)}
                      className="p-1.5 text-gray-400 hover:text-sos-red rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Ajouter un prestataire"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Providers List */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {account.providers.map((provider) => (
                  <div
                    key={provider.id}
                    className={cn(
                      "p-4 flex items-center justify-between",
                      provider.isActive && "bg-green-50 dark:bg-green-900/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        provider.type === 'lawyer'
                          ? "bg-purple-100 dark:bg-purple-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                      )}>
                        {provider.type === 'lawyer' ? (
                          <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {provider.name}
                          </span>
                          {provider.isActive && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                              <Star className="w-3 h-3" />
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {provider.email || provider.id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!provider.isActive && (
                        <button
                          onClick={() => setActiveProvider(account, provider.id)}
                          disabled={saving === account.userId}
                          className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                        >
                          Activer
                        </button>
                      )}
                      <button
                        onClick={() => unlinkProvider(account, provider.id)}
                        disabled={saving === account.userId}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        title="Délier ce prestataire"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-sos-red" />
                {modalStep === 1 ? 'Sélectionner un compte' : 'Sélectionner un prestataire'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder={modalStep === 1 ? "Rechercher un compte..." : "Rechercher un prestataire..."}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sos-red focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {modalStep === 1 ? (
                  // Step 1: Select Account
                  filteredModalUsers.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">Aucun compte trouvé</p>
                  ) : (
                    filteredModalUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedAccountId(user.id);
                          setModalStep(2);
                          setModalSearch('');
                        }}
                        className={cn(
                          "w-full p-3 text-left rounded-lg border transition-colors",
                          selectedAccountId === user.id
                            ? "border-sos-red bg-red-50 dark:bg-red-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </span>
                          {user.linkedProviderIds.length > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                              {user.linkedProviderIds.length} lié{user.linkedProviderIds.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  // Step 2: Select Provider
                  filteredModalProviders.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">
                      Aucun prestataire disponible
                    </p>
                  ) : (
                    filteredModalProviders.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProviderId(provider.id)}
                        className={cn(
                          "w-full p-3 text-left rounded-lg border transition-colors",
                          selectedProviderId === provider.id
                            ? "border-sos-red bg-red-50 dark:bg-red-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center",
                            provider.type === 'lawyer'
                              ? "bg-purple-100 dark:bg-purple-900/30"
                              : "bg-blue-100 dark:bg-blue-900/30"
                          )}>
                            {provider.type === 'lawyer' ? (
                              <Scale className="w-3 h-3 text-purple-600" />
                            ) : (
                              <Globe className="w-3 h-3 text-blue-600" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {provider.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {provider.email || provider.id}
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {modalStep === 2 && (
                <button
                  onClick={() => {
                    setModalStep(1);
                    setSelectedProviderId('');
                    setModalSearch('');
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  ← Retour
                </button>
              )}
              {modalStep === 1 && <div />}

              <button
                onClick={linkProvider}
                disabled={!selectedAccountId || !selectedProviderId || saving === 'modal'}
                className="flex items-center gap-2 px-4 py-2 bg-sos-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving === 'modal' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                Lier le prestataire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IaMultiProvidersTab;
