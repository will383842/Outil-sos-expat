// src/pages/admin/AdminClients.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAdminTranslations } from '../../utils/adminTranslations';
import {
  Search,
  Phone,
  Mail,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  Globe,
  MoreHorizontal,
  X,
  ExternalLink,
  Edit3,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Clock,
  Calendar,
  Ban,
  UserPlus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  startAfter,
  getCountFromServer,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
  Query as FSQuery,
  CollectionReference,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminErrorState from '../../components/admin/AdminErrorState';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { logError } from '../../utils/logging';
import { getCountryName, getCountryFlag } from '../../utils/formatters';

// ============================================================================
// TYPES
// ============================================================================

type ClientStatus = 'active' | 'pending' | 'blocked' | 'suspended';

type Client = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  status: ClientStatus;
  createdAt: Date;
  lastLoginAt?: Date;
  callsCount: number;
  totalSpent: number;
  emailVerified: boolean;
  phoneVerified?: boolean;
  language?: string;
  whatsappGroupClicked?: boolean;
  hasTelegram?: boolean;
  telegramId?: number | null;
  profilePhoto?: string;
  photoURL?: string;
  isBanned?: boolean;
  banReason?: string;
};

type FirestoreClientDoc = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  status?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  callsCount?: number;
  totalSpent?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  language?: string;
  preferredLanguage?: string;
  whatsappGroupClicked?: boolean;
  hasTelegram?: boolean;
  telegramId?: number;
  suspendedReason?: string;
  suspendedAt?: Timestamp;
  profilePhoto?: string;
  photoURL?: string;
  isBanned?: boolean;
  banReason?: string;
};

type AdvancedFilters = {
  status: 'all' | ClientStatus;
  emailVerified: 'all' | 'verified' | 'unverified';
  dateRange: 'all' | 'today' | 'week' | 'month';
};

// ============================================================================
// CONSTANTS
// ============================================================================

const CLIENTS_PER_PAGE = 25;

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Actif', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  pending: { label: 'En attente', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  suspended: { label: 'Suspendu', bg: 'bg-red-100', text: 'text-red-700' },
  blocked: { label: 'Bloque', bg: 'bg-gray-100', text: 'text-gray-700' },
};

// ============================================================================
// HELPERS
// ============================================================================

