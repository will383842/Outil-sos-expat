/**
 * BloggerResources - Unified resources page for bloggers
 *
 * 3 tabs:
 * 1. Logos & Images - downloadable files by category
 * 2. Articles complets - SEO-ready articles with {{AFFILIATE_LINK}} replacement
 * 3. Textes promo - copyable text resources
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBloggerResources, useBloggerArticles } from '@/hooks/useBloggerResources';
import { BloggerDashboardLayout } from '@/components/Blogger';
import type { BloggerResourceCategory } from '@/types/blogger';
import {
  FolderOpen,
  Download,
  Copy,
  Image,
  FileText,
  Star,
  Loader2,
  CheckCircle,
  Search,
  Newspaper,
  Tag,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

type Tab = 'images' | 'articles' | 'texts';

const TABS: { id: Tab; icon: React.ReactNode; labelId: string; defaultLabel: string }[] = [
  { id: 'images', icon: <Image className="w-4 h-4" />, labelId: 'blogger.resources.tab.images', defaultLabel: 'Logos & Images' },
  { id: 'articles', icon: <Newspaper className="w-4 h-4" />, labelId: 'blogger.resources.tab.articles', defaultLabel: 'Articles complets' },
  { id: 'texts', icon: <FileText className="w-4 h-4" />, labelId: 'blogger.resources.tab.texts', defaultLabel: 'Textes promo' },
];

const CATEGORIES: { value: BloggerResourceCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'sos_expat', label: 'SOS-Expat', icon: <FolderOpen className="w-5 h-5" />, color: 'purple' },
  { value: 'ulixai', label: 'Ulixai', icon: <Star className="w-5 h-5" />, color: 'blue' },
  { value: 'founder', label: 'Fondateur', icon: <FileText className="w-5 h-5" />, color: 'green' },
];

const ARTICLE_CATEGORIES: Record<string, string> = {
  seo: 'SEO',
  how_to: 'Tutoriel',
  comparison: 'Comparatif',
  testimonial: 'Témoignage',
  news: 'Actualité',
};

const BloggerResources: React.FC = () => {
  const intl = useIntl();
  const { resources, isLoading, error, fetchResources, downloadResource, copyText } = useBloggerResources();
  const { articles, isLoading: articlesLoading, error: articlesError, fetchArticles, copyArticle } = useBloggerArticles();

  const [activeTab, setActiveTab] = useState<Tab>('images');
  const [selectedCategory, setSelectedCategory] = useState<BloggerResourceCategory>('sos_expat');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [articleFilter, setArticleFilter] = useState<string>('all');

  useEffect(() => {
    fetchResources(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (activeTab === 'articles' && !articles) {
      fetchArticles();
    }
  }, [activeTab]);

  const handleDownload = async (resourceId: string) => {
    setDownloadingId(resourceId);
    const result = await downloadResource(resourceId);
    if (result.success && result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
    setDownloadingId(null);
  };

  const handleCopy = async (textId: string) => {
    const result = await copyText(textId);
    if (result.success) {
      setCopiedId(textId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyArticle = async (articleId: string) => {
    const result = await copyArticle(articleId);
    if (result.success) {
      setCopiedId(articleId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredFiles = resources?.files?.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredTexts = resources?.texts?.filter(text =>
    text.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    text.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredArticles = (articles || []).filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = articleFilter === 'all' || article.category === articleFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="blogger.resources.title" defaultMessage="Ressources" />
          </h1>
          <p className="text-gray-700 dark:text-gray-700">
            <FormattedMessage id="blogger.resources.subtitle" defaultMessage="Logos, articles et textes prêts à l'emploi pour votre blog" />
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">
                <FormattedMessage id={tab.labelId} defaultMessage={tab.defaultLabel} />
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: 'blogger.resources.search', defaultMessage: 'Rechercher...' })}
            className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
          />
        </div>

        {/* ==================== TAB: LOGOS & IMAGES ==================== */}
        {activeTab === 'images' && (
          <>
            {/* Category Tabs */}
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {!isLoading && filteredFiles.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow bg-white dark:bg-white/5">
                    {file.previewUrl && (
                      <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 overflow-hidden">
                        <img src={file.previewUrl} alt={file.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">{file.name}</h3>
                    {file.description && <p className="text-sm dark:text-gray-700 mb-3">{file.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs dark:text-gray-400">{file.format?.toUpperCase()} {file.sizeFormatted ? `• ${file.sizeFormatted}` : ''}</span>
                      <button
                        onClick={() => handleDownload(file.id)}
                        disabled={downloadingId === file.id}
                        className={`${UI.button.primary} px-3 py-1.5 text-sm flex items-center gap-1`}
                      >
                        {downloadingId === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><Download className="w-4 h-4" /> <FormattedMessage id="blogger.resources.download" defaultMessage="Télécharger" /></>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filteredFiles.length === 0 && (
              <div className={`${UI.card} p-12 text-center`}>
                <FolderOpen className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-700">
                  <FormattedMessage id="blogger.resources.empty" defaultMessage="Aucune ressource disponible pour cette catégorie" />
                </p>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: ARTICLES COMPLETS ==================== */}
        {activeTab === 'articles' && (
          <>
            {/* Category filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setArticleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  articleFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                }`}
              >
                Tous
              </button>
              {Object.entries(ARTICLE_CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setArticleFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    articleFilter === key ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {articlesLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            )}

            {articlesError && (
              <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
                {articlesError}
              </div>
            )}

            {!articlesLoading && filteredArticles.length > 0 && (
              <div className="space-y-4">
                {filteredArticles.map((article) => (
                  <div key={article.id} className={`${UI.card} p-6`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg dark:text-white font-semibold">{article.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                            {ARTICLE_CATEGORIES[article.category] || article.category}
                          </span>
                          {article.estimatedWordCount && (
                            <span className="text-xs dark:text-gray-400">~{article.estimatedWordCount} mots</span>
                          )}
                          {article.seoKeywords && article.seoKeywords.length > 0 && (
                            <span className="text-xs dark:text-gray-400 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {article.seoKeywords.slice(0, 3).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyArticle(article.id)}
                        className={`${UI.button.primary}px-4 py-2 text-sm flex items-center gap-2`}
                      >
                        {copiedId === article.id ? (
                          <><CheckCircle className="w-4 h-4" /> <FormattedMessage id="blogger.resources.copied" defaultMessage="Copié !" /></>
                        ) : (
                          <><Copy className="w-4 h-4" /> <FormattedMessage id="blogger.resources.copyArticle" defaultMessage="Copier l'article" /></>
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-sm dark:text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {article.content.substring(0, 500)}{article.content.length > 500 ? '...' : ''}
                    </div>
                    <p className="text-xs dark:text-gray-400 mt-2">
                      <FormattedMessage id="blogger.resources.affiliateReplace" defaultMessage="Les liens {{AFFILIATE_LINK}} seront remplacés par votre lien personnel lors de la copie" />
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!articlesLoading && filteredArticles.length === 0 && (
              <div className={`${UI.card} p-12 text-center`}>
                <Newspaper className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-700">
                  <FormattedMessage id="blogger.resources.noArticles" defaultMessage="Aucun article disponible" />
                </p>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: TEXTES PROMO ==================== */}
        {activeTab === 'texts' && (
          <>
            {/* Category Tabs for texts too */}
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                    }`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            )}

            {!isLoading && filteredTexts.length > 0 && (
              <div className="space-y-4">
                {filteredTexts.map((text) => (
                  <div key={text.id} className="border dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{text.title}</h3>
                      <span className="text-xs dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {text.type}
                      </span>
                    </div>
                    <p className="text-sm dark:text-gray-700 mb-3 whitespace-pre-wrap line-clamp-4">
                      {text.content}
                    </p>
                    <button
                      onClick={() => handleCopy(text.id)}
                      className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1`}
                    >
                      {copiedId === text.id ? (
                        <><CheckCircle className="w-4 h-4 text-green-500" /> <FormattedMessage id="blogger.resources.copied" defaultMessage="Copié !" /></>
                      ) : (
                        <><Copy className="w-4 h-4" /> <FormattedMessage id="blogger.resources.copy" defaultMessage="Copier" /></>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filteredTexts.length === 0 && (
              <div className={`${UI.card} p-12 text-center`}>
                <FileText className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 dark:text-gray-700">
                  <FormattedMessage id="blogger.resources.noTexts" defaultMessage="Aucun texte disponible pour cette catégorie" />
                </p>
              </div>
            )}
          </>
        )}

        {/* Usage Guidelines */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border dark:border-purple-800 rounded-xl p-4">
          <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
            <FormattedMessage id="blogger.resources.guidelines.title" defaultMessage="Conditions d'utilisation" />
          </h3>
          <ul className="text-sm dark:text-purple-300 space-y-1">
            <li>• <FormattedMessage id="blogger.resources.guidelines.1" defaultMessage="Ces ressources sont réservées aux blogueurs partenaires" /></li>
            <li>• <FormattedMessage id="blogger.resources.guidelines.2" defaultMessage="Utilisez-les uniquement pour promouvoir SOS-Expat sur votre blog" /></li>
            <li>• <FormattedMessage id="blogger.resources.guidelines.3" defaultMessage="Ne modifiez pas les logos sans autorisation" /></li>
            <li>• <FormattedMessage id="blogger.resources.guidelines.4" defaultMessage="Incluez toujours votre lien d'affiliation avec le contenu" /></li>
          </ul>
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerResources;
