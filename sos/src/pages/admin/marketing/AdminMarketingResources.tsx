/**
 * AdminMarketingResources — Unified admin page for all marketing resources
 *
 * Replaces: AdminChattersResources, AdminInfluencersResources,
 *           AdminBloggersResources, AdminGroupAdminsResources, AdminPressResources
 *
 * All CRUD goes through the Laravel engine API.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  adminGetResources,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  adminUploadFile,
  adminBulkAction,
  adminGetStats,
  // adminReorder — available but not yet used in UI
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
  Copy,
  Search,
  Monitor,
  Info,
  ChevronRight,
  Sparkles,
  Download,
  LayoutGrid,
  List,
  Users,
  Globe,
  Megaphone,
  Newspaper,
  MessageSquare,
  Palette,
  Star,
  Video,
  FileCode,
} from 'lucide-react';

// ── Role definitions with rich metadata ──

interface RoleInfo {
  value: MarketingRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  categories: { value: MarketingCategory; label: string; description: string }[];
}

const ROLES: RoleInfo[] = [
  {
    value: 'chatter',
    label: 'Chatters',
    description: 'Agents conversationnels sur les reseaux',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    categories: [
      { value: 'sos_expat', label: 'SOS-Expat', description: 'Logos, bannieres et visuels de la marque' },
      { value: 'promotional', label: 'Promotionnel', description: 'Textes et visuels pour la promotion' },
      { value: 'templates', label: 'Scripts & Templates', description: 'Scripts de conversation, messages types' },
    ],
  },
  {
    value: 'captain',
    label: 'Capitaines',
    description: 'Chefs d\'equipe chatters + recrutement',
    icon: <Star className="w-4 h-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    categories: [
      { value: 'sos_expat', label: 'SOS-Expat', description: 'Logos, bannieres et visuels de la marque' },
      { value: 'promotional', label: 'Promotionnel', description: 'Textes et visuels pour la promotion' },
      { value: 'templates', label: 'Scripts & Templates', description: 'Scripts de conversation, messages types' },
      { value: 'recruitment', label: 'Recrutement', description: 'Ressources pour recruter de nouveaux chatters' },
    ],
  },
  {
    value: 'influencer',
    label: 'Influenceurs',
    description: 'Createurs de contenu sur les reseaux sociaux',
    icon: <Megaphone className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500',
    categories: [
      { value: 'sos_expat', label: 'SOS-Expat', description: 'Logos, bannieres et visuels de la marque' },
      { value: 'social_media', label: 'Reseaux sociaux', description: 'Posts, stories, reels prets a publier' },
      { value: 'promotional', label: 'Promotionnel', description: 'Textes et visuels promotionnels' },
    ],
  },
  {
    value: 'blogger',
    label: 'Blogueurs',
    description: 'Redacteurs web et proprietaires de blogs',
    icon: <FileCode className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    categories: [
      { value: 'sos_expat', label: 'SOS-Expat', description: 'Logos, bannieres et visuels de la marque' },
      { value: 'seo', label: 'SEO', description: 'Mots-cles, meta descriptions, guides SEO' },
      { value: 'templates', label: 'Templates', description: 'Templates d\'articles, structures recommandees' },
      { value: 'promotional', label: 'Promotionnel', description: 'Widgets, bannieres a integrer' },
    ],
  },
  {
    value: 'group_admin',
    label: 'Admins Groupes',
    description: 'Administrateurs de communautes Facebook/WhatsApp',
    icon: <Users className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    categories: [
      { value: 'pinned_posts', label: 'Posts epingles', description: 'Annonces a epingler dans les groupes' },
      { value: 'cover_banners', label: 'Bannieres couverture', description: 'Photos de couverture pour les groupes' },
      { value: 'post_images', label: 'Images posts', description: 'Images pour publications regulieres' },
      { value: 'story_images', label: 'Images stories', description: 'Format story/reel vertical' },
      { value: 'badges', label: 'Badges', description: 'Badges et stickers partenaires' },
      { value: 'welcome_messages', label: 'Messages bienvenue', description: 'Messages d\'accueil pour les nouveaux membres' },
    ],
  },
  {
    value: 'partner',
    label: 'Partenaires',
    description: 'Partenaires commerciaux et integrateurs',
    icon: <Globe className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    categories: [
      { value: 'sos_expat', label: 'SOS-Expat', description: 'Logos, bannieres et visuels de la marque' },
      { value: 'partner_kit', label: 'Kit Partenaire', description: 'Kit d\'integration, assets de marque' },
    ],
  },
  {
    value: 'press',
    label: 'Presse',
    description: 'Journalistes, medias et relations presse',
    icon: <Newspaper className="w-4 h-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-600',
    categories: [
      { value: 'press_logos', label: 'Identite visuelle', description: 'Logos HD, vectoriels (SVG, EPS, PNG), variantes couleur/monochrome' },
      { value: 'press_brand_guidelines', label: 'Charte graphique', description: 'Guidelines de marque, couleurs, typographies, regles d\'usage' },
      { value: 'press_kit', label: 'Dossier de presse', description: 'Kit media complet, one-pager, fiches entreprise' },
      { value: 'press_releases', label: 'Communiques', description: 'Communiques de presse prets a publier' },
      { value: 'press_spokesperson', label: 'Porte-parole & Bios', description: 'Biographies dirigeants, photos portraits HD, citations autorisees' },
      { value: 'press_photos', label: 'Banque d\'images', description: 'Photos equipe, evenements, produit en haute resolution' },
      { value: 'press_b_roll', label: 'B-Roll & Videos', description: 'Footage video, animations, spots TV/web prets a diffuser' },
      { value: 'press_data', label: 'Chiffres cles', description: 'Infographies, rapports d\'impact, donnees marche' },
      { value: 'press_fact_sheets', label: 'Fiches techniques', description: 'FAQ presse, fiches produit, comparatifs, timeline entreprise' },
    ],
  },
];

const ALL_TYPES: { value: MarketingResourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'logo', label: 'Logo', icon: <Palette className="w-4 h-4" /> },
  { value: 'image', label: 'Image', icon: <Image className="w-4 h-4" /> },
  { value: 'banner', label: 'Banniere', icon: <Image className="w-4 h-4" /> },
  { value: 'text', label: 'Texte', icon: <FileText className="w-4 h-4" /> },
  { value: 'template', label: 'Template', icon: <Copy className="w-4 h-4" /> },
  { value: 'article', label: 'Article', icon: <FileText className="w-4 h-4" /> },
  { value: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { value: 'document', label: 'Document', icon: <FileText className="w-4 h-4" /> },
  { value: 'widget', label: 'Widget', icon: <FileCode className="w-4 h-4" /> },
];

const LANGUAGES = [
  { code: 'fr', label: 'FR', full: 'Francais' },
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'es', label: 'ES', full: 'Espanol' },
  { code: 'pt', label: 'PT', full: 'Portugues' },
  { code: 'ar', label: 'AR', full: 'العربية' },
  { code: 'de', label: 'DE', full: 'Deutsch' },
  { code: 'zh', label: 'ZH', full: '中文' },
  { code: 'ru', label: 'RU', full: 'Русский' },
  { code: 'hi', label: 'HI', full: 'हिन्दी' },
];

// ── Placeholders for affiliate roles ──
const AFFILIATE_PLACEHOLDERS = [
  { value: '{{AFFILIATE_LINK}}', label: 'Lien client', example: 'https://sos-expat.com/?ref=ABC123', description: 'Le lien unique de l\'affilie pour les clients' },
  { value: '{{RECRUITMENT_LINK}}', label: 'Lien recrutement', example: 'https://sos-expat.com/chatter/register?ref=XYZ', description: 'Le lien pour recruter de nouveaux affilies' },
  { value: '{{PROVIDER_LINK}}', label: 'Lien prestataire', example: 'https://sos-expat.com/register-provider?ref=ABC123', description: 'Le lien pour inscrire un prestataire' },
  { value: '{{AFFILIATE_CODE}}', label: 'Code affilie', example: 'ABC123', description: 'Le code unique de l\'affilie' },
  { value: '{{GROUP_NAME}}', label: 'Nom du groupe', example: 'Expats France', description: 'Le nom du groupe de l\'admin (GroupAdmin)' },
  { value: '{{ADMIN_NAME}}', label: 'Nom complet', example: 'Jean Dupont', description: 'Le nom complet de l\'affilie' },
  { value: '{{ADMIN_FIRST_NAME}}', label: 'Prenom', example: 'Jean', description: 'Le prenom de l\'affilie' },
  { value: '{{DISCOUNT_AMOUNT}}', label: 'Reduction $', example: '5$', description: 'Le montant de la reduction client' },
  { value: '{{DISCOUNT_PERCENT}}', label: 'Reduction %', example: '5%', description: 'Le pourcentage de reduction' },
];

// ── Placeholders for press resources — company/press-specific variables ──
const PRESS_PLACEHOLDERS = [
  { value: '{{COMPANY_NAME}}', label: 'Nom entreprise', example: 'SOS-Expat', description: 'Nom officiel de l\'entreprise' },
  { value: '{{COMPANY_TAGLINE}}', label: 'Slogan', example: 'L\'assistance juridique des expatries, partout dans le monde', description: 'Tagline officielle de la marque' },
  { value: '{{WEBSITE_URL}}', label: 'Site web', example: 'https://sos-expat.com', description: 'URL officielle du site' },
  { value: '{{FOUNDED_YEAR}}', label: 'Annee de creation', example: '2024', description: 'Annee de fondation de l\'entreprise' },
  { value: '{{CEO_NAME}}', label: 'Nom du CEO', example: 'William Music', description: 'Nom complet du dirigeant principal' },
  { value: '{{CEO_TITLE}}', label: 'Titre du CEO', example: 'Fondateur & CEO', description: 'Titre officiel du dirigeant' },
  { value: '{{PRESS_CONTACT_EMAIL}}', label: 'Email presse', example: 'press@sos-expat.com', description: 'Adresse email du contact presse' },
  { value: '{{PRESS_CONTACT_PHONE}}', label: 'Tel presse', example: '+33 1 23 45 67 89', description: 'Telephone du contact presse' },
  { value: '{{PRESS_CONTACT_NAME}}', label: 'Responsable presse', example: 'Service Communication', description: 'Nom du responsable relations presse' },
  { value: '{{COUNTRIES_COUNT}}', label: 'Nombre de pays', example: '45+', description: 'Nombre de pays couverts par le service' },
  { value: '{{LANGUAGES_COUNT}}', label: 'Nombre de langues', example: '9', description: 'Nombre de langues supportees' },
  { value: '{{PROVIDERS_COUNT}}', label: 'Nombre de prestataires', example: '500+', description: 'Nombre de prestataires actifs sur la plateforme' },
  { value: '{{USERS_COUNT}}', label: 'Nombre d\'utilisateurs', example: '10 000+', description: 'Nombre total d\'utilisateurs inscrits' },
  { value: '{{HEADQUARTERS}}', label: 'Siege social', example: 'Paris, France', description: 'Localisation du siege social' },
  { value: '{{CURRENT_DATE}}', label: 'Date du jour', example: '15 mars 2026', description: 'Date actuelle (pour communiques)' },
  { value: '{{EMBARGO_DATE}}', label: 'Date d\'embargo', example: '20 mars 2026, 08h00 CET', description: 'Date de levee d\'embargo (si applicable)' },
  { value: '{{BOILERPLATE}}', label: 'Boilerplate', example: 'SOS-Expat est la premiere plateforme...', description: 'Paragraphe "A propos" standard pour fin de communique' },
];

// Get the right placeholders based on target roles
const getPlaceholdersForRoles = (targetRoles: MarketingRole[]): typeof AFFILIATE_PLACEHOLDERS => {
  const isPressOnly = targetRoles.length === 1 && targetRoles[0] === 'press';
  const includesPress = targetRoles.includes('press');
  const includesAffiliate = targetRoles.some((r) => r !== 'press');

  if (isPressOnly) return PRESS_PLACEHOLDERS;
  if (includesPress && includesAffiliate) return [...PRESS_PLACEHOLDERS, ...AFFILIATE_PLACEHOLDERS];
  return AFFILIATE_PLACEHOLDERS;
};

// Unified placeholder list for preview (needs all)
const ALL_PLACEHOLDERS = [...PRESS_PLACEHOLDERS, ...AFFILIATE_PLACEHOLDERS];

const ENGINE_URL = 'https://engine-telegram-sos-expat.life-expat.com/storage';

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

  // Navigation
  const [activeRole, setActiveRole] = useState<MarketingRole>(initialRole || 'chatter');
  const [activeCategory, setActiveCategory] = useState<MarketingCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Editor
  const [editing, setEditing] = useState<{
    isNew: boolean;
    data: Partial<CreateResourcePayload> & { id?: string };
  } | null>(null);
  const [activeLangTab, setActiveLangTab] = useState('fr');
  const [editorStep, setEditorStep] = useState<1 | 2 | 3>(1);

  // Selection for bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Stats
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Preview
  const [previewResource, setPreviewResource] = useState<MarketingResourceAdmin | null>(null);
  const [previewLang, setPreviewLang] = useState('fr');

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

  // Active role info
  const currentRole = ROLES.find((r) => r.value === activeRole) || ROLES[0];

  // ── Fetch ──

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGetResources({
        role: activeRole,
        category: activeCategory !== 'all' ? activeCategory : undefined,
        search: debouncedSearch || undefined,
      });
      setResources(result.resources);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [activeRole, activeCategory, debouncedSearch]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Reset category when role changes
  useEffect(() => {
    setActiveCategory('all');
    setSelected(new Set());
  }, [activeRole]);

  // ── Stats ──

  const loadStats = async () => {
    if (showStats && stats) { setShowStats(false); return; }
    setStatsLoading(true);
    try {
      const result = await adminGetStats();
      setStats(result);
      setShowStats(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erreur stats');
    } finally {
      setStatsLoading(false);
    }
  };

  // ── CRUD ──

  const startCreate = (presetCategory?: MarketingCategory) => {
    setEditing({
      isNew: true,
      data: {
        target_roles: [activeRole],
        category: presetCategory || currentRole.categories[0]?.value || 'sos_expat',
        type: 'image',
        name: { fr: '', en: '' },
        description: {},
        content: {},
        is_active: true,
        sort_order: 0,
      },
    });
    setActiveLangTab('fr');
    setEditorStep(1);
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
    setEditorStep(1);
  };

  const saveResource = async () => {
    if (!editing) return;
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
        showSuccessMsg('Ressource creee avec succes !');
      } else {
        const { id, ...payload } = editing.data;
        await adminUpdateResource(id!, payload);
        showSuccessMsg('Ressource mise a jour !');
      }
      setEditing(null);
      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (id: string) => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await adminDeleteResource(id);
      showSuccessMsg('Ressource supprimee');
      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erreur de suppression');
    }
  };

  const toggleActive = async (r: MarketingResourceAdmin) => {
    try {
      await adminUpdateResource(r.id, { is_active: !r.is_active });
      setResources((prev) =>
        prev.map((res) => res.id === r.id ? { ...res, is_active: !res.is_active } : res),
      );
      showSuccessMsg(r.is_active ? 'Ressource desactivee' : 'Ressource activee');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erreur');
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
      showSuccessMsg('Fichier uploade !');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erreur upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Bulk ──

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleBulk = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selected.size === 0) return;
    if (action === 'delete' && !confirm(`Supprimer ${selected.size} ressource(s) ?`)) return;
    try {
      const result = await adminBulkAction({ ids: Array.from(selected), action });
      showSuccessMsg(`${result.affected} ressource(s) ${action === 'delete' ? 'supprimee(s)' : 'mise(s) a jour'}`);
      setSelected(new Set());
      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erreur action groupee');
    }
  };

  // ── Helpers ──

  const showSuccessMsg = (msg: string) => {
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
    if (idx >= 0) { if (roles.length > 1) roles.splice(idx, 1); } else { roles.push(role); }
    updateEditField('target_roles', roles);
  };

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Render ──

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ════════════════ HEADER ══════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              Ressources Marketing
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {activeRole === 'press'
                ? 'Gerez les ressources de votre salle de presse — logos, communiques, dossiers media'
                : 'Gerez le contenu que vos affilies telechargeront et partageront'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadStats} className="px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center gap-2">
              {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Stats
            </button>
            <button onClick={fetchResources} className="p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => startCreate()}
              className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle ressource</span>
            </button>
          </div>
        </div>

        {/* ══════════════════ ALERTS ══════════════════ */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* ══════════════════ STATS ══════════════════ */}
        {showStats && stats && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-500" /> Vue d'ensemble
              </h2>
              <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.total_resources}</p>
                <p className="text-xs text-blue-500 mt-1">Total</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.active_resources}</p>
                <p className="text-xs text-green-500 mt-1">Actives</p>
              </div>
              {stats.count_by_category.slice(0, 2).map((c) => (
                <div key={c.category} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{c.count}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.category}</p>
                </div>
              ))}
            </div>
            {stats.top_downloads.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Top telechargements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stats.top_downloads.slice(0, 4).map((r) => (
                    <div key={r.id} className="flex justify-between items-center bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{r.name?.fr || r.name?.en || '—'}</span>
                      <span className="text-xs text-gray-400 ml-2 flex items-center gap-1"><Download className="w-3 h-3" />{r.download_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ ROLE TABS ══════════════════ */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-2">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {ROLES.map((role) => {
              const isActive = activeRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setActiveRole(role.value)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                    isActive
                      ? `${role.bgColor} text-white font-medium shadow-lg`
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  {role.icon}
                  <span className="hidden sm:inline">{role.label}</span>
                  <span className="sm:hidden">{role.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════ ROLE DESCRIPTION + CATEGORIES ══════════════════ */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {currentRole.icon}
                {currentRole.label}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentRole.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-9 pr-3 py-2 w-48 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                />
              </div>
              {/* View mode */}
              <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-white/20 shadow-sm' : ''}`}
                >
                  <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-white/20 shadow-sm' : ''}`}
                >
                  <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              Tout ({resources.length})
            </button>
            {currentRole.categories.map((cat) => {
              const count = resources.filter((r) => r.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all group relative ${
                    activeCategory === cat.value
                      ? `${currentRole.bgColor} text-white`
                      : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                  title={cat.description}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════ BULK ACTIONS ══════════════════ */}
        {selected.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selected.size} selectionne(s)
            </span>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => handleBulk('activate')} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg flex items-center gap-1">
                <Eye className="w-3 h-3" /> Activer
              </button>
              <button onClick={() => handleBulk('deactivate')} className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded-lg flex items-center gap-1">
                <EyeOff className="w-3 h-3" /> Desactiver
              </button>
              <button onClick={() => handleBulk('delete')} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Supprimer
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-blue-500 hover:text-blue-700 ml-2">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ RESOURCES ══════════════════ */}
        {loading && resources.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          /* ── Empty State ── */
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {activeRole === 'press'
                ? 'Votre salle de presse est vide'
                : `Aucune ressource pour les ${currentRole.label}`
              }
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              {activeRole === 'press'
                ? 'Ajoutez logos, communiques, dossiers de presse et medias que les journalistes pourront telecharger librement.'
                : `Commencez par ajouter du contenu que vos ${currentRole.label.toLowerCase()} pourront telecharger et utiliser pour promouvoir SOS-Expat.`
              }
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {currentRole.categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => startCreate(cat.value)}
                  className="px-4 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-sm hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
                >
                  <span className="font-medium text-gray-900 dark:text-white group-hover:text-red-600">{cat.label}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => startCreate()}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all flex items-center gap-2 mx-auto shadow-lg shadow-red-500/20"
            >
              <Plus className="w-5 h-5" />
              Creer la premiere ressource
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Grid View ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resources.map((r) => (
              <div
                key={r.id}
                className={`bg-white dark:bg-white/5 border rounded-2xl overflow-hidden hover:shadow-lg transition-all group ${
                  selected.has(r.id) ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200 dark:border-white/10'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-36 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 flex items-center justify-center">
                  {r.thumbnail_path ? (
                    <img
                      src={`${ENGINE_URL}/${r.thumbnail_path}`}
                      alt=""
                      className="w-full h-full object-contain p-3"
                    />
                  ) : r.file_path ? (
                    <Image className="w-10 h-10 text-gray-300" />
                  ) : (
                    <FileText className="w-10 h-10 text-gray-300" />
                  )}
                  {/* Select checkbox */}
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100"
                    />
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        r.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                      }`}
                    >
                      {r.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {/* Type badge */}
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 bg-black/60 text-white rounded-md text-[10px] font-medium backdrop-blur-sm">
                      {r.type}
                    </span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {r.name?.fr || r.name?.en || '(sans nom)'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {r.description?.fr || r.description?.en || ''}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{r.download_count}</span>
                      <span className="flex items-center gap-0.5"><Copy className="w-3 h-3" />{r.copy_count}</span>
                      {r.file_format && <span className="uppercase">{r.file_format}</span>}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setPreviewResource(r); setPreviewLang('fr'); }} className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Apercu">
                        <Monitor className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                      <button onClick={() => startEdit(r)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded" title="Modifier">
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => deleteResource(r.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Add card */}
            <button
              onClick={() => startCreate()}
              className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl h-[240px] flex flex-col items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-all group"
            >
              <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Ajouter</span>
            </button>
          </div>
        ) : (
          /* ── List View ── */
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {resources.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-4 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                    selected.has(r.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500 flex-shrink-0"
                  />
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.thumbnail_path ? (
                      <img src={`${ENGINE_URL}/${r.thumbnail_path}`} alt="" className="w-full h-full object-contain" />
                    ) : r.file_path ? (
                      <Image className="w-5 h-5 text-gray-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {r.name?.fr || r.name?.en || '(sans nom)'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-500 rounded">{r.type}</span>
                      <span className="text-[10px] text-gray-400">{r.download_count} DL / {r.copy_count} copies</span>
                      {r.file_format && <span className="text-[10px] text-gray-400 uppercase">{r.file_format} {formatFileSize(r.file_size)}</span>}
                    </div>
                  </div>
                  {/* Status */}
                  <button
                    onClick={() => toggleActive(r)}
                    className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {r.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {r.is_active ? 'Active' : 'Inactive'}
                  </button>
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setPreviewResource(r); setPreviewLang('fr'); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Monitor className="w-4 h-4 text-blue-500" /></button>
                    <button onClick={() => startEdit(r)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                    <button onClick={() => deleteResource(r.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════ EDITOR MODAL ══════════════════ */}
        {editing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
              {/* Editor header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editing.isNew ? 'Nouvelle ressource' : 'Modifier la ressource'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editorStep === 1 && 'Cibles et categorie'}
                    {editorStep === 2 && 'Contenu et traductions'}
                    {editorStep === 3 && 'Fichier et options'}
                  </p>
                </div>
                <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Step indicators */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-white/5 flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <button
                    key={step}
                    onClick={() => setEditorStep(step as 1 | 2 | 3)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      editorStep === step
                        ? 'bg-red-500 text-white shadow-sm'
                        : editorStep > step
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-white dark:bg-white/10 text-gray-500 border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {editorStep > step ? <Check className="w-3 h-3" /> : <span>{step}</span>}
                    {step === 1 && 'Cibles'}
                    {step === 2 && 'Contenu'}
                    {step === 3 && 'Fichier & Options'}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-5">
                {/* ── STEP 1: Roles, Category, Type ── */}
                {editorStep === 1 && (
                  <>
                    {/* Target Roles */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Qui verra cette ressource ?
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Selectionnez un ou plusieurs roles. La ressource apparaitra dans le dashboard de chaque role selectionne.
                        {activeRole === 'press' && (
                          <span className="block mt-1 text-indigo-500 font-medium">
                            Les ressources Presse sont publiques et telechargeable par les journalistes sans authentification.
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ROLES.map((role) => {
                          const isSelected = editing.data.target_roles?.includes(role.value);
                          return (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => toggleRole(role.value)}
                              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 bg-white dark:bg-white/5'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? role.bgColor + ' text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                {role.icon}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{role.label}</p>
                                <p className="text-[10px] text-gray-400 leading-tight">{role.description}</p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category + Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          Categorie
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Dans quel onglet apparaitra cette ressource ?</p>
                        <select
                          value={editing.data.category || ''}
                          onChange={(e) => updateEditField('category', e.target.value)}
                          className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white text-sm"
                        >
                          {/* Show categories for selected roles */}
                          {(() => {
                            const selectedRoles = editing.data.target_roles || [];
                            const cats = new Map<string, string>();
                            ROLES.filter((r) => selectedRoles.includes(r.value))
                              .forEach((r) => r.categories.forEach((c) => cats.set(c.value, c.label)));
                            if (cats.size === 0) {
                              // Fallback: show all categories
                              ROLES.forEach((r) => r.categories.forEach((c) => cats.set(c.value, c.label)));
                            }
                            return Array.from(cats.entries()).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ));
                          })()}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          Type de contenu
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Quel format de ressource ?</p>
                        <select
                          value={editing.data.type || ''}
                          onChange={(e) => updateEditField('type', e.target.value)}
                          className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white text-sm"
                        >
                          {ALL_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* ── STEP 2: Content & Translations ── */}
                {editorStep === 2 && (
                  <>
                    {/* Language tabs */}
                    <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 overflow-x-auto">
                      {LANGUAGES.map((l) => {
                        const hasContent = ((editing.data.name as Record<string, string>) || {})[l.code]?.trim();
                        return (
                          <button
                            key={l.code}
                            onClick={() => setActiveLangTab(l.code)}
                            className={`relative px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                              activeLangTab === l.code
                                ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {l.label}
                            {(l.code === 'fr' || l.code === 'en') && <span className="text-red-400 ml-0.5">*</span>}
                            {hasContent && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Nom ({LANGUAGES.find((l) => l.code === activeLangTab)?.full})
                        {(activeLangTab === 'fr' || activeLangTab === 'en') && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={((editing.data.name as Record<string, string>) || {})[activeLangTab] || ''}
                        onChange={(e) => updateTranslation('name', activeLangTab, e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white text-sm"
                        placeholder="Ex: Logo SOS-Expat HD, Post Instagram promo..."
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={((editing.data.description as Record<string, string>) || {})[activeLangTab] || ''}
                        onChange={(e) => updateTranslation('description', activeLangTab, e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white text-sm"
                        placeholder={
                          (editing.data.target_roles || []).includes('press') && !(editing.data.target_roles || []).some((r: MarketingRole) => r !== 'press')
                            ? 'Ex: Logo officiel SVG transparent, communique lancement Q1 2026...'
                            : 'Courte description pour aider l\'affilie a comprendre cette ressource'
                        }
                      />
                    </div>

                    {/* Content */}
                    <div>
                      {(() => {
                        const targetRoles = editing.data.target_roles || [];
                        const isPressContext = targetRoles.includes('press') && !targetRoles.some((r: MarketingRole) => r !== 'press');
                        return (
                          <>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                              {isPressContext ? 'Contenu presse' : 'Contenu copiable'}
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                              {isPressContext
                                ? 'Texte du communique ou de la fiche. Les variables presse seront remplacees automatiquement.'
                                : 'Texte que l\'affilie pourra copier en un clic. Utilisez les variables ci-dessous pour personnaliser.'
                              }
                            </p>
                          </>
                        );
                      })()}
                      <textarea
                        value={((editing.data.content as Record<string, string>) || {})[activeLangTab] || ''}
                        onChange={(e) => updateTranslation('content', activeLangTab, e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white text-sm min-h-[120px] font-mono"
                        rows={5}
                        placeholder={
                          (editing.data.target_roles || []).includes('press') && !(editing.data.target_roles || []).some((r: MarketingRole) => r !== 'press')
                            ? "COMMUNIQUE DE PRESSE\n\n{{COMPANY_NAME}} annonce...\n\nA propos de {{COMPANY_NAME}}\n{{BOILERPLATE}}\n\nContact presse :\n{{PRESS_CONTACT_NAME}}\n{{PRESS_CONTACT_EMAIL}} | {{PRESS_CONTACT_PHONE}}"
                            : "Bonjour ! Decouvrez SOS-Expat, le service d'assistance juridique pour les expatries.\n\nInscrivez-vous ici : {{AFFILIATE_LINK}}"
                        }
                      />
                    </div>

                    {/* Placeholders */}
                    <div>
                      {(() => {
                        const targetRoles = editing.data.target_roles || [];
                        const isPressContext = targetRoles.includes('press');
                        return (
                          <>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                              {isPressContext ? 'Variables presse' : 'Variables dynamiques'}
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                              {isPressContext
                                ? 'Variables d\'entreprise pour communiques et documents presse. Remplacees automatiquement lors du telechargement.'
                                : 'Activez les variables utilisees dans le contenu. Elles seront remplacees par les vraies valeurs de chaque affilie.'
                              }
                            </p>
                          </>
                        );
                      })()}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {getPlaceholdersForRoles(editing.data.target_roles || []).map((ph) => {
                          const isActive = (editing.data.placeholders || []).includes(ph.value);
                          return (
                            <button
                              key={ph.value}
                              type="button"
                              onClick={() => {
                                const current = editing.data.placeholders || [];
                                const updated = isActive ? current.filter((p) => p !== ph.value) : [...current, ph.value];
                                updateEditField('placeholders', updated);
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                isActive
                                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${isActive ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-white/10'}`}>
                                {isActive && <Check className="w-3 h-3" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-900 dark:text-white">{ph.label}</p>
                                <code className="text-[10px] text-gray-500">{ph.value}</code>
                                <p className="text-[10px] text-gray-400 mt-0.5">{ph.description}</p>
                                <p className="text-[10px] text-red-500 mt-0.5">Ex: {ph.example}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── STEP 3: File & Options ── */}
                {editorStep === 3 && (
                  <>
                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Fichier
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        {(editing.data.target_roles || []).includes('press') && !(editing.data.target_roles || []).some((r: MarketingRole) => r !== 'press')
                          ? 'Logo vectoriel, photo HD, dossier PDF, video B-Roll... Les journalistes attendent des fichiers haute qualite.'
                          : 'Image, PDF, video ou document que l\'affilie pourra telecharger'
                        }
                      </p>
                      <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                      <div
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all"
                      >
                        {uploading ? (
                          <Loader2 className="w-8 h-8 mx-auto mb-2 text-red-500 animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        )}
                        {editing.data.file_path ? (
                          <div>
                            <p className="text-sm text-green-600 font-medium">Fichier uploade</p>
                            <p className="text-xs text-gray-400 mt-1 truncate max-w-xs mx-auto">{editing.data.file_path}</p>
                            {editing.data.file_format && (
                              <p className="text-xs text-gray-500 mt-1">
                                {editing.data.file_format.toUpperCase()} — {formatFileSize(editing.data.file_size)}
                              </p>
                            )}
                            <p className="text-xs text-red-500 mt-2">Cliquer pour remplacer</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Cliquer pour choisir un fichier</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, PDF, MP4, DOC, ZIP — Max 50 MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail preview */}
                    {editing.data.thumbnail_path && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">Apercu miniature</label>
                        <img
                          src={`${ENGINE_URL}/${editing.data.thumbnail_path}`}
                          alt="Thumbnail"
                          className="h-24 rounded-xl object-contain bg-gray-50 dark:bg-white/5 p-2"
                        />
                      </div>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">Ordre d'affichage</label>
                        <p className="text-xs text-gray-500 mb-2">Plus petit = affiche en premier</p>
                        <input
                          type="number"
                          value={editing.data.sort_order || 0}
                          onChange={(e) => updateEditField('sort_order', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white text-sm"
                          min={0}
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full">
                          <input
                            type="checkbox"
                            checked={editing.data.is_active !== false}
                            onChange={(e) => updateEditField('is_active', e.target.checked)}
                            className="w-4 h-4 rounded text-red-500 focus:ring-red-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Active</span>
                            <p className="text-[10px] text-gray-400">
                              {(editing.data.target_roles || []).includes('press') && !(editing.data.target_roles || []).some((r: MarketingRole) => r !== 'press')
                                ? 'Visible dans la salle de presse publique'
                                : 'Visible par les affilies'
                              }
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Editor footer */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {editorStep > 1 && (
                    <button onClick={() => setEditorStep((editorStep - 1) as 1 | 2 | 3)} className="px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-medium rounded-xl text-sm hover:bg-gray-200 transition-all">
                      Precedent
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm">
                    Annuler
                  </button>
                  {editorStep < 3 ? (
                    <button
                      onClick={() => setEditorStep((editorStep + 1) as 1 | 2 | 3)}
                      className="px-5 py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-all flex items-center gap-1"
                    >
                      Suivant <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={saveResource}
                      disabled={saving}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-red-500/20"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {editing.isNew ? 'Creer' : 'Enregistrer'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ PREVIEW MODAL ══════════════════ */}
        {previewResource && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setPreviewResource(null)}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  Apercu
                </h2>
                <button onClick={() => setPreviewResource(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Language selector */}
              <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
                {LANGUAGES.filter((l) => previewResource.name?.[l.code]?.trim()).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setPreviewLang(l.code)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      previewLang === l.code ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Roles + meta */}
              <div className="flex flex-wrap gap-1.5">
                {previewResource.target_roles.map((role) => {
                  const ri = ROLES.find((r) => r.value === role);
                  return (
                    <span key={role} className={`text-xs px-2 py-1 rounded-full ${ri ? ri.bgColor + ' text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {ri?.label || role}
                    </span>
                  );
                })}
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500">{previewResource.type}</span>
              </div>

              {/* Image */}
              {(previewResource.thumbnail_path || previewResource.file_path) && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 flex items-center justify-center">
                  <img
                    src={`${ENGINE_URL}/${previewResource.thumbnail_path || previewResource.file_path}`}
                    alt=""
                    className="max-h-48 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Nom</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {previewResource.name?.[previewLang] || previewResource.name?.fr || previewResource.name?.en || '(sans nom)'}
                </p>
              </div>

              {/* Description */}
              {previewResource.description?.[previewLang] && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{previewResource.description[previewLang]}</p>
                </div>
              )}

              {/* Content with placeholders replaced */}
              {previewResource.content?.[previewLang] && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Contenu (variables remplacees)</p>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-200 dark:border-white/10 font-mono">
                    {(() => {
                      let text = previewResource.content![previewLang] || '';
                      ALL_PLACEHOLDERS.forEach((ph) => {
                        text = text.split(ph.value).join(ph.example);
                      });
                      return text;
                    })()}
                  </div>
                  {(previewResource.placeholders || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {previewResource.placeholders!.map((ph) => {
                        const info = ALL_PLACEHOLDERS.find((p) => p.value === ph);
                        return (
                          <span key={ph} className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full">
                            {ph} = {info?.example || '...'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* File info */}
              {previewResource.file_path && (
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {previewResource.file_format && <span className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded uppercase">{previewResource.file_format}</span>}
                  <span>{formatFileSize(previewResource.file_size)}</span>
                  <span>{previewResource.download_count} DL</span>
                  <span>{previewResource.copy_count} copies</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/10">
                <span className={`text-xs px-2 py-1 rounded-full ${previewResource.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {previewResource.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPreviewResource(null); startEdit(previewResource); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-medium rounded-xl text-sm hover:bg-gray-200 flex items-center gap-1.5"
                  >
                    <Edit2 className="w-4 h-4" /> Modifier
                  </button>
                  <button onClick={() => setPreviewResource(null)} className="px-4 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-medium rounded-xl text-sm">
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMarketingResources;