/** Relative time: "il y a 2h", "il y a 3j", etc. */
function timeAgo(date: Date | undefined): string {
  if (!date || date.getTime() === 0) return '\u2014';
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 0) return '\u2014';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)}an${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

function formatDateFull(date: Date | undefined): string {
  if (!date || date.getTime() === 0) return '\u2014';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatDateShort(date: Date | undefined): string {
  if (!date || date.getTime() === 0) return '\u2014';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
}

// Client-specific strings not in useAdminTranslations
const t = {
  title: 'Clients',
  subtitle: 'Gestion des clients',
  noResults: 'Aucun client trouve',
  noResultsDesc: 'Aucun client ne correspond aux criteres de recherche.',
  activate: 'Activer',
  suspend: 'Suspendre',
  delete: 'Supprimer',
  callsSpend: 'appels',
  exportAllRunning: 'Export en cours...',
  exportAllDone: 'Export termine',
  exportAllCap: 'Limite atteinte (5000 lignes). Affinez vos filtres.',
  successUpdate: 'Mise a jour reussie.',
  errorUpdate: 'Erreur lors de la mise a jour.',
  reasonTitleSuspend: 'Raison de suspension',
  reasonTitleDelete: 'Confirmer la suppression',
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdminClients: React.FC = () => {
  const adminT = useAdminTranslations();

  // --- State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState<'createdAt' | 'lastLoginAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [countries, setCountries] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    status: 'all', emailVerified: 'all', dateRange: 'all',
  });
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Delete modal
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Bulk delete
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });

  // Total count
  const [totalExact, setTotalExact] = useState<number | null>(null);

  // --- Close action menu on outside click ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- Build Firestore constraints ---
  const buildConstraints = useCallback((): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [where('role', '==', 'client')];

    if (advancedFilters.status !== 'all') constraints.push(where('status', '==', advancedFilters.status));
    if (advancedFilters.emailVerified !== 'all') constraints.push(where('emailVerified', '==', advancedFilters.emailVerified === 'verified'));
    if (selectedCountry !== 'all' && selectedCountry.trim() !== '') constraints.push(where('country', '==', selectedCountry.trim()));
    if (advancedFilters.dateRange !== 'all') {
      const now = new Date();
      let cutoff = new Date(now);
      if (advancedFilters.dateRange === 'today') cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (advancedFilters.dateRange === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        cutoff = new Date(now.setDate(diff));
        cutoff.setHours(0, 0, 0, 0);
      }
      if (advancedFilters.dateRange === 'month') cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(cutoff)));
    }

    return constraints;
  }, [advancedFilters, selectedCountry]);

  // --- Fetch exact count ---
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const base = collection(db, 'users') as CollectionReference<DocumentData>;
        const constraints = buildConstraints();
        const q: FSQuery<DocumentData> = query(base, ...constraints);
        const snap = await getCountFromServer(q);
        setTotalExact(snap.data().count);
      } catch (e) {
        console.error('[AdminClients] count error', e);
        setTotalExact(null);
      }
    };
    void fetchCount();
  }, [buildConstraints]);

  // --- Fetch clients ---
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);

        const base = collection(db, 'users') as CollectionReference<DocumentData>;
        const constraints = buildConstraints();
        constraints.push(orderBy(sortField, sortDirection));
        constraints.push(limit(page * CLIENTS_PER_PAGE));

        const snap = await getDocs(query(base, ...constraints));
        let data: Client[] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
          const raw = d.data() as FirestoreClientDoc;
          return {
            id: d.id,
            email: raw.email ?? '',
            firstName: raw.firstName ?? '',
            lastName: raw.lastName ?? '',
            phone: raw.phone ?? '',
            country: raw.country ?? '',
            city: raw.city ?? '',
            status: (raw.status ?? 'active') as ClientStatus,
            createdAt: raw.createdAt ? raw.createdAt.toDate() : new Date(),
            lastLoginAt: raw.lastLoginAt ? raw.lastLoginAt.toDate() : undefined,
            callsCount: raw.callsCount ?? 0,
            totalSpent: raw.totalSpent ?? 0,
            emailVerified: !!raw.emailVerified,
            phoneVerified: !!raw.phoneVerified,
            language: raw.language || raw.preferredLanguage || undefined,
            whatsappGroupClicked: !!raw.whatsappGroupClicked,
            hasTelegram: !!raw.hasTelegram,
            telegramId: raw.telegramId || null,
            profilePhoto: raw.profilePhoto,
            photoURL: raw.photoURL,
            isBanned: !!raw.isBanned,
            banReason: raw.banReason,
          };
        });

        const uniqueCountries = Array.from(new Set(data.map((c) => c.country ?? '')))
          .filter(Boolean).sort((a, b) => a.localeCompare(b));
        setCountries(uniqueCountries);
        setClients(data);
        setHasMore(snap.docs.length === page * CLIENTS_PER_PAGE);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Error loading clients:', err);
        logError({ origin: 'frontend', error: `Error loading clients: ${msg}`, context: { component: 'AdminClients' } });
        setError('Erreur lors du chargement. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    void fetchClients();
  }, [buildConstraints, sortField, sortDirection, page]);

  // --- Filtered clients (local search) ---
  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  // --- Handlers ---
  const handleSortChange = (field: 'createdAt' | 'lastLoginAt') => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection('desc'); }
  };

  const updateClientStatus = async (clientId: string, newStatus: ClientStatus, reason?: string) => {
    try {
      const payload: Record<string, unknown> = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'suspended') {
        payload.suspendedReason = reason || null;
        payload.suspendedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'users', clientId), payload);
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
      toast.success(t.successUpdate);
    } catch (error: unknown) {
      console.error('Erreur de mise a jour du statut:', error);
      logError({ origin: 'frontend', error: `Error updating client status: ${error instanceof Error ? error.message : String(error)}`, context: { clientId } });
      toast.error(t.errorUpdate);
    }
  };

  const handleSuspendClient = (client: Client) => {
    setSelectedClient(client);
    setSuspendReason('');
    setShowSuspendModal(true);
    setOpenActionMenuId(null);
  };

  const confirmSuspendClient = async () => {
    if (!selectedClient) return;
    setIsActionLoading(true);
    try {
      await updateClientStatus(selectedClient.id, 'suspended', suspendReason);
      setShowSuspendModal(false);
      setSelectedClient(null);
    } catch (err) {
      toast.error(t.errorUpdate);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setDeleteReason('');
    setDeleteConfirmText('');
    setShowDeleteModal(true);
    setOpenActionMenuId(null);
  };

  const confirmDeleteClient = async () => {
    if (!selectedClient) return;
    setIsActionLoading(true);
    try {
      await deleteDoc(doc(db, 'users', selectedClient.id));
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      setSelectedClientIds((prev) => { const n = new Set(prev); n.delete(selectedClient.id); return n; });
      setShowDeleteModal(false);
      setSelectedClient(null);
      setDeleteReason('');
      setDeleteConfirmText('');
      toast.success('Client supprimé');
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
      logError({ origin: 'frontend', error: `Error deleting client: ${err instanceof Error ? err.message : String(err)}`, context: { clientId: selectedClient.id } });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedClientIds.size === 0) return;
    setBulkDeleteReason('');
    setBulkDeleteConfirmText('');
    setBulkDeleteProgress({ current: 0, total: 0 });
    setShowBulkDeleteModal(true);
  };

  const executeBulkDelete = async () => {
    const ids = Array.from(selectedClientIds);
    setBulkDeleteProgress({ current: 0, total: ids.length });
    setIsActionLoading(true);
    const errors: string[] = [];
    const batch = writeBatch(db);
    ids.forEach((id) => batch.delete(doc(db, 'users', id)));
    try {
      await batch.commit();
      setBulkDeleteProgress({ current: ids.length, total: ids.length });
      setClients((prev) => prev.filter((c) => !selectedClientIds.has(c.id)));
      setSelectedClientIds(new Set());
      setShowBulkDeleteModal(false);
      toast.success(`${ids.length} client(s) supprimé(s)`);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      toast.error(`Erreur lors de la suppression en lot`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedClientIds.size === 0) return;
    setIsActionLoading(true);
    try {
      const batch = writeBatch(db);
      selectedClientIds.forEach((id) => {
        batch.update(doc(db, 'users', id), { status: 'active', updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setClients((prev) => prev.map((c) => selectedClientIds.has(c.id) ? { ...c, status: 'active' as ClientStatus } : c));
      setSelectedClientIds(new Set());
      toast.success(t.successUpdate);
    } catch (err) {
      toast.error(t.errorUpdate);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedClientIds.size === 0) return;
    setIsActionLoading(true);
    try {
      const batch = writeBatch(db);
      selectedClientIds.forEach((id) => {
        batch.update(doc(db, 'users', id), { status: 'suspended', suspendedReason: 'Suspension en lot', suspendedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setClients((prev) => prev.map((c) => selectedClientIds.has(c.id) ? { ...c, status: 'suspended' as ClientStatus } : c));
      setSelectedClientIds(new Set());
      toast.success(t.successUpdate);
    } catch (err) {
      toast.error(t.errorUpdate);
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleSelectClient = (clientId: string) => {
    setSelectedClientIds((prev) => { const n = new Set(prev); n.has(clientId) ? n.delete(clientId) : n.add(clientId); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedClientIds(selectedClientIds.size === filteredClients.length ? new Set() : new Set(filteredClients.map((c) => c.id)));
  };

  // --- Export CSV ---
  const exportCsv = () => {
    if (filteredClients.length === 0) {
      toast.error('Aucun client a exporter.');
      return;
    }
    const rows = [
      '\uFEFF' + ['ID', 'Email', 'Prénom', 'Nom', 'Téléphone', 'Pays', 'Ville', 'Statut', 'Inscription', 'Dernière connexion', 'Appels', 'Dépenses', 'Email vérifié', 'Langue'].join(';'),
      ...filteredClients.map((c) => [
        c.id, c.email, c.firstName, c.lastName, c.phone ?? '', c.country ?? '', c.city ?? '',
        c.status, c.createdAt.toISOString(), c.lastLoginAt?.toISOString() ?? '',
        c.callsCount, c.totalSpent, c.emailVerified ? 'Oui' : 'Non', c.language ?? '',
      ].join(';')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // --- Export ALL CSV (paginated, max 5000) ---
  const exportAllCsv = async () => {
    try {
      toast(t.exportAllRunning);
      const base = collection(db, 'users') as CollectionReference<DocumentData>;
      const constraintsBase: QueryConstraint[] = [...buildConstraints(), orderBy('createdAt', 'desc')];

      const all: Client[] = [];
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
      const cap = 5000;

      while (all.length < cap) {
        const q: FSQuery<DocumentData> = cursor
          ? query(base, ...constraintsBase, limit(500), startAfter(cursor))
          : query(base, ...constraintsBase, limit(500));
        const snap = await getDocs(q);
        if (snap.empty) break;
        const chunk: Client[] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
          const raw = d.data() as FirestoreClientDoc;
          return {
            id: d.id,
            email: raw.email ?? '',
            firstName: raw.firstName ?? '',
            lastName: raw.lastName ?? '',
            phone: raw.phone ?? '',
            country: raw.country ?? '',
            city: raw.city ?? '',
            status: (raw.status ?? 'active') as ClientStatus,
            createdAt: raw.createdAt ? raw.createdAt.toDate() : new Date(),
            lastLoginAt: raw.lastLoginAt ? raw.lastLoginAt.toDate() : undefined,
            callsCount: raw.callsCount ?? 0,
            totalSpent: raw.totalSpent ?? 0,
            emailVerified: !!raw.emailVerified,
            phoneVerified: !!raw.phoneVerified,
            language: raw.language || raw.preferredLanguage || undefined,
          };
        });

        const term = searchTerm.trim().toLowerCase();
        const filtered = term
          ? chunk.filter((c) =>
              `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
              c.email.toLowerCase().includes(term) ||
              (c.phone || '').toLowerCase().includes(term)
            )
          : chunk;

        all.push(...filtered);
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < 500) break;
      }

      if (all.length >= cap) toast(t.exportAllCap);
      if (all.length === 0) {
        toast.error(t.noResults);
        return;
      }

      const rows = [
        '\uFEFF' + ['ID', 'Email', 'Prénom', 'Nom', 'Téléphone', 'Pays', 'Ville', 'Statut', 'Inscription', 'Dernière connexion', 'Appels', 'Dépenses', 'Email vérifié', 'Langue'].join(';'),
        ...all.map((c) => [
          c.id, c.email, c.firstName, c.lastName, c.phone ?? '', c.country ?? '', c.city ?? '',
          c.status, c.createdAt.toISOString(), c.lastLoginAt?.toISOString() ?? '',
          c.callsCount, c.totalSpent, c.emailVerified ? 'Oui' : 'Non', c.language ?? '',
        ].join(';')),
      ].join('\n');
      const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_all_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.exportAllDone);
    } catch (e) {
      console.error('Export all error', e);
      toast.error(t.errorUpdate);
    }
  };

  // --- Active filter count ---
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.status !== 'all') count++;
    if (advancedFilters.emailVerified !== 'all') count++;
    if (advancedFilters.dateRange !== 'all') count++;
    return count;
  }, [advancedFilters]);

  // --- Sort icon helper ---
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortDirection === 'desc' ? <ChevronDown size={14} className="text-red-600" /> : <ChevronUp size={14} className="text-red-600" />;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && clients.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="large" color="red" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">

        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">{t.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredClients.length} résultat{filteredClients.length > 1 ? 's' : ''}
              {totalExact !== null && ` sur ${totalExact} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportAllCsv} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {error && <AdminErrorState error={error} onRetry={() => setPage(1)} />}

        {/* ===== SEARCH + FILTERS BAR ===== */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 min-w-[140px]">
              <option value="all">Tous les pays</option>
              {countries.map((c) => <option key={c} value={c}>{getCountryFlag(c)} {getCountryName(c, 'fr') || c}</option>)}
            </select>

            <select value={`${sortField}-${sortDirection}`}
              onChange={(e) => { const [f, d] = e.target.value.split('-') as ['createdAt'|'lastLoginAt','asc'|'desc']; setSortField(f); setSortDirection(d); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 min-w-[160px]">
              <option value="createdAt-desc">Plus récents</option>
              <option value="createdAt-asc">Plus anciens</option>
              <option value="lastLoginAt-desc">Connexion recente</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                activeFilterCount > 0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={15} />
              Filtres
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* ===== ADVANCED FILTERS PANEL ===== */}
        {showAdvancedFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Filtres avancés</h3>
              <button onClick={() => setAdvancedFilters({ status: 'all', emailVerified: 'all', dateRange: 'all' })}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                <RefreshCw size={12} /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'status' as const, label: 'Statut', options: [['all','Tous'],['active','Actif'],['pending','En attente'],['suspended','Suspendu'],['blocked','Bloque']] },
                { key: 'emailVerified' as const, label: 'Email vérifié', options: [['all','Tous'],['verified','Vérifié'],['unverified','Non vérifié']] },
                { key: 'dateRange' as const, label: "Periode d'inscription", options: [['all','Tous'],['today',"Aujourd'hui"],['week','Cette semaine'],['month','Ce mois']] },
              ].map(({ key, label, options }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <select value={advancedFilters[key]} onChange={(e) => { setAdvancedFilters((p) => ({ ...p, [key]: e.target.value })); setPage(1); }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500 mr-1">Actifs :</span>
                {advancedFilters.status !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {STATUS_CONFIG[advancedFilters.status]?.label || advancedFilters.status}
                    <button onClick={() => { setAdvancedFilters((p) => ({ ...p, status: 'all' })); setPage(1); }} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.emailVerified !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    Email {advancedFilters.emailVerified === 'verified' ? 'vérifié' : 'non vérifié'}
                    <button onClick={() => { setAdvancedFilters((p) => ({ ...p, emailVerified: 'all' })); setPage(1); }} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.dateRange !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.dateRange === 'today' ? "Aujourd'hui" : advancedFilters.dateRange === 'week' ? 'Cette semaine' : 'Ce mois'}
                    <button onClick={() => { setAdvancedFilters((p) => ({ ...p, dateRange: 'all' })); setPage(1); }} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== BULK ACTIONS BAR ===== */}
        {selectedClientIds.size > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-red-800">
              {selectedClientIds.size} sélectionné{selectedClientIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedClientIds(new Set())} className="text-sm text-red-600 hover:text-red-800 font-medium">
                Désélectionner
              </button>
              <button onClick={handleBulkActivate} disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                <CheckCircle size={14} /> Activer
              </button>
              <button onClick={handleBulkSuspend} disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">
                <Ban size={14} /> Suspendre
              </button>
              <button onClick={handleBulkDelete} disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        )}

        {/* ===== TABLE ===== */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" checked={filteredClients.length > 0 && selectedClientIds.size === filteredClients.length}
                      onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Pays</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSortChange('createdAt')}>
                    <span className="inline-flex items-center gap-1">Inscription <SortIcon field="createdAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 hidden lg:table-cell" onClick={() => handleSortChange('lastLoginAt')}>
                    <span className="inline-flex items-center gap-1">Dernière connexion <SortIcon field="lastLoginAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={9} className="py-16 text-center"><LoadingSpinner text={adminT.loading} /></td></tr>
                ) : filteredClients.length > 0 ? (
                  filteredClients.map((c) => (
                    <tr key={c.id} className={`group transition-colors hover:bg-gray-50/80 ${selectedClientIds.has(c.id) ? 'bg-red-50/50' : ''}`}>
                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-3">
                        <input type="checkbox" checked={selectedClientIds.has(c.id)} onChange={() => toggleSelectClient(c.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                      </td>

                      {/* Client (avatar + name + email) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative flex-shrink-0">
                            <img
                              src={c.photoURL || c.profilePhoto || '/default-avatar.png'}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                            />
                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${c.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => { setSelectedClient(c); setShowClientModal(true); }}
                              className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors truncate block max-w-[180px]"
                              title={`${c.firstName} ${c.lastName}`}
                            >
                              {c.firstName || ''} {c.lastName || ''}
                            </button>
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{c.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact (phone) */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{c.phone || '\u2014'}</span>
                        </div>
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-600">
                          {c.country ? `${getCountryFlag(c.country)} ${getCountryName(c.country, 'fr') || c.country}` : '\u2014'}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600" title={formatDateFull(c.createdAt)}>{formatDateShort(c.createdAt)}</span>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-500" title={c.lastLoginAt ? formatDateFull(c.lastLoginAt) : 'Jamais connecte'}>
                          {timeAgo(c.lastLoginAt)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_CONFIG[c.status]?.bg || 'bg-gray-100'} ${STATUS_CONFIG[c.status]?.text || 'text-gray-700'}`}>
                            {STATUS_CONFIG[c.status]?.label || c.status}
                          </span>
                          {c.isBanned && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">BANNI</span>
                          )}
                        </div>
                      </td>

                      {/* Email verified */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.emailVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {c.emailVerified ? 'Vérifié' : 'Non vérifié'}
                        </span>
                      </td>

                      {/* Actions dropdown */}
                      <td className="px-3 py-3">
                        <div className="relative" ref={openActionMenuId === c.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openActionMenuId === c.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
                              <button onClick={() => { setSelectedClient(c); setShowClientModal(true); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <ExternalLink size={14} className="text-cyan-600" /> Voir le detail
                              </button>
                              <button onClick={() => { void navigator.clipboard.writeText(c.email); toast.success('Email copie'); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Mail size={14} className="text-gray-500" /> Copier email
                              </button>
                              <button onClick={() => { void navigator.clipboard.writeText(c.id); toast.success('ID copie'); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Edit3 size={14} className="text-gray-500" /> Copier ID
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              {c.status !== 'active' && (
                                <button onClick={() => { void updateClientStatus(c.id, 'active'); setOpenActionMenuId(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  <UserPlus size={14} /> Activer
                                </button>
                              )}
                              {c.status !== 'suspended' && (
                                <button onClick={() => handleSuspendClient(c)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
                                  <Ban size={14} /> Suspendre
                                </button>
                              )}
                              <button onClick={() => handleDeleteClient(c)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="py-16 text-center text-gray-400 text-sm">{t.noResults}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="border-t border-gray-100 px-4 py-3">
              <button onClick={() => setPage((p) => p + 1)} disabled={loading}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
                {loading ? 'Chargement...' : 'Charger plus'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ================================================================== */}
      {/* MODAL: CLIENT DETAIL                                               */}
      {/* ================================================================== */}
      <Modal isOpen={showClientModal} onClose={() => setShowClientModal(false)} title="Detail client" size="large">
        {selectedClient && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={selectedClient.photoURL || selectedClient.profilePhoto || '/default-avatar.png'} alt=""
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} />
                <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${selectedClient.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedClient.firstName} {selectedClient.lastName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-blue-50 border-blue-200 text-blue-700`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Client
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${STATUS_CONFIG[selectedClient.status]?.bg} ${STATUS_CONFIG[selectedClient.status]?.text}`}>
                    {STATUS_CONFIG[selectedClient.status]?.label || selectedClient.status}
                  </span>
                  {selectedClient.isBanned && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-semibold">BANNI</span>}
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Mail size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 break-all">{selectedClient.email || '\u2014'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{selectedClient.phone || 'Non renseigne'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">
                      {selectedClient.country
                        ? `${getCountryFlag(selectedClient.country)} ${getCountryName(selectedClient.country, 'fr') || selectedClient.country}`
                        : 'Non renseigne'}
                    </span>
                  </div>
                  {selectedClient.city && (
                    <div className="flex items-center gap-2.5">
                      <Globe size={15} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900">{selectedClient.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates & Activity */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activite</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Inscription</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatDateShort(selectedClient.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Dernière connexion</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900" title={selectedClient.lastLoginAt ? formatDateFull(selectedClient.lastLoginAt) : ''}>
                      {selectedClient.lastLoginAt ? timeAgo(selectedClient.lastLoginAt) : 'Jamais'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Phone size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Appels</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{selectedClient.callsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Download size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Depenses</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{selectedClient.totalSpent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account status */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compte</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Email vérifié', value: selectedClient.emailVerified, yes: 'Oui', no: 'Non' },
                  { label: 'Statut', value: selectedClient.status === 'active', yes: 'Actif', no: selectedClient.status },
                  { label: 'WhatsApp', value: !!selectedClient.whatsappGroupClicked, yes: 'Rejoint', no: 'Non' },
                  { label: 'Telegram', value: !!selectedClient.hasTelegram, yes: `Lie${selectedClient.telegramId ? ` (#${selectedClient.telegramId})` : ''}`, no: 'Non' },
                ].map(({ label, value, yes, no }) => (
                  <div key={label} className="flex flex-col items-center bg-white rounded-lg p-2.5 border border-gray-100">
                    <span className="text-[10px] font-medium text-gray-400 uppercase">{label}</span>
                    <span className={`mt-1 text-xs font-semibold ${value ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {value ? yes : no}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedClient.isBanned && selectedClient.banReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Raison du bannissement</h4>
                <p className="text-sm text-red-700">{selectedClient.banReason}</p>
              </div>
            )}

            {/* ID */}
            <div className="text-xs text-gray-400 font-mono select-all">ID: {selectedClient.id}</div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => setShowClientModal(false)} variant="outline" size="small">Fermer</Button>
              {selectedClient.status !== 'active' && (
                <Button size="small" onClick={() => { void updateClientStatus(selectedClient.id, 'active'); setShowClientModal(false); }}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle size={14} className="mr-1.5" /> Activer
                </Button>
              )}
              {selectedClient.status !== 'suspended' && (
                <Button size="small" onClick={() => { setShowClientModal(false); handleSuspendClient(selectedClient); }}
                  className="bg-orange-600 hover:bg-orange-700">
                  <Ban size={14} className="mr-1.5" /> Suspendre
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: DELETE                                                      */}
      {/* ================================================================== */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Supprimer le client" size="small">
        {selectedClient && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Action irréversible</h3>
                  <p className="mt-1 text-sm text-red-700">
                    <strong>{selectedClient.firstName} {selectedClient.lastName}</strong> (Client) sera supprimé définitivement avec toutes ses données.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison (optionnelle)</label>
              <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" placeholder="..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tapez <strong className="text-red-600">SUPPRIMER</strong> pour confirmer</label>
              <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" placeholder="SUPPRIMER" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setShowDeleteModal(false)} variant="outline" size="small" disabled={isActionLoading}>Annuler</Button>
              <Button onClick={confirmDeleteClient} variant="danger" size="small" loading={isActionLoading} disabled={deleteConfirmText !== 'SUPPRIMER'}>
                <Trash2 size={14} className="mr-1.5" /> Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: BULK DELETE                                                 */}
      {/* ================================================================== */}
      <Modal isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} title={`Supprimer ${selectedClientIds.size} client${selectedClientIds.size > 1 ? 's' : ''}`} size="small">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Suppression en lot irréversible</h3>
                <p className="mt-1 text-sm text-red-700">{selectedClientIds.size} client{selectedClientIds.size > 1 ? 's' : ''} seront supprimés.</p>
                <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                  {Array.from(selectedClientIds).map((id) => {
                    const c = clients.find((client) => client.id === id);
                    return <div key={id} className="text-xs text-red-600">{c ? `${c.firstName || ''} ${c.lastName || ''} (${c.email})` : id}</div>;
                  })}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raison</label>
            <textarea value={bulkDeleteReason} onChange={(e) => setBulkDeleteReason(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tapez <strong className="text-red-600">SUPPRIMER</strong></label>
            <input type="text" value={bulkDeleteConfirmText} onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" placeholder="SUPPRIMER" />
          </div>
          {bulkDeleteProgress.total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progression</span><span>{bulkDeleteProgress.current}/{bulkDeleteProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-red-600 h-1.5 rounded-full transition-all" style={{ width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setShowBulkDeleteModal(false)} variant="outline" size="small" disabled={isActionLoading}>Annuler</Button>
            <Button onClick={executeBulkDelete} variant="danger" size="small" loading={isActionLoading} disabled={bulkDeleteConfirmText !== 'SUPPRIMER'}>
              <Trash2 size={14} className="mr-1.5" /> Supprimer {selectedClientIds.size}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: SUSPEND                                                     */}
      {/* ================================================================== */}
      <Modal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)} title="Suspendre le client" size="small">
        {selectedClient && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Ban className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-800">Suspension</h3>
                  <p className="mt-1 text-sm text-orange-700">
                    <strong>{selectedClient.firstName} {selectedClient.lastName}</strong> sera suspendu.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison de la suspension</label>
              <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" placeholder="Raison..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setShowSuspendModal(false)} variant="outline" size="small" disabled={isActionLoading}>Annuler</Button>
              <Button onClick={confirmSuspendClient} size="small" loading={isActionLoading} className="bg-orange-600 hover:bg-orange-700">
                <Ban size={14} className="mr-1.5" /> Suspendre
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default AdminClients;
