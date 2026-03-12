/**
 * AdminMarketingResources — Unified admin page for all marketing resources
 *
 * Replaces: AdminChattersResources, AdminInfluencersResources,
 *           AdminBloggersResources, AdminGroupAdminsResources, AdminPressResources
 *
 * All CRUD goes through the Laravel engine API.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  adminGetResources,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  adminUploadFile,
  adminBulkAction,
  adminReorder,
  adminGetStats,
} from '@/services/marketingResourcesApi';
import type {
  MarketingResourceAdmin,
  MarketingRole,
  MarketingCategory,
  MarketingResourceType,
  CreateResourcePayload,
  StatsResponse,
} from '@/types/marketingResources';
import {
  FolderOpen,
  Plus,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  Edit2,
  Image,
  FileText,
  X,
  Upload,
  BarChart3,
  Eye,
  EyeOff,
  GripVertical,
  Copy,
  Filter,
} from 'lucide-react';

// ── Constants ──

const ALL_ROLES: { value: MarketingRole; label: string }[] = [
  { value: 'chatter', label: 'Chatter' },
  { value: 'captain', label: 'Captain Chatter' },
  { value: 'influencer', label: 'Influenceur' },
  { value: 'blogger', label: 'Blogueur' },
  { value: 'group_admin', label: 'Admin Groupe' },
  { value: 'partner', label: 'Partenaire' },
  { value: 'press', label: 'Presse' },
];

const ALL_CATEGORIES: { value: MarketingCategory; label: string; group: string }[] = [
  // Shared
  { value: 'sos_expat', label: 'SOS-Expat', group: 'Partage' },
  { value: 'ulixai', label: 'Ulixai', group: 'Partage' },
  { value: 'founder', label: 'Fondateur', group: 'Partage' },
  // Affiliate
  { value: 'promotional', label: 'Promotionnel', group: 'Affilie' },
  { value: 'social_media', label: 'Reseaux sociaux', group: 'Affilie' },
  { value: 'templates', label: 'Templates', group: 'Affilie' },
  { value: 'seo', label: 'SEO', group: 'Affilie' },
  { value: 'recruitment', label: 'Recrutement', group: 'Affilie' },
  // Group admin
  { value: 'pinned_posts', label: 'Posts epingles', group: 'Admin Groupe' },
  { value: 'cover_banners', label: 'Bannieres couverture', group: 'Admin Groupe' },
  { value: 'post_images', label: 'Images posts', group: 'Admin Groupe' },
  { value: 'story_images', label: 'Images stories', group: 'Admin Groupe' },
  { value: 'badges', label: 'Badges', group: 'Admin Groupe' },
  { value: 'welcome_messages', label: 'Messages bienvenue', group: 'Admin Groupe' },
  // Partner
  { value: 'partner_kit', label: 'Kit Partenaire', group: 'Partenaire' },
  // Press
  { value: 'press_logos', label: 'Logos Presse', group: 'Presse' },
  { value: 'press_releases', label: 'Communiques de Presse', group: 'Presse' },
  { value: 'press_kit', label: 'Dossier de Presse', group: 'Presse' },
  { value: 'press_photos', label: 'Photos Officielles', group: 'Presse' },
  { value: 'press_data', label: 'Chiffres & Stats', group: 'Presse' },
];

const ALL_TYPES: { value: MarketingResourceType; label: string }[] = [
  { value: 'logo', label: 'Logo' },
  { value: 'image', label: 'Image' },
  { value: 'banner', label: 'Banniere' },
  { value: 'text', label: 'Texte' },
  { value: 'template', label: 'Template' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'widget', label: 'Widget' },
];

const LANGUAGES = [
  { code: 'fr', label: 'Francais' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espanol' },
  { code: 'pt', label: 'Portugues' },
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'Русский' },
  { code: 'hi', label: 'हिन्दी' },
];

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary: 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all',
    secondary: 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all',
    danger: 'bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all',
  },
  input: 'w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white',
  select: 'w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white',
} as const;

// ── Role badge colors (static) ──

const ROLE_COLORS: Record<string, string> = {
  chatter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  captain: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  influencer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  blogger: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  group_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  partner: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  press: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

// ── Component ──

interface AdminMarketingResourcesProps {
  initialRole?: MarketingRole;
}

const AdminMarketingResources: React.FC<AdminMarketingResourcesProps> = ({ initialRole }) => {
  // ── State ──
  const [resources, setResources] = useState<MarketingResourceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterRole, setFilterRole] = useState<MarketingRole | ''>(initialRole || '');
  const [filterCategory, setFilterCategory] = useState<MarketingCategory | ''>('');
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor
  const [editing, setEditing] = useState<{
    isNew: boolean;
    data: Partial<CreateResourcePayload> & { id?: string };
  } | null>(null);
  const [activeLangTab, setActiveLangTab] = useState('fr');

  // Selection for bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Stats
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // ── Fetch ──

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminGetResources({
        role: filterRole || undefined,
        category: filterCategory || undefined,
        active: filterActive ? filterActive === 'true' : undefined,
        search: debouncedSearch || undefined,
      });
      setResources(result.resources);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterCategory, filterActive, debouncedSearch]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // ── Stats ──

  const loadStats = async () => {
    if (showStats && stats) {
      setShowStats(false);
      return;
    }
    setStatsLoading(true);
    try {
      const result = await adminGetStats();
      setStats(result);
      setShowStats(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  // ── CRUD ──

  const startCreate = () => {
    setEditing({
      isNew: true,
      data: {
        target_roles: ['chatter'],
        category: 'sos_expat',
        type: 'image',
        name: { fr: '', en: '' },
        description: {},
        content: {},
        is_active: true,
        sort_order: 0,
      },
    });
    setActiveLangTab('fr');
  };

  const startEdit = (r: MarketingResourceAdmin) => {
    setEditing({
      isNew: false,
      data: {
        id: r.id,
        target_roles: [...r.target_roles],
        category: r.category,
        type: r.type,
        name: { ...(r.name || {}) },
        description: r.description ? { ...r.description } : {},
        content: r.content ? { ...r.content } : {},
        file_path: r.file_path || undefined,
        thumbnail_path: r.thumbnail_path || undefined,
        file_format: r.file_format || undefined,
        file_size: r.file_size || undefined,
        placeholders: r.placeholders ? [...r.placeholders] : undefined,
        seo_keywords: r.seo_keywords ? [...r.seo_keywords] : undefined,
        word_count: r.word_count || undefined,
        is_active: r.is_active,
        sort_order: r.sort_order,
      },
    });
    setActiveLangTab('fr');
  };

  const saveResource = async () => {
    if (!editing) return;

    // Frontend validation
    const nameObj = (editing.data.name as Record<string, string>) || {};
    if (!nameObj.fr?.trim() || !nameObj.en?.trim()) {
      setError('Le nom en francais et en anglais est obligatoire');
      return;
    }
    if (!editing.data.target_roles?.length) {
      setError('Selectionnez au moins un role cible');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editing.isNew) {
        await adminCreateResource(editing.data as CreateResourcePayload);
        showSuccess('Ressource creee avec succes');
      } else {
        const { id, ...payload } = editing.data;
        await adminUpdateResource(id!, payload);
        showSuccess('Ressource mise a jour');
      }
      setEditing(null);
      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (id: string) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await adminDeleteResource(id);
      showSuccess('Ressource supprimee');
      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to delete');
    }
  };

  // ── File Upload ──

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    setUploading(true);
    try {
      const result = await adminUploadFile(file);
      setEditing({
        ...editing,
        data: {
          ...editing.data,
          file_path: result.file_path,
          thumbnail_path: result.thumbnail_path || editing.data.thumbnail_path,
          file_format: result.file_format,
          file_size: result.file_size,
        },
      });
      showSuccess('Fichier uploade');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Bulk Actions ──

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === resources.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(resources.map((r) => r.id)));
    }
  };

  const handleBulk = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selected.size === 0) return;
    if (action === 'delete' && !confirm(`Supprimer ${selected.size} ressource(s) ?`)) return;

    try {
      const result = await adminBulkAction({ ids: Array.from(selected), action });
      showSuccess(`${result.affected} ressource(s) ${action === 'delete' ? 'supprimee(s)' : 'mise(s) a jour'}`);
      setSelected(new Set());
      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Bulk action failed');
    }
  };

  // ── Helpers ──

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const updateEditField = (field: string, value: unknown) => {
    if (!editing) return;
    setEditing({ ...editing, data: { ...editing.data, [field]: value } });
  };

  const updateTranslation = (field: 'name' | 'description' | 'content', lang: string, value: string) => {
    if (!editing) return;
    const current = (editing.data[field] as Record<string, string>) || {};
    setEditing({
      ...editing,
      data: { ...editing.data, [field]: { ...current, [lang]: value } },
    });
  };

  const toggleRole = (role: MarketingRole) => {
    if (!editing) return;
    const roles = [...(editing.data.target_roles || [])];
    const idx = roles.indexOf(role);
    if (idx >= 0) {
      if (roles.length > 1) roles.splice(idx, 1);
    } else {
      roles.push(role);
    }
    updateEditField('target_roles', roles);
  };

  // ── Render ──

  if (loading && resources.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              Ressources Marketing
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gerer les ressources pour tous les roles affilies ({resources.length} ressources)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadStats} className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}>
              {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              <span className="hidden sm:inline">Stats</span>
            </button>
            <button onClick={startCreate} className={`${UI.button.primary} px-3 py-2 flex items-center gap-2 text-sm`}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle ressource</span>
            </button>
            <button onClick={fetchResources} className={`${UI.button.secondary} px-3 py-2`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}
        {success && (
          <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 flex items-center gap-3`}>
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* ── Stats Panel ── */}
        {showStats && stats && (
          <div className={`${UI.card} p-4 sm:p-6 space-y-4`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-500" />
              Statistiques
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total_resources}</p>
                <p className="text-xs text-blue-500">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.active_resources}</p>
                <p className="text-xs text-green-500">Actives</p>
              </div>
              {stats.count_by_category.slice(0, 2).map((c) => (
                <div key={c.category} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{c.count}</p>
                  <p className="text-xs text-gray-500">{c.category}</p>
                </div>
              ))}
            </div>
            {stats.top_downloads.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top telechargements</h3>
                <div className="space-y-1">
                  {stats.top_downloads.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{r.name?.fr || r.name?.en || '—'}</span>
                      <span className="text-gray-500 ml-2">{r.download_count} DL</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Filters ── */}
        <div className={`${UI.card} p-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className={`${UI.input} pl-10`}
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as MarketingRole | '')}
              className={UI.select}
            >
              <option value="">Tous les roles</option>
              {ALL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as MarketingCategory | '')}
              className={UI.select}
            >
              <option value="">Toutes categories</option>
              {Object.entries(
                ALL_CATEGORIES.reduce<Record<string, typeof ALL_CATEGORIES>>((acc, c) => {
                  (acc[c.group] ||= []).push(c);
                  return acc;
                }, {}),
              ).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as '' | 'true' | 'false')}
              className={UI.select}
            >
              <option value="">Toutes</option>
              <option value="true">Actives</option>
              <option value="false">Inactives</option>
            </select>
          </div>
        </div>

        {/* ── Bulk Actions ── */}
        {selected.size > 0 && (
          <div className={`${UI.card} p-3 flex items-center gap-3 flex-wrap`}>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selected.size} selectionne(s)
            </span>
            <button onClick={() => handleBulk('activate')} className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1`}>
              <Eye className="w-4 h-4" /> Activer
            </button>
            <button onClick={() => handleBulk('deactivate')} className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1`}>
              <EyeOff className="w-4 h-4" /> Desactiver
            </button>
            <button onClick={() => handleBulk('delete')} className={`${UI.button.danger} px-3 py-1.5 text-sm flex items-center gap-1`}>
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
            <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">
              Deselectionner
            </button>
          </div>
        )}

        {/* ── Resource List ── */}
        <div className={`${UI.card} overflow-hidden`}>
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[40px_1fr_120px_120px_100px_80px_100px] gap-2 p-3 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-500 uppercase">
            <div>
              <input
                type="checkbox"
                checked={selected.size === resources.length && resources.length > 0}
                onChange={toggleSelectAll}
                className="rounded"
              />
            </div>
            <div>Ressource</div>
            <div>Roles</div>
            <div>Categorie</div>
            <div>Type</div>
            <div>Statut</div>
            <div>Actions</div>
          </div>

          {/* Rows */}
          {resources.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              Aucune ressource trouvee
            </div>
          )}

          {resources.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-1 lg:grid-cols-[40px_1fr_120px_120px_100px_80px_100px] gap-2 p-3 border-t border-gray-100 dark:border-white/5 items-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              {/* Checkbox */}
              <div className="hidden lg:block">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() => toggleSelect(r.id)}
                  className="rounded"
                />
              </div>

              {/* Name + thumbnail */}
              <div className="flex items-center gap-3 min-w-0">
                {r.thumbnail_path ? (
                  <img
                    src={`https://engine-telegram-sos-expat.life-expat.com/storage/${r.thumbnail_path}`}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {r.file_path ? <Image className="w-5 h-5 text-gray-400" /> : <FileText className="w-5 h-5 text-gray-400" />}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {r.name?.fr || r.name?.en || '(sans nom)'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.download_count} DL / {r.copy_count} copies
                  </p>
                </div>
              </div>

              {/* Roles */}
              <div className="flex flex-wrap gap-1">
                {r.target_roles.map((role) => (
                  <span
                    key={role}
                    className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {role}
                  </span>
                ))}
              </div>

              {/* Category */}
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {ALL_CATEGORIES.find((c) => c.value === r.category)?.label || r.category}
              </span>

              {/* Type */}
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded w-fit">
                {r.type}
              </span>

              {/* Active */}
              <div>
                {r.is_active ? (
                  <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">Active</span>
                ) : (
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-full">Inactive</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(r)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => deleteResource(r.id)}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Editor Modal ── */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className={`${UI.card} w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editing.isNew ? 'Nouvelle ressource' : 'Modifier la ressource'}
                </h2>
                <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Roles cibles *
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map((r) => {
                    const isSelected = editing.data.target_roles?.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => toggleRole(r.value)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? (ROLE_COLORS[r.value] || 'bg-blue-100 text-blue-700') + ' ring-2 ring-offset-1 ring-blue-400'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categorie *</label>
                  <select
                    value={editing.data.category || ''}
                    onChange={(e) => updateEditField('category', e.target.value)}
                    className={UI.select}
                  >
                    {Object.entries(
                      ALL_CATEGORIES.reduce<Record<string, typeof ALL_CATEGORIES>>((acc, c) => {
                        (acc[c.group] ||= []).push(c);
                        return acc;
                      }, {}),
                    ).map(([group, cats]) => (
                      <optgroup key={group} label={group}>
                        {cats.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                  <select
                    value={editing.data.type || ''}
                    onChange={(e) => updateEditField('type', e.target.value)}
                    className={UI.select}
                  >
                    {ALL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language Tabs */}
              <div>
                <div className="flex gap-1 border-b border-gray-200 dark:border-white/10 mb-4 overflow-x-auto">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setActiveLangTab(l.code)}
                      className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                        activeLangTab === l.code
                          ? 'border-red-500 text-red-600 font-medium'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {l.label}
                      {(l.code === 'fr' || l.code === 'en') && <span className="text-red-400 ml-0.5">*</span>}
                    </button>
                  ))}
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nom ({activeLangTab.toUpperCase()})
                    {(activeLangTab === 'fr' || activeLangTab === 'en') && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    value={((editing.data.name as Record<string, string>) || {})[activeLangTab] || ''}
                    onChange={(e) => updateTranslation('name', activeLangTab, e.target.value)}
                    className={UI.input}
                    placeholder={`Nom en ${activeLangTab.toUpperCase()}`}
                  />
                </div>

                {/* Description */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description ({activeLangTab.toUpperCase()})
                  </label>
                  <input
                    type="text"
                    value={((editing.data.description as Record<string, string>) || {})[activeLangTab] || ''}
                    onChange={(e) => updateTranslation('description', activeLangTab, e.target.value)}
                    className={UI.input}
                    placeholder={`Description en ${activeLangTab.toUpperCase()}`}
                  />
                </div>

                {/* Content (for text/article/template types) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contenu ({activeLangTab.toUpperCase()})
                  </label>
                  <textarea
                    value={((editing.data.content as Record<string, string>) || {})[activeLangTab] || ''}
                    onChange={(e) => updateTranslation('content', activeLangTab, e.target.value)}
                    className={`${UI.input} min-h-[120px]`}
                    placeholder={`Contenu en ${activeLangTab.toUpperCase()} (pour textes, articles, templates)`}
                    rows={5}
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fichier</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2 text-sm`}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Upload...' : 'Choisir fichier'}
                  </button>
                  {editing.data.file_path && (
                    <span className="text-xs text-green-600 truncate max-w-[300px]">
                      {editing.data.file_path}
                    </span>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordre</label>
                  <input
                    type="number"
                    value={editing.data.sort_order || 0}
                    onChange={(e) => updateEditField('sort_order', parseInt(e.target.value) || 0)}
                    className={UI.input}
                    min={0}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.data.is_active !== false}
                      onChange={(e) => updateEditField('is_active', e.target.checked)}
                      className="rounded text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                </div>
              </div>

              {/* Placeholders (comma-separated) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Placeholders (separes par des virgules)
                </label>
                <input
                  type="text"
                  value={(editing.data.placeholders || []).join(', ')}
                  onChange={(e) => updateEditField(
                    'placeholders',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  )}
                  className={UI.input}
                  placeholder="{{AFFILIATE_LINK}}, {{GROUP_NAME}}, ..."
                />
              </div>

              {/* Save */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <button onClick={() => setEditing(null)} className={`${UI.button.secondary} px-6 py-2.5`}>
                  Annuler
                </button>
                <button
                  onClick={saveResource}
                  disabled={saving}
                  className={`${UI.button.primary} px-6 py-2.5 flex items-center gap-2`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing.isNew ? 'Creer' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMarketingResources;
