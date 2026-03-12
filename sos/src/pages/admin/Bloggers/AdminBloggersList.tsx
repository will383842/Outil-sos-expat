/**
 * AdminBloggersList - Admin page for managing bloggers worldwide
 * Features: Country filter, export, bulk actions, statistics
 *
 * Note: Bloggers have FIXED commissions ($10 client, $5 recruitment) with NO levels/bonuses
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
  FileText,
  ExternalLink,
  Star,
  Edit3,
  Phone,
  Save,
  AlertCircle,
  Ban as BanIcon,
  Trash2,
  PlayCircle,
  MoreVertical,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens - Purple theme for Bloggers
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500",
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

interface Blogger {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  totalEarned: number;
  totalClientsReferred: number;
  totalProvidersRecruited: number;
  blogUrl?: string;
  blogName?: string;
  blogLanguage?: string;
  blogCountry?: string;
  blogTraffic?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  isFeatured?: boolean;
  isVisible?: boolean;
  phone?: string | null;
  recruitedBy?: string | null;
  recruitedByName?: string | null;
  whatsappGroupClicked?: boolean;
  hasTelegram?: boolean;
  telegramId?: number | null;
}

interface BloggerListResponse {
  bloggers: Blogger[];
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

const AdminBloggersList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  // State
  const [bloggers, setBloggers] = useState<Blogger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BloggerListResponse['stats']>();
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState<Map<string, boolean>>(new Map());

  const handleToggleVisibility = useCallback(async (bloggerId: string, currentVisible: boolean) => {
    setVisibilityLoading(prev => new Map(prev).set(bloggerId, true));
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminToggleBloggerVisibility');
      await fn({ bloggerId, isVisible: !currentVisible });
      setBloggers(prev => prev.map(b => b.id === bloggerId ? { ...b, isVisible: !currentVisible } : b));
      toast.success(!currentVisible ? 'Blogueur visible dans le répertoire ✓' : 'Blogueur masqué du répertoire');
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      toast.error('Erreur lors de la mise à jour de la visibilité');
    } finally {
      setVisibilityLoading(prev => { const m = new Map(prev); m.delete(bloggerId); return m; });
    }
  }, []);

  const toggleFeatured = async (id: string, current: boolean) => {
    setFeaturedLoading(id);
    try {
      const fn = httpsCallable(functions, 'setProviderBadge');
      await fn({ providerId: id, isFeatured: !current });
      setBloggers((prev) => prev.map((x) => x.id === id ? { ...x, isFeatured: !current } : x));
      toast.success(!current ? 'Badge attribué ✓' : 'Badge retiré');
    } catch {
      toast.error('Erreur lors de la mise à jour du badge');
    } finally {
      setFeaturedLoading(null);
    }
  };

  // Edit profile modal
  interface EditProfileState {
    isOpen: boolean;
    blogger: Blogger | null;
    fields: {
      firstName: string; lastName: string; email: string; phone: string;
      country: string; language: string; blogUrl: string; blogName: string;
      blogLanguage: string; blogCountry: string; blogTheme: string; blogTraffic: string; adminNotes: string;
    };
  }
  const [editModal, setEditModal] = useState<EditProfileState>({
    isOpen: false, blogger: null,
    fields: { firstName: '', lastName: '', email: '', phone: '', country: '', language: '', blogUrl: '', blogName: '', blogLanguage: '', blogCountry: '', blogTheme: '', blogTraffic: '', adminNotes: '' },
  });
  const [editLoading, setEditLoading] = useState(false);

  // Action modal (suspend, ban, reactivate, delete)
  const [actionModal, setActionModal] = useState<{
    blogger: any;
    action: 'suspend' | 'ban' | 'reactivate' | 'delete';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionConfirmText, setActionConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Dropdown menu for moderation actions
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  const openEditModal = useCallback((b: Blogger) => {
    setEditModal({
      isOpen: true, blogger: b,
      fields: {
        firstName: b.firstName || '', lastName: b.lastName || '', email: b.email || '',
        phone: (b as any).phone || '', country: (b as any).country || '', language: (b as any).language || '',
        blogUrl: b.blogUrl || '', blogName: b.blogName || '', blogLanguage: b.blogLanguage || '',
        blogCountry: b.blogCountry || '', blogTheme: (b as any).blogTheme || '', blogTraffic: b.blogTraffic || '',
        adminNotes: (b as any).adminNotes || '',
      },
    });
  }, []);

  const handleEditField = useCallback((field: string, value: string) => {
    setEditModal(prev => ({ ...prev, fields: { ...prev.fields, [field]: value } }));
  }, []);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  // Fetch bloggers
  const fetchBloggers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetBloggersList = httpsCallable<any, BloggerListResponse>(
        functionsAffiliate,
        'adminGetBloggersList'
      );

      const result = await adminGetBloggersList({
        offset: (page - 1) * limit,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });

      setBloggers(result.data.bloggers);
      setTotal(result.data.total);
      if (result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching bloggers:', err);
      setError(err.message || 'Failed to load bloggers');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, countryFilter, languageFilter, searchQuery]);

  const handleSaveProfile = useCallback(async () => {
    if (!editModal.blogger) return;
    setEditLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateBloggerProfile');
      const updates: Record<string, any> = { bloggerId: editModal.blogger.id };
      const orig = editModal.blogger as any;
      const fields = editModal.fields;
      if (fields.firstName !== (orig.firstName || '')) updates.firstName = fields.firstName;
      if (fields.lastName !== (orig.lastName || '')) updates.lastName = fields.lastName;
      if (fields.email !== (orig.email || '')) updates.email = fields.email;
      if (fields.phone !== (orig.phone || '')) updates.phone = fields.phone;
      if (fields.country !== (orig.country || '')) updates.country = fields.country;
      if (fields.language !== (orig.language || '')) updates.language = fields.language;
      if (fields.blogUrl !== (orig.blogUrl || '')) updates.blogUrl = fields.blogUrl;
      if (fields.blogName !== (orig.blogName || '')) updates.blogName = fields.blogName;
      if (fields.blogLanguage !== (orig.blogLanguage || '')) updates.blogLanguage = fields.blogLanguage;
      if (fields.blogCountry !== (orig.blogCountry || '')) updates.blogCountry = fields.blogCountry;
      if (fields.blogTheme !== (orig.blogTheme || '')) updates.blogTheme = fields.blogTheme;
      if (fields.blogTraffic !== (orig.blogTraffic || '')) updates.blogTraffic = fields.blogTraffic;
      if (fields.adminNotes !== (orig.adminNotes || '')) updates.adminNotes = fields.adminNotes;

      if (Object.keys(updates).length <= 1) { toast.error('Aucune modification'); setEditLoading(false); return; }
      await fn(updates);
      toast.success('Profil mis à jour');
      setEditModal(prev => ({ ...prev, isOpen: false }));
      fetchBloggers();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally { setEditLoading(false); }
  }, [editModal, fetchBloggers]);

  const handleAction = async () => {
    if (!actionModal) return;
    const { blogger, action } = actionModal;

    if ((action === 'suspend' || action === 'ban' || action === 'delete') && !actionReason.trim()) {
      toast.error('Une raison est requise');
      return;
    }

    if (action === 'delete' && actionConfirmText !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer');
      return;
    }

    setActionLoading(true);
    try {
      if (action === 'delete') {
        const fn = httpsCallable(functionsAffiliate, 'adminDeleteBlogger');
        await fn({ bloggerId: blogger.id, reason: actionReason.trim() });
        toast.success('Blogueur supprimé définitivement');
      } else {
        const fn = httpsCallable(functionsAffiliate, 'adminUpdateBloggerStatus');
        await fn({
          bloggerId: blogger.id,
          status: action === 'suspend' ? 'suspended' : action === 'ban' ? 'banned' : 'active',
          reason: actionReason,
        });
        toast.success(
          action === 'suspend' ? 'Blogueur suspendu' :
          action === 'ban' ? 'Blogueur bloqué' : 'Blogueur réactivé'
        );
      }
      setActionModal(null);
      setActionReason('');
      setActionConfirmText('');
      fetchBloggers();
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchBloggers();
  }, [page, statusFilter, countryFilter, languageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchBloggers();
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
      const adminExportBloggers = httpsCallable<any, { csv: string }>(
        functionsAffiliate,
        'adminExportBloggers'
      );

      const result = await adminExportBloggers({
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
      });

      // Download CSV
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bloggers_export_${new Date().toISOString().split('T')[0]}.csv`;
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
      const adminBulkBloggerAction = httpsCallable(functionsAffiliate, 'adminBulkBloggerAction');
      await adminBulkBloggerAction({
        bloggerIds: Array.from(selectedIds),
        action,
      });

      setSelectedIds(new Set());
      fetchBloggers();
    } catch (err: any) {
      console.error('Bulk action error:', err);
      setError(err.message || 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk delete
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
      const fn = httpsCallable(functionsAffiliate, 'adminDeleteBlogger');
      const ids = Array.from(selectedIds);
      let successCount = 0;
      for (const id of ids) {
        try {
          await fn({ bloggerId: id, reason: bulkDeleteReason });
          successCount++;
        } catch (err) {
          console.error(`Failed to delete blogger ${id}:`, err);
        }
      }
      toast.success(`${successCount}/${ids.length} blogueurs supprimés`);
      setSelectedIds(new Set());
      setBulkDeleteModal(false);
      setBulkDeleteConfirm('');
      setBulkDeleteReason('');
      fetchBloggers();
    } catch (err) {
      toast.error('Erreur lors de la suppression en masse');
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
    if (selectedIds.size === bloggers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bloggers.map(b => b.id)));
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
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              <FormattedMessage id="admin.bloggers.title" defaultMessage="Gestion des Blogueurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.bloggers.subtitle"
                defaultMessage="{count} blogueurs enregistrés"
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
                <FormattedMessage id="admin.bloggers.export" defaultMessage="Exporter CSV" />
              </span>
            </button>
            <button
              onClick={fetchBloggers}
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
                    <FormattedMessage id="admin.bloggers.stats.active" defaultMessage="Actifs" />
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
                    <FormattedMessage id="admin.bloggers.stats.suspended" defaultMessage="Suspendus" />
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
                    <FormattedMessage id="admin.bloggers.stats.newMonth" defaultMessage="Nouveaux (mois)" />
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
                    <FormattedMessage id="admin.bloggers.stats.earnings" defaultMessage="Total versé" />
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {formatAmount(stats.totalEarnings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner - Fixed Commissions */}
        <div className={`${UI.card} p-4 bg-purple-50 dark:bg-purple-900/20`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                <FormattedMessage id="admin.bloggers.fixedCommissions" defaultMessage="Commissions fixes" />
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                <FormattedMessage
                  id="admin.bloggers.fixedCommissionsDesc"
                  defaultMessage="10$ par appel référé • 5$ par partenaire • Pas de bonus ni de niveaux"
                />
              </p>
            </div>
          </div>
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
                placeholder={intl.formatMessage({ id: 'admin.bloggers.search', defaultMessage: 'Rechercher par nom, email, blog...' })}
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
                  <option value="all">{intl.formatMessage({ id: 'admin.bloggers.filter.all', defaultMessage: 'Tous statuts' })}</option>
                  <option value="active">{intl.formatMessage({ id: 'admin.bloggers.filter.active', defaultMessage: 'Actifs' })}</option>
                  <option value="suspended">{intl.formatMessage({ id: 'admin.bloggers.filter.suspended', defaultMessage: 'Suspendus' })}</option>
                  <option value="banned">{intl.formatMessage({ id: 'admin.bloggers.filter.banned', defaultMessage: 'Bannis' })}</option>
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
                  <option value="all">{intl.formatMessage({ id: 'admin.bloggers.filter.allCountries', defaultMessage: 'Tous les pays' })}</option>
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
                  <option value="all">{intl.formatMessage({ id: 'admin.bloggers.filter.allLanguages', defaultMessage: 'Toutes langues' })}</option>
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
          <div className={`${UI.card} p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                <FormattedMessage
                  id="admin.bloggers.bulkSelected"
                  defaultMessage="{count} blogueur(s) sélectionné(s)"
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
                  <FormattedMessage id="admin.bloggers.bulk.activate" defaultMessage="Activer" />
                </button>
                <button
                  onClick={() => handleBulkAction('suspend')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Pause className="w-4 h-4" />
                  <FormattedMessage id="admin.bloggers.bulk.suspend" defaultMessage="Suspendre" />
                </button>
                <button
                  onClick={() => handleBulkAction('email')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Mail className="w-4 h-4" />
                  <FormattedMessage id="admin.bloggers.bulk.email" defaultMessage="Envoyer email" />
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className={`${UI.button.danger} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Trash2 className="w-4 h-4" />
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

        {/* Info répertoire */}
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm text-purple-700 dark:text-purple-300">
          <Globe className="w-4 h-4 shrink-0" />
          <span>
            Le répertoire public des blogueurs est disponible sur{' '}
            <a href="/nos-blogueurs" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-purple-900 dark:hover:text-purple-100">
              /nos-blogueurs
            </a>
            . Activez la visibilité par blogueur via le toggle "Répertoire" ci-dessous.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20`}>
            <p className="text-red-600 dark:text-red-400 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Bloggers List */}
            <div className={`${UI.card} overflow-hidden`}>
              {bloggers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="admin.bloggers.empty" defaultMessage="Aucun blogueur trouvé" />
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
                            checked={selectedIds.size === bloggers.length && bloggers.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                          />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Blogueur
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          <FormattedMessage id="admin.bloggers.col.blog" defaultMessage="Blog" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <FormattedMessage id="admin.bloggers.col.status" defaultMessage="Statut" />
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
                          <FormattedMessage id="admin.bloggers.col.earnings" defaultMessage="Gains" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          <FormattedMessage id="admin.bloggers.col.referrals" defaultMessage="Réf." />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                          <FormattedMessage id="admin.bloggers.col.lastLogin" defaultMessage="Dernière connexion" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Répertoire
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell" title="WhatsApp Group">WA</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell" title="Telegram">TG</th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {bloggers.map((blogger) => (
                        <tr
                          key={blogger.id}
                          className={`hover:bg-gray-50 dark:hover:bg-white/5 ${
                            selectedIds.has(blogger.id) ? 'bg-purple-50 dark:bg-purple-900/10' : ''
                          }`}
                        >
                          <td className="px-3 sm:px-4 py-3 sm:py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(blogger.id)}
                              onChange={() => toggleSelection(blogger.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                            />
                          </td>
                          <td
                            className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => navigate(`/admin/bloggers/${blogger.id}`)}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                {blogger.firstName?.[0]}{blogger.lastName?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                  {blogger.firstName} {blogger.lastName}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                                  {blogger.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                                {blogger.blogName || '-'}
                              </span>
                              {blogger.blogUrl && (
                                <a
                                  href={blogger.blogUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Voir le blog
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(blogger.status)}`}>
                              {getStatusIcon(blogger.status)}
                              <span className="hidden sm:inline">{blogger.status}</span>
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {new Date(blogger.createdAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                            {blogger.phone ? (
                              <span className="text-xs text-gray-600 dark:text-gray-400">{blogger.phone}</span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                            {blogger.recruitedBy ? (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400" title={`Parrain: ${blogger.recruitedByName || blogger.recruitedBy}`}>
                                <span className="truncate max-w-[130px]">{blogger.recruitedByName || 'Parrain'}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <span className="font-medium text-green-600 dark:text-green-400 text-sm">
                              {formatAmount(blogger.totalEarned)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="text-xs sm:text-sm">
                              <span className="text-gray-900 dark:text-white">{blogger.totalClientsReferred}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-gray-600 dark:text-gray-400">{blogger.totalProvidersRecruited}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {blogger.lastLoginAt
                                ? new Date(blogger.lastLoginAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); void handleToggleVisibility(blogger.id, !!blogger.isVisible); }}
                              disabled={visibilityLoading.has(blogger.id)}
                              title={blogger.isVisible ? 'Masquer du répertoire' : 'Afficher dans le répertoire'}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                blogger.isVisible ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                              } ${visibilityLoading.has(blogger.id) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                blogger.isVisible ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </td>
                          <td className="px-3 py-3 text-center hidden md:table-cell">
                            {blogger.whatsappGroupClicked ? (
                              <span className="text-green-600" title="A rejoint le groupe WhatsApp">&#10003;</span>
                            ) : (
                              <span className="text-red-400" title="N'a pas rejoint WhatsApp">&#10007;</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center hidden md:table-cell">
                            {blogger.hasTelegram ? (
                              <span className="text-green-600" title={`Telegram lié${blogger.telegramId ? ` (ID: ${blogger.telegramId})` : ''}`}>&#10003;</span>
                            ) : (
                              <span className="text-red-400" title="Telegram non lié">&#10007;</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); void toggleFeatured(blogger.id, !!blogger.isFeatured); }}
                                disabled={featuredLoading === blogger.id}
                                title={blogger.isFeatured ? 'Retirer le badge Recommandé' : 'Attribuer le badge Recommandé'}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                              >
                                {featuredLoading === blogger.id
                                  ? <span className="animate-spin inline-block w-3 h-3 border border-current rounded-full border-t-transparent" />
                                  : <Star className={`w-4 h-4 ${blogger.isFeatured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                }
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(blogger); }}
                                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Modifier le profil"
                              >
                                <Edit3 className="w-4 h-4 text-indigo-500" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`/blogger/tableau-de-bord?userId=${blogger.id}`, '_blank'); }}
                                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Voir le dashboard"
                              >
                                <ExternalLink className="w-4 h-4 text-blue-500" />
                              </button>
                              {/* Moderation dropdown */}
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === blogger.id ? null : blogger.id); }}
                                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                  title="Actions"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </button>
                                {openDropdownId === blogger.id && (
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50" onClick={(e) => e.stopPropagation()}>
                                    {blogger.status === 'active' && (
                                      <>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ blogger, action: 'suspend' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                        >
                                          <Pause className="w-4 h-4" /> Suspendre
                                        </button>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ blogger, action: 'ban' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          <BanIcon className="w-4 h-4" /> Bannir
                                        </button>
                                      </>
                                    )}
                                    {blogger.status === 'suspended' && (
                                      <>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ blogger, action: 'reactivate' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                        >
                                          <PlayCircle className="w-4 h-4" /> Réactiver
                                        </button>
                                        <button
                                          onClick={() => { setOpenDropdownId(null); setActionModal({ blogger, action: 'ban' }); }}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                          <BanIcon className="w-4 h-4" /> Bannir
                                        </button>
                                      </>
                                    )}
                                    {blogger.status === 'banned' && (
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ blogger, action: 'reactivate' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                      >
                                        <PlayCircle className="w-4 h-4" /> Réactiver
                                      </button>
                                    )}
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                    <button
                                      onClick={() => { setOpenDropdownId(null); setActionModal({ blogger, action: 'delete' }); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" /> Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => navigate(`/admin/bloggers/${blogger.id}`)}
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
                    id="admin.bloggers.pagination"
                    defaultMessage="Page {page} sur {total} ({count} blogueurs)"
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
      {editModal.isOpen && editModal.blogger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Modifier — {editModal.blogger.firstName} {editModal.blogger.lastName}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Mail className="w-3.5 h-3.5 inline mr-1" />Email</label>
                  <input type="email" value={editModal.fields.email} onChange={(e) => handleEditField('email', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Phone className="w-3.5 h-3.5 inline mr-1" />Téléphone</label>
                  <input type="tel" value={editModal.fields.phone} onChange={(e) => handleEditField('phone', e.target.value)} placeholder="+33 6 12 34 56 78" className={UI.input} />
                </div>
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
              <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 pt-2">Informations du blog</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du blog</label>
                  <input type="text" value={editModal.fields.blogName} onChange={(e) => handleEditField('blogName', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL du blog</label>
                  <input type="url" value={editModal.fields.blogUrl} onChange={(e) => handleEditField('blogUrl', e.target.value)} placeholder="https://..." className={UI.input} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Langue du blog</label>
                  <select value={editModal.fields.blogLanguage} onChange={(e) => handleEditField('blogLanguage', e.target.value)} className={UI.select}>
                    <option value="">—</option>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pays du blog</label>
                  <select value={editModal.fields.blogCountry} onChange={(e) => handleEditField('blogCountry', e.target.value)} className={UI.select}>
                    <option value="">—</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trafic</label>
                  <input type="text" value={editModal.fields.blogTraffic} onChange={(e) => handleEditField('blogTraffic', e.target.value)} placeholder="10k/mois" className={UI.input} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thème du blog</label>
                <input type="text" value={editModal.fields.blogTheme} onChange={(e) => handleEditField('blogTheme', e.target.value)} placeholder="Voyage, expatriation..." className={UI.input} />
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
      {/* ========== ACTION MODAL (Suspend/Ban/Reactivate/Delete) ========== */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {actionModal.action === 'suspend' ? 'Suspendre' :
               actionModal.action === 'ban' ? 'Bloquer' :
               actionModal.action === 'reactivate' ? 'Réactiver' : 'Supprimer'} {actionModal.blogger.firstName} {actionModal.blogger.lastName}
            </h3>
            {actionModal.action !== 'reactivate' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison *</label>
                <textarea
                  className={`${UI.input} min-h-[80px] resize-y`}
                  rows={3}
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder="Raison de l'action..."
                />
              </div>
            )}
            {actionModal.action === 'delete' && (
              <>
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-800 dark:text-red-300 text-sm">
                  Cette action est irréversible. Le compte sera définitivement supprimé.
                </div>
                <div className="mb-4">
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
              </>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setActionModal(null); setActionReason(''); setActionConfirmText(''); }}
                className={`${UI.button.secondary} px-4 py-2 text-sm`}
              >
                Annuler
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || (actionModal.action === 'delete' && actionConfirmText !== 'SUPPRIMER')}
                className={`px-4 py-2 text-sm text-white rounded-xl font-medium transition-all disabled:opacity-50 ${
                  actionModal.action === 'reactivate'
                    ? 'bg-green-600 hover:bg-green-700'
                    : actionModal.action === 'suspend'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> En cours...
                  </span>
                ) : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========== BULK DELETE MODAL ========== */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Supprimer {selectedIds.size} blogueur{selectedIds.size > 1 ? 's' : ''} ?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Cette action est irréversible. Tous les comptes, commissions, articles, retraits et données associées seront définitivement supprimés.
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
              <button onClick={executeBulkDelete} disabled={bulkActionLoading || bulkDeleteConfirm !== 'SUPPRIMER'} className="bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-4 py-2 flex items-center gap-2 disabled:opacity-50">
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

export default AdminBloggersList;
