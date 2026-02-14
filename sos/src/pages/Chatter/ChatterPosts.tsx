/**
 * ChatterPosts - Page for managing post submissions
 * Allows chatters to submit and track their promotional posts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import {
  FileText,
  Plus,
  Loader2,
  AlertCircle,
  Check,
  Clock,
  X,
  ExternalLink,
  Filter,
  Image,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all",
} as const;

interface Post {
  id: string;
  url: string;
  platform: string;
  targetCountry: string;
  language: string;
  content?: string;
  screenshotUrl?: string;
  clickCount: number;
  conversionCount: number;
  earningsGenerated: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt: { _seconds: number };
}

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'forum', label: 'Forum' },
  { value: 'blog', label: 'Blog' },
  { value: 'other', label: 'Autre' },
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ar', label: 'العربية' },
];

const ChatterPosts: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth();

  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    platform: 'facebook' as string,
    targetCountry: 'GLOBAL',
    language: 'fr',
    content: '',
  });

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const getMyPosts = httpsCallable(functionsWest2, 'getMyPosts');

      const result = await getMyPosts({
        status: filterStatus === 'all' ? undefined : filterStatus,
        limit: 50,
      });

      const data = result.data as { success: boolean; posts: Post[]; total: number };

      if (data.success) {
        setPosts(data.posts);
      } else {
        setError(intl.formatMessage({
          id: 'chatter.posts.fetchError',
          defaultMessage: 'Erreur lors du chargement des posts'
        }));
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(intl.formatMessage({
        id: 'chatter.posts.fetchError',
        defaultMessage: 'Erreur lors du chargement des posts'
      }));
    } finally {
      setLoading(false);
    }
  }, [user, filterStatus, intl]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Submit new post
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const submitPost = httpsCallable(functionsWest2, 'submitPost');

      const result = await submitPost(formData);
      const data = result.data as { success: boolean; postId?: string };

      if (data.success) {
        setSubmitSuccess(true);
        setShowNewPostModal(false);
        setFormData({
          url: '',
          platform: 'facebook',
          targetCountry: 'GLOBAL',
          language: 'fr',
          content: '',
        });
        fetchPosts();
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (err: unknown) {
      console.error('Error submitting post:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: Post['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
            <Check className="w-3 h-3" />
            <FormattedMessage id="chatter.posts.status.approved" defaultMessage="Approuvé" />
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
            <X className="w-3 h-3" />
            <FormattedMessage id="chatter.posts.status.rejected" defaultMessage="Rejeté" />
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-medium">
            <Clock className="w-3 h-3" />
            <FormattedMessage id="chatter.posts.status.pending" defaultMessage="En attente" />
          </span>
        );
    }
  };

  return (
    <Layout showFooter={false}>
      <ChatterDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl dark:text-white font-bold">
                <FormattedMessage id="chatter.posts.title" defaultMessage="Mes Posts" />
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.posts.subtitle" defaultMessage="Soumettez et suivez vos posts promotionnels" />
              </p>
            </div>
            <button
              onClick={() => setShowNewPostModal(true)}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              <FormattedMessage id="chatter.posts.new" defaultMessage="Nouveau post" />
            </button>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <p className="text-sm dark:text-green-300">
                <FormattedMessage id="chatter.posts.submitSuccess" defaultMessage="Post soumis avec succès !" />
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Filter */}
          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="bg-transparent border-none focus:ring-0 text-sm dark:text-gray-300 font-medium"
              >
                <option value="all">{intl.formatMessage({ id: 'chatter.posts.filter.all', defaultMessage: 'Tous les posts' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'chatter.posts.filter.pending', defaultMessage: 'En attente' })}</option>
                <option value="approved">{intl.formatMessage({ id: 'chatter.posts.filter.approved', defaultMessage: 'Approuvés' })}</option>
                <option value="rejected">{intl.formatMessage({ id: 'chatter.posts.filter.rejected', defaultMessage: 'Rejetés' })}</option>
              </select>
            </div>
          </div>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className={`${UI.card} p-8 text-center`}>
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg dark:text-white font-medium mb-2">
                <FormattedMessage id="chatter.posts.empty.title" defaultMessage="Aucun post" />
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                <FormattedMessage id="chatter.posts.empty.message" defaultMessage="Soumettez votre premier post promotionnel pour commencer à suivre vos performances." />
              </p>
              <button
                onClick={() => setShowNewPostModal(true)}
                className={`${UI.button.primary} px-4 py-2`}
              >
                <FormattedMessage id="chatter.posts.new" defaultMessage="Nouveau post" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className={`${UI.card} p-4`}>
                  <div className="flex sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(post.status)}
                        <span className="text-xs">
                          {PLATFORMS.find(p => p.value === post.platform)?.label || post.platform}
                        </span>
                      </div>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm dark:text-red-400 font-medium hover:underline flex items-center gap-1 break-all"
                      >
                        {post.url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      {post.content && (
                        <p className="text-sm dark:text-gray-400 mt-2 line-clamp-2">
                          {post.content}
                        </p>
                      )}
                      {post.rejectionReason && (
                        <p className="text-sm dark:text-red-400 mt-2">
                          <FormattedMessage id="chatter.posts.rejectionReason" defaultMessage="Raison:" /> {post.rejectionReason}
                        </p>
                      )}
                      <p className="text-xs mt-2">
                        {new Date(post.submittedAt._seconds * 1000).toLocaleDateString()}
                      </p>
                    </div>

                    {post.status === 'approved' && (
                      <div className="flex gap-4 text-center">
                        <div>
                          <p className="text-lg dark:text-white font-bold">{post.clickCount}</p>
                          <p className="text-xs">
                            <FormattedMessage id="chatter.posts.clicks" defaultMessage="Clics" />
                          </p>
                        </div>
                        <div>
                          <p className="text-lg dark:text-green-400 font-bold">{post.conversionCount}</p>
                          <p className="text-xs">
                            <FormattedMessage id="chatter.posts.conversions" defaultMessage="Conversions" />
                          </p>
                        </div>
                        <div>
                          <p className="text-lg dark:text-red-400 font-bold">${(post.earningsGenerated / 100).toFixed(2)}</p>
                          <p className="text-xs">
                            <FormattedMessage id="chatter.posts.earnings" defaultMessage="Gains" />
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Post Modal */}
        {showNewPostModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${UI.card}p-6 max-w-lg w-full overflow-y-auto`}>
              <h2 className="text-xl dark:text-white font-bold mb-4">
                <FormattedMessage id="chatter.posts.newPost.title" defaultMessage="Nouveau post" />
              </h2>

              <form onSubmit={handleSubmitPost} className="space-y-4">
                <div>
                  <label className="block text-sm dark:text-gray-300 font-medium mb-1">
                    <FormattedMessage id="chatter.posts.form.url" defaultMessage="URL du post *" />
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className={UI.input}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm dark:text-gray-300 font-medium mb-1">
                      <FormattedMessage id="chatter.posts.form.platform" defaultMessage="Plateforme *" />
                    </label>
                    <select
                      required
                      value={formData.platform}
                      onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                      className={UI.input}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm dark:text-gray-300 font-medium mb-1">
                      <FormattedMessage id="chatter.posts.form.language" defaultMessage="Langue *" />
                    </label>
                    <select
                      required
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className={UI.input}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm dark:text-gray-300 font-medium mb-1">
                    <FormattedMessage id="chatter.posts.form.content" defaultMessage="Contenu du post (optionnel)" />
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className={`${UI.input} min-h-[100px]`}
                    placeholder={intl.formatMessage({
                      id: 'chatter.posts.form.contentPlaceholder',
                      defaultMessage: 'Copiez le texte de votre post ici...'
                    })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewPostModal(false)}
                    className={`${UI.button.secondary} flex-1 py-2`}
                  >
                    <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`${UI.button.primary}flex-1 py-2 items-center justify-center gap-2`}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FormattedMessage id="chatter.posts.form.submit" defaultMessage="Soumettre" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ChatterDashboardLayout>
    </Layout>
  );
};

export default ChatterPosts;
