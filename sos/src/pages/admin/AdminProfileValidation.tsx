// src/pages/admin/AdminProfileValidation.tsx
// Page de gestion de la file d'attente de validation des profils prestataires
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  X,
  Eye,
  FileText,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Languages,
  Award,
  ExternalLink,
  MessageSquare,
  Send,
  Check,
  Loader2,
  History,
  UserCheck,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Scale,
  Globe,
  User,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functionsWest3 as functions } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { logError } from '../../utils/logging';

// ============================================================================
// TYPES
// ============================================================================

type ValidationStatus = 'pending' | 'in_review' | 'changes_requested' | 'approved' | 'rejected';
type ProviderType = 'lawyer' | 'expat';

interface ValidationItem {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  providerType: ProviderType;
  profilePhoto?: string;
  bio?: string;
  specializations?: string[];
  languages?: string[];
  country?: string;
  city?: string;
  yearsExperience?: number;
  barAssociation?: string;
  documents?: {
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: Timestamp;
  }[];
  kycDocuments?: {
    idDocument?: string;
    proofOfAddress?: string;
    professionalLicense?: string;
  };
  submittedAt: Timestamp;
  status: ValidationStatus;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Timestamp;
  reviewNotes?: string;
  requestedChanges?: {
    field: string;
    message: string;
    requestedAt: Timestamp;
  }[];
  validationHistory?: {
    action: string;
    by: string;
    byName: string;
    at: Timestamp;
    reason?: string;
  }[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

interface ValidationStats {
  pending: number;
  inReview: number;
  approvedToday: number;
  rejectedToday: number;
}

interface ValidationFilters {
  status: ValidationStatus | 'all';
  providerType: ProviderType | 'all';
  assignedTo: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ITEMS_PER_PAGE = 20;

const STATUS_CONFIG: Record<ValidationStatus, { label: string; color: string; dot: string; bg: string }> = {
  pending:           { label: 'En attente',     color: 'text-yellow-700',  dot: 'bg-yellow-500',  bg: 'bg-yellow-50 border-yellow-200' },
  in_review:         { label: 'En cours',       color: 'text-blue-700',    dot: 'bg-blue-500',    bg: 'bg-blue-50 border-blue-200' },
  changes_requested: { label: 'Modifications',  color: 'text-orange-700',  dot: 'bg-orange-500',  bg: 'bg-orange-50 border-orange-200' },
  approved:          { label: 'Approuvé',        color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  rejected:          { label: 'Rejeté',          color: 'text-red-700',     dot: 'bg-red-500',     bg: 'bg-red-50 border-red-200' },
};

const PROVIDER_TYPE_CONFIG: Record<ProviderType, { label: string; color: string; dot: string; bg: string }> = {
  lawyer: { label: 'Avocat',    color: 'text-purple-700',  dot: 'bg-purple-500',  bg: 'bg-purple-50 border-purple-200' },
  expat:  { label: 'Expatrié',  color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
};

const FIELD_OPTIONS = [
  { value: 'photo', label: 'Photo de profil' },
  { value: 'bio', label: 'Biographie' },
  { value: 'specializations', label: 'Spécialisations' },
  { value: 'languages', label: 'Langues' },
  { value: 'documents', label: 'Documents' },
  { value: 'kyc', label: 'Documents KYC' },
  { value: 'other', label: 'Autre' },
];

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 0 || date.getTime() === 0) return '\u2014';
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

function formatDateFull(date: Date): string {
  if (date.getTime() === 0) return '\u2014';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatDateShort(date: Date): string {
  if (date.getTime() === 0) return '\u2014';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
}

function tsToDate(ts: Timestamp | undefined): Date {
  return ts?.toDate?.() || new Date(0);
}

function formatTimestamp(ts: Timestamp | undefined): string {
  if (!ts) return 'N/A';
  return formatDateFull(ts.toDate());
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdminProfileValidation: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // --- State ---
  const [queue, setQueue] = useState<ValidationItem[]>([]);
  const [stats, setStats] = useState<ValidationStats>({ pending: 0, inReview: 0, approvedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<ValidationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [providerTypeFilter, setProviderTypeFilter] = useState<ProviderType | 'all'>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('');
  const [sortField, setSortField] = useState<'submittedAt' | 'providerName'>('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Modals
  const [selectedItem, setSelectedItem] = useState<ValidationItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Approve/Reject
  const [actionReason, setActionReason] = useState('');

  // Request changes
  const [changes, setChanges] = useState<{ field: string; message: string }[]>([]);
  const [newChangeField, setNewChangeField] = useState('');
  const [newChangeMessage, setNewChangeMessage] = useState('');

  // Detail modal tab
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'history'>('info');

  // Action menu
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

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

  // --- Cloud Functions ---
  const getValidationQueue = httpsCallable<{ filters: ValidationFilters }, { items: ValidationItem[]; stats: ValidationStats }>(functions, 'getValidationQueue');
  const assignValidationFn = httpsCallable<{ validationId: string }, { success: boolean }>(functions, 'assignValidation');
  const approveProfileFn = httpsCallable<{ validationId: string; reason: string }, { success: boolean }>(functions, 'approveProfile');
  const rejectProfileFn = httpsCallable<{ validationId: string; reason: string }, { success: boolean }>(functions, 'rejectProfile');
  const requestChangesFn = httpsCallable<{ validationId: string; changes: { field: string; message: string }[] }, { success: boolean }>(functions, 'requestChanges');

  // --- Load queue ---
  const loadQueue = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      setError(null);
      const filters: ValidationFilters = {
        status: selectedStatus,
        providerType: providerTypeFilter,
        assignedTo: assignedToFilter,
      };
      const result = await getValidationQueue({ filters });
      setQueue(result.data.items);
      setStats(result.data.stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error loading validation queue:', err);
      logError({ origin: 'frontend', error: `Error loading validation queue: ${msg}`, context: { component: 'AdminProfileValidation' } });
      setError('Erreur lors du chargement. Veuillez réessayer.');
      setQueue([]);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  }, [selectedStatus, providerTypeFilter, assignedToFilter]);

  // --- Initial load ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') { navigate('/admin/login'); return; }
    loadQueue();
  }, [currentUser, navigate, loadQueue]);

  // --- Handlers ---
  const handleAssign = async (item: ValidationItem) => {
    setOpenActionMenuId(null);
    try {
      setIsProcessing(true);
      await assignValidationFn({ validationId: item.id });
      toast.success('Dossier assigné avec succès');
      loadQueue();
    } catch (err) {
      console.error('Error assigning validation:', err);
      toast.error('Erreur lors de l\'assignation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    try {
      setIsProcessing(true);
      await approveProfileFn({ validationId: selectedItem.id, reason: actionReason });
      toast.success('Profil approuvé avec succès');
      setShowApproveModal(false);
      setShowDetailModal(false);
      setSelectedItem(null);
      setActionReason('');
      loadQueue();
    } catch (err) {
      console.error('Error approving profile:', err);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    try {
      setIsProcessing(true);
      await rejectProfileFn({ validationId: selectedItem.id, reason: actionReason });
      toast.success('Profil rejeté');
      setShowRejectModal(false);
      setShowDetailModal(false);
      setSelectedItem(null);
      setActionReason('');
      loadQueue();
    } catch (err) {
      console.error('Error rejecting profile:', err);
      toast.error('Erreur lors du rejet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedItem || changes.length === 0) return;
    try {
      setIsProcessing(true);
      await requestChangesFn({ validationId: selectedItem.id, changes });
      toast.success('Demande de modifications envoyée');
      setShowChangesModal(false);
      setShowDetailModal(false);
      setSelectedItem(null);
      setChanges([]);
      loadQueue();
    } catch (err) {
      console.error('Error requesting changes:', err);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddChange = () => {
    if (newChangeField && newChangeMessage.trim()) {
      setChanges([...changes, { field: newChangeField, message: newChangeMessage.trim() }]);
      setNewChangeField('');
      setNewChangeMessage('');
    }
  };

  const openDetail = (item: ValidationItem) => {
    setSelectedItem(item);
    setActiveTab('info');
    setShowDetailModal(true);
    setOpenActionMenuId(null);
  };

  const openApproveModal = (item: ValidationItem) => {
    setSelectedItem(item);
    setActionReason('');
    setShowApproveModal(true);
    setOpenActionMenuId(null);
  };

  const openRejectModal = (item: ValidationItem) => {
    setSelectedItem(item);
    setActionReason('');
    setShowRejectModal(true);
    setOpenActionMenuId(null);
  };

  const openChangesModal = (item: ValidationItem) => {
    setSelectedItem(item);
    setChanges([]);
    setNewChangeField('');
    setNewChangeMessage('');
    setShowChangesModal(true);
    setOpenActionMenuId(null);
  };

  const handleSortChange = (field: 'submittedAt' | 'providerName') => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection(field === 'providerName' ? 'asc' : 'desc'); }
  };

  // --- Filters ---
  const filteredQueue = useMemo(() => {
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const term = strip(searchTerm.trim());

    let result = queue.filter((item) => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (providerTypeFilter !== 'all' && item.providerType !== providerTypeFilter) return false;
      if (assignedToFilter === 'unassigned' && item.assignedTo) return false;
      if (assignedToFilter && assignedToFilter !== 'unassigned' && item.assignedTo !== assignedToFilter) return false;
      if (term && !strip(item.providerName).includes(term) && !item.providerEmail.toLowerCase().includes(term)) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'submittedAt') {
        cmp = tsToDate(a.submittedAt).getTime() - tsToDate(b.submittedAt).getTime();
      } else {
        cmp = a.providerName.localeCompare(b.providerName);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [queue, selectedStatus, providerTypeFilter, assignedToFilter, searchTerm, sortField, sortDirection]);

  const displayedItems = useMemo(() => filteredQueue.slice(0, page * ITEMS_PER_PAGE), [filteredQueue, page]);
  const hasMore = displayedItems.length < filteredQueue.length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: queue.length };
    for (const item of queue) counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, [queue]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (assignedToFilter) count++;
    return count;
  }, [assignedToFilter]);

  // --- Sort icon helper ---
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortDirection === 'desc' ? <ChevronDown size={14} className="text-red-600" /> : <ChevronUp size={14} className="text-red-600" />;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && queue.length === 0) {
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
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Validation des profils</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filteredQueue.length} résultat{filteredQueue.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadQueue(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700">{error}</p>
                <button onClick={() => { setLoading(true); loadQueue(); }} className="text-sm text-red-600 hover:text-red-800 font-medium mt-1">Reessayer</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== STATS CARDS ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'En attente', value: stats.pending, icon: Clock, iconColor: 'text-yellow-600', bgColor: 'bg-yellow-50' },
            { label: 'En cours', value: stats.inReview, icon: Eye, iconColor: 'text-blue-600', bgColor: 'bg-blue-50' },
            { label: 'Approuvés aujourd\'hui', value: stats.approvedToday, icon: CheckCircle, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
            { label: 'Rejetés aujourd\'hui', value: stats.rejectedToday, icon: XCircle, iconColor: 'text-red-600', bgColor: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, iconColor, bgColor }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${bgColor}`}>
                  <Icon size={18} className={iconColor} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== STATUS PILLS ===== */}
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'all' as const, label: 'Tous', count: statusCounts.all || 0 },
            { key: 'pending' as const, label: 'En attente', count: statusCounts.pending || 0 },
            { key: 'in_review' as const, label: 'En cours', count: statusCounts.in_review || 0 },
            { key: 'changes_requested' as const, label: 'Modifications', count: statusCounts.changes_requested || 0 },
            { key: 'approved' as const, label: 'Approuvé', count: statusCounts.approved || 0 },
            { key: 'rejected' as const, label: 'Rejeté', count: statusCounts.rejected || 0 },
          ] as { key: ValidationStatus | 'all'; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setSelectedStatus(key); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedStatus === key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {key !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[key as ValidationStatus]?.dot || 'bg-gray-400'}`} />}
              {label}
              <span className={`${selectedStatus === key ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* ===== SEARCH + FILTERS BAR ===== */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
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
            <select
              value={providerTypeFilter}
              onChange={(e) => { setProviderTypeFilter(e.target.value as ProviderType | 'all'); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 min-w-[140px]"
            >
              <option value="all">Tous les types</option>
              <option value="lawyer">Avocat</option>
              <option value="expat">Expatrié</option>
            </select>

            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-') as ['submittedAt' | 'providerName', 'asc' | 'desc'];
                setSortField(f); setSortDirection(d); setPage(1);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 min-w-[160px]"
            >
              <option value="submittedAt-desc">Plus récents</option>
              <option value="submittedAt-asc">Plus anciens</option>
              <option value="providerName-asc">Nom A-Z</option>
              <option value="providerName-desc">Nom Z-A</option>
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
              <button
                onClick={() => { setAssignedToFilter(''); }}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
              >
                <RefreshCw size={12} /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assigné à</label>
                <select
                  value={assignedToFilter}
                  onChange={(e) => { setAssignedToFilter(e.target.value); setPage(1); }}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">Tous</option>
                  <option value="unassigned">Non assigné</option>
                  <option value={currentUser?.uid || ''}>Mes dossiers</option>
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500 mr-1">Actifs :</span>
                {assignedToFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {assignedToFilter === 'unassigned' ? 'Non assigné' : 'Mes dossiers'}
                    <button onClick={() => setAssignedToFilter('')} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== TABLE ===== */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prestataire</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSortChange('submittedAt')}>
                    <span className="inline-flex items-center gap-1">Soumis le <SortIcon field="submittedAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Assigné à</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Documents</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="py-16 text-center"><LoadingSpinner text="Chargement..." /></td></tr>
                ) : displayedItems.length > 0 ? (
                  displayedItems.map((item) => (
                    <tr key={item.id} className="group transition-colors hover:bg-gray-50/80">
                      {/* Provider */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative flex-shrink-0">
                            {item.profilePhoto ? (
                              <img
                                src={item.profilePhoto}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-white">
                                <User size={16} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => openDetail(item)}
                              className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors truncate block max-w-[180px]"
                              title={item.providerName}
                            >
                              {item.providerName}
                            </button>
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{item.providerEmail}</p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${PROVIDER_TYPE_CONFIG[item.providerType]?.bg || 'bg-gray-50 border-gray-200'} ${PROVIDER_TYPE_CONFIG[item.providerType]?.color || 'text-gray-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${PROVIDER_TYPE_CONFIG[item.providerType]?.dot || 'bg-gray-400'}`} />
                          {PROVIDER_TYPE_CONFIG[item.providerType]?.label || item.providerType}
                        </span>
                      </td>

                      {/* Submitted date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600" title={formatTimestamp(item.submittedAt)}>
                          {formatDateShort(tsToDate(item.submittedAt))}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_CONFIG[item.status]?.bg?.replace('border-', 'border border-') || 'bg-gray-100 text-gray-700'} ${STATUS_CONFIG[item.status]?.color || 'text-gray-700'}`}>
                          {STATUS_CONFIG[item.status]?.label || item.status}
                        </span>
                      </td>

                      {/* Assigned to */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-600">
                          {item.assignedToName || <span className="italic text-gray-400">Non assigné</span>}
                        </span>
                      </td>

                      {/* Documents count */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                          <FileText size={12} />
                          {(item.documents?.length || 0) + (item.kycDocuments ? Object.values(item.kycDocuments).filter(Boolean).length : 0)}
                        </span>
                      </td>

                      {/* Actions dropdown */}
                      <td className="px-3 py-3">
                        <div className="relative" ref={openActionMenuId === item.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openActionMenuId === item.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
                              <button onClick={() => openDetail(item)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Eye size={14} className="text-blue-600" /> Voir le detail
                              </button>
                              {!item.assignedTo && (
                                <button onClick={() => handleAssign(item)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                  <UserCheck size={14} className="text-cyan-600" /> Prendre en charge
                                </button>
                              )}
                              {(item.status === 'pending' || item.status === 'in_review') && (
                                <>
                                  <div className="border-t border-gray-100 my-1" />
                                  <button onClick={() => openApproveModal(item)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                    <CheckCircle size={14} /> Approuver
                                  </button>
                                  <button onClick={() => openChangesModal(item)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
                                    <Edit3 size={14} /> Demander des modifications
                                  </button>
                                  <button onClick={() => openRejectModal(item)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors">
                                    <XCircle size={14} /> Rejeter
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">Aucun profil en attente de validation</td></tr>
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
      {/* MODAL: VALIDATION DETAIL                                           */}
      {/* ================================================================== */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Revue du profil" size="large">
        {selectedItem && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {selectedItem.profilePhoto ? (
                  <img src={selectedItem.profilePhoto} alt=""
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-gray-100">
                    <User size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedItem.providerName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${PROVIDER_TYPE_CONFIG[selectedItem.providerType]?.bg} ${PROVIDER_TYPE_CONFIG[selectedItem.providerType]?.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${PROVIDER_TYPE_CONFIG[selectedItem.providerType]?.dot}`} />
                    {PROVIDER_TYPE_CONFIG[selectedItem.providerType]?.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_CONFIG[selectedItem.status]?.bg} ${STATUS_CONFIG[selectedItem.status]?.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedItem.status]?.dot}`} />
                    {STATUS_CONFIG[selectedItem.status]?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex gap-6">
                {([
                  { key: 'info' as const, label: 'Informations', icon: User },
                  { key: 'documents' as const, label: 'Documents', icon: FileText },
                  { key: 'history' as const, label: 'Historique', icon: History },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-1.5 ${
                      activeTab === key
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <div className="min-h-[250px]">
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <Mail size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 break-all">{selectedItem.providerEmail}</span>
                      </div>
                      {selectedItem.providerPhone && (
                        <div className="flex items-center gap-2.5">
                          <Phone size={15} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900">{selectedItem.providerPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5">
                        <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900">
                          {selectedItem.city && selectedItem.country ? `${selectedItem.city}, ${selectedItem.country}` : selectedItem.country || 'Non renseigné'}
                        </span>
                      </div>
                      {selectedItem.languages && selectedItem.languages.length > 0 && (
                        <div className="flex items-center gap-2.5">
                          <Languages size={15} className="text-gray-400 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {selectedItem.languages.map((l) => (
                              <span key={l} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{l}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Professionnel</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Calendar size={15} className="text-gray-400" />
                          <span className="text-sm text-gray-600">Soumis le</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatDateShort(tsToDate(selectedItem.submittedAt))}</span>
                      </div>
                      {selectedItem.yearsExperience !== undefined && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Award size={15} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Expérience</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedItem.yearsExperience} ans</span>
                        </div>
                      )}
                      {selectedItem.barAssociation && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Scale size={15} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Barreau</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedItem.barAssociation}</span>
                        </div>
                      )}
                      {selectedItem.assignedToName && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <UserCheck size={15} className="text-gray-400" />
                            <span className="text-sm text-gray-600">Assigné à</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{selectedItem.assignedToName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="md:col-span-2 bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Biographie</h4>
                    <p className="text-sm text-gray-700">
                      {selectedItem.bio || <span className="italic text-gray-400">Non fourni</span>}
                    </p>
                  </div>

                  {/* Specializations */}
                  {selectedItem.specializations && selectedItem.specializations.length > 0 && (
                    <div className="md:col-span-2 bg-gray-50 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Spécialisations</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.specializations.map((spec, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-xs text-gray-700">{spec}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requested changes */}
                  {selectedItem.requestedChanges && selectedItem.requestedChanges.length > 0 && (
                    <div className="md:col-span-2 bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Modifications demandées</h4>
                      <div className="space-y-2">
                        {selectedItem.requestedChanges.map((change, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-white rounded-lg p-2.5 border border-orange-100">
                            <Edit3 size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-semibold text-orange-700">{FIELD_OPTIONS.find(f => f.value === change.field)?.label || change.field}</span>
                              <p className="text-sm text-gray-700 mt-0.5">{change.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-5">
                  {/* KYC Documents */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents KYC</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {([
                        { key: 'idDocument' as const, label: 'Pièce d\'identité' },
                        { key: 'proofOfAddress' as const, label: 'Justificatif de domicile' },
                        { key: 'professionalLicense' as const, label: 'Licence professionnelle' },
                      ]).map(({ key, label }) => (
                        <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
                          {selectedItem.kycDocuments?.[key] ? (
                            <a href={selectedItem.kycDocuments[key]} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              <ExternalLink size={13} /> Voir le document
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Non fourni</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Other documents */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Autres documents</h4>
                    {selectedItem.documents && selectedItem.documents.length > 0 ? (
                      <div className="space-y-2">
                        {selectedItem.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center gap-3">
                              <FileText size={16} className="text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                <p className="text-xs text-gray-500">{doc.type} - {formatTimestamp(doc.uploadedAt)}</p>
                              </div>
                            </div>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Aucun document</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historique de validation</h4>
                  {selectedItem.validationHistory && selectedItem.validationHistory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItem.validationHistory.map((entry, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                          <div className={`p-1.5 rounded-full ${
                            entry.action === 'approved' ? 'bg-emerald-100' :
                            entry.action === 'rejected' ? 'bg-red-100' :
                            entry.action === 'changes_requested' ? 'bg-orange-100' :
                            'bg-blue-100'
                          }`}>
                            {entry.action === 'approved' && <CheckCircle size={14} className="text-emerald-600" />}
                            {entry.action === 'rejected' && <XCircle size={14} className="text-red-600" />}
                            {entry.action === 'changes_requested' && <Edit3 size={14} className="text-orange-600" />}
                            {entry.action === 'assigned' && <UserCheck size={14} className="text-blue-600" />}
                            {entry.action === 'submitted' && <Send size={14} className="text-blue-600" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 capitalize">{entry.action.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500">
                              Par {entry.byName} - {formatTimestamp(entry.at)}
                            </p>
                            {entry.reason && (
                              <p className="text-xs text-gray-500 mt-1 italic">"{entry.reason}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-6">Aucun historique</p>
                  )}
                </div>
              )}
            </div>

            {/* ID */}
            <div className="text-xs text-gray-400 font-mono select-all">ID: {selectedItem.id}</div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => setShowDetailModal(false)} variant="outline" size="small">Fermer</Button>
              {(selectedItem.status === 'pending' || selectedItem.status === 'in_review') && (
                <>
                  <Button size="small" onClick={() => { setShowDetailModal(false); openChangesModal(selectedItem); }}
                    className="bg-orange-600 hover:bg-orange-700">
                    <Edit3 size={14} className="mr-1.5" /> Modifications
                  </Button>
                  <Button size="small" onClick={() => { setShowDetailModal(false); openRejectModal(selectedItem); }}
                    className="bg-red-600 hover:bg-red-700">
                    <XCircle size={14} className="mr-1.5" /> Rejeter
                  </Button>
                  <Button size="small" onClick={() => { setShowDetailModal(false); openApproveModal(selectedItem); }}
                    className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle size={14} className="mr-1.5" /> Approuver
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: APPROVE                                                     */}
      {/* ================================================================== */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approuver le profil" size="small">
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-800">Approbation du profil</h3>
                  <p className="mt-1 text-sm text-emerald-700">
                    <strong>{selectedItem.providerName}</strong> ({PROVIDER_TYPE_CONFIG[selectedItem.providerType]?.label}) sera approuvé et visible sur la plateforme.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison (optionnelle)</label>
              <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                placeholder="Raison de l'approbation..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setShowApproveModal(false)} variant="outline" size="small" disabled={isProcessing}>Annuler</Button>
              <Button onClick={handleApprove} size="small" loading={isProcessing} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle size={14} className="mr-1.5" /> Approuver
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: REJECT                                                      */}
      {/* ================================================================== */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Rejeter le profil" size="small">
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Rejet du profil</h3>
                  <p className="mt-1 text-sm text-red-700">
                    Le profil de <strong>{selectedItem.providerName}</strong> ({PROVIDER_TYPE_CONFIG[selectedItem.providerType]?.label}) sera rejeté.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison du rejet <span className="text-red-500">*</span></label>
              <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                placeholder="Indiquez la raison du rejet..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setShowRejectModal(false)} variant="outline" size="small" disabled={isProcessing}>Annuler</Button>
              <Button onClick={handleReject} variant="danger" size="small" loading={isProcessing} disabled={!actionReason.trim()}>
                <XCircle size={14} className="mr-1.5" /> Rejeter
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: REQUEST CHANGES                                             */}
      {/* ================================================================== */}
      <Modal isOpen={showChangesModal} onClose={() => setShowChangesModal(false)} title="Demander des modifications" size="medium">
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Edit3 className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-800">Demande de modifications</h3>
                  <p className="mt-1 text-sm text-orange-700">
                    Indiquez les modifications a apporter au profil de <strong>{selectedItem.providerName}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Existing changes */}
            {changes.length > 0 && (
              <div className="space-y-2">
                {changes.map((change, idx) => (
                  <div key={idx} className="flex items-start justify-between bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div>
                      <span className="text-xs font-semibold text-orange-700">{FIELD_OPTIONS.find(f => f.value === change.field)?.label || change.field}</span>
                      <p className="text-sm text-gray-700 mt-0.5">{change.message}</p>
                    </div>
                    <button onClick={() => setChanges(changes.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-600 ml-2">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new change */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Champ a modifier</label>
                <select value={newChangeField} onChange={(e) => setNewChangeField(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400">
                  <option value="">Sélectionnez un champ</option>
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description du changement</label>
                <textarea value={newChangeMessage} onChange={(e) => setNewChangeMessage(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
                  placeholder="Décrivez les modifications demandées..." />
              </div>
              <button onClick={handleAddChange} disabled={!newChangeField || !newChangeMessage.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-orange-100 text-orange-800 rounded-xl hover:bg-orange-200 disabled:opacity-50 transition-colors">
                <MessageSquare size={14} /> Ajouter une modification
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => setShowChangesModal(false)} variant="outline" size="small" disabled={isProcessing}>Annuler</Button>
              <Button onClick={handleRequestChanges} size="small" loading={isProcessing} disabled={changes.length === 0}
                className="bg-orange-600 hover:bg-orange-700">
                <Send size={14} className="mr-1.5" /> Envoyer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default AdminProfileValidation;
