/**
 * AdminInfluencersList - Admin page for managing influencers worldwide
 * Features: Country filter, export, bulk actions, statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate, functions } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  Languages,
  DollarSign,
  UserPlus,
  X,
  Play,
  Pause,
  Mail,
  Megaphone,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  Edit3,
  Phone,
  Save,
  AlertCircle,
  PlayCircle,
  Trash2,
  ShieldOff,
  MoreVertical,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
} as const;

// Countries list
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AR', name: 'Argentina' }, { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' }, { code: 'BR', name: 'Brazil' }, { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' },
  { code: 'CZ', name: 'Czechia' }, { code: 'DK', name: 'Denmark' }, { code: 'EG', name: 'Egypt' },
  { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' }, { code: 'HU', name: 'Hungary' }, { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' }, { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' }, { code: 'JP', name: 'Japan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'South Korea' }, { code: 'MA', name: 'Morocco' }, { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' }, { code: 'PK', name: 'Pakistan' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' }, { code: 'ES', name: 'Spain' }, { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }, { code: 'TH', name: 'Thailand' }, { code: 'TR', name: 'Turkey' },
  { code: 'AE', name: 'UAE' }, { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
].sort((a, b) => a.name.localeCompare(b.name));

// Supported languages
const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
  { code: 'ch', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
];

interface Influencer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  totalEarned: number;
  totalClientsReferred: number;
  totalProvidersRecruited: number;
  country?: string;
  language?: string;
  platforms?: string[];
  communitySize?: number;
  createdAt: string;
  lastLoginAt?: string | null;
  isFeatured?: boolean;
  isVisible?: boolean;
  phone?: string | null;
  recruitedBy?: string | null;
  recruitedByName?: string | null;
}

interface InfluencerListResponse {
  influencers: Influencer[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalActive: number;
    totalSuspended: number;
    totalEarnings: number;
    newThisMonth: number;
  };
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'banned';

const AdminInfluencersList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  // State
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<InfluencerListResponse['stats']>();
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);

  const toggleFeatured = async (id: string, current: boolean) => {
    setFeaturedLoading(id);
    try {
      const fn = httpsCallable(functions, 'setProviderBadge');
      await fn({ providerId: id, isFeatured: !current });
      setInfluencers((prev) => prev.map((x) => x.id === id ? { ...x, isFeatured: !current } : x));
      toast.success(!current ? 'Badge attribué ✓' : 'Badge retiré');
    } catch {
      toast.error('Erreur lors de la mise à jour du badge');
    } finally {
      setFeaturedLoading(null);
    }
  };

  const [visibilityLoading, setVisibilityLoading] = useState<Map<string, boolean>>(new Map());

  const handleToggleVisibility = async (id: string, currentVisibility: boolean | undefined) => {
    const current = !!currentVisibility;
    setVisibilityLoading((prev) => new Map(prev).set(id, true));
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminToggleInfluencerVisibility');
      await fn({ influencerId: id, isVisible: !current });
      setInfluencers((prev) =>
        prev.map((x) => x.id === id ? { ...x, isVisible: !current } : x)
      );
      toast.success(!current ? 'Visible dans le répertoire ✓' : 'Masqué du répertoire');
    } catch {
      toast.error('Erreur lors de la mise à jour de la visibilité');
    } finally {
      setVisibilityLoading((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Edit profile modal
  interface EditProfileState {
    isOpen: boolean;
    influencer: Influencer | null;
    fields: {
      firstName: string; lastName: string; email: string; phone: string;
      country: string; language: string; platforms: string; communitySize: string; niche: string; adminNotes: string;
    };
  }
  const [editModal, setEditModal] = useState<EditProfileState>({
    isOpen: false, influencer: null,
    fields: { firstName: '', lastName: '', email: '', phone: '', country: '', language: '', platforms: '', communitySize: '', niche: '', adminNotes: '' },
  });
  const [editLoading, setEditLoading] = useState(false);

  // Moderation action modal
  const [actionModal, setActionModal] = useState<{
    influencer: Influencer;
    action: 'suspend' | 'ban' | 'reactivate' | 'delete';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionConfirmText, setActionConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  // Exécuter une action de modération
  const handleModerationAction = async () => {
    if (!actionModal) return;
    const { influencer, action } = actionModal;

    // Raison requise pour suspend, ban, delete
    if (['suspend', 'ban', 'delete'].includes(action) && !actionReason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    // Confirmation "SUPPRIMER" requise pour delete
    if (action === 'delete' && actionConfirmText !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer');
      return;
    }

    setActionLoading(true);
    try {
      if (action === 'delete') {
        // Suppression via callable ou Firestore direct
        const fn = httpsCallable(functionsAffiliate, 'adminDeleteInfluencer');
        await fn({ influencerId: influencer.id, reason: actionReason.trim() });
        toast.success(`Influenceur ${influencer.firstName} ${influencer.lastName} supprimé`);
      } else {
        const statusMap = { suspend: 'suspended', ban: 'banned', reactivate: 'active' } as const;
        const fn = httpsCallable(functionsAffiliate, 'adminUpdateInfluencerStatus');
        await fn({
          influencerId: influencer.id,
          status: statusMap[action],
          ...(action !== 'reactivate' && { reason: actionReason.trim() }),
        });
        const actionLabels = { suspend: 'suspendu', ban: 'banni', reactivate: 'réactivé' };
        toast.success(`Influenceur ${influencer.firstName} ${influencer.lastName} ${actionLabels[action]}`);
      }
      setActionModal(null);
      setActionReason('');
      setActionConfirmText('');
      fetchInfluencers();
    } catch (err: any) {
      console.error('Moderation action error:', err);
      toast.error(err.message || 'Erreur lors de l\'action de modération');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = useCallback((inf: Influencer) => {
    setEditModal({
      isOpen: true, influencer: inf,
      fields: {
        firstName: inf.firstName || '', lastName: inf.lastName || '', email: inf.email || '',
        phone: (inf as any).phone || '', country: inf.country || '', language: inf.language || '',
        platforms: (inf.platforms || []).join(', '), communitySize: String(inf.communitySize || ''),
        niche: (inf as any).niche || '', adminNotes: (inf as any).adminNotes || '',
      },
    });
  }, []);

  const handleEditField = useCallback((field: string, value: string) => {
    setEditModal(prev => ({ ...prev, fields: { ...prev.fields, [field]: value } }));
  }, []);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteModal(true);
  };

  const executeBulkDelete = async () => {
    if (bulkDeleteConfirm !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer');
      return;
    }
    setBulkActionLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminDeleteInfluencer');
      const ids = Array.from(selectedIds);
      let successCount = 0;
      for (const id of ids) {
        try {
          await fn({ influencerId: id, reason: bulkDeleteReason });
          successCount++;
        } catch (err) {
          console.error(`Failed to delete influencer ${id}:`, err);
        }
      }
      toast.success(`${successCount}/${ids.length} influenceurs supprimés`);
      setSelectedIds(new Set());
      setBulkDeleteModal(false);
      setBulkDeleteConfirm('');
      setBulkDeleteReason('');
      fetchInfluencers();
    } catch (err) {
      toast.error('Erreur lors de la suppression en masse');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  // Fetch influencers
  const fetchInfluencers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetInfluencersList = httpsCallable<any, InfluencerListResponse>(
        functionsAffiliate,
        'adminGetInfluencersList'
      );

      const result = await adminGetInfluencersList({
        offset: (page - 1) * limit, // Convert page to offset for backend
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });

      setInfluencers(result.data.influencers);
      setTotal(result.data.total);
      if (result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching influencers:', err);
      setError(err.message || 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, countryFilter, languageFilter, searchQuery]);

  const handleSaveProfile = useCallback(async () => {
    if (!editModal.influencer) return;
    setEditLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateInfluencerProfile');
      const updates: Record<string, any> = { influencerId: editModal.influencer.id };
      const orig = editModal.influencer as any;
      if (editModal.fields.firstName !== (orig.firstName || '')) updates.firstName = editModal.fields.firstName;
      if (editModal.fields.lastName !== (orig.lastName || '')) updates.lastName = editModal.fields.lastName;
      if (editModal.fields.email !== (orig.email || '')) updates.email = editModal.fields.email;
      if (editModal.fields.phone !== (orig.phone || '')) updates.phone = editModal.fields.phone;
      if (editModal.fields.country !== (orig.country || '')) updates.country = editModal.fields.country;
      if (editModal.fields.language !== (orig.language || '')) updates.language = editModal.fields.language;
      if (editModal.fields.niche !== (orig.niche || '')) updates.niche = editModal.fields.niche;
      if (editModal.fields.adminNotes !== (orig.adminNotes || '')) updates.adminNotes = editModal.fields.adminNotes;
      const newPlatforms = editModal.fields.platforms.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (JSON.stringify(newPlatforms) !== JSON.stringify(orig.platforms || [])) updates.platforms = newPlatforms;
      const newSize = editModal.fields.communitySize ? parseInt(editModal.fields.communitySize) : undefined;
      if (newSize !== undefined && newSize !== (orig.communitySize || 0)) updates.communitySize = newSize;

      if (Object.keys(updates).length <= 1) { toast.error('Aucune modification'); setEditLoading(false); return; }
      await fn(updates);
      toast.success('Profil mis à jour');
      setEditModal(prev => ({ ...prev, isOpen: false }));
      fetchInfluencers();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally { setEditLoading(false); }
  }, [editModal, fetchInfluencers]);

  useEffect(() => {
    fetchInfluencers();
  }, [page, statusFilter, countryFilter, languageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchInfluencers();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format amount
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'suspended':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'banned':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'suspended':
        return <Clock className="w-4 h-4" />;
      case 'banned':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get country name
  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const adminExportInfluencers = httpsCallable<any, { csv: string }>(
        functionsAffiliate,
        'adminExportInfluencers'
      );

      const result = await adminExportInfluencers({
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
      });

      // Download CSV
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `influencers_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'suspend' | 'activate' | 'email') => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const adminBulkInfluencerAction = httpsCallable(functionsAffiliate, 'adminBulkInfluencerAction');
      await adminBulkInfluencerAction({
        influencerIds: Array.from(selectedIds),
        action,
      });

      setSelectedIds(new Set());
      fetchInfluencers();
    } catch (err: any) {
      console.error('Bulk action error:', err);
      setError(err.message || 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all on page
  const toggleSelectAll = () => {
    if (selectedIds.size === influencers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(influencers.map(i => i.id)));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <Megaphone className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              <FormattedMessage id="admin.influencers.title" defaultMessage="Gestion des Influenceurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.subtitle"
                defaultMessage="{count} influenceurs enregistrés"
                values={{ count: total }}
              />
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                <FormattedMessage id="admin.influencers.export" defaultMessage="Exporter CSV" />
              </span>
            </button>
            <button
              onClick={fetchInfluencers}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
              </span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.active" defaultMessage="Actifs" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.totalActive}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.suspended" defaultMessage="Suspendus" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.totalSuspended}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.newMonth" defaultMessage="Nouveaux (mois)" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.newThisMonth}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.earnings" defaultMessage="Total versé" />
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {formatAmount(stats.totalEarnings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Public directory info */}
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl text-sm text-red-700 dark:text-red-400">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>
            Les influenceurs marqués "Visible" apparaissent sur{' '}
            <a href="/nos-influenceurs" target="_blank" className="underline font-medium hover:opacity-80">
              la page publique des influenceurs
            </a>.
            {' '}Par défaut, les nouveaux inscrits sont masqués.
          </span>
        </div>

        {/* Filters */}
        <div className={`${UI.card} p-3 sm:p-4`}>
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search Row */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.influencers.search', defaultMessage: 'Rechercher par nom, email, code...' })}
                className={`${UI.input} pl-10 text-sm sm:text-base`}
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.influencers.filter.all', defaultMessage: 'Tous statuts' })}</option>
                  <option value="active">{intl.formatMessage({ id: 'admin.influencers.filter.active', defaultMessage: 'Actifs' })}</option>
                  <option value="suspended">{intl.formatMessage({ id: 'admin.influencers.filter.suspended', defaultMessage: 'Suspendus' })}</option>
                  <option value="banned">{intl.formatMessage({ id: 'admin.influencers.filter.banned', defaultMessage: 'Bannis' })}</option>
                </select>
              </div>

              {/* Country Filter */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.influencers.filter.allCountries', defaultMessage: 'Tous les pays' })}</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <Languages className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.influencers.filter.allLanguages', defaultMessage: 'Toutes langues' })}</option>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className={`${UI.card} p-3 sm:p-4 bg-red-50 dark:bg-red-900/20`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                <FormattedMessage
                  id="admin.influencers.bulkSelected"
                  defaultMessage="{count} influenceur(s) sélectionné(s)"
                  values={{ count: selectedIds.size }}
                />
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Play className="w-4 h-4" />
                  <FormattedMessage id="admin.influencers.bulk.activate" defaultMessage="Activer" />
                </button>
                <button
                  onClick={() => handleBulkAction('suspend')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Pause className="w-4 h-4" />
                  <FormattedMessage id="admin.influencers.bulk.suspend" defaultMessage="Suspendre" />
                </button>
                <button
                  onClick={() => handleBulkAction('email')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Mail className="w-4 h-4" />
                  <FormattedMessage id="admin.influencers.bulk.email" defaultMessage="Envoyer email" />
                </button>
                <button
                  onClick={() => handleBulkDelete()}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20`}>
            <p className="text-red-600 dark:text-red-400 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Influencers List */}
            <div className={`${UI.card} overflow-hidden`}>
              {influencers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="admin.influencers.empty" defaultMessage="Aucun influenceur trouvé" />
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                      <tr>
                        <th className="px-3 sm:px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === influencers.length && influencers.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                          />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Influenceur
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          <FormattedMessage id="admin.influencers.col.country" defaultMessage="Pays" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <FormattedMessage id="admin.influencers.col.status" defaultMessage="Statut" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          Inscription
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                          Tél.
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                          Parrain
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          <FormattedMessage id="admin.influencers.col.earnings" defaultMessage="Gains" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          <FormattedMessage id="admin.influencers.col.referrals" defaultMessage="Réf." />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                          <FormattedMessage id="admin.influencers.col.lastLogin" defaultMessage="Dernière connexion" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {influencers.map((influencer) => (
                        <tr
                          key={influencer.id}
                          className={`hover:bg-gray-50 dark:hover:bg-white/5 ${
                            selectedIds.has(influencer.id) ? 'bg-red-50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="px-3 sm:px-4 py-3 sm:py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(influencer.id)}
                              onChange={() => toggleSelection(influencer.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                            />
                          </td>
                          <td
                            className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => navigate(`/admin/influencers/${influencer.id}`)}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                {influencer.firstName?.[0]}{influencer.lastName?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                  {influencer.firstName} {influencer.lastName}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                                  {influencer.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">{influencer.country ? getFlagEmoji(influencer.country) : '🌍'}</span>
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                {influencer.country ? getCountryName(influencer.country) : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(influencer.status)}`}>
                              {getStatusIcon(influencer.status)}
                              <span className="hidden sm:inline">{influencer.status}</span>
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(influencer.createdAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                            {influencer.phone ? (
                              <span className="text-xs text-gray-600 dark:text-gray-400">{influencer.phone}</span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                            {influencer.recruitedBy ? (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400" title={`Parrain: ${influencer.recruitedByName || influencer.recruitedBy}`}>
                                <span className="truncate max-w-[130px]">{influencer.recruitedByName || 'Parrain'}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <span className="font-medium text-green-600 dark:text-green-400 text-sm">
                              {formatAmount(influencer.totalEarned)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="text-xs sm:text-sm">
                              <span className="text-gray-900 dark:text-white">{influencer.totalClientsReferred}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-gray-600 dark:text-gray-400">{influencer.totalProvidersRecruited}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {influencer.lastLoginAt
                                ? new Date(influencer.lastLoginAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); void toggleFeatured(influencer.id, !!influencer.isFeatured); }}
                                disabled={featuredLoading === influencer.id}
                                title={influencer.isFeatured ? 'Retirer le badge Recommandé' : 'Attribuer le badge Recommandé'}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                              >
                                {featuredLoading === influencer.id
                                  ? <span className="animate-spin inline-block w-3 h-3 border border-current rounded-full border-t-transparent" />
                                  : <Star className={`w-4 h-4 ${influencer.isFeatured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                }
                              </button>
                              {/* Visibility toggle */}
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {visibilityLoading.get(influencer.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                ) : (
                                  <button
                                    onClick={() => handleToggleVisibility(influencer.id, influencer.isVisible)}
                                    title={influencer.isVisible ? 'Masquer du répertoire public' : 'Afficher dans le répertoire public'}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${influencer.isVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                  >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${influencer.isVisible ? 'translate-x-5' : 'translate-x-1'}`} />
                                  </button>
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-14">
                                  {influencer.isVisible ? 'Visible' : 'Masqué'}
                                </span>
                              </div>
                              {/* Moderation dropdown */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === influencer.id ? null : influencer.id); }}
                                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                  title="Actions de modération"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-500" />
                                </button>
                                {openDropdownId === influencer.id && (
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                                    <button
                                      onClick={() => { setOpenDropdownId(null); window.open(`/influencer/tableau-de-bord?userId=${influencer.id}`, '_blank'); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                      <ExternalLink className="w-4 h-4" /> Voir dashboard
                                    </button>
                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                    {influencer.status === 'active' && (
                                      <>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ influencer, action: 'suspend' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                        >
                                          <Pause className="w-4 h-4" /> Suspendre
                                        </button>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ influencer, action: 'ban' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          <ShieldOff className="w-4 h-4" /> Bannir
                                        </button>
                                      </>
                                    )}
                                    {influencer.status === 'suspended' && (
                                      <>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ influencer, action: 'reactivate' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                        >
                                          <PlayCircle className="w-4 h-4" /> Reactiver
                                        </button>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ influencer, action: 'ban' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          <ShieldOff className="w-4 h-4" /> Bannir
                                        </button>
                                      </>
                                    )}
                                    {influencer.status === 'banned' && (
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ influencer, action: 'reactivate' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                      >
                                        <PlayCircle className="w-4 h-4" /> Reactiver
                                      </button>
                                    )}
                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                    <button
                                      onClick={() => { setOpenDropdownId(null); setActionModal({ influencer, action: 'delete' }); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" /> Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(influencer); }}
                                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Modifier le profil"
                              >
                                <Edit3 className="w-4 h-4 text-indigo-500" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`/influencer/tableau-de-bord?userId=${influencer.id}`, '_blank'); }}
                                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Voir le dashboard"
                              >
                                <ExternalLink className="w-4 h-4 text-blue-500" />
                              </button>
                              <button
                                onClick={() => navigate(`/admin/influencers/${influencer.id}`)}
                                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="admin.influencers.pagination"
                    defaultMessage="Page {page} sur {total} ({count} influenceurs)"
                    values={{ page, total: totalPages, count: total }}
                  />
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <FormattedMessage id="common.previous" defaultMessage="Préc." />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <FormattedMessage id="common.next" defaultMessage="Suiv." />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========== EDIT PROFILE MODAL ========== */}
      {editModal.isOpen && editModal.influencer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Modifier — {editModal.influencer.firstName} {editModal.influencer.lastName}
                </h3>
              </div>
              <button onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                  <input type="text" value={editModal.fields.firstName} onChange={(e) => handleEditField('firstName', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                  <input type="text" value={editModal.fields.lastName} onChange={(e) => handleEditField('lastName', e.target.value)} className={UI.input} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Mail className="w-3.5 h-3.5 inline mr-1" />Email</label>
                <input type="email" value={editModal.fields.email} onChange={(e) => handleEditField('email', e.target.value)} className={UI.input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Phone className="w-3.5 h-3.5 inline mr-1" />Téléphone</label>
                <input type="tel" value={editModal.fields.phone} onChange={(e) => handleEditField('phone', e.target.value)} placeholder="+33 6 12 34 56 78" className={UI.input} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Globe className="w-3.5 h-3.5 inline mr-1" />Pays</label>
                  <select value={editModal.fields.country} onChange={(e) => handleEditField('country', e.target.value)} className={UI.select}>
                    <option value="">— Sélectionner —</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Languages className="w-3.5 h-3.5 inline mr-1" />Langue</label>
                  <select value={editModal.fields.language} onChange={(e) => handleEditField('language', e.target.value)} className={UI.select}>
                    <option value="">— Sélectionner —</option>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plateformes (séparées par virgule)</label>
                  <input type="text" value={editModal.fields.platforms} onChange={(e) => handleEditField('platforms', e.target.value)} placeholder="instagram, tiktok, youtube" className={UI.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taille communauté</label>
                  <input type="number" value={editModal.fields.communitySize} onChange={(e) => handleEditField('communitySize', e.target.value)} placeholder="10000" className={UI.input} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niche</label>
                <input type="text" value={editModal.fields.niche} onChange={(e) => handleEditField('niche', e.target.value)} placeholder="Voyage, expatriation..." className={UI.input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><AlertCircle className="w-3.5 h-3.5 inline mr-1" />Notes admin (internes)</label>
                <textarea value={editModal.fields.adminNotes} onChange={(e) => handleEditField('adminNotes', e.target.value)} className={`${UI.input} min-h-[80px] resize-y`} rows={3} placeholder="Notes visibles uniquement par les admins..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className={`${UI.button.secondary} px-4 py-2 text-sm`} disabled={editLoading}>Annuler</button>
              <button onClick={handleSaveProfile} disabled={editLoading} className={`${UI.button.primary} px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50`}>
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========== MODERATION ACTION MODAL ========== */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-t-2xl ${
              actionModal.action === 'suspend' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
              actionModal.action === 'ban' ? 'bg-red-50 dark:bg-red-900/20' :
              actionModal.action === 'reactivate' ? 'bg-green-50 dark:bg-green-900/20' :
              'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center gap-3">
                {actionModal.action === 'suspend' && <Pause className="w-5 h-5 text-yellow-600" />}
                {actionModal.action === 'ban' && <ShieldOff className="w-5 h-5 text-red-600" />}
                {actionModal.action === 'reactivate' && <PlayCircle className="w-5 h-5 text-green-600" />}
                {actionModal.action === 'delete' && <Trash2 className="w-5 h-5 text-red-600" />}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {actionModal.action === 'suspend' && 'Suspendre l\'influenceur'}
                  {actionModal.action === 'ban' && 'Bannir l\'influenceur'}
                  {actionModal.action === 'reactivate' && 'Réactiver l\'influenceur'}
                  {actionModal.action === 'delete' && 'Supprimer l\'influenceur'}
                </h3>
              </div>
              <button onClick={() => { setActionModal(null); setActionReason(''); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {actionModal.action === 'suspend' && (
                  <>Vous allez suspendre <strong>{actionModal.influencer.firstName} {actionModal.influencer.lastName}</strong>. L'influenceur ne pourra plus accéder à son dashboard ni générer de commissions.</>
                )}
                {actionModal.action === 'ban' && (
                  <>Vous allez bannir <strong>{actionModal.influencer.firstName} {actionModal.influencer.lastName}</strong>. Cette action est plus sévère qu'une suspension.</>
                )}
                {actionModal.action === 'reactivate' && (
                  <>Vous allez réactiver <strong>{actionModal.influencer.firstName} {actionModal.influencer.lastName}</strong>. L'influenceur retrouvera l'accès à toutes ses fonctionnalités.</>
                )}
                {actionModal.action === 'delete' && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Vous allez supprimer définitivement <strong>{actionModal.influencer.firstName} {actionModal.influencer.lastName}</strong>. Cette action est irréversible.
                  </span>
                )}
              </p>
              {actionModal.action !== 'reactivate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Raison {actionModal.action === 'delete' ? '(obligatoire)' : '(obligatoire)'}
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className={`${UI.input} min-h-[80px] resize-y`}
                    rows={3}
                    placeholder={
                      actionModal.action === 'suspend' ? 'Ex: Violation des conditions, inactivité prolongée...' :
                      actionModal.action === 'ban' ? 'Ex: Fraude détectée, comportement abusif...' :
                      'Ex: Compte frauduleux, demande de suppression...'
                    }
                  />
                </div>
              )}
              {actionModal.action === 'delete' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tapez <strong>SUPPRIMER</strong> pour confirmer
                  </label>
                  <input
                    type="text"
                    value={actionConfirmText}
                    onChange={(e) => setActionConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className={`${UI.input} text-sm`}
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setActionModal(null); setActionReason(''); setActionConfirmText(''); }}
                className={`${UI.button.secondary} px-4 py-2 text-sm`}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleModerationAction}
                disabled={actionLoading || (['suspend', 'ban', 'delete'].includes(actionModal.action) && !actionReason.trim()) || (actionModal.action === 'delete' && actionConfirmText !== 'SUPPRIMER')}
                className={`${
                  actionModal.action === 'reactivate' ? 'bg-green-500 hover:bg-green-600' :
                  actionModal.action === 'suspend' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  'bg-red-500 hover:bg-red-600'
                } text-white font-medium rounded-xl transition-all px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {actionModal.action === 'suspend' && <Pause className="w-4 h-4" />}
                    {actionModal.action === 'ban' && <ShieldOff className="w-4 h-4" />}
                    {actionModal.action === 'reactivate' && <PlayCircle className="w-4 h-4" />}
                    {actionModal.action === 'delete' && <Trash2 className="w-4 h-4" />}
                  </>
                )}
                {actionModal.action === 'suspend' && 'Suspendre'}
                {actionModal.action === 'ban' && 'Bannir'}
                {actionModal.action === 'reactivate' && 'Réactiver'}
                {actionModal.action === 'delete' && 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {bulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Supprimer {selectedIds.size} influenceur{selectedIds.size > 1 ? 's' : ''} ?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Cette action est irréversible. Tous les comptes, commissions, retraits et données associées seront définitivement supprimés.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison</label>
                <input type="text" value={bulkDeleteReason} onChange={(e) => setBulkDeleteReason(e.target.value)} placeholder="Raison de la suppression..." className={UI.input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tapez SUPPRIMER pour confirmer</label>
                <input type="text" value={bulkDeleteConfirm} onChange={(e) => setBulkDeleteConfirm(e.target.value)} placeholder="SUPPRIMER" className={UI.input} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setBulkDeleteModal(false); setBulkDeleteConfirm(''); setBulkDeleteReason(''); }} className={`${UI.button.secondary} px-4 py-2`}>Annuler</button>
              <button onClick={executeBulkDelete} disabled={bulkActionLoading || bulkDeleteConfirm !== 'SUPPRIMER'} className={`${UI.button.danger} px-4 py-2 flex items-center gap-2 disabled:opacity-50`}>
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

// Helper function to get country flag emoji from ISO code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default AdminInfluencersList;
