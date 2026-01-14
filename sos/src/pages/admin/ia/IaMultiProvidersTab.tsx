/**
 * IaMultiProvidersTab - Gestion des comptes avec plusieurs prestataires
 * Permet de lier/délier des prestataires à un compte utilisateur
 *
 * VERSION AMÉLIORÉE - UX optimisée pour la création et gestion des multiprestataires
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ToggleRight,
  Filter,
  Languages,
  MapPin,
  Star,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Eye,
  Copy,
  CheckCircle2,
  Info,
  Zap,
  ListFilter,
  UserCheck,
  Building2
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
  orderBy,
  limit,
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
  languages?: string[];
  country?: string;
  interventionCountries?: string[];
  isAAA?: boolean;
}

// Vue pour afficher tous les prestataires disponibles
interface AvailableProvider extends SearchResult {
  linkedToAccounts: string[]; // IDs des comptes auxquels ce prestataire est lié
  linkedAccountsCount: number;
}

// Mode d'affichage
type ViewMode = 'accounts' | 'providers';

// Mode de création
type CreateMode = 'link-to-account' | 'link-to-provider';

// ============================================================================
// COMPONENT
// ============================================================================

export const IaMultiProvidersTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();

  // State
  const [accounts, setAccounts] = useState<MultiProviderAccount[]>([]);
  const [allProviders, setAllProviders] = useState<AvailableProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View mode - soit par comptes, soit par prestataires
  const [viewMode, setViewMode] = useState<ViewMode>('accounts');

  // Expansion state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minProviders, setMinProviders] = useState<number>(1);
  const [providerTypeFilter, setProviderTypeFilter] = useState<'all' | 'lawyer' | 'expat'>('all');

  // Modal pour lier des prestataires - WIZARD AMÉLIORÉ
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('link-to-account');
  const [linkStep, setLinkStep] = useState<1 | 2>(1);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<SearchResult | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<SearchResult[]>([]);
  const [providerSearchResults, setProviderSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Filtres pour la recherche de prestataires
  const [allAvailableProviders, setAllAvailableProviders] = useState<SearchResult[]>([]);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [aaaFilter, setAaaFilter] = useState<'all' | 'aaa' | 'non-aaa'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'lawyer' | 'expat'>('all');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [linkedProviderIdsForUser, setLinkedProviderIdsForUser] = useState<string[]>([]);

  // Copie ID
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Charge tous les comptes et prestataires
   * Crée une map bidirectionnelle compte <-> prestataires
   */
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // OPTIMISATION: Limiter les lectures Firestore pour réduire les coûts
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(500)));
      const profilesSnapshot = await getDocs(query(collection(db, 'sos_profiles'), limit(500)));

      const accountsList: MultiProviderAccount[] = [];

      // Map pour suivre quels comptes sont liés à chaque prestataire
      const providerToAccountsMap = new Map<string, { accountId: string; accountName: string; accountEmail: string }[]>();

      // Map des profils par ID pour lookup rapide
      const profilesMap = new Map<string, any>();
      profilesSnapshot.docs.forEach(docSnap => {
        profilesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      });

      // Construire les comptes avec prestataires liés
      for (const docSnap of usersSnapshot.docs) {
        const data = docSnap.data();
        const linkedIds: string[] = data.linkedProviderIds || [];

        // Enregistrer les liens dans la map inverse
        linkedIds.forEach(providerId => {
          if (!providerToAccountsMap.has(providerId)) {
            providerToAccountsMap.set(providerId, []);
          }
          providerToAccountsMap.get(providerId)!.push({
            accountId: docSnap.id,
            accountName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
            accountEmail: data.email || ''
          });
        });

        if (linkedIds.length >= 1) {
          const providersDetails: MultiProviderAccount['providers'] = [];

          for (const providerId of linkedIds) {
            try {
              // Chercher d'abord dans sos_profiles (cache local)
              const profileData = profilesMap.get(providerId);
              if (profileData) {
                providersDetails.push({
                  id: providerId,
                  name: profileData.name || profileData.displayName || profileData.fullName || 'N/A',
                  type: profileData.providerType || profileData.type || 'lawyer',
                  isActive: data.activeProviderId === providerId
                });
              } else {
                // Fallback: chercher dans users
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

      // Construire la liste des prestataires avec leurs comptes liés
      const providersList: AvailableProvider[] = [];
      const allLanguages = new Set<string>();
      const allCountries = new Set<string>();

      profilesSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const linkedAccounts = providerToAccountsMap.get(docSnap.id) || [];

        const languages = data.languages || data.languagesSpoken || [];
        const country = data.country || '';
        const interventionCountries = data.interventionCountries || data.practiceCountries || [];

        languages.forEach((lang: string) => allLanguages.add(lang));
        if (country) allCountries.add(country);
        interventionCountries.forEach((c: string) => allCountries.add(c));

        providersList.push({
          id: docSnap.id,
          email: data.email || '',
          displayName: data.name || data.displayName || data.fullName || 'N/A',
          type: data.providerType || data.type || 'lawyer',
          languages,
          country,
          interventionCountries,
          isAAA: data.isAAA === true,
          linkedToAccounts: linkedAccounts.map(a => a.accountId),
          linkedAccountsCount: linkedAccounts.length
        });
      });

      // Aussi vérifier les users avec rôle prestataire qui ne sont pas dans sos_profiles
      usersSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.role !== 'lawyer' && data.role !== 'expat_aidant' && data.role !== 'provider') return;
        // Éviter les doublons
        if (providersList.find(p => p.id === docSnap.id)) return;

        const linkedAccounts = providerToAccountsMap.get(docSnap.id) || [];
        const languages = data.languages || data.languagesSpoken || [];
        const country = data.country || '';
        const interventionCountries = data.interventionCountries || data.practiceCountries || [];

        languages.forEach((lang: string) => allLanguages.add(lang));
        if (country) allCountries.add(country);
        interventionCountries.forEach((c: string) => allCountries.add(c));

        providersList.push({
          id: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          type: data.role === 'expat_aidant' ? 'expat' : 'lawyer',
          languages,
          country,
          interventionCountries,
          isAAA: data.isAAA === true,
          linkedToAccounts: linkedAccounts.map(a => a.accountId),
          linkedAccountsCount: linkedAccounts.length
        });
      });

      // Trier
      accountsList.sort((a, b) => b.providersCount - a.providersCount);
      providersList.sort((a, b) => a.displayName.localeCompare(b.displayName));

      setAccounts(accountsList);
      setAllProviders(providersList);
      setAvailableLanguages(Array.from(allLanguages).sort());
      setAvailableCountries(Array.from(allCountries).sort());
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
      // OPTIMISATION: Limiter les lectures Firestore pour réduire les coûts
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(500)));
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

  /**
   * Charge tous les prestataires disponibles depuis sos_profiles et users
   * Cette fonction est appelée quand le modal passe à l'étape 2
   */
  const loadAllAvailableProviders = useCallback(async (excludeIds: string[] = []) => {
    setSearching(true);
    try {
      const results: SearchResult[] = [];
      const allLanguages = new Set<string>();
      const allCountries = new Set<string>();

      console.log('[MultiProviders] Loading all available providers...');

      // OPTIMISATION: Limiter les lectures Firestore pour réduire les coûts
      // Charger depuis sos_profiles (source principale)
      const profilesSnapshot = await getDocs(query(collection(db, 'sos_profiles'), limit(500)));
      console.log(`[MultiProviders] Found ${profilesSnapshot.docs.length} sos_profiles`);

      profilesSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Exclure les prestataires déjà liés
        if (excludeIds.includes(docSnap.id)) return;

        const languages = data.languages || data.languagesSpoken || [];
        const country = data.country || '';
        const interventionCountries = data.interventionCountries || data.practiceCountries || [];

        // Collecter les langues et pays disponibles
        languages.forEach((lang: string) => allLanguages.add(lang));
        if (country) allCountries.add(country);
        interventionCountries.forEach((c: string) => allCountries.add(c));

        results.push({
          id: docSnap.id,
          email: data.email || '',
          displayName: data.name || data.displayName || data.fullName || 'N/A',
          type: data.providerType || data.type || 'lawyer',
          languages,
          country,
          interventionCountries,
          isAAA: data.isAAA === true
        });
      });

      // Charger aussi depuis users avec role prestataire (fallback)
      // OPTIMISATION: Limiter les lectures Firestore
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(500)));
      usersSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Ne garder que les prestataires
        if (data.role !== 'lawyer' && data.role !== 'expat_aidant' && data.role !== 'provider') return;
        // Exclure les prestataires déjà liés
        if (excludeIds.includes(docSnap.id)) return;
        // Éviter les doublons avec sos_profiles
        if (results.find(r => r.id === docSnap.id)) return;

        const languages = data.languages || data.languagesSpoken || [];
        const country = data.country || '';
        const interventionCountries = data.interventionCountries || data.practiceCountries || [];

        // Collecter les langues et pays disponibles
        languages.forEach((lang: string) => allLanguages.add(lang));
        if (country) allCountries.add(country);
        interventionCountries.forEach((c: string) => allCountries.add(c));

        results.push({
          id: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          type: data.role === 'expat_aidant' ? 'expat' : 'lawyer',
          languages,
          country,
          interventionCountries,
          isAAA: data.isAAA === true
        });
      });

      console.log(`[MultiProviders] Total available providers: ${results.length}`);

      setAllAvailableProviders(results);
      setAvailableLanguages(Array.from(allLanguages).sort());
      setAvailableCountries(Array.from(allCountries).sort());
      setProviderSearchResults(results); // Afficher tous par défaut
    } catch (err) {
      console.error('[MultiProviders] Error loading providers:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  /**
   * Filtre les prestataires selon les critères
   */
  const filterProviders = useCallback(() => {
    const term = providerSearchQuery.toLowerCase();

    const filtered = allAvailableProviders.filter(provider => {
      // Filtre par texte de recherche (optionnel maintenant, fonctionne même sans terme)
      if (term.length > 0) {
        const displayName = provider.displayName.toLowerCase();
        const email = (provider.email || '').toLowerCase();
        if (!displayName.includes(term) && !email.includes(term)) {
          return false;
        }
      }

      // Filtre par rôle (lawyer/expat)
      if (roleFilter !== 'all') {
        if (provider.type !== roleFilter) {
          return false;
        }
      }

      // Filtre par langue
      if (languageFilter) {
        const providerLanguages = provider.languages || [];
        if (!providerLanguages.includes(languageFilter)) {
          return false;
        }
      }

      // Filtre par pays (pays d'origine ou pays d'intervention)
      if (countryFilter) {
        const providerCountry = provider.country || '';
        const interventionCountries = provider.interventionCountries || [];
        if (providerCountry !== countryFilter && !interventionCountries.includes(countryFilter)) {
          return false;
        }
      }

      // Filtre par AAA profile
      if (aaaFilter === 'aaa' && !provider.isAAA) {
        return false;
      }
      if (aaaFilter === 'non-aaa' && provider.isAAA) {
        return false;
      }

      return true;
    });

    setProviderSearchResults(filtered);
  }, [allAvailableProviders, providerSearchQuery, languageFilter, countryFilter, aaaFilter, roleFilter]);

  // Debounce search pour users (step 1)
  useEffect(() => {
    if (linkStep !== 1) return;
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, linkStep, searchUsers]);

  // Filtrer les prestataires quand les critères changent (step 2)
  useEffect(() => {
    if (linkStep !== 2) return;
    const timer = setTimeout(() => {
      filterProviders();
    }, 200);
    return () => clearTimeout(timer);
  }, [providerSearchQuery, languageFilter, countryFilter, aaaFilter, roleFilter, linkStep, filterProviders]);

  // Charger les prestataires disponibles quand on passe à l'étape 2 (mode link-to-account uniquement)
  useEffect(() => {
    if (linkStep === 2 && selectedUser && createMode === 'link-to-account') {
      // Récupérer les IDs des prestataires déjà liés à l'utilisateur sélectionné
      const fetchLinkedIds = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', selectedUser.id));
          const linkedIds = userDoc.data()?.linkedProviderIds || [];
          setLinkedProviderIdsForUser(linkedIds);
          // Charger tous les prestataires en excluant ceux déjà liés
          loadAllAvailableProviders(linkedIds);
        } catch (err) {
          console.error('[MultiProviders] Error fetching linked IDs:', err);
          loadAllAvailableProviders([]);
        }
      };
      fetchLinkedIds();
    }
    // En mode link-to-provider, récupérer juste les IDs existants pour affichage
    if (linkStep === 2 && selectedUser && createMode === 'link-to-provider') {
      const fetchLinkedIds = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', selectedUser.id));
          const linkedIds = userDoc.data()?.linkedProviderIds || [];
          setLinkedProviderIdsForUser(linkedIds);
        } catch (err) {
          console.error('[MultiProviders] Error fetching linked IDs:', err);
        }
      };
      fetchLinkedIds();
    }
  }, [linkStep, selectedUser, createMode, loadAllAvailableProviders]);

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
    setCreateMode('link-to-account');
    setSelectedUser(null);
    setSelectedProvider(null);
    setUserSearchQuery('');
    setProviderSearchQuery('');
    setUserSearchResults([]);
    setProviderSearchResults([]);
    // Reset filter states
    setAllAvailableProviders([]);
    setLanguageFilter('');
    setCountryFilter('');
    setAaaFilter('all');
    setRoleFilter('all');
    setLinkedProviderIdsForUser([]);
  };

  /**
   * Copie un ID dans le presse-papiers
   */
  const copyToClipboard = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /**
   * Ouvre le wizard pour lier un prestataire à un compte existant
   */
  const openLinkWizardForAccount = (account: MultiProviderAccount) => {
    setCreateMode('link-to-account');
    setSelectedUser({
      id: account.userId,
      email: account.email,
      displayName: account.displayName
    });
    setLinkStep(2);
    setShowLinkModal(true);
  };

  /**
   * Ouvre le wizard pour lier un compte à un prestataire
   */
  const openLinkWizardForProvider = (provider: AvailableProvider) => {
    setCreateMode('link-to-provider');
    setSelectedProvider({
      id: provider.id,
      email: provider.email,
      displayName: provider.displayName,
      type: provider.type,
      languages: provider.languages,
      country: provider.country,
      isAAA: provider.isAAA
    });
    setLinkStep(1); // Étape 1 = sélectionner l'utilisateur
    setShowLinkModal(true);
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const filteredAccounts = useMemo(() => accounts.filter(a => {
    if (a.providersCount < minProviders) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!a.email.toLowerCase().includes(query) &&
          !a.displayName.toLowerCase().includes(query)) {
        return false;
      }
    }

    return true;
  }), [accounts, minProviders, searchQuery]);

  const filteredProviders = useMemo(() => allProviders.filter(p => {
    // Filtre par recherche texte
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!p.email.toLowerCase().includes(query) &&
          !p.displayName.toLowerCase().includes(query) &&
          !p.id.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Filtre par type
    if (providerTypeFilter !== 'all' && p.type !== providerTypeFilter) {
      return false;
    }

    // Filtre par langue
    if (languageFilter && p.languages && !p.languages.includes(languageFilter)) {
      return false;
    }

    // Filtre par pays
    if (countryFilter) {
      const hasCountry = p.country === countryFilter ||
        (p.interventionCountries && p.interventionCountries.includes(countryFilter));
      if (!hasCountry) return false;
    }

    return true;
  }), [allProviders, searchQuery, providerTypeFilter, languageFilter, countryFilter]);

  const stats = useMemo(() => ({
    totalAccounts: accounts.length,
    withMultiple: accounts.filter(a => a.providersCount >= 2).length,
    with3Plus: accounts.filter(a => a.providersCount >= 3).length,
    totalLinks: accounts.reduce((acc, a) => acc + a.providersCount, 0),
    totalProviders: allProviders.length,
    linkedProviders: allProviders.filter(p => p.linkedAccountsCount > 0).length,
    unlinkedProviders: allProviders.filter(p => p.linkedAccountsCount === 0).length,
    lawyers: allProviders.filter(p => p.type === 'lawyer').length,
    expats: allProviders.filter(p => p.type === 'expat').length
  }), [accounts, allProviders]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header avec stats améliorés */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comptes liés</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</div>
          <div className="text-xs text-gray-400 mt-1">comptes avec prestataires</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Link2 className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Multi (2+)</span>
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.withMultiple}</div>
          <div className="text-xs text-purple-400 mt-1">multi-prestataires</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Scale className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Avocats</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.lawyers}</div>
          <div className="text-xs text-blue-400 mt-1">profils avocats</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Experts</span>
          </div>
          <div className="text-2xl font-bold text-green-700">{stats.expats}</div>
          <div className="text-xs text-green-400 mt-1">experts expatriés</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Non liés</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.unlinkedProviders}</div>
          <div className="text-xs text-amber-400 mt-1">à configurer</div>
        </div>
      </div>

      {/* Section Action Rapide */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">Gestion Multi-Prestataires</h3>
              <p className="text-indigo-100 text-sm max-w-md">
                Liez plusieurs profils prestataires à un même compte utilisateur pour une gestion simplifiée
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setCreateMode('link-to-account');
                setShowLinkModal(true);
              }}
              className="px-4 py-2.5 bg-white text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition-all hover:scale-105 flex items-center gap-2 shadow-md"
            >
              <UserPlus className="w-5 h-5" />
              Nouveau lien
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'accounts' ? 'providers' : 'accounts')}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              <Eye className="w-5 h-5" />
              {viewMode === 'accounts' ? 'Voir prestataires' : 'Voir comptes'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts améliorés */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-red-800">Erreur</div>
            <div className="text-sm text-red-600">{error}</div>
          </div>
          <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-green-800">Succès</div>
            <div className="text-sm text-green-600">{success}</div>
          </div>
        </div>
      )}

      {/* Toggle Vue + Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        {/* Toggle Comptes / Prestataires */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('accounts')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                viewMode === 'accounts'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <UserCheck className="w-4 h-4" />
              Par comptes
            </button>
            <button
              onClick={() => setViewMode('providers')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                viewMode === 'providers'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Building2 className="w-4 h-4" />
              Par prestataires
            </button>
          </div>
          <button
            onClick={loadAccounts}
            disabled={loading}
            className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Filtres selon le mode */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Recherche commune */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={viewMode === 'accounts' ? 'Rechercher un compte (email, nom)...' : 'Rechercher un prestataire (nom, email, ID)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          {viewMode === 'accounts' ? (
            /* Filtres pour vue Comptes */
            <div className="flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-gray-400" />
              <select
                value={minProviders}
                onChange={(e) => setMinProviders(parseInt(e.target.value))}
                className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white text-sm"
              >
                <option value={1}>1+ prestataire</option>
                <option value={2}>2+ prestataires</option>
                <option value={3}>3+ prestataires</option>
              </select>
            </div>
          ) : (
            /* Filtres pour vue Prestataires */
            <>
              <select
                value={providerTypeFilter}
                onChange={(e) => setProviderTypeFilter(e.target.value as 'all' | 'lawyer' | 'expat')}
                className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white text-sm"
              >
                <option value="all">Tous les types</option>
                <option value="lawyer">Avocats</option>
                <option value="expat">Experts expatriés</option>
              </select>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white text-sm"
              >
                <option value="">Toutes langues</option>
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white text-sm"
              >
                <option value="">Tous pays</option>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Compteur de résultats */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {viewMode === 'accounts'
              ? `${filteredAccounts.length} compte(s) affiché(s)`
              : `${filteredProviders.length} prestataire(s) affiché(s)`
            }
          </span>
          {(searchQuery || (viewMode === 'providers' && (providerTypeFilter !== 'all' || languageFilter || countryFilter))) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setProviderTypeFilter('all');
                setLanguageFilter('');
                setCountryFilter('');
              }}
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Effacer les filtres
            </button>
          )}
        </div>
      </div>

      {/* Liste dynamique selon le mode de vue */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mb-3">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
            <p className="text-gray-500 font-medium">Chargement des données...</p>
          </div>
        ) : viewMode === 'accounts' ? (
          /* ===== VUE PAR COMPTES ===== */
          filteredAccounts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Aucun compte trouvé</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery ? 'Aucun résultat pour votre recherche' : 'Commencez par lier un prestataire à un compte'}
              </p>
              <button
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Créer un premier lien
              </button>
            </div>
          ) : (
            filteredAccounts.map((account) => {
              const isExpanded = expandedId === account.userId;

              return (
                <div
                  key={account.userId}
                  className={cn(
                    'bg-white rounded-xl border overflow-hidden transition-all',
                    isExpanded ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : account.userId)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'p-2.5 rounded-xl transition-colors',
                        account.providersCount >= 2 ? 'bg-purple-100' : 'bg-gray-100'
                      )}>
                        <User className={cn(
                          'w-5 h-5',
                          account.providersCount >= 2 ? 'text-purple-600' : 'text-gray-600'
                        )} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">{account.displayName}</div>
                        <div className="text-sm text-gray-500">{account.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={cn(
                          'text-lg font-bold',
                          account.providersCount >= 2 ? 'text-purple-600' : 'text-indigo-600'
                        )}>
                          {account.providersCount} prestataire{account.providersCount > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {account.providers.find(p => p.isActive)?.name || 'N/A'}
                        </div>
                      </div>
                      <div className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        isExpanded ? 'bg-indigo-100' : 'bg-gray-100'
                      )}>
                        {isExpanded ? (
                          <ChevronDown className={cn('w-5 h-5', isExpanded ? 'text-indigo-600' : 'text-gray-400')} />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 py-4 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                      {/* Info box ID du compte */}
                      <div className="mb-4 p-3 bg-gray-100/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Info className="w-4 h-4" />
                          <span>ID Compte: <code className="font-mono text-xs bg-white px-2 py-0.5 rounded">{account.userId}</code></span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(account.userId)}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                          title="Copier l'ID"
                        >
                          {copiedId === account.userId ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* Toggle pour partager le statut busy entre prestataires */}
                      {account.providersCount >= 2 && (
                        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'p-2.5 rounded-xl transition-colors',
                                account.shareBusyStatus ? 'bg-orange-100' : 'bg-gray-100'
                              )}>
                                <Phone className={cn(
                                  'w-5 h-5',
                                  account.shareBusyStatus ? 'text-orange-600' : 'text-gray-500'
                                )} />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Synchroniser le statut "Occupé"
                                </div>
                                <div className="text-sm text-gray-500">
                                  {account.shareBusyStatus
                                    ? 'Tous les prestataires passent en "busy" simultanément'
                                    : 'Chaque prestataire gère son statut indépendamment'
                                  }
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleShareBusyStatus(account)}
                              disabled={saving === account.userId}
                              className={cn(
                                'p-1 rounded-xl transition-all hover:scale-105',
                                saving === account.userId && 'opacity-50 cursor-wait'
                              )}
                            >
                              {account.shareBusyStatus ? (
                                <ToggleRight className="w-12 h-12 text-orange-500" />
                              ) : (
                                <ToggleLeft className="w-12 h-12 text-gray-300" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-gray-700">
                          Prestataires liés ({account.providersCount})
                        </div>
                        <button
                          onClick={() => openLinkWizardForAccount(account)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 font-medium px-3 py-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
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
                              'flex items-center justify-between p-4 rounded-xl transition-all',
                              provider.isActive
                                ? 'bg-indigo-50 border-2 border-indigo-200 shadow-sm'
                                : 'bg-white border border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'p-2.5 rounded-xl',
                                provider.type === 'lawyer' ? 'bg-blue-100' : 'bg-green-100'
                              )}>
                                {provider.type === 'lawyer' ? (
                                  <Scale className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Globe className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                  {provider.name}
                                  {provider.isActive && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                      Actif
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <span className={cn(
                                    'px-1.5 py-0.5 rounded text-xs font-medium',
                                    provider.type === 'lawyer' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                                  )}>
                                    {provider.type === 'lawyer' ? 'Avocat' : 'Expert'}
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <code className="font-mono text-xs text-gray-400">{provider.id.slice(0, 12)}...</code>
                                  <button
                                    onClick={() => copyToClipboard(provider.id)}
                                    className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                                    title="Copier l'ID"
                                  >
                                    {copiedId === provider.id ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-gray-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!provider.isActive && (
                                <button
                                  onClick={() => setActiveProvider(account, provider.id)}
                                  disabled={saving === account.userId}
                                  className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-medium"
                                >
                                  Activer
                                </button>
                              )}
                              <button
                                onClick={() => unlinkProvider(account, provider.id)}
                                disabled={saving === account.userId || account.providersCount <= 1}
                                className={cn(
                                  'p-2 rounded-lg transition-colors',
                                  account.providersCount <= 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-red-500 hover:bg-red-50'
                                )}
                                title={account.providersCount <= 1 ? 'Impossible de délier le dernier prestataire' : 'Délier ce prestataire'}
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
          )
        ) : (
          /* ===== VUE PAR PRESTATAIRES ===== */
          filteredProviders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Aucun prestataire trouvé</h3>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Aucun résultat pour votre recherche' : 'Aucun prestataire disponible'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-3 rounded-xl',
                        provider.type === 'lawyer' ? 'bg-blue-100' : 'bg-green-100'
                      )}>
                        {provider.type === 'lawyer' ? (
                          <Scale className="w-6 h-6 text-blue-600" />
                        ) : (
                          <Globe className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{provider.displayName}</h3>
                          {provider.isAAA && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" />
                              AAA
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mb-2">{provider.email}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            'px-2 py-1 rounded-lg text-xs font-medium',
                            provider.type === 'lawyer' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                          )}>
                            {provider.type === 'lawyer' ? 'Avocat' : 'Expert expatrié'}
                          </span>
                          {provider.languages && provider.languages.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                              <Languages className="w-3 h-3" />
                              {provider.languages.slice(0, 3).map(l => l.toUpperCase()).join(', ')}
                              {provider.languages.length > 3 && ` +${provider.languages.length - 3}`}
                            </span>
                          )}
                          {provider.country && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                              <MapPin className="w-3 h-3" />
                              {provider.country}
                            </span>
                          )}
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium',
                            provider.linkedAccountsCount > 0
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            <Link2 className="w-3 h-3" />
                            {provider.linkedAccountsCount > 0
                              ? `Lié à ${provider.linkedAccountsCount} compte(s)`
                              : 'Non lié'
                            }
                          </span>
                        </div>
                        {/* ID avec bouton copier */}
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                          <span>ID:</span>
                          <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{provider.id}</code>
                          <button
                            onClick={() => copyToClipboard(provider.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copier l'ID"
                          >
                            {copiedId === provider.id ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openLinkWizardForProvider(provider)}
                        className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        Lier à un compte
                      </button>
                      {provider.linkedAccountsCount > 0 && (
                        <button
                          onClick={() => {
                            // Trouver le premier compte lié et l'ouvrir
                            const linkedAccount = accounts.find(a =>
                              a.linkedProviderIds.includes(provider.id)
                            );
                            if (linkedAccount) {
                              setViewMode('accounts');
                              setExpandedId(linkedAccount.userId);
                            }
                          }}
                          className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-4 h-4" />
                          Voir les comptes
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal de liaison - WIZARD AMÉLIORÉ */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden">
            {/* Header avec indicateur d'étapes */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-xl">
                    <Link2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {createMode === 'link-to-provider' ? 'Lier à un compte' : 'Lier un prestataire'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {createMode === 'link-to-provider'
                        ? 'Associez ce prestataire à un compte utilisateur'
                        : 'Ajoutez un prestataire à un compte utilisateur'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeLinkModal}
                  className="p-2 hover:bg-white/80 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Indicateur d'étapes visuel */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  linkStep === 1 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'
                )}>
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                    linkStep === 1 ? 'bg-white/20' : 'bg-gray-200'
                  )}>
                    {selectedUser && linkStep === 2 ? <Check className="w-3 h-3" /> : '1'}
                  </span>
                  Compte
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  linkStep === 2 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'
                )}>
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                    linkStep === 2 ? 'bg-white/20' : 'bg-gray-200'
                  )}>2</span>
                  Prestataire
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
              {linkStep === 1 ? (
                <>
                  {/* Si mode link-to-provider, afficher le prestataire sélectionné */}
                  {createMode === 'link-to-provider' && selectedProvider && (
                    <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2.5 rounded-xl',
                          selectedProvider.type === 'lawyer' ? 'bg-blue-100' : 'bg-green-100'
                        )}>
                          {selectedProvider.type === 'lawyer' ? (
                            <Scale className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Globe className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-blue-600 font-medium">Prestataire à lier :</div>
                          <div className="font-bold text-gray-900">{selectedProvider.displayName}</div>
                          <div className="text-sm text-gray-500">{selectedProvider.email}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recherche utilisateur */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rechercher un compte utilisateur
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Email ou nom de l'utilisateur..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Tapez au moins 2 caractères pour rechercher</p>
                  </div>

                  {/* Résultats de recherche */}
                  <div className="space-y-2">
                    {searching && (
                      <div className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p className="text-gray-500">Recherche en cours...</p>
                      </div>
                    )}
                    {!searching && userSearchQuery.length >= 2 && userSearchResults.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Aucun utilisateur trouvé</p>
                        <p className="text-sm text-gray-400">Essayez un autre terme de recherche</p>
                      </div>
                    )}
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          if (createMode === 'link-to-provider') {
                            // En mode link-to-provider, on peut directement lier
                          }
                          setLinkStep(2);
                        }}
                        className="w-full p-4 text-left border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gray-100 rounded-xl group-hover:bg-indigo-100 transition-colors">
                            <User className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{user.displayName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {userSearchQuery.length < 2 && !searching && (
                    <div className="text-center py-8 text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>Commencez à taper pour rechercher</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Résumé de la sélection */}
                  <div className="mb-5 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-100 rounded-xl">
                        <UserCheck className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-indigo-600 font-medium">Compte sélectionné :</div>
                        <div className="font-bold text-gray-900">{selectedUser?.displayName}</div>
                        <div className="text-sm text-gray-500">{selectedUser?.email}</div>
                      </div>
                      {linkedProviderIdsForUser.length > 0 && (
                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            {linkedProviderIdsForUser.length} prestataire(s) existant(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Si mode link-to-provider, afficher le prestataire pré-sélectionné */}
                  {createMode === 'link-to-provider' && selectedProvider && (
                    <>
                      <div className={cn(
                        'mb-5 p-4 rounded-xl border',
                        linkedProviderIdsForUser.includes(selectedProvider.id)
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                          : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2.5 rounded-xl',
                            selectedProvider.type === 'lawyer' ? 'bg-blue-100' : 'bg-green-100'
                          )}>
                            {selectedProvider.type === 'lawyer' ? (
                              <Scale className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Globe className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={cn(
                              'text-sm font-medium',
                              linkedProviderIdsForUser.includes(selectedProvider.id) ? 'text-red-600' : 'text-green-600'
                            )}>
                              {linkedProviderIdsForUser.includes(selectedProvider.id) ? 'Prestataire DÉJÀ lié :' : 'Prestataire à lier :'}
                            </div>
                            <div className="font-bold text-gray-900">{selectedProvider.displayName}</div>
                            <div className="text-sm text-gray-500">{selectedProvider.email}</div>
                          </div>
                          {linkedProviderIdsForUser.includes(selectedProvider.id) ? (
                            <AlertCircle className="w-6 h-6 text-red-500" />
                          ) : (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          )}
                        </div>
                      </div>
                      {linkedProviderIdsForUser.includes(selectedProvider.id) && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                          <strong>Attention :</strong> Ce prestataire est déjà lié à ce compte. Choisissez un autre compte ou annulez.
                        </div>
                      )}
                    </>
                  )}

                  {/* Filtres et liste des prestataires (seulement en mode link-to-account) */}
                  {createMode === 'link-to-account' && (
                    <>
                      {/* Sélecteur de type de profil - AAA vs Traditionnel */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-500" />
                          Type de profil
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setAaaFilter('all')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2',
                              aaaFilter === 'all'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                            )}
                          >
                            Tous les profils
                          </button>
                          <button
                            onClick={() => setAaaFilter('aaa')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 flex items-center justify-center gap-2',
                              aaaFilter === 'aaa'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                            )}
                          >
                            <Star className="w-4 h-4" />
                            AAA Premium
                          </button>
                          <button
                            onClick={() => setAaaFilter('non-aaa')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2',
                              aaaFilter === 'non-aaa'
                                ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                            )}
                          >
                            Standard
                          </button>
                        </div>
                      </div>

                      {/* Sélecteur de rôle - Avocat vs Expert */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Scale className="w-4 h-4 text-blue-500" />
                          Rôle du prestataire
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRoleFilter('all')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2',
                              roleFilter === 'all'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                            )}
                          >
                            Tous les rôles
                          </button>
                          <button
                            onClick={() => setRoleFilter('lawyer')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 flex items-center justify-center gap-2',
                              roleFilter === 'lawyer'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            )}
                          >
                            <Scale className="w-4 h-4" />
                            Avocats
                          </button>
                          <button
                            onClick={() => setRoleFilter('expat')}
                            className={cn(
                              'flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 flex items-center justify-center gap-2',
                              roleFilter === 'expat'
                                ? 'bg-green-600 text-white border-green-600 shadow-md'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50'
                            )}
                          >
                            <Globe className="w-4 h-4" />
                            Experts expatriés
                          </button>
                        </div>
                      </div>

                      {/* Filtres secondaires : Langue et Pays */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Filter className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-600">Filtres avancés</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="">🌍 Toutes langues</option>
                            {availableLanguages.map((lang) => (
                              <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                            ))}
                          </select>
                          <select
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="">📍 Tous pays</option>
                            {availableCountries.map((country) => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Recherche texte (optionnel) */}
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Affiner par nom ou email (optionnel)..."
                            value={providerSearchQuery}
                            onChange={(e) => setProviderSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      {/* Compteur et bouton reset */}
                      <div className="mb-3 flex items-center justify-between text-sm">
                        <span className="text-gray-500 font-medium">
                          {providerSearchResults.length} prestataire(s) disponible(s)
                        </span>
                        {(languageFilter || countryFilter || aaaFilter !== 'all' || roleFilter !== 'all' || providerSearchQuery) && (
                          <button
                            onClick={() => {
                              setLanguageFilter('');
                              setCountryFilter('');
                              setAaaFilter('all');
                              setRoleFilter('all');
                              setProviderSearchQuery('');
                            }}
                            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Effacer tous les filtres
                          </button>
                        )}
                      </div>

                      {/* Liste des prestataires */}
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {searching && (
                          <div className="text-center py-6">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                            <p className="text-gray-500 text-sm">Chargement...</p>
                          </div>
                        )}
                        {!searching && providerSearchResults.length === 0 && (
                          <div className="text-center py-6">
                            <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-gray-500 font-medium">Aucun prestataire disponible</p>
                            <p className="text-xs text-gray-400 mt-1">Modifiez les filtres ou la recherche</p>
                          </div>
                        )}
                        {providerSearchResults.map((provider) => (
                          <button
                            key={provider.id}
                            onClick={() => setSelectedProvider(provider)}
                            className={cn(
                              'w-full p-4 text-left border-2 rounded-xl transition-all',
                              selectedProvider?.id === provider.id
                                ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {/* Icône rôle mise en avant */}
                              <div className={cn(
                                'p-3 rounded-xl flex-shrink-0',
                                provider.type === 'lawyer' ? 'bg-blue-100' : 'bg-green-100'
                              )}>
                                {provider.type === 'lawyer' ? (
                                  <Scale className="w-6 h-6 text-blue-600" />
                                ) : (
                                  <Globe className="w-6 h-6 text-green-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {/* Badge rôle en premier - très visible */}
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn(
                                    'px-2 py-1 text-xs rounded-lg font-bold uppercase tracking-wide',
                                    provider.type === 'lawyer'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-green-600 text-white'
                                  )}>
                                    {provider.type === 'lawyer' ? 'Avocat' : 'Expert expatrié'}
                                  </span>
                                  {provider.isAAA && (
                                    <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-lg font-bold flex items-center gap-1">
                                      <Star className="w-3 h-3" />
                                      AAA
                                    </span>
                                  )}
                                </div>
                                {/* Nom et email */}
                                <div className="font-semibold text-gray-900 text-base">
                                  {provider.displayName}
                                </div>
                                <div className="text-sm text-gray-500 truncate">{provider.email}</div>
                                {/* Langues et pays */}
                                <div className="flex items-center gap-2 mt-2">
                                  {provider.languages && provider.languages.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                      <Languages className="w-3 h-3" />
                                      {provider.languages.slice(0, 3).map(l => l.toUpperCase()).join(', ')}
                                      {provider.languages.length > 3 && ` +${provider.languages.length - 3}`}
                                    </span>
                                  )}
                                  {provider.country && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                      <MapPin className="w-3 h-3" />
                                      {provider.country}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {selectedProvider?.id === provider.id && (
                                <CheckCircle2 className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  if (linkStep === 2 && createMode === 'link-to-account') {
                    setLinkStep(1);
                    setSelectedUser(null);
                    setSelectedProvider(null);
                    setProviderSearchQuery('');
                    setLinkedProviderIdsForUser([]);
                    setAllAvailableProviders([]);
                    // Reset les filtres également
                    setAaaFilter('all');
                    setRoleFilter('all');
                    setLanguageFilter('');
                    setCountryFilter('');
                  } else if (linkStep === 2 && createMode === 'link-to-provider') {
                    setLinkStep(1);
                    setSelectedUser(null);
                  } else {
                    closeLinkModal();
                  }
                }}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium flex items-center gap-2"
              >
                {linkStep === 2 ? (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                  </>
                ) : (
                  'Annuler'
                )}
              </button>

              {linkStep === 2 && (
                <button
                  onClick={linkProvider}
                  disabled={
                    !selectedProvider ||
                    !selectedUser ||
                    saving === 'linking' ||
                    (selectedProvider && linkedProviderIdsForUser.includes(selectedProvider.id))
                  }
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                  {saving === 'linking' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  Créer le lien
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
