/**
 * useGroupAdminPosts - Hook for fetching and managing posts
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  GroupAdminPost,
  GroupAdminPostCategory,
  GroupAdminPostsResponse,
  SupportedGroupAdminLanguage,
} from '@/types/groupAdmin';

interface ProcessedPostResult {
  content: string;
  imageUrl: string | null;
  placeholdersReplaced: string[];
  recommendations: {
    pinDuration: string | null;
    bestTimeToPost: string | null;
  };
}

interface UseGroupAdminPostsReturn {
  posts: GroupAdminPost[];
  categories: { category: GroupAdminPostCategory; count: number }[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getProcessedPost: (postId: string, language?: SupportedGroupAdminLanguage) => Promise<ProcessedPostResult>;
  trackUsage: (postId: string, action: 'view' | 'copy', language?: SupportedGroupAdminLanguage) => Promise<void>;
}

export function useGroupAdminPosts(): UseGroupAdminPostsReturn {
  const { user } = useAuth();
  const [posts, setPosts] = useState<GroupAdminPost[]>([]);
  const [categories, setCategories] = useState<{ category: GroupAdminPostCategory; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const getPosts = httpsCallable(functionsAffiliate, 'getGroupAdminPosts');
      const result = await getPosts({});
      const data = result.data as GroupAdminPostsResponse;

      setPosts(data.posts);
      setCategories(data.categories);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'groupAdmin') {
      fetchPosts();
    }
  }, [fetchPosts, user]);

  const getProcessedPost = useCallback(async (
    postId: string,
    language: SupportedGroupAdminLanguage = 'en'
  ): Promise<ProcessedPostResult> => {
    try {
      if (!user) {
        console.error('User not authenticated');
        return {
          content: '',
          imageUrl: null,
          placeholdersReplaced: [],
          recommendations: {
            pinDuration: null,
            bestTimeToPost: null,
          },
        };
      }
      const getPost = httpsCallable(functionsAffiliate, 'getGroupAdminProcessedPost');
      const result = await getPost({ postId, language });
      return result.data as ProcessedPostResult;
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Failed to get processed post:', error.message || err);
      return {
        content: '',
        imageUrl: null,
        placeholdersReplaced: [],
        recommendations: {
          pinDuration: null,
          bestTimeToPost: null,
        },
      };
    }
  }, [user]);

  const trackUsage = useCallback(async (
    postId: string,
    action: 'view' | 'copy',
    language: SupportedGroupAdminLanguage = 'en'
  ): Promise<void> => {
    try {
      const track = httpsCallable(functionsAffiliate, 'trackGroupAdminPostUsage');
      await track({ postId, action, language });
    } catch (err) {
      console.error('Failed to track post usage:', err);
    }
  }, []);

  return {
    posts,
    categories,
    isLoading,
    error,
    refresh: fetchPosts,
    getProcessedPost,
    trackUsage,
  };
}

export default useGroupAdminPosts;
