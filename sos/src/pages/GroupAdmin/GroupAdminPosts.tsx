/**
 * GroupAdminPosts - Ready-to-use Facebook posts page
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '@/contexts/AuthContext';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import SEOHead from '@/components/layout/SEOHead';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { Copy, CheckCircle, FileText, Filter, Loader2, AlertCircle, Clock, Pin } from 'lucide-react';
import { GroupAdminPost, GroupAdminPostCategory, POST_CATEGORY_LABELS } from '@/types/groupAdmin';

const GroupAdminPosts: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<GroupAdminPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GroupAdminPostCategory | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const getPosts = httpsCallable(functions, 'getGroupAdminPosts');
      const result = await getPosts({});
      const data = result.data as { posts: GroupAdminPost[] };
      setPosts(data.posts);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const copyPost = async (post: GroupAdminPost) => {
    if (loadingContent === post.id) return;

    setLoadingContent(post.id);
    try {
      const getProcessedPost = httpsCallable(functions, 'getGroupAdminProcessedPost');
      const result = await getProcessedPost({ postId: post.id, language: user?.preferredLanguage || 'en' });
      const data = result.data as { content: string };
      await navigator.clipboard.writeText(data.content);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy post:', err);
      // Fallback to raw content
      if (post.content) {
        await navigator.clipboard.writeText(post.content);
        setCopiedId(post.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } finally {
      setLoadingContent(null);
    }
  };

  const filteredPosts = selectedCategory === 'all' ? posts : posts.filter((p) => p.category === selectedCategory);
  const categories: GroupAdminPostCategory[] = ['announcement', 'reminder', 'testimonial', 'qa', 'emergency', 'seasonal'];

  if (loading) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  if (error) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center p-4 py-20">
          <div className="bg-white dark:bg-white/5 rounded-xl p-8 max-w-md w-full text-center shadow-lg dark:shadow-none">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl dark:text-white font-bold mb-2">
              <FormattedMessage id="groupAdmin.posts.error.title" defaultMessage="Error Loading Posts" />
            </h2>
            <p className="text-gray-600 dark:text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchPosts}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg"
            >
              <FormattedMessage id="groupAdmin.posts.error.retry" defaultMessage="Retry" />
            </button>
          </div>
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  return (
    <GroupAdminDashboardLayout>
      <SEOHead description="Manage your group or community with SOS-Expat" title={intl.formatMessage({ id: 'groupAdmin.posts.title', defaultMessage: 'Posts | SOS-Expat Group Admin' })} />

      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl dark:text-white md:text-3xl font-bold mb-2">
              <FormattedMessage id="groupAdmin.posts.heading" defaultMessage="Ready-to-Use Posts" />
            </h1>
            <p className="text-gray-600 dark:text-gray-600">
              <FormattedMessage id="groupAdmin.posts.subtitle" defaultMessage="Copy and paste these posts into your group or community" />
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {POST_CATEGORY_LABELS[cat].en}
              </button>
            ))}
          </div>

          {/* Posts List */}
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-white/5 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{post.name}</h3>
                      <div className="flex items-center gap-3 text-sm dark:text-gray-700">
                        <span className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">{POST_CATEGORY_LABELS[post.category].en}</span>
                        {post.recommendedPinDuration && (
                          <span className="flex items-center gap-1">
                            <Pin className="w-4 h-4" />
                            Pin: {post.recommendedPinDuration.replace('_', ' ')}
                          </span>
                        )}
                        {post.bestTimeToPost && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Best: {post.bestTimeToPost.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copyPost(post)}
                      disabled={loadingContent === post.id}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                      {loadingContent === post.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : copiedId === post.id ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Post
                        </>
                      )}
                    </button>
                  </div>

                  {/* Post Preview */}
                  <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 whitespace-pre-wrap text-sm dark:text-gray-700 max-h-64 overflow-y-auto">
                    {post.content}
                  </div>

                  {post.placeholders.length > 0 && (
                    <p className="mt-3 text-xs dark:text-gray-700">
                      <FormattedMessage
                        id="groupAdmin.posts.placeholdersNote"
                        defaultMessage="Placeholders like {{AFFILIATE_LINK}} will be replaced with your actual values"
                      />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-700 dark:text-gray-300 mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-700">No posts in this category yet</p>
            </div>
          )}
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminPosts;
