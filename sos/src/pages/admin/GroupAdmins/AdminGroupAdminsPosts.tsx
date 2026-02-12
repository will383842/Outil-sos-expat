/**
 * AdminGroupAdminsPosts - Admin page for managing ready-to-use Facebook posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Facebook,
  CheckCircle,
  X,
  Eye,
  Copy,
  Image,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
} as const;

const POST_CATEGORIES = [
  { code: 'announcement', name: 'Announcement' },
  { code: 'reminder', name: 'Reminder' },
  { code: 'testimonial', name: 'Testimonial' },
  { code: 'qa', name: 'Q&A' },
  { code: 'emergency', name: 'Emergency' },
  { code: 'seasonal', name: 'Seasonal' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'zh', name: 'Chinese' },
];

interface Post {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  category: string;
  content: string;
  contentTranslations?: Record<string, string>;
  imageResourceId?: string;
  placeholders: string[];
  recommendedPinDuration?: string;
  bestTimeToPost?: string;
  usageCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
}

const AdminGroupAdminsPosts: React.FC = () => {
  const functions = getFunctions(undefined, 'europe-west1');
  const intl = useIntl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [previewLang, setPreviewLang] = useState('en');

  const [formData, setFormData] = useState({
    name: '',
    nameTranslations: {} as Record<string, string>,
    category: 'announcement',
    content: '',
    contentTranslations: {} as Record<string, string>,
    imageResourceId: '',
    placeholders: '',
    recommendedPinDuration: '',
    bestTimeToPost: '',
    isActive: true,
    order: 0,
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const getPosts = httpsCallable(functions, 'adminGetGroupAdminPostsList');
      const result = await getPosts({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });
      setPosts((result.data as { posts: Post[] }).posts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.admin.posts.error' }));
    } finally {
      setLoading(false);
    }
  }, [functions, categoryFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const resetForm = () => {
    setFormData({
      name: '',
      nameTranslations: {},
      category: 'announcement',
      content: '',
      contentTranslations: {},
      imageResourceId: '',
      placeholders: '',
      recommendedPinDuration: '',
      bestTimeToPost: '',
      isActive: true,
      order: 0,
    });
    setEditingPost(null);
    setIsCreating(false);
  };

  const handleEdit = (post: Post) => {
    setFormData({
      name: post.name,
      nameTranslations: post.nameTranslations || {},
      category: post.category,
      content: post.content,
      contentTranslations: post.contentTranslations || {},
      imageResourceId: post.imageResourceId || '',
      placeholders: (post.placeholders || []).join(', '),
      recommendedPinDuration: post.recommendedPinDuration || '',
      bestTimeToPost: post.bestTimeToPost || '',
      isActive: post.isActive,
      order: post.order,
    });
    setEditingPost(post);
    setIsCreating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        placeholders: formData.placeholders.split(',').map(p => p.trim()).filter(Boolean),
      };

      if (editingPost) {
        const updatePost = httpsCallable(functions, 'adminUpdateGroupAdminPost');
        await updatePost({ postId: editingPost.id, ...data });
      } else {
        const createPost = httpsCallable(functions, 'adminCreateGroupAdminPost');
        await createPost(data);
      }

      resetForm();
      fetchPosts();
    } catch (err) {
      console.error('Error saving post:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: Post) => {
    if (!window.confirm(`Delete post "${post.name}"?`)) return;

    try {
      const deletePost = httpsCallable(functions, 'adminDeleteGroupAdminPost');
      await deletePost({ postId: post.id });
      fetchPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const getPreviewContent = () => {
    if (!previewPost) return '';
    const content = previewPost.contentTranslations?.[previewLang] || previewPost.content;
    return content
      .replace(/\{\{AFFILIATE_LINK\}\}/g, 'https://sos-expat.com/?ref=GROUP-EXAMPLE123')
      .replace(/\{\{GROUP_NAME\}\}/g, 'My Facebook Group')
      .replace(/\{\{ADMIN_NAME\}\}/g, 'John Doe')
      .replace(/\{\{DISCOUNT_AMOUNT\}\}/g, '$5');
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Facebook className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="groupAdmin.admin.posts" defaultMessage="GroupAdmin Posts" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {intl.formatMessage({ id: 'groupAdmin.admin.posts.description' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchPosts} className={`${UI.button.secondary} p-2`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                resetForm();
                setIsCreating(true);
              }}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              {intl.formatMessage({ id: 'groupAdmin.admin.posts.addPost' })}
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className={UI.card + " p-4"}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={UI.select}
          >
            <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.posts.filter.allCategories' })}</option>
            {POST_CATEGORIES.map(cat => (
              <option key={cat.code} value={cat.code}>{intl.formatMessage({ id: `groupAdmin.postCategory.${cat.code}` })}</option>
            ))}
          </select>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingPost) && (
          <div className={UI.card + " p-6"}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPost ? intl.formatMessage({ id: 'groupAdmin.admin.posts.editPost' }) : intl.formatMessage({ id: 'groupAdmin.admin.posts.createPost' })}
              </h2>
              <button onClick={resetForm} className={`${UI.button.secondary} p-2`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.posts.nameDefault' })}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={UI.input}
                  placeholder="Welcome Announcement"
                />
              </div>
              <div>
                <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.posts.category' })}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={UI.input}
                >
                  {POST_CATEGORIES.map(cat => (
                    <option key={cat.code} value={cat.code}>{intl.formatMessage({ id: `groupAdmin.postCategory.${cat.code}` })}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.posts.contentDefault' })}</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className={UI.input + " h-40 font-mono text-sm"}
                  placeholder="Write your Facebook post content here. Use placeholders like {{AFFILIATE_LINK}}, {{GROUP_NAME}}, etc."
                />
              </div>
              <div>
                <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.posts.placeholders' })}</label>
                <input
                  type="text"
                  value={formData.placeholders}
                  onChange={(e) => setFormData({ ...formData, placeholders: e.target.value })}
                  className={UI.input}
                  placeholder="{{AFFILIATE_LINK}}, {{GROUP_NAME}}"
                />
              </div>
              <div>
                <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.posts.order' })}</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className={UI.input}
                />
              </div>
              <div>
                <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.posts.pinDuration' })}</label>
                <input
                  type="text"
                  value={formData.recommendedPinDuration}
                  onChange={(e) => setFormData({ ...formData, recommendedPinDuration: e.target.value })}
                  className={UI.input}
                  placeholder="1 week, permanent"
                />
              </div>
              <div>
                <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.posts.bestTime' })}</label>
                <input
                  type="text"
                  value={formData.bestTimeToPost}
                  onChange={(e) => setFormData({ ...formData, bestTimeToPost: e.target.value })}
                  className={UI.input}
                  placeholder="monday_morning, weekend"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{intl.formatMessage({ id: 'groupAdmin.admin.posts.active' })}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={resetForm} className={`${UI.button.secondary} px-4 py-2`}>
                {intl.formatMessage({ id: 'groupAdmin.admin.posts.cancel' })}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.content}
                className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingPost ? intl.formatMessage({ id: 'groupAdmin.admin.posts.update' }) : intl.formatMessage({ id: 'groupAdmin.admin.posts.create' })}
              </button>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={UI.card + " max-w-2xl w-full max-h-[80vh] overflow-auto p-6"}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {intl.formatMessage({ id: 'groupAdmin.admin.posts.preview' }, { name: previewPost.name })}
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={previewLang}
                    onChange={(e) => setPreviewLang(e.target.value)}
                    className={UI.select + " text-sm"}
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setPreviewPost(null)} className={`${UI.button.secondary} p-2`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    GA
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{intl.formatMessage({ id: 'groupAdmin.admin.posts.previewAuthor' })}</p>
                    <p className="text-xs text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.posts.justNow' })}</p>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {getPreviewContent()}
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <p><strong>{intl.formatMessage({ id: 'groupAdmin.admin.posts.categoryLabel' })}</strong> {POST_CATEGORIES.find(c => c.code === previewPost.category)?.name}</p>
                {previewPost.recommendedPinDuration && (
                  <p><strong>{intl.formatMessage({ id: 'groupAdmin.admin.posts.recommendedPin' })}</strong> {previewPost.recommendedPinDuration}</p>
                )}
                {previewPost.bestTimeToPost && (
                  <p><strong>{intl.formatMessage({ id: 'groupAdmin.admin.posts.bestTimeLabel' })}</strong> {previewPost.bestTimeToPost}</p>
                )}
                <p><strong>{intl.formatMessage({ id: 'groupAdmin.admin.posts.usageCount' })}</strong> {previewPost.usageCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className={UI.card + " overflow-hidden"}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12 text-red-500">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {error}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {post.name}
                        {!post.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                            {intl.formatMessage({ id: 'groupAdmin.admin.posts.inactive' })}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {intl.formatMessage({ id: `groupAdmin.postCategory.${post.category}` })}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-md">
                        {post.content.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {post.usageCount} uses • {post.placeholders?.length || 0} placeholders
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setPreviewPost(post)}
                      className={`${UI.button.secondary} p-2`}
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(post)}
                      className={`${UI.button.secondary} p-2`}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      className={`${UI.button.danger} p-2`}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {posts.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p>{intl.formatMessage({ id: 'groupAdmin.admin.posts.noResults' })}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsPosts;
