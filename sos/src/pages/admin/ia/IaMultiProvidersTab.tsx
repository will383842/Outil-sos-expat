/**
 * IaMultiProvidersTab - Gestion des comptes multi-prestataires + Couverture Pays
 *
 * Permet à l'admin de :
 * - Voir les comptes avec plusieurs prestataires liés
 * - Lier un nouveau prestataire à un compte
 * - Délier un prestataire
 * - Voir la couverture des pays par avocats francophones
 * - Créer des avocats francophones pour les pays non couverts
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
  Loader2,
  Scale,
  Globe,
  Phone,
  PhoneOff,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Clock,
  Activity,
  Trash2,
  Wallet,
  Power,
  PowerOff,
  MapPin,
} from 'lucide-react';
import { CountryCoverageTab } from './CountryCoverageTab';
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
import { db, functions } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
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
  // Status fields
  availability: 'available' | 'busy' | 'offline';
  isOnline: boolean;
  busyReason?: string;
  busyBySibling?: boolean;
  busySiblingProviderId?: string;
  currentCallSessionId?: string;
  // Payout fields
  payoutMode?: 'internal' | string; // 'internal' or external account ID
  isAAA?: boolean;
  // Gateway fields (basé sur le pays)
  country?: string;
  paymentGateway?: 'stripe' | 'paypal';
  // Pays d'intervention
  interventionCountries?: string[];
}

// External payout account
interface PayoutExternalAccount {
  id: string;
  name: string;
  gateway: 'stripe' | 'paypal';
  isActive: boolean;
}

interface PayoutConfig {
  externalAccounts: PayoutExternalAccount[];
  defaultMode: 'internal' | string;
}

// Liste des pays PayPal-only (synchronisée avec usePaymentGateway.ts)
const PAYPAL_ONLY_COUNTRIES = new Set([
  // AFRIQUE
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",
  // ASIE
  "AF", "BD", "BT", "CN", "IN", "KH", "KZ", "LA", "MM", "NP", "PK", "LK", "TJ", "TM", "TR", "UZ", "VN",
  "MN", "KP", "KG", "PS", "YE", "OM", "QA", "KW", "BH", "JO", "LB", "AM",
  "AZ", "GE", "MV", "BN", "TL", "PH", "ID", "TW", "KR",
  // AMERIQUE LATINE & CARAIBES
  "AR", "BO", "CO", "CU", "EC", "SV", "GT", "HN", "NI", "PY", "SR", "VE", "HT", "DO", "JM",
  "TT", "BB", "BS", "BZ", "GY", "PA", "CR", "AG", "DM", "GD", "KN", "LC", "VC",
  // EUROPE DE L'EST & BALKANS
  "BY", "MD", "UA", "RS", "BA", "MK", "ME", "AL", "XK", "RU", "AD", "MC", "SM", "VA",
  // OCEANIE & PACIFIQUE
  "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "FM", "MH", "PW", "NR", "TV", "NC", "PF", "GU",
  // MOYEN-ORIENT
  "IQ", "IR", "SY", "SA",
]);

// Détermine la gateway selon le pays
const getPaymentGateway = (countryCode: string | undefined): 'stripe' | 'paypal' => {
  if (!countryCode) return 'stripe';
  return PAYPAL_ONLY_COUNTRIES.has(countryCode.toUpperCase()) ? 'paypal' : 'stripe';
};

interface MultiProviderAccount {
  userId: string;
  email: string;
  displayName: string;
  providers: Provider[];
  activeProviderId?: string;
  // 🆕 Busy status sharing
  shareBusyStatus: boolean;
  // 🆕 Conflict detection - now shows ALL conflicts with details
  conflictWarnings?: {
    providerId: string;
    providerName: string;
    otherAccounts: { userId: string; displayName: string }[];
  }[];
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
  shareBusyStatus: boolean;
}

// 🆕 Track which providers are linked to multiple accounts (conflict detection)
interface ProviderLinkageMap {
  [providerId: string]: string[]; // providerId -> array of userIds
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

  // Cleanup state
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupStats, setCleanupStats] = useState<{
    orphanedLinks: number;
    staleBusy: number;
  } | null>(null);

  // 🆕 Conflict summary state
  const [showConflictSummary, setShowConflictSummary] = useState(false);

  // 🆕 Payout config
  const [payoutConfig, setPayoutConfig] = useState<PayoutConfig>({
    externalAccounts: [],
    defaultMode: 'internal',
  });

  // 🆕 Tab state
  const [activeTab, setActiveTab] = useState<'accounts' | 'coverage'>('accounts');

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
      // 🆕 Load payout config
      const payoutConfigDoc = await getDoc(doc(db, 'admin_config', 'aaa_payout'));
      if (payoutConfigDoc.exists()) {
        const data = payoutConfigDoc.data();
        setPayoutConfig({
          externalAccounts: (data.externalAccounts || [])
            .filter((a: any) => a.isActive)
            .map((a: any) => ({
              id: a.id,
              name: a.name,
              gateway: a.gateway as 'stripe' | 'paypal',
              isActive: a.isActive,
            })),
          defaultMode: data.defaultMode || 'internal',
        });
      }
      // COST OPTIMIZATION: Only load users (needed for linkedProviderIds/activeProviderId)
      // Profiles data comes from shared cache (useAdminReferenceData)
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));

      // Construire la liste des comptes multi-prestataires
      const accountsList: MultiProviderAccount[] = [];
      const providersList: AvailableProvider[] = [];
      const usersList: AvailableUser[] = [];

      // 🆕 Build conflict detection map: which providers are linked to which users
      const providerLinkageMap: ProviderLinkageMap = {};

      // D'abord, collecter tous les prestataires disponibles from cache
      profilesMap.forEach((profile) => {
        providersList.push({
          id: profile.id,
          name: profile.displayName || 'N/A',
          email: profile.email || '',
          type: profile.type
        });
      });

      // 🆕 First pass: build the linkage map for conflict detection
      // Also build a map of userId -> displayName for conflict details
      const userDisplayNames: { [userId: string]: string } = {};

      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        const linkedIds: string[] = data.linkedProviderIds || [];
        const displayName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A';
        userDisplayNames[docSnap.id] = displayName;

        for (const pid of linkedIds) {
          if (!providerLinkageMap[pid]) {
            providerLinkageMap[pid] = [];
          }
          providerLinkageMap[pid].push(docSnap.id);
        }
      }

      // Ensuite, construire les comptes
      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        const linkedIds: string[] = data.linkedProviderIds || [];

        // Ajouter à la liste de tous les utilisateurs (pour le modal)
        usersList.push({
          id: docSnap.id,
          name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          email: data.email || '',
          linkedProviderIds: linkedIds,
          shareBusyStatus: data.shareBusyStatus === true // 🆕
        });

        // Ne garder dans "accounts" que les comptes avec au moins 1 prestataire lié
        if (linkedIds.length === 0) continue;

        const providers: Provider[] = [];
        for (const pid of linkedIds) {
          // Use cached profile data
          const cachedProfile = profilesMap.get(pid);
          if (cachedProfile) {
            const country = cachedProfile.country || '';
            // Get intervention countries (fallback to country if empty)
            const interventionCountries = cachedProfile.interventionCountries?.length > 0
              ? cachedProfile.interventionCountries
              : cachedProfile.practiceCountries?.length > 0
                ? cachedProfile.practiceCountries
                : country ? [country] : [];
            providers.push({
              id: pid,
              name: cachedProfile.displayName || 'N/A',
              email: cachedProfile.email || '',
              type: cachedProfile.type,
              // Status fields from profile
              availability: cachedProfile.availability || 'offline',
              isOnline: cachedProfile.isOnline === true,
              busyReason: cachedProfile.busyReason,
              busyBySibling: cachedProfile.busyBySibling === true,
              busySiblingProviderId: cachedProfile.busySiblingProviderId,
              currentCallSessionId: cachedProfile.currentCallSessionId,
              // Payout fields
              payoutMode: cachedProfile.aaaPayoutMode || cachedProfile.payoutMode || 'internal',
              isAAA: cachedProfile.isAAA === true,
              // Gateway fields
              country,
              paymentGateway: getPaymentGateway(country),
              // Intervention countries
              interventionCountries,
            });
          } else {
            // Fallback: chercher dans usersMap (cache)
            const cachedUser = usersMap.get(pid);
            if (cachedUser) {
              const country = cachedUser.country || '';
              // Get intervention countries (fallback to country if empty)
              const interventionCountries = cachedUser.interventionCountries?.length > 0
                ? cachedUser.interventionCountries
                : cachedUser.practiceCountries?.length > 0
                  ? cachedUser.practiceCountries
                  : country ? [country] : [];
              providers.push({
                id: pid,
                name: cachedUser.displayName || 'N/A',
                email: cachedUser.email || '',
                type: cachedUser.type === 'expat_aidant' ? 'expat' : 'lawyer',
                // Status fields from user
                availability: cachedUser.availability || 'offline',
                isOnline: cachedUser.isOnline === true,
                busyReason: cachedUser.busyReason,
                busyBySibling: cachedUser.busyBySibling === true,
                busySiblingProviderId: cachedUser.busySiblingProviderId,
                currentCallSessionId: cachedUser.currentCallSessionId,
                // Payout fields
                payoutMode: cachedUser.aaaPayoutMode || cachedUser.payoutMode || 'internal',
                isAAA: cachedUser.isAAA === true,
                // Gateway fields
                country,
                paymentGateway: getPaymentGateway(country),
                // Intervention countries
                interventionCountries,
              });
            }
          }
        }

        // 🆕 Check for ALL conflicts: any provider linked to multiple accounts?
        const conflictWarnings: {
          providerId: string;
          providerName: string;
          otherAccounts: { userId: string; displayName: string }[];
        }[] = [];

        for (const pid of linkedIds) {
          const linkedTo = providerLinkageMap[pid] || [];
          if (linkedTo.length > 1) {
            const otherAccountIds = linkedTo.filter(uid => uid !== docSnap.id);
            const providerName = providers.find(p => p.id === pid)?.name || pid;
            conflictWarnings.push({
              providerId: pid,
              providerName,
              otherAccounts: otherAccountIds.map(uid => ({
                userId: uid,
                displayName: userDisplayNames[uid] || uid
              }))
            });
          }
        }

        accountsList.push({
          userId: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          providers,
          activeProviderId: data.activeProviderId,
          shareBusyStatus: data.shareBusyStatus === true, // 🆕
          conflictWarnings: conflictWarnings.length > 0 ? conflictWarnings : undefined // 🆕
        });
      }

      // Trier par nombre de prestataires décroissant
      accountsList.sort((a, b) => b.providers.length - a.providers.length);
      providersList.sort((a, b) => a.name.localeCompare(b.name));
      usersList.sort((a, b) => a.name.localeCompare(b.name));

      setAccounts(accountsList);
      setAllProviders(providersList);
      setAllUsers(usersList);
    } catch (err) {
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
    } catch {
      setError('Erreur lors de la suppression du lien');
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Delete entire account (unlink all providers)
  const deleteAccount = async (account: MultiProviderAccount) => {
    const providerNames = account.providers.map(p => p.name).join(', ');

    if (!confirm(
      `Voulez-vous vraiment supprimer le compte "${account.displayName}" ?\n\n` +
      `Cela va délier ${account.providers.length} prestataire(s):\n${providerNames}\n\n` +
      `Les prestataires ne seront pas supprimés, juste déliés de ce compte.`
    )) return;

    setSaving(account.userId);
    try {
      await updateDoc(doc(db, 'users', account.userId), {
        linkedProviderIds: [],
        activeProviderId: null,
        isMultiProvider: false,
        updatedAt: serverTimestamp()
      });

      // Remove from local state
      setAccounts(prev => prev.filter(a => a.userId !== account.userId));

      setSuccess(`Compte "${account.displayName}" supprimé - ${account.providers.length} prestataire(s) délié(s)`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Erreur lors de la suppression du compte');
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
    } catch {
      setError('Erreur lors de la liaison');
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Toggle shareBusyStatus for an account
  const toggleShareBusyStatus = async (account: MultiProviderAccount) => {
    setSaving(account.userId);
    const newValue = !account.shareBusyStatus;

    try {
      await updateDoc(doc(db, 'users', account.userId), {
        shareBusyStatus: newValue,
        updatedAt: serverTimestamp()
      });

      setAccounts(prev => prev.map(a => {
        if (a.userId !== account.userId) return a;
        return { ...a, shareBusyStatus: newValue };
      }));

      setSuccess(newValue
        ? '✅ Synchronisation du statut activée - tous les prestataires liés seront marqués occupés ensemble'
        : '⚠️ Synchronisation désactivée - chaque prestataire garde son propre statut'
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error('Error toggling shareBusyStatus:', err);
      setError('Erreur lors de la modification');
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Force a provider to busy or available status
  const forceProviderStatus = async (
    providerId: string,
    newStatus: 'available' | 'busy',
    reason?: string
  ) => {
    setSaving(providerId);
    const now = serverTimestamp();

    try {
      const updateData = newStatus === 'busy'
        ? {
            availability: 'busy',
            isOnline: true,
            // ✅ BUG FIX: Toujours définir lastActivity lors de isOnline=true
            // pour que checkProviderInactivity puisse calculer l'inactivité correctement
            lastActivity: now,
            busyReason: reason || 'manually_disabled',
            busySince: now,
            lastStatusChange: now,
            updatedAt: now
          }
        : {
            availability: 'available',
            isOnline: true,
            // ✅ BUG FIX: Toujours définir lastActivity lors de isOnline=true
            lastActivity: now,
            busyReason: null,
            busySince: null,
            busyBySibling: null,
            busySiblingProviderId: null,
            busySiblingCallSessionId: null,
            currentCallSessionId: null,
            lastStatusChange: now,
            updatedAt: now
          };

      // Update sos_profiles (primary) and users (optional - may not exist for AAA profiles)
      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData),
        updateDoc(doc(db, 'users', providerId), updateData).catch(() => {
          // User document might not exist for AAA profiles, ignore
        })
      ]);

      // Update local state
      setAccounts(prev => prev.map(a => ({
        ...a,
        providers: a.providers.map(p => {
          if (p.id !== providerId) return p;
          return {
            ...p,
            availability: newStatus,
            isOnline: true,
            busyReason: newStatus === 'busy' ? (reason || 'manually_disabled') : undefined,
            busyBySibling: false,
            busySiblingProviderId: undefined,
            currentCallSessionId: undefined
          };
        })
      })));

      setSuccess(`Statut forcé: ${newStatus === 'busy' ? 'Occupé' : 'Disponible'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error forcing provider status:', err);
      setError('Erreur lors du changement de statut');
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Update provider payout mode
  const updateProviderPayoutMode = async (providerId: string, mode: 'internal' | string) => {
    setSaving(providerId);
    try {
      const updateData = {
        payoutMode: mode,
        aaaPayoutMode: mode, // For backward compatibility with AAA profiles
        updatedAt: serverTimestamp(),
      };

      // Update sos_profiles (primary) and users (optional - may not exist for AAA profiles)
      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData),
        updateDoc(doc(db, 'users', providerId), updateData).catch(() => {
          // User document might not exist for AAA profiles, ignore
        })
      ]);

      // Update local state
      setAccounts(prev => prev.map(a => ({
        ...a,
        providers: a.providers.map(p =>
          p.id === providerId ? { ...p, payoutMode: mode } : p
        )
      })));

      const modeName = mode === 'internal'
        ? 'Interne (SOS-Expat)'
        : payoutConfig.externalAccounts.find(acc => acc.id === mode)?.name || mode;
      setSuccess(`Mode paiement mis à jour: ${modeName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating payout mode:', err);
      setError('Erreur lors de la mise à jour du mode de paiement');
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Set all providers in an account online or offline
  const setAllProvidersStatus = async (account: MultiProviderAccount, online: boolean) => {
    setSaving(account.userId);
    const now = serverTimestamp();

    try {
      const updatePromises = account.providers.map(async (provider) => {
        const updateData = online
          ? {
              availability: 'available',
              isOnline: true,
              isVisible: true,
              isVisibleOnMap: true,
              lastActivity: now,
              busyReason: null,
              busySince: null,
              busyBySibling: null,
              busySiblingProviderId: null,
              lastStatusChange: now,
              updatedAt: now,
            }
          : {
              availability: 'offline',
              isOnline: false,
              busyReason: 'offline',
              lastStatusChange: now,
              updatedAt: now,
            };

        // Update sos_profiles (primary) and users (optional - may not exist for AAA profiles)
        await Promise.all([
          updateDoc(doc(db, 'sos_profiles', provider.id), updateData),
          updateDoc(doc(db, 'users', provider.id), updateData).catch(() => {
            // User document might not exist for AAA profiles, ignore
          })
        ]);
      });

      await Promise.all(updatePromises);

      // Update local state
      setAccounts(prev => prev.map(a => {
        if (a.userId !== account.userId) return a;
        return {
          ...a,
          providers: a.providers.map(p => ({
            ...p,
            availability: online ? 'available' : 'offline',
            isOnline: online,
            busyReason: online ? undefined : 'offline',
          }))
        };
      }));

      setSuccess(`Tous les prestataires sont maintenant ${online ? 'en ligne' : 'hors ligne'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error setting all providers status:', err);
      setError('Erreur lors du changement de statut');
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Toggle individual provider online/offline
  const toggleProviderOnline = async (providerId: string, currentlyOnline: boolean) => {
    setSaving(providerId);
    const now = serverTimestamp();
    const goOnline = !currentlyOnline;

    try {
      const updateData = goOnline
        ? {
            availability: 'available',
            isOnline: true,
            isVisible: true,
            isVisibleOnMap: true,
            lastActivity: now,
            busyReason: null,
            busySince: null,
            busyBySibling: null,
            busySiblingProviderId: null,
            lastStatusChange: now,
            updatedAt: now,
          }
        : {
            availability: 'offline',
            isOnline: false,
            busyReason: 'offline',
            lastStatusChange: now,
            updatedAt: now,
          };

      // Update sos_profiles (primary) and users (optional - may not exist for AAA profiles)
      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData),
        updateDoc(doc(db, 'users', providerId), updateData).catch(() => {
          // User document might not exist for AAA profiles, ignore
        })
      ]);

      // Update local state
      setAccounts(prev => prev.map(a => ({
        ...a,
        providers: a.providers.map(p => {
          if (p.id !== providerId) return p;
          return {
            ...p,
            availability: goOnline ? 'available' : 'offline',
            isOnline: goOnline,
            busyReason: goOnline ? undefined : 'offline',
            busyBySibling: false,
            busySiblingProviderId: undefined,
          };
        })
      })));

      setSuccess(`Prestataire ${goOnline ? 'mis en ligne' : 'mis hors ligne'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error toggling provider online status:', err);
      setError('Erreur lors du changement de statut');
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
  // ORPHAN CLEANUP
  // ============================================================================

  // 🆕 Check for orphaned providers (dry run)
  const checkOrphans = async () => {
    setCleanupRunning(true);
    setError(null);

    try {
      const getStats = httpsCallable<void, {
        totalUsers: number;
        usersWithOrphans: number;
        totalOrphanedLinks: number;
        orphanedActiveProviders: number;
        staleBusySiblings: number;
        orphanedProviderIds: string[];
      }>(functions, 'adminGetOrphanedProvidersStats');

      const result = await getStats();
      const data = result.data;

      setCleanupStats({
        orphanedLinks: data.totalOrphanedLinks,
        staleBusy: data.staleBusySiblings,
      });

      if (data.totalOrphanedLinks > 0 || data.staleBusySiblings > 0) {
        setSuccess(`Trouvé: ${data.totalOrphanedLinks} liens orphelins, ${data.staleBusySiblings} statuts busy obsolètes`);
      } else {
        setSuccess('Aucun orphelin trouvé - Tout est propre!');
      }
    } catch (err) {
      console.error('Error checking orphans:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification');
    } finally {
      setCleanupRunning(false);
    }
  };

  // 🆕 Run cleanup (actually remove orphans)
  const runCleanup = async () => {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les prestataires orphelins? Cette action est irréversible.')) {
      return;
    }

    setCleanupRunning(true);
    setError(null);

    try {
      const cleanup = httpsCallable<{ dryRun?: boolean }, {
        success: boolean;
        usersScanned: number;
        usersFixed: number;
        orphanedLinksRemoved: number;
        staleBusyStatusCleared: number;
        activeProviderReset: number;
        errors: number;
      }>(functions, 'adminCleanupOrphanedProviders');

      const result = await cleanup({ dryRun: false });
      const data = result.data;

      if (data.success) {
        setSuccess(`Nettoyage terminé: ${data.orphanedLinksRemoved} liens orphelins supprimés, ${data.staleBusyStatusCleared} statuts busy réinitialisés`);
        setCleanupStats(null);
        // Reload data to reflect changes
        await loadData();
      } else {
        setError(`Nettoyage partiel: ${data.errors} erreur(s) rencontrée(s)`);
      }
    } catch (err) {
      console.error('Error running cleanup:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du nettoyage');
    } finally {
      setCleanupRunning(false);
    }
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
            Multi-Prestataires
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestion des comptes multi-prestataires et couverture pays
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Rafraîchir"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>

          {activeTab === 'accounts' && (
            <>
              {/* Cleanup button */}
              <div className="relative group">
                <button
                  onClick={cleanupStats ? runCleanup : checkOrphans}
                  disabled={cleanupRunning}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm",
                    cleanupStats
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                  )}
                  title={cleanupStats ? "Nettoyer les orphelins" : "Vérifier les orphelins"}
                >
                  {cleanupRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {cleanupStats ? (
                    <span>{cleanupStats.orphanedLinks + cleanupStats.staleBusy} orphelins</span>
                  ) : (
                    <span className="hidden sm:inline">Orphelins</span>
                  )}
                </button>
              </div>

              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2 bg-sos-red text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Lier un prestataire
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('accounts')}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'accounts'
                ? "border-sos-red text-sos-red"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Comptes Multi-Prestataires
            <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs">
              {accounts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('coverage')}
            className={cn(
              "py-3 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'coverage'
                ? "border-sos-red text-sos-red"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Couverture Pays
          </button>
        </nav>
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

      {/* Tab Content */}
      {activeTab === 'accounts' && (
        <>
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

          {/* 🆕 Conflict Summary Section */}
          {!loading && accounts.filter(a => a.conflictWarnings && a.conflictWarnings.length > 0).length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <button
                onClick={() => setShowConflictSummary(!showConflictSummary)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                      Doublons détectés
                    </h3>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      {accounts.filter(a => a.conflictWarnings && a.conflictWarnings.length > 0).length} compte(s) avec prestataires en conflit
                    </p>
                  </div>
                </div>
                <span className="text-amber-600 dark:text-amber-400">
                  {showConflictSummary ? '▲ Réduire' : '▼ Voir détails'}
                </span>
              </button>

              {showConflictSummary && (
                <div className="mt-4 space-y-3 border-t border-amber-200 dark:border-amber-700 pt-4">
                  {(() => {
                    // Build a unified view of all duplicated providers
                    const duplicatedProviders = new Map<string, {
                      providerName: string;
                      accounts: { userId: string; displayName: string }[];
                    }>();

                    accounts.forEach(account => {
                      account.conflictWarnings?.forEach(conflict => {
                        if (!duplicatedProviders.has(conflict.providerId)) {
                          duplicatedProviders.set(conflict.providerId, {
                            providerName: conflict.providerName,
                            accounts: [{ userId: account.userId, displayName: account.displayName }]
                          });
                        }
                        // Add other accounts
                        conflict.otherAccounts.forEach(other => {
                          const existing = duplicatedProviders.get(conflict.providerId);
                          if (existing && !existing.accounts.find(a => a.userId === other.userId)) {
                            existing.accounts.push(other);
                          }
                        });
                      });
                    });

                    return Array.from(duplicatedProviders.entries()).map(([providerId, info]) => (
                      <div
                        key={providerId}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {info.providerName}
                            </span>
                            <span className="mx-2 text-amber-500">→</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Lié à {info.accounts.length} comptes:
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {info.accounts.map(acc => (
                            <span
                              key={acc.userId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs"
                            >
                              <User className="w-3 h-3" />
                              {acc.displayName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

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
                    {/* 🆕 Delete Account button */}
                    <button
                      onClick={() => deleteAccount(account)}
                      disabled={saving === account.userId}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      title="Supprimer ce compte (délier tous les prestataires)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 🆕 shareBusyStatus Toggle & Conflict Warning */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {/* Share Busy Status Toggle */}
                  <button
                    onClick={() => toggleShareBusyStatus(account)}
                    disabled={saving === account.userId}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      account.shareBusyStatus
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
                    )}
                    title={account.shareBusyStatus
                      ? "Synchronisation activée: tous les prestataires liés sont marqués occupés ensemble"
                      : "Synchronisation désactivée: chaque prestataire a son propre statut"
                    }
                  >
                    {account.shareBusyStatus ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    <span>Sync statut busy</span>
                    {account.shareBusyStatus && <Check className="w-3 h-3" />}
                  </button>

                  {/* Account status toggle - changes color based on state */}
                  {(() => {
                    const allOnline = account.providers.every(p => p.isOnline && p.availability !== 'offline');
                    const allOffline = account.providers.every(p => !p.isOnline || p.availability === 'offline');
                    const onlineCount = account.providers.filter(p => p.isOnline && p.availability !== 'offline').length;

                    return (
                      <div className="flex items-center gap-2">
                        {/* Status indicator */}
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          allOnline ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                          allOffline ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                          "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        )}>
                          {allOnline ? 'Tous en ligne' :
                           allOffline ? 'Tous hors ligne' :
                           `${onlineCount}/${account.providers.length} en ligne`}
                        </span>

                        {/* Toggle button */}
                        <button
                          onClick={() => setAllProvidersStatus(account, !allOnline)}
                          disabled={saving === account.userId}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50",
                            allOnline
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : allOffline
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-amber-500 text-white hover:bg-amber-600"
                          )}
                          title={allOnline ? "Mettre tous hors ligne" : "Mettre tous en ligne"}
                        >
                          {saving === account.userId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : allOnline ? (
                            <Power className="w-3.5 h-3.5" />
                          ) : (
                            <PowerOff className="w-3.5 h-3.5" />
                          )}
                          <span>{allOnline ? 'Désactiver' : 'Activer'}</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Conflict Warnings - Show ALL conflicts with details */}
                  {account.conflictWarnings && account.conflictWarnings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {account.conflictWarnings.map((conflict, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs"
                          title={`Aussi lié à: ${conflict.otherAccounts.map(a => a.displayName).join(', ')}`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            "{conflict.providerName}" aussi dans:{' '}
                            <strong>{conflict.otherAccounts.map(a => a.displayName).join(', ')}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status Summary */}
                  {account.providers.some(p => p.availability === 'busy') && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-xs">
                      <Phone className="w-3.5 h-3.5" />
                      <span>
                        {account.providers.filter(p => p.availability === 'busy').length} occupé(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Providers List */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {account.providers.map((provider) => (
                  <div
                    key={provider.id}
                    className={cn(
                      "p-4",
                      provider.availability === 'busy' && "bg-red-50/50 dark:bg-red-900/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Provider Type Icon with Status Indicator */}
                        <div className="relative">
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
                          {/* Online/Offline indicator dot */}
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800",
                            provider.availability === 'busy' ? "bg-red-500" :
                            provider.isOnline ? "bg-green-500" : "bg-gray-400"
                          )} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {provider.name}
                            </span>
                            {/* Status Badge */}
                            {provider.availability === 'busy' && (
                              <span className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 text-xs rounded",
                                provider.busyBySibling
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              )}>
                                <Phone className="w-3 h-3" />
                                {provider.busyBySibling ? 'Occupé (sibling)' : 'Occupé'}
                              </span>
                            )}
                            {provider.availability === 'available' && provider.isOnline && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded">
                                <Activity className="w-3 h-3" />
                                Disponible
                              </span>
                            )}
                            {!provider.isOnline && provider.availability !== 'busy' && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                                Hors ligne
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {provider.email || provider.id}
                          </p>
                          {/* Pays d'intervention */}
                          {provider.interventionCountries && provider.interventionCountries.length > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-xs" title={provider.interventionCountries.join(', ')}>
                                {provider.interventionCountries.length <= 3
                                  ? provider.interventionCountries.join(', ')
                                  : `${provider.interventionCountries.slice(0, 3).join(', ')} +${provider.interventionCountries.length - 3}`}
                              </span>
                            </p>
                          )}
                          {/* Busy reason details */}
                          {provider.availability === 'busy' && provider.busyReason && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Raison: {provider.busyReason === 'in_call' ? 'En appel' :
                                       provider.busyReason === 'sibling_in_call' ? 'Collègue en appel' :
                                       provider.busyReason === 'manually_disabled' ? 'Désactivé manuellement' :
                                       provider.busyReason}
                              {provider.busySiblingProviderId && (
                                <span className="text-gray-400">
                                  (par {account.providers.find(p => p.id === provider.busySiblingProviderId)?.name || provider.busySiblingProviderId})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 🆕 Gateway indicator */}
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-medium",
                            provider.paymentGateway === 'paypal'
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          )}
                          title={`Ce prestataire reçoit les paiements via ${provider.paymentGateway?.toUpperCase() || 'STRIPE'} (basé sur son pays: ${provider.country || 'N/A'})`}
                        >
                          {provider.paymentGateway === 'paypal' ? 'PayPal' : 'Stripe'}
                        </span>

                        {/* 🆕 Payout Mode Selector - filtered by gateway */}
                        <div className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-gray-400" />
                          <select
                            value={provider.payoutMode || 'internal'}
                            onChange={(e) => updateProviderPayoutMode(provider.id, e.target.value)}
                            disabled={saving === provider.id}
                            className={cn(
                              "text-xs px-2 py-1 rounded-md border focus:ring-2 focus:ring-purple-500 disabled:opacity-50",
                              provider.payoutMode === 'internal' || !provider.payoutMode
                                ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                                : "bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300"
                            )}
                            title={`Mode de paiement (comptes ${provider.paymentGateway?.toUpperCase() || 'STRIPE'} uniquement)`}
                          >
                            <option value="internal">Interne</option>
                            {/* Only show accounts matching provider's gateway */}
                            {payoutConfig.externalAccounts
                              .filter(acc => acc.gateway === provider.paymentGateway)
                              .map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* 🆕 Toggle Online/Offline - individual control */}
                        <button
                          onClick={() => toggleProviderOnline(provider.id, provider.isOnline && provider.availability !== 'offline')}
                          disabled={saving === provider.id}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50",
                            provider.isOnline && provider.availability !== 'offline'
                              ? "bg-green-500 focus:ring-green-500"
                              : "bg-gray-300 dark:bg-gray-600 focus:ring-gray-500"
                          )}
                          title={provider.isOnline && provider.availability !== 'offline' ? "Mettre hors ligne" : "Mettre en ligne"}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                              provider.isOnline && provider.availability !== 'offline' ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                        <span className={cn(
                          "text-xs font-medium min-w-[50px]",
                          provider.isOnline && provider.availability !== 'offline'
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-500 dark:text-gray-400"
                        )}>
                          {provider.isOnline && provider.availability !== 'offline' ? 'En ligne' : 'Hors ligne'}
                        </span>

                        {/* Separator */}
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* 🆕 Force Status Buttons (for busy/available when online) */}
                        {provider.isOnline && provider.availability !== 'offline' && (
                          provider.availability === 'busy' ? (
                            <button
                              onClick={() => forceProviderStatus(provider.id, 'available')}
                              disabled={saving === provider.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50"
                              title="Forcer le statut disponible"
                            >
                              <PhoneOff className="w-3.5 h-3.5" />
                              Libérer
                            </button>
                          ) : (
                            <button
                              onClick={() => forceProviderStatus(provider.id, 'busy', 'manually_disabled')}
                              disabled={saving === provider.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                              title="Forcer le statut occupé"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              Bloquer
                            </button>
                          )
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Coverage Tab */}
      {activeTab === 'coverage' && (
        <CountryCoverageTab
          onSuccess={(message) => {
            setSuccess(message);
            setTimeout(() => setSuccess(null), 3000);
          }}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(null), 5000);
          }}
        />
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
