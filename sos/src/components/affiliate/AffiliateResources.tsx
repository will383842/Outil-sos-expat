/**
 * AffiliateResources — Unified resource component for all affiliate roles
 *
 * Usage:
 *   <AffiliateResources role="chatter" />
 *   <AffiliateResources role="influencer" />
 *   <AffiliateResources role="blogger" />
 *   <AffiliateResources role="group_admin" />
 *   <AffiliateResources role="partner" />
 *
 * Replaces: ChatterResources, InfluencerResources, BloggerResources, GroupAdminResources
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMarketingResources } from '@/hooks/useMarketingResources';
import type {
  MarketingRole,
  MarketingCategory,
  MarketingResource,
} from '@/types/marketingResources';
import {
  FolderOpen,
  Download,
  Copy,
  Image,
  FileText,
  Video,
  Loader2,
  CheckCircle,
  Search,
  Filter,
} from 'lucide-react';

// ── Role-specific category config ──

interface CategoryConfig {
  value: MarketingCategory;
  labelKey: string;
  defaultLabel: string;
  descriptionKey: string;
  defaultDescription: string;
  color: string;
}

const ROLE_CATEGORIES: Record<MarketingRole, CategoryConfig[]> = {
  chatter: [
    { value: 'sos_expat', labelKey: 'resources.cat.sosExpat', defaultLabel: 'SOS-Expat', descriptionKey: 'resources.cat.sosExpat.desc', defaultDescription: 'Logos, banners and visuals', color: 'indigo' },
    { value: 'promotional', labelKey: 'resources.cat.promotional', defaultLabel: 'Promotionnel', descriptionKey: 'resources.cat.promotional.desc', defaultDescription: 'Textes et visuels promotionnels', color: 'blue' },
    { value: 'templates', labelKey: 'resources.cat.templates', defaultLabel: 'Scripts & Templates', descriptionKey: 'resources.cat.templates.desc', defaultDescription: 'Scripts de conversation et messages types', color: 'green' },
  ],
  captain: [
    { value: 'sos_expat', labelKey: 'resources.cat.sosExpat', defaultLabel: 'SOS-Expat', descriptionKey: 'resources.cat.sosExpat.desc', defaultDescription: 'Logos, banners and visuals', color: 'indigo' },
    { value: 'promotional', labelKey: 'resources.cat.promotional', defaultLabel: 'Promotionnel', descriptionKey: 'resources.cat.promotional.desc', defaultDescription: 'Textes et visuels promotionnels', color: 'blue' },
    { value: 'templates', labelKey: 'resources.cat.templates', defaultLabel: 'Scripts & Templates', descriptionKey: 'resources.cat.templates.desc', defaultDescription: 'Scripts de conversation et messages types', color: 'green' },
    { value: 'recruitment', labelKey: 'resources.cat.recruitment', defaultLabel: 'Recrutement', descriptionKey: 'resources.cat.recruitment.desc', defaultDescription: 'Ressources pour recruter de nouveaux chatters', color: 'red' },
  ],
  influencer: [
    { value: 'sos_expat', labelKey: 'resources.cat.sosExpat', defaultLabel: 'SOS-Expat', descriptionKey: 'resources.cat.sosExpat.desc', defaultDescription: 'Logos, banners and visuals', color: 'indigo' },
    { value: 'social_media', labelKey: 'resources.cat.socialMedia', defaultLabel: 'Reseaux sociaux', descriptionKey: 'resources.cat.socialMedia.desc', defaultDescription: 'Posts, stories et reels prets a publier', color: 'purple' },
    { value: 'promotional', labelKey: 'resources.cat.promotional', defaultLabel: 'Promotionnel', descriptionKey: 'resources.cat.promotional.desc', defaultDescription: 'Textes et visuels promotionnels', color: 'blue' },
  ],
  blogger: [
    { value: 'sos_expat', labelKey: 'resources.cat.sosExpat', defaultLabel: 'SOS-Expat', descriptionKey: 'resources.cat.sosExpat.desc', defaultDescription: 'Logos, banners and visuals', color: 'indigo' },
    { value: 'seo', labelKey: 'resources.cat.seo', defaultLabel: 'SEO', descriptionKey: 'resources.cat.seo.desc', defaultDescription: 'Mots-cles, meta descriptions et guides SEO', color: 'green' },
    { value: 'templates', labelKey: 'resources.cat.templates', defaultLabel: 'Templates', descriptionKey: 'resources.cat.templates.desc', defaultDescription: "Templates d'articles et structures recommandees", color: 'blue' },
    { value: 'promotional', labelKey: 'resources.cat.promotional', defaultLabel: 'Promotionnel', descriptionKey: 'resources.cat.promotional.desc', defaultDescription: 'Widgets, bannieres et liens a integrer', color: 'purple' },
  ],
  group_admin: [
    { value: 'pinned_posts', labelKey: 'resources.cat.pinnedPosts', defaultLabel: 'Pinned Posts', descriptionKey: 'resources.cat.pinnedPosts.desc', defaultDescription: 'Posts to pin in your groups', color: 'red' },
    { value: 'cover_banners', labelKey: 'resources.cat.coverBanners', defaultLabel: 'Cover Banners', descriptionKey: 'resources.cat.coverBanners.desc', defaultDescription: 'Group cover banners', color: 'blue' },
    { value: 'post_images', labelKey: 'resources.cat.postImages', defaultLabel: 'Post Images', descriptionKey: 'resources.cat.postImages.desc', defaultDescription: 'Images for group posts', color: 'green' },
    { value: 'story_images', labelKey: 'resources.cat.storyImages', defaultLabel: 'Story Images', descriptionKey: 'resources.cat.storyImages.desc', defaultDescription: 'Story-format images', color: 'purple' },
    { value: 'badges', labelKey: 'resources.cat.badges', defaultLabel: 'Badges', descriptionKey: 'resources.cat.badges.desc', defaultDescription: 'Badge images', color: 'amber' },
    { value: 'welcome_messages', labelKey: 'resources.cat.welcomeMessages', defaultLabel: 'Welcome Messages', descriptionKey: 'resources.cat.welcomeMessages.desc', defaultDescription: 'Welcome messages for new members', color: 'teal' },
  ],
  partner: [
    { value: 'sos_expat', labelKey: 'resources.cat.sosExpat', defaultLabel: 'SOS-Expat', descriptionKey: 'resources.cat.sosExpat.desc', defaultDescription: 'Logos, banners and visuals', color: 'indigo' },
    { value: 'partner_kit', labelKey: 'resources.cat.partnerKit', defaultLabel: 'Partner Kit', descriptionKey: 'resources.cat.partnerKit.desc', defaultDescription: 'Partner integration kit and materials', color: 'amber' },
  ],
  press: [
    { value: 'press_logos', labelKey: 'resources.cat.pressLogos', defaultLabel: 'Logos', descriptionKey: 'resources.cat.pressLogos.desc', defaultDescription: 'HD logos, vector files, brand guidelines', color: 'indigo' },
    { value: 'press_releases', labelKey: 'resources.cat.pressReleases', defaultLabel: 'Press Releases', descriptionKey: 'resources.cat.pressReleases.desc', defaultDescription: 'Official press releases and announcements', color: 'blue' },
    { value: 'press_kit', labelKey: 'resources.cat.pressKit', defaultLabel: 'Press Kit', descriptionKey: 'resources.cat.pressKit.desc', defaultDescription: 'Media kit, fact sheets and company overview', color: 'green' },
    { value: 'press_photos', labelKey: 'resources.cat.pressPhotos', defaultLabel: 'Official Photos', descriptionKey: 'resources.cat.pressPhotos.desc', defaultDescription: 'Official photos, team portraits, event shots', color: 'purple' },
    { value: 'press_data', labelKey: 'resources.cat.pressData', defaultLabel: 'Data & Stats', descriptionKey: 'resources.cat.pressData.desc', defaultDescription: 'Key figures, statistics and infographics', color: 'amber' },
  ],
};

// ── Static color classes (no dynamic Tailwind) ──

const COLOR_BG_ACTIVE: Record<string, string> = {
  indigo: 'bg-indigo-600 text-white',
  blue: 'bg-blue-600 text-white',
  green: 'bg-green-600 text-white',
  red: 'bg-red-600 text-white',
  purple: 'bg-purple-600 text-white',
  amber: 'bg-amber-600 text-white',
  teal: 'bg-teal-600 text-white',
};

const COLOR_BG_INACTIVE: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100',
  red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100',
  amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100',
  teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100',
};

// ── UI constants ──

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary: 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl transition-all',
    secondary: 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all',
  },
} as const;

// ── Helpers ──

function getTypeIcon(type: string) {
  switch (type) {
    case 'image':
    case 'logo':
    case 'photo':
      return <Image className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isFileResource(r: MarketingResource): boolean {
  return !!r.file_url;
}

function isTextResource(r: MarketingResource): boolean {
  return !!r.content && !r.file_url;
}

// ── Props ──

interface AffiliateResourcesProps {
  role: MarketingRole;
}

// ── Component ──

const AffiliateResources: React.FC<AffiliateResourcesProps> = ({ role }) => {
  const intl = useIntl();
  const {
    resources,
    isLoading,
    error,
    fetchResources,
    download,
    copy,
  } = useMarketingResources(role);

  const categories = ROLE_CATEGORIES[role] || [];
  const [selectedCategory, setSelectedCategory] = useState<MarketingCategory | 'all'>(
    categories.length > 0 ? categories[0].value : 'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch on mount and category change
  useEffect(() => {
    fetchResources(
      selectedCategory !== 'all' ? { category: selectedCategory } : undefined,
    );
  }, [selectedCategory, fetchResources]);

  // ── Handlers ──

  const handleDownload = async (resource: MarketingResource) => {
    setDownloadingId(resource.id);
    const result = await download(resource.id);
    if (result.success && result.fileUrl) {
      window.open(result.fileUrl, '_blank');
    }
    setDownloadingId(null);
  };

  const handleCopy = async (resource: MarketingResource) => {
    const result = await copy(resource.id);
    if (result.success) {
      setCopiedId(resource.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ── Filter resources locally ──

  const filtered = resources.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.content?.toLowerCase().includes(q)
    );
  });

  const files = filtered.filter(isFileResource);
  const texts = filtered.filter(isTextResource);

  // ── Render ──

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="resources.title" defaultMessage="Ressources" />
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          <FormattedMessage
            id="resources.subtitle"
            defaultMessage="Logos, images et textes prets a l'emploi pour vos publications"
          />
        </p>
      </div>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {categories.length > 1 && (
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                selectedCategory === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">
                <FormattedMessage id="resources.all" defaultMessage="Tous" />
              </span>
            </button>
          )}
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? (COLOR_BG_ACTIVE[cat.color] || COLOR_BG_ACTIVE.indigo)
                    : (COLOR_BG_INACTIVE[cat.color] || COLOR_BG_INACTIVE.indigo)
                }`}
              >
                <FolderOpen className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">
                    {intl.formatMessage({ id: cat.labelKey, defaultMessage: cat.defaultLabel })}
                  </p>
                  <p className="text-xs opacity-80 hidden sm:block">
                    {intl.formatMessage({ id: cat.descriptionKey, defaultMessage: cat.defaultDescription })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={intl.formatMessage({
            id: 'resources.search',
            defaultMessage: 'Rechercher une ressource...',
          })}
          className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Files Section */}
      {!isLoading && files.length > 0 && (
        <div className={`${UI.card} p-4 sm:p-6`}>
          <h2 className="text-lg dark:text-white font-semibold mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-indigo-500" />
            <FormattedMessage
              id="resources.files"
              defaultMessage="Fichiers telechargeables"
            />
            <span className="text-sm font-normal text-gray-500">({files.length})</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                {file.thumbnail_url && (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={file.thumbnail_url}
                      alt={file.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="flex items-start gap-2 mb-1">
                  {getTypeIcon(file.type)}
                  <h3 className="font-medium text-gray-900 dark:text-white">{file.name}</h3>
                </div>
                {file.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {file.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {file.file_format?.toUpperCase()}
                    {file.file_size ? ` - ${formatFileSize(file.file_size)}` : ''}
                  </span>
                  <div className="flex gap-2">
                    {file.content && (
                      <button
                        onClick={() => handleCopy(file)}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1`}
                      >
                        {copiedId === file.id ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.id}
                      className={`${UI.button.primary} px-3 py-1.5 text-sm flex items-center gap-1`}
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <FormattedMessage id="resources.download" defaultMessage="Telecharger" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Texts Section */}
      {!isLoading && texts.length > 0 && (
        <div className={`${UI.card} p-4 sm:p-6`}>
          <h2 className="text-lg dark:text-white font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <FormattedMessage
              id="resources.texts"
              defaultMessage="Textes a copier"
            />
            <span className="text-sm font-normal text-gray-500">({texts.length})</span>
          </h2>
          <div className="space-y-4">
            {texts.map((text) => (
              <div
                key={text.id}
                className="border dark:border-gray-700 rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{text.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {text.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap line-clamp-4">
                  {text.content}
                </p>
                <button
                  onClick={() => handleCopy(text)}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1`}
                >
                  {copiedId === text.id ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <FormattedMessage id="resources.copied" defaultMessage="Copie !" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <FormattedMessage id="resources.copy" defaultMessage="Copier" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && files.length === 0 && texts.length === 0 && !error && (
        <div className={`${UI.card} p-12 text-center`}>
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? (
              <FormattedMessage
                id="resources.noResults"
                defaultMessage="Aucun resultat pour cette recherche"
              />
            ) : (
              <FormattedMessage
                id="resources.empty"
                defaultMessage="Aucune ressource disponible pour cette categorie"
              />
            )}
          </p>
        </div>
      )}

      {/* Usage Guidelines */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border dark:border-orange-800 rounded-xl p-4">
        <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
          <FormattedMessage
            id="resources.guidelines.title"
            defaultMessage="Conditions d'utilisation"
          />
        </h3>
        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
          <li>
            - <FormattedMessage
              id="resources.guidelines.1"
              defaultMessage="Ces ressources sont reservees aux partenaires affilies"
            />
          </li>
          <li>
            - <FormattedMessage
              id="resources.guidelines.2"
              defaultMessage="Utilisez-les uniquement pour promouvoir SOS-Expat"
            />
          </li>
          <li>
            - <FormattedMessage
              id="resources.guidelines.3"
              defaultMessage="Ne modifiez pas les logos sans autorisation"
            />
          </li>
          <li>
            - <FormattedMessage
              id="resources.guidelines.4"
              defaultMessage="Incluez toujours votre lien d'affiliation avec le contenu"
            />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AffiliateResources;
