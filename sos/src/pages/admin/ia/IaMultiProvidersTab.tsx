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
  Lock,
  Unlock,
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
  // 🆕 Couplage individuel - si false, ce prestataire ne passe pas en busy quand un sibling est en appel
  receiveBusyFromSiblings?: boolean;
  // 🆕 Verrouillage hors ligne - si true, ce prestataire reste TOUJOURS hors ligne (même avec "Tous en ligne")
  lockedOffline?: boolean;
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
  // Telegram notification chat ID (set by admin)
  telegramChatId?: string;
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

  // Telegram chat ID editing state (per account)
  const [telegramEdits, setTelegramEdits] = useState<Record<string, string>>({});

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
      // ⚠️ FIX: Skip docs that are known providers (sos_profiles) — they have denormalized
      // linkedProviderIds but are NOT real account owners. Without this filter, every provider
      // with a users/{pid} doc appears as a separate "account", causing false conflict warnings.
      const userDisplayNames: { [userId: string]: string } = {};

      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        const linkedIds: string[] = data.linkedProviderIds || [];
        const displayName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A';
        userDisplayNames[docSnap.id] = displayName;

        // Skip provider docs — they have denormalized linkedProviderIds but aren't account owners
        if (profilesMap.has(docSnap.id)) continue;

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

        // Ne garder dans "accounts" que les VRAIS comptes propriétaires
        // Skip: docs sans prestataire lié, ET docs qui sont eux-mêmes des prestataires
        // (ils ont linkedProviderIds via dénormalisation mais ne sont pas des propriétaires)
        if (linkedIds.length === 0) continue;
        if (profilesMap.has(docSnap.id)) continue;

        const providers: Provider[] = [];
        for (const pid of linkedIds) {
          // Use cached profile data
          const cachedProfile = profilesMap.get(pid);
          if (cachedProfile) {
            const country = cachedProfile.country || '';
            // Get intervention countries (fallback to country if empty)
            const interventionCountries = (cachedProfile.interventionCountries && cachedProfile.interventionCountries.length > 0)
              ? cachedProfile.interventionCountries
              : (cachedProfile.practiceCountries && cachedProfile.practiceCountries.length > 0)
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
              // 🆕 Couplage individuel - default true si non défini
              receiveBusyFromSiblings: cachedProfile.receiveBusyFromSiblings !== false,
              // 🆕 Verrouillage hors ligne - default false si non défini
              lockedOffline: cachedProfile.lockedOffline === true,
            });
          } else {
            // Fallback: chercher dans usersMap (cache)
            const cachedUser = usersMap.get(pid);
            if (cachedUser) {
              const country = cachedUser.country || '';
              // Get intervention countries (fallback to country if empty)
              const interventionCountries = (cachedUser.interventionCountries && cachedUser.interventionCountries.length > 0)
                ? cachedUser.interventionCountries
                : (cachedUser.practiceCountries && cachedUser.practiceCountries.length > 0)
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
                // 🆕 Couplage individuel - default true si non défini
                receiveBusyFromSiblings: cachedUser.receiveBusyFromSiblings !== false,
                // 🆕 Verrouillage hors ligne - default false si non défini
                lockedOffline: cachedUser.lockedOffline === true,
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
          telegramChatId: data.telegramChatId || undefined,
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

      // Read fresh shareBusyStatus from Firestore (avoid stale local state)
      const ownerDoc = await getDoc(doc(db, 'users', account.userId));
      const freshShareBusyStatus = ownerDoc.data()?.shareBusyStatus === true;

      await updateDoc(doc(db, 'users', account.userId), {
        linkedProviderIds: newLinkedIds,
        activeProviderId: newActiveId,
        updatedAt: serverTimestamp()
      });

      // ✅ DENORMALIZATION: Update remaining providers with new list
      const denormData = {
        linkedProviderIds: newLinkedIds,
        shareBusyStatus: freshShareBusyStatus,
        updatedAt: serverTimestamp()
      };
      for (const pid of newLinkedIds) {
        await Promise.all([
          updateDoc(doc(db, 'users', pid), denormData).catch(() => {}),
          updateDoc(doc(db, 'sos_profiles', pid), denormData).catch(() => {}),
        ]);
      }

      // ✅ DENORMALIZATION: Clean up the unlinked provider's docs
      const cleanupData = {
        linkedProviderIds: [],
        shareBusyStatus: false,
        updatedAt: serverTimestamp()
      };
      await Promise.all([
        updateDoc(doc(db, 'users', providerId), cleanupData).catch(() => {}),
        updateDoc(doc(db, 'sos_profiles', providerId), cleanupData).catch(() => {}),
      ]);
      console.log(`[unlinkProvider] ✅ Denormalized: updated ${newLinkedIds.length} providers, cleaned ${providerId}`);

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
        shareBusyStatus: false,
        updatedAt: serverTimestamp()
      });

      // ✅ DENORMALIZATION: Clean up all provider docs (including sibling busy state)
      const cleanupData = {
        linkedProviderIds: [],
        shareBusyStatus: false,
        busyBySibling: null,
        busySiblingProviderId: null,
        busySiblingCallSessionId: null,
        updatedAt: serverTimestamp()
      };
      for (const provider of account.providers) {
        await Promise.all([
          updateDoc(doc(db, 'users', provider.id), cleanupData).catch(() => {}),
          updateDoc(doc(db, 'sos_profiles', provider.id), cleanupData).catch(() => {}),
        ]);
      }
      console.log(`[deleteAccount] ✅ Cleaned denormalized config from ${account.providers.length} provider docs`);

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
      const userData = userDoc.data();
      const existingLinks: string[] = userData?.linkedProviderIds || [];
      const currentShareBusyStatus: boolean = userData?.shareBusyStatus === true;

      if (existingLinks.includes(selectedProviderId)) {
        setError('Ce prestataire est déjà lié à ce compte');
        setSaving(null);
        return;
      }

      const newLinkedIds = [...existingLinks, selectedProviderId];

      // IMPORTANT: Set isMultiProvider=true so the dashboard can find this account
      await updateDoc(doc(db, 'users', selectedAccountId), {
        linkedProviderIds: arrayUnion(selectedProviderId),
        isMultiProvider: true, // ✅ Required for multi-dashboard to find this account
        ...(existingLinks.length === 0 && { activeProviderId: selectedProviderId }),
        updatedAt: serverTimestamp()
      });

      // ✅ DENORMALIZATION: Write linkedProviderIds + shareBusyStatus to each provider's own docs
      // So providerStatusManager can read directly from the provider doc without parent lookup
      const denormData = {
        linkedProviderIds: newLinkedIds,
        shareBusyStatus: currentShareBusyStatus,
        updatedAt: serverTimestamp()
      };
      for (const pid of newLinkedIds) {
        await Promise.all([
          updateDoc(doc(db, 'users', pid), denormData).catch(() => {}),
          updateDoc(doc(db, 'sos_profiles', pid), denormData).catch(() => {}),
        ]);
      }
      console.log(`[linkProvider] ✅ Denormalized config to ${newLinkedIds.length} provider docs`);

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
  // ✅ BUG FIX: Synchronise maintenant immédiatement les statuts si activé
  const toggleShareBusyStatus = async (account: MultiProviderAccount) => {
    setSaving(account.userId);
    const newValue = !account.shareBusyStatus;
    const now = serverTimestamp();

    try {
      // 1. Mettre à jour le flag shareBusyStatus sur le compte owner
      await updateDoc(doc(db, 'users', account.userId), {
        shareBusyStatus: newValue,
        updatedAt: now
      });

      // ✅ DENORMALIZATION: Propager shareBusyStatus à tous les provider docs
      for (const provider of account.providers) {
        const denormData = { shareBusyStatus: newValue, updatedAt: now };
        await Promise.all([
          updateDoc(doc(db, 'users', provider.id), denormData).catch(() => {}),
          updateDoc(doc(db, 'sos_profiles', provider.id), denormData).catch(() => {}),
        ]);
      }
      console.log(`[toggleShareBusyStatus] ✅ Denormalized shareBusyStatus=${newValue} to ${account.providers.length} provider docs`);

      let siblingsUpdated = 0;

      // 2. ✅ BUG FIX: Si on ACTIVE la synchronisation, propager le statut busy existant
      if (newValue) {
        // Trouver si un provider est actuellement busy (pas busyBySibling)
        const busyProvider = account.providers.find(
          p => p.availability === 'busy' && p.busyBySibling !== true
        );

        if (busyProvider) {
          console.log(`[toggleShareBusyStatus] Found busy provider ${busyProvider.id}, propagating to siblings...`);

          // Propager le busy aux autres providers qui ont receiveBusyFromSiblings !== false
          // 🔒 Ignorer les prestataires verrouillés hors ligne
          const siblingsToUpdate = account.providers.filter(
            p => p.id !== busyProvider.id &&
                 p.availability !== 'busy' &&
                 p.receiveBusyFromSiblings !== false &&
                 p.lockedOffline !== true
          );

          const siblingUpdateData = {
            availability: 'busy',
            isOnline: true,
            lastActivity: now,
            busyReason: 'sibling_in_call',
            busySince: now,
            busyBySibling: true,
            busySiblingProviderId: busyProvider.id,
            busySiblingCallSessionId: busyProvider.currentCallSessionId || null,
            lastStatusChange: now,
            updatedAt: now
          };

          for (const sibling of siblingsToUpdate) {
            try {
              await Promise.all([
                updateDoc(doc(db, 'sos_profiles', sibling.id), siblingUpdateData).catch(() => {}),
                updateDoc(doc(db, 'users', sibling.id), siblingUpdateData).catch(() => {})
              ]);
              siblingsUpdated++;
              console.log(`[toggleShareBusyStatus] ✅ Sibling ${sibling.id} set to busy`);
            } catch (sibErr) {
              console.warn(`[toggleShareBusyStatus] Failed to update sibling ${sibling.id}:`, sibErr);
            }
          }

          // Mettre à jour l'état local pour les siblings
          if (siblingsUpdated > 0) {
            setAccounts(prev => prev.map(a => {
              if (a.userId !== account.userId) return a;
              return {
                ...a,
                shareBusyStatus: newValue,
                providers: a.providers.map(p => {
                  if (p.id === busyProvider.id) return p;
                  if (siblingsToUpdate.some(s => s.id === p.id)) {
                    return {
                      ...p,
                      availability: 'busy',
                      isOnline: true,
                      busyReason: 'sibling_in_call',
                      busyBySibling: true,
                      busySiblingProviderId: busyProvider.id,
                    };
                  }
                  return p;
                })
              };
            }));
          } else {
            setAccounts(prev => prev.map(a => {
              if (a.userId !== account.userId) return a;
              return { ...a, shareBusyStatus: newValue };
            }));
          }
        } else {
          // Pas de provider busy, juste mettre à jour le flag
          setAccounts(prev => prev.map(a => {
            if (a.userId !== account.userId) return a;
            return { ...a, shareBusyStatus: newValue };
          }));
        }
      } else {
        // Désactivation: juste mettre à jour le flag local
        setAccounts(prev => prev.map(a => {
          if (a.userId !== account.userId) return a;
          return { ...a, shareBusyStatus: newValue };
        }));
      }

      const syncText = siblingsUpdated > 0
        ? ` (${siblingsUpdated} sibling(s) synchronisé(s) immédiatement)`
        : '';
      setSuccess(newValue
        ? `✅ Synchronisation du statut activée${syncText}`
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

  // Save Telegram chat ID for a multi-provider account
  const saveTelegramChatId = async (accountId: string) => {
    const chatId = (telegramEdits[accountId] ?? '').trim();
    setSaving(accountId);
    try {
      await updateDoc(doc(db, 'users', accountId), {
        telegramChatId: chatId || null,
        updatedAt: serverTimestamp(),
      });
      setAccounts(prev => prev.map(a =>
        a.userId === accountId ? { ...a, telegramChatId: chatId || undefined } : a
      ));
      setTelegramEdits(prev => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      setSuccess(chatId ? 'Telegram chat ID sauvegardé' : 'Telegram chat ID supprimé');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving telegramChatId:', err);
      setError('Erreur lors de la sauvegarde du Telegram chat ID');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Force a provider to busy or available status
  // ✅ BUG FIX: Propage maintenant le statut aux siblings si shareBusyStatus est activé
  const forceProviderStatus = async (
    providerId: string,
    newStatus: 'available' | 'busy',
    reason?: string
  ) => {
    setSaving(providerId);
    const now = serverTimestamp();

    try {
      // 1. Trouver le compte qui contient ce provider pour vérifier shareBusyStatus
      const parentAccount = accounts.find(a => a.providers.some(p => p.id === providerId));
      const shouldPropagate = parentAccount?.shareBusyStatus === true;
      // 🔒 Ignorer les prestataires verrouillés hors ligne
      const siblingIds = shouldPropagate
        ? parentAccount.providers
            .filter(p => p.id !== providerId && p.receiveBusyFromSiblings !== false && p.lockedOffline !== true)
            .map(p => p.id)
        : [];

      console.log(`[forceProviderStatus] Provider: ${providerId}, Status: ${newStatus}, Propagate: ${shouldPropagate}, Siblings: ${siblingIds.length}`);

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

      // 2. Préparer les données de mise à jour pour les siblings
      const siblingUpdateData = newStatus === 'busy'
        ? {
            availability: 'busy',
            isOnline: true,
            lastActivity: now,
            busyReason: 'sibling_manually_disabled',
            busySince: now,
            busyBySibling: true,
            busySiblingProviderId: providerId,
            lastStatusChange: now,
            updatedAt: now
          }
        : {
            availability: 'available',
            isOnline: true,
            lastActivity: now,
            busyReason: null,
            busySince: null,
            busyBySibling: null,
            busySiblingProviderId: null,
            busySiblingCallSessionId: null,
            lastStatusChange: now,
            updatedAt: now
          };

      // 3. Update le provider principal
      let profileUpdated = false;
      let userUpdated = false;

      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData)
          .then(() => { profileUpdated = true; })
          .catch((err) => {
            console.warn(`[forceProviderStatus] Failed to update sos_profiles/${providerId}:`, err.message);
          }),
        updateDoc(doc(db, 'users', providerId), updateData)
          .then(() => { userUpdated = true; })
          .catch((err) => {
            console.warn(`[forceProviderStatus] Failed to update users/${providerId}:`, err.message);
          })
      ]);

      if (!profileUpdated && !userUpdated) {
        throw new Error(`Impossible de forcer le statut: aucun document trouvé pour ce prestataire`);
      }

      // 4. ✅ BUG FIX: Propager aux siblings si shareBusyStatus est activé
      let siblingsUpdated = 0;
      if (siblingIds.length > 0) {
        console.log(`[forceProviderStatus] Propagating ${newStatus} to ${siblingIds.length} siblings...`);

        for (const siblingId of siblingIds) {
          // Pour "available", ne libérer QUE si le sibling était busy par CE provider
          if (newStatus === 'available') {
            const siblingProvider = parentAccount?.providers.find(p => p.id === siblingId);
            // Si le sibling n'était pas busy par propagation de CE provider, ne pas le modifier
            if (siblingProvider?.busyBySibling !== true || siblingProvider?.busySiblingProviderId !== providerId) {
              console.log(`[forceProviderStatus] Sibling ${siblingId} not busy by this provider, skipping`);
              continue;
            }
          }

          try {
            await Promise.all([
              updateDoc(doc(db, 'sos_profiles', siblingId), siblingUpdateData).catch(() => {}),
              updateDoc(doc(db, 'users', siblingId), siblingUpdateData).catch(() => {})
            ]);
            siblingsUpdated++;
            console.log(`[forceProviderStatus] ✅ Sibling ${siblingId} updated to ${newStatus}`);
          } catch (sibErr) {
            console.warn(`[forceProviderStatus] Failed to update sibling ${siblingId}:`, sibErr);
          }
        }
      }

      // 5. Update local state - inclure les siblings mis à jour
      setAccounts(prev => prev.map(a => ({
        ...a,
        providers: a.providers.map(p => {
          // Provider principal
          if (p.id === providerId) {
            return {
              ...p,
              availability: newStatus,
              isOnline: true,
              busyReason: newStatus === 'busy' ? (reason || 'manually_disabled') : undefined,
              busyBySibling: false,
              busySiblingProviderId: undefined,
              currentCallSessionId: undefined
            };
          }
          // Siblings mis à jour (si propagation activée)
          if (shouldPropagate && siblingIds.includes(p.id)) {
            // Pour "available", vérifier si le sibling était bien busy par ce provider
            if (newStatus === 'available') {
              if (p.busyBySibling !== true || p.busySiblingProviderId !== providerId) {
                return p; // Ne pas modifier
              }
            }
            return {
              ...p,
              availability: newStatus,
              isOnline: true,
              busyReason: newStatus === 'busy' ? 'sibling_manually_disabled' : undefined,
              busyBySibling: newStatus === 'busy',
              busySiblingProviderId: newStatus === 'busy' ? providerId : undefined,
            };
          }
          return p;
        })
      })));

      const statusText = newStatus === 'busy' ? 'Occupé' : 'Disponible';
      const propagationText = siblingsUpdated > 0
        ? ` + ${siblingsUpdated} sibling(s) synchronisé(s)`
        : '';
      setSuccess(`Statut forcé: ${statusText}${propagationText}`);
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
      let profileUpdated = false;
      let userUpdated = false;

      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData)
          .then(() => { profileUpdated = true; })
          .catch((err) => {
            console.warn(`[updateProviderPayoutMode] Failed to update sos_profiles/${providerId}:`, err.message);
          }),
        updateDoc(doc(db, 'users', providerId), updateData)
          .then(() => { userUpdated = true; })
          .catch((err) => {
            console.warn(`[updateProviderPayoutMode] Failed to update users/${providerId}:`, err.message);
          })
      ]);

      if (!profileUpdated && !userUpdated) {
        throw new Error(`Impossible de mettre à jour le mode de paiement: aucun document trouvé pour ce prestataire`);
      }

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
  // ✅ Respecte le verrouillage: les prestataires avec lockedOffline=true restent hors ligne
  const setAllProvidersStatus = async (account: MultiProviderAccount, online: boolean) => {
    setSaving(account.userId);
    const now = serverTimestamp();

    try {
      let successCount = 0;
      let failCount = 0;
      let lockedCount = 0;

      const updatePromises = account.providers.map(async (provider) => {
        // 🔒 Si verrouillé et qu'on essaie de mettre en ligne → ignorer
        if (online && provider.lockedOffline === true) {
          console.log(`[setAllProvidersStatus] 🔒 Provider ${provider.id} is locked offline, skipping`);
          lockedCount++;
          return;
        }

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
        let profileUpdated = false;
        let userUpdated = false;

        await Promise.all([
          updateDoc(doc(db, 'sos_profiles', provider.id), updateData)
            .then(() => { profileUpdated = true; })
            .catch((err) => {
              console.warn(`[setAllProvidersStatus] Failed to update sos_profiles/${provider.id}:`, err.message);
            }),
          updateDoc(doc(db, 'users', provider.id), updateData)
            .then(() => { userUpdated = true; })
            .catch((err) => {
              console.warn(`[setAllProvidersStatus] Failed to update users/${provider.id}:`, err.message);
            })
        ]);

        if (profileUpdated || userUpdated) {
          successCount++;
        } else {
          failCount++;
          console.warn(`[setAllProvidersStatus] Provider ${provider.id} not found in any collection`);
        }
      });

      await Promise.all(updatePromises);

      // If ALL updates failed, throw an error
      if (successCount === 0 && failCount > 0) {
        throw new Error(`Aucun prestataire n'a pu être mis à jour`);
      }

      // Update local state (respecter les verrouillés)
      setAccounts(prev => prev.map(a => {
        if (a.userId !== account.userId) return a;
        return {
          ...a,
          providers: a.providers.map(p => {
            // 🔒 Ne pas modifier les prestataires verrouillés quand on met en ligne
            if (online && p.lockedOffline === true) {
              return p;
            }
            return {
              ...p,
              availability: online ? 'available' : 'offline',
              isOnline: online,
              busyReason: online ? undefined : 'offline',
            };
          })
        };
      }));

      const lockedText = lockedCount > 0 ? ` (${lockedCount} verrouillé(s) ignoré(s) 🔒)` : '';
      setSuccess(`Tous les prestataires sont maintenant ${online ? 'en ligne' : 'hors ligne'}${lockedText}`);
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
      // Track which updates succeeded to detect if provider doesn't exist
      let profileUpdated = false;
      let userUpdated = false;

      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData)
          .then(() => { profileUpdated = true; })
          .catch((err) => {
            console.warn(`[toggleProviderOnline] Failed to update sos_profiles/${providerId}:`, err.message);
          }),
        updateDoc(doc(db, 'users', providerId), updateData)
          .then(() => { userUpdated = true; })
          .catch((err) => {
            console.warn(`[toggleProviderOnline] Failed to update users/${providerId}:`, err.message);
          })
      ]);

      // If BOTH updates failed, the provider doesn't exist in either collection
      if (!profileUpdated && !userUpdated) {
        throw new Error(`Impossible de mettre à jour le statut: aucun document trouvé pour ce prestataire`);
      }

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

  // 🆕 Toggle individual provider coupling (receiveBusyFromSiblings)
  const toggleProviderCoupling = async (providerId: string, currentlyReceiving: boolean) => {
    setSaving(providerId);
    const newValue = !currentlyReceiving;

    try {
      const updateData = {
        receiveBusyFromSiblings: newValue,
        updatedAt: serverTimestamp(),
      };

      // Update sos_profiles (primary) and users (optional)
      let profileUpdated = false;
      let userUpdated = false;

      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData)
          .then(() => { profileUpdated = true; })
          .catch((err) => {
            console.warn(`[toggleProviderCoupling] Failed to update sos_profiles/${providerId}:`, err.message);
          }),
        updateDoc(doc(db, 'users', providerId), updateData)
          .then(() => { userUpdated = true; })
          .catch((err) => {
            console.warn(`[toggleProviderCoupling] Failed to update users/${providerId}:`, err.message);
          })
      ]);

      if (!profileUpdated && !userUpdated) {
        throw new Error(`Impossible de modifier le couplage: aucun document trouvé pour ce prestataire`);
      }

      // Update local state
      setAccounts(prev => prev.map(a => ({
        ...a,
        providers: a.providers.map(p =>
          p.id === providerId ? { ...p, receiveBusyFromSiblings: newValue } : p
        )
      })));

      setSuccess(newValue
        ? 'BusyOn - ce prestataire passera en busy si un autre est en appel'
        : 'BusyOff - ce prestataire restera disponible même si un autre est en appel'
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error('Error toggling provider coupling:', err);
      setError('Erreur lors de la modification du couplage');
    } finally {
      setSaving(null);
    }
  };

  // 🆕 Toggle provider lock (lockedOffline) - Verrouille un prestataire en mode hors ligne
  const toggleProviderLock = async (providerId: string, currentlyLocked: boolean) => {
    setSaving(providerId);
    const newValue = !currentlyLocked;
    const now = serverTimestamp();

    try {
      // Si on verrouille, mettre aussi hors ligne
      const updateData = newValue
        ? {
            lockedOffline: true,
            availability: 'offline',
            isOnline: false,
            busyReason: 'locked_offline',
            lastStatusChange: now,
            updatedAt: now,
          }
        : {
            lockedOffline: false,
            // Ne pas changer le statut online/offline quand on déverrouille
            // L'admin devra manuellement remettre en ligne si souhaité
            updatedAt: now,
          };

      // Update sos_profiles (primary) and users (optional)
      let profileUpdated = false;
      let userUpdated = false;

      await Promise.all([
        updateDoc(doc(db, 'sos_profiles', providerId), updateData)
          .then(() => { profileUpdated = true; })
          .catch((err) => {
            console.warn(`[toggleProviderLock] Failed to update sos_profiles/${providerId}:`, err.message);
          }),
        updateDoc(doc(db, 'users', providerId), updateData)
          .then(() => { userUpdated = true; })
          .catch((err) => {
            console.warn(`[toggleProviderLock] Failed to update users/${providerId}:`, err.message);
          })
      ]);

      if (!profileUpdated && !userUpdated) {
        throw new Error(`Impossible de modifier le verrouillage: aucun document trouvé pour ce prestataire`);
      }

      // Update local state
      setAccounts(prev => prev.map(a => ({
        ...a,
        providers: a.providers.map(p => {
          if (p.id !== providerId) return p;
          if (newValue) {
            // Verrouillage: mettre aussi hors ligne
            return {
              ...p,
              lockedOffline: true,
              availability: 'offline',
              isOnline: false,
              busyReason: 'locked_offline',
            };
          } else {
            // Déverrouillage: juste enlever le verrou
            return {
              ...p,
              lockedOffline: false,
            };
          }
        })
      })));

      setSuccess(newValue
        ? '🔒 Prestataire verrouillé hors ligne - restera hors ligne même avec "Tous en ligne"'
        : '🔓 Prestataire déverrouillé - peut maintenant être mis en ligne'
      );
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      console.error('Error toggling provider lock:', err);
      setError('Erreur lors du verrouillage');
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
  // FIX MULTI-PROVIDER FLAGS
  // ============================================================================

  // Fix accounts that have 2+ linked providers but are missing isMultiProvider=true
  // A TRUE multi-provider account = 2 or more providers linked to the same user account
  const fixMultiProviderFlags = async () => {
    setCleanupRunning(true);
    setError(null);

    try {
      // Get all users from Firestore
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
      let fixed = 0;
      let singleProviderFixed = 0;

      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        const linkedIds: string[] = data.linkedProviderIds || [];

        // Skip provider docs (they have denormalized linkedProviderIds, not real accounts)
        if (profilesMap.has(docSnap.id)) continue;

        // TRUE multi-provider = 2 or more providers linked
        if (linkedIds.length >= 2 && data.isMultiProvider !== true) {
          // Should be marked as multi-provider but isn't
          await updateDoc(doc(db, 'users', docSnap.id), {
            isMultiProvider: true,
            updatedAt: serverTimestamp()
          });
          fixed++;
        } else if (linkedIds.length < 2 && data.isMultiProvider === true) {
          // Has flag but shouldn't (less than 2 providers)
          await updateDoc(doc(db, 'users', docSnap.id), {
            isMultiProvider: false,
            updatedAt: serverTimestamp()
          });
          singleProviderFixed++;
        }
      }

      if (fixed > 0 || singleProviderFixed > 0) {
        setSuccess(`✅ ${fixed} compte(s) multi-prestataires marqué(s), ${singleProviderFixed} compte(s) mono-prestataire corrigé(s)`);
        await loadData();
      } else {
        setSuccess('Tous les comptes sont déjà correctement configurés');
      }
    } catch (err) {
      console.error('Error fixing multi-provider flags:', err);
      setError('Erreur lors de la réparation des flags');
    } finally {
      setCleanupRunning(false);
    }
  };

  // ============================================================================
  // ORPHAN CLEANUP (Frontend-based - no Cloud Function needed)
  // ============================================================================

  // State for orphaned IDs details
  const [orphanedDetails, setOrphanedDetails] = useState<{
    accountName: string;
    orphanedIds: string[];
  }[]>([]);

  // 🆕 Check for orphaned providers (directly from Firestore)
  const checkOrphans = async () => {
    setCleanupRunning(true);
    setError(null);

    try {
      // Get all valid provider IDs from sos_profiles (cached in profilesMap)
      const validProviderIds = new Set<string>();
      profilesMap.forEach((profile, id) => {
        if (profile.type === 'lawyer' || profile.type === 'expat') {
          validProviderIds.add(id);
        }
      });

      console.log(`[checkOrphans] Found ${validProviderIds.size} valid providers in cache`);

      // Check each multi-provider account
      let totalOrphanedLinks = 0;
      let staleBusySiblings = 0;
      const details: { accountName: string; orphanedIds: string[] }[] = [];

      for (const account of accounts) {
        const orphanedIds: string[] = [];

        // Check each linkedProviderId
        for (const provider of account.providers) {
          // If provider is in the list but doesn't have valid data, it might be orphaned
          // Actually, providers in account.providers are already validated (they came from profilesMap)
        }

        // Check the raw linkedProviderIds from the user document
        const userDoc = allUsers.find(u => u.id === account.userId);
        if (userDoc) {
          for (const pid of userDoc.linkedProviderIds) {
            if (!validProviderIds.has(pid)) {
              orphanedIds.push(pid);
              totalOrphanedLinks++;
            }
          }
        }

        // Check for stale busy siblings
        for (const provider of account.providers) {
          if (provider.busySiblingProviderId && !validProviderIds.has(provider.busySiblingProviderId)) {
            staleBusySiblings++;
          }
        }

        if (orphanedIds.length > 0) {
          details.push({
            accountName: account.displayName,
            orphanedIds
          });
        }
      }

      setCleanupStats({
        orphanedLinks: totalOrphanedLinks,
        staleBusy: staleBusySiblings,
      });
      setOrphanedDetails(details);

      if (totalOrphanedLinks > 0 || staleBusySiblings > 0) {
        setSuccess(`Trouvé: ${totalOrphanedLinks} liens orphelins, ${staleBusySiblings} statuts busy obsolètes`);
        // Log details
        console.log('[checkOrphans] Orphaned details:', details);
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

  // 🆕 Run cleanup (directly update Firestore)
  const runCleanup = async () => {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les prestataires orphelins? Cette action est irréversible.')) {
      return;
    }

    setCleanupRunning(true);
    setError(null);

    try {
      // Get all valid provider IDs from sos_profiles
      const validProviderIds = new Set<string>();
      profilesMap.forEach((profile, id) => {
        if (profile.type === 'lawyer' || profile.type === 'expat') {
          validProviderIds.add(id);
        }
      });

      let orphanedLinksRemoved = 0;
      let usersFixed = 0;

      // Process each account
      for (const account of accounts) {
        const userDoc = allUsers.find(u => u.id === account.userId);
        if (!userDoc) continue;

        const currentLinkedIds = userDoc.linkedProviderIds;
        const validLinkedIds = currentLinkedIds.filter(id => validProviderIds.has(id));

        if (validLinkedIds.length < currentLinkedIds.length) {
          // Update the account owner document
          await updateDoc(doc(db, 'users', account.userId), {
            linkedProviderIds: validLinkedIds,
            updatedAt: serverTimestamp()
          });

          // ✅ DENORMALIZATION: Update remaining provider docs with new (smaller) list
          const denormData = {
            linkedProviderIds: validLinkedIds,
            shareBusyStatus: account.shareBusyStatus,
            updatedAt: serverTimestamp()
          };
          for (const pid of validLinkedIds) {
            await Promise.all([
              updateDoc(doc(db, 'users', pid), denormData).catch(() => {}),
              updateDoc(doc(db, 'sos_profiles', pid), denormData).catch(() => {}),
            ]);
          }
          // Clean up orphaned provider docs
          const removedIds = currentLinkedIds.filter(id => !validProviderIds.has(id));
          const cleanData = { linkedProviderIds: [], shareBusyStatus: false, updatedAt: serverTimestamp() };
          for (const pid of removedIds) {
            await Promise.all([
              updateDoc(doc(db, 'users', pid), cleanData).catch(() => {}),
              updateDoc(doc(db, 'sos_profiles', pid), cleanData).catch(() => {}),
            ]);
          }

          orphanedLinksRemoved += (currentLinkedIds.length - validLinkedIds.length);
          usersFixed++;
        }
      }

      if (orphanedLinksRemoved > 0) {
        setSuccess(`Nettoyage terminé: ${orphanedLinksRemoved} liens orphelins supprimés de ${usersFixed} compte(s)`);
        setCleanupStats(null);
        setOrphanedDetails([]);
        // Reload data to reflect changes
        await loadData();
      } else {
        setSuccess('Aucun orphelin à nettoyer');
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
              {/* Fix Multi-Provider Flags button */}
              <button
                onClick={fixMultiProviderFlags}
                disabled={cleanupRunning}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                title="Réparer les comptes existants (ajouter isMultiProvider=true)"
              >
                {cleanupRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Réparer flags</span>
              </button>

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

      {/* Orphaned Details Display */}
      {orphanedDetails.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            IDs Orphelins Détectés
          </h3>
          <div className="space-y-3">
            {orphanedDetails.map((detail, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
                <p className="font-medium text-gray-900 dark:text-white mb-2">
                  {detail.accountName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.orphanedIds.map((id, idIdx) => (
                    <span
                      key={idIdx}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-mono"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            Cliquez sur le bouton "Orphelins" pour nettoyer ces IDs invalides.
          </p>
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
                  {/* Share Busy Status Toggle (compte) */}
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

                  {/* Telegram Chat ID for payment notifications */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Telegram Chat ID"
                      value={telegramEdits[account.userId] ?? account.telegramChatId ?? ''}
                      onChange={(e) => setTelegramEdits(prev => ({ ...prev, [account.userId]: e.target.value }))}
                      className="w-40 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400"
                    />
                    {(telegramEdits[account.userId] !== undefined && telegramEdits[account.userId] !== (account.telegramChatId ?? '')) && (
                      <button
                        onClick={() => saveTelegramChatId(account.userId)}
                        disabled={saving === account.userId}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                        title="Sauvegarder le Telegram Chat ID"
                      >
                        {saving === account.userId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                    )}
                    {account.telegramChatId && telegramEdits[account.userId] === undefined && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400" title="Telegram configuré">TG</span>
                    )}
                  </div>

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
                            {(() => {
                              const providerGateway = provider.paymentGateway || getPaymentGateway(provider.country);
                              const matchingAccounts = payoutConfig.externalAccounts.filter(acc => acc.gateway === providerGateway);
                              if (matchingAccounts.length === 0) {
                                return (
                                  <option value="" disabled>
                                    Aucun compte {providerGateway.toUpperCase()} externe configuré
                                  </option>
                                );
                              }
                              return matchingAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.gateway.toUpperCase()})
                                </option>
                              ));
                            })()}
                          </select>
                        </div>

                        {/* 🆕 Toggle Busy Sync (individual) - BusyOn/BusyOff */}
                        <button
                          onClick={() => toggleProviderCoupling(provider.id, provider.receiveBusyFromSiblings !== false)}
                          disabled={saving === provider.id}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                            provider.receiveBusyFromSiblings !== false
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                          )}
                          title={provider.receiveBusyFromSiblings !== false
                            ? "BusyOn: passe en busy si un autre prestataire est en appel"
                            : "BusyOff: reste disponible même si un autre prestataire est en appel"
                          }
                        >
                          {provider.receiveBusyFromSiblings !== false ? (
                            <ToggleRight className="w-3.5 h-3.5" />
                          ) : (
                            <ToggleLeft className="w-3.5 h-3.5" />
                          )}
                          {provider.receiveBusyFromSiblings !== false ? 'BusyOn' : 'BusyOff'}
                        </button>

                        {/* 🆕 Bouton Cadenas - Verrouillage hors ligne */}
                        <button
                          onClick={() => toggleProviderLock(provider.id, provider.lockedOffline === true)}
                          disabled={saving === provider.id}
                          className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                            provider.lockedOffline === true
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                          )}
                          title={provider.lockedOffline === true
                            ? "🔒 Verrouillé hors ligne - Cliquer pour déverrouiller"
                            : "🔓 Déverrouillé - Cliquer pour verrouiller hors ligne"
                          }
                        >
                          {provider.lockedOffline === true ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>

                        {/* 🆕 Toggle Online/Offline - individual control */}
                        <button
                          onClick={() => toggleProviderOnline(provider.id, provider.isOnline && provider.availability !== 'offline')}
                          disabled={saving === provider.id || provider.lockedOffline === true}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50",
                            provider.lockedOffline === true
                              ? "bg-amber-400 cursor-not-allowed"
                              : provider.isOnline && provider.availability !== 'offline'
                                ? "bg-green-500 focus:ring-green-500"
                                : "bg-gray-300 dark:bg-gray-600 focus:ring-gray-500"
                          )}
                          title={provider.lockedOffline === true
                            ? "🔒 Verrouillé - Déverrouillez d'abord pour mettre en ligne"
                            : provider.isOnline && provider.availability !== 'offline'
                              ? "Mettre hors ligne"
                              : "Mettre en ligne"
                          }
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                              provider.isOnline && provider.availability !== 'offline' && !provider.lockedOffline ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                        <span className={cn(
                          "text-xs font-medium min-w-[50px]",
                          provider.lockedOffline === true
                            ? "text-amber-600 dark:text-amber-400"
                            : provider.isOnline && provider.availability !== 'offline'
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-500 dark:text-gray-400"
                        )}>
                          {provider.lockedOffline === true
                            ? '🔒 Verrouillé'
                            : provider.isOnline && provider.availability !== 'offline'
                              ? 'En ligne'
                              : 'Hors ligne'
                          }
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
