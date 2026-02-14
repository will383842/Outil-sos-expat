/**
 * AdminBloggersArticles - Admin page for managing blogger SEO articles
 *
 * CRUD for ready-to-copy articles with SEO metadata, categories, and translations.
 * Articles support {{AFFILIATE_LINK}} placeholder replacement.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import {
  FileText,
  Plus,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  Edit2,
  Search,
  X,
  Copy,
  Tag,
  Eye,
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
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white",
} as const;

const ARTICLE_CATEGORIES = [
  { value: 'seo', labelFr: 'SEO', labelEn: 'SEO', color: 'blue' },
  { value: 'how_to', labelFr: 'Tutoriel', labelEn: 'How-to', color: 'green' },
  { value: 'comparison', labelFr: 'Comparatif', labelEn: 'Comparison', color: 'orange' },
  { value: 'testimonial', labelFr: 'Temoignage', labelEn: 'Testimonial', color: 'purple' },
  { value: 'news', labelFr: 'Actualite', labelEn: 'News', color: 'red' },
];

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  seoTitle?: string;
  seoKeywords?: string[];
  estimatedWordCount?: number;
  titleTranslations?: Record<string, string>;
  contentTranslations?: Record<string, string>;
  isActive: boolean;
  order: number;
  copyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface EditingArticle {
  isNew: boolean;
  data: Partial<Article> & { seoKeywordsStr?: string };
}

const AdminBloggersArticles: React.FC = () => {
  const intl = useIntl();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingArticle, setEditingArticle] = useState<EditingArticle | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetBloggerArticles = httpsCallable<void, { articles: Article[] }>(
        functionsWest2,
        'adminGetBloggerArticles'
      );
      const result = await adminGetBloggerArticles();
      setArticles(result.data.articles || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('Error fetching articles:', err);
      setError(e.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const startEditing = (article: Article | null) => {
    if (article) {
      setEditingArticle({
        isNew: false,
        data: {
          ...article,
          seoKeywordsStr: article.seoKeywords?.join(', ') || '',
        },
      });
    } else {
      setEditingArticle({
        isNew: true,
        data: {
          title: '',
          content: '',
          category: 'seo',
          seoTitle: '',
          seoKeywordsStr: '',
          estimatedWordCount: 0,
          isActive: true,
          order: articles.length,
        },
      });
    }
  };

  const saveArticle = async () => {
    if (!editingArticle) return;

    setSaving(true);
    setError(null);

    try {
      const { seoKeywordsStr, ...articleData } = editingArticle.data;
      const seoKeywords = seoKeywordsStr
        ? seoKeywordsStr.split(',').map((k: string) => k.trim()).filter(Boolean)
        : [];

      const wordCount = articleData.content
        ? articleData.content.split(/\s+/).filter(Boolean).length
        : 0;

      const payload = {
        ...articleData,
        seoKeywords,
        estimatedWordCount: wordCount,
      };

      if (editingArticle.isNew) {
        const createFn = httpsCallable(functionsWest2, 'adminCreateBloggerArticle');
        await createFn({ article: payload });
      } else {
        const updateFn = httpsCallable(functionsWest2, 'adminUpdateBloggerArticle');
        await updateFn({ articleId: articleData.id, article: payload });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setEditingArticle(null);
      fetchArticles();
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('Error saving article:', err);
      setError(e.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (article: Article) => {
    if (!confirm('Supprimer cet article ?')) return;

    try {
      const deleteFn = httpsCallable(functionsWest2, 'adminDeleteBloggerArticle');
      await deleteFn({ articleId: article.id });
      fetchArticles();
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error('Error deleting article:', err);
      setError(e.message || 'Failed to delete article');
    }
  };

  const getCategoryInfo = (value: string) =>
    ARTICLE_CATEGORIES.find((c) => c.value === value) || ARTICLE_CATEGORIES[0];

  const filteredArticles = articles
    .filter((a) => filterCategory === 'all' || a.category === filterCategory)
    .filter((a) =>
      searchQuery
        ? a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              <FormattedMessage id="admin.bloggers.articles.title" defaultMessage="Articles Blogueurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.bloggers.articles.subtitle"
                defaultMessage="Articles SEO prets a copier avec remplacement {{AFFILIATE_LINK}}"
              />
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => startEditing(null)}
              className={`${UI.button.primary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvel article</span>
            </button>
            <button
              onClick={fetchArticles}
              className={`${UI.button.secondary} px-3 py-2`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 flex items-center gap-3`}>
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">Article enregistre avec succes</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un article..."
              className={`${UI.input} pl-10`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              Tous ({articles.length})
            </button>
            {ARTICLE_CATEGORIES.map((cat) => {
              const count = articles.filter((a) => a.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterCategory === cat.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {cat.labelFr} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Articles List */}
        <div className="space-y-4">
          {filteredArticles.map((article) => {
            const catInfo = getCategoryInfo(article.category);
            return (
              <div key={article.id} className={`${UI.card} p-4`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${catInfo.color}-100 text-${catInfo.color}-700 dark:bg-${catInfo.color}-900/30 dark:text-${catInfo.color}-400`}>
                        {catInfo.labelFr}
                      </span>
                      {!article.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-white/10">
                          Inactif
                        </span>
                      )}
                      {article.seoTitle && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          SEO
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {article.content?.substring(0, 200)}...
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{article.estimatedWordCount || 0} mots</span>
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        {article.copyCount || 0} copies
                      </span>
                      {article.seoKeywords && article.seoKeywords.length > 0 && (
                        <span>{article.seoKeywords.length} mots-cles</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setPreviewArticle(article)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                      title="Apercu"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => startEditing(article)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => deleteArticle(article)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Aucun article trouve</p>
            <button
              onClick={() => startEditing(null)}
              className={`${UI.button.primary} px-4 py-2 mt-4 text-sm`}
            >
              Creer un article
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${UI.card} w-full max-w-3xl p-6 my-8`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Apercu de l'article</h3>
              <button
                onClick={() => setPreviewArticle(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {previewArticle.seoTitle && (
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                SEO: {previewArticle.seoTitle}
              </p>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {previewArticle.title}
            </h2>
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 max-h-96 overflow-y-auto bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
              {previewArticle.content}
            </div>
            {previewArticle.seoKeywords && previewArticle.seoKeywords.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {previewArticle.seoKeywords.map((kw, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${UI.card} w-full max-w-3xl p-6 my-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingArticle.isNew ? 'Nouvel article' : 'Modifier l\'article'}
              </h3>
              <button
                onClick={() => setEditingArticle(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre de l'article *
                </label>
                <input
                  type="text"
                  value={editingArticle.data.title || ''}
                  onChange={(e) => setEditingArticle({
                    ...editingArticle,
                    data: { ...editingArticle.data, title: e.target.value },
                  })}
                  className={UI.input}
                  placeholder="Titre accrocheur pour le blog..."
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categorie
                  </label>
                  <select
                    value={editingArticle.data.category || 'seo'}
                    onChange={(e) => setEditingArticle({
                      ...editingArticle,
                      data: { ...editingArticle.data, category: e.target.value },
                    })}
                    className={UI.select}
                  >
                    {ARTICLE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.labelFr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={editingArticle.data.order || 0}
                    onChange={(e) => setEditingArticle({
                      ...editingArticle,
                      data: { ...editingArticle.data, order: parseInt(e.target.value) || 0 },
                    })}
                    className={UI.input}
                    min="0"
                  />
                </div>
              </div>

              {/* SEO Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Titre SEO (balise title)
                </label>
                <input
                  type="text"
                  value={editingArticle.data.seoTitle || ''}
                  onChange={(e) => setEditingArticle({
                    ...editingArticle,
                    data: { ...editingArticle.data, seoTitle: e.target.value },
                  })}
                  className={UI.input}
                  placeholder="Titre optimise pour le referencement..."
                />
              </div>

              {/* SEO Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mots-cles SEO (separes par des virgules)
                </label>
                <input
                  type="text"
                  value={editingArticle.data.seoKeywordsStr || ''}
                  onChange={(e) => setEditingArticle({
                    ...editingArticle,
                    data: { ...editingArticle.data, seoKeywordsStr: e.target.value },
                  })}
                  className={UI.input}
                  placeholder="expatriation, assistance juridique, sos expat..."
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contenu de l'article *
                  <span className="text-xs text-gray-400 ml-2">
                    Utilisez {'{{AFFILIATE_LINK}}'} pour le lien d'affiliation
                  </span>
                </label>
                <textarea
                  value={editingArticle.data.content || ''}
                  onChange={(e) => setEditingArticle({
                    ...editingArticle,
                    data: { ...editingArticle.data, content: e.target.value },
                  })}
                  className={`${UI.input} h-64 resize-y font-mono text-sm`}
                  placeholder="Contenu complet de l'article..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  {editingArticle.data.content
                    ? editingArticle.data.content.split(/\s+/).filter(Boolean).length
                    : 0} mots
                </p>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingArticle.data.isActive !== false}
                  onChange={(e) => setEditingArticle({
                    ...editingArticle,
                    data: { ...editingArticle.data, isActive: e.target.checked },
                  })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  Article actif (visible par les blogueurs)
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingArticle(null)}
                className={`${UI.button.secondary} flex-1 px-4 py-2`}
              >
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
              <button
                onClick={saveArticle}
                disabled={saving || !editingArticle.data.title || !editingArticle.data.content}
                className={`${UI.button.primary} flex-1 px-4 py-2 flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBloggersArticles;
